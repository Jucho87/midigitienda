import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, isSubscriptionActive, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Lista las órdenes del tenant.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('orders.read')) return forbidden();

  const orders = await prisma.order.findMany({
    where: { tenantId: ctx.tenantId },
    include: { user: true, orderItems: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return NextResponse.json({ orders: orders.map(serialize.order) });
}

// Crea una orden de venta de forma ATÓMICA: valida y descuenta stock, y revierte todo si algo falla.
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('orders.create')) return forbidden();

  const sub = await isSubscriptionActive(ctx.tenantId);
  if (!sub.active) return badRequest(sub.reason || 'Suscripción inactiva.', 402);

  const body = await req.json().catch(() => ({}));
  const items: Array<{ productId: string; quantity: number }> = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return badRequest('La venta no contiene productos.');

  const paymentMethod = String(body.paymentMethod || 'cash');
  const paymentReference = body.paymentReference ? String(body.paymentReference) : null;
  const currencyCode = String(body.currencyCode || 'PEN').toUpperCase();
  const exchangeRate = Number(body.exchangeRate) > 0 ? Number(body.exchangeRate) : 1;
  const taxRate = Number(body.taxRate) >= 0 ? Number(body.taxRate) : 0;
  const amountReceived = Number(body.amountReceived) || 0;

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Cargar productos involucrados dentro de la transacción (aislado por tenant)
      const ids = items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: ids }, tenantId: ctx.tenantId, isActive: true } });
      const map = new Map<string, any>(products.map((p: any) => [p.id, p]));

      let subtotal = 0;
      const lineData: any[] = [];
      for (const item of items) {
        const p = map.get(item.productId);
        const qty = Number(item.quantity);
        if (!p) throw new Error(`Producto no encontrado o inactivo.`);
        if (!(qty > 0)) throw new Error(`Cantidad inválida para ${p.name}.`);
        if (Number(p.stock) < qty) throw new Error(`Stock insuficiente para "${p.name}". Disponible: ${Number(p.stock)}.`);
        const unitPrice = Number(p.price);
        subtotal += unitPrice * qty;
        lineData.push({
          productId: p.id, productName: p.name, productBarcode: p.barcode ?? null,
          quantity: qty, unitPrice, cost: Number(p.cost),
        });
      }

      const tax = +(subtotal * taxRate).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      const currencyTotal = +(total * exchangeRate).toFixed(2);
      const changeGiven = amountReceived > 0 ? +(amountReceived - currencyTotal).toFixed(2) : 0;

      // Descontar stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: Number(item.quantity) } },
        });
      }

      const created = await tx.order.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          subtotal, tax, total,
          currencyCode, exchangeRate, currencyTotal,
          paymentMethod, paymentReference,
          amountReceived, changeGiven: changeGiven > 0 ? changeGiven : 0,
          status: 'completed',
          orderItems: { create: lineData },
        },
        include: { user: true, orderItems: true },
      });

      // Notificaciones de bajo stock
      const lowStock = await tx.product.findMany({
        where: { id: { in: ids }, tenantId: ctx.tenantId },
      });
      for (const p of lowStock) {
        if (Number(p.stock) <= Number(p.minStock)) {
          await tx.notification.create({
            data: {
              tenantId: ctx.tenantId,
              title: 'Stock bajo',
              message: `El producto "${p.name}" tiene stock bajo (${Number(p.stock)}).`,
              type: 'low_stock',
              relatedEntityId: p.id,
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json({ order: serialize.order(order) }, { status: 201 });
  } catch (e: any) {
    return badRequest(e?.message || 'No se pudo completar la venta.');
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Anula una orden: revierte el stock y marca la orden como cancelada (atómico).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('orders.delete')) return forbidden();
  const { id } = await params;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { orderItems: true },
      });
      if (!existing) throw new Error('Orden no encontrada.');
      if (existing.status === 'cancelled') throw new Error('La orden ya está anulada.');

      for (const item of existing.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: Number(item.quantity) } },
        });
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: 'cancelled' },
        include: { user: true, orderItems: true },
      });

      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          title: 'Venta anulada',
          message: `Se anuló una venta por ${Number(existing.total)} y se restauró el stock.`,
          type: 'order_cancelled',
          relatedEntityId: existing.id,
        },
      });

      return updated;
    });
    return NextResponse.json({ order: serialize.order(order) });
  } catch (e: any) {
    return badRequest(e?.message || 'No se pudo anular la orden.');
  }
}

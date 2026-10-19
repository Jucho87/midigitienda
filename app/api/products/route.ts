import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, isSubscriptionActive, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const products = await prisma.product.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(products.map(serialize.product));
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('products.create')) return forbidden();
  const sub = await isSubscriptionActive(ctx.tenantId);
  if (!sub.active) return badRequest(sub.reason || 'Suscripción inactiva', 402);

  const b = await req.json().catch(() => ({}));
  if (!b.name) return badRequest('El nombre del producto es obligatorio.');

  const product = await prisma.product.create({
    data: {
      tenantId: ctx.tenantId,
      name: b.name,
      barcode: b.barcode || null,
      price: b.price ?? 0,
      cost: b.cost ?? 0,
      stock: b.stock ?? 0,
      minStock: b.minStock ?? 5,
      category: b.category || null,
      isActive: b.isActive ?? true,
    },
  });
  return NextResponse.json(serialize.product(product), { status: 201 });
}

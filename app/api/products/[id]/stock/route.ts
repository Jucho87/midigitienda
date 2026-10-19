import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('products.update')) return forbidden();
  const { id } = await params;

  const existing = await prisma.product.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) return badRequest('Producto no encontrado', 404);

  const b = await req.json().catch(() => ({}));
  const adjustment = Number(b.adjustment || 0);
  const newStock = Math.max(0, Number(existing.stock.toString()) + adjustment);
  const product = await prisma.product.update({ where: { id }, data: { stock: newStock } });
  return NextResponse.json(serialize.product(product));
}

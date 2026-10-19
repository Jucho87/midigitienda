import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('products.update')) return forbidden();
  const { id } = await params;

  const existing = await prisma.product.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) return badRequest('Producto no encontrado', 404);

  const b = await req.json().catch(() => ({}));
  const data: any = {};
  for (const f of ['name', 'barcode', 'price', 'cost', 'stock', 'minStock', 'category', 'isActive']) {
    if (b[f] !== undefined) data[f] = b[f];
  }
  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(serialize.product(product));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('products.delete')) return forbidden();
  const { id } = await params;

  const existing = await prisma.product.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) return badRequest('Producto no encontrado', 404);

  const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json(serialize.product(product));
}

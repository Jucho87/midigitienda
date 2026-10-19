import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('settings.manage')) return forbidden();
  const { id } = await params;

  const currency = await prisma.currency.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!currency) return badRequest('Moneda no encontrada.', 404);

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.rateToBase != null && Number(body.rateToBase) > 0) data.rateToBase = Number(body.rateToBase);
  if (typeof body.symbol === 'string' && body.symbol.trim()) data.symbol = body.symbol.trim();
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.isActive === 'boolean') {
    if (currency.isBase && !body.isActive) return badRequest('No se puede desactivar la moneda base.');
    data.isActive = body.isActive;
  }

  const updated = await prisma.currency.update({ where: { id }, data });
  return NextResponse.json({ currency: serialize.currency(updated) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('settings.manage')) return forbidden();
  const { id } = await params;

  const currency = await prisma.currency.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!currency) return badRequest('Moneda no encontrada.', 404);
  if (currency.isBase) return badRequest('No se puede eliminar la moneda base.');

  await prisma.currency.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';
import { symbolForCode, nameForCode } from '@/lib/currency-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const currencies = await prisma.currency.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { isBase: 'desc' } });
  return NextResponse.json({ currencies: currencies.map(serialize.currency) });
}

// Agrega una moneda aceptada por el negocio con su tasa de cambio hacia la moneda base.
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('settings.manage')) return forbidden();

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) return badRequest('El código de la moneda es obligatorio.');
  const rateToBase = Number(body.rateToBase) > 0 ? Number(body.rateToBase) : 1;
  const symbol = body.symbol ? String(body.symbol) : symbolForCode(code);
  const name = body.name ? String(body.name) : nameForCode(code);

  const existing = await prisma.currency.findFirst({ where: { tenantId: ctx.tenantId, code } });
  if (existing) return badRequest('Esta moneda ya está registrada.', 409);

  const currency = await prisma.currency.create({
    data: { tenantId: ctx.tenantId, code, symbol, name, rateToBase, isBase: false, isActive: true },
  });
  return NextResponse.json({ currency: serialize.currency(currency) }, { status: 201 });
}

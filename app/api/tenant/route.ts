import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Actualiza la marca/configuración del negocio: nombre, colores y moneda base.
export async function PATCH(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('settings.manage')) return forbidden();

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.primaryColor === 'string') data.primaryColor = body.primaryColor;
  if (typeof body.secondaryColor === 'string') data.secondaryColor = body.secondaryColor;
  if (typeof body.currency === 'string' && body.currency.trim()) {
    const code = body.currency.trim().toUpperCase();
    const exists = await prisma.currency.findFirst({ where: { tenantId: ctx.tenantId, code } });
    if (!exists) return badRequest('La moneda base debe existir en la lista de monedas del negocio.');
    data.currency = code;
    // Marcar como base en la tabla de monedas
    await prisma.$transaction([
      prisma.currency.updateMany({ where: { tenantId: ctx.tenantId }, data: { isBase: false } }),
      prisma.currency.updateMany({ where: { tenantId: ctx.tenantId, code }, data: { isBase: true, rateToBase: 1, isActive: true } }),
    ]);
  }

  const tenant = await prisma.tenant.update({ where: { id: ctx.tenantId }, data });
  return NextResponse.json({ tenant: serialize.tenant(tenant) });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, ACTIVE_TENANT_COOKIE } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Fija la empresa activa del super administrador mediante cookie de servidor.
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();

  const body = await req.json().catch(() => null);
  const tenantId = (body?.tenantId || '').toString();
  if (!tenantId) return badRequest('Debe indicar la empresa');

  const exists = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!exists) return badRequest('La empresa no existe');

  const res = NextResponse.json({ ok: true, activeTenantId: tenantId });
  res.cookies.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

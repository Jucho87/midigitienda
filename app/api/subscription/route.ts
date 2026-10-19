import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Renueva la suscripción del negocio por N meses (por defecto 1).
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('settings.manage')) return forbidden();

  const body = await req.json().catch(() => ({}));

  const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId: ctx.tenantId } });
  const base = existing && new Date(existing.expiresAt) > new Date() ? new Date(existing.expiresAt) : new Date();

  // Si se indica un plan, se aplica su nombre, precio y duración; si no, se renueva por N meses.
  let planName = existing?.planName || 'Plan Comercial';
  let price = existing ? Number(existing.price) : 29.99;

  if (body.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: String(body.planId) } });
    if (!plan) return badRequest('El plan seleccionado no existe');
    planName = plan.name;
    price = Number(plan.price);
    base.setDate(base.getDate() + plan.durationDays);
  } else {
    const months = Number(body.months) > 0 ? Math.floor(Number(body.months)) : 1;
    base.setMonth(base.getMonth() + months);
  }

  const sub = await prisma.tenantSubscription.upsert({
    where: { tenantId: ctx.tenantId },
    update: { planName, price, expiresAt: base, status: 'active' },
    create: { tenantId: ctx.tenantId, planName, price, expiresAt: base, status: 'active' },
  });
  return NextResponse.json({ subscription: serialize.subscription(sub) });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';
import { ensureDefaultPlans } from '@/lib/provision';

export const dynamic = 'force-dynamic';

// Lista TODOS los planes, incluidos inactivos (solo super administrador).
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();
  const plans = await ensureDefaultPlans();
  return NextResponse.json({ plans: plans.map(serialize.plan) });
}

// Crea un nuevo plan (solo super administrador).
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const price = Number(body.price);
  const currency = String(body.currency || 'USD').trim().toUpperCase();
  const durationDays = Math.floor(Number(body.durationDays));
  const isPopular = Boolean(body.isPopular);

  if (!name) return badRequest('El nombre del plan es obligatorio');
  if (!Number.isFinite(price) || price < 0) return badRequest('El precio no es válido');
  if (!Number.isFinite(durationDays) || durationDays <= 0) return badRequest('La duración (días) no es válida');

  const maxOrder = await prisma.plan.aggregate({ _max: { sortOrder: true } });
  const plan = await prisma.plan.create({
    data: {
      name,
      description: description || null,
      price,
      currency,
      durationDays,
      isPopular,
      isActive: true,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json({ plan: serialize.plan(plan) });
}

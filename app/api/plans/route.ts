import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized, serialize } from '@/lib/api';
import { ensureDefaultPlans } from '@/lib/provision';

export const dynamic = 'force-dynamic';

// Lista los planes ACTIVOS disponibles (cualquier usuario autenticado puede verlos).
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const plans = await ensureDefaultPlans();
  return NextResponse.json({ plans: plans.filter((p) => p.isActive).map(serialize.plan) });
}

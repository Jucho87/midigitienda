import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Edita un plan: precio, nombre, descripción, duración, estado (solo super administrador).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();

  const { id } = await params;
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return badRequest('El plan no existe', 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return badRequest('El nombre del plan es obligatorio');
    data.name = name;
  }
  if (body.description !== undefined) data.description = String(body.description).trim() || null;
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return badRequest('El precio no es válido');
    data.price = price;
  }
  if (body.currency !== undefined) data.currency = String(body.currency).trim().toUpperCase();
  if (body.durationDays !== undefined) {
    const d = Math.floor(Number(body.durationDays));
    if (!Number.isFinite(d) || d <= 0) return badRequest('La duración (días) no es válida');
    data.durationDays = d;
  }
  if (body.isPopular !== undefined) data.isPopular = Boolean(body.isPopular);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  const plan = await prisma.plan.update({ where: { id }, data });
  return NextResponse.json({ plan: serialize.plan(plan) });
}

// Elimina un plan (solo super administrador).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();

  const { id } = await params;
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return badRequest('El plan no existe', 404);

  await prisma.plan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('users.manage')) return forbidden();
  const users = await prisma.user.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ users: users.map(serialize.user) });
}

// Crea un empleado/usuario dentro del tenant con su contraseña.
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('users.manage')) return forbidden();

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const roleId = body.roleId ? String(body.roleId) : null;

  if (!name || !email || !password) return badRequest('Nombre, correo y contraseña son obligatorios.');
  if (password.length < 6) return badRequest('La contraseña debe tener al menos 6 caracteres.');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return badRequest('Ya existe una cuenta con este correo.', 409);

  if (roleId) {
    const role = await prisma.role.findFirst({ where: { id: roleId, tenantId: ctx.tenantId } });
    if (!role) return badRequest('El rol seleccionado no es válido.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { tenantId: ctx.tenantId, roleId, name, email, passwordHash, isActive: true },
  });
  return NextResponse.json({ user: serialize.user(user) }, { status: 201 });
}

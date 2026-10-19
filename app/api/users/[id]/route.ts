import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('users.manage')) return forbidden();
  const { id } = await params;

  const target = await prisma.user.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!target) return badRequest('Usuario no encontrado.', 404);

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    if (email !== target.email) {
      const dup = await prisma.user.findUnique({ where: { email } });
      if (dup) return badRequest('Ya existe una cuenta con este correo.', 409);
      data.email = email;
    }
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if ('roleId' in body) {
    const roleId = body.roleId ? String(body.roleId) : null;
    if (roleId) {
      const role = await prisma.role.findFirst({ where: { id: roleId, tenantId: ctx.tenantId } });
      if (!role) return badRequest('El rol seleccionado no es válido.');
    }
    data.roleId = roleId;
  }
  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < 6) return badRequest('La contraseña debe tener al menos 6 caracteres.');
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ user: serialize.user(user) });
}

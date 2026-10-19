import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('users.manage')) return forbidden();
  const { id } = await params;

  const role = await prisma.role.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!role) return badRequest('Rol no encontrado.', 404);

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if ('description' in body) data.description = body.description ? String(body.description) : null;

  await prisma.role.update({ where: { id }, data });

  // Reemplazar permisos si se envían
  if (Array.isArray(body.permissionSlugs)) {
    const perms = body.permissionSlugs.length
      ? await prisma.permission.findMany({ where: { slug: { in: body.permissionSlugs } } })
      : [];
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({ data: perms.map((p) => ({ roleId: id, permissionId: p.id })), skipDuplicates: true }),
    ]);
  }

  const updated = await prisma.role.findUnique({ where: { id } });
  const rolePermissions = await prisma.rolePermission.findMany({ where: { roleId: id } });
  return NextResponse.json({ role: serialize.role(updated), rolePermissions: rolePermissions.map(serialize.rolePermission) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('users.manage')) return forbidden();
  const { id } = await params;

  const role = await prisma.role.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!role) return badRequest('Rol no encontrado.', 404);
  if (role.isSystem) return badRequest('No se puede eliminar un rol del sistema.');

  const assigned = await prisma.user.count({ where: { roleId: id } });
  if (assigned > 0) return badRequest('No se puede eliminar un rol asignado a usuarios.');

  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

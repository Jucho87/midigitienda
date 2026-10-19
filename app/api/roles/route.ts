import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('users.manage')) return forbidden();
  const roles = await prisma.role.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: 'asc' } });
  const rolePermissions = await prisma.rolePermission.findMany({ where: { role: { tenantId: ctx.tenantId } } });
  return NextResponse.json({ roles: roles.map(serialize.role), rolePermissions: rolePermissions.map(serialize.rolePermission) });
}

// Crea un rol con su conjunto de permisos (por slug).
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.permissions.includes('users.manage')) return forbidden();

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const description = body.description ? String(body.description) : null;
  const slugs: string[] = Array.isArray(body.permissionSlugs) ? body.permissionSlugs : [];
  if (!name) return badRequest('El nombre del rol es obligatorio.');

  const perms = slugs.length ? await prisma.permission.findMany({ where: { slug: { in: slugs } } }) : [];

  const role = await prisma.role.create({
    data: {
      tenantId: ctx.tenantId, name, description, isSystem: false,
      rolePermissions: { create: perms.map((p) => ({ permissionId: p.id })) },
    },
  });
  const rolePermissions = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
  return NextResponse.json({ role: serialize.role(role), rolePermissions: rolePermissions.map(serialize.rolePermission) }, { status: 201 });
}

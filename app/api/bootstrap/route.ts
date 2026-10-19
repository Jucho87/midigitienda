import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Carga todo el estado del tenant de la sesión para hidratar el cliente.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const { tenantId, userId } = ctx;

  const [tenant, users, roles, rolePermissions, permissions, products, orders, subscription, tickets, notifications, currencies, me] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      prisma.role.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
      prisma.rolePermission.findMany({ where: { role: { tenantId } } }),
      prisma.permission.findMany(),
      prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
      prisma.order.findMany({ where: { tenantId }, include: { user: true, orderItems: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.tenantSubscription.findUnique({ where: { tenantId } }),
      prisma.supportTicket.findMany({ where: { tenantId }, include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } }),
      prisma.notification.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.currency.findMany({ where: { tenantId }, orderBy: { isBase: 'desc' } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

  return NextResponse.json({
    tenant: tenant ? serialize.tenant(tenant) : null,
    currentUser: me ? serialize.user(me) : null,
    permissions: ctx.permissions,
    isPlatformAdmin: ctx.isPlatformAdmin,
    activeTenantId: ctx.tenantId,
    homeTenantId: ctx.homeTenantId,
    users: users.map(serialize.user),
    roles: roles.map(serialize.role),
    rolePermissions: rolePermissions.map(serialize.rolePermission),
    allPermissions: permissions.map(serialize.permission),
    products: products.map(serialize.product),
    orders: orders.map(serialize.order),
    subscription: subscription ? serialize.subscription(subscription) : null,
    tickets: tickets.map(serialize.ticket),
    notifications: notifications.map(serialize.notification),
    currencies: currencies.map(serialize.currency),
  });
}

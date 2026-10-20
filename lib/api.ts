import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ALL_PERMISSION_SLUGS } from '@/lib/permissions-catalog';

export const ACTIVE_TENANT_COOKIE = 'mdt_active_tenant';

export interface AuthContext {
  userId: string;
  tenantId: string;
  roleId: string | null;
  permissions: string[];
  isPlatformAdmin: boolean;
  homeTenantId: string;
}

// Resuelve el contexto de sesión: tenantId SIEMPRE proviene del token/cookie de servidor, nunca del cliente.
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });
  if (!user || !user.isActive) return null;

  const homeTenantId = user.tenantId;

  if (user.isPlatformAdmin) {
    // El super administrador es transversal: puede operar sobre cualquier empresa.
    let activeTenantId = homeTenantId;
    const cookieStore = await cookies();
    const selected = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
    if (selected) {
      const exists = await prisma.tenant.findUnique({ where: { id: selected }, select: { id: true } });
      if (exists) activeTenantId = selected;
    }
    return {
      userId: user.id,
      tenantId: activeTenantId,
      roleId: user.roleId,
      permissions: [...ALL_PERMISSION_SLUGS],
      isPlatformAdmin: true,
      homeTenantId,
    };
  }

  const permissions = user.role?.rolePermissions.map((rp) => rp.permission.slug) ?? [];
  return { userId: user.id, tenantId: homeTenantId, roleId: user.roleId, permissions, isPlatformAdmin: false, homeTenantId };
}

export function unauthorized() {
  return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'No tiene permisos para esta acción' }, { status: 403 });
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Verifica que la suscripción del tenant esté activa y vigente.
export async function isSubscriptionActive(tenantId: string): Promise<{ active: boolean; reason?: string }> {
  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  if (!sub) return { active: false, reason: 'No existe una suscripción activa.' };
  if (sub.status !== 'active' || new Date(sub.expiresAt) <= new Date()) {
    return { active: false, reason: 'La suscripción ha vencido o está suspendida. Renueva el plan para continuar.' };
  }
  return { active: true };
}

const dec = (v: any): number =>
  v == null ? 0 : typeof v === 'number' ? v : Number(v.toString());
const iso = (d: Date | null | undefined): string => (d ? new Date(d).toISOString() : '');

export const serialize = {
  tenant: (t: any) => ({
    id: t.id, name: t.name, slug: t.slug, status: t.status,
    primaryColor: t.primaryColor, secondaryColor: t.secondaryColor,
    currency: t.currency, createdAt: iso(t.createdAt),
  }),
  role: (r: any) => ({
    id: r.id, tenantId: r.tenantId, name: r.name,
    description: r.description ?? undefined, isSystem: r.isSystem,
  }),
  rolePermission: (rp: any) => ({ id: rp.id, roleId: rp.roleId, permissionId: rp.permissionId }),
  permission: (p: any) => ({
    id: p.id, module: p.module, action: p.action, slug: p.slug,
    label: p.label, description: p.description,
  }),
  user: (u: any) => ({
    id: u.id, tenantId: u.tenantId, roleId: u.roleId ?? undefined,
    name: u.name, email: u.email, isActive: u.isActive, createdAt: iso(u.createdAt),
  }),
  product: (p: any) => ({
    id: p.id, tenantId: p.tenantId, name: p.name, barcode: p.barcode ?? undefined,
    price: dec(p.price), cost: dec(p.cost), stock: dec(p.stock), minStock: dec(p.minStock),
    category: p.category ?? undefined, isActive: p.isActive, createdAt: iso(p.createdAt),
  }),
  orderItem: (i: any) => ({
    id: i.id, orderId: i.orderId, productId: i.productId, productName: i.productName,
    productBarcode: i.productBarcode ?? undefined, quantity: dec(i.quantity),
    unitPrice: dec(i.unitPrice), cost: dec(i.cost), subtotal: dec(i.unitPrice) * dec(i.quantity),
  }),
  order: (o: any) => ({
    id: o.id, tenantId: o.tenantId, userId: o.userId, userName: o.user?.name ?? undefined,
    subtotal: dec(o.subtotal), tax: dec(o.tax), total: dec(o.total),
    currencyCode: o.currencyCode, exchangeRate: dec(o.exchangeRate), currencyTotal: dec(o.currencyTotal),
    paymentMethod: o.paymentMethod, paymentReference: o.paymentReference ?? undefined,
    amountReceived: dec(o.amountReceived), changeGiven: dec(o.changeGiven),
    status: o.status, itemsCount: o.orderItems ? o.orderItems.reduce((a: number, it: any) => a + dec(it.quantity), 0) : 0,
    createdAt: iso(o.createdAt),
    orderItems: o.orderItems ? o.orderItems.map(serialize.orderItem) : undefined,
  }),
  subscription: (s: any) => ({
    id: s.id, tenantId: s.tenantId, planName: s.planName, price: dec(s.price),
    expiresAt: iso(s.expiresAt), status: s.status,
  }),
  plan: (p: any) => ({
    id: p.id, name: p.name, description: p.description ?? undefined, price: dec(p.price),
    currency: p.currency, durationDays: p.durationDays, isPopular: p.isPopular,
    isActive: p.isActive, sortOrder: p.sortOrder,
  }),
  ticketMessage: (m: any) => ({
    id: m.id, ticketId: m.ticketId, userId: m.userId, userName: m.user?.name ?? '',
    message: m.message, isSupportAgent: m.isSupportAgent, createdAt: iso(m.createdAt),
  }),
  ticket: (t: any) => ({
    id: t.id, tenantId: t.tenantId, userId: t.userId, userName: t.user?.name ?? undefined,
    subject: t.subject, description: t.description, category: t.category,
    priority: t.priority, status: t.status, createdAt: iso(t.createdAt), updatedAt: iso(t.updatedAt),
    messages: t.messages ? t.messages.map(serialize.ticketMessage) : undefined,
  }),
  notification: (n: any) => ({
    id: n.id, tenantId: n.tenantId, userId: n.userId ?? null, title: n.title,
    message: n.message, type: n.type, isRead: n.isRead,
    relatedEntityId: n.relatedEntityId ?? null, createdAt: iso(n.createdAt),
  }),
  currency: (c: any) => ({
    id: c.id, tenantId: c.tenantId, code: c.code, symbol: c.symbol, name: c.name,
    rateToBase: dec(c.rateToBase), isBase: c.isBase, isActive: c.isActive,
  }),
};

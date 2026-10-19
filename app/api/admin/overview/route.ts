import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden } from '@/lib/api';

export const dynamic = 'force-dynamic';

const num = (v: any): number => (v == null ? 0 : typeof v === 'number' ? v : Number(v.toString()));

// Vista consolidada de TODAS las empresas de la plataforma (solo super administrador).
// Permite al administrador transversal ver los datos de todas las empresas de un vistazo.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();

  const [tenants, ordersByTenant, productsByTenant, usersByTenant] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { subscription: true },
    }),
    prisma.order.groupBy({
      by: ['tenantId'],
      where: { status: 'completed' },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ['tenantId'],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ['tenantId'],
      where: { isActive: true },
      _count: { _all: true },
    }),
  ]);

  const orderMap = new Map(ordersByTenant.map((o) => [o.tenantId, { sales: num(o._sum.total), count: o._count._all }]));
  const productMap = new Map(productsByTenant.map((p) => [p.tenantId, p._count._all]));
  const userMap = new Map(usersByTenant.map((u) => [u.tenantId, u._count._all]));

  const companies = tenants.map((t) => {
    const ord = orderMap.get(t.id) || { sales: 0, count: 0 };
    return {
      id: t.id,
      name: t.name,
      currency: t.currency,
      status: t.status,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      usersCount: userMap.get(t.id) ?? 0,
      productsCount: productMap.get(t.id) ?? 0,
      ordersCount: ord.count,
      salesTotal: ord.sales,
      subscription: t.subscription
        ? { planName: t.subscription.planName, expiresAt: new Date(t.subscription.expiresAt).toISOString(), status: t.subscription.status }
        : null,
    };
  });

  const totals = {
    companies: companies.length,
    users: companies.reduce((a, c) => a + c.usersCount, 0),
    products: companies.reduce((a, c) => a + c.productsCount, 0),
    orders: companies.reduce((a, c) => a + c.ordersCount, 0),
  };

  return NextResponse.json({ companies, totals });
}

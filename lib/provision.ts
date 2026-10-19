import { prisma } from '@/lib/db';
import { SYSTEM_PERMISSIONS } from '@/lib/permissions-catalog';
import { CURRENCY_PRESETS, symbolForCode, nameForCode } from '@/lib/currency-catalog';

// Asegura que el catálogo global de permisos exista (idempotente).
export async function ensurePermissions() {
  for (const p of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { module: p.module, action: p.action, label: p.label, description: p.description },
      create: { module: p.module, action: p.action, slug: p.slug, label: p.label, description: p.description },
    });
  }
  return prisma.permission.findMany();
}

// Planes por defecto de la plataforma (se crean solo si aún no existe ninguno).
const DEFAULT_PLANS = [
  { name: 'Básico Emprendedor', description: '1 Caja POS, hasta 100 productos, catálogo básico.', price: 19.99, durationDays: 30, isPopular: false, sortOrder: 1 },
  { name: 'Comercial Pro', description: 'Cajas ilimitadas, inventario masivo, reportes y RBAC completo.', price: 39.99, durationDays: 30, isPopular: true, sortOrder: 2 },
  { name: 'Enterprise Multi-Sucursal', description: 'Soporte prioritario 24/7, multi-almacén y branding personalizado.', price: 99.0, durationDays: 30, isPopular: false, sortOrder: 3 },
];

// Asegura que exista un catálogo inicial de planes. Idempotente: no borra ni duplica.
export async function ensureDefaultPlans() {
  const count = await prisma.plan.count();
  if (count === 0) {
    await prisma.plan.createMany({
      data: DEFAULT_PLANS.map((p) => ({ ...p, currency: 'USD', isActive: true })),
    });
  }
  return prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
}

function slugify(name: string): string {
  const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return (base || 'negocio') + '-' + Math.random().toString(36).slice(2, 7);
}

interface ProvisionInput {
  businessName: string;
  adminName: string;
  email: string;
  passwordHash: string;
  currencyCode?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// Crea un nuevo negocio (tenant) completo con su administrador, suscripción,
// rol administrador con todos los permisos y moneda base. Devuelve el usuario admin.
export async function provisionTenant(input: ProvisionInput) {
  const permissions = await ensurePermissions();
  const currencyCode = (input.currencyCode || 'PEN').toUpperCase();

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.businessName,
        slug: slugify(input.businessName),
        currency: currencyCode,
        primaryColor: input.primaryColor || '#10B981',
        secondaryColor: input.secondaryColor || '#0284C7',
      },
    });

    // Moneda base del negocio
    await tx.currency.create({
      data: {
        tenantId: tenant.id,
        code: currencyCode,
        symbol: symbolForCode(currencyCode),
        name: nameForCode(currencyCode),
        rateToBase: 1,
        isBase: true,
        isActive: true,
      },
    });

    // Rol administrador con todos los permisos
    const adminRole = await tx.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Administrador General',
        description: 'Acceso total y configuración del negocio',
        isSystem: true,
      },
    });
    await tx.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    // Usuario administrador
    const adminUser = await tx.user.create({
      data: {
        tenantId: tenant.id,
        roleId: adminRole.id,
        name: input.adminName,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        isActive: true,
      },
    });

    // Suscripción de prueba 30 días
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planName: 'Plan Prueba Comercial 30 Días',
        price: 29.99,
        expiresAt: expires,
        status: 'active',
      },
    });

    return { tenant, adminUser, adminRole };
  });
}

export const CURRENCY_OPTIONS = CURRENCY_PRESETS;

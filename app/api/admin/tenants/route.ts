import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, forbidden, badRequest, serialize } from '@/lib/api';
import { provisionTenant } from '@/lib/provision';

export const dynamic = 'force-dynamic';

// Lista todas las empresas de la plataforma (solo super administrador).
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: true,
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({
    tenants: tenants.map((t) => ({
      ...serialize.tenant(t),
      usersCount: t._count.users,
      subscription: t.subscription ? serialize.subscription(t.subscription) : null,
    })),
  });
}

// Crea una nueva empresa con su administrador (solo super administrador).
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  if (!ctx.isPlatformAdmin) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body) return badRequest('Solicitud inválida');

  const businessName = (body.businessName || '').toString().trim();
  const adminName = (body.adminName || '').toString().trim();
  const email = (body.email || '').toString().trim().toLowerCase();
  const password = (body.password || '').toString();
  const currencyCode = (body.currency || 'PEN').toString().trim().toUpperCase();

  if (!businessName) return badRequest('El nombre de la empresa es obligatorio');
  if (!adminName) return badRequest('El nombre del administrador es obligatorio');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('Correo inválido');
  if (password.length < 6) return badRequest('La contraseña debe tener al menos 6 caracteres');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return badRequest('Ya existe un usuario con ese correo');

  const passwordHash = await bcrypt.hash(password, 10);
  const tenant = await provisionTenant({ businessName, adminName, email, passwordHash, currencyCode });

  return NextResponse.json({ tenant: serialize.tenant(tenant) });
}

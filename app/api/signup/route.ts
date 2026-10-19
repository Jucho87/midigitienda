import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { provisionTenant } from '@/lib/provision';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const name = (body.name || '').trim();
    const businessName = (body.businessName || '').trim() || name || 'Mi Negocio';
    const currency = (body.currency || 'PEN').toUpperCase();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña son obligatorios.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una cuenta con este correo.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await provisionTenant({ businessName, adminName: name, email, passwordHash, currencyCode: currency });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    console.error('Signup error', e);
    return NextResponse.json({ error: 'No se pudo crear la cuenta. Intenta nuevamente.' }, { status: 500 });
  }
}

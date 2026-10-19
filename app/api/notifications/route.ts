import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const notifications = await prisma.notification.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ notifications: notifications.map(serialize.notification) });
}

// Marca notificaciones como leídas. Con { id } marca una; sin id marca todas.
export async function PATCH(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const body = await req.json().catch(() => ({}));
  if (body.id) {
    await prisma.notification.updateMany({ where: { id: String(body.id), tenantId: ctx.tenantId }, data: { isRead: true } });
  } else {
    await prisma.notification.updateMany({ where: { tenantId: ctx.tenantId, isRead: false }, data: { isRead: true } });
  }
  return NextResponse.json({ ok: true });
}

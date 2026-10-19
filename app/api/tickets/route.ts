import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const tickets = await prisma.supportTicket.findMany({
    where: { tenantId: ctx.tenantId },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ tickets: tickets.map(serialize.ticket) });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || 'general');
  const priority = String(body.priority || 'medium');
  if (!subject || !description) return badRequest('Asunto y descripción son obligatorios.');

  const ticket = await prisma.supportTicket.create({
    data: {
      tenantId: ctx.tenantId, userId: ctx.userId, subject, description, category, priority, status: 'open',
      messages: { create: { userId: ctx.userId, message: description, isSupportAgent: false } },
    },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
  });
  return NextResponse.json({ ticket: serialize.ticket(ticket) }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, unauthorized, badRequest, serialize } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Agrega un mensaje a un ticket y/o actualiza su estado.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!ticket) return badRequest('Ticket no encontrado.', 404);

  const body = await req.json().catch(() => ({}));
  const message = String(body.message || '').trim();
  if (!message) return badRequest('El mensaje no puede estar vacío.');

  await prisma.ticketMessage.create({
    data: { ticketId: id, userId: ctx.userId, message, isSupportAgent: false },
  });
  await prisma.supportTicket.update({ where: { id }, data: { status: ticket.status === 'closed' ? 'open' : ticket.status } });

  const updated = await prisma.supportTicket.findUnique({
    where: { id },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
  });
  return NextResponse.json({ ticket: serialize.ticket(updated) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!ticket) return badRequest('Ticket no encontrado.', 404);

  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '');
  if (!['open', 'in_progress', 'closed'].includes(status)) return badRequest('Estado inválido.');

  await prisma.supportTicket.update({ where: { id }, data: { status } });
  const updated = await prisma.supportTicket.findUnique({
    where: { id },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
  });
  return NextResponse.json({ ticket: serialize.ticket(updated) });
}

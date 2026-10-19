'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '@/types';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  X,
  User,
  Headphones,
} from 'lucide-react';

export const SupportView: React.FC = () => {
  const { currentTenant, currentUser } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New ticket modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  // New message in active ticket
  const [replyMessage, setReplyMessage] = useState('');

  const loadTickets = () => {
    const list = db.getTickets(currentTenant.id);
    setTickets(list);
    if (selectedTicket) {
      const refreshed = list.find((t) => t.id === selectedTicket.id);
      if (refreshed) setSelectedTicket(refreshed);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentTenant.id]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    const newTicket = db.createTicket(currentTenant.id, currentUser.id, currentUser.name, {
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
    });

    setShowCreateModal(false);
    setSubject('');
    setDescription('');
    loadTickets();
    setSelectedTicket(newTicket);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    db.addTicketMessage(
      currentTenant.id,
      selectedTicket.id,
      currentUser.id,
      currentUser.name,
      replyMessage.trim()
    );

    const messageText = replyMessage.trim();
    setReplyMessage('');
    loadTickets();

    // Simulate automatic support specialist acknowledgment
    setTimeout(() => {
      db.addTicketMessage(
        currentTenant.id,
        selectedTicket.id,
        'support-agent',
        'Ingeniero de Soporte SaaS',
        `Hola ${currentUser.name}, hemos recibido tu mensaje ("${messageText.slice(0, 30)}..."). El equipo técnico de la plataforma está revisando la incidencia asociada a ${currentTenant.name}.`,
        true
      );
      loadTickets();
    }, 1200);
  };

  const handleUpdateStatus = (status: TicketStatus) => {
    if (!selectedTicket) return;
    db.updateTicketStatus(currentTenant.id, selectedTicket.id, status);
    loadTickets();
  };

  const categoryLabels: Record<TicketCategory, string> = {
    bug: 'Error de Software (Bug)',
    billing: 'Facturación / Suscripción',
    inventory_error: 'Discrepancia de Inventario',
    other: 'Consulta General',
  };

  const priorityStyles: Record<TicketPriority, { bg: string; text: string }> = {
    low: { bg: 'bg-slate-100', text: 'text-slate-600' },
    medium: { bg: 'bg-blue-50', text: 'text-blue-700' },
    high: { bg: 'bg-amber-50', text: 'text-amber-700' },
    urgent: { bg: 'bg-rose-50', text: 'text-rose-700' },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Mesa de Ayuda y Soporte Técnico</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Canal directo para reportar incidencias de caja, facturación o solicitar asistencia
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity self-start"
          style={{ backgroundColor: currentTenant.primaryColor }}
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Ticket de Ayuda</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[600px]">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Tickets Registrados</span>
            <span className="text-[11px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              {tickets.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay tickets de soporte reportados para este negocio.
              </div>
            ) : (
              tickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const pStyle = priorityStyles[ticket.priority];

                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left hover:bg-slate-50 transition-colors flex flex-col space-y-1.5 ${
                      isSelected ? 'bg-slate-50 border-l-4' : ''
                    }`}
                    style={isSelected ? { borderLeftColor: currentTenant.primaryColor } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${pStyle.bg} ${pStyle.text}`}
                      >
                        {ticket.priority}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ticket.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 truncate">{ticket.subject}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{ticket.description}</p>

                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{categoryLabels[ticket.category]}</span>
                      <span
                        className={`font-semibold capitalize ${
                          ticket.status === 'open'
                            ? 'text-amber-600'
                            : ticket.status === 'in_progress'
                            ? 'text-blue-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[600px] overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      #{selectedTicket.id.slice(-6).toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">{selectedTicket.subject}</h3>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Categoría: {categoryLabels[selectedTicket.category]} • Creado por:{' '}
                    {selectedTicket.userName}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                {selectedTicket.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-2.5 max-w-[85%] ${
                      msg.isSupportAgent ? 'ml-0' : 'ml-auto flex-row-reverse space-x-reverse'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        msg.isSupportAgent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {msg.isSupportAgent ? <Headphones className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div
                        className={`text-[10px] text-slate-400 mb-0.5 ${
                          msg.isSupportAgent ? 'text-left' : 'text-right'
                        }`}
                      >
                        <span className="font-semibold text-slate-700">{msg.userName}</span> •{' '}
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          msg.isSupportAgent
                            ? 'bg-white border border-slate-200 text-slate-800'
                            : 'text-white'
                        }`}
                        style={!msg.isSupportAgent ? { backgroundColor: currentTenant.primaryColor } : {}}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Reply Box */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Escribe una respuesta o actualización para el equipo de soporte..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-300"
                />
                <button
                  type="submit"
                  disabled={!replyMessage.trim()}
                  className="px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs disabled:opacity-40"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
              <MessageSquare className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Selecciona un ticket de soporte</p>
              <p className="text-xs text-slate-400 mt-0.5">
                O haz clic en &quot;Nuevo Ticket&quot; para reportar un problema técnico
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Abrir Ticket de Soporte</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Asunto del Problema *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej. Error al imprimir comprobante en terminal POS"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="bug">Error de Software (Bug)</option>
                    <option value="billing">Facturación / Suscripción</option>
                    <option value="inventory_error">Inventario / Stock</option>
                    <option value="other">Consulta General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="low">Baja (Consulta general)</option>
                    <option value="medium">Media (Operación normal)</option>
                    <option value="high">Alta (Afecta ventas)</option>
                    <option value="urgent">Urgente (Caja bloqueada)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Descripción Detallada *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe qué ocurrió, mensaje de error en pantalla y pasos para reproducirlo..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  Enviar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

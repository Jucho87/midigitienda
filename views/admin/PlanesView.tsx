'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Tag, Plus, Loader2, X, Star, Power, Trash2, Pencil, Check, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { Plan } from '@/types';
import { CURRENCY_PRESETS, symbolForCode } from '@/lib/currency-catalog';

interface PlanForm {
  name: string;
  description: string;
  price: string;
  currency: string;
  durationDays: string;
  isPopular: boolean;
  isActive: boolean;
}

const EMPTY_FORM: PlanForm = {
  name: '',
  description: '',
  price: '',
  currency: 'USD',
  durationDays: '30',
  isPopular: false,
  isActive: true,
};

export const PlanesView: React.FC = () => {
  const { isPlatformAdmin } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getAdminPlans();
      setPlans(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los planes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) load();
  }, [isPlatformAdmin, load]);

  const toggleActive = async (p: Plan) => {
    try {
      setBusyId(p.id);
      await db.updatePlan(p.id, { isActive: !p.isActive });
      await load();
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar el plan');
    } finally {
      setBusyId(null);
    }
  };

  const togglePopular = async (p: Plan) => {
    try {
      setBusyId(p.id);
      await db.updatePlan(p.id, { isPopular: !p.isPopular });
      await load();
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar el plan');
    } finally {
      setBusyId(null);
    }
  };

  const removePlan = async (p: Plan) => {
    if (!window.confirm(`¿Eliminar el plan “${p.name}”? Esta acción no se puede deshacer.`)) return;
    try {
      setBusyId(p.id);
      await db.deletePlan(p.id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'No se pudo eliminar el plan');
    } finally {
      setBusyId(null);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Acceso restringido</h2>
          <p className="text-sm text-slate-500 mt-1">Esta sección es exclusiva del administrador de la plataforma.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-5 h-5" /> Planes de la plataforma
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Crea, edita y ajusta los precios de los planes de suscripción que ofreces a las empresas.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
        >
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aún no hay planes. Crea el primero.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 bg-white flex flex-col justify-between shadow-sm ${
                p.isPopular ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
              } ${!p.isActive ? 'opacity-60' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 truncate">{p.name}</h3>
                  <div className="flex items-center gap-1">
                    {p.isPopular && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" /> Popular
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.isActive ? 'text-emerald-700 bg-emerald-100' : 'text-slate-500 bg-slate-100'}`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {symbolForCode(p.currency)} {p.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400 mb-1">{p.currency}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" /> {p.durationDays} días por período
                </div>
                {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
              </div>

              <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => { setEditing(p); setShowModal(true); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => togglePopular(p)}
                  disabled={busyId === p.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                  title={p.isPopular ? 'Quitar destacado' : 'Marcar como destacado'}
                >
                  <Star className={`w-3.5 h-3.5 ${p.isPopular ? 'text-amber-500 fill-amber-500' : ''}`} />
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  disabled={busyId === p.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                  title={p.isActive ? 'Desactivar' : 'Activar'}
                >
                  <Power className={`w-3.5 h-3.5 ${p.isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                </button>
                <button
                  onClick={() => removePlan(p)}
                  disabled={busyId === p.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-60"
                >
                  {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PlanModal
          plan={editing}
          onClose={() => setShowModal(false)}
          onSaved={async () => { setShowModal(false); await load(); }}
        />
      )}
    </div>
  );
};

const PlanModal: React.FC<{ plan: Plan | null; onClose: () => void; onSaved: () => void }> = ({ plan, onClose, onSaved }) => {
  const [form, setForm] = useState<PlanForm>(
    plan
      ? {
          name: plan.name,
          description: plan.description || '',
          price: String(plan.price),
          currency: plan.currency,
          durationDays: String(plan.durationDays),
          isPopular: plan.isPopular,
          isActive: plan.isActive,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof PlanForm>(k: K, v: PlanForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    const price = Number(form.price);
    const durationDays = Number(form.durationDays);
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!Number.isFinite(price) || price < 0) { setError('El precio debe ser un número válido mayor o igual a 0.'); return; }
    if (!Number.isInteger(durationDays) || durationDays <= 0) { setError('La duración debe ser un número de días mayor a 0.'); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      currency: form.currency,
      durationDays,
      isPopular: form.isPopular,
      isActive: form.isActive,
    };
    try {
      setSaving(true);
      if (plan) await db.updatePlan(plan.id, payload);
      else await db.createPlan(payload);
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar el plan');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-bold text-slate-800">{plan ? 'Editar plan' : 'Nuevo plan'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <Field label="Nombre del plan" value={form.name} onChange={(v) => set('name', v)} placeholder="Comercial Pro" />
          <div>
            <label className="text-xs font-semibold text-slate-600">Descripción (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ideal para negocios en crecimiento..."
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio" value={form.price} onChange={(v) => set('price', v)} placeholder="39.99" type="number" />
            <div>
              <label className="text-xs font-semibold text-slate-600">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {CURRENCY_PRESETS.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Field label="Duración (días por período)" value={form.durationDays} onChange={(v) => set('durationDays', v)} placeholder="30" type="number" />
          <div className="flex items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.isPopular} onChange={(e) => set('isPopular', e.target.checked)} className="rounded border-slate-300" />
              Destacado
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="rounded border-slate-300" />
              Activo
            </label>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
    />
  </div>
);

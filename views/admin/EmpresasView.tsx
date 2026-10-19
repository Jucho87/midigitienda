'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Check, Loader2, Users, X, ArrowRight, Package, ReceiptText, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { CURRENCY_PRESETS, symbolForCode } from '@/lib/currency-catalog';

interface AdminTenant {
  id: string;
  name: string;
  currency: string;
  status: string;
  primaryColor: string;
  secondaryColor: string;
  usersCount: number;
  productsCount: number;
  ordersCount: number;
  salesTotal: number;
  subscription: { planName: string; expiresAt: string; status: string } | null;
}

interface PlatformTotals {
  companies: number;
  users: number;
  products: number;
  orders: number;
}

export const EmpresasView: React.FC = () => {
  const { isPlatformAdmin, activeTenantId, setActiveTenant } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [totals, setTotals] = useState<PlatformTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getAdminOverview();
      setTenants((data.companies as AdminTenant[]) ?? []);
      setTotals(data.totals ?? null);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar las empresas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) load();
  }, [isPlatformAdmin, load]);

  const handleManage = async (id: string) => {
    try {
      setSwitching(id);
      await setActiveTenant(id);
      router.push('/');
    } catch (e: any) {
      setError(e?.message || 'No se pudo cambiar de empresa');
      setSwitching(null);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-rose-500" />
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
            <Building2 className="w-5 h-5" /> Empresas de la plataforma
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Como administrador transversal, gestiona cualquier empresa y crea nuevas.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
        >
          <Plus className="w-4 h-4" /> Crear empresa
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {totals && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Building2} label="Empresas" value={totals.companies} />
          <KpiCard icon={Users} label="Usuarios (todas)" value={totals.users} />
          <KpiCard icon={Package} label="Productos (todos)" value={totals.products} />
          <KpiCard icon={ReceiptText} label="Ventas (todas)" value={totals.orders} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => {
            const isActive = t.id === activeTenantId;
            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-5 bg-white flex flex-col justify-between shadow-sm ${
                  isActive ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ background: `linear-gradient(135deg, ${t.primaryColor}, ${t.secondaryColor})` }}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Activa
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-bold text-slate-800 truncate">{t.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{t.currency}</span>
                    <span>•</span>
                    <span className={t.subscription?.status === 'active' ? 'text-emerald-600' : 'text-rose-500'}>
                      {t.subscription?.planName || 'Sin plan'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Metric icon={Users} label="Usuarios" value={String(t.usersCount)} />
                    <Metric icon={Package} label="Productos" value={String(t.productsCount)} />
                    <Metric icon={ReceiptText} label="Ventas" value={String(t.ordersCount)} />
                    <Metric
                      icon={Wallet}
                      label="Ingresos"
                      value={`${symbolForCode(t.currency)} ${t.salesTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleManage(t.id)}
                  disabled={switching === t.id}
                  className="mt-4 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                >
                  {switching === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {isActive ? 'Ir al panel' : 'Gestionar'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CreateTenantModal
          onClose={() => setShowModal(false)}
          onCreated={async () => {
            setShowModal(false);
            await load();
          }}
        />
      )}
    </div>
  );
};

const CreateTenantModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [businessName, setBusinessName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('PEN');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!businessName.trim() || !adminName.trim() || !email.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      setSaving(true);
      await db.createTenantAdmin({ businessName: businessName.trim(), adminName: adminName.trim(), email: email.trim(), password, currency });
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear la empresa');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Nueva empresa</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500">
            Se creará la empresa junto con su usuario administrador. Compártele estas credenciales para que inicie sesión.
          </p>
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <Field label="Nombre de la empresa" value={businessName} onChange={setBusinessName} placeholder="Mi Tienda S.A.C." />
          <Field label="Nombre del administrador" value={adminName} onChange={setAdminName} placeholder="Juan Pérez" />
          <Field label="Correo del administrador" value={email} onChange={setEmail} placeholder="admin@empresa.com" type="email" />
          <Field label="Contraseña inicial" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" type="password" />
          <div>
            <label className="text-xs font-semibold text-slate-600">Moneda base</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {CURRENCY_PRESETS.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Crear empresa
          </button>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ElementType; label: string; value: number }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-slate-400">
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
    </div>
    <div className="mt-2 text-2xl font-bold text-slate-800">{value.toLocaleString('es-PE')}</div>
  </div>
);

const Metric: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      <Icon className="w-3 h-3" /> {label}
    </div>
    <div className="text-sm font-bold text-slate-700 truncate">{value}</div>
  </div>
);

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

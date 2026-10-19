'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { Currency, Plan } from '@/types';
import { CURRENCY_PRESETS } from '@/lib/currency-catalog';
import {
  Palette,
  CreditCard,
  Building,
  Check,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Calendar,
  Lock,
  Coins,
  Plus,
  Trash2,
  Star,
  Power,
  Clock,
  Loader2,
} from 'lucide-react';
import { symbolForCode } from '@/lib/currency-catalog';

export const SettingsView: React.FC = () => {
  const {
    currentTenant,
    subscription,
    isSubscriptionExpired,
    updateBranding,
    renewSubscription,
    subscribeToPlan,
    refreshState,
  } = useAuth();

  // Planes de la plataforma (catálogo dinámico)
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await db.getPlans();
        if (active) setPlans(data);
      } catch {
        /* catálogo no disponible */
      } finally {
        if (active) setPlansLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSubscribe = async (planId: string) => {
    try {
      setSubscribingId(planId);
      await subscribeToPlan(planId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo activar el plan.');
    } finally {
      setSubscribingId(null);
    }
  };

  // Branding Form State
  const [businessName, setBusinessName] = useState(currentTenant.name);
  const [primaryColor, setPrimaryColor] = useState(currentTenant.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(currentTenant.secondaryColor);
  const [currency, setCurrency] = useState(currentTenant.currency);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Multimoneda
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [newCurCode, setNewCurCode] = useState('USD');
  const [newCurRate, setNewCurRate] = useState('1');
  const loadCurrencies = () => setCurrencies(db.getCurrencies(currentTenant.id));
  useEffect(() => { loadCurrencies(); }, [currentTenant.id]);

  const handleAddCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newCurRate);
    if (!newCurCode || !rate || rate <= 0) return;
    if (currencies.some((c) => c.code === newCurCode)) { alert('Esa moneda ya existe.'); return; }
    const preset = CURRENCY_PRESETS.find((c) => c.code === newCurCode);
    db.addCurrency(currentTenant.id, { code: newCurCode, symbol: preset?.symbol, name: preset?.name, rateToBase: rate });
    setNewCurRate('1');
    loadCurrencies();
  };
  const handleUpdateRate = (c: Currency, rate: number) => {
    if (!rate || rate <= 0) return;
    db.updateCurrency(currentTenant.id, c.id, { rateToBase: rate });
    loadCurrencies();
  };
  const handleToggleCurActive = (c: Currency) => {
    db.updateCurrency(currentTenant.id, c.id, { isActive: !c.isActive });
    loadCurrencies();
  };
  const handleDeleteCurrency = (c: Currency) => {
    if (!confirm(`¿Eliminar la moneda ${c.code}?`)) return;
    try { db.deleteCurrency(currentTenant.id, c.id); loadCurrencies(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'No se pudo eliminar la moneda.'); }
  };
  const handleSetBaseCurrency = (c: Currency) => {
    db.setBaseCurrency(currentTenant.id, c.code);
    setCurrency(c.code);
    loadCurrencies();
    refreshState();
  };

  // Preset Palettes
  const presetPalettes = [
    { name: 'Esmeralda & Cielo', primary: '#10B981', secondary: '#0284C7' },
    { name: 'Índigo & Cyan', primary: '#4F46E5', secondary: '#06B6D4' },
    { name: 'Rosa Fresa & Ámbar', primary: '#E11D48', secondary: '#D97706' },
    { name: 'Púrpura & Violeta', primary: '#8B5CF6', secondary: '#EC4899' },
    { name: 'Carbón & Naranja', primary: '#0F172A', secondary: '#EA580C' },
    { name: 'Turquesa & Lima', primary: '#0D9488', secondary: '#84CC16' },
  ];

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding(businessName.trim(), primaryColor, secondaryColor, currency);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const expiryDate = new Date(subscription.expiresAt);
  const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));


  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Configuración del Negocio & Membresía SaaS</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Personalización de marca blanca (white-label) y gestión de la suscripción comercial
        </p>
      </div>

      {/* WHITE LABEL BRANDING SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <Palette className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Identidad Corporativa (White-Label Branding)</h3>
              <p className="text-xs text-slate-500">
                Los colores se inyectan automáticamente en las variables CSS del sistema (--primary-color)
              </p>
            </div>
          </div>
          {saveSuccess && (
            <span className="flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>¡Colores actualizados en vivo!</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveBranding} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nombre Comercial del Negocio *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Símbolo de Moneda (Divisa)
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="$">$ (Dólar / Peso)</option>
                <option value="€">€ (Euro)</option>
                <option value="S/">S/ (Sol Peruano)</option>
                <option value="₡">₡ (Colón)</option>
                <option value="Q">Q (Quetzal)</option>
              </select>
            </div>
          </div>

          {/* Color Palettes Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Color Primario (Botones, Acentos principales, Encabezados)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-32 font-mono text-xs uppercase px-3 py-2 border border-slate-300 rounded-xl"
                />
                <div
                  className="flex-1 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  Vista Previa
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Color Secundario (Insignias, Notificaciones, Gradientes)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-32 font-mono text-xs uppercase px-3 py-2 border border-slate-300 rounded-xl"
                />
                <div
                  className="flex-1 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: secondaryColor }}
                >
                  Secundario
                </div>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-500 block mb-2">
              Paletas Recomendadas de un Clic:
            </span>
            <div className="flex flex-wrap gap-2">
              {presetPalettes.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(p.primary);
                    setSecondaryColor(p.secondary);
                  }}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs text-slate-700 bg-slate-50"
                >
                  <div className="flex space-x-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.secondary }} />
                  </div>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md hover:opacity-95"
              style={{ backgroundColor: primaryColor }}
            >
              Guardar y Aplicar Branding
            </button>
          </div>
        </form>
      </div>

      {/* SAAS SUBSCRIPTION MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <CreditCard className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Estado de la Suscripción SaaS</h3>
              <p className="text-xs text-slate-500">
                Modelo por membresía con corte automatizado de acceso transaccional
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div
            className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isSubscriptionExpired
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50/50 border-emerald-200'
            }`}
          >
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isSubscriptionExpired
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isSubscriptionExpired ? 'Suscripción Vencida' : 'Membresía Activa'}
                </span>
                <span className="text-sm font-bold text-slate-800">{subscription.planName}</span>
              </div>

              <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                <div>
                  Fecha de Vencimiento:{' '}
                  <span className="font-bold">
                    {expiryDate.toLocaleDateString([], {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>{' '}
                  ({isSubscriptionExpired ? 'Expiró' : `${daysRemaining} días restantes`})
                </div>
                <div>
                  Costo del Plan:{' '}
                  <span className="font-bold">
                    ${subscription.price.toFixed(2)} USD / período
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => renewSubscription(1)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renovar +1 Mes</span>
              </button>


            </div>
          </div>

          {/* Pricing tiers overview (dinámico desde el catálogo de la plataforma) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Planes Disponibles de la Plataforma SaaS:
            </h4>
            {plansLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No hay planes disponibles por el momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((p) => {
                  const isCurrent = subscription.planName === p.name;
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl text-xs space-y-2 relative flex flex-col ${
                        p.isPopular ? 'border-2 border-slate-800 bg-white shadow-xs' : 'border border-slate-200 bg-slate-50'
                      }`}
                    >
                      {p.isPopular && (
                        <span className="absolute -top-2.5 right-3 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Más Popular
                        </span>
                      )}
                      <span className="font-bold text-slate-800 block text-sm">{p.name}</span>
                      <div className="text-lg font-black text-slate-900">
                        {symbolForCode(p.currency)} {p.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" /> {p.durationDays} días por período
                      </div>
                      {p.description && <p className="text-slate-500 text-[11px] flex-1">{p.description}</p>}
                      <button
                        onClick={() => handleSubscribe(p.id)}
                        disabled={subscribingId === p.id}
                        className={`mt-1 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[11px] transition-colors disabled:opacity-60 ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {subscribingId === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        {isCurrent ? 'Renovar este plan' : 'Activar plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MULTIMONEDA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center space-x-2">
          <Coins className="w-4 h-4 text-slate-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Monedas aceptadas (Multimoneda)</h3>
            <p className="text-[11px] text-slate-500">Define el tipo de cambio respecto a tu moneda base ({currentTenant.currency}). El POS podrá cobrar en cualquier moneda activa.</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            {currencies.length === 0 && (
              <p className="text-xs text-slate-400">Aún no hay monedas configuradas.</p>
            )}
            {currencies.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-2 min-w-[140px]">
                  <span className="font-bold text-slate-800 text-sm">{c.code}</span>
                  <span className="text-xs text-slate-500">{c.symbol} · {c.name}</span>
                  {c.isBase && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">BASE</span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-slate-500">1 {currentTenant.currency} =</span>
                  <input
                    type="number"
                    step="0.0001"
                    defaultValue={c.rateToBase}
                    disabled={c.isBase}
                    onBlur={(e) => handleUpdateRate(c, parseFloat(e.target.value))}
                    className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-[11px] text-slate-500">{c.code}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  {!c.isBase && (
                    <button onClick={() => handleSetBaseCurrency(c)} className="flex items-center space-x-1 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg" title="Definir como moneda base">
                      <Star className="w-3 h-3" /><span>Base</span>
                    </button>
                  )}
                  <button onClick={() => handleToggleCurActive(c)} className={`flex items-center space-x-1 px-2 py-1 text-[11px] font-medium rounded-lg border ${c.isActive ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                    <Power className="w-3 h-3" /><span>{c.isActive ? 'Activa' : 'Inactiva'}</span>
                  </button>
                  {!c.isBase && (
                    <button onClick={() => handleDeleteCurrency(c)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCurrency} className="flex flex-wrap items-end gap-2 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Moneda</label>
              <select value={newCurCode} onChange={(e) => setNewCurCode(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white">
                {CURRENCY_PRESETS.filter((p) => !currencies.some((c) => c.code === p.code)).map((p) => (
                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de cambio (1 {currentTenant.currency} = ?)</label>
              <input type="number" step="0.0001" value={newCurRate} onChange={(e) => setNewCurRate(e.target.value)} className="w-28 px-2 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
            <button type="submit" className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg">
              <Plus className="w-3.5 h-3.5" /><span>Agregar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

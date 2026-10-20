'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
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
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentTenant,
    subscription,
    isSubscriptionExpired,
    updateBranding,
    renewSubscription,
    toggleSubscriptionSimulation,
    refreshState,
  } = useAuth();

  // Branding Form State
  const [businessName, setBusinessName] = useState(currentTenant.name);
  const [primaryColor, setPrimaryColor] = useState(currentTenant.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(currentTenant.secondaryColor);
  const [currency, setCurrency] = useState(currentTenant.currency);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleResetData = () => {
    if (confirm('¿Restablecer todos los datos demo a su estado inicial? Se reiniciarán productos, ventas y configuraciones.')) {
      db.resetAllData();
      refreshState();
      window.location.reload();
    }
  };

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

              <button
                onClick={() =>
                  toggleSubscriptionSimulation(isSubscriptionExpired ? 'active' : 'expired')
                }
                className="px-4 py-2.5 rounded-xl font-semibold text-xs border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                title="Prueba cómo reacciona el ERP cuando se corta la suscripción"
              >
                {isSubscriptionExpired
                  ? 'Desactivar Modo Vencido'
                  : 'Simular Vencimiento (Bloqueo)'}
              </button>
            </div>
          </div>

          {/* Pricing tiers overview */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Planes Disponibles de la Plataforma SaaS:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <span className="font-bold text-slate-800 block text-sm">Básico Emprendedor</span>
                <div className="text-lg font-black text-slate-900">$19.99 / mes</div>
                <p className="text-slate-500 text-[11px]">1 Caja POS, hasta 100 productos, catálogo básico.</p>
              </div>

              <div className="p-4 rounded-xl border-2 border-slate-800 bg-white text-xs space-y-2 relative shadow-xs">
                <span className="absolute -top-2.5 right-3 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Más Popular
                </span>
                <span className="font-bold text-slate-800 block text-sm">Comercial Pro</span>
                <div className="text-lg font-black text-slate-900">$39.99 / mes</div>
                <p className="text-slate-500 text-[11px]">Cajas ilimitadas, inventario masivo, reportes y RBAC completo.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <span className="font-bold text-slate-800 block text-sm">Enterprise Multi-Sucursal</span>
                <div className="text-lg font-black text-slate-900">$99.00 / mes</div>
                <p className="text-slate-500 text-[11px]">Soporte prioritario 24/7, multi-almacén y branding personalizado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM RESET */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-xs">
        <div>
          <h4 className="text-xs font-bold text-slate-800">Restablecer Datos de Demostración</h4>
          <p className="text-xs text-slate-500">
            Devuelve los comercios, productos y usuarios a sus valores iniciales preconfigurados
          </p>
        </div>
        <button
          onClick={handleResetData}
          className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
        >
          Restablecer Todo
        </button>
      </div>
    </div>
  );
};

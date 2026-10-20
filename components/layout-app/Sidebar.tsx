'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingCart,
  Package,
  ReceiptText,
  BarChart3,
  Users,
  LifeBuoy,
  Settings,
  Sparkles,
  Building2,
  Tag,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { currentTenant, hasPermission, subscription, isSubscriptionExpired, isPlatformAdmin, activeTenantId } = useAuth();

  const navItems = [
    ...(isPlatformAdmin
      ? [
          { id: 'empresas', label: 'Empresas (Plataforma)', icon: Building2, permission: undefined, badge: 'Global' },
          { id: 'planes', label: 'Planes SaaS', icon: Tag, permission: undefined, badge: 'Global' },
        ]
      : []),
    {
      id: 'pos',
      label: 'Punto de Venta (POS)',
      icon: ShoppingCart,
      permission: 'orders.create',
      badge: 'Caja',
    },
    {
      id: 'inventory',
      label: 'Inventario & Stock',
      icon: Package,
      permission: 'products.read',
    },
    {
      id: 'orders',
      label: 'Historial de Ventas',
      icon: ReceiptText,
      permission: 'orders.read',
    },
    {
      id: 'reports',
      label: 'Reportes y Finanzas',
      icon: BarChart3,
      permission: 'reports.read',
    },
    {
      id: 'users',
      label: 'Personal & Permisos',
      icon: Users,
      permission: 'users.read',
    },
    {
      id: 'support',
      label: 'Soporte e Incidencias',
      icon: LifeBuoy,
      permission: 'support.read',
    },
    {
      id: 'settings',
      label: 'Configuración & Marca',
      icon: Settings,
      permission: 'settings.read',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-53px)] select-none">
      <div className="p-4 space-y-6">
        {/* White-label branding badge */}
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-xs flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${currentTenant?.primaryColor || '#0f172a'}, ${currentTenant?.secondaryColor || '#3b82f6'})`,
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
              {isPlatformAdmin && !activeTenantId ? 'Super Admin Global' : 'ERP / POS Multi-Tenant'}
            </span>
            <div className="text-sm font-bold text-slate-800 truncate">
              {isPlatformAdmin && !activeTenantId ? 'Todas las Empresas' : (currentTenant?.name || 'Mi Negocio')}
            </div>
          </div>
        </div>

        {/* Navigation list — solo se muestran las opciones con permiso */}
        <nav className="space-y-1">
          {navItems
            .filter((item) => !item.permission || hasPermission(item.permission))
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: currentTenant?.primaryColor || '#0f172a',
                        }
                      : {}
                  }
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && !isActive ? (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase"
                      style={{
                        backgroundColor: `${currentTenant?.primaryColor || '#0f172a'}15`,
                        color: currentTenant?.primaryColor || '#0f172a',
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Bottom Tenant Details & Subscription Card */}
      {isPlatformAdmin && !activeTenantId ? (
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-1">
            <div className="font-bold flex items-center justify-between">
              <span>Super Administrador</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Global</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Visualización y control total sobre todas las empresas de la plataforma.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div
            className={`p-3 rounded-xl border text-xs ${
              isSubscriptionExpired
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between font-semibold mb-1">
              <span>Membresía SaaS</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full uppercase font-bold ${
                  isSubscriptionExpired
                    ? 'bg-rose-200 text-rose-900'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isSubscriptionExpired ? 'Vencida' : 'Activa'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">{subscription?.planName || 'Plan Comercial'}</div>
            <div className="text-[10px] text-slate-400 mt-1">
              Vence:{' '}
              {subscription?.expiresAt
                ? new Date(subscription.expiresAt).toLocaleDateString([], {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A'}
            </div>
          </div>

          {/* White-Label Color Indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Paleta Tenant:</span>
            <div className="flex items-center space-x-1.5">
              <div
                className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                style={{ backgroundColor: currentTenant?.primaryColor || '#10B981' }}
                title={`Primario: ${currentTenant?.primaryColor || '#10B981'}`}
              />
              <div
                className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                style={{ backgroundColor: currentTenant?.secondaryColor || '#0284C7' }}
                title={`Secundario: ${currentTenant?.secondaryColor || '#0284C7'}`}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

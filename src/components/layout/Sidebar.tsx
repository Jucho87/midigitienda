import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  Package,
  ReceiptText,
  BarChart3,
  Users,
  LifeBuoy,
  Settings,
  Sparkles,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { currentTenant, hasPermission, subscription, isSubscriptionExpired } = useAuth();

  const navItems = [
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
      permission: 'users.manage',
    },
    {
      id: 'support',
      label: 'Soporte e Incidencias',
      icon: LifeBuoy,
      permission: 'support.manage',
    },
    {
      id: 'settings',
      label: 'Configuración & Marca',
      icon: Settings,
      permission: 'settings.manage',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-53px)] select-none">
      <div className="p-4 space-y-6">
        {/* White-label branding badge */}
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-xs"
            style={{
              background: `linear-gradient(135deg, ${currentTenant.primaryColor}, ${currentTenant.secondaryColor})`,
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              ERP / POS Multi-Tenant
            </span>
            <div className="text-sm font-bold text-slate-800 truncate">{currentTenant.name}</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAllowed = !item.permission || hasPermission(item.permission);
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => isAllowed && onSelectTab(item.id)}
                disabled={!isAllowed}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white shadow-sm'
                    : isAllowed
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: currentTenant.primaryColor,
                      }
                    : {}
                }
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {!isAllowed ? (
                  <span title="Requiere permisos adicionales">
                    <Lock className="w-3.5 h-3.5 text-slate-300" />
                  </span>
                ) : item.badge && !isActive ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase"
                    style={{
                      backgroundColor: `${currentTenant.primaryColor}15`,
                      color: currentTenant.primaryColor,
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
          <div className="text-[11px] text-slate-500">{subscription.planName}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            Vence:{' '}
            {new Date(subscription.expiresAt).toLocaleDateString([], {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* White-Label Color Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Paleta Tenant:</span>
          <div className="flex items-center space-x-1.5">
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
              style={{ backgroundColor: currentTenant.primaryColor }}
              title={`Primario: ${currentTenant.primaryColor}`}
            />
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
              style={{ backgroundColor: currentTenant.secondaryColor }}
              title={`Secundario: ${currentTenant.secondaryColor}`}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

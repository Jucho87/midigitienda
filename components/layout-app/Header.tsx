'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import {
  Store,
  User as UserIcon,
  Bell,
  AlertTriangle,
  Clock,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onNavigateToTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateToTab }) => {
  const {
    currentTenant,
    currentUser,
    currentRole,
    subscription,
    isSubscriptionExpired,
    renewSubscription,
    logout,
  } = useAuth();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notifications = db.getNotifications(currentTenant.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const expiryDate = new Date(subscription.expiresAt);
  const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleMarkAllRead = () => {
    db.markAllNotificationsAsRead(currentTenant.id);
    setShowNotifDropdown(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex items-center justify-between shadow-xs">
      {/* Left: Branding del negocio */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm shadow-xs"
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            <Store className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-800 text-sm max-w-[160px] md:max-w-[220px] truncate block">
              {currentTenant.name}
            </span>
            <span className="text-[11px] text-slate-500 block leading-tight">
              Moneda base: <span className="font-mono text-slate-600">{currentTenant.currency}</span>
            </span>
          </div>
        </div>

        {/* Pill de suscripción */}
        <div className="hidden sm:flex items-center space-x-1.5">
          {isSubscriptionExpired ? (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Suscripción Vencida</span>
              <button
                onClick={() => renewSubscription(1)}
                className="ml-1 underline text-rose-800 hover:text-rose-900 font-semibold"
              >
                Renovar
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {subscription.planName.split(' ')[0]} ({daysRemaining}d restantes)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Notificaciones y usuario */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Notificaciones */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowUserDropdown(false);
            }}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800">Centro de Notificaciones</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-slate-500 hover:text-slate-800">
                    Marcar todas leídas
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No hay notificaciones</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        db.markNotificationAsRead(notif.id);
                        if (notif.type === 'inventory_warning') onNavigateToTab('inventory');
                        if (notif.type === 'support_update') onNavigateToTab('support');
                        setShowNotifDropdown(false);
                      }}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-amber-50/40' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-slate-800">{notif.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Usuario actual + logout */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifDropdown(false);
            }}
            className="flex items-center space-x-2 pl-2 pr-3 py-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold overflow-hidden">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-medium text-slate-500 leading-none">
                {currentRole?.name || 'Sin Rol'}
              </div>
            </div>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
              </div>
              <button
                onClick={() => { setShowUserDropdown(false); logout(); }}
                className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

'use client';

import React, { useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout-app/Header';
import { Sidebar } from '@/components/layout-app/Sidebar';
import { SubscriptionBanner } from '@/components/common/SubscriptionBanner';

import { PosView } from '@/views/pos/PosView';
import { InventoryView } from '@/views/inventory/InventoryView';
import { OrdersView } from '@/views/orders/OrdersView';
import { ReportsView } from '@/views/reports/ReportsView';
import { UsersView } from '@/views/users/UsersView';
import { SupportView } from '@/views/support/SupportView';
import { SettingsView } from '@/views/settings/SettingsView';
import { EmpresasView } from '@/views/admin/EmpresasView';
import { PlanesView } from '@/views/admin/PlanesView';

const AppShell: React.FC = () => {
  const { currentTenant, currentUser, isPlatformAdmin, activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() => (isPlatformAdmin && !activeTenantId ? 'empresas' : 'pos'));

  const renderActiveView = () => {
    switch (activeTab) {
      case 'empresas':
        return <EmpresasView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'planes':
        return <PlanesView />;
      case 'pos':
        return <PosView />;
      case 'inventory':
        return <InventoryView />;
      case 'orders':
        return <OrdersView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      case 'support':
        return <SupportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <PosView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <Header onNavigateToTab={(tab) => setActiveTab(tab)} />

      {/* Subscription Expiration Banner */}
      <SubscriptionBanner />

      {/* Main Body with Sidebar + View Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />
        </div>

        {/* View Canvas */}
        <main className="flex-1 flex flex-col h-[calc(100vh-53px)] overflow-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'pos' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={activeTab === 'pos' ? { color: currentTenant?.primaryColor } : {}}
        >
          <span>POS Caja</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'inventory' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={activeTab === 'inventory' ? { color: currentTenant?.primaryColor } : {}}
        >
          <span>Inventario</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'orders' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={activeTab === 'orders' ? { color: currentTenant?.primaryColor } : {}}
        >
          <span>Ventas</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'settings' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={activeTab === 'settings' ? { color: currentTenant?.primaryColor } : {}}
        >
          <span>Ajustes</span>
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

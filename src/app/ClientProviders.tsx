'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { SubscriptionBanner } from '../components/common/SubscriptionBanner';
import { NewTenantModal } from '../components/common/NewTenantModal';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showNewTenantModal, setShowNewTenantModal] = useState<boolean>(false);

  // Derive active tab from current route
  const path = pathname || '/';
  const currentTab = path === '/' || path === '/pos' 
    ? 'pos' 
    : path.replace('/', '');

  const handleSelectTab = (tab: string) => {
    router.push(`/${tab === 'pos' ? '' : tab}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <Header
        onOpenNewTenantModal={() => setShowNewTenantModal(true)}
        onNavigateToTab={handleSelectTab}
      />

      {/* Subscription Expiration Banner */}
      <SubscriptionBanner />

      {/* Main Body with Sidebar + View Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar activeTab={currentTab} onSelectTab={handleSelectTab} />
        </div>

        {/* View Canvas */}
        <main className="flex-1 flex flex-col h-[calc(100vh-53px)] overflow-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40">
        <button
          onClick={() => handleSelectTab('pos')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            currentTab === 'pos' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={currentTab === 'pos' ? { color: currentTenant.primaryColor } : {}}
        >
          <span>POS Caja</span>
        </button>
        <button
          onClick={() => handleSelectTab('inventory')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            currentTab === 'inventory' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={currentTab === 'inventory' ? { color: currentTenant.primaryColor } : {}}
        >
          <span>Inventario</span>
        </button>
        <button
          onClick={() => handleSelectTab('orders')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            currentTab === 'orders' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={currentTab === 'orders' ? { color: currentTenant.primaryColor } : {}}
        >
          <span>Ventas</span>
        </button>
        <button
          onClick={() => handleSelectTab('settings')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            currentTab === 'settings' ? 'text-slate-900' : 'text-slate-400'
          }`}
          style={currentTab === 'settings' ? { color: currentTenant.primaryColor } : {}}
        >
          <span>Ajustes</span>
        </button>
      </div>

      {/* New Tenant Modal */}
      <NewTenantModal
        isOpen={showNewTenantModal}
        onClose={() => setShowNewTenantModal(false)}
      />
    </div>
  );
};

export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppLayout>{children}</AppLayout>
      </AuthProvider>
    </ThemeProvider>
  );
};

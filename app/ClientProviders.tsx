'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout-app/Header';
import { Sidebar } from '@/components/layout-app/Sidebar';
import { SubscriptionBanner } from '@/components/common/SubscriptionBanner';

const PUBLIC_ROUTES = ['/login', '/signup'];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const path = pathname || '/';
  const currentTab = path === '/' || path === '/pos' ? 'pos' : path.replace('/', '');
  void currentTenant;

  const handleSelectTab = (tab: string) => {
    router.push(`/${tab === 'pos' ? '' : tab}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      <Header onNavigateToTab={handleSelectTab} />

      <SubscriptionBanner />

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:block">
          <Sidebar activeTab={currentTab} onSelectTab={handleSelectTab} />
        </div>

        <main className="flex-1 flex flex-col h-[calc(100vh-53px)] overflow-hidden">
          {children}
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40">
        <button onClick={() => handleSelectTab('pos')} className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${currentTab === 'pos' ? 'text-slate-900' : 'text-slate-400'}`} style={currentTab === 'pos' ? { color: currentTenant?.primaryColor } : {}}>
          <span>POS Caja</span>
        </button>
        <button onClick={() => handleSelectTab('inventory')} className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${currentTab === 'inventory' ? 'text-slate-900' : 'text-slate-400'}`} style={currentTab === 'inventory' ? { color: currentTenant?.primaryColor } : {}}>
          <span>Inventario</span>
        </button>
        <button onClick={() => handleSelectTab('orders')} className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${currentTab === 'orders' ? 'text-slate-900' : 'text-slate-400'}`} style={currentTab === 'orders' ? { color: currentTenant?.primaryColor } : {}}>
          <span>Ventas</span>
        </button>
        <button onClick={() => handleSelectTab('settings')} className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${currentTab === 'settings' ? 'text-slate-900' : 'text-slate-400'}`} style={currentTab === 'settings' ? { color: currentTenant?.primaryColor } : {}}>
          <span>Ajustes</span>
        </button>
      </div>
    </div>
  );
};

const Gate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useSession() || {};
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname || '');

  useEffect(() => {
    if (!isPublic && status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [isPublic, status, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthProvider>
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  );
};

export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Gate>{children}</Gate>
      </ThemeProvider>
    </SessionProvider>
  );
};

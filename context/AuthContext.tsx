'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { Tenant, User, TenantSubscription, Role } from '@/types';
import { db } from '@/services/db';
import { useTheme } from './ThemeContext';

interface AuthContextType {
  currentTenant: Tenant;
  currentUser: User;
  currentRole: Role | undefined;
  permissions: string[];
  subscription: TenantSubscription;
  allTenants: Tenant[];
  tenantUsers: User[];
  isSubscriptionExpired: boolean;
  isPlatformAdmin: boolean;
  activeTenantId: string | null;
  hasPermission: (slug: string) => boolean;
  setActiveTenant: (tenantId: string) => Promise<void>;
  refreshState: () => Promise<void>;
  updateBranding: (name: string, primaryColor: string, secondaryColor: string, currency: string) => void;
  renewSubscription: (months?: number) => void;
  subscribeToPlan: (planId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setBrandingColors } = useTheme();
  const [hydrated, setHydrated] = useState<boolean>(db.isHydrated());
  const [tick, setTick] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(0);

  // Hidratar desde la API una sola vez al montar (usuario ya autenticado).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!db.isHydrated()) await db.refresh();
      } catch (e) {
        console.error('Error al cargar el negocio', e);
      }
      if (!active) return;
      const t = db.getCurrentTenant();
      if (t) setBrandingColors(t.primaryColor, t.secondaryColor);
      setHydrated(true);
      setNowTs(Date.now());
    })();
    return () => { active = false; };
  }, [setBrandingColors]);

  const setActiveTenant = useCallback(async (tenantId: string) => {
    await db.setActiveTenant(tenantId);
    const t = db.getCurrentTenant();
    if (t) setBrandingColors(t.primaryColor, t.secondaryColor);
    setTick((x) => x + 1);
    setNowTs(Date.now());
  }, [setBrandingColors]);

  const refreshState = useCallback(async () => {
    try {
      await db.refresh();
      const t = db.getCurrentTenant();
      if (t) setBrandingColors(t.primaryColor, t.secondaryColor);
    } catch (e) {
      console.error('refreshState', e);
    }
    setTick((x) => x + 1);
    setNowTs(Date.now());
  }, [setBrandingColors]);

  const updateBranding = useCallback(
    (name: string, primaryColor: string, secondaryColor: string, currency: string) => {
      const t = db.getCurrentTenant();
      if (!t) return;
      db.updateTenantBranding(t.id, { name, primaryColor, secondaryColor, currency });
      setBrandingColors(primaryColor, secondaryColor);
      setTick((x) => x + 1);
    },
    [setBrandingColors]
  );

  const renewSubscription = useCallback((months: number = 1) => {
    const t = db.getCurrentTenant();
    if (!t) return;
    db.renewSubscription(t.id, months);
    setTick((x) => x + 1);
    setNowTs(Date.now());
  }, []);

  const subscribeToPlan = useCallback(async (planId: string) => {
    await db.subscribeToPlan(planId);
    setTick((x) => x + 1);
    setNowTs(Date.now());
  }, []);

  const logout = useCallback(() => {
    db.reset();
    signOut({ callbackUrl: '/login' });
  }, []);

  // Valores derivados (se recalculan con cada tick).
  const currentTenant = useMemo(() => db.getCurrentTenant(), [tick, hydrated]) as Tenant;
  const currentUser = useMemo(() => db.getCurrentUser(), [tick, hydrated]) as User;
  const tenantUsers = useMemo(() => (currentTenant ? db.getUsers(currentTenant.id) : []), [tick, hydrated, currentTenant]);
  const subscription = useMemo(
    () => (currentTenant ? db.getSubscription(currentTenant.id) : ({ id: 'none', tenantId: '', planName: 'Sin plan', price: 0, expiresAt: new Date(0).toISOString(), status: 'expired' } as TenantSubscription)),
    [tick, hydrated, currentTenant]
  );
  const currentRole = useMemo(
    () => (currentTenant && currentUser?.roleId ? db.getRoleById(currentTenant.id, currentUser.roleId) : undefined),
    [tick, hydrated, currentTenant, currentUser]
  );
  const permissions = useMemo(() => (currentUser ? db.getUserPermissions(currentUser) : []), [tick, hydrated, currentUser]);
  const isPlatformAdmin = useMemo(() => db.isPlatformAdmin(), [tick, hydrated]);
  const activeTenantId = useMemo(() => db.getActiveTenantId(), [tick, hydrated]);

  const hasPermission = useCallback((slug: string): boolean => permissions.includes(slug), [permissions]);

  const isSubscriptionExpired = useMemo(() => {
    if (!subscription || subscription.status !== 'active') return true;
    if (nowTs === 0) return false;
    return new Date(subscription.expiresAt).getTime() <= nowTs;
  }, [subscription, nowTs]);

  const value = useMemo(
    () => ({
      currentTenant,
      currentUser,
      currentRole,
      permissions,
      subscription,
      allTenants: currentTenant ? [currentTenant] : [],
      tenantUsers,
      isSubscriptionExpired,
      isPlatformAdmin,
      activeTenantId,
      hasPermission,
      setActiveTenant,
      refreshState,
      updateBranding,
      renewSubscription,
      subscribeToPlan,
      logout,
    }),
    [currentTenant, currentUser, currentRole, permissions, subscription, tenantUsers, isSubscriptionExpired, isPlatformAdmin, activeTenantId, hasPermission, setActiveTenant, refreshState, updateBranding, renewSubscription, subscribeToPlan, logout]
  );

  if (!hydrated || !currentTenant || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando tu negocio…</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

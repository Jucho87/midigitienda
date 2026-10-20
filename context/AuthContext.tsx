'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Tenant, User, TenantSubscription, Role } from '@/types';
import { db } from '@/services/db';
import { useTheme } from './ThemeContext';
import { LoginView } from '@/views/auth/LoginView';

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
  dianConfig: import('@/types').DianTaxpayerData;
  updateDianConfig: (updates: Partial<import('@/types').DianTaxpayerData>) => void;
  login: (email: string) => boolean;
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

  const login = useCallback(
    (email: string): boolean => {
      const ok = db.login(email);
      if (ok) {
        const t = db.getCurrentTenant();
        if (t) setBrandingColors(t.primaryColor, t.secondaryColor);
        setHydrated(true);
        setTick((x) => x + 1);
        setNowTs(Date.now());
      }
      return ok;
    },
    [setBrandingColors]
  );

  const logout = useCallback(() => {
    db.logout();
    setHydrated(false);
    setTick((x) => x + 1);
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
  const isPlatformAdmin = useMemo(() => db.isPlatformAdmin(), [tick, hydrated, currentUser]);
  const activeTenantId = useMemo(() => db.getActiveTenantId(), [tick, hydrated]);
  const allTenants = useMemo(() => db.getAllTenants(), [tick, hydrated]);

  const hasPermission = useCallback(
    (slug: string): boolean => {
      // El super administrador es el único usuario con poder total y acceso universal
      if (isPlatformAdmin) return true;
      if (!permissions || permissions.length === 0) return false;

      // Coincidencia exacta de slug granular
      if (permissions.includes(slug)) return true;

      // Jerarquías y macros de administración
      if (slug.startsWith('users.') || slug.startsWith('roles.')) {
        if (permissions.includes('users.manage')) return true;
      }
      if (slug.startsWith('settings.') && permissions.includes('settings.manage')) return true;
      if (slug.startsWith('support.') && permissions.includes('support.manage')) return true;

      // Alias de navegación y lectura
      if ((slug === 'orders.view' || slug === 'orders.read') && permissions.includes('orders.create')) return true;
      if ((slug === 'orders.view' || slug === 'orders.read') && permissions.includes('orders.view')) return true;
      if ((slug === 'products.view' || slug === 'products.read') && (permissions.includes('products.read') || permissions.includes('products.create') || permissions.includes('products.update'))) return true;
      if (slug === 'dian.view' && (permissions.includes('dian.pos_equivalent') || permissions.includes('dian.fev_invoice') || permissions.includes('dian.config'))) return true;

      return false;
    },
    [isPlatformAdmin, permissions]
  );

  const isSubscriptionExpired = useMemo(() => {
    if (isPlatformAdmin) return false;
    if (!subscription || subscription.status !== 'active') return true;
    if (nowTs === 0) return false;
    return new Date(subscription.expiresAt).getTime() <= nowTs;
  }, [isPlatformAdmin, subscription, nowTs]);

  const dianConfig = useMemo(
    () => (currentTenant ? db.getDianConfig(currentTenant.id) : db.getDianConfig()),
    [currentTenant, tick]
  );

  const updateDianConfig = useCallback(
    (updates: Partial<import('@/types').DianTaxpayerData>) => {
      const t = db.getCurrentTenant();
      if (!t) return;
      db.updateDianConfig(t.id, updates);
      setTick((x) => x + 1);
    },
    []
  );

  const value = useMemo(
    () => ({
      currentTenant,
      currentUser,
      currentRole,
      permissions,
      subscription,
      allTenants,
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
      dianConfig,
      updateDianConfig,
      login,
      logout,
    }),
    [currentTenant, currentUser, currentRole, permissions, subscription, allTenants, tenantUsers, isSubscriptionExpired, isPlatformAdmin, activeTenantId, hasPermission, setActiveTenant, refreshState, updateBranding, renewSubscription, subscribeToPlan, dianConfig, updateDianConfig, login, logout]
  );

  if (!hydrated || !currentUser) {
    return <LoginView onLogin={login} />;
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

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Tenant, User, TenantSubscription, Role } from '../types';
import { db } from '../services/db';
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
  hasPermission: (slug: string) => boolean;
  switchTenant: (tenantId: string) => void;
  switchUser: (userId: string) => void;
  refreshState: () => void;
  updateBranding: (name: string, primaryColor: string, secondaryColor: string, currency: string) => void;
  renewSubscription: (months?: number) => void;
  toggleSubscriptionSimulation: (status: 'active' | 'expired') => void;
  createNewTenant: (name: string, primaryColor: string, secondaryColor: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setBrandingColors } = useTheme();

  // Load initial tenants
  const [allTenants, setAllTenants] = useState<Tenant[]>(() => db.getTenants());
  const [currentTenant, setCurrentTenant] = useState<Tenant>(() => allTenants[0] || db.getTenants()[0]);

  // Load users for current tenant
  const [tenantUsers, setTenantUsers] = useState<User[]>(() => db.getUsers(currentTenant.id));
  const [currentUser, setCurrentUser] = useState<User>(() => tenantUsers[0] || db.getUsers(currentTenant.id)[0]);

  // Subscription
  const [subscription, setSubscription] = useState<TenantSubscription>(() => db.getSubscription(currentTenant.id));

  // Sync theme whenever tenant changes
  useEffect(() => {
    if (currentTenant) {
      setBrandingColors(currentTenant.primaryColor, currentTenant.secondaryColor);
    }
  }, [currentTenant, setBrandingColors]);

  const refreshState = useCallback(() => {
    const freshTenants = db.getTenants();
    setAllTenants(freshTenants);

    const updatedTenant = freshTenants.find((t) => t.id === currentTenant.id) || freshTenants[0];
    setCurrentTenant(updatedTenant);

    const freshUsers = db.getUsers(updatedTenant.id);
    setTenantUsers(freshUsers);

    const updatedUser = freshUsers.find((u) => u.id === currentUser?.id) || freshUsers[0];
    setCurrentUser(updatedUser);

    const freshSub = db.getSubscription(updatedTenant.id);
    setSubscription(freshSub);
  }, [currentTenant.id, currentUser?.id]);

  // Handle switching tenant
  const switchTenant = useCallback(
    (tenantId: string) => {
      const targetTenant = allTenants.find((t) => t.id === tenantId);
      if (!targetTenant) return;

      setCurrentTenant(targetTenant);
      setBrandingColors(targetTenant.primaryColor, targetTenant.secondaryColor);

      const users = db.getUsers(targetTenant.id);
      setTenantUsers(users);
      setCurrentUser(users[0]);

      const sub = db.getSubscription(targetTenant.id);
      setSubscription(sub);
    },
    [allTenants, setBrandingColors]
  );

  // Handle switching user
  const switchUser = useCallback(
    (userId: string) => {
      const user = tenantUsers.find((u) => u.id === userId);
      if (user) {
        setCurrentUser(user);
      }
    },
    [tenantUsers]
  );

  // Update branding
  const updateBranding = useCallback(
    (name: string, primaryColor: string, secondaryColor: string, currency: string) => {
      const updated = db.updateTenantBranding(currentTenant.id, {
        name,
        primaryColor,
        secondaryColor,
        currency,
      });
      setCurrentTenant(updated);
      setBrandingColors(primaryColor, secondaryColor);
      refreshState();
    },
    [currentTenant.id, refreshState, setBrandingColors]
  );

  // Renew subscription
  const renewSub = useCallback(
    (months: number = 1) => {
      const updated = db.renewSubscription(currentTenant.id, months);
      setSubscription({ ...updated });
      refreshState();
    },
    [currentTenant.id, refreshState]
  );

  // Toggle simulate expired/active
  const toggleSub = useCallback(
    (status: 'active' | 'expired') => {
      const updated = db.simulateSubscriptionStatus(currentTenant.id, status);
      setSubscription({ ...updated });
      refreshState();
    },
    [currentTenant.id, refreshState]
  );

  // Create new tenant
  const createNewTenant = useCallback(
    (name: string, primaryColor: string, secondaryColor: string) => {
      const { tenant, adminUser } = db.createTenant(name, primaryColor, secondaryColor);
      const updatedTenants = db.getTenants();
      setAllTenants(updatedTenants);
      setCurrentTenant(tenant);
      setBrandingColors(tenant.primaryColor, tenant.secondaryColor);

      const users = db.getUsers(tenant.id);
      setTenantUsers(users);
      setCurrentUser(adminUser);

      setSubscription(db.getSubscription(tenant.id));
    },
    [setBrandingColors]
  );

  // Current Role & Permissions
  const currentRole = useMemo(() => {
    if (!currentUser?.roleId) return undefined;
    return db.getRoleById(currentTenant.id, currentUser.roleId);
  }, [currentTenant.id, currentUser?.roleId]);

  const permissions = useMemo(() => {
    if (!currentUser) return [];
    return db.getUserPermissions(currentUser);
  }, [currentUser]);

  const hasPermission = useCallback(
    (slug: string): boolean => {
      return permissions.includes(slug);
    },
    [permissions]
  );

  const isSubscriptionExpired = useMemo(() => {
    if (subscription.status !== 'active') return true;
    return new Date(subscription.expiresAt) <= new Date();
  }, [subscription]);

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
      hasPermission,
      switchTenant,
      switchUser,
      refreshState,
      updateBranding,
      renewSubscription: renewSub,
      toggleSubscriptionSimulation: toggleSub,
      createNewTenant,
    }),
    [
      currentTenant,
      currentUser,
      currentRole,
      permissions,
      subscription,
      allTenants,
      tenantUsers,
      isSubscriptionExpired,
      hasPermission,
      switchTenant,
      switchUser,
      refreshState,
      updateBranding,
      renewSub,
      toggleSub,
      createNewTenant,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

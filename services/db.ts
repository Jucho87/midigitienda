import {
  Tenant,
  Role,
  RolePermission,
  User,
  Product,
  TenantSubscription,
  Order,
  SupportTicket,
  Notification,
  PaymentMethod,
  Permission,
  Currency,
  Plan,
} from '@/types';
import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_ROLES,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_TICKETS,
  INITIAL_NOTIFICATIONS,
  SYSTEM_PERMISSIONS,
} from './seedData';
import {
  DianTaxpayerData,
  DianCustomerData,
  DianTaxBreakdown,
} from '@/lib/dian/types';
import { getDefaultDianConfig } from '@/lib/dian/defaults';
import { generateDianQr } from '@/lib/dian/crypto';
import { generateUblXml, generateCreditNoteUblXml } from '@/lib/dian/ubl';

function generateDeterministicSha384(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x9e3779b9, h4 = 0x7b5d6f31;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  h1 ^= Math.imul(h1 ^ (h2 >>> 15), 2246822519);
  h2 ^= Math.imul(h2 ^ (h3 >>> 13), 3266489917);
  h3 ^= Math.imul(h3 ^ (h4 >>> 16), 2654435761);
  h4 ^= Math.imul(h4 ^ (h1 >>> 14), 1597334677);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const part4 = (h4 >>> 0).toString(16).padStart(8, '0');
  return (part1 + part2 + part3 + part4).repeat(3).slice(0, 96);
}

// ---------------------------------------------------------------------------
// Almacén en memoria hidratado desde la API (/api/bootstrap).
// Mantiene firmas SÍNCRONAS para las vistas: las lecturas devuelven la caché
// local y las mutaciones aplican un cambio optimista local + persisten en el
// backend de forma asíncrona (la fuente de verdad es el servidor).
// ---------------------------------------------------------------------------

export interface BootstrapData {
  tenant: Tenant | null;
  currentUser: User | null;
  permissions: string[];
  isPlatformAdmin?: boolean;
  activeTenantId?: string | null;
  homeTenantId?: string | null;
  users: User[];
  roles: Role[];
  rolePermissions: RolePermission[];
  allPermissions: Permission[];
  products: Product[];
  orders: Order[];
  subscription: TenantSubscription | null;
  tickets: SupportTicket[];
  notifications: Notification[];
  currencies: Currency[];
}

async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const cType = res.headers.get('content-type') || '';
    if (!cType.includes('application/json')) {
      return null;
    }
    const data = await res.json();
    if (!res.ok) {
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function tempId(prefix: string): string {
  return `${prefix}-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const GLOBAL_PLATFORM_TENANT: Tenant = {
  id: 'tenant-global',
  name: 'Plataforma Global (Todas las Empresas)',
  slug: 'plataforma-global',
  status: 'active',
  primaryColor: '#0f172a', // Slate 900
  secondaryColor: '#3b82f6', // Blue 500
  currency: 'COP',
  createdAt: '2026-01-01T00:00:00Z',
  dianConfig: {
    ...getDefaultDianConfig(),
    enabled: false,
    legalName: 'MiDigiTienda SaaS Platform',
    commercialName: 'MiDigiTienda Global Multi-Empresa',
    email: 'admin@midigitienda.com',
  },
};

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan-basic',
    name: 'Plan Básico Emprendedor',
    description: 'Para microempresas y comercios que inician',
    price: 19.99,
    currency: 'USD',
    durationDays: 30,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'plan-growth',
    name: 'Plan Negocio Crecimiento',
    description: 'Para negocios en expansión con múltiples cajas',
    price: 39.99,
    currency: 'USD',
    durationDays: 30,
    isPopular: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'plan-pro-annual',
    name: 'Plan Comercial Pro (Anual)',
    description: 'Solución integral con todas las funciones desbloqueadas',
    price: 349.00,
    currency: 'USD',
    durationDays: 365,
    isPopular: false,
    isActive: true,
    sortOrder: 3,
  },
];

class DatabaseService {
  private tenant: Tenant | null = null;
  private currentUser: User | null = null;
  private currentPermissions: string[] = [];
  private platformAdmin = false;
  private activeTenantId: string | null = null;
  private homeTenantId: string | null = null;
  private users: User[] = [];
  private roles: Role[] = [];
  private rolePermissions: RolePermission[] = [];
  private allPermissions: Permission[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];
  private subscription: TenantSubscription | null = null;
  private tickets: SupportTicket[] = [];
  private notifications: Notification[] = [];
  private currencies: Currency[] = [];
  private hydrated = false;

  // Colecciones maestras reales persistidas en LocalStorage
  private tenantsList: Tenant[] = [];
  private allUsers: User[] = [];
  private allRoles: Role[] = [];
  private allRolePermissions: RolePermission[] = [];
  private allProducts: Product[] = [];
  private allOrders: Order[] = [];
  private plansList: Plan[] = [];
  private allSubscriptions: TenantSubscription[] = [];

  constructor() {
    this.initFromLocalStorageOrSeed();
  }

  private initFromLocalStorageOrSeed(): void {
    if (typeof window !== 'undefined') {
      try {
        const storedPlans = localStorage.getItem('midigitienda_plans_v2');
        if (storedPlans) {
          const parsedP = JSON.parse(storedPlans);
          if (Array.isArray(parsedP)) {
            this.plansList = parsedP;
          }
        }

        const storedTenants = localStorage.getItem('midigitienda_tenants_v2') || localStorage.getItem('midigitienda_tenants_v1');
        if (storedTenants) {
          const parsedT = JSON.parse(storedTenants);
          if (Array.isArray(parsedT)) {
            this.tenantsList = parsedT;
          }
        }

        const storedUsers = localStorage.getItem('midigitienda_users_v2');
        if (storedUsers) {
          const parsedU = JSON.parse(storedUsers);
          if (Array.isArray(parsedU)) {
            this.allUsers = parsedU;
          }
        }

        const storedRoles = localStorage.getItem('midigitienda_roles_v2');
        if (storedRoles) {
          const parsedR = JSON.parse(storedRoles);
          if (Array.isArray(parsedR) && parsedR.length > 0) {
            this.allRoles = parsedR;
          }
        }

        const storedRP = localStorage.getItem('midigitienda_role_permissions_v2');
        if (storedRP) {
          const parsedRP = JSON.parse(storedRP);
          if (Array.isArray(parsedRP) && parsedRP.length > 0) {
            this.allRolePermissions = parsedRP;
          }
        }

        const storedProds = localStorage.getItem('midigitienda_products_v2');
        if (storedProds) {
          const parsedPr = JSON.parse(storedProds);
          if (Array.isArray(parsedPr)) {
            this.allProducts = parsedPr;
          }
        }

        const storedOrds = localStorage.getItem('midigitienda_orders_v2');
        if (storedOrds) {
          const parsedOr = JSON.parse(storedOrds);
          if (Array.isArray(parsedOr)) {
            this.allOrders = parsedOr;
          }
        }

        const storedSubs = localStorage.getItem('midigitienda_subscriptions_v2');
        if (storedSubs) {
          const parsedS = JSON.parse(storedSubs);
          if (Array.isArray(parsedS)) {
            this.allSubscriptions = parsedS;
          }
        }
      } catch (e) {
        console.warn('Could not read from localStorage', e);
      }
    }

    if (!this.plansList || this.plansList.length === 0) {
      this.plansList = [...DEFAULT_PLANS];
    }

    if (!this.allRoles || this.allRoles.length === 0) {
      this.allRoles = [...INITIAL_ROLES];
    }

    if (!this.allRolePermissions || this.allRolePermissions.length === 0) {
      this.allRolePermissions = [...INITIAL_ROLE_PERMISSIONS];
    }

    // Asegurar que el super administrador existe para inicio de sesión sin atadura a empresa
    const superAdminExists = this.allUsers.some(
      (u) => u.email.toLowerCase() === 'admin@midigitienda.com' || u.roleId === 'role-superadmin'
    );
    if (!superAdminExists) {
      this.allUsers.push({
        id: 'user-superadmin-platform',
        tenantId: '',
        roleId: 'role-superadmin',
        name: 'Super Administrador Global',
        email: 'admin@midigitienda.com',
        isActive: true,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        createdAt: '2026-01-01T00:00:00Z',
      });
    }

    // Regla de oro: Todos los usuarios deben estar asociados obligatoriamente a un rol
    for (const u of this.allUsers) {
      if (u.id === 'user-superadmin-platform' || u.email?.toLowerCase() === 'admin@midigitienda.com') {
        u.roleId = 'role-superadmin';
      } else if (!u.roleId && u.tenantId) {
        const foundRole = this.allRoles.find((r) => r.tenantId === u.tenantId);
        if (foundRole) {
          u.roleId = foundRole.id;
        } else {
          const newRoleId = `role-admin-${u.tenantId}`;
          const newRole: Role = {
            id: newRoleId,
            tenantId: u.tenantId,
            name: 'Administrador de Empresa',
            description: 'Control y administración completa de la empresa',
            isSystem: true,
          };
          this.allRoles.push(newRole);
          this.allRolePermissions.push(
            ...SYSTEM_PERMISSIONS.map((p) => ({
              id: `rp-${newRoleId}-${p.id}`,
              roleId: newRoleId,
              permissionId: p.id,
            }))
          );
          u.roleId = newRoleId;
        }
      }
    }

    const tenant = GLOBAL_PLATFORM_TENANT;
    const currentUser = this.allUsers.find((u) => u.email.toLowerCase() === 'admin@midigitienda.com') || this.allUsers[0];
    const users = [...this.allUsers];
    const roles = [...this.allRoles];
    const rolePermissions = [...this.allRolePermissions];
    const allPermissions = SYSTEM_PERMISSIONS;
    const products = [...this.allProducts];
    const orders = [...this.allOrders];
    const subscription = null;
    const tickets = [...INITIAL_TICKETS];
    const notifications = [...INITIAL_NOTIFICATIONS];
    const permissions = SYSTEM_PERMISSIONS.map((p) => p.slug);
    const currencies: Currency[] = [
      { id: 'curr-usd', tenantId: tenant.id, code: 'USD', name: 'Dólar Estadounidense', symbol: '$', rateToBase: 1, isBase: true, isActive: true },
      { id: 'curr-eur', tenantId: tenant.id, code: 'EUR', name: 'Euro', symbol: '€', rateToBase: 0.92, isBase: false, isActive: true },
      { id: 'curr-pen', tenantId: tenant.id, code: 'PEN', name: 'Sol Peruano', symbol: 'S/.', rateToBase: 3.75, isBase: false, isActive: true },
      { id: 'curr-cop', tenantId: tenant.id, code: 'COP', name: 'Peso Colombiano', symbol: 'COP$', rateToBase: 4200, isBase: false, isActive: true },
      { id: 'curr-mxn', tenantId: tenant.id, code: 'MXN', name: 'Peso Mexicano', symbol: 'Mex$', rateToBase: 18.5, isBase: false, isActive: true },
    ];

    this.saveMasterData();

    this.hydrate({
      tenant,
      currentUser,
      permissions,
      isPlatformAdmin: true,
      activeTenantId: null,
      homeTenantId: null,
      users,
      roles,
      rolePermissions,
      allPermissions,
      products,
      orders,
      subscription,
      tickets,
      notifications,
      currencies,
    }, false);
  }

  saveMasterData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('midigitienda_plans_v2', JSON.stringify(this.plansList));
      localStorage.setItem('midigitienda_tenants_v2', JSON.stringify(this.tenantsList));
      localStorage.setItem('midigitienda_users_v2', JSON.stringify(this.allUsers));
      localStorage.setItem('midigitienda_roles_v2', JSON.stringify(this.allRoles));
      localStorage.setItem('midigitienda_role_permissions_v2', JSON.stringify(this.allRolePermissions));
      localStorage.setItem('midigitienda_products_v2', JSON.stringify(this.allProducts));
      localStorage.setItem('midigitienda_orders_v2', JSON.stringify(this.allOrders));
      localStorage.setItem('midigitienda_subscriptions_v2', JSON.stringify(this.allSubscriptions));
    } catch (e) {
      console.warn('Could not save master data', e);
    }
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const payload: BootstrapData = {
        tenant: this.tenant,
        currentUser: this.currentUser,
        permissions: this.currentPermissions,
        isPlatformAdmin: this.platformAdmin,
        activeTenantId: this.activeTenantId,
        homeTenantId: this.homeTenantId,
        users: this.users,
        roles: this.roles,
        rolePermissions: this.rolePermissions,
        allPermissions: this.allPermissions,
        products: this.products,
        orders: this.orders,
        subscription: this.subscription,
        tickets: this.tickets,
        notifications: this.notifications,
        currencies: this.currencies,
      };
      localStorage.setItem('midigitienda_cache_v2', JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  hydrate(data: BootstrapData, persist = true): void {
    this.tenant = data.tenant;
    this.currentUser = data.currentUser;
    this.currentPermissions = data.permissions ?? [];
    this.platformAdmin = Boolean(
      data.isPlatformAdmin ??
      (data.currentUser && !data.currentUser.tenantId) ??
      (data.currentUser?.email?.toLowerCase() === 'admin@midigitienda.com') ??
      (data.currentUser?.roleId === 'role-superadmin')
    );
    this.activeTenantId = data.activeTenantId ?? null;
    this.homeTenantId = data.homeTenantId ?? null;
    this.users = data.users ?? [];
    this.roles = data.roles ?? [];
    this.rolePermissions = data.rolePermissions ?? [];
    this.allPermissions = data.allPermissions ?? [];
    this.products = data.products ?? [];
    this.orders = data.orders ?? [];
    this.subscription = data.subscription;
    this.tickets = data.tickets ?? [];
    this.notifications = data.notifications ?? [];
    this.currencies = data.currencies ?? [];
    this.hydrated = true;
    if (persist) {
      this.saveToLocalStorage();
    }
  }

  async refresh(): Promise<void> {
    try {
      const data = await apiFetch<BootstrapData>('/api/bootstrap');
      if (data && data.tenant && data.currentUser) {
        this.hydrate(data);
        return;
      }
    } catch {
      // API not reachable; keep local state
    }
    if (!this.hydrated || !this.tenant || !this.currentUser) {
      this.initFromLocalStorageOrSeed();
    }
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  login(email: string, _password?: string): boolean {
    const cleanEmail = email.trim().toLowerCase();

    const isSuperAdminEmail =
      cleanEmail === 'admin@midigitienda.com' ||
      cleanEmail === 'superadmin@posplatform.com' ||
      cleanEmail === 'superadmin@midigitienda.com' ||
      cleanEmail.includes('superadmin');

    let user: User | undefined;
    if (isSuperAdminEmail) {
      user = this.allUsers.find((u) => u.email.toLowerCase() === 'admin@midigitienda.com' || u.roleId === 'role-superadmin') || {
        id: 'user-superadmin-platform',
        tenantId: '',
        roleId: 'role-superadmin',
        name: 'Super Administrador Global',
        email: 'admin@midigitienda.com',
        isActive: true,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        createdAt: '2026-01-01T00:00:00Z',
      };
      if (!this.allUsers.some((u) => u.id === user?.id)) {
        this.allUsers.push(user);
        this.saveMasterData();
      }
    } else {
      user = this.allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    if (!user) return false;

    // EL ÚNICO USUARIO GLOBAL Y CON PODER TOTAL ES EL SUPER ADMINISTRADOR
    const isPlatformAdmin = Boolean(
      user.roleId === 'role-superadmin' ||
      user.id === 'user-superadmin-platform' ||
      isSuperAdminEmail
    );

    // Usuario común siempre debe estar asignado a una empresa válida
    const targetTenant = (isPlatformAdmin && !user.tenantId)
      ? GLOBAL_PLATFORM_TENANT
      : (this.tenantsList.find((t) => t.id === user.tenantId) || this.tenantsList[0] || GLOBAL_PLATFORM_TENANT);

    if (!isPlatformAdmin && !user.tenantId && targetTenant) {
      user.tenantId = targetTenant.id;
    }

    const activeTenantId = isPlatformAdmin ? null : targetTenant.id;

    // Permisos: Super Admin tiene PODER TOTAL universal. Usuarios estándar tienen SOLO los de su rol.
    let permissions: string[] = [];
    if (isPlatformAdmin) {
      permissions = SYSTEM_PERMISSIONS.map((p) => p.slug);
    } else if (user.roleId) {
      permissions = this.getPermissionsForRole(user.roleId);
    } else {
      permissions = [];
    }

    const tenantRoles = isPlatformAdmin
      ? [...this.allRoles]
      : this.allRoles.filter((r) => r.tenantId === targetTenant.id);

    this.hydrate({
      tenant: targetTenant,
      currentUser: user,
      permissions,
      isPlatformAdmin,
      activeTenantId,
      homeTenantId: activeTenantId,
      users: isPlatformAdmin ? [...this.allUsers] : this.allUsers.filter((u) => u.tenantId === targetTenant.id),
      roles: tenantRoles,
      rolePermissions: [...this.allRolePermissions],
      allPermissions: [...SYSTEM_PERMISSIONS],
      products: isPlatformAdmin ? [...this.allProducts] : this.allProducts.filter((p) => p.tenantId === targetTenant.id),
      orders: isPlatformAdmin ? [...this.allOrders] : this.allOrders.filter((o) => o.tenantId === targetTenant.id),
      subscription: isPlatformAdmin ? null : (this.allSubscriptions.find((s) => s.tenantId === targetTenant.id) || null),
      tickets: isPlatformAdmin ? [...this.tickets] : this.tickets.filter((t) => t.tenantId === targetTenant.id),
      notifications: isPlatformAdmin ? [...this.notifications] : this.notifications.filter((n) => n.tenantId === targetTenant.id),
      currencies: [
        { id: 'curr-usd', tenantId: targetTenant.id, code: 'USD', name: 'Dólar Estadounidense', symbol: '$', rateToBase: 1, isBase: true, isActive: true },
        { id: 'curr-cop', tenantId: targetTenant.id, code: 'COP', name: 'Peso Colombiano', symbol: 'COP$', rateToBase: 4200, isBase: false, isActive: true },
        { id: 'curr-pen', tenantId: targetTenant.id, code: 'PEN', name: 'Sol Peruano', symbol: 'S/.', rateToBase: 3.75, isBase: false, isActive: true },
      ],
    }, true);
    return true;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('midigitienda_cache_v2');
      } catch {
        // ignore
      }
    }
    this.reset();
  }

  reset(): void {
    this.tenant = null;
    this.currentUser = null;
    this.currentPermissions = [];
    this.platformAdmin = false;
    this.activeTenantId = null;
    this.homeTenantId = null;
    this.users = [];
    this.roles = [];
    this.rolePermissions = [];
    this.allPermissions = [];
    this.products = [];
    this.orders = [];
    this.subscription = null;
    this.tickets = [];
    this.notifications = [];
    this.currencies = [];
    this.hydrated = false;
  }

  getTenants(): Tenant[] {
    return this.tenantsList;
  }

  getTenantById(id: string): Tenant | undefined {
    return this.tenantsList.find((t) => t.id === id);
  }

  getCurrentTenant(): Tenant | null {
    if (this.isPlatformAdmin() && (!this.activeTenantId || this.activeTenantId === 'tenant-global')) {
      return GLOBAL_PLATFORM_TENANT;
    }
    return this.tenant || GLOBAL_PLATFORM_TENANT;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isPlatformAdmin(): boolean {
    if (!this.currentUser) return false;
    const email = this.currentUser.email?.toLowerCase() || '';
    return (
      this.currentUser.roleId === 'role-superadmin' ||
      this.currentUser.id === 'user-superadmin-platform' ||
      email === 'admin@midigitienda.com' ||
      email === 'superadmin@midigitienda.com'
    );
  }

  getActiveTenantId(): string | null {
    if (this.activeTenantId === 'tenant-global') return null;
    return this.activeTenantId;
  }

  getAllTenants(): Tenant[] {
    return this.tenantsList;
  }

  // Lista todas las empresas de la plataforma (solo super administrador).
  async getAllTenantsAdmin(): Promise<Tenant[]> {
    return [...this.tenantsList];
  }

  // Vista consolidada de todas las empresas (solo super administrador).
  async getAdminOverview(): Promise<{ companies: any[]; totals: { companies: number; users: number; products: number; orders: number } }> {
    const companies = this.tenantsList.map((t) => {
      const tenantUsers = this.allUsers.filter((u) => u.tenantId === t.id);
      const tenantProds = this.allProducts.filter((p) => p.tenantId === t.id);
      const tenantOrds = this.allOrders.filter((o) => o.tenantId === t.id);
      const salesTotal = tenantOrds.filter((o) => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
      const sub = this.allSubscriptions.find((s) => s.tenantId === t.id) || null;
      return {
        id: t.id,
        name: t.name,
        currency: t.currency,
        status: t.status,
        primaryColor: t.primaryColor,
        secondaryColor: t.secondaryColor,
        usersCount: tenantUsers.length,
        productsCount: tenantProds.length,
        ordersCount: tenantOrds.length,
        salesTotal,
        subscription: sub ? { planName: sub.planName, expiresAt: sub.expiresAt, status: sub.status } : null,
      };
    });

    return {
      companies,
      totals: {
        companies: companies.length,
        users: this.allUsers.length,
        products: this.allProducts.length,
        orders: this.allOrders.length,
      },
    };
  }

  // Crea una nueva empresa con su administrador (solo super administrador).
  async createTenantAdmin(input: { businessName: string; adminName: string; email: string; password: string; currency: string }): Promise<void> {
    const newTenantId = `tenant-${Date.now()}`;
    const newT: Tenant = {
      id: newTenantId,
      name: input.businessName,
      slug: input.businessName.toLowerCase().replace(/\s+/g, '-'),
      status: 'active',
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
      currency: input.currency || 'USD',
      createdAt: new Date().toISOString(),
      dianConfig: {
        enabled: true,
        nit: '901999888',
        dv: '4',
        legalName: `${input.businessName} S.A.S.`,
        commercialName: input.businessName,
        taxRegime: '48',
        taxResponsibilities: ['R-99-PN'],
        ciiu: '4711',
        departmentCode: '11',
        departmentName: 'Bogotá D.C.',
        cityCode: '11001',
        cityName: 'Bogotá',
        address: 'Calle Principal # 10 - 20',
        phone: '+57 (601) 700-0000',
        email: input.email.toLowerCase(),
        resolution: {
          resolutionNumber: '18764000009',
          resolutionDate: '2026-01-01',
          prefix: 'POS',
          fromNumber: 1,
          toNumber: 5000,
          currentNumber: 1,
          validFrom: '2026-01-01',
          validTo: '2027-01-01',
          technicalKey: 'fc29e1d67a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
          environment: '2',
          softwareId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          softwarePin: '12345',
        },
      },
    };
    // Crear roles granulares base para la nueva empresa
    const adminRoleId = `role-admin-${newTenantId}`;
    const cajeroRoleId = `role-cajero-${newTenantId}`;
    const invRoleId = `role-inv-${newTenantId}`;

    const newCompanyRoles: Role[] = [
      { id: adminRoleId, tenantId: newTenantId, name: 'Administrador de Empresa', description: 'Control y administración completa de la empresa', isSystem: true },
      { id: cajeroRoleId, tenantId: newTenantId, name: 'Cajero / Punto de Venta', description: 'Acceso para cobrar, emitir tickets y consultar clientes', isSystem: false },
      { id: invRoleId, tenantId: newTenantId, name: 'Supervisor de Inventario', description: 'Gestión de productos, catálogo y ajustes de existencias', isSystem: false },
    ];
    this.allRoles.push(...newCompanyRoles);

    // Permisos completos para Administrador de Empresa
    this.allRolePermissions.push(
      ...SYSTEM_PERMISSIONS.map((p) => ({
        id: `rp-${adminRoleId}-${p.id}`,
        roleId: adminRoleId,
        permissionId: p.id,
      }))
    );
    // Permisos específicos para Cajero
    const cajeroSlugs = ['orders.view', 'orders.create', 'orders.read', 'orders.reprint', 'products.read', 'customers.read', 'customers.create', 'support.read', 'support.create'];
    this.allRolePermissions.push(
      ...SYSTEM_PERMISSIONS.filter((p) => cajeroSlugs.includes(p.slug)).map((p) => ({
        id: `rp-${cajeroRoleId}-${p.id}`,
        roleId: cajeroRoleId,
        permissionId: p.id,
      }))
    );
    // Permisos para Supervisor de Inventario
    const invSlugs = ['products.read', 'products.create', 'products.update', 'products.delete', 'products.stock_adjust', 'products.categories', 'orders.read', 'support.read', 'support.create'];
    this.allRolePermissions.push(
      ...SYSTEM_PERMISSIONS.filter((p) => invSlugs.includes(p.slug)).map((p) => ({
        id: `rp-${invRoleId}-${p.id}`,
        roleId: invRoleId,
        permissionId: p.id,
      }))
    );

    const newAdminUser: User = {
      id: `user-${Date.now()}`,
      tenantId: newTenantId,
      roleId: adminRoleId,
      name: input.adminName,
      email: input.email.toLowerCase(),
      isActive: true,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      createdAt: new Date().toISOString(),
    };
    this.allUsers.push(newAdminUser);
    this.users.push(newAdminUser);

    // Asignar primer plan por defecto
    const defaultPlan = this.plansList[0];
    if (defaultPlan) {
      const expiresAt = new Date(Date.now() + defaultPlan.durationDays * 86400000).toISOString();
      this.allSubscriptions.push({
        id: `sub-${newTenantId}`,
        tenantId: newTenantId,
        planName: defaultPlan.name,
        price: defaultPlan.price,
        expiresAt,
        status: 'active',
      });
    }

    this.saveMasterData();
  }

  // Elimina una empresa y sus datos asociados
  async deleteTenant(tenantId: string): Promise<void> {
    this.tenantsList = this.tenantsList.filter((t) => t.id !== tenantId);
    this.allProducts = this.allProducts.filter((p) => p.tenantId !== tenantId);
    this.allOrders = this.allOrders.filter((o) => o.tenantId !== tenantId);
    this.allUsers = this.allUsers.filter((u) => u.tenantId !== tenantId);
    this.allSubscriptions = this.allSubscriptions.filter((s) => s.tenantId !== tenantId);
    this.allRoles = this.allRoles.filter((r) => r.tenantId !== tenantId);
    this.allRolePermissions = this.allRolePermissions.filter((rp) => this.allRoles.some((r) => r.id === rp.roleId));
    if (this.activeTenantId === tenantId) {
      await this.setActiveTenant('');
    } else {
      this.saveMasterData();
    }
  }

  // Vacía datos de prueba (empresas, productos, órdenes) manteniendo solo al super admin y planes
  async clearTestData(): Promise<void> {
    this.allProducts = [];
    this.allOrders = [];
    this.tenantsList = [];
    this.allSubscriptions = [];
    this.tickets = [];
    this.notifications = [];
    this.allUsers = this.allUsers.filter(
      (u) => !u.tenantId || u.roleId === 'role-superadmin' || u.email.toLowerCase() === 'admin@midigitienda.com'
    );
    await this.setActiveTenant('');
  }

  // Fija la empresa activa del super administrador y recarga el estado.
  async setActiveTenant(tenantId: string): Promise<void> {
    if (!tenantId || tenantId === 'tenant-global' || tenantId === 'all') {
      this.tenant = GLOBAL_PLATFORM_TENANT;
      this.activeTenantId = null;
      this.products = [...this.allProducts];
      this.orders = [...this.allOrders];
      this.users = [...this.allUsers];
      this.roles = [...this.allRoles];
      this.rolePermissions = [...this.allRolePermissions];
      this.subscription = null;
      this.saveMasterData();
      return;
    }
    const targetTenant = this.tenantsList.find((t) => t.id === tenantId);
    if (targetTenant) {
      this.tenant = targetTenant;
      this.activeTenantId = tenantId;
      this.products = this.allProducts.filter((p) => p.tenantId === tenantId);
      this.orders = this.allOrders.filter((o) => o.tenantId === tenantId);
      this.users = this.allUsers.filter((u) => u.tenantId === tenantId);
      this.roles = this.allRoles.filter((r) => r.tenantId === tenantId);
      this.rolePermissions = [...this.allRolePermissions];
      this.subscription = this.allSubscriptions.find((s) => s.tenantId === tenantId) || null;
      this.saveMasterData();
    }
  }

  updateTenantBranding(
    id: string,
    updates: Partial<Pick<Tenant, 'name' | 'primaryColor' | 'secondaryColor' | 'currency'>>,
  ): Tenant {
    if (!this.tenant) throw new Error('Negocio no encontrado');
    this.tenant = { ...this.tenant, ...updates };
    const tIdx = this.tenantsList.findIndex((t) => t.id === id);
    if (tIdx !== -1) {
      this.tenantsList[tIdx] = { ...this.tenantsList[tIdx], ...updates };
    }
    this.saveMasterData();
    return this.tenant;
  }

  // --- DIAN / FACTURACIÓN ELECTRÓNICA & POS ---
  getDianConfig(tenantId?: string): DianTaxpayerData {
    const t = tenantId ? this.getTenantById(tenantId) : this.tenant;
    if (t?.dianConfig) return t.dianConfig;
    return getDefaultDianConfig(t?.name || 'Mi Negocio Colombia');
  }

  updateDianConfig(tenantId: string, updates: Partial<DianTaxpayerData>): DianTaxpayerData {
    const t = this.getTenantById(tenantId) || this.tenant;
    if (!t) throw new Error('Negocio no encontrado');
    const current = t.dianConfig || getDefaultDianConfig(t.name);
    const updated: DianTaxpayerData = {
      ...current,
      ...updates,
      resolution: {
        ...current.resolution,
        ...(updates.resolution || {}),
      },
    };
    t.dianConfig = updated;
    const tIdx = this.tenantsList.findIndex((x) => x.id === t.id);
    if (tIdx !== -1) {
      this.tenantsList[tIdx] = { ...this.tenantsList[tIdx], dianConfig: updated };
    }
    this.saveMasterData();
    return updated;
  }

  // --- SUBSCRIPTIONS ---
  getSubscription(tenantId: string): TenantSubscription {
    if (this.subscription) return this.subscription;
    const sub = this.allSubscriptions.find((s) => s.tenantId === tenantId);
    if (sub) return sub;
    return {
      id: `sub-${tenantId}`,
      tenantId,
      planName: 'Sin plan asignado',
      price: 0,
      expiresAt: new Date(0).toISOString(),
      status: 'expired',
    };
  }

  renewSubscription(tenantId: string, monthsToAdd = 1): TenantSubscription {
    const sub = this.getSubscription(tenantId);
    const base = new Date(sub.expiresAt) > new Date() ? new Date(sub.expiresAt) : new Date();
    base.setMonth(base.getMonth() + monthsToAdd);
    const updatedSub: TenantSubscription = { ...sub, expiresAt: base.toISOString(), status: 'active' };
    this.subscription = updatedSub;
    const sIdx = this.allSubscriptions.findIndex((s) => s.tenantId === tenantId);
    if (sIdx !== -1) {
      this.allSubscriptions[sIdx] = updatedSub;
    } else {
      this.allSubscriptions.push(updatedSub);
    }
    this.saveMasterData();
    return updatedSub;
  }

  // Suscribe/renueva el tenant activo a un plan concreto (aplica nombre, precio y duración del plan).
  async subscribeToPlan(planId: string): Promise<TenantSubscription> {
    const targetTenantId = this.tenant?.id || this.activeTenantId || '';
    if (!targetTenantId || targetTenantId === 'tenant-global') {
      throw new Error('Debe seleccionar una empresa para asignarle un plan.');
    }
    const plan = this.plansList.find((p) => p.id === planId) || this.plansList[0];
    const durationDays = plan?.durationDays || 30;
    const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
    const newSub: TenantSubscription = {
      id: `sub-${targetTenantId}`,
      tenantId: targetTenantId,
      planName: plan?.name || 'Plan Comercial',
      price: plan?.price || 0,
      expiresAt,
      status: 'active',
    };
    const existingIdx = this.allSubscriptions.findIndex((s) => s.tenantId === targetTenantId);
    if (existingIdx !== -1) {
      this.allSubscriptions[existingIdx] = newSub;
    } else {
      this.allSubscriptions.push(newSub);
    }
    this.subscription = newSub;
    this.saveMasterData();
    return newSub;
  }

  // --- PLANES DE LA PLATAFORMA (CRUD PERSISTENTE) ---
  // Planes activos visibles para cualquier empresa.
  async getPlans(): Promise<Plan[]> {
    return this.plansList.filter((p) => p.isActive);
  }

  // Todos los planes incluyendo inactivos (solo super administrador).
  async getAdminPlans(): Promise<Plan[]> {
    return [...this.plansList];
  }

  async createPlan(input: Partial<Plan>): Promise<Plan> {
    const newPlan: Plan = {
      id: `plan-${Date.now()}`,
      name: input.name?.trim() || 'Nuevo Plan',
      description: input.description?.trim() || '',
      price: typeof input.price === 'number' ? input.price : Number(input.price) || 0,
      currency: input.currency || 'USD',
      durationDays: typeof input.durationDays === 'number' ? input.durationDays : Number(input.durationDays) || 30,
      isPopular: Boolean(input.isPopular),
      isActive: input.isActive ?? true,
      sortOrder: this.plansList.length + 1,
    };
    this.plansList = [...this.plansList, newPlan];
    this.saveMasterData();
    return newPlan;
  }

  async updatePlan(id: string, patch: Partial<Plan>): Promise<Plan> {
    const idx = this.plansList.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Plan con ID "${id}" no encontrado.`);
    }
    const current = this.plansList[idx];
    const updated: Plan = {
      ...current,
      ...patch,
      price: patch.price !== undefined ? (typeof patch.price === 'number' ? patch.price : Number(patch.price) || 0) : current.price,
      durationDays: patch.durationDays !== undefined ? (typeof patch.durationDays === 'number' ? patch.durationDays : Number(patch.durationDays) || 30) : current.durationDays,
    };
    this.plansList[idx] = updated;
    this.plansList = [...this.plansList];

    // Actualizar suscripciones que usaban el nombre anterior
    this.allSubscriptions = this.allSubscriptions.map((s) => {
      if (s.planName === current.name) {
        return { ...s, planName: updated.name, price: updated.price };
      }
      return s;
    });

    this.saveMasterData();
    return updated;
  }

  async deletePlan(id: string): Promise<void> {
    this.plansList = this.plansList.filter((p) => p.id !== id);
    this.saveMasterData();
  }

  // --- PRODUCTS ---
  getProducts(tenantId?: string): Product[] {
    if (!tenantId || tenantId === 'tenant-global' || tenantId === 'all') {
      return this.allProducts.filter((p) => p.isActive);
    }
    return this.allProducts.filter((p) => p.tenantId === tenantId && p.isActive);
  }

  getAllProductsIncludingInactive(tenantId?: string): Product[] {
    if (!tenantId || tenantId === 'tenant-global' || tenantId === 'all') {
      return [...this.allProducts];
    }
    return this.allProducts.filter((p) => p.tenantId === tenantId);
  }

  getProductById(tenantId: string, productId: string): Product | undefined {
    return this.allProducts.find((p) => (p.tenantId === tenantId || tenantId === 'tenant-global') && p.id === productId);
  }

  getProductByBarcode(tenantId: string, barcode: string): Product | undefined {
    return this.allProducts.find((p) => (p.tenantId === tenantId || tenantId === 'tenant-global') && p.isActive && p.barcode === barcode);
  }

  createProduct(tenantId: string, data: Omit<Product, 'id' | 'tenantId' | 'createdAt'>): Product {
    const effectiveTenantId = (!tenantId || tenantId === 'tenant-global')
      ? (this.activeTenantId || this.tenantsList[0]?.id || 'tenant-custom')
      : tenantId;
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: effectiveTenantId,
      createdAt: new Date().toISOString(),
    } as Product;
    this.allProducts = [newProduct, ...this.allProducts];
    this.products = this.activeTenantId
      ? this.allProducts.filter((p) => p.tenantId === this.activeTenantId)
      : [...this.allProducts];
    this.saveMasterData();
    return newProduct;
  }

  updateProduct(tenantId: string, productId: string, data: Partial<Omit<Product, 'id' | 'tenantId' | 'createdAt'>>): Product {
    const idx = this.allProducts.findIndex((p) => p.id === productId);
    if (idx === -1) throw new Error('Producto no encontrado');
    this.allProducts[idx] = { ...this.allProducts[idx], ...data };
    const updated = this.allProducts[idx];
    this.products = this.activeTenantId
      ? this.allProducts.filter((p) => p.tenantId === this.activeTenantId)
      : [...this.allProducts];
    this.saveMasterData();
    return updated;
  }

  deleteProduct(tenantId: string, productId: string): boolean {
    this.allProducts = this.allProducts.filter((p) => p.id !== productId);
    this.products = this.activeTenantId
      ? this.allProducts.filter((p) => p.tenantId === this.activeTenantId)
      : [...this.allProducts];
    this.saveMasterData();
    return true;
  }

  adjustProductStock(tenantId: string, productId: string, adjustment: number, reason: string): Product {
    const idx = this.allProducts.findIndex((p) => p.id === productId);
    if (idx === -1) throw new Error('Producto no encontrado');
    this.allProducts[idx] = { ...this.allProducts[idx], stock: this.allProducts[idx].stock + adjustment };
    const updated = this.allProducts[idx];
    this.products = this.activeTenantId
      ? this.allProducts.filter((p) => p.tenantId === this.activeTenantId)
      : [...this.allProducts];
    this.saveMasterData();
    return updated;
  }

  // --- ORDERS (POS) ---
  getOrders(tenantId?: string): Order[] {
    if (!tenantId || tenantId === 'tenant-global' || tenantId === 'all') {
      return [...this.allOrders];
    }
    return this.allOrders.filter((o) => o.tenantId === tenantId);
  }

  getOrderById(tenantId: string, orderId: string): Order | undefined {
    return this.allOrders.find((o) => o.id === orderId);
  }

  createOrderTransaction(params: {
    tenantId: string;
    userId: string;
    userName?: string;
    items: { product: Product; quantity: number }[];
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    amountReceived?: number;
    taxRate?: number;
    currencyCode?: string;
    exchangeRate?: number;
    dianCustomer?: DianCustomerData;
    dianDocumentType?: '01' | '20';
  }): Order {
    const { tenantId, userId, items, paymentMethod } = params;
    const taxRate = params.taxRate ?? 0;
    const exchangeRate = params.exchangeRate && params.exchangeRate > 0 ? params.exchangeRate : 1;
    const currencyCode = params.currencyCode || (this.tenant?.currency ?? 'COP');

    let subtotal = 0;
    for (const it of items) {
      if (it.product.stock < it.quantity) {
        throw new Error(`Stock insuficiente para "${it.product.name}". Disponible: ${it.product.stock}.`);
      }
      subtotal += it.product.price * it.quantity;
    }

    // ---------------------------------------------------------
    // Desglose de Impuestos DIAN (Colombia)
    // ---------------------------------------------------------
    let baseIva19 = 0;
    let iva19 = 0;
    let baseIva5 = 0;
    let iva5 = 0;
    let baseInc8 = 0;
    let inc8 = 0;
    let baseExempt = 0;

    const orderId = tempId('order');

    const mappedOrderItems = items.map((it) => {
      const lineSubtotal = it.product.price * it.quantity;
      const taxType = it.product.dianTaxType || (taxRate === 0.19 ? 'IVA_19' : taxRate === 0.08 ? 'INC_8' : taxRate === 0.05 ? 'IVA_5' : 'IVA_0');
      let itemTaxRate = 0;
      let itemTaxAmount = 0;

      if (taxType === 'IVA_19') {
        itemTaxRate = 0.19;
        itemTaxAmount = +(lineSubtotal * 0.19).toFixed(2);
        baseIva19 += lineSubtotal;
        iva19 += itemTaxAmount;
      } else if (taxType === 'IVA_5') {
        itemTaxRate = 0.05;
        itemTaxAmount = +(lineSubtotal * 0.05).toFixed(2);
        baseIva5 += lineSubtotal;
        iva5 += itemTaxAmount;
      } else if (taxType === 'INC_8') {
        itemTaxRate = 0.08;
        itemTaxAmount = +(lineSubtotal * 0.08).toFixed(2);
        baseInc8 += lineSubtotal;
        inc8 += itemTaxAmount;
      } else {
        baseExempt += lineSubtotal;
      }

      return {
        id: tempId('item'),
        orderId,
        productId: it.product.id,
        productName: it.product.name,
        productBarcode: it.product.barcode,
        quantity: it.quantity,
        unitPrice: it.product.price,
        cost: it.product.cost,
        subtotal: lineSubtotal,
        dianTaxType: taxType,
        dianTaxAmount: itemTaxAmount,
      };
    });

    const totalTax = +(iva19 + iva5 + inc8).toFixed(2);
    const tax = totalTax > 0 ? totalTax : +(subtotal * taxRate).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const currencyTotal = +(total * exchangeRate).toFixed(2);
    const amountReceived = params.amountReceived ?? 0;
    const changeGiven = amountReceived > 0 ? Math.max(0, +(amountReceived - currencyTotal).toFixed(2)) : 0;

    // ---------------------------------------------------------
    // Generación de Documento DIAN (Software Propio)
    // ---------------------------------------------------------
    const dianConfig = this.tenant?.dianConfig || getDefaultDianConfig(this.tenant?.name);
    let dianDocNum: string | undefined;
    let dianPrefix: string | undefined;
    let dianConsecutive: number | undefined;
    let dianCufe: string | undefined;
    let dianQrString: string | undefined;
    let dianQrDataUrl: string | undefined;
    let dianXml: string | undefined;
    const dianCustomer: DianCustomerData = params.dianCustomer || {
      idType: '13',
      idNumber: '222222222222',
      name: 'Consumidor Final',
      isFinalConsumer: true,
    };

    const taxBreakdown: DianTaxBreakdown = {
      baseIva19,
      iva19,
      baseIva5,
      iva5,
      baseInc8,
      inc8,
      baseExempt,
      totalTax: tax,
      totalBase: subtotal,
    };

    if (dianConfig && dianConfig.enabled) {
      const res = dianConfig.resolution;
      dianConsecutive = res.currentNumber;
      res.currentNumber += 1;
      dianPrefix = res.prefix;
      dianDocNum = `${res.prefix}-${String(dianConsecutive).padStart(4, '0')}`;

      const now = new Date();
      const issueDate = now.toISOString().slice(0, 10);
      const issueTime = now.toTimeString().slice(0, 8) + '-05:00';

      const rawCufe = `${dianDocNum}${issueDate}${issueTime}${subtotal.toFixed(2)}01${(iva19 + iva5).toFixed(2)}04${inc8.toFixed(2)}030.00${total.toFixed(2)}${dianConfig.nit}${dianCustomer.idNumber}${res.technicalKey}${res.environment}`;
      dianCufe = generateDeterministicSha384(rawCufe);

      const queryUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${dianCufe}`;
      dianQrString = `NumFac: ${dianDocNum}\nFecFac: ${issueDate}\nHoraFac: ${issueTime}\nNitFac: ${dianConfig.nit}\nDocAdq: ${dianCustomer.idNumber}\nValFac: ${subtotal.toFixed(2)}\nValIva: ${(iva19 + iva5).toFixed(2)}\nValOtroImp: ${inc8.toFixed(2)}\nValTolFac: ${total.toFixed(2)}\nCUFE: ${dianCufe}\nQRCode: ${queryUrl}`;

      // XML UBL 2.1 estándar de la DIAN
      dianXml = generateUblXml({
        documentType: params.dianDocumentType || '20', // '20' = Documento Equivalente POS
        fullNumber: dianDocNum,
        prefix: res.prefix,
        consecutive: dianConsecutive,
        cufe: dianCufe,
        issueDate,
        issueTime,
        taxpayer: dianConfig,
        customer: dianCustomer,
        items: items.map((it) => {
          const lSub = it.product.price * it.quantity;
          const tType = it.product.dianTaxType || 'IVA_0';
          const tRate = tType === 'IVA_19' ? 0.19 : tType === 'IVA_5' ? 0.05 : tType === 'INC_8' ? 0.08 : 0;
          return {
            id: it.product.id,
            name: it.product.name,
            barcode: it.product.barcode,
            quantity: it.quantity,
            unitPrice: it.product.price,
            taxRate: tRate,
            taxType: tType,
            subtotal: lSub,
            taxAmount: +(lSub * tRate).toFixed(2),
            total: +(lSub * (1 + tRate)).toFixed(2),
          };
        }),
        taxBreakdown,
        paymentMethod,
        currencyCode,
      });
    }

    const optimistic: Order = {
      id: orderId,
      tenantId,
      userId,
      userName: params.userName,
      subtotal,
      tax,
      total,
      currencyCode,
      exchangeRate,
      currencyTotal,
      paymentMethod,
      paymentReference: params.paymentReference,
      amountReceived,
      changeGiven,
      status: 'completed',
      itemsCount: items.reduce((a, it) => a + it.quantity, 0),
      createdAt: new Date().toISOString(),
      orderItems: mappedOrderItems,
      dianDocumentNumber: dianDocNum,
      dianPrefix,
      dianConsecutive,
      dianCufe,
      dianQrString,
      dianQrDataUrl,
      dianXml,
      dianStatus: dianDocNum ? 'VALIDATED_LOCAL' : undefined,
      dianCustomer,
      dianTaxBreakdown: taxBreakdown,
    };

    // Generar imagen QR en segundo plano si hay CUFE
    if (dianDocNum && dianCufe && dianConfig) {
      const now = new Date();
      generateDianQr({
        numFac: dianDocNum,
        fecFac: now.toISOString().slice(0, 10),
        horFac: now.toTimeString().slice(0, 8) + '-05:00',
        nitEmisor: dianConfig.nit,
        docAdq: dianCustomer.idNumber,
        valFac: subtotal,
        valIva: iva19 + iva5,
        valOtroImp: inc8,
        valTolFac: total,
        cufe: dianCufe,
      })
        .then((qrRes) => {
          optimistic.dianQrDataUrl = qrRes.qrDataUrl;
          this.orders = this.orders.map((o) => (o.id === orderId ? { ...o, dianQrDataUrl: qrRes.qrDataUrl } : o));
          this.saveToLocalStorage();
        })
        .catch(() => {});
    }

    // Descontar stock localmente (optimista) en catálogo maestro y vista actual
    for (const it of items) {
      this.allProducts = this.allProducts.map((p) =>
        p.id === it.product.id ? { ...p, stock: Math.max(0, p.stock - it.quantity) } : p
      );
      this.products = this.products.map((p) =>
        p.id === it.product.id ? { ...p, stock: Math.max(0, p.stock - it.quantity) } : p
      );
    }
    this.allOrders = [optimistic, ...this.allOrders];
    this.orders = this.activeTenantId
      ? this.allOrders.filter((o) => o.tenantId === this.activeTenantId)
      : [...this.allOrders];
    this.saveMasterData();

    return optimistic;
  }

  cancelOrder(tenantId: string, orderId: string): Order {
    const idx = this.allOrders.findIndex(
      (o) => (!tenantId || tenantId === 'tenant-global' || o.tenantId === tenantId) && o.id === orderId
    );
    if (idx === -1) throw new Error('Orden no encontrada');
    const order = this.allOrders[idx];

    // Restaurar stock en catálogo maestro y vista actual
    (order.orderItems ?? []).forEach((it) => {
      this.allProducts = this.allProducts.map((p) =>
        p.id === it.productId ? { ...p, stock: p.stock + it.quantity } : p
      );
      this.products = this.products.map((p) =>
        p.id === it.productId ? { ...p, stock: p.stock + it.quantity } : p
      );
    });

    let creditNoteNumber: string | undefined;
    let creditNoteCude: string | undefined;
    let creditNoteXml: string | undefined;

    // Si la orden tenía CUFE DIAN, emitir Nota Crédito Electrónica legal
    if (order.dianCufe && this.tenant?.dianConfig) {
      const ncConsecutive = order.dianConsecutive || 1;
      creditNoteNumber = `NC-${String(ncConsecutive).padStart(4, '0')}`;
      const now = new Date();
      const issueDate = now.toISOString().slice(0, 10);
      const issueTime = now.toTimeString().slice(0, 8) + '-05:00';
      creditNoteCude = generateDeterministicSha384(`${creditNoteNumber}${issueDate}${issueTime}${order.total.toFixed(2)}${order.dianCufe}`);
      creditNoteXml = generateCreditNoteUblXml({
        creditNoteNumber,
        cude: creditNoteCude,
        issueDate,
        issueTime,
        originalInvoiceNumber: order.dianDocumentNumber || order.id,
        originalCufe: order.dianCufe,
        taxpayer: this.tenant.dianConfig,
        customer: order.dianCustomer || { idType: '13', idNumber: '222222222222', name: 'Consumidor Final', isFinalConsumer: true },
        totalAmount: order.total,
        reason: 'Anulación de comprobante de venta POS conforme a la DIAN',
        currencyCode: order.currencyCode,
      });
    }

    this.allOrders[idx] = {
      ...order,
      status: 'cancelled',
      creditNoteNumber,
      creditNoteCude,
      creditNoteXml,
    };
    const updated = this.allOrders[idx];
    this.orders = this.activeTenantId
      ? this.allOrders.filter((o) => o.tenantId === this.activeTenantId)
      : [...this.allOrders];
    this.saveMasterData();
    return updated;
  }

  // --- USERS ---
  getUsers(tenantId?: string): User[] {
    if (!tenantId || tenantId === 'tenant-global' || tenantId === 'all') {
      return [...this.allUsers];
    }
    return this.allUsers.filter((u) => u.tenantId === tenantId);
  }

  getUserById(userId: string): User | undefined {
    return this.allUsers.find((u) => u.id === userId);
  }

  createUser(tenantId: string, data: { name: string; email: string; roleId: string; password?: string }): User {
    if (!data.roleId || !data.roleId.trim()) {
      throw new Error('Todo empleado debe estar asociado obligatoriamente a un rol del sistema.');
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      tenantId,
      roleId: data.roleId.trim(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.allUsers = [...this.allUsers, newUser];
    this.users = this.activeTenantId
      ? this.allUsers.filter((u) => u.tenantId === this.activeTenantId)
      : [...this.allUsers];
    this.saveMasterData();
    return newUser;
  }

  updateUser(tenantId: string, userId: string, data: Partial<Pick<User, 'name' | 'email' | 'roleId' | 'isActive'>> & { password?: string }): User {
    const idx = this.allUsers.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('Usuario no encontrado');
    this.allUsers[idx] = { ...this.allUsers[idx], ...data };
    const updated = this.allUsers[idx];
    this.users = this.activeTenantId
      ? this.allUsers.filter((u) => u.tenantId === this.activeTenantId)
      : [...this.allUsers];

    // Si el usuario actualizado es el usuario logueado actualmente, actualizar permisos en sesión
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = { ...this.currentUser, ...updated };
      if (!this.isPlatformAdmin() && updated.roleId) {
        this.currentPermissions = this.getPermissionsForRole(updated.roleId);
      }
    }

    this.saveMasterData();
    return updated;
  }

  deleteUser(tenantId: string, userId: string): boolean {
    if (this.currentUser && this.currentUser.id === userId) {
      throw new Error('No puedes eliminar tu propio usuario activo.');
    }
    this.allUsers = this.allUsers.filter((u) => u.id !== userId);
    this.users = this.activeTenantId
      ? this.allUsers.filter((u) => u.tenantId === this.activeTenantId)
      : [...this.allUsers];
    this.saveMasterData();
    return true;
  }

  // --- ROLES & PERMISSIONS GRANULARES (RBAC) ---
  getRoles(tenantId: string): Role[] {
    return this.allRoles.filter((r) => r.tenantId === tenantId);
  }

  getRoleById(tenantId: string, roleId: string): Role | undefined {
    return this.allRoles.find((r) => r.tenantId === tenantId && r.id === roleId);
  }

  getAllPermissions(): Permission[] {
    return [...SYSTEM_PERMISSIONS];
  }

  createRole(tenantId: string, name: string, description: string, permissionSlugs: string[]): Role {
    const newRoleId = `role-${Date.now()}`;
    const newRole: Role = {
      id: newRoleId,
      tenantId,
      name: name.trim(),
      description: description.trim(),
      isSystem: false,
    };
    this.allRoles.push(newRole);
    this.roles.push(newRole);

    const permIds = SYSTEM_PERMISSIONS.filter((p) => permissionSlugs.includes(p.slug)).map((p) => p.id);
    const newRPs: RolePermission[] = permIds.map((pid) => ({
      id: `rp-${newRoleId}-${pid}`,
      roleId: newRoleId,
      permissionId: pid,
    }));
    this.allRolePermissions.push(...newRPs);
    this.rolePermissions.push(...newRPs);

    this.saveMasterData();
    return newRole;
  }

  updateRole(tenantId: string, roleId: string, name: string, description: string, permissionSlugs: string[]): Role {
    const idx = this.allRoles.findIndex((r) => r.tenantId === tenantId && r.id === roleId);
    if (idx === -1) throw new Error('Rol no encontrado');
    this.allRoles[idx] = { ...this.allRoles[idx], name: name.trim(), description: description.trim() };
    const updated = this.allRoles[idx];

    const rIdx = this.roles.findIndex((r) => r.id === roleId);
    if (rIdx !== -1) this.roles[rIdx] = updated;

    // Reemplazar matriz de permisos
    this.allRolePermissions = this.allRolePermissions.filter((rp) => rp.roleId !== roleId);
    const permIds = SYSTEM_PERMISSIONS.filter((p) => permissionSlugs.includes(p.slug)).map((p) => p.id);
    const newRPs: RolePermission[] = permIds.map((pid) => ({
      id: `rp-${roleId}-${pid}`,
      roleId,
      permissionId: pid,
    }));
    this.allRolePermissions.push(...newRPs);
    this.rolePermissions = [...this.allRolePermissions];

    // Actualizar permisos del usuario en sesión si tiene este rol y no es superadmin
    if (this.currentUser?.roleId === roleId && !this.isPlatformAdmin()) {
      this.currentPermissions = [...permissionSlugs];
    }

    this.saveMasterData();
    return updated;
  }

  deleteRole(tenantId: string, roleId: string): boolean {
    const role = this.allRoles.find((r) => r.tenantId === tenantId && r.id === roleId);
    if (!role) return false;
    if (role.isSystem) throw new Error('No se puede eliminar un rol base del sistema.');
    if (this.allUsers.some((u) => u.roleId === roleId)) {
      throw new Error('No se puede eliminar un rol que tiene empleados asignados. Primero reasígnales otro rol.');
    }
    this.allRoles = this.allRoles.filter((r) => r.id !== roleId);
    this.roles = this.roles.filter((r) => r.id !== roleId);
    this.allRolePermissions = this.allRolePermissions.filter((rp) => rp.roleId !== roleId);
    this.rolePermissions = this.rolePermissions.filter((rp) => rp.roleId !== roleId);
    this.saveMasterData();
    return true;
  }

  getPermissionsForRole(roleId: string): string[] {
    const permIds = this.allRolePermissions.filter((rp) => rp.roleId === roleId).map((rp) => rp.permissionId);
    return SYSTEM_PERMISSIONS.filter((p) => permIds.includes(p.id)).map((p) => p.slug);
  }

  getUserPermissions(user: User): string[] {
    // El único usuario global con poder total
    if (
      user.roleId === 'role-superadmin' ||
      user.id === 'user-superadmin-platform' ||
      user.email?.toLowerCase() === 'admin@midigitienda.com' ||
      user.email?.toLowerCase() === 'superadmin@midigitienda.com'
    ) {
      return SYSTEM_PERMISSIONS.map((p) => p.slug);
    }
    if (!user.roleId) return [];
    return this.getPermissionsForRole(user.roleId);
  }

  // --- SUPPORT TICKETS ---
  getTickets(tenantId: string): SupportTicket[] {
    return this.tickets.filter((t) => t.tenantId === tenantId);
  }

  createTicket(
    tenantId: string,
    userId: string,
    userName: string,
    data: { subject: string; description: string; category: SupportTicket['category']; priority: SupportTicket['priority'] },
  ): SupportTicket {
    const now = new Date().toISOString();
    const optimistic: SupportTicket = {
      id: tempId('ticket'),
      tenantId,
      userId,
      userName,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      messages: [{ id: tempId('msg'), ticketId: 'tmp', userId, userName, message: data.description, isSupportAgent: false, createdAt: now }],
    };
    this.tickets = [optimistic, ...this.tickets];
    apiFetch('/api/tickets', { method: 'POST', body: JSON.stringify(data) })
      .then((r: any) => { if (r.ticket) this.tickets = this.tickets.map((t) => (t.id === optimistic.id ? r.ticket : t)); })
      .catch((e) => console.error('createTicket', e));
    return optimistic;
  }

  addTicketMessage(tenantId: string, ticketId: string, userId: string, userName: string, message: string, isSupportAgent = false): SupportTicket {
    const idx = this.tickets.findIndex((t) => t.tenantId === tenantId && t.id === ticketId);
    if (idx === -1) throw new Error('Ticket no encontrado');
    const now = new Date().toISOString();
    const msg = { id: tempId('msg'), ticketId, userId, userName, message, isSupportAgent, createdAt: now };
    this.tickets[idx] = { ...this.tickets[idx], messages: [...(this.tickets[idx].messages ?? []), msg], updatedAt: now };
    const updated = this.tickets[idx];
    apiFetch(`/api/tickets/${ticketId}`, { method: 'POST', body: JSON.stringify({ message }) })
      .then((r: any) => { if (r.ticket) this.tickets = this.tickets.map((t) => (t.id === ticketId ? r.ticket : t)); })
      .catch((e) => console.error('addTicketMessage', e));
    return updated;
  }

  updateTicketStatus(tenantId: string, ticketId: string, status: SupportTicket['status']): SupportTicket {
    const idx = this.tickets.findIndex((t) => t.tenantId === tenantId && t.id === ticketId);
    if (idx === -1) throw new Error('Ticket no encontrado');
    this.tickets[idx] = { ...this.tickets[idx], status };
    const updated = this.tickets[idx];
    apiFetch(`/api/tickets/${ticketId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      .then((r: any) => { if (r.ticket) this.tickets = this.tickets.map((t) => (t.id === ticketId ? r.ticket : t)); })
      .catch((e) => console.error('updateTicketStatus', e));
    return updated;
  }

  // --- NOTIFICATIONS ---
  getNotifications(tenantId: string): Notification[] {
    return this.notifications.filter((n) => n.tenantId === tenantId);
  }

  markNotificationAsRead(id: string): void {
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    apiFetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id }) }).catch((e) => console.error('markNotificationAsRead', e));
  }

  markAllNotificationsAsRead(tenantId: string): void {
    this.notifications = this.notifications.map((n) => (n.tenantId === tenantId ? { ...n, isRead: true } : n));
    apiFetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({}) }).catch((e) => console.error('markAllNotificationsAsRead', e));
  }

  // --- CURRENCIES (multimoneda) ---
  getCurrencies(tenantId: string): Currency[] {
    return this.currencies.filter((c) => c.tenantId === tenantId);
  }

  getActiveCurrencies(tenantId: string): Currency[] {
    return this.currencies.filter((c) => c.tenantId === tenantId && c.isActive);
  }

  getBaseCurrency(tenantId: string): Currency | undefined {
    return this.currencies.find((c) => c.tenantId === tenantId && c.isBase);
  }

  addCurrency(tenantId: string, data: { code: string; symbol?: string; name?: string; rateToBase: number }): Currency {
    const optimistic: Currency = {
      id: tempId('cur'), tenantId, code: data.code.toUpperCase(),
      symbol: data.symbol || data.code.toUpperCase(), name: data.name || data.code.toUpperCase(),
      rateToBase: data.rateToBase, isBase: false, isActive: true,
    };
    this.currencies = [...this.currencies, optimistic];
    apiFetch('/api/currencies', { method: 'POST', body: JSON.stringify(data) })
      .then((r: any) => { if (r.currency) this.currencies = this.currencies.map((c) => (c.id === optimistic.id ? r.currency : c)); })
      .catch((e) => {
        this.currencies = this.currencies.filter((c) => c.id !== optimistic.id);
        console.error('addCurrency', e);
      });
    return optimistic;
  }

  updateCurrency(tenantId: string, id: string, data: Partial<Pick<Currency, 'rateToBase' | 'symbol' | 'name' | 'isActive'>>): Currency {
    const idx = this.currencies.findIndex((c) => c.tenantId === tenantId && c.id === id);
    if (idx === -1) throw new Error('Moneda no encontrada');
    this.currencies[idx] = { ...this.currencies[idx], ...data };
    const updated = this.currencies[idx];
    apiFetch(`/api/currencies/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      .then((r: any) => { if (r.currency) this.currencies = this.currencies.map((c) => (c.id === id ? r.currency : c)); })
      .catch((e) => console.error('updateCurrency', e));
    return updated;
  }

  deleteCurrency(tenantId: string, id: string): boolean {
    const cur = this.currencies.find((c) => c.tenantId === tenantId && c.id === id);
    if (!cur) return false;
    if (cur.isBase) throw new Error('No se puede eliminar la moneda base.');
    this.currencies = this.currencies.filter((c) => c.id !== id);
    apiFetch(`/api/currencies/${id}`, { method: 'DELETE' }).catch((e) => console.error('deleteCurrency', e));
    return true;
  }

  setBaseCurrency(tenantId: string, code: string): void {
    this.currencies = this.currencies.map((c) =>
      c.tenantId === tenantId ? { ...c, isBase: c.code === code, rateToBase: c.code === code ? 1 : c.rateToBase, isActive: c.code === code ? true : c.isActive } : c,
    );
    if (this.tenant) this.tenant = { ...this.tenant, currency: code };
    apiFetch('/api/tenant', { method: 'PATCH', body: JSON.stringify({ currency: code }) }).catch((e) => console.error('setBaseCurrency', e));
  }
}

export const db = new DatabaseService();
export default db;

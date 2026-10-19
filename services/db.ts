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

async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && (data.error as string)) || 'Error en la operación.');
  }
  return data as T;
}

function tempId(prefix: string): string {
  return `${prefix}-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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

  hydrate(data: BootstrapData): void {
    this.tenant = data.tenant;
    this.currentUser = data.currentUser;
    this.currentPermissions = data.permissions ?? [];
    this.platformAdmin = data.isPlatformAdmin ?? false;
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
  }

  async refresh(): Promise<void> {
    const data = await apiFetch<BootstrapData>('/api/bootstrap');
    this.hydrate(data);
  }

  isHydrated(): boolean {
    return this.hydrated;
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

  // --- TENANTS & BRANDING ---
  getTenants(): Tenant[] {
    return this.tenant ? [this.tenant] : [];
  }

  getTenantById(id: string): Tenant | undefined {
    return this.tenant && this.tenant.id === id ? this.tenant : undefined;
  }

  getCurrentTenant(): Tenant | null {
    return this.tenant;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isPlatformAdmin(): boolean {
    return this.platformAdmin;
  }

  getActiveTenantId(): string | null {
    return this.activeTenantId;
  }

  // Lista todas las empresas de la plataforma (solo super administrador).
  async getAllTenantsAdmin(): Promise<any[]> {
    const data = await apiFetch<{ tenants: any[] }>('/api/admin/tenants');
    return data.tenants ?? [];
  }

  // Vista consolidada de todas las empresas (solo super administrador).
  async getAdminOverview(): Promise<{ companies: any[]; totals: { companies: number; users: number; products: number; orders: number } }> {
    return apiFetch('/api/admin/overview');
  }

  // Crea una nueva empresa con su administrador (solo super administrador).
  async createTenantAdmin(input: { businessName: string; adminName: string; email: string; password: string; currency: string }): Promise<void> {
    await apiFetch('/api/admin/tenants', { method: 'POST', body: JSON.stringify(input) });
  }

  // Fija la empresa activa del super administrador y recarga el estado.
  async setActiveTenant(tenantId: string): Promise<void> {
    await apiFetch('/api/admin/active-tenant', { method: 'POST', body: JSON.stringify({ tenantId }) });
    await this.refresh();
  }

  updateTenantBranding(
    id: string,
    updates: Partial<Pick<Tenant, 'name' | 'primaryColor' | 'secondaryColor' | 'currency'>>,
  ): Tenant {
    if (!this.tenant) throw new Error('Negocio no encontrado');
    this.tenant = { ...this.tenant, ...updates };
    apiFetch('/api/tenant', { method: 'PATCH', body: JSON.stringify(updates) })
      .then((r: any) => { if (r.tenant) this.tenant = r.tenant; })
      .catch((e) => console.error('updateTenantBranding', e));
    return this.tenant;
  }

  // --- SUBSCRIPTIONS ---
  getSubscription(tenantId: string): TenantSubscription {
    if (this.subscription) return this.subscription;
    // Fallback defensivo (no debería ocurrir con un tenant provisionado).
    return {
      id: 'sub-none', tenantId, planName: 'Sin plan', price: 0,
      expiresAt: new Date(0).toISOString(), status: 'expired',
    };
  }

  renewSubscription(tenantId: string, monthsToAdd = 1): TenantSubscription {
    apiFetch('/api/subscription', { method: 'POST', body: JSON.stringify({ months: monthsToAdd }) })
      .then((r: any) => { if (r.subscription) this.subscription = r.subscription; })
      .catch((e) => console.error('renewSubscription', e));
    if (this.subscription) {
      const base = new Date(this.subscription.expiresAt) > new Date() ? new Date(this.subscription.expiresAt) : new Date();
      base.setMonth(base.getMonth() + monthsToAdd);
      this.subscription = { ...this.subscription, expiresAt: base.toISOString(), status: 'active' };
    }
    return this.getSubscription(tenantId);
  }

  // Suscribe/renueva el tenant activo a un plan concreto (aplica nombre, precio y duración del plan).
  async subscribeToPlan(planId: string): Promise<TenantSubscription> {
    const r = await apiFetch<{ subscription: TenantSubscription }>('/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
    if (r.subscription) this.subscription = r.subscription;
    return this.getSubscription(this.tenant?.id ?? '');
  }

  // --- PLANES (catálogo de la plataforma) ---
  // Planes activos visibles para cualquier empresa.
  async getPlans(): Promise<Plan[]> {
    const data = await apiFetch<{ plans: Plan[] }>('/api/plans');
    return data.plans ?? [];
  }

  // Todos los planes incluyendo inactivos (solo super administrador).
  async getAdminPlans(): Promise<Plan[]> {
    const data = await apiFetch<{ plans: Plan[] }>('/api/admin/plans');
    return data.plans ?? [];
  }

  async createPlan(input: Partial<Plan>): Promise<Plan> {
    const r = await apiFetch<{ plan: Plan }>('/api/admin/plans', { method: 'POST', body: JSON.stringify(input) });
    return r.plan;
  }

  async updatePlan(id: string, patch: Partial<Plan>): Promise<Plan> {
    const r = await apiFetch<{ plan: Plan }>(`/api/admin/plans/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return r.plan;
  }

  async deletePlan(id: string): Promise<void> {
    await apiFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
  }

  // --- PRODUCTS ---
  getProducts(tenantId: string): Product[] {
    return this.products.filter((p) => p.tenantId === tenantId && p.isActive);
  }

  getAllProductsIncludingInactive(tenantId: string): Product[] {
    return this.products.filter((p) => p.tenantId === tenantId);
  }

  getProductById(tenantId: string, productId: string): Product | undefined {
    return this.products.find((p) => p.tenantId === tenantId && p.id === productId);
  }

  getProductByBarcode(tenantId: string, barcode: string): Product | undefined {
    return this.products.find((p) => p.tenantId === tenantId && p.isActive && p.barcode === barcode);
  }

  createProduct(tenantId: string, data: Omit<Product, 'id' | 'tenantId' | 'createdAt'>): Product {
    const optimistic: Product = {
      ...data,
      id: tempId('prod'),
      tenantId,
      createdAt: new Date().toISOString(),
    } as Product;
    this.products = [optimistic, ...this.products];
    apiFetch('/api/products', { method: 'POST', body: JSON.stringify(data) })
      .then((r: any) => {
        if (r.product) this.products = this.products.map((p) => (p.id === optimistic.id ? r.product : p));
      })
      .catch((e) => {
        this.products = this.products.filter((p) => p.id !== optimistic.id);
        console.error('createProduct', e);
      });
    return optimistic;
  }

  updateProduct(tenantId: string, productId: string, data: Partial<Omit<Product, 'id' | 'tenantId' | 'createdAt'>>): Product {
    const idx = this.products.findIndex((p) => p.tenantId === tenantId && p.id === productId);
    if (idx === -1) throw new Error('Producto no encontrado');
    this.products[idx] = { ...this.products[idx], ...data };
    const updated = this.products[idx];
    apiFetch(`/api/products/${productId}`, { method: 'PATCH', body: JSON.stringify(data) })
      .then((r: any) => { if (r.product) this.products = this.products.map((p) => (p.id === productId ? r.product : p)); })
      .catch((e) => console.error('updateProduct', e));
    return updated;
  }

  deleteProduct(tenantId: string, productId: string): boolean {
    this.products = this.products.map((p) => (p.id === productId ? { ...p, isActive: false } : p));
    apiFetch(`/api/products/${productId}`, { method: 'DELETE' }).catch((e) => console.error('deleteProduct', e));
    return true;
  }

  adjustProductStock(tenantId: string, productId: string, adjustment: number, reason: string): Product {
    const idx = this.products.findIndex((p) => p.tenantId === tenantId && p.id === productId);
    if (idx === -1) throw new Error('Producto no encontrado');
    this.products[idx] = { ...this.products[idx], stock: this.products[idx].stock + adjustment };
    const updated = this.products[idx];
    apiFetch(`/api/products/${productId}/stock`, { method: 'POST', body: JSON.stringify({ adjustment, reason }) })
      .then((r: any) => { if (r.product) this.products = this.products.map((p) => (p.id === productId ? r.product : p)); })
      .catch((e) => console.error('adjustProductStock', e));
    return updated;
  }

  // --- ORDERS (POS) ---
  getOrders(tenantId: string): Order[] {
    return this.orders.filter((o) => o.tenantId === tenantId);
  }

  getOrderById(tenantId: string, orderId: string): Order | undefined {
    return this.orders.find((o) => o.tenantId === tenantId && o.id === orderId);
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
  }): Order {
    const { tenantId, userId, items, paymentMethod } = params;
    const taxRate = params.taxRate ?? 0;
    const exchangeRate = params.exchangeRate && params.exchangeRate > 0 ? params.exchangeRate : 1;
    const currencyCode = params.currencyCode || (this.tenant?.currency ?? 'PEN');

    let subtotal = 0;
    for (const it of items) {
      if (it.product.stock < it.quantity) {
        throw new Error(`Stock insuficiente para "${it.product.name}". Disponible: ${it.product.stock}.`);
      }
      subtotal += it.product.price * it.quantity;
    }
    const tax = +(subtotal * taxRate).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const currencyTotal = +(total * exchangeRate).toFixed(2);
    const amountReceived = params.amountReceived ?? 0;
    const changeGiven = amountReceived > 0 ? Math.max(0, +(amountReceived - currencyTotal).toFixed(2)) : 0;

    const orderId = tempId('order');
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
      orderItems: items.map((it) => ({
        id: tempId('item'),
        orderId,
        productId: it.product.id,
        productName: it.product.name,
        productBarcode: it.product.barcode,
        quantity: it.quantity,
        unitPrice: it.product.price,
        cost: it.product.cost,
        subtotal: it.product.price * it.quantity,
      })),
    };

    // Descontar stock localmente (optimista)
    for (const it of items) {
      this.products = this.products.map((p) => (p.id === it.product.id ? { ...p, stock: p.stock - it.quantity } : p));
    }
    this.orders = [optimistic, ...this.orders];

    apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((it) => ({ productId: it.product.id, quantity: it.quantity })),
        paymentMethod,
        paymentReference: params.paymentReference,
        amountReceived,
        taxRate,
        currencyCode,
        exchangeRate,
      }),
    })
      .then((r: any) => {
        if (r.order) this.orders = this.orders.map((o) => (o.id === orderId ? r.order : o));
      })
      .catch((e) => console.error('createOrderTransaction', e));

    return optimistic;
  }

  cancelOrder(tenantId: string, orderId: string): Order {
    const idx = this.orders.findIndex((o) => o.tenantId === tenantId && o.id === orderId);
    if (idx === -1) throw new Error('Orden no encontrada');
    // Restaurar stock localmente
    const order = this.orders[idx];
    (order.orderItems ?? []).forEach((it) => {
      this.products = this.products.map((p) => (p.id === it.productId ? { ...p, stock: p.stock + it.quantity } : p));
    });
    this.orders[idx] = { ...order, status: 'cancelled' };
    const updated = this.orders[idx];
    apiFetch(`/api/orders/${orderId}`, { method: 'POST' })
      .then((r: any) => { if (r.order) this.orders = this.orders.map((o) => (o.id === orderId ? r.order : o)); })
      .catch((e) => console.error('cancelOrder', e));
    return updated;
  }

  // --- USERS ---
  getUsers(tenantId: string): User[] {
    return this.users.filter((u) => u.tenantId === tenantId);
  }

  getUserById(userId: string): User | undefined {
    return this.users.find((u) => u.id === userId);
  }

  createUser(tenantId: string, data: { name: string; email: string; roleId: string; password: string }): User {
    const optimistic: User = {
      id: tempId('user'),
      tenantId,
      roleId: data.roleId,
      name: data.name,
      email: data.email,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.users = [...this.users, optimistic];
    apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) })
      .then((r: any) => { if (r.user) this.users = this.users.map((u) => (u.id === optimistic.id ? r.user : u)); })
      .catch((e) => {
        this.users = this.users.filter((u) => u.id !== optimistic.id);
        console.error('createUser', e);
        throw e;
      });
    return optimistic;
  }

  updateUser(tenantId: string, userId: string, data: Partial<Pick<User, 'name' | 'email' | 'roleId' | 'isActive'>> & { password?: string }): User {
    const idx = this.users.findIndex((u) => u.tenantId === tenantId && u.id === userId);
    if (idx === -1) throw new Error('Usuario no encontrado');
    this.users[idx] = { ...this.users[idx], ...data };
    const updated = this.users[idx];
    apiFetch(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) })
      .then((r: any) => { if (r.user) this.users = this.users.map((u) => (u.id === userId ? r.user : u)); })
      .catch((e) => console.error('updateUser', e));
    return updated;
  }

  // --- ROLES & PERMISSIONS ---
  getRoles(tenantId: string): Role[] {
    return this.roles.filter((r) => r.tenantId === tenantId);
  }

  getRoleById(tenantId: string, roleId: string): Role | undefined {
    return this.roles.find((r) => r.tenantId === tenantId && r.id === roleId);
  }

  getAllPermissions(): Permission[] {
    return [...this.allPermissions];
  }

  createRole(tenantId: string, name: string, description: string, permissionSlugs: string[]): Role {
    const optimistic: Role = { id: tempId('role'), tenantId, name, description, isSystem: false };
    this.roles = [...this.roles, optimistic];
    const permIds = this.allPermissions.filter((p) => permissionSlugs.includes(p.slug)).map((p) => p.id);
    this.rolePermissions = [
      ...this.rolePermissions,
      ...permIds.map((pid) => ({ id: tempId('rp'), roleId: optimistic.id, permissionId: pid })),
    ];
    apiFetch('/api/roles', { method: 'POST', body: JSON.stringify({ name, description, permissionSlugs }) })
      .then((r: any) => {
        if (r.role) {
          this.roles = this.roles.map((x) => (x.id === optimistic.id ? r.role : x));
          this.rolePermissions = this.rolePermissions.filter((rp) => rp.roleId !== optimistic.id);
          if (Array.isArray(r.rolePermissions)) this.rolePermissions = [...this.rolePermissions, ...r.rolePermissions];
        }
      })
      .catch((e) => console.error('createRole', e));
    return optimistic;
  }

  updateRole(tenantId: string, roleId: string, name: string, description: string, permissionSlugs: string[]): Role {
    const idx = this.roles.findIndex((r) => r.tenantId === tenantId && r.id === roleId);
    if (idx === -1) throw new Error('Rol no encontrado');
    this.roles[idx] = { ...this.roles[idx], name, description };
    const updated = this.roles[idx];
    const permIds = this.allPermissions.filter((p) => permissionSlugs.includes(p.slug)).map((p) => p.id);
    this.rolePermissions = this.rolePermissions.filter((rp) => rp.roleId !== roleId);
    this.rolePermissions = [
      ...this.rolePermissions,
      ...permIds.map((pid) => ({ id: tempId('rp'), roleId, permissionId: pid })),
    ];
    apiFetch(`/api/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify({ name, description, permissionSlugs }) })
      .then((r: any) => {
        if (Array.isArray(r.rolePermissions)) {
          this.rolePermissions = this.rolePermissions.filter((rp) => rp.roleId !== roleId);
          this.rolePermissions = [...this.rolePermissions, ...r.rolePermissions];
        }
      })
      .catch((e) => console.error('updateRole', e));
    return updated;
  }

  deleteRole(tenantId: string, roleId: string): boolean {
    const role = this.roles.find((r) => r.tenantId === tenantId && r.id === roleId);
    if (!role) return false;
    if (role.isSystem) throw new Error('No se puede eliminar un rol del sistema.');
    if (this.users.some((u) => u.roleId === roleId)) throw new Error('No se puede eliminar un rol asignado a usuarios.');
    this.roles = this.roles.filter((r) => r.id !== roleId);
    this.rolePermissions = this.rolePermissions.filter((rp) => rp.roleId !== roleId);
    apiFetch(`/api/roles/${roleId}`, { method: 'DELETE' }).catch((e) => console.error('deleteRole', e));
    return true;
  }

  getPermissionsForRole(roleId: string): string[] {
    const permIds = this.rolePermissions.filter((rp) => rp.roleId === roleId).map((rp) => rp.permissionId);
    return this.allPermissions.filter((p) => permIds.includes(p.id)).map((p) => p.slug);
  }

  getUserPermissions(user: User): string[] {
    if (this.currentUser && user.id === this.currentUser.id) return [...this.currentPermissions];
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

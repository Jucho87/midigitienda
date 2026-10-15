import {
  Tenant,
  Role,
  RolePermission,
  User,
  Product,
  TenantSubscription,
  Order,
  OrderItem,
  SupportTicket,
  TicketMessage,
  Notification,
  POSCartItem,
  PaymentMethod,
  Permission,
} from '../types';
import {
  INITIAL_TENANTS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_ROLES,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_TICKETS,
  INITIAL_NOTIFICATIONS,
  SYSTEM_PERMISSIONS,
} from './seedData';

const STORAGE_KEYS = {
  TENANTS: 'erp_pos_tenants_v1',
  SUBSCRIPTIONS: 'erp_pos_subscriptions_v1',
  ROLES: 'erp_pos_roles_v1',
  ROLE_PERMISSIONS: 'erp_pos_role_perms_v1',
  USERS: 'erp_pos_users_v1',
  PRODUCTS: 'erp_pos_products_v1',
  ORDERS: 'erp_pos_orders_v1',
  TICKETS: 'erp_pos_tickets_v1',
  NOTIFICATIONS: 'erp_pos_notifications_v1',
};

function loadStorage<T>(key: string, defaultData: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function saveStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

class DatabaseService {
  private tenants: Tenant[];
  private subscriptions: TenantSubscription[];
  private roles: Role[];
  private rolePermissions: RolePermission[];
  private users: User[];
  private products: Product[];
  private orders: Order[];
  private tickets: SupportTicket[];
  private notifications: Notification[];

  constructor() {
    this.tenants = loadStorage(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    this.subscriptions = loadStorage(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
    this.roles = loadStorage(STORAGE_KEYS.ROLES, INITIAL_ROLES);
    this.rolePermissions = loadStorage(STORAGE_KEYS.ROLE_PERMISSIONS, INITIAL_ROLE_PERMISSIONS);
    this.users = loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.products = loadStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.orders = loadStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    this.tickets = loadStorage(STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    this.notifications = loadStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  // --- TENANTS & BRANDING ---
  getTenants(): Tenant[] {
    return [...this.tenants];
  }

  getTenantById(id: string): Tenant | undefined {
    return this.tenants.find((t) => t.id === id);
  }

  updateTenantBranding(id: string, updates: Partial<Pick<Tenant, 'name' | 'primaryColor' | 'secondaryColor' | 'currency'>>): Tenant {
    const index = this.tenants.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Negocio no encontrado');
    this.tenants[index] = { ...this.tenants[index], ...updates };
    saveStorage(STORAGE_KEYS.TENANTS, this.tenants);
    return this.tenants[index];
  }

  createTenant(name: string, primaryColor: string, secondaryColor: string): { tenant: Tenant; adminUser: User } {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name,
      slug,
      status: 'active',
      primaryColor,
      secondaryColor,
      currency: '$',
      createdAt: new Date().toISOString(),
    };
    this.tenants.push(newTenant);
    saveStorage(STORAGE_KEYS.TENANTS, this.tenants);

    // Initial 30-day subscription
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const newSub: TenantSubscription = {
      id: `sub-${Date.now()}`,
      tenantId: newTenant.id,
      planName: 'Plan Prueba Comercial 30 Días',
      price: 29.99,
      expiresAt: nextMonth.toISOString(),
      status: 'active',
    };
    this.subscriptions.push(newSub);
    saveStorage(STORAGE_KEYS.SUBSCRIPTIONS, this.subscriptions);

    // Default admin role
    const adminRoleId = `role-admin-${Date.now()}`;
    const newRole: Role = {
      id: adminRoleId,
      tenantId: newTenant.id,
      name: 'Administrador General',
      description: 'Acceso total y configuración del negocio',
      isSystem: true,
    };
    this.roles.push(newRole);
    saveStorage(STORAGE_KEYS.ROLES, this.roles);

    // Grant all permissions to admin role
    const newRolePerms: RolePermission[] = SYSTEM_PERMISSIONS.map((p) => ({
      id: `rp-${Date.now()}-${p.id}`,
      roleId: adminRoleId,
      permissionId: p.id,
    }));
    this.rolePermissions.push(...newRolePerms);
    saveStorage(STORAGE_KEYS.ROLE_PERMISSIONS, this.rolePermissions);

    // Default Admin user
    const newUser: User = {
      id: `user-admin-${Date.now()}`,
      tenantId: newTenant.id,
      roleId: adminRoleId,
      name: `Admin - ${name}`,
      email: `admin@${slug || 'comercio'}.com`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    saveStorage(STORAGE_KEYS.USERS, this.users);

    // Seed 2 default starter products
    const seedProd1: Product = {
      id: `prod-${Date.now()}-1`,
      tenantId: newTenant.id,
      name: 'Artículo Demo A',
      barcode: '7509990001',
      price: 15.0,
      cost: 7.5,
      stock: 50,
      minStock: 10,
      category: 'General',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    const seedProd2: Product = {
      id: `prod-${Date.now()}-2`,
      tenantId: newTenant.id,
      name: 'Artículo Demo B',
      barcode: '7509990002',
      price: 28.5,
      cost: 14.0,
      stock: 30,
      minStock: 5,
      category: 'General',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.products.push(seedProd1, seedProd2);
    saveStorage(STORAGE_KEYS.PRODUCTS, this.products);

    return { tenant: newTenant, adminUser: newUser };
  }

  // --- SUBSCRIPTIONS ---
  getSubscription(tenantId: string): TenantSubscription {
    let sub = this.subscriptions.find((s) => s.tenantId === tenantId);
    if (!sub) {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      sub = {
        id: `sub-${Date.now()}`,
        tenantId,
        planName: 'Plan Estándar',
        price: 29.99,
        expiresAt: nextMonth.toISOString(),
        status: 'active',
      };
      this.subscriptions.push(sub);
      saveStorage(STORAGE_KEYS.SUBSCRIPTIONS, this.subscriptions);
    }
    return sub;
  }

  isSubscriptionActive(tenantId: string): { active: boolean; reason?: string; expiresAt: string } {
    const sub = this.getSubscription(tenantId);
    const now = new Date();
    const expiry = new Date(sub.expiresAt);

    if (sub.status !== 'active' || expiry <= now) {
      return {
        active: false,
        reason: 'La suscripción ha vencido o se encuentra suspendida. Renueva el plan para continuar transaccionando.',
        expiresAt: sub.expiresAt,
      };
    }
    return { active: true, expiresAt: sub.expiresAt };
  }

  renewSubscription(tenantId: string, monthsToAdd: number = 1): TenantSubscription {
    const sub = this.getSubscription(tenantId);
    const baseDate = new Date(sub.expiresAt) > new Date() ? new Date(sub.expiresAt) : new Date();
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

    sub.expiresAt = baseDate.toISOString();
    sub.status = 'active';

    const index = this.subscriptions.findIndex((s) => s.tenantId === tenantId);
    if (index !== -1) {
      this.subscriptions[index] = sub;
    } else {
      this.subscriptions.push(sub);
    }
    saveStorage(STORAGE_KEYS.SUBSCRIPTIONS, this.subscriptions);
    return sub;
  }

  simulateSubscriptionStatus(tenantId: string, status: 'active' | 'expired'): TenantSubscription {
    const sub = this.getSubscription(tenantId);
    if (status === 'expired') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      sub.expiresAt = yesterday.toISOString();
      sub.status = 'expired';
    } else {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      sub.expiresAt = nextMonth.toISOString();
      sub.status = 'active';
    }
    const idx = this.subscriptions.findIndex((s) => s.tenantId === tenantId);
    if (idx !== -1) this.subscriptions[idx] = sub;
    saveStorage(STORAGE_KEYS.SUBSCRIPTIONS, this.subscriptions);
    return sub;
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
    const clean = barcode.trim().toLowerCase();
    return this.products.find((p) => p.tenantId === tenantId && p.barcode && p.barcode.toLowerCase() === clean);
  }

  createProduct(tenantId: string, data: Omit<Product, 'id' | 'tenantId' | 'createdAt'>): Product {
    const subCheck = this.isSubscriptionActive(tenantId);
    if (!subCheck.active) {
      throw new Error(`Acceso bloqueado: ${subCheck.reason}`);
    }

    const newProd: Product = {
      ...data,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId,
      createdAt: new Date().toISOString(),
    };
    this.products.push(newProd);
    saveStorage(STORAGE_KEYS.PRODUCTS, this.products);
    return newProd;
  }

  updateProduct(tenantId: string, productId: string, data: Partial<Omit<Product, 'id' | 'tenantId' | 'createdAt'>>): Product {
    const idx = this.products.findIndex((p) => p.tenantId === tenantId && p.id === productId);
    if (idx === -1) throw new Error('Producto no encontrado');

    this.products[idx] = { ...this.products[idx], ...data };
    saveStorage(STORAGE_KEYS.PRODUCTS, this.products);
    return this.products[idx];
  }

  deleteProduct(tenantId: string, productId: string): boolean {
    const idx = this.products.findIndex((p) => p.tenantId === tenantId && p.id === productId);
    if (idx === -1) throw new Error('Producto no encontrado');

    // Soft delete or hard delete; flag inactive
    this.products[idx].isActive = false;
    saveStorage(STORAGE_KEYS.PRODUCTS, this.products);
    return true;
  }

  adjustProductStock(tenantId: string, productId: string, adjustment: number, reason: string): Product {
    const prod = this.getProductById(tenantId, productId);
    if (!prod) throw new Error('Producto no encontrado');
    const newStock = Math.max(0, prod.stock + adjustment);
    return this.updateProduct(tenantId, productId, { stock: newStock });
  }

  // --- ATOMIC POS TRANSACTION (Rule #2 & #4) ---
  createOrderTransaction(params: {
    tenantId: string;
    userId: string;
    userName: string;
    cart: POSCartItem[];
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    amountReceived?: number;
    taxRate?: number;
  }): Order {
    const { tenantId, userId, userName, cart, paymentMethod, paymentReference, amountReceived } = params;

    // 1. Subscription Check (Rule #4)
    const subCheck = this.isSubscriptionActive(tenantId);
    if (!subCheck.active) {
      throw new Error(`[402 Payment Required] Transacción rechazada: ${subCheck.reason}`);
    }

    if (!cart || cart.length === 0) {
      throw new Error('El carrito de compras está vacío.');
    }

    // 2. Validate stock for every item (Rule #2 - Atomic verification)
    for (const item of cart) {
      const liveProduct = this.products.find((p) => p.tenantId === tenantId && p.id === item.product.id);
      if (!liveProduct) {
        throw new Error(`Producto no encontrado en inventario: ${item.product.name}`);
      }
      if (liveProduct.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para "${liveProduct.name}". Solicitado: ${item.quantity}, disponible en almacén: ${liveProduct.stock}.`
        );
      }
    }

    // 3. Atomic deduction and order item creation
    const orderId = `ord-${Date.now()}`;
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of cart) {
      const liveProductIndex = this.products.findIndex((p) => p.tenantId === tenantId && p.id === item.product.id);
      const product = this.products[liveProductIndex];

      // Deduct stock
      const updatedStock = product.stock - item.quantity;
      this.products[liveProductIndex] = {
        ...product,
        stock: updatedStock,
      };

      // Check for low stock trigger
      const minStock = product.minStock || 5;
      if (updatedStock <= minStock) {
        this.addNotification({
          tenantId,
          title: 'Stock Crítico Detectado',
          message: `El producto "${product.name}" llegó a ${updatedStock} unidades tras una venta en POS.`,
          type: 'inventory_warning',
          relatedEntityId: product.id,
        });
      }

      const lineTotal = item.unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        id: `oi-${orderId}-${item.product.id}`,
        orderId,
        productId: product.id,
        productName: product.name,
        productBarcode: product.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: product.cost,
        subtotal: lineTotal,
      });
    }

    // Tax calculation (optional/configurable)
    const tax = 0;
    const total = subtotal + tax;
    const changeGiven = amountReceived && amountReceived >= total ? amountReceived - total : 0;

    const newOrder: Order = {
      id: orderId,
      tenantId,
      userId,
      userName,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentReference,
      amountReceived: amountReceived || total,
      changeGiven,
      status: 'completed',
      itemsCount: cart.reduce((acc, c) => acc + c.quantity, 0),
      createdAt: new Date().toISOString(),
      orderItems,
    };

    // Commit changes to storage
    this.orders.unshift(newOrder);
    saveStorage(STORAGE_KEYS.PRODUCTS, this.products);
    saveStorage(STORAGE_KEYS.ORDERS, this.orders);

    return newOrder;
  }

  getOrders(tenantId: string): Order[] {
    return this.orders.filter((o) => o.tenantId === tenantId);
  }

  getOrderById(tenantId: string, orderId: string): Order | undefined {
    return this.orders.find((o) => o.tenantId === tenantId && o.id === orderId);
  }

  cancelOrder(tenantId: string, orderId: string): Order {
    const orderIdx = this.orders.findIndex((o) => o.tenantId === tenantId && o.id === orderId);
    if (orderIdx === -1) throw new Error('Venta no encontrada');

    const order = this.orders[orderIdx];
    if (order.status === 'cancelled') throw new Error('Esta venta ya se encuentra anulada');

    // Revert product stock
    if (order.orderItems) {
      for (const item of order.orderItems) {
        const pIdx = this.products.findIndex((p) => p.tenantId === tenantId && p.id === item.productId);
        if (pIdx !== -1) {
          this.products[pIdx].stock += item.quantity;
        }
      }
      saveStorage(STORAGE_KEYS.PRODUCTS, this.products);
    }

    order.status = 'cancelled';
    this.orders[orderIdx] = order;
    saveStorage(STORAGE_KEYS.ORDERS, this.orders);

    this.addNotification({
      tenantId,
      title: 'Venta Anulada',
      message: `La venta #${order.id} fue anulada y se devolvió el stock a inventario.`,
      type: 'system_alert',
      relatedEntityId: order.id,
    });

    return order;
  }

  // --- USERS & RBAC ---
  getUsers(tenantId: string): User[] {
    return this.users.filter((u) => u.tenantId === tenantId);
  }

  getUserById(userId: string): User | undefined {
    return this.users.find((u) => u.id === userId);
  }

  createUser(tenantId: string, data: { name: string; email: string; roleId: string }): User {
    const existing = this.users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) throw new Error('Ya existe un usuario con este correo electrónico');

    const newUser: User = {
      id: `user-${Date.now()}`,
      tenantId,
      roleId: data.roleId,
      name: data.name,
      email: data.email,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    saveStorage(STORAGE_KEYS.USERS, this.users);
    return newUser;
  }

  updateUser(tenantId: string, userId: string, data: Partial<Pick<User, 'name' | 'email' | 'roleId' | 'isActive'>>): User {
    const idx = this.users.findIndex((u) => u.tenantId === tenantId && u.id === userId);
    if (idx === -1) throw new Error('Usuario no encontrado');

    this.users[idx] = { ...this.users[idx], ...data };
    saveStorage(STORAGE_KEYS.USERS, this.users);
    return this.users[idx];
  }

  getRoles(tenantId: string): Role[] {
    return this.roles.filter((r) => r.tenantId === tenantId);
  }

  getRoleById(tenantId: string, roleId: string): Role | undefined {
    return this.roles.find((r) => r.tenantId === tenantId && r.id === roleId);
  }

  createRole(tenantId: string, name: string, description: string, permissionSlugs: string[]): Role {
    const newRole: Role = {
      id: `role-${Date.now()}`,
      tenantId,
      name,
      description,
      isSystem: false,
    };
    this.roles.push(newRole);
    saveStorage(STORAGE_KEYS.ROLES, this.roles);

    this.updateRolePermissions(newRole.id, permissionSlugs);
    return newRole;
  }

  updateRole(tenantId: string, roleId: string, name: string, description: string, permissionSlugs: string[]): Role {
    const idx = this.roles.findIndex((r) => r.tenantId === tenantId && r.id === roleId);
    if (idx === -1) throw new Error('Rol no encontrado');

    this.roles[idx].name = name;
    this.roles[idx].description = description;
    saveStorage(STORAGE_KEYS.ROLES, this.roles);

    this.updateRolePermissions(roleId, permissionSlugs);
    return this.roles[idx];
  }

  deleteRole(tenantId: string, roleId: string): boolean {
    const role = this.getRoleById(tenantId, roleId);
    if (!role) throw new Error('Rol no encontrado');
    if (role.isSystem) throw new Error('No se puede eliminar el rol de sistema principal');

    // Remove role from users
    this.users.forEach((u) => {
      if (u.roleId === roleId) u.roleId = undefined;
    });
    saveStorage(STORAGE_KEYS.USERS, this.users);

    this.roles = this.roles.filter((r) => r.id !== roleId);
    this.rolePermissions = this.rolePermissions.filter((rp) => rp.roleId !== roleId);
    saveStorage(STORAGE_KEYS.ROLES, this.roles);
    saveStorage(STORAGE_KEYS.ROLE_PERMISSIONS, this.rolePermissions);
    return true;
  }

  getPermissionsForRole(roleId: string): string[] {
    const rolePerms = this.rolePermissions.filter((rp) => rp.roleId === roleId);
    const permIds = new Set(rolePerms.map((rp) => rp.permissionId));
    return SYSTEM_PERMISSIONS.filter((p) => permIds.has(p.id)).map((p) => p.slug);
  }

  updateRolePermissions(roleId: string, permissionSlugs: string[]): void {
    // Remove existing
    this.rolePermissions = this.rolePermissions.filter((rp) => rp.roleId !== roleId);

    // Map slugs to permission IDs
    const validPerms = SYSTEM_PERMISSIONS.filter((p) => permissionSlugs.includes(p.slug));
    const newItems: RolePermission[] = validPerms.map((p) => ({
      id: `rp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      roleId,
      permissionId: p.id,
    }));

    this.rolePermissions.push(...newItems);
    saveStorage(STORAGE_KEYS.ROLE_PERMISSIONS, this.rolePermissions);
  }

  getUserPermissions(user: User): string[] {
    if (!user.roleId) return [];
    return this.getPermissionsForRole(user.roleId);
  }

  // --- SUPPORT TICKETS ---
  getTickets(tenantId: string): SupportTicket[] {
    return this.tickets.filter((t) => t.tenantId === tenantId);
  }

  createTicket(tenantId: string, userId: string, userName: string, data: { subject: string; description: string; category: SupportTicket['category']; priority: SupportTicket['priority'] }): SupportTicket {
    const newTicket: SupportTicket = {
      id: `tick-${Date.now()}`,
      tenantId,
      userId,
      userName,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `tm-${Date.now()}`,
          ticketId: `tick-${Date.now()}`,
          userId,
          userName,
          message: data.description,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    this.tickets.unshift(newTicket);
    saveStorage(STORAGE_KEYS.TICKETS, this.tickets);

    this.addNotification({
      tenantId,
      title: 'Ticket de Soporte Creado',
      message: `El ticket "${data.subject}" fue registrado con prioridad ${data.priority}.`,
      type: 'support_update',
      relatedEntityId: newTicket.id,
    });

    return newTicket;
  }

  addTicketMessage(tenantId: string, ticketId: string, userId: string, userName: string, message: string, isSupportAgent: boolean = false): SupportTicket {
    const idx = this.tickets.findIndex((t) => t.tenantId === tenantId && t.id === ticketId);
    if (idx === -1) throw new Error('Ticket no encontrado');

    const msg: TicketMessage = {
      id: `tm-${Date.now()}`,
      ticketId,
      userId,
      userName,
      message,
      isSupportAgent,
      createdAt: new Date().toISOString(),
    };

    if (!this.tickets[idx].messages) this.tickets[idx].messages = [];
    this.tickets[idx].messages.push(msg);
    this.tickets[idx].updatedAt = new Date().toISOString();
    if (isSupportAgent && this.tickets[idx].status === 'open') {
      this.tickets[idx].status = 'in_progress';
    }

    saveStorage(STORAGE_KEYS.TICKETS, this.tickets);
    return this.tickets[idx];
  }

  updateTicketStatus(tenantId: string, ticketId: string, status: SupportTicket['status']): SupportTicket {
    const idx = this.tickets.findIndex((t) => t.tenantId === tenantId && t.id === ticketId);
    if (idx === -1) throw new Error('Ticket no encontrado');
    this.tickets[idx].status = status;
    this.tickets[idx].updatedAt = new Date().toISOString();
    saveStorage(STORAGE_KEYS.TICKETS, this.tickets);
    return this.tickets[idx];
  }

  // --- NOTIFICATIONS ---
  getNotifications(tenantId: string): Notification[] {
    return this.notifications.filter((n) => n.tenantId === tenantId);
  }

  addNotification(params: { tenantId: string; userId?: string | null; title: string; message: string; type: Notification['type']; relatedEntityId?: string }): Notification {
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: params.tenantId,
      userId: params.userId || null,
      title: params.title,
      message: params.message,
      type: params.type,
      isRead: false,
      relatedEntityId: params.relatedEntityId || null,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    return newNotif;
  }

  markNotificationAsRead(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      saveStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    }
  }

  markAllNotificationsAsRead(tenantId: string): void {
    this.notifications.forEach((n) => {
      if (n.tenantId === tenantId) n.isRead = true;
    });
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  // Reset demo data
  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.TENANTS);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTIONS);
    localStorage.removeItem(STORAGE_KEYS.ROLES);
    localStorage.removeItem(STORAGE_KEYS.ROLE_PERMISSIONS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    this.tenants = INITIAL_TENANTS;
    this.subscriptions = INITIAL_SUBSCRIPTIONS;
    this.roles = INITIAL_ROLES;
    this.rolePermissions = INITIAL_ROLE_PERMISSIONS;
    this.users = INITIAL_USERS;
    this.products = INITIAL_PRODUCTS;
    this.orders = INITIAL_ORDERS;
    this.tickets = INITIAL_TICKETS;
    this.notifications = INITIAL_NOTIFICATIONS;
  }
}

export const db = new DatabaseService();

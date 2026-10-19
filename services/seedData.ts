import {
  Tenant,
  Permission,
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
} from '@/types';

export const SYSTEM_PERMISSIONS: Permission[] = [
  // Products
  { id: 'perm-p-create', module: 'products', action: 'create', slug: 'products.create', label: 'Crear Productos', description: 'Permite registrar nuevos artículos en el catálogo' },
  { id: 'perm-p-read', module: 'products', action: 'read', slug: 'products.read', label: 'Ver Productos', description: 'Permite consultar el catálogo e inventario' },
  { id: 'perm-p-update', module: 'products', action: 'update', slug: 'products.update', label: 'Editar Productos', description: 'Permite modificar precios, costos y datos' },
  { id: 'perm-p-delete', module: 'products', action: 'delete', slug: 'products.delete', label: 'Eliminar Productos', description: 'Permite dar de baja productos del sistema' },
  
  // Orders / POS
  { id: 'perm-o-create', module: 'orders', action: 'create', slug: 'orders.create', label: 'Cobrar en POS', description: 'Permite procesar ventas y emitir tickets' },
  { id: 'perm-o-read', module: 'orders', action: 'read', slug: 'orders.read', label: 'Historial de Ventas', description: 'Permite consultar ventas realizadas' },
  { id: 'perm-o-delete', module: 'orders', action: 'delete', slug: 'orders.delete', label: 'Anular Ventas', description: 'Permite cancelar transacciones y revertir stock' },
  
  // Reports
  { id: 'perm-r-read', module: 'reports', action: 'read', slug: 'reports.read', label: 'Reportes y Métricas', description: 'Acceso a ingresos, ganancias y balances' },
  
  // Users / Roles
  { id: 'perm-u-manage', module: 'users', action: 'manage', slug: 'users.manage', label: 'Gestionar Personal', description: 'Crear usuarios, asignar roles y configurar permisos' },
  
  // Support
  { id: 'perm-s-manage', module: 'support', action: 'manage', slug: 'support.manage', label: 'Mesa de Ayuda', description: 'Crear y dar seguimiento a tickets de soporte' },

  // Settings
  { id: 'perm-cfg-manage', module: 'settings', action: 'manage', slug: 'settings.manage', label: 'Configuración y Branding', description: 'Modificar colores, nombre de negocio y suscripción' },
];

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant-101',
    name: 'Panadería & Café La Espiga',
    slug: 'la-espiga',
    status: 'active',
    primaryColor: '#10B981', // Emerald green
    secondaryColor: '#0284C7', // Sky blue
    currency: '$',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'tenant-102',
    name: 'ElectroSmart Innovación',
    slug: 'electrosmart',
    status: 'active',
    primaryColor: '#4F46E5', // Indigo
    secondaryColor: '#06B6D4', // Cyan
    currency: '$',
    createdAt: '2026-02-15T09:30:00Z',
  },
  {
    id: 'tenant-103',
    name: 'Boutique Bella Moda',
    slug: 'bella-moda',
    status: 'active',
    primaryColor: '#E11D48', // Rose / Berry
    secondaryColor: '#D97706', // Amber gold
    currency: '$',
    createdAt: '2026-03-01T12:00:00Z',
  },
];

export const INITIAL_SUBSCRIPTIONS: TenantSubscription[] = [
  {
    id: 'sub-101',
    tenantId: 'tenant-101',
    planName: 'Plan Comercial Pro (Anual)',
    price: 349.0,
    expiresAt: '2027-01-10T23:59:59Z',
    status: 'active',
  },
  {
    id: 'sub-102',
    tenantId: 'tenant-102',
    planName: 'Plan Negocio Crecimiento (Mensual)',
    price: 39.99,
    expiresAt: '2026-11-20T23:59:59Z',
    status: 'active',
  },
  {
    id: 'sub-103',
    tenantId: 'tenant-103',
    planName: 'Plan Básico Emprendedor',
    price: 19.99,
    expiresAt: '2026-10-30T23:59:59Z',
    status: 'active',
  },
];

export const INITIAL_ROLES: Role[] = [
  // Tenant 101 roles
  { id: 'role-admin-101', tenantId: 'tenant-101', name: 'Administrador General', description: 'Acceso total y control gerencial', isSystem: true },
  { id: 'role-cajero-101', tenantId: 'tenant-101', name: 'Cajero POS', description: 'Acceso exclusivo al Punto de Venta y consulta básica', isSystem: false },
  { id: 'role-inventario-101', tenantId: 'tenant-101', name: 'Encargado de Almacén', description: 'Control de inventarios y stock', isSystem: false },

  // Tenant 102 roles
  { id: 'role-admin-102', tenantId: 'tenant-102', name: 'Administrador General', description: 'Acceso total y control gerencial', isSystem: true },
  { id: 'role-cajero-102', tenantId: 'tenant-102', name: 'Cajero POS', description: 'Acceso para ventas', isSystem: false },

  // Tenant 103 roles
  { id: 'role-admin-103', tenantId: 'tenant-103', name: 'Administrador General', description: 'Acceso total', isSystem: true },
  { id: 'role-cajero-103', tenantId: 'tenant-103', name: 'Vendedor / Cajero', description: 'Venta al mostrador', isSystem: false },
];

export const INITIAL_ROLE_PERMISSIONS: RolePermission[] = [
  // Admin 101 (All permissions)
  ...SYSTEM_PERMISSIONS.map((p) => ({
    id: `rp-admin101-${p.id}`,
    roleId: 'role-admin-101',
    permissionId: p.id,
  })),
  // Cajero 101 (Only POS sales, view products, support)
  { id: 'rp-cajero-1', roleId: 'role-cajero-101', permissionId: 'perm-o-create' },
  { id: 'rp-cajero-2', roleId: 'role-cajero-101', permissionId: 'perm-o-read' },
  { id: 'rp-cajero-3', roleId: 'role-cajero-101', permissionId: 'perm-p-read' },
  { id: 'rp-cajero-4', roleId: 'role-cajero-101', permissionId: 'perm-s-manage' },

  // Almacén 101 (Products CRUD, no sales deletion, no reports)
  { id: 'rp-inv-1', roleId: 'role-inventario-101', permissionId: 'perm-p-create' },
  { id: 'rp-inv-2', roleId: 'role-inventario-101', permissionId: 'perm-p-read' },
  { id: 'rp-inv-3', roleId: 'role-inventario-101', permissionId: 'perm-p-update' },
  { id: 'rp-inv-4', roleId: 'role-inventario-101', permissionId: 'perm-p-delete' },
  { id: 'rp-inv-5', roleId: 'role-inventario-101', permissionId: 'perm-s-manage' },

  // Admin 102 & 103
  ...SYSTEM_PERMISSIONS.map((p) => ({
    id: `rp-admin102-${p.id}`,
    roleId: 'role-admin-102',
    permissionId: p.id,
  })),
  { id: 'rp-cajero102-1', roleId: 'role-cajero-102', permissionId: 'perm-o-create' },
  { id: 'rp-cajero102-2', roleId: 'role-cajero-102', permissionId: 'perm-o-read' },
  { id: 'rp-cajero102-3', roleId: 'role-cajero-102', permissionId: 'perm-p-read' },

  ...SYSTEM_PERMISSIONS.map((p) => ({
    id: `rp-admin103-${p.id}`,
    roleId: 'role-admin-103',
    permissionId: p.id,
  })),
  { id: 'rp-cajero103-1', roleId: 'role-cajero-103', permissionId: 'perm-o-create' },
  { id: 'rp-cajero103-2', roleId: 'role-cajero-103', permissionId: 'perm-o-read' },
  { id: 'rp-cajero103-3', roleId: 'role-cajero-103', permissionId: 'perm-p-read' },
];

export const INITIAL_USERS: User[] = [
  // Tenant 101
  {
    id: 'user-admin-101',
    tenantId: 'tenant-101',
    roleId: 'role-admin-101',
    name: 'Sofía Valenzuela (Admin)',
    email: 'sofia@laespiga.com',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user-cajero-101',
    tenantId: 'tenant-101',
    roleId: 'role-cajero-101',
    name: 'Carlos Mendoza (Cajero)',
    email: 'carlos@laespiga.com',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'user-inv-101',
    tenantId: 'tenant-101',
    roleId: 'role-inventario-101',
    name: 'Marta Rivas (Almacén)',
    email: 'marta@laespiga.com',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: '2026-01-20T10:00:00Z',
  },

  // Tenant 102
  {
    id: 'user-admin-102',
    tenantId: 'tenant-102',
    roleId: 'role-admin-102',
    name: 'Mateo Chen (Admin Tech)',
    email: 'mateo@electrosmart.io',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    createdAt: '2026-02-15T09:30:00Z',
  },
  {
    id: 'user-cajero-102',
    tenantId: 'tenant-102',
    roleId: 'role-cajero-102',
    name: 'Lucía Morales (Cajera)',
    email: 'lucia@electrosmart.io',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    createdAt: '2026-02-18T11:00:00Z',
  },

  // Tenant 103
  {
    id: 'user-admin-103',
    tenantId: 'tenant-103',
    roleId: 'role-admin-103',
    name: 'Valentina Rossi (Directora)',
    email: 'valentina@bellamoda.com',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    createdAt: '2026-03-01T12:00:00Z',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Tenant 101 - Panadería & Café
  {
    id: 'prod-101-1',
    tenantId: 'tenant-101',
    name: 'Pan Baguette Artesanal',
    barcode: '7501000101',
    price: 2.5,
    cost: 0.9,
    stock: 45,
    minStock: 10,
    category: 'Panadería',
    isActive: true,
    createdAt: '2026-01-12T10:00:00Z',
  },
  {
    id: 'prod-101-2',
    tenantId: 'tenant-101',
    name: 'Croissant Mantequilla Francesa',
    barcode: '7501000102',
    price: 3.2,
    cost: 1.1,
    stock: 28,
    minStock: 8,
    category: 'Bollería',
    isActive: true,
    createdAt: '2026-01-12T10:05:00Z',
  },
  {
    id: 'prod-101-3',
    tenantId: 'tenant-101',
    name: 'Café Espresso Doble',
    barcode: '7501000103',
    price: 2.8,
    cost: 0.6,
    stock: 120,
    minStock: 20,
    category: 'Cafetería',
    isActive: true,
    createdAt: '2026-01-12T10:10:00Z',
  },
  {
    id: 'prod-101-4',
    tenantId: 'tenant-101',
    name: 'Cappuccino Vainilla Grande',
    barcode: '7501000104',
    price: 4.5,
    cost: 1.3,
    stock: 95,
    minStock: 15,
    category: 'Cafetería',
    isActive: true,
    createdAt: '2026-01-12T10:15:00Z',
  },
  {
    id: 'prod-101-5',
    tenantId: 'tenant-101',
    name: 'Tarta de Frutos Rojos (Porción)',
    barcode: '7501000105',
    price: 5.5,
    cost: 2.0,
    stock: 4, // Low stock alert!
    minStock: 6,
    category: 'Pastelería',
    isActive: true,
    createdAt: '2026-01-12T10:20:00Z',
  },
  {
    id: 'prod-101-6',
    tenantId: 'tenant-101',
    name: 'Sandwich Jamón Serrano & Queso Brie',
    barcode: '7501000106',
    price: 6.8,
    cost: 2.9,
    stock: 18,
    minStock: 5,
    category: 'Snacks & Delis',
    isActive: true,
    createdAt: '2026-01-12T10:25:00Z',
  },
  {
    id: 'prod-101-7',
    tenantId: 'tenant-101',
    name: 'Jugo Natural de Naranja 500ml',
    barcode: '7501000107',
    price: 3.5,
    cost: 1.0,
    stock: 2, // Very low stock!
    minStock: 10,
    category: 'Bebidas',
    isActive: true,
    createdAt: '2026-01-12T10:30:00Z',
  },

  // Tenant 102 - Tech Store
  {
    id: 'prod-102-1',
    tenantId: 'tenant-102',
    name: 'Cable USB-C Carga Rápida 65W 2m',
    barcode: '7502000201',
    price: 18.99,
    cost: 6.5,
    stock: 42,
    minStock: 10,
    category: 'Accesorios',
    isActive: true,
    createdAt: '2026-02-16T10:00:00Z',
  },
  {
    id: 'prod-102-2',
    tenantId: 'tenant-102',
    name: 'Auriculares Inalámbricos Bluetooth ANC',
    barcode: '7502000202',
    price: 49.99,
    cost: 22.0,
    stock: 14,
    minStock: 5,
    category: 'Audio',
    isActive: true,
    createdAt: '2026-02-16T10:05:00Z',
  },
  {
    id: 'prod-102-3',
    tenantId: 'tenant-102',
    name: 'Cargador Portátil PowerBank 20000mAh',
    barcode: '7502000203',
    price: 35.0,
    cost: 15.0,
    stock: 3, // Low stock
    minStock: 8,
    category: 'Baterías',
    isActive: true,
    createdAt: '2026-02-16T10:10:00Z',
  },
  {
    id: 'prod-102-4',
    tenantId: 'tenant-102',
    name: 'Mouse Ergonómico Inalámbrico Silent',
    barcode: '7502000204',
    price: 24.5,
    cost: 11.0,
    stock: 25,
    minStock: 6,
    category: 'Periféricos',
    isActive: true,
    createdAt: '2026-02-16T10:15:00Z',
  },

  // Tenant 103 - Boutique
  {
    id: 'prod-103-1',
    tenantId: 'tenant-103',
    name: 'Blusa Seda Floral Primavera',
    barcode: '7503000301',
    price: 39.0,
    cost: 16.0,
    stock: 12,
    minStock: 4,
    category: 'Ropa Dama',
    isActive: true,
    createdAt: '2026-03-02T10:00:00Z',
  },
  {
    id: 'prod-103-2',
    tenantId: 'tenant-103',
    name: 'Bolso Cuero Ecológico Caramel',
    barcode: '7503000302',
    price: 65.0,
    cost: 28.0,
    stock: 5,
    minStock: 3,
    category: 'Bolsos & Carteras',
    isActive: true,
    createdAt: '2026-03-02T10:05:00Z',
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101-1',
    tenantId: 'tenant-101',
    userId: 'user-cajero-101',
    userName: 'Carlos Mendoza (Cajero)',
    total: 10.2,
    subtotal: 10.2,
    tax: 0,
    paymentMethod: 'cash',
    amountReceived: 20.0,
    changeGiven: 9.8,
    status: 'completed',
    itemsCount: 3,
    createdAt: '2026-10-15T09:12:00Z',
    orderItems: [
      {
        id: 'oi-1',
        orderId: 'ord-101-1',
        productId: 'prod-101-1',
        productName: 'Pan Baguette Artesanal',
        productBarcode: '7501000101',
        quantity: 2,
        unitPrice: 2.5,
        cost: 0.9,
        subtotal: 5.0,
      },
      {
        id: 'oi-2',
        orderId: 'ord-101-1',
        productId: 'prod-101-5',
        productName: 'Tarta de Frutos Rojos (Porción)',
        productBarcode: '7501000105',
        quantity: 1,
        unitPrice: 5.2,
        cost: 2.0,
        subtotal: 5.2,
      },
    ],
  },
  {
    id: 'ord-101-2',
    tenantId: 'tenant-101',
    userId: 'user-admin-101',
    userName: 'Sofía Valenzuela (Admin)',
    total: 14.1,
    subtotal: 14.1,
    tax: 0,
    paymentMethod: 'card_machine',
    paymentReference: 'VOUCH-84920',
    status: 'completed',
    itemsCount: 4,
    createdAt: '2026-10-15T09:45:00Z',
    orderItems: [
      {
        id: 'oi-3',
        orderId: 'ord-101-2',
        productId: 'prod-101-3',
        productName: 'Café Espresso Doble',
        productBarcode: '7501000103',
        quantity: 2,
        unitPrice: 2.8,
        cost: 0.6,
        subtotal: 5.6,
      },
      {
        id: 'oi-4',
        orderId: 'ord-101-2',
        productId: 'prod-101-2',
        productName: 'Croissant Mantequilla Francesa',
        productBarcode: '7501000102',
        quantity: 1,
        unitPrice: 3.2,
        cost: 1.1,
        subtotal: 3.2,
      },
      {
        id: 'oi-5',
        orderId: 'ord-101-2',
        productId: 'prod-101-6',
        productName: 'Sandwich Jamón Serrano & Queso Brie',
        productBarcode: '7501000106',
        quantity: 1,
        unitPrice: 5.3,
        cost: 2.9,
        subtotal: 5.3,
      },
    ],
  },
  {
    id: 'ord-101-3',
    tenantId: 'tenant-101',
    userId: 'user-cajero-101',
    userName: 'Carlos Mendoza (Cajero)',
    total: 8.0,
    subtotal: 8.0,
    tax: 0,
    paymentMethod: 'transfer',
    paymentReference: 'TRANSF-7741',
    status: 'completed',
    itemsCount: 2,
    createdAt: '2026-10-15T10:02:00Z',
    orderItems: [
      {
        id: 'oi-6',
        orderId: 'ord-101-3',
        productId: 'prod-101-4',
        productName: 'Cappuccino Vainilla Grande',
        productBarcode: '7501000104',
        quantity: 1,
        unitPrice: 4.5,
        cost: 1.3,
        subtotal: 4.5,
      },
      {
        id: 'oi-7',
        orderId: 'ord-101-3',
        productId: 'prod-101-7',
        productName: 'Jugo Natural de Naranja 500ml',
        productBarcode: '7501000107',
        quantity: 1,
        unitPrice: 3.5,
        cost: 1.0,
        subtotal: 3.5,
      },
    ],
  },
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tick-101-1',
    tenantId: 'tenant-101',
    userId: 'user-admin-101',
    userName: 'Sofía Valenzuela (Admin)',
    subject: 'Configuración de impresora térmica para tickets',
    description: 'Requerimos asistencia para enlazar la impresora térmica Epson TM-T20 al punto de venta y ajustar el ancho de papel a 80mm.',
    category: 'other',
    priority: 'medium',
    status: 'in_progress',
    createdAt: '2026-10-14T14:30:00Z',
    updatedAt: '2026-10-15T08:15:00Z',
    messages: [
      {
        id: 'tm-1',
        ticketId: 'tick-101-1',
        userId: 'user-admin-101',
        userName: 'Sofía Valenzuela',
        message: 'Hola equipo, conectamos la impresora por USB pero queremos verificar el formato de impresión.',
        createdAt: '2026-10-14T14:30:00Z',
      },
      {
        id: 'tm-2',
        ticketId: 'tick-101-1',
        userId: 'support-agent',
        userName: 'Soporte Técnico SaaS',
        isSupportAgent: true,
        message: '¡Hola Sofía! El POS soporta impresión directa de tickets a 80mm y 58mm mediante el navegador estándar. Te sugerimos seleccionar "Márgenes: Ninguno" en el diálogo de impresión.',
        createdAt: '2026-10-15T08:15:00Z',
      },
    ],
  },
  {
    id: 'tick-101-2',
    tenantId: 'tenant-101',
    userId: 'user-inv-101',
    userName: 'Marta Rivas (Almacén)',
    subject: 'Alerta de stock mínimo en Tarta Frutos Rojos',
    description: 'Se detectaron discrepancias entre el conteo físico y el sistema en la categoría de pastelería.',
    category: 'inventory_error',
    priority: 'low',
    status: 'open',
    createdAt: '2026-10-15T07:45:00Z',
    updatedAt: '2026-10-15T07:45:00Z',
    messages: [
      {
        id: 'tm-3',
        ticketId: 'tick-101-2',
        userId: 'user-inv-101',
        userName: 'Marta Rivas',
        message: 'Reporto que quedan 4 unidades en vitrina para coordinar reposición con cocina.',
        createdAt: '2026-10-15T07:45:00Z',
      },
    ],
  },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    tenantId: 'tenant-101',
    title: 'Alerta de Stock Crítico',
    message: 'El producto "Tarta de Frutos Rojos" tiene solo 4 unidades restantes.',
    type: 'inventory_warning',
    isRead: false,
    relatedEntityId: 'prod-101-5',
    createdAt: '2026-10-15T07:45:00Z',
  },
  {
    id: 'notif-2',
    tenantId: 'tenant-101',
    title: 'Alerta de Stock Crítico',
    message: 'El producto "Jugo Natural de Naranja" tiene solo 2 unidades restantes.',
    type: 'inventory_warning',
    isRead: false,
    relatedEntityId: 'prod-101-7',
    createdAt: '2026-10-15T08:30:00Z',
  },
  {
    id: 'notif-3',
    tenantId: 'tenant-101',
    title: 'Soporte Técnico',
    message: 'Tu ticket #tick-101-1 ha recibido una respuesta del agente de soporte.',
    type: 'support_update',
    isRead: false,
    relatedEntityId: 'tick-101-1',
    createdAt: '2026-10-15T08:15:00Z',
  },
];

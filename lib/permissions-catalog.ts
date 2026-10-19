// Catálogo global de permisos atómicos del sistema (sin tenant).
// Fuente de verdad única para seed, signup y validación RBAC.

export interface PermissionDef {
  module: 'products' | 'orders' | 'reports' | 'users' | 'support' | 'settings';
  action: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'export';
  slug: string;
  label: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDef[] = [
  { module: 'products', action: 'create', slug: 'products.create', label: 'Crear Productos', description: 'Permite registrar nuevos artículos en el catálogo' },
  { module: 'products', action: 'read', slug: 'products.read', label: 'Ver Productos', description: 'Permite consultar el catálogo e inventario' },
  { module: 'products', action: 'update', slug: 'products.update', label: 'Editar Productos', description: 'Permite modificar precios, costos y datos' },
  { module: 'products', action: 'delete', slug: 'products.delete', label: 'Eliminar Productos', description: 'Permite dar de baja productos del sistema' },
  { module: 'orders', action: 'create', slug: 'orders.create', label: 'Cobrar en POS', description: 'Permite procesar ventas y emitir tickets' },
  { module: 'orders', action: 'read', slug: 'orders.read', label: 'Historial de Ventas', description: 'Permite consultar ventas realizadas' },
  { module: 'orders', action: 'delete', slug: 'orders.delete', label: 'Anular Ventas', description: 'Permite cancelar transacciones y revertir stock' },
  { module: 'reports', action: 'read', slug: 'reports.read', label: 'Ver Reportes', description: 'Acceso a ingresos, ganancias y balances' },
  { module: 'reports', action: 'export', slug: 'reports.export', label: 'Exportar Reportes', description: 'Permite descargar reportes en formato CSV' },
  { module: 'users', action: 'read', slug: 'users.read', label: 'Ver Personal', description: 'Permite consultar la lista de empleados y sus roles' },
  { module: 'users', action: 'manage', slug: 'users.manage', label: 'Gestionar Personal', description: 'Crear usuarios, asignar roles y configurar permisos' },
  { module: 'support', action: 'read', slug: 'support.read', label: 'Ver Incidencias', description: 'Permite consultar los tickets de soporte' },
  { module: 'support', action: 'manage', slug: 'support.manage', label: 'Gestionar Incidencias', description: 'Crear y dar seguimiento a tickets de soporte' },
  { module: 'settings', action: 'read', slug: 'settings.read', label: 'Ver Configuración', description: 'Permite ver la configuración del negocio' },
  { module: 'settings', action: 'manage', slug: 'settings.manage', label: 'Gestionar Configuración', description: 'Modificar colores, nombre de negocio y suscripción' },
];

export const ALL_PERMISSION_SLUGS = SYSTEM_PERMISSIONS.map((p) => p.slug);

import type {
  DianTaxpayerData,
  DianCustomerData,
  DianTaxBreakdown,
  DianDocumentMeta,
  DianTaxType,
  DianResolution,
  DianIdType,
} from '@/lib/dian/types';

export * from '@/lib/dian/types';

export type TenantStatus = 'active' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  createdAt: string;
  dianConfig?: DianTaxpayerData;
}

export type PermissionModule =
  | 'orders'
  | 'products'
  | 'dian'
  | 'customers'
  | 'reports'
  | 'users'
  | 'support'
  | 'settings';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'
  | 'view'
  | 'discount'
  | 'reprint'
  | 'export'
  | 'stock_adjust'
  | 'cost_view'
  | 'categories'
  | 'pos_equivalent'
  | 'fev_invoice'
  | 'credit_note'
  | 'config'
  | 'xml_download'
  | 'financial'
  | 'taxes'
  | 'cashier'
  | 'status'
  | 'reset_password'
  | 'roles_read'
  | 'roles_create'
  | 'roles_update'
  | 'roles_delete'
  | 'reply'
  | 'close'
  | 'branding'
  | 'currency'
  | 'subscription'
  | 'cash_control';

export interface Permission {
  id: string;
  module: PermissionModule;
  action: PermissionAction;
  slug: string; // e.g. "products.create"
  label: string;
  description: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystem?: boolean;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
}

export interface User {
  id: string;
  tenantId: string;
  roleId?: string;
  name: string;
  email: string;
  passwordHash?: string;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  minStock?: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
  dianTaxType?: DianTaxType;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card_machine';
export type OrderStatus = 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productBarcode?: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
  subtotal: number;
  dianTaxType?: DianTaxType;
  dianTaxAmount?: number;
}

export interface Order {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string;
  total: number;
  subtotal: number;
  tax: number;
  currencyCode?: string;
  exchangeRate?: number;
  currencyTotal?: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  amountReceived?: number;
  changeGiven?: number;
  status: OrderStatus;
  itemsCount: number;
  createdAt: string;
  orderItems?: OrderItem[];
  // DIAN Software Propio fields
  dianDocumentNumber?: string;
  dianPrefix?: string;
  dianConsecutive?: number;
  dianCufe?: string;
  dianQrString?: string;
  dianQrDataUrl?: string;
  dianXml?: string;
  dianStatus?: 'VALIDATED_LOCAL' | 'TRANSMITTED_DIAN';
  dianCustomer?: DianCustomerData;
  dianTaxBreakdown?: DianTaxBreakdown;
  creditNoteNumber?: string;
  creditNoteCude?: string;
  creditNoteXml?: string;
}

export type SubscriptionStatus = 'active' | 'expired';

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planName: string;
  price: number;
  expiresAt: string;
  status: SubscriptionStatus;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationDays: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

export type TicketCategory = string;
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  message: string;
  isSupportAgent?: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

export type NotificationType = string;

export interface Currency {
  id: string;
  tenantId: string;
  code: string;
  symbol: string;
  name: string;
  rateToBase: number;
  isBase: boolean;
  isActive: boolean;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedEntityId?: string | null;
  createdAt: string;
}

export interface POSCartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

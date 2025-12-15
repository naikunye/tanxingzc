
export enum OrderStatus {
  PENDING = 'Pending',
  PURCHASED = 'Purchased',
  READY_TO_SHIP = 'Ready to Ship',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export const OrderStatusCN: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '代采购',
  [OrderStatus.PURCHASED]: '已采购',
  [OrderStatus.READY_TO_SHIP]: '待发货',
  [OrderStatus.SHIPPED]: '已发货',
  [OrderStatus.DELIVERED]: '已签收',
  [OrderStatus.CANCELLED]: '已取消'
};

export const TIMELINE_STEPS = [
  OrderStatus.PENDING,
  OrderStatus.PURCHASED,
  OrderStatus.READY_TO_SHIP,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED
];

export interface Order {
  id: string;
  itemName: string;
  quantity: number;
  priceUSD: number;
  buyerAddress: string;
  purchaseDate: string; // ISO Date string
  platform: string;
  platformOrderId?: string; // Order ID from the platform (e.g. Amazon 112-xxx)
  clientOrderId?: string; // ID provided by the client/buyer
  status: OrderStatus;
  
  // Logistics
  trackingNumber?: string; // Logistics to customer
  supplierTrackingNumber?: string; // Tracking from supplier to agent
  detailedStatus?: string; // Detailed string from 17TRACK (e.g., "In Transit", "Pick Up")
  
  imageUrl?: string; // Base64 or URL
  notes?: string;
  lastUpdated: string;
  
  // Soft Delete Fields
  deleted?: boolean;
  deletedAt?: string; // ISO Date string when it was moved to trash
}

export interface Customer {
    id: string;
    name: string;
    phone?: string;
    address: string;
    tags?: string[];
    notes?: string;
    lastOrderDate?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalSpent: number;
  activeOrders: number;
  deliveredOrders: number;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface WarningRules {
  purchaseTimeoutHours: number; // e.g. 48 hours. Warn if PURCHASED but not Shipped.
  shippingTimeoutDays: number;  // e.g. 7 days. Warn if SHIPPED but not Delivered.
  impendingBufferHours: number; // e.g. 24 hours. Show "Yellow" warning if within this window before timeout.
}

export interface AppSettings {
  cloudConfig: SupabaseConfig;
  tracking17Token: string;
  theme: 'light' | 'dark';
  warningRules: WarningRules;
}

export type ViewState = 'dashboard' | 'list' | 'add' | 'edit' | 'customers' | 'trash';

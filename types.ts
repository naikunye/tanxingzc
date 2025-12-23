
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
  platformOrderId?: string;
  clientOrderId?: string;
  status: OrderStatus;
  
  // Logistics
  trackingNumber?: string;
  supplierTrackingNumber?: string;
  detailedStatus?: string;
  
  imageUrl?: string;
  notes?: string;
  lastUpdated: string;
  
  // Soft Delete Fields
  deleted?: boolean;
  deletedAt?: string;
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
  purchaseTimeoutHours: number;
  shippingTimeoutDays: number;
  impendingBufferHours: number;
}

export type ThemeType = 'dark' | 'aurora' | 'crystal';

export interface AppSettings {
  cloudConfig: SupabaseConfig;
  tracking17Token: string;
  theme: ThemeType;
  warningRules: WarningRules;
}

export type ViewState = 'dashboard' | 'list' | 'add' | 'edit' | 'customers' | 'trash';

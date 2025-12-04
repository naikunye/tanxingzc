
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
  status: OrderStatus;
  trackingNumber?: string; // Logistics to customer
  supplierTrackingNumber?: string; // Tracking from supplier to agent
  imageUrl?: string; // Base64 or URL
  notes?: string;
  lastUpdated: string;
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

export type ViewState = 'dashboard' | 'list' | 'add' | 'edit';



export enum OrderStatus {
  PENDING = 'Pending',
  PURCHASED = 'Purchased',
  READY_TO_SHIP = 'Ready to Ship',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export const OrderStatusCN: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '等待采购',
  [OrderStatus.PURCHASED]: '已订购',
  [OrderStatus.READY_TO_SHIP]: '待发货',
  [OrderStatus.SHIPPED]: '已发货',
  [OrderStatus.DELIVERED]: '已收货',
  [OrderStatus.CANCELLED]: '已取消'
};

export interface Order {
  id: string;
  itemName: string;
  quantity: number;
  priceUSD: number;
  buyerAddress: string;
  purchaseDate: string;
  platform: string;
  platformOrderId?: string;
  clientOrderId?: string;
  status: OrderStatus;
  // Added detailedStatus to fix Property 'detailedStatus' does not exist on type 'Order' in logisticsService.ts
  detailedStatus?: string;
  trackingNumber?: string;
  supplierTrackingNumber?: string;
  imageUrl?: string;
  notes?: string;
  lastUpdated: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Customer {
    id: string;
    name: string;
    phone?: string;
    address: string;
    notes?: string;
}

export type ThemeType = 'dark' | 'aurora' | 'crystal';

export interface WarningRules {
  purchaseTimeoutHours: number;
  shippingTimeoutDays: number;
  // Added impendingBufferHours to fix 'impendingBufferHours' does not exist in type 'WarningRules' in App.tsx
  impendingBufferHours: number;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface AppSettings {
  cloudConfig: SupabaseConfig;
  tracking17Token: string;
  theme: ThemeType;
  warningRules: WarningRules;
  // Added defaultExchangeRate to fix 'defaultExchangeRate' does not exist in type 'AppSettings' in App.tsx
  defaultExchangeRate: number;
}

export type ViewState = 'dashboard' | 'list' | 'add' | 'edit' | 'customers' | 'trash';

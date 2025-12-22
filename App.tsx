
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Order, Customer, SupabaseConfig, AppSettings, OrderStatus, WarningRules } from './types';
import { Dashboard } from './components/Dashboard';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { CustomerList } from './components/CustomerList';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { LayoutDashboard, ShoppingCart, PlusCircle, Settings, Box, Cloud, Loader2, Database, Wifi, WifiOff, Copy, Check, ExternalLink, Truck, ChevronDown, Users, Moon, Sun, Trash2, Recycle, AlertTriangle, Hourglass, Menu, Save, Upload, Code, HelpCircle } from 'lucide-react';
import { initSupabase, fetchCloudOrders, saveCloudOrder, deleteCloudOrder, fetchCloudCustomers, saveCloudCustomer, deleteCloudCustomer } from './services/supabaseService';
import { syncOrderLogistics } from './services/logisticsService';

const STORAGE_KEY = 'smart_procure_data';
const CUSTOMERS_KEY = 'smart_procure_customers';
const SETTINGS_KEY = 'smart_procure_settings';

const DEFAULT_WARNING_RULES: WarningRules = {
    purchaseTimeoutHours: 48,
    shippingTimeoutDays: 7,
    impendingBufferHours: 24 // Alert 24h before timeout
};

// SQL to initialize Supabase
const INIT_SQL = `
-- 1. 创建订单表 (Create orders table)
create table if not exists public.orders (
  id text primary key,
  order_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 创建客户表 (Create customers table)
create table if not exists public.customers (
  id text primary key,
  customer_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 启用 RLS (Enable Row Level Security)
alter table public.orders enable row level security;
alter table public.customers enable row level security;

-- 4. 开放读写权限 (Allow public access for Anon Key)
-- 注意：这是为了演示方便。生产环境建议配合 Auth 使用更严格的策略。
create policy "Enable all access for orders" on public.orders for all using (true) with check (true);
create policy "Enable all access for customers" on public.customers for all using (true) with check (true);
`;

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'All' | 'delayed'>('All');
  
  // UI State
  const [isPlatformsOpen, setIsPlatformsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Sidebar State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Settings & Cloud State
  const [settings, setSettings] = useState<AppSettings>({
    cloudConfig: { url: '', key: '' },
    tracking17Token: '',
    theme: 'light',
    warningRules: DEFAULT_WARNING_RULES
  });
  
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSqlHelp, setShowSqlHelp] = useState(false);
  
  const backupInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const config = parsed.cloudConfig || parsed; 
        const currentSettings: AppSettings = {
            cloudConfig: config.url ? config : { url: '', key: '' },
            tracking17Token: parsed.tracking17Token || '',
            theme: parsed.theme || 'light',
            warningRules: { ...DEFAULT_WARNING_RULES, ...parsed.warningRules }
        };
        setSettings(currentSettings);
        applyTheme(currentSettings.theme);

        if (config.url && config.url.startsWith('http') && config.key) {
           connectToCloud(config);
        } else {
           loadLocalData();
        }
      } catch (e) {
        loadLocalData();
      }
    } else {
      loadLocalData();
    }
  }, []);

  // Trash Auto-Cleanup Effect (Runs once on load/orders change)
  useEffect(() => {
      cleanupTrash();
  }, [orders.length]); // Check when order count changes

  const cleanupTrash = async () => {
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const expiredOrders = orders.filter(o => 
          o.deleted && o.deletedAt && new Date(o.deletedAt) < fourteenDaysAgo
      );

      if (expiredOrders.length > 0) {
          console.log(`Cleaning up ${expiredOrders.length} expired orders from trash.`);
          const activeOrders = orders.filter(o => !expiredOrders.includes(o));
          setOrders(activeOrders);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(activeOrders));
          
          if (isCloudMode) {
              await Promise.all(expiredOrders.map(o => deleteCloudOrder(o.id)));
          }
      }
  };

  const applyTheme = (theme: 'light' | 'dark') => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  const toggleTheme = () => {
      const newTheme = settings.theme === 'light' ? 'dark' : 'light';
      saveSettings({ ...settings, theme: newTheme });
      applyTheme(newTheme);
  };

  const showToast = (message: string, type: ToastType = 'info') => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const saveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const loadLocalData = () => {
    const savedOrders = localStorage.getItem(STORAGE_KEY);
    const savedCustomers = localStorage.getItem(CUSTOMERS_KEY);
    
    if (savedOrders) {
      try { setOrders(JSON.parse(savedOrders)); } catch (e) { console.error(e); }
    }
    if (savedCustomers) {
        try { setCustomers(JSON.parse(savedCustomers)); } catch (e) { console.error(e); }
    }
  };

  const connectToCloud = async (config: SupabaseConfig) => {
    setIsLoading(true);
    // Basic validation
    if (!config.url.includes('supabase.co')) {
        showToast("URL 格式看似不正确，应包含 .supabase.co", 'error');
    }

    const success = initSupabase(config);
    if (success) {
      try {
        const [cloudOrders, cloudCustomers] = await Promise.all([
            fetchCloudOrders(),
            fetchCloudCustomers()
        ]);
        setOrders(cloudOrders);
        setCustomers(cloudCustomers);
        setIsCloudMode(true);
        showToast('云端数据同步成功', 'success');
        setShowSettings(false);
      } catch (e: any) {
        console.error("Failed to connect to cloud", e);
        setIsCloudMode(false);
        // Better error message
        let msg = "连接失败";
        if (e.message?.includes('404') || e.code === '42P01') {
             msg = "连接失败：找不到数据表。请确保已在 SQL Editor 运行了建表语句。";
             setShowSqlHelp(true); // Auto show help
        } else if (e.message?.includes('fetch')) {
             msg = "网络请求失败，请检查 URL 和 Key 是否正确";
        } else {
             msg = `连接失败: ${e.message || '未知错误'}`;
        }
        showToast(msg, 'error');
        loadLocalData();
      }
    } else {
      setIsCloudMode(false);
      showToast("初始化失败，请检查配置格式", 'error');
    }
    setIsLoading(false);
  };

  const handleDisconnectCloud = () => {
    setIsCloudMode(false);
    const newSettings = { ...settings, cloudConfig: { url: '', key: '' } };
    saveSettings(newSettings);
    loadLocalData();
    setShowSettings(false);
    showToast('已断开云端连接', 'info');
  };

  // --- Order Management (Local First + Cloud Sync) ---
  const handleSaveOrder = async (order: Order, silent: boolean = false) => {
    let newOrders = [...orders];
    const index = newOrders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      newOrders[index] = order;
    } else {
      newOrders.unshift(order);
    }
    
    // 1. Save Local First (Immediate UI update)
    setOrders(newOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
    
    if (!silent) {
        setView('list');
        setEditingOrder(null);
    }
    setSyncStatus('syncing');

    // 2. Sync to Cloud
    if (isCloudMode) {
      try {
        await saveCloudOrder(order);
        setSyncStatus('idle');
        if (!silent) showToast('订单保存成功', 'success');
      } catch (e) {
        setSyncStatus('error');
        if (!silent) showToast("保存到云端失败 (已存本地)", 'error');
      }
    } else {
      setSyncStatus('idle');
      if (!silent) showToast('订单已保存 (本地)', 'success');
    }
  };

  // Soft Delete (Move to Trash)
  const handleDeleteOrder = async (id: string) => {
    if (window.confirm("确定要将此订单移入回收站吗？\n(订单将在14天后自动清除)")) {
        const orderToTrash = orders.find(o => o.id === id);
        if (!orderToTrash) return;

        const updatedOrder: Order = { 
            ...orderToTrash, 
            deleted: true, 
            deletedAt: new Date().toISOString() 
        };

        await handleSaveOrder(updatedOrder, true); // Re-use save logic to update deleted flag
        showToast('订单已移入回收站', 'info');
    }
  };

  // Restore from Trash
  const handleRestoreOrder = async (id: string) => {
      const orderToRestore = orders.find(o => o.id === id);
      if (!orderToRestore) return;

      const updatedOrder: Order = { 
          ...orderToRestore, 
          deleted: false, 
          deletedAt: undefined 
      };

      await handleSaveOrder(updatedOrder, true);
      showToast('订单已还原', 'success');
  };

  // Permanent Delete
  const handlePermanentDelete = async (id: string) => {
      if (window.confirm("确定要彻底删除吗？此操作无法撤销！")) {
          const newOrders = orders.filter(o => o.id !== id);
          
          // 1. Local Delete
          setOrders(newOrders);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));

          // 2. Cloud Delete
          if (isCloudMode) {
              try {
                  await deleteCloudOrder(id);
              } catch (e) {
                  console.error("Cloud delete failed", e);
                  showToast("云端删除失败", 'error');
              }
          }
          showToast('订单已永久删除', 'success');
      }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.status !== newStatus) {
        const updatedOrder = { ...order, status: newStatus, lastUpdated: new Date().toISOString() };
        handleSaveOrder(updatedOrder, true);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setView('edit');
  };

  // --- Customer Management ---
  const handleSaveCustomer = async (customer: Customer) => {
      let newCustomers = [...customers];
      const index = newCustomers.findIndex(c => c.id === customer.id);
      if (index >= 0) {
          newCustomers[index] = customer;
      } else {
          newCustomers.unshift(customer);
      }
      setCustomers(newCustomers);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(newCustomers));
      
      if (isCloudMode) {
          await saveCloudCustomer(customer);
      }
      showToast('客户信息已保存', 'success');
  };

  const handleDeleteCustomer = async (id: string) => {
      if (window.confirm("确定删除该客户资料吗？")) {
          const newCustomers = customers.filter(c => c.id !== id);
          setCustomers(newCustomers);
          localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(newCustomers));
          if (isCloudMode) {
              await deleteCloudCustomer(id);
          }
          showToast('客户已删除', 'success');
      }
  };

  // --- Logistics Sync ---
  const handleSyncLogistics = async () => {
      setSyncStatus('syncing');
      try {
          const { updatedOrders, count, message } = await syncOrderLogistics(orders, settings.tracking17Token);
          if (count > 0) {
              setOrders(updatedOrders);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
              if (isCloudMode) {
                  await Promise.all(updatedOrders.map(o => saveCloudOrder(o)));
              }
          }
          showToast(message, count > 0 ? 'success' : 'info');
      } catch (e) {
          showToast('同步失败', 'error');
      } finally {
          setSyncStatus('idle');
      }
  };

  // --- Import Handlers ---
  const handleImportOrders = async (data: any[]) => {
      let importedCount = 0;
      let updatedOrders = [...orders];

      for (const row of data) {
          // Map CSV columns (support Chinese or English keys)
          const itemName = row['商品名称'] || row['itemName'];
          if (!itemName) continue; // Skip if no name

          const statusRaw = row['状态'] || row['status'];
          // Simple Mapping of status text to enum if needed, or default to Pending
          let status = OrderStatus.PENDING;
          if (statusRaw === '已采购' || statusRaw === 'Purchased') status = OrderStatus.PURCHASED;
          if (statusRaw === '已发货' || statusRaw === 'Shipped') status = OrderStatus.SHIPPED;
          if (statusRaw === '已签收' || statusRaw === 'Delivered') status = OrderStatus.DELIVERED;
          if (statusRaw === '待发货' || statusRaw === 'Ready to Ship') status = OrderStatus.READY_TO_SHIP;

          const newOrder: Order = {
              id: row['订单ID'] || row['id'] || crypto.randomUUID(),
              itemName: itemName,
              quantity: parseInt(row['数量'] || row['quantity']) || 1,
              priceUSD: parseFloat(row['金额(USD)'] || row['priceUSD']) || 0,
              buyerAddress: row['收货地址'] || row['buyerAddress'] || '',
              platform: row['平台'] || row['platform'] || '',
              platformOrderId: row['平台订单号'] || row['platformOrderId'] || '',
              clientOrderId: row['客户单号'] || row['clientOrderId'] || '',
              trackingNumber: row['TIKTOK平台单号'] || row['出库物流单号'] || row['发货物流单号'] || row['trackingNumber'] || '',
              supplierTrackingNumber: row['入库物流单号'] || row['采购物流单号'] || row['supplierTrackingNumber'] || '',
              notes: row['备注'] || row['notes'] || '',
              status: status,
              purchaseDate: row['采购日期'] || row['purchaseDate'] || new Date().toISOString().split('T')[0],
              lastUpdated: new Date().toISOString(),
              detailedStatus: row['详细物流状态'] || row['detailedStatus'] || '',
              deleted: false
          };
          
          // Check for dupes by ID if provided, otherwise append
          const index = updatedOrders.findIndex(o => o.id === newOrder.id);
          if (index >= 0) {
              updatedOrders[index] = { ...updatedOrders[index], ...newOrder };
          } else {
              updatedOrders.unshift(newOrder);
          }
          importedCount++;
          
          if (isCloudMode) await saveCloudOrder(newOrder);
      }

      setOrders(updatedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
      showToast(`成功导入 ${importedCount} 个订单`, 'success');
  };

  const handleBatchLogisticsUpdate = async (updates: any[]) => {
      let count = 0;
      const updatedOrders = orders.map(o => {
          // Match by Order ID or Client Order ID
          const update = updates.find(u => 
              u.id === o.id || 
              (u.clientOrderId && u.clientOrderId === o.clientOrderId) ||
              (u.platformOrderId && u.platformOrderId === o.platformOrderId)
          );
          
          if (update) {
              count++;
              let newStatus = o.status;
              // Auto-advance status if tracking is provided
              if (update.trackingNumber && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.SHIPPED) {
                  newStatus = OrderStatus.SHIPPED;
              }
              // Auto-advance if supplier tracking provided (and not yet at warehouse)
              if (update.supplierTrackingNumber && o.status === OrderStatus.PENDING) {
                  newStatus = OrderStatus.PURCHASED;
              }

              return {
                  ...o,
                  trackingNumber: update.trackingNumber || o.trackingNumber,
                  supplierTrackingNumber: update.supplierTrackingNumber || o.supplierTrackingNumber,
                  status: newStatus,
                  lastUpdated: new Date().toISOString()
              };
          }
          return o;
      });
      
      if (count > 0) {
          setOrders(updatedOrders);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
          if (isCloudMode) {
               const changedOrders = updatedOrders.filter(o => 
                  updates.some(u => u.id === o.id || (u.clientOrderId && u.clientOrderId === o.clientOrderId) || (u.platformOrderId && u.platformOrderId === o.platformOrderId))
               );
               await Promise.all(changedOrders.map(o => saveCloudOrder(o)));
          }
          showToast(`批量更新了 ${count} 个订单的物流信息`, 'success');
      } else {
          showToast('未匹配到任何订单', 'info');
      }
  };

  const handleImportCustomers = async (data: any[]) => {
      let importedCount = 0;
      let updatedCustomers = [...customers];

      for (const row of data) {
          const name = row['客户名称'] || row['name'];
          if (!name) continue;

          const newCustomer: Customer = {
              id: row['ID'] || row['id'] || crypto.randomUUID(),
              name: name,
              phone: row['电话'] || row['phone'] || '',
              address: row['地址'] || row['address'] || '',
              notes: row['备注'] || row['notes'] || '',
              tags: []
          };

          const index = updatedCustomers.findIndex(c => c.id === newCustomer.id);
          if (index >= 0) {
              updatedCustomers[index] = { ...updatedCustomers[index], ...newCustomer };
          } else {
              updatedCustomers.unshift(newCustomer);
          }
          importedCount++;
          
          if (isCloudMode) await saveCloudCustomer(newCustomer);
      }

      setCustomers(updatedCustomers);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updatedCustomers));
      showToast(`成功导入 ${importedCount} 个客户`, 'success');
  };

  // --- Batch Ops ---
  const handleBatchStatusChange = async (ids: string[], newStatus: OrderStatus) => {
      const updatedOrders = orders.map(o => {
          if (ids.includes(o.id)) {
              return { ...o, status: newStatus, lastUpdated: new Date().toISOString() };
          }
          return o;
      });
      setOrders(updatedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));

      if (isCloudMode) {
          const toUpdate = updatedOrders.filter(o => ids.includes(o.id));
          await Promise.all(toUpdate.map(o => saveCloudOrder(o)));
      }
      showToast(`已更新 ${ids.length} 个订单状态`, 'success');
  };

  const handleBatchDelete = async (ids: string[]) => {
      if (view === 'trash') {
           // Batch Permanent Delete
           if (window.confirm(`确定要彻底删除选中的 ${ids.length} 个订单吗？不可恢复！`)) {
               const newOrders = orders.filter(o => !ids.includes(o.id));
               setOrders(newOrders);
               localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
               if (isCloudMode) await Promise.all(ids.map(id => deleteCloudOrder(id)));
               showToast('已永久删除选中订单', 'success');
           }
      } else {
           // Batch Soft Delete
           if (window.confirm(`确定将选中的 ${ids.length} 个订单移入回收站？`)) {
               const updatedOrders = orders.map(o => {
                   if (ids.includes(o.id)) return { ...o, deleted: true, deletedAt: new Date().toISOString() };
                   return o;
               });
               setOrders(updatedOrders);
               localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
               if (isCloudMode) await Promise.all(updatedOrders.filter(o => ids.includes(o.id)).map(o => saveCloudOrder(o)));
               showToast('已移入回收站', 'info');
           }
      }
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(`Project URL: ${settings.cloudConfig.url}\nAnon Key: ${settings.cloudConfig.key}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(INIT_SQL);
    showToast("SQL 语句已复制", 'success');
  };

  // --- System Backup & Restore ---
  const handleBackup = () => {
      try {
          const backupData = {
              version: '1.0',
              date: new Date().toISOString(),
              orders,
              customers,
              settings
          };
          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `SmartProcure_Backup_${new Date().toISOString().split('T')[0]}.json`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url); // Clean up
          showToast('系统备份已下载', 'success');
      } catch (e) {
          console.error(e);
          showToast('备份生成失败', 'error');
      }
  };

  const handleRestoreClick = () => {
      // NOTE: DO NOT use window.confirm here. 
      // Most browsers block file input clicks if they are not a direct result of a user action.
      // A synchronous confirm dialog breaks this chain. 
      // We will ask for confirmation AFTER the file is selected.
      if (backupInputRef.current) {
          backupInputRef.current.value = ''; // Reset to allow re-selecting same file
          backupInputRef.current.click();
      } else {
          showToast('无法打开文件选择器', 'error');
      }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              const data = JSON.parse(text);
              
              // Validate format briefly
              if (!data.orders && !data.customers && !data.settings) {
                  throw new Error("Invalid backup format");
              }

              const count = (data.orders?.length || 0) + (data.customers?.length || 0);
              
              if (window.confirm(`备份文件有效。\n包含 ${data.orders?.length || 0} 个订单，${data.customers?.length || 0} 个客户信息。\n\n确定要覆盖当前数据吗？`)) {
                  if (data.orders) {
                      setOrders(data.orders);
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.orders));
                  }
                  if (data.customers) {
                      setCustomers(data.customers);
                      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(data.customers));
                  }
                  if (data.settings) {
                      setSettings({ ...settings, ...data.settings });
                      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
                      applyTheme(data.settings.theme || 'light');
                  }

                  showToast('系统数据已成功恢复', 'success');
                  if (isCloudMode) {
                      alert('注意：您处于云同步模式。恢复的数据已保存到本地，但可能尚未完全推送到云端。建议刷新页面或触发一次手动同步。');
                  }
              }
          } catch (error) {
              console.error(error);
              showToast('备份文件格式错误或已损坏', 'error');
          } finally {
              // Always reset the input so the user can select the same file again if they made a mistake or want to retry
              if (backupInputRef.current) {
                  backupInputRef.current.value = '';
              }
          }
      };
      reader.readAsText(file);
  };

  const NavItem = ({ target, icon: Icon, label, count }: { target: ViewState, icon: any, label: string, count?: number }) => (
    <button
      onClick={() => {
        if (target === 'add') {
             setEditingOrder(null);
             setView('add');
        } else {
             setView(target);
             if (target === 'list') setActiveFilter('All');
        }
        setIsMobileMenuOpen(false); // Close sidebar on mobile select
      }}
      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
        view === target || (target === 'edit' && view === 'edit') || (target === 'add' && view === 'add')
          ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-lg'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
    >
      <div className="flex items-center gap-3 relative z-10">
        <Icon size={20} className={`${view === target ? 'text-indigo-400' : ''}`} />
        <span className="font-medium tracking-wide">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
          <span className="relative z-10 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
              {count}
          </span>
      )}
      {view === target && <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 opacity-100 z-0"></div>}
    </button>
  );

  const PurchaseLink = ({ href, label, sub }: { href: string, label: string, sub: string }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
    >
        <div className="flex items-center gap-3">
             {/* Dynamic Favicon */}
             <div className="w-5 h-5 bg-white rounded-full p-0.5 flex-shrink-0 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                 <img 
                    src={`https://www.google.com/s2/favicons?domain=${sub}&sz=32`} 
                    alt="icon" 
                    className="w-full h-full object-contain rounded-full"
                    loading="lazy"
                 />
             </div>
             <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-[10px] text-slate-400 font-mono group-hover:text-indigo-400">{sub}</span>
            </div>
        </div>
      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
    </a>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Hidden File Input for Restore - Placed specifically to ensure it is in the DOM */}
      <input 
        type="file" 
        ref={backupInputRef} 
        style={{ display: 'none' }} // Use style display none instead of class hidden to ensure react ref attaches correctly in all cases
        accept=".json" 
        onChange={handleRestoreFile} 
      />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile: Drawer, Desktop: Static */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        flex-shrink-0 z-40 shadow-xl md:shadow-none flex flex-col overflow-y-auto custom-scrollbar transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
             <Box className="text-white" size={26} strokeWidth={2.5} />
          </div>
          <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">探行科技</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest uppercase">智能采集管理平台</p>
          </div>
          {/* Close button for mobile */}
          <button 
            className="md:hidden ml-auto p-1 text-slate-400 hover:text-slate-600"
            onClick={() => setIsMobileMenuOpen(false)}
          >
              <ChevronDown className="rotate-90" size={20}/>
          </button>
        </div>
        
        <nav className="px-6 space-y-2 flex-1">
          <NavItem target="dashboard" icon={LayoutDashboard} label="概览中心" />
          <NavItem target="list" icon={ShoppingCart} label="订单管理" />
          <NavItem target="customers" icon={Users} label="客户管理" />
          <NavItem 
            target="trash" 
            icon={Trash2} 
            label="回收站" 
            count={orders.filter(o => o.deleted).length}
          />
          
          <div className="pt-6 pb-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">快捷操作</p>
            <button
                onClick={() => { setEditingOrder(null); setView('add'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group border border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                view === 'add' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 text-indigo-700 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
            >
                <PlusCircle size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">新建订单</span>
            </button>
          </div>

          <div className="pt-4 pb-2">
            <button 
                onClick={() => setIsPlatformsOpen(!isPlatformsOpen)}
                className="w-full px-4 mb-2 flex items-center justify-between group cursor-pointer focus:outline-none"
            >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">常用采购平台</span>
                <ChevronDown 
                    size={14} 
                    className={`text-slate-400 transition-transform duration-300 ${isPlatformsOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isPlatformsOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <PurchaseLink href="https://www.aliexpress.com" label="AliExpress 速卖通" sub="aliexpress.com" />
              <PurchaseLink href="https://www.temu.com" label="Temu 特姆" sub="temu.com" />
              <PurchaseLink href="https://www.shein.com" label="Shein 希音" sub="shein.com" />
              <PurchaseLink href="https://www.amazon.com" label="Amazon 亚马逊" sub="amazon.com" />
              <PurchaseLink href="https://www.ebay.com" label="eBay 易贝" sub="ebay.com" />
              <PurchaseLink href="https://www.walmart.com" label="Walmart 沃尔玛" sub="walmart.com" />
              <PurchaseLink href="https://www.costco.com" label="Costco 开市客" sub="costco.com" />
              <PurchaseLink href="https://www.target.com" label="Target 塔吉特" sub="target.com" />
              <PurchaseLink href="https://www.bestbuy.com" label="Best Buy 百思买" sub="bestbuy.com" />
              <PurchaseLink href="https://www.1688.com" label="1688 阿里巴巴" sub="1688.com" />
              <PurchaseLink href="https://www.taobao.com" label="Taobao 淘宝" sub="taobao.com" />
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
             <button 
                onClick={() => setShowSettings(true)}
                className={`w-full mb-4 px-4 py-3 rounded-xl border flex items-center gap-3 transition-all ${
                    isCloudMode 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
            >
                {isCloudMode ? <Cloud size={18} className="text-emerald-500" /> : <Database size={18} />}
                <div className="text-left flex-1">
                    <p className="text-xs font-bold">{isCloudMode ? '云端协作中' : '本地模式'}</p>
                    <p className="text-[10px] opacity-70">{isCloudMode ? '数据实时同步' : '仅本机可见'}</p>
                </div>
                <Settings size={14} className="opacity-50" />
            </button>

            <div className="flex items-center gap-3 px-2">
                 <div className="h-8 w-8 bg-gradient-to-tr from-slate-700 to-slate-800 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white dark:ring-slate-800">
                    A
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">代采专员</p>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isCloudMode ? 'bg-emerald-500' : 'bg-slate-400'} animate-pulse`}></div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{isCloudMode ? '在线' : '离线'}</p>
                    </div>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#f8fafc] dark:bg-slate-950 relative w-full">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-5 sticky top-0 z-20 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
                {/* Mobile Hamburger Menu */}
                <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                    <Menu size={24} />
                </button>

                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {view === 'add' ? '录入新订单' : 
                        view === 'edit' ? '编辑订单' : 
                        view === 'list' ? '订单管理' : 
                        view === 'customers' ? '客户管理' : 
                        view === 'trash' ? '回收站' : '数据看板'}
                    </h2>
                    {view === 'trash' && <p className="text-xs text-red-500 mt-1 hidden md:block">注意：回收站内的订单将在 14 天后自动永久清除</p>}
                </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    {settings.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
                <div className={`hidden md:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm border ${
                    isCloudMode 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                    {isCloudMode ? <Wifi size={14} className="text-emerald-600" /> : <WifiOff size={14} className="text-slate-400" />}
                    <span>{isCloudMode ? '云端已连接' : '本地存储'}</span>
                    {syncStatus === 'syncing' && <Loader2 size={12} className="animate-spin ml-1" />}
                </div>
            </div>
        </header>
        
        <div className="p-4 md:p-8 w-full mx-auto max-w-[96%]">
          {view === 'dashboard' && (
             // Only show active orders in dashboard
            <Dashboard 
                orders={orders.filter(o => !o.deleted)} 
                warningRules={settings.warningRules}
                onNavigate={(filter) => {
                    setActiveFilter(filter);
                    setView('list');
                }}
            />
          )}
          {view === 'list' && (
            <OrderList 
              orders={orders.filter(o => !o.deleted)} // Only show active orders
              initialFilter={activeFilter}
              warningRules={settings.warningRules}
              onEdit={handleEditOrder} 
              onDelete={handleDeleteOrder} // Soft delete
              onSync={handleSyncLogistics}
              isSyncing={syncStatus === 'syncing'}
              onStatusChange={handleStatusChange}
              onBatchDelete={handleBatchDelete}
              onBatchStatusChange={handleBatchStatusChange}
              onImport={handleImportOrders}
              onBatchLogisticsUpdate={handleBatchLogisticsUpdate}
            />
          )}
          {view === 'trash' && (
              <OrderList 
                orders={orders.filter(o => o.deleted)} // Only show deleted orders
                warningRules={settings.warningRules}
                onEdit={() => {}} // Disabled in trash
                onDelete={handlePermanentDelete} // Hard delete
                onRestore={handleRestoreOrder}
                isTrash={true}
                onSync={() => {}} 
                isSyncing={false}
                onBatchDelete={handleBatchDelete}
              />
          )}
          {view === 'customers' && (
              <CustomerList 
                customers={customers} 
                onSave={handleSaveCustomer}
                onDelete={handleDeleteCustomer}
                onImport={handleImportCustomers}
              />
          )}
          {(view === 'add' || view === 'edit') && (
            <OrderForm 
              initialOrder={editingOrder} 
              customers={customers}
              onSave={handleSaveOrder} 
              onCancel={() => setView('list')} 
            />
          )}
        </div>

        {/* Settings Modal */}
        {showSettings && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in max-h-[90vh] overflow-y-auto relative">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Settings className="text-slate-600" size={20} />
                            系统设置
                        </h3>
                        <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><Settings size={16} /></button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        
                        {/* Backup & Restore Section */}
                         <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Database size={16} className="text-emerald-500"/> 数据备份与恢复
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    生成全量数据备份文件 (JSON)，包含所有订单、客户及设置。
                                </p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleBackup}
                                        className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors hover:border-slate-400"
                                    >
                                        <Save size={14} /> 备份数据
                                    </button>
                                    <button 
                                        onClick={handleRestoreClick}
                                        className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors hover:border-slate-400"
                                    >
                                        <Upload size={14} /> 恢复数据
                                    </button>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Warning Rules Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-500"/> 预警规则设置
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">采购超时 (小时)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={settings.warningRules?.purchaseTimeoutHours || 48}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 48;
                                            saveSettings({
                                                ...settings, 
                                                warningRules: { ...settings.warningRules, purchaseTimeoutHours: val }
                                            });
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">"已采购" 但未发货</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">物流超时 (天)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={settings.warningRules?.shippingTimeoutDays || 7}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 7;
                                            saveSettings({
                                                ...settings, 
                                                warningRules: { ...settings.warningRules, shippingTimeoutDays: val }
                                            });
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">"已发货" 但未签收</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">即将超时预警 (小时)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={settings.warningRules?.impendingBufferHours || 24}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 24;
                                            saveSettings({
                                                ...settings, 
                                                warningRules: { ...settings.warningRules, impendingBufferHours: val }
                                            });
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">触发 "即将超时" 的提前量</p>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Logistics Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Truck size={16} className="text-amber-600"/> 物流追踪 (17TRACK)
                            </h4>
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">填入 API Key 可自动更新物流状态。留空则使用本地智能推断。</p>
                                <input 
                                    type="password" 
                                    value={settings.tracking17Token}
                                    onChange={(e) => saveSettings({...settings, tracking17Token: e.target.value})}
                                    placeholder="17TRACK API Access Token (可选)"
                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono bg-white dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                        </div>

                         <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Cloud Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Cloud size={16} className="text-indigo-600"/> 云端协作 (Supabase)
                            </h4>
                            {!isCloudMode ? (
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        value={settings.cloudConfig.url}
                                        onChange={(e) => {
                                            const newConfig = {...settings.cloudConfig, url: e.target.value};
                                            saveSettings({...settings, cloudConfig: newConfig});
                                        }}
                                        placeholder="Project URL (https://xyz.supabase.co)"
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    <input 
                                        type="password" 
                                        value={settings.cloudConfig.key}
                                        onChange={(e) => {
                                            const newConfig = {...settings.cloudConfig, key: e.target.value};
                                            saveSettings({...settings, cloudConfig: newConfig});
                                        }}
                                        placeholder="Anon Key (eyJh...)"
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md text-[10px] text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-900 space-y-2">
                                        <p className="flex items-center gap-1 font-bold">
                                            <HelpCircle size={12} /> 
                                            新手必读：
                                        </p>
                                        <p>首次使用 Supabase 必须先在后台运行建表语句 (SQL)，否则无法连接。</p>
                                        <button 
                                            onClick={() => setShowSqlHelp(!showSqlHelp)}
                                            className="text-indigo-600 dark:text-indigo-400 underline font-bold flex items-center gap-1 mt-1 hover:text-indigo-800"
                                        >
                                            <Code size={12} /> {showSqlHelp ? '隐藏 SQL' : '查看/复制 建表 SQL'}
                                        </button>
                                        
                                        {showSqlHelp && (
                                            <div className="mt-2 bg-slate-900 rounded-lg p-2 border border-slate-700 relative group">
                                                <button 
                                                    onClick={handleCopySQL}
                                                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1 rounded transition-colors"
                                                    title="复制 SQL"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                                <code className="block text-[10px] text-green-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-40 custom-scrollbar">
                                                    {INIT_SQL}
                                                </code>
                                            </div>
                                        )}
                                        
                                        <p className="font-bold text-red-600 dark:text-red-400 mt-2">
                                            注意：连接后界面将显示云端数据。请先点击上方的“备份数据”按钮导出本地数据。
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => connectToCloud(settings.cloudConfig)}
                                        disabled={isLoading || !settings.cloudConfig.url || !settings.cloudConfig.key}
                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" /> : '连接云端并同步'}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900 text-center space-y-3">
                                    <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">已连接云端数据库</p>
                                    <button 
                                        onClick={handleCopyConfig}
                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded text-xs font-medium flex items-center justify-center gap-2 hover:bg-emerald-50"
                                    >
                                        {copySuccess ? <Check size={14}/> : <Copy size={14} />}
                                        {copySuccess ? '已复制' : '复制配置'}
                                    </button>
                                    
                                    <div className="border-t border-emerald-200 dark:border-emerald-800/50 pt-2 mt-2">
                                         <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                                            断开连接后将切换回本地模式。后续操作产生的订单数据将<strong>仅保存在本机浏览器</strong>，不再同步至云端。
                                        </p>
                                        <button 
                                            onClick={handleDisconnectCloud}
                                            className="text-xs text-red-500 hover:underline font-bold"
                                        >
                                            断开连接
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;

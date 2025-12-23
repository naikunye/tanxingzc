import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Order, Customer, SupabaseConfig, AppSettings, OrderStatus, WarningRules } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { OrderList } from './components/OrderList.tsx';
import { OrderForm } from './components/OrderForm.tsx';
import { CustomerList } from './components/CustomerList.tsx';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast.tsx';
import { LayoutDashboard, ShoppingCart, PlusCircle, Settings, Box, Cloud, Loader2, Database, Wifi, WifiOff, Copy, Check, ExternalLink, Truck, ChevronDown, Users, Moon, Sun, Trash2, Recycle, AlertTriangle, Hourglass, Menu, Save, Upload, Code, HelpCircle, X, Plus } from 'lucide-react';
import { initSupabase, fetchCloudOrders, saveCloudOrder, deleteCloudOrder, fetchCloudCustomers, saveCloudCustomer, deleteCloudCustomer } from './services/supabaseService.ts';
import { syncOrderLogistics } from './services/logisticsService.ts';

const STORAGE_KEY = 'smart_procure_data';
const CUSTOMERS_KEY = 'smart_procure_customers';
const SETTINGS_KEY = 'smart_procure_settings';

const DEFAULT_WARNING_RULES: WarningRules = {
    purchaseTimeoutHours: 48,
    shippingTimeoutDays: 7,
    impendingBufferHours: 24
};

const INIT_SQL = `-- 1. 创建订单表\ncreate table if not exists public.orders (\n  id text primary key,\n  order_data jsonb not null,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 2. 创建客户表\ncreate table if not exists public.customers (\n  id text primary key,\n  customer_data jsonb not null,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);`;

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'All' | 'delayed'>('All');
  
  const [isPlatformsOpen, setIsPlatformsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
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
        if (config.url && config.url.startsWith('http') && config.key) { connectToCloud(config); } 
        else { loadLocalData(); }
      } catch (e) { loadLocalData(); }
    } else { loadLocalData(); }
  }, []);

  const applyTheme = (theme: 'light' | 'dark') => {
      if (theme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
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

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const saveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const loadLocalData = () => {
    const savedOrders = localStorage.getItem(STORAGE_KEY);
    const savedCustomers = localStorage.getItem(CUSTOMERS_KEY);
    if (savedOrders) { try { setOrders(JSON.parse(savedOrders)); } catch (e) {} }
    if (savedCustomers) { try { setCustomers(JSON.parse(savedCustomers)); } catch (e) {} }
  };

  const connectToCloud = async (config: SupabaseConfig) => {
    setIsLoading(true);
    const success = initSupabase(config);
    if (success) {
      try {
        const [cloudOrders, cloudCustomers] = await Promise.all([fetchCloudOrders(), fetchCloudCustomers()]);
        setOrders(cloudOrders);
        setCustomers(cloudCustomers);
        setIsCloudMode(true);
        showToast('云端数据同步成功', 'success');
        setShowSettings(false);
      } catch (e: any) {
        setIsCloudMode(false);
        showToast("连接失败: " + (e.message || '未知错误'), 'error');
        loadLocalData();
      }
    }
    setIsLoading(false);
  };

  const handleSaveOrder = async (order: Order, silent: boolean = false) => {
    let newOrders = [...orders];
    const index = newOrders.findIndex(o => o.id === order.id);
    if (index >= 0) newOrders[index] = order; else newOrders.unshift(order);
    setOrders(newOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
    if (!silent) { setView('list'); setEditingOrder(null); }
    if (isCloudMode) { try { await saveCloudOrder(order); if (!silent) showToast('已保存到云端', 'success'); } catch (e) { if (!silent) showToast("同步失败", 'error'); } }
  };

  const handleDeleteOrder = async (id: string) => {
    if (window.confirm("确定要将此订单移入回收站吗？")) {
        const orderToTrash = orders.find(o => o.id === id);
        if (!orderToTrash) return;
        const updatedOrder: Order = { ...orderToTrash, deleted: true, deletedAt: new Date().toISOString() };
        await handleSaveOrder(updatedOrder, true);
        showToast('订单已移入回收站', 'info');
    }
  };

  const handleRestoreOrder = async (id: string) => {
      const orderToRestore = orders.find(o => o.id === id);
      if (!orderToRestore) return;
      const updatedOrder: Order = { ...orderToRestore, deleted: false, deletedAt: undefined };
      await handleSaveOrder(updatedOrder, true);
      showToast('订单已还原', 'success');
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setView('edit');
  };

  const handleSaveCustomer = async (customer: Customer) => {
    let newCustomers = [...customers];
    const index = newCustomers.findIndex(c => c.id === customer.id);
    if (index >= 0) newCustomers[index] = customer; else newCustomers.unshift(customer);
    setCustomers(newCustomers);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(newCustomers));
    showToast('客户信息已保存', 'success');
    if (isCloudMode) {
      try {
        await saveCloudCustomer(customer);
      } catch (e) {
        showToast("同步客户失败", 'error');
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm("确定要删除此客户吗？")) {
        const newCustomers = customers.filter(c => c.id !== id);
        setCustomers(newCustomers);
        localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(newCustomers));
        showToast('客户已删除', 'info');
        if (isCloudMode) {
          try {
            await deleteCloudCustomer(id);
          } catch (e) {
            showToast("同步删除失败", 'error');
          }
        }
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.status !== newStatus) {
        const updatedOrder = { ...order, status: newStatus, lastUpdated: new Date().toISOString() };
        handleSaveOrder(updatedOrder, true);
    }
  };

  const handleSyncLogistics = async () => {
      setSyncStatus('syncing');
      try {
          const { updatedOrders, count, message } = await syncOrderLogistics(orders, settings.tracking17Token);
          if (count > 0) {
              setOrders(updatedOrders);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
              if (isCloudMode) await Promise.all(updatedOrders.map(o => saveCloudOrder(o)));
          }
          showToast(message, count > 0 ? 'success' : 'info');
      } catch (e) { showToast('同步失败', 'error'); } finally { setSyncStatus('idle'); }
  };

  const NavItem = ({ target, icon: Icon, label, count }: { target: ViewState, icon: any, label: string, count?: number }) => (
    <button
      onClick={() => {
        if (target === 'add') { setEditingOrder(null); setView('add'); } 
        else { setView(target); if (target === 'list') setActiveFilter('All'); }
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        view === target || (target === 'edit' && view === 'edit') || (target === 'add' && view === 'add')
          ? 'bg-slate-900 text-white shadow-lg'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={`${view === target ? 'text-indigo-400' : ''}`} />
        <span className="font-bold text-sm">{label}</span>
      </div>
      {count !== undefined && count > 0 && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{count}</span>}
    </button>
  );

  const PurchaseLink = ({ href, label, sub }: { href: string, label: string, sub: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all group">
        <div className="flex items-center gap-3">
             <div className="w-5 h-5 bg-white rounded-full p-0.5 border border-slate-100 shadow-sm flex items-center justify-center">
                 <img src={`https://www.google.com/s2/favicons?domain=${sub}&sz=32`} alt="icon" className="w-full h-full object-contain" />
             </div>
             <div className="flex flex-col items-start">
                <span className="text-[12px] font-bold">{label}</span>
                <span className="text-[9px] text-slate-400 font-mono group-hover:text-indigo-400">{sub}</span>
            </div>
        </div>
      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
    </a>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-800 dark:text-slate-100">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <input type="file" ref={backupInputRef} style={{ display: 'none' }} accept=".json" onChange={(e) => {}} />

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed md:sticky top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-transform duration-300 md:translate-x-0 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center gap-3 shrink-0">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
             <Box className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">探行科技</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest uppercase">智能采集管理平台</p>
          </div>
        </div>
        
        <nav className="px-6 space-y-1.5 flex-1 overflow-y-auto">
          <NavItem target="dashboard" icon={LayoutDashboard} label="概览中心" />
          <NavItem target="list" icon={ShoppingCart} label="订单管理" />
          <NavItem target="customers" icon={Users} label="客户管理" />
          <NavItem target="trash" icon={Trash2} label="回收站" count={orders.filter(o => o.deleted).length} />
          
          <div className="pt-8 pb-4">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">快捷操作</p>
            {/* New Order Button Area - Fully Matching Design */}
            <div className="mx-2 px-1 py-1 rounded-2xl border-2 border-dashed border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20">
                <button
                    onClick={() => { setEditingOrder(null); setView('add'); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#6366f1] hover:bg-[#585af2] text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all font-bold text-sm"
                >
                    <Plus size={18} strokeWidth={3} />
                    <span>新建订单</span>
                </button>
            </div>
          </div>

          <div className="pt-4">
            <button onClick={() => setIsPlatformsOpen(!isPlatformsOpen)} className="w-full px-4 mb-2 flex items-center justify-between group">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">常用采购平台</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isPlatformsOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`space-y-0.5 transition-all overflow-hidden ${isPlatformsOpen ? 'max-h-[600px]' : 'max-h-0'}`}>
              <PurchaseLink href="https://www.aliexpress.com" label="AliExpress 速卖通" sub="aliexpress.com" />
              <PurchaseLink href="https://www.temu.com" label="Temu 特姆" sub="temu.com" />
              <PurchaseLink href="https://www.shein.com" label="Shein 希音" sub="shein.com" />
              <PurchaseLink href="https://www.amazon.com" label="Amazon 亚马逊" sub="amazon.com" />
              <PurchaseLink href="https://www.ebay.com" label="eBay 易贝" sub="ebay.com" />
              <PurchaseLink href="https://www.walmart.com" label="Walmart 沃尔玛" sub="walmart.com" />
              <PurchaseLink href="https://www.costco.com" label="Costco 开市客" sub="costco.com" />
              <PurchaseLink href="https://www.target.com" label="Target 塔吉特" sub="target.com" />
              <PurchaseLink href="https://www.bestbuy.com" label="Best Buy 百思买" sub="bestbuy.com" />
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
             <button onClick={() => setShowSettings(true)} className={`w-full mb-4 px-4 py-3 rounded-xl border flex items-center gap-3 ${isCloudMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {isCloudMode ? <Cloud size={18} /> : <Database size={18} />}
                <div className="text-left flex-1"><p className="text-xs font-bold">{isCloudMode ? '云端已同步' : '本地模式'}</p></div>
                <Settings size={14} className="opacity-50" />
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[#f8fafc] dark:bg-slate-950">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 sticky top-0 z-20 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-600"><Menu size={24} /></button>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {view === 'add' || view === 'edit' ? '录入新订单' : view === 'list' ? '订单管理' : view === 'customers' ? '客户管理' : view === 'trash' ? '回收站' : '数据概览'}
                </h2>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">{settings.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
            </div>
        </header>
        <div className="p-4 md:p-8">
          {view === 'dashboard' && <Dashboard orders={orders.filter(o => !o.deleted)} warningRules={settings.warningRules} onNavigate={(f) => { setActiveFilter(f); setView('list'); }} />}
          {view === 'list' && <OrderList orders={orders.filter(o => !o.deleted)} initialFilter={activeFilter} warningRules={settings.warningRules} onEdit={handleEditOrder} onDelete={handleDeleteOrder} onSync={handleSyncLogistics} isSyncing={syncStatus === 'syncing'} onStatusChange={handleStatusChange} />}
          {view === 'trash' && <OrderList orders={orders.filter(o => o.deleted)} warningRules={settings.warningRules} onEdit={() => {}} onDelete={() => {}} onRestore={handleRestoreOrder} isTrash={true} onSync={() => {}} isSyncing={false} />}
          {view === 'customers' && <CustomerList customers={customers} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} />}
          {(view === 'add' || view === 'edit') && <OrderForm initialOrder={editingOrder} customers={customers} onSave={handleSaveOrder} onCancel={() => setView('list')} />}
        </div>
      </main>
    </div>
  );
};

export default App;
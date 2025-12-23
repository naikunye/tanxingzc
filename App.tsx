
import React, { useState, useEffect } from 'react';
import { ViewState, Order, Customer, SupabaseConfig, AppSettings, OrderStatus, WarningRules, ThemeType } from './types';
import { Dashboard } from './components/Dashboard';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { CustomerList } from './components/CustomerList';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { LayoutDashboard, ShoppingCart, Settings, Box, Cloud, Database, ExternalLink, ChevronDown, Users, Moon, Trash2, Menu, Plus, Sparkles, Droplets } from 'lucide-react';
import { initSupabase, fetchCloudOrders, saveCloudOrder, fetchCloudCustomers, saveCloudCustomer, deleteCloudCustomer } from './services/supabaseService';
import { syncOrderLogistics } from './services/logisticsService';

const STORAGE_KEY = 'smart_procure_data';
const CUSTOMERS_KEY = 'smart_procure_customers';
const SETTINGS_KEY = 'smart_procure_settings';

const DEFAULT_WARNING_RULES: WarningRules = {
    purchaseTimeoutHours: 48,
    shippingTimeoutDays: 7,
    impendingBufferHours: 24
};

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
    theme: 'dark', 
    warningRules: DEFAULT_WARNING_RULES
  });
  
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const config = parsed.cloudConfig || parsed; 
        const currentSettings: AppSettings = {
            cloudConfig: config.url ? config : { url: '', key: '' },
            tracking17Token: parsed.tracking17Token || '',
            theme: parsed.theme || 'dark', 
            warningRules: { ...DEFAULT_WARNING_RULES, ...parsed.warningRules }
        };
        setSettings(currentSettings);
        applyTheme(currentSettings.theme);
        if (config.url && config.url.startsWith('http') && config.key) { connectToCloud(config); } 
        else { loadLocalData(); }
      } catch (e) { loadLocalData(); }
    } else { 
        loadLocalData();
        applyTheme('dark');
    }
  }, []);

  const applyTheme = (theme: ThemeType) => {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'crystal') {
          document.documentElement.classList.remove('dark');
      } else {
          document.documentElement.classList.add('dark');
      }
      setSettings(prev => ({ ...prev, theme }));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, theme }));
  };

  const showToast = (message: string, type: ToastType = 'info') => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const loadLocalData = () => {
    const savedOrders = localStorage.getItem(STORAGE_KEY);
    const savedCustomers = localStorage.getItem(CUSTOMERS_KEY);
    if (savedOrders) { try { setOrders(JSON.parse(savedOrders)); } catch (e) {} }
    if (savedCustomers) { try { setCustomers(JSON.parse(savedCustomers)); } catch (e) {} }
  };

  const connectToCloud = async (config: SupabaseConfig) => {
    const success = initSupabase(config);
    if (success) {
      try {
        const [cloudOrders, cloudCustomers] = await Promise.all([fetchCloudOrders(), fetchCloudCustomers()]);
        setOrders(cloudOrders);
        setCustomers(cloudCustomers);
        setIsCloudMode(true);
        showToast('云端数据同步成功', 'success');
      } catch (e: any) {
        setIsCloudMode(false);
        showToast("同步失败", 'error');
        loadLocalData();
      }
    }
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
        showToast('已移入回收站', 'info');
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
    if (isCloudMode) { try { await saveCloudCustomer(customer); } catch (e) { showToast("同步客户失败", 'error'); } }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm("确定要删除此客户吗？")) {
        const newCustomers = customers.filter(c => c.id !== id);
        setCustomers(newCustomers);
        localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(newCustomers));
        showToast('客户已删除', 'info');
        if (isCloudMode) { try { await deleteCloudCustomer(id); } catch (e) { showToast("同步删除失败", 'error'); } }
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
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="font-bold text-sm">{label}</span>
      </div>
      {count !== undefined && count > 0 && <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full font-bold">{count}</span>}
    </button>
  );

  const PurchaseLink = ({ href, label, sub }: { href: string, label: string, sub: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-indigo-400 transition-all group">
        <div className="flex items-center gap-3">
             <div className="w-5 h-5 bg-white rounded-full p-0.5 shadow-sm flex items-center justify-center">
                 <img src={`https://www.google.com/s2/favicons?domain=${sub}&sz=32`} alt="icon" className="w-full h-full object-contain" />
             </div>
             <span className="text-[12px] font-bold">{label}</span>
        </div>
      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed md:sticky top-0 left-0 h-full w-72 glass-sidebar border-r border-white/5 z-40 transition-transform duration-300 md:translate-x-0 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center gap-3 shrink-0">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg">
             <Box className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div>
              <h1 className="text-xl font-bold tracking-tight">探行科技</h1>
              <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest mt-0.5">智能采集管理</p>
          </div>
        </div>
        
        <nav className="px-6 space-y-1.5 flex-1 overflow-y-auto">
          <NavItem target="dashboard" icon={LayoutDashboard} label="概览中心" />
          <NavItem target="list" icon={ShoppingCart} label="订单管理" />
          <NavItem target="customers" icon={Users} label="客户管理" />
          <NavItem target="trash" icon={Trash2} label="回收站" count={orders.filter(o => o.deleted).length} />
          
          <div className="pt-8 pb-4">
            <button
                onClick={() => { setEditingOrder(null); setView('add'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all font-bold text-sm"
            >
                <Plus size={18} strokeWidth={3} />
                <span>录入新订单</span>
            </button>
          </div>

          <div className="pt-4">
            <button onClick={() => setIsPlatformsOpen(!isPlatformsOpen)} className="w-full px-4 mb-2 flex items-center justify-between group">
                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">常用采购平台</span>
                <ChevronDown size={14} className={`opacity-30 transition-transform ${isPlatformsOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`space-y-0.5 transition-all overflow-hidden ${isPlatformsOpen ? 'max-h-[600px]' : 'max-h-0'}`}>
              <PurchaseLink href="https://www.aliexpress.com" label="AliExpress" sub="aliexpress.com" />
              <PurchaseLink href="https://www.temu.com" label="Temu" sub="temu.com" />
              <PurchaseLink href="https://www.amazon.com" label="Amazon" sub="amazon.com" />
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-white/5">
             <div className="px-4 py-3 rounded-xl border border-white/10 glass-card flex items-center gap-3">
                {isCloudMode ? <Cloud size={18} className="text-emerald-400" /> : <Database size={18} className="text-slate-400" />}
                <div className="text-left flex-1 font-bold text-xs">{isCloudMode ? '云端已同步' : '本地模式'}</div>
                <Settings size={14} className="opacity-30" />
            </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="glass-card border-b border-white/5 px-8 py-5 sticky top-0 z-20 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400"><Menu size={24} /></button>
                <h2 className="text-lg font-bold tracking-tight uppercase tracking-wider">
                    {view === 'add' || view === 'edit' ? (editingOrder ? '编辑订单' : '录入新订单') : view === 'list' ? '订单管理' : view === 'customers' ? '客户管理' : view === 'trash' ? '回收站' : '系统看板'}
                </h2>
            </div>
            <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-white/10">
                <button onClick={() => applyTheme('dark')} className={`p-2 rounded-lg transition-all ${settings.theme === 'dark' ? 'bg-indigo-600 text-white' : 'opacity-40 hover:opacity-100'}`} title="经典暗黑"><Moon size={16} /></button>
                <button onClick={() => applyTheme('aurora')} className={`p-2 rounded-lg transition-all ${settings.theme === 'aurora' ? 'bg-indigo-600 text-white' : 'opacity-40 hover:opacity-100'}`} title="极光磨砂"><Sparkles size={16} /></button>
                <button onClick={() => applyTheme('crystal')} className={`p-2 rounded-lg transition-all ${settings.theme === 'crystal' ? 'bg-white text-indigo-600' : 'opacity-40 hover:opacity-100'}`} title="冰晶磨砂"><Droplets size={16} /></button>
            </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
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

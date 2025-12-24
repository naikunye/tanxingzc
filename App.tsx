
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Order, Customer, SupabaseConfig, AppSettings, OrderStatus, WarningRules, ThemeType } from './types';
import { Dashboard } from './components/Dashboard';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { CustomerList } from './components/CustomerList';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { LayoutDashboard, ShoppingCart, Settings, Box, Cloud, Database, ExternalLink, ChevronDown, Users, Moon, Trash2, Menu, Plus, Sparkles, Droplets, Globe, Compass, ShieldCheck, Download, Upload, FileJson, DatabaseBackup, Sun } from 'lucide-react';
import { initSupabase, fetchCloudOrders, saveCloudOrder, fetchCloudCustomers, saveCloudCustomer, deleteCloudCustomer } from './services/supabaseService';
import { syncOrderLogistics } from './services/logisticsService';
import { exportToJSON, parseJSONFile } from './services/dataService';

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
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'All'>('All');
  
  const [isPlatformsOpen, setIsPlatformsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [settings, setSettings] = useState<AppSettings>({
    cloudConfig: { url: '', key: '' },
    tracking17Token: '',
    theme: 'dark', 
    warningRules: DEFAULT_WARNING_RULES,
    defaultExchangeRate: 7.25
  });
  
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Robust theme applying function
  const applyTheme = (theme: ThemeType) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'crystal') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    setSettings(prev => {
      const updated = { ...prev, theme };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

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
            warningRules: { ...DEFAULT_WARNING_RULES, ...parsed.warningRules },
            defaultExchangeRate: parsed.defaultExchangeRate || 7.25
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

  const handleImportOrders = async (data: any[], format: 'csv' | 'json' = 'csv') => {
      let importedOrders: Order[] = [];
      
      if (format === 'json') {
          importedOrders = data.map(o => ({ ...o, id: o.id || crypto.randomUUID() }));
      } else {
          importedOrders = data.map(item => ({
              id: item.id || crypto.randomUUID(),
              itemName: item['商品名称'] || item.itemName || '未知商品',
              quantity: parseInt(item['数量'] || item.quantity) || 1,
              priceUSD: parseFloat(item['美金单价'] || item.priceUSD) || 0,
              buyerAddress: item['收货地址'] || item.buyerAddress || '',
              purchaseDate: item['采购日期'] || item.purchaseDate || new Date().toISOString().split('T')[0],
              platform: item['平台'] || item.platform || '',
              platformOrderId: item['平台单号'] || item.platformOrderId || '',
              clientOrderId: item['内部单号'] || item.clientOrderId || '',
              status: (item['状态'] || item.status) as OrderStatus || OrderStatus.PENDING,
              trackingNumber: item['物流单号'] || item.trackingNumber || '',
              supplierTrackingNumber: item['供应商单号'] || item.supplierTrackingNumber || '',
              notes: item['备注'] || item.notes || '',
              lastUpdated: new Date().toISOString()
          }));
      }

      const newOrders = [...importedOrders, ...orders];
      const uniqueOrders = Array.from(new Map(newOrders.map(o => [o.id, o])).values());
      
      setOrders(uniqueOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueOrders));
      showToast(`成功导入 ${importedOrders.length} 条项目`, 'success');
      
      if (isCloudMode) {
          try {
              await Promise.all(importedOrders.map(o => saveCloudOrder(o)));
          } catch (e) {
              showToast('部分数据云端同步失败', 'error');
          }
      }
  };

  const handleImportCustomers = async (data: any[], format: 'csv' | 'json' = 'csv') => {
      let importedCustomers: Customer[] = [];
      
      if (format === 'json') {
          importedCustomers = data.map(c => ({ ...c, id: c.id || crypto.randomUUID() }));
      } else {
          importedCustomers = data.map(item => ({
              id: item.id || crypto.randomUUID(),
              name: item['合伙人姓名'] || item.name || '',
              phone: item['联系电话'] || item.phone || '',
              address: item['收货地址'] || item.address || '',
              notes: item['备注'] || item.notes || ''
          })).filter(c => c.name && c.address);
      }

      const newCustomers = [...importedCustomers, ...customers];
      const uniqueCustomers = Array.from(new Map(newCustomers.map(c => [c.id, c])).values());
      
      setCustomers(uniqueCustomers);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(uniqueCustomers));
      showToast(`成功导入 ${importedCustomers.length} 位合伙人`, 'success');

      if (isCloudMode) {
          try {
              await Promise.all(importedCustomers.map(c => saveCloudCustomer(c)));
          } catch (e) {
              showToast('合伙人云端同步失败', 'error');
          }
      }
  };

  const handleFullBackup = () => {
    const backupData = {
        orders,
        customers,
        settings,
        exportDate: new Date().toISOString(),
        version: "1.2.0"
    };
    exportToJSON(backupData, `探行科技_全量备份_${new Date().toISOString().split('T')[0]}.json`);
    showToast('全量数据已导出为 JSON', 'success');
  };

  const handleRestoreClick = () => {
    backupInputRef.current?.click();
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const data = await parseJSONFile(file);
        if (data.orders || data.customers) {
            if (window.confirm("这将覆盖您当前的本地数据，确定要从备份中恢复吗？")) {
                if (data.orders) {
                    setOrders(data.orders);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.orders));
                }
                if (data.customers) {
                    setCustomers(data.customers);
                    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(data.customers));
                }
                if (data.settings) {
                    setSettings(data.settings);
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
                    if (data.settings.theme) applyTheme(data.settings.theme);
                }
                showToast('全量数据恢复成功', 'success');
            }
        } else {
            showToast('无效的备份文件格式', 'error');
        }
    } catch (err) {
        showToast('解析 JSON 失败', 'error');
    }
    e.target.value = '';
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

  const handleDuplicateOrder = (order: Order) => {
    const duplicated: Order = {
        ...order,
        id: crypto.randomUUID(),
        status: OrderStatus.PENDING,
        purchaseDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        trackingNumber: '',
        supplierTrackingNumber: '',
        platformOrderId: '',
        deleted: false,
        deletedAt: undefined
    };
    setEditingOrder(duplicated);
    setView('add');
    showToast('已载入订单模板', 'success');
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
      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
        view === target || (target === 'edit' && view === 'edit') || (target === 'add' && view === 'add')
          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <Icon size={18} className={`${view === target ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`} />
        <span className="font-semibold text-[13px] tracking-tight">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full font-bold tabular-nums">
          {count}
        </span>
      )}
    </button>
  );

  const PurchaseLink = ({ href, label, sub }: { href: string, label: string, sub: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-indigo-400 transition-all group shrink-0">
        <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                 <img src={`https://www.google.com/s2/favicons?domain=${sub}&sz=32`} alt="icon" className="w-full h-full object-contain" />
             </div>
             <span className="text-[11px] font-medium tracking-tight truncate max-w-[120px]">{label}</span>
        </div>
      <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </a>
  );

  return (
    <div className="min-h-screen flex font-sans selection:bg-indigo-500/30">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <input type="file" ref={backupInputRef} onChange={handleFileRestore} accept=".json" className="hidden" />

      <aside className={`fixed md:sticky top-4 left-4 h-[calc(100vh-2rem)] w-72 premium-glass rounded-[2.5rem] premium-shadow z-50 transition-all duration-500 md:translate-x-0 flex flex-col m-0 overflow-hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'}`}>
        <div className="p-10 flex items-center gap-4 shrink-0">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-2xl shadow-indigo-600/40 rotate-3">
             <Box className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
              <h1 className="text-xl font-display font-bold tracking-tight text-white leading-none">TANXING</h1>
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Procure Intelligence</p>
          </div>
        </div>
        
        <nav className="px-6 space-y-2 flex-1 overflow-y-auto scrollbar-hide py-2">
          <div className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Main Menu</div>
          <NavItem target="dashboard" icon={LayoutDashboard} label="指挥中心" />
          <NavItem target="list" icon={ShoppingCart} label="订单队列" />
          <NavItem target="customers" icon={Users} label="合伙人管理" />
          <NavItem target="trash" icon={Trash2} label="归档/回收" count={orders.filter(o => o.deleted).length} />
          
          <div className="px-6 pt-10 pb-4">
            <button
                onClick={() => { setEditingOrder(null); setView('add'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-4 bg-white text-indigo-950 hover:bg-indigo-50 rounded-2xl shadow-2xl transition-all duration-300 font-bold text-sm hover:-translate-y-1 active:translate-y-0"
            >
                <Plus size={18} strokeWidth={3} />
                <span>新建订单项目</span>
            </button>
          </div>

          <div className="px-6 pt-6 pb-8">
            <button onClick={() => setIsPlatformsOpen(!isPlatformsOpen)} className="w-full px-4 mb-4 flex items-center justify-between group">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">快捷资源</span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isPlatformsOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`space-y-1.5 transition-all duration-500 overflow-hidden flex flex-col ${isPlatformsOpen ? 'max-h-none opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 py-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">Global Market</div>
              <PurchaseLink href="https://www.amazon.com" label="Amazon" sub="amazon.com" />
              <PurchaseLink href="https://www.ebay.com" label="eBay" sub="ebay.com" />
              <PurchaseLink href="https://www.etsy.com" label="Etsy" sub="etsy.com" />
              <PurchaseLink href="https://www.walmart.com" label="Walmart" sub="walmart.com" />
              
              <div className="my-2 border-t border-white/5 mx-4"></div>
              
              <div className="px-4 py-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">Cross-Border</div>
              <PurchaseLink href="https://www.temu.com" label="Temu" sub="temu.com" />
              <PurchaseLink href="https://www.shein.com" label="SHEIN" sub="shein.com" />
              <PurchaseLink href="https://www.aliexpress.com" label="AliExpress" sub="aliexpress.com" />
              
              <div className="my-2 border-t border-white/5 mx-4"></div>
              
              <div className="px-4 py-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">Sourcing & B2B</div>
              <PurchaseLink href="https://www.alibaba.com" label="Alibaba.com" sub="alibaba.com" />
              <PurchaseLink href="https://www.1688.com" label="1688 源头批发" sub="1688.com" />
              <PurchaseLink href="https://www.taobao.com" label="淘宝/天猫" sub="taobao.com" />
            </div>
          </div>
        </nav>

        <div className="p-8 border-t border-white/5 shrink-0 bg-white/5 space-y-3">
             <div className="px-5 py-4 rounded-[1.25rem] border border-white/10 premium-glass flex items-center gap-4 group cursor-pointer transition-all hover:bg-white/10">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                   {isCloudMode ? <ShieldCheck size={16} className="text-emerald-400" /> : <Database size={16} className="text-slate-400" />}
                </div>
                <div className="flex-1">
                   <p className="text-[11px] font-bold text-white">{isCloudMode ? '安全云端就绪' : '本地离线加密'}</p>
                   <p className="text-[9px] text-slate-500 font-medium">System Secure</p>
                </div>
                <Settings size={14} className="text-slate-500 group-hover:rotate-90 transition-transform duration-700" />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button onClick={handleFullBackup} className="flex items-center justify-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Download size={12} /> 备份
                </button>
                <button onClick={handleRestoreClick} className="flex items-center justify-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Upload size={12} /> 恢复
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col p-4 md:p-8 space-y-8 animate-slide-up">
        <header className="flex justify-between items-center bg-transparent z-20">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-3 premium-glass rounded-2xl text-slate-400"><Menu size={24} /></button>
                <div className="space-y-1">
                    <h2 className="text-3xl font-display font-bold tracking-tight text-white capitalize">
                        {view === 'add' || view === 'edit' ? (editingOrder ? 'Edit Project' : 'New Project') : view === 'list' ? 'Order Queue' : view === 'customers' ? 'Partners' : view === 'trash' ? 'Archive' : 'Overview'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">Procurement Intelligence Operating System</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 premium-glass p-2 rounded-[1.5rem] border-white/5">
                <button 
                  onClick={() => applyTheme('dark')} 
                  title="Dark Mode"
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500 ${settings.theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  <Moon size={18} />
                </button>
                <button 
                  onClick={() => applyTheme('aurora')} 
                  title="Aurora Mode"
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500 ${settings.theme === 'aurora' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  <Sparkles size={18} />
                </button>
                <button 
                  onClick={() => applyTheme('crystal')} 
                  title="Crystal Light Mode"
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500 ${settings.theme === 'crystal' ? 'bg-white text-indigo-950 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  <Sun size={18} />
                </button>
            </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full">
          {view === 'dashboard' && <Dashboard orders={orders.filter(o => !o.deleted)} onNavigate={(f) => { setActiveFilter(f); setView('list'); }} />}
          {view === 'list' && <OrderList orders={orders.filter(o => !o.deleted)} initialFilter={activeFilter} onEdit={handleEditOrder} onDelete={handleDeleteOrder} onDuplicate={handleDuplicateOrder} onSync={handleSyncLogistics} onImport={handleImportOrders} isSyncing={syncStatus === 'syncing'} />}
          {view === 'trash' && <OrderList orders={orders.filter(o => o.deleted)} onEdit={() => {}} onDelete={() => {}} onRestore={handleRestoreOrder} isTrash={true} onSync={() => {}} isSyncing={false} />}
          {view === 'customers' && <CustomerList customers={customers} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} onImport={handleImportCustomers} />}
          {(view === 'add' || view === 'edit') && (
            <OrderForm 
              initialOrder={editingOrder} 
              customers={customers} 
              onSave={handleSaveOrder} 
              onCancel={() => setView('list')} 
              onNavigateToCustomers={() => setView('customers')}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

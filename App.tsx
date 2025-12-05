
import React, { useState, useEffect } from 'react';
import { ViewState, Order, SupabaseConfig, AppSettings, OrderStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { LayoutDashboard, ShoppingCart, PlusCircle, Settings, Box, LogOut, ShieldCheck, Cloud, CloudOff, Loader2, Database, Wifi, WifiOff, Copy, Check, ExternalLink, Globe, Truck } from 'lucide-react';
import { initSupabase, fetchCloudOrders, saveCloudOrder, deleteCloudOrder } from './services/supabaseService';
import { syncOrderLogistics } from './services/logisticsService';

const STORAGE_KEY = 'smart_procure_data';
const SETTINGS_KEY = 'smart_procure_settings';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Settings & Cloud State
  const [settings, setSettings] = useState<AppSettings>({
    cloudConfig: { url: '', key: '' },
    tracking17Token: ''
  });
  
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [copySuccess, setCopySuccess] = useState(false);

  // Load Settings on Mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Migration support for old structure if needed
        const config = parsed.cloudConfig || parsed; 
        
        setSettings({
            cloudConfig: config.url ? config : { url: '', key: '' },
            tracking17Token: parsed.tracking17Token || ''
        });

        // Try connect if cloud config exists
        if (config.url && config.url.startsWith('http') && config.key) {
           connectToCloud(config);
        } else {
           loadLocalOrders();
        }
      } catch (e) {
        loadLocalOrders();
      }
    } else {
      loadLocalOrders();
    }
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const loadLocalOrders = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOrders(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load local orders", e);
      }
    }
  };

  const connectToCloud = async (config: SupabaseConfig) => {
    setIsLoading(true);
    const success = initSupabase(config);
    if (success) {
      try {
        const cloudData = await fetchCloudOrders();
        setOrders(cloudData);
        setIsCloudMode(true);
      } catch (e) {
        console.error("Failed to connect to cloud", e);
        setIsCloudMode(false);
        alert("连接云端失败，请检查 URL 和 Key");
        loadLocalOrders();
      }
    } else {
      setIsCloudMode(false);
    }
    setIsLoading(false);
  };

  const handleDisconnectCloud = () => {
    setIsCloudMode(false);
    const newSettings = { ...settings, cloudConfig: { url: '', key: '' } };
    saveSettings(newSettings);
    loadLocalOrders();
    setShowSettings(false);
  };

  const handleSyncLogistics = async () => {
      setSyncStatus('syncing');
      try {
          const { updatedOrders, count, message } = await syncOrderLogistics(orders, settings.tracking17Token);
          if (count > 0) {
              setOrders(updatedOrders);
              if (isCloudMode) {
                  // Wait for all updates to complete
                  await Promise.all(updatedOrders.map(o => saveCloudOrder(o)));
              } else {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
              }
          }
          alert(message);
      } catch (e) {
          alert('同步过程中发生错误');
          console.error(e);
      } finally {
          setSyncStatus('idle');
      }
  };

  const handleCopyConfig = () => {
    const textToCopy = `Hi，这是我们的采购系统云端配置：\n\nProject URL: ${settings.cloudConfig.url}\nAnon Key: ${settings.cloudConfig.key}\n\n请在"系统设置"中填入即可同步数据。`;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSaveOrder = async (order: Order, silent: boolean = false) => {
    let newOrders = [...orders];
    const index = newOrders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      newOrders[index] = order;
    } else {
      newOrders.unshift(order);
    }
    setOrders(newOrders);
    
    // Only switch view if not silent (silent used for kanban updates)
    if (!silent) {
        setView('list');
        setEditingOrder(null);
    }
    setSyncStatus('syncing');

    if (isCloudMode) {
      try {
        await saveCloudOrder(order);
        setSyncStatus('idle');
      } catch (e) {
        setSyncStatus('error');
        if (!silent) alert("保存到云端失败，请检查网络。");
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
      setSyncStatus('idle');
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

  const handleDeleteOrder = async (id: string) => {
    if (window.confirm("确定要删除这个订单吗？此操作无法撤销。")) {
      const newOrders = orders.filter(o => o.id !== id);
      setOrders(newOrders);
      
      if (isCloudMode) {
        try {
          await deleteCloudOrder(id);
        } catch (e) {
          console.error("Cloud delete failed", e);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
      }
    }
  };

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => {
        if (target === 'add') {
             setEditingOrder(null);
             setView('add');
        } else {
             setView(target);
        }
      }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
        view === target || (target === 'edit' && view === 'edit') || (target === 'add' && view === 'add')
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={20} className={`relative z-10 ${view === target ? 'text-indigo-400' : ''}`} />
      <span className="font-medium tracking-wide relative z-10">{label}</span>
      {view === target && <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 opacity-100 z-0"></div>}
    </button>
  );

  const PurchaseLink = ({ href, label, sub }: { href: string, label: string, sub: string }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all group border border-transparent hover:border-slate-100"
    >
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-[10px] text-slate-400 font-mono group-hover:text-indigo-400">{sub}</span>
      </div>
      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
    </a>
  );

  const getHeaderTitle = () => {
      switch(view) {
          case 'add': return '录入新订单';
          case 'edit': return '编辑订单详情';
          case 'list': return '订单管理';
          default: return '数据看板';
      }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex-shrink-0 md:h-screen sticky top-0 z-30 shadow-sm flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-8 flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
             <Box className="text-white" size={26} strokeWidth={2.5} />
          </div>
          <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">探行科技</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest uppercase">智能采集管理平台</p>
          </div>
        </div>
        
        <nav className="px-6 space-y-2 flex-1">
          <NavItem target="dashboard" icon={LayoutDashboard} label="概览中心" />
          <NavItem target="list" icon={ShoppingCart} label="订单列表" />
          
          <div className="pt-6 pb-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">快捷操作</p>
            <button
                onClick={() => { setEditingOrder(null); setView('add'); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 ${
                view === 'add' 
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700' 
                    : 'text-slate-500'
                }`}
            >
                <PlusCircle size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold tracking-wide text-indigo-600">新建订单</span>
            </button>
          </div>

          <div className="pt-4 pb-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">常用采购平台</p>
            <div className="space-y-1">
              <PurchaseLink href="https://www.amazon.com" label="Amazon 亚马逊" sub="amazon.com" />
              <PurchaseLink href="https://www.walmart.com" label="Walmart 沃尔玛" sub="walmart.com" />
              <PurchaseLink href="https://www.ebay.com" label="eBay 易贝" sub="ebay.com" />
              <PurchaseLink href="https://www.1688.com" label="1688 阿里巴巴" sub="1688.com" />
              <PurchaseLink href="https://www.aliexpress.com" label="AliExpress 速卖通" sub="aliexpress.com" />
            </div>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-100 shrink-0">
             <button 
                onClick={() => setShowSettings(true)}
                className={`w-full mb-4 px-4 py-3 rounded-xl border flex items-center gap-3 transition-all ${
                    isCloudMode 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                 <div className="h-8 w-8 bg-gradient-to-tr from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white">
                    A
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">代采专员</p>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isCloudMode ? 'bg-emerald-500' : 'bg-slate-400'} animate-pulse`}></div>
                        <p className="text-[10px] text-slate-500">{isCloudMode ? '在线' : '离线'}</p>
                    </div>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#f8fafc] relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 sticky top-0 z-20 flex justify-between items-center shadow-sm">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {getHeaderTitle()}
                </h2>
            </div>
            
            <div className={`hidden md:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm border ${
                isCloudMode 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
                 {isCloudMode ? <Wifi size={14} className="text-emerald-600" /> : <WifiOff size={14} className="text-slate-400" />}
                 <span>{isCloudMode ? '云端已连接' : '使用本地存储'}</span>
                 {syncStatus === 'syncing' && <Loader2 size={12} className="animate-spin ml-1" />}
            </div>
        </header>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {view === 'dashboard' && <Dashboard orders={orders} />}
          {view === 'list' && (
            <OrderList 
              orders={orders} 
              onEdit={handleEditOrder} 
              onDelete={handleDeleteOrder} 
              onSync={handleSyncLogistics}
              isSyncing={syncStatus === 'syncing'}
              onStatusChange={handleStatusChange}
            />
          )}
          {(view === 'add' || view === 'edit') && (
            <OrderForm 
              initialOrder={editingOrder} 
              onSave={handleSaveOrder} 
              onCancel={() => setView('list')} 
            />
          )}
        </div>

        {/* Settings Modal */}
        {showSettings && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0 bg-white z-10">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="text-slate-600" size={20} />
                            系统设置
                        </h3>
                        <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><Settings size={16} /></button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        
                        {/* Cloud Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
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
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                    <input 
                                        type="password" 
                                        value={settings.cloudConfig.key}
                                        onChange={(e) => {
                                            const newConfig = {...settings.cloudConfig, key: e.target.value};
                                            saveSettings({...settings, cloudConfig: newConfig});
                                        }}
                                        placeholder="Anon Key (eyJh...)"
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                    <div className="bg-amber-50 p-3 rounded-md text-[10px] text-amber-800 border border-amber-100">
                                        <strong>注意：</strong> 首次使用请在 Supabase SQL Editor 运行以下代码：
                                        <pre className="mt-1 bg-white p-2 rounded border border-amber-200 overflow-x-auto">
                                            {`create table orders (
  id text primary key,
  order_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table orders enable row level security;
create policy "Public Access" on orders for all using (true) with check (true);`}
                                        </pre>
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
                                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
                                    <p className="text-emerald-700 font-bold text-sm mb-2">已连接云端数据库</p>
                                    <button 
                                        onClick={handleCopyConfig}
                                        className="w-full mb-2 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-600 rounded text-xs font-medium flex items-center justify-center gap-2 hover:bg-emerald-50"
                                    >
                                        {copySuccess ? <Check size={14}/> : <Copy size={14} />}
                                        {copySuccess ? '已复制' : '复制配置给同事'}
                                    </button>
                                    <button 
                                        onClick={handleDisconnectCloud}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        断开连接
                                    </button>
                                </div>
                            )}
                        </div>

                        <hr className="border-slate-100" />

                        {/* Logistics Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Truck size={16} className="text-amber-600"/> 物流追踪 (17TRACK)
                            </h4>
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500">填入 API Key 可自动更新物流状态。留空则使用本地智能推断。</p>
                                <input 
                                    type="password" 
                                    value={settings.tracking17Token}
                                    onChange={(e) => saveSettings({...settings, tracking17Token: e.target.value})}
                                    placeholder="17TRACK API Access Token (可选)"
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                                <a href="https://api.17track.net/zh-cn/admin/settings" target="_blank" className="text-[10px] text-indigo-500 hover:underline block text-right">获取 API Key &rarr;</a>
                            </div>
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

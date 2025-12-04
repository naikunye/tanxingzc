import React, { useState, useEffect } from 'react';
import { ViewState, Order, SupabaseConfig } from './types';
import { Dashboard } from './components/Dashboard';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { LayoutDashboard, ShoppingCart, PlusCircle, Settings, Box, LogOut, ShieldCheck, Cloud, CloudOff, Loader2, Database, Wifi, WifiOff, Copy, Check } from 'lucide-react';
import { initSupabase, fetchCloudOrders, saveCloudOrder, deleteCloudOrder } from './services/supabaseService';

const STORAGE_KEY = 'smart_procure_data';
const CLOUD_CONFIG_KEY = 'smart_procure_cloud_config';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Cloud State
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cloudConfig, setCloudConfig] = useState<SupabaseConfig>({ url: '', key: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [copySuccess, setCopySuccess] = useState(false);

  // Load Cloud Config on Mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setCloudConfig(parsed);
        // Stricter check before connecting
        if (parsed.url && parsed.url.startsWith('http') && parsed.key) {
           connectToCloud(parsed);
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
        localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
      } catch (e) {
        console.error("Failed to connect to cloud", e);
        setIsCloudMode(false);
        alert("连接云端失败，请检查 URL 和 Key，并确保数据库表 'orders' 已创建。");
        loadLocalOrders();
      }
    } else {
      // Init failed (usually validation)
      setIsCloudMode(false);
    }
    setIsLoading(false);
  };

  const handleDisconnectCloud = () => {
    setIsCloudMode(false);
    localStorage.removeItem(CLOUD_CONFIG_KEY);
    setCloudConfig({ url: '', key: '' });
    loadLocalOrders();
    setShowSettings(false);
  };

  const handleCopyConfig = () => {
    const textToCopy = `Hi，这是我们的采购系统云端配置：\n\nProject URL: ${cloudConfig.url}\nAnon Key: ${cloudConfig.key}\n\n请在"云端设置"中填入即可同步数据。`;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSaveOrder = async (order: Order) => {
    // Optimistic UI update
    let newOrders = [...orders];
    const index = newOrders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      newOrders[index] = order;
    } else {
      newOrders.unshift(order);
    }
    setOrders(newOrders);
    setView('list');
    setEditingOrder(null);
    setSyncStatus('syncing');

    if (isCloudMode) {
      try {
        await saveCloudOrder(order);
        setSyncStatus('idle');
      } catch (e) {
        console.error("Cloud save failed", e);
        setSyncStatus('error');
        alert("保存到云端失败，请检查网络。");
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
      setSyncStatus('idle');
    }
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
          alert("云端删除失败");
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
      }
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setView('edit');
  };

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setView(target)}
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
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex-shrink-0 md:h-screen sticky top-0 z-30 shadow-sm flex flex-col">
        <div className="p-8 flex items-center gap-3">
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
          
          <div className="pt-8 pb-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">快捷操作</p>
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
        </nav>

        <div className="p-6 border-t border-slate-100">
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
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-fade-in">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Cloud className="text-indigo-600" size={20} />
                            云端协作设置 (Supabase)
                        </h3>
                        <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><Settings size={16} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            开启云端模式后，数据将存储在您的 Supabase 数据库中，实现多人实时协作。
                            <br/>
                            <a href="https://supabase.com" target="_blank" className="text-indigo-600 hover:underline">去注册 Supabase 账号 &rarr;</a>
                        </p>

                        {!isCloudMode ? (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Project URL</label>
                                    <input 
                                        type="text" 
                                        value={cloudConfig.url}
                                        onChange={(e) => setCloudConfig({...cloudConfig, url: e.target.value})}
                                        placeholder="https://xyz.supabase.co"
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Anon Key</label>
                                    <input 
                                        type="password" 
                                        value={cloudConfig.key}
                                        onChange={(e) => setCloudConfig({...cloudConfig, key: e.target.value})}
                                        placeholder="eyJh..."
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                    />
                                </div>

                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 font-mono overflow-x-auto">
                                    <p className="font-bold mb-1 font-sans">请在 Supabase SQL Editor 中运行：</p>
                                    -- 1. 创建表<br/>
                                    create table orders (<br/>
                                    &nbsp;&nbsp;id text primary key,<br/>
                                    &nbsp;&nbsp;order_data jsonb,<br/>
                                    &nbsp;&nbsp;created_at timestamptz default now(),<br/>
                                    &nbsp;&nbsp;updated_at timestamptz default now()<br/>
                                    );<br/><br/>
                                    -- 2. 开启行级安全策略<br/>
                                    alter table orders enable row level security;<br/><br/>
                                    -- 3. 允许所有读写操作<br/>
                                    create policy "Public Access" on orders for all using (true) with check (true);
                                </div>

                                <button 
                                    onClick={() => connectToCloud(cloudConfig)}
                                    disabled={isLoading || !cloudConfig.url || !cloudConfig.key}
                                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : '连接云端并同步'}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                    <CloudCheckIcon />
                                </div>
                                <h4 className="font-bold text-slate-800">已连接云端</h4>
                                <p className="text-xs text-slate-500 mt-1 mb-6">数据正在实时同步中</p>
                                
                                <button 
                                    onClick={handleCopyConfig}
                                    className="w-full mb-3 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 font-medium flex items-center justify-center gap-2"
                                >
                                    {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                                    {copySuccess ? '已复制！' : '复制配置给同事'}
                                </button>

                                <button 
                                    onClick={handleDisconnectCloud}
                                    className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 font-medium"
                                >
                                    断开连接 (切换回本地)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

const CloudCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
)

export default App;
import React, { useState, useEffect } from 'react';
import { ViewState, Order } from './types';
import { Dashboard } from './components/Dashboard';
import { OrderList } from './components/OrderList';
import { OrderForm } from './components/OrderForm';
import { LayoutDashboard, ShoppingCart, PlusCircle, Settings, Box, LogOut, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'smart_procure_data';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOrders(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load orders", e);
      }
    }
  }, []);

  const saveOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
  };

  const handleSaveOrder = (order: Order) => {
    let newOrders = [...orders];
    const index = newOrders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      newOrders[index] = order;
    } else {
      newOrders.unshift(order);
    }
    saveOrders(newOrders);
    setView('list');
    setEditingOrder(null);
  };

  const handleDeleteOrder = (id: string) => {
    if (window.confirm("确定要删除这个订单吗？此操作无法撤销。")) {
      const newOrders = orders.filter(o => o.id !== id);
      saveOrders(newOrders);
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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">智采助手</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest uppercase">Smart Procure</p>
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
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-3 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
                 <div className="h-10 w-10 bg-gradient-to-tr from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                    A
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">代采专员</p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-xs text-slate-500">在线运行中</p>
                    </div>
                </div>
                <LogOut size={16} className="text-slate-300 hover:text-red-500 transition-colors" />
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#f8fafc]">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 sticky top-0 z-20 flex justify-between items-center shadow-sm">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {getHeaderTitle()}
                </h2>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm">
                 <ShieldCheck size={14} className="text-emerald-600" />
                 <span>系统运行正常</span>
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
      </main>
    </div>
  );
};

export default App;
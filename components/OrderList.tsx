
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN, WarningRules } from '../types';
import { Edit2, Trash2, Search, Box, CloudLightning, Clock, CheckSquare, Square, ExternalLink, Hash, ShoppingBag, Truck, FileText, Layers, DollarSign, ArrowRight } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void; 
  onSync: () => void;
  isSyncing: boolean;
  onStatusChange?: (id: string, newStatus: OrderStatus) => void;
  initialFilter?: OrderStatus | 'All' | 'delayed';
  isTrash?: boolean;
  warningRules: WarningRules;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onRestore, onSync, isSyncing, initialFilter = 'All', isTrash = false, warningRules }) => {
  const [filter, setFilter] = useState<OrderStatus | 'All' | 'delayed'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);
  
  const filteredOrders = (orders || []).filter(o => {
    let matchesStatus = true;
    if (!isTrash) {
        if (filter === 'All') matchesStatus = true;
        else matchesStatus = o.status === filter;
    }
    const matchesSearch = o.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.buyerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.platformOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.clientOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.supplierTrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.notes && o.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (order: Order) => {
    if (isTrash) return <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-red-500/20 bg-red-500/10 text-red-500 flex items-center gap-1.5"><Trash2 size={10}/> 已归档</span>;
    const status = order.status;
    let style = 'bg-slate-800 text-slate-400 border-slate-700';
    switch(status) {
      case OrderStatus.PURCHASED: style = 'bg-blue-500/10 text-blue-400 border-blue-500/20'; break;
      case OrderStatus.READY_TO_SHIP: style = 'bg-amber-500/10 text-amber-400 border-amber-500/20'; break;
      case OrderStatus.SHIPPED: style = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'; break;
      case OrderStatus.DELIVERED: style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'; break;
    }
    return <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${style}`}>{OrderStatusCN[status]}</span>;
  };

  const TrackLink = ({ num, label, type }: { num?: string, label?: string, type?: 'internal' | 'tracking' }) => {
    if (!num) return null;
    return (
      <a 
        href={`https://www.17track.net/zh-cn/track?nums=${num}`} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 transition-all group/link font-mono text-[11px] ${type === 'internal' ? 'text-indigo-400 hover:text-indigo-300' : 'text-slate-500 hover:text-indigo-400'}`}
      >
        <span className="truncate max-w-[120px]">{label || num}</span>
        <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 shrink-0" />
      </a>
    );
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* 工具栏 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative w-full md:max-w-xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-500" size={18} />
            <input 
              type="text" 
              placeholder="通过单号、关键词、备注或地址搜索您的项目资产..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-14 pr-6 py-4.5 text-sm premium-glass rounded-2xl border-white/5 focus:border-indigo-500/30 outline-none transition-all placeholder:text-slate-600 text-slate-200" 
            />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
            {!isTrash && (
              <div className="flex p-1.5 premium-glass rounded-2xl border-white/5 shrink-0 overflow-x-auto max-w-full scrollbar-hide">
                 {['All', ...Object.values(OrderStatus)].map((s: any) => (
                    <button 
                      key={s} 
                      onClick={() => setFilter(s)} 
                      className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 whitespace-nowrap ${filter === s ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {s === 'All' ? '全部项目' : OrderStatusCN[s as OrderStatus]}
                    </button>
                 ))}
              </div>
            )}
            <button onClick={onSync} disabled={isSyncing} title="同步物流状态" className="p-4 premium-glass border-white/5 rounded-2xl text-indigo-400 hover:text-indigo-300 transition-all hover:scale-110 active:scale-95">
                {isSyncing ? <Clock size={18} className="animate-spin" /> : <CloudLightning size={18} />}
            </button>
        </div>
      </div>

      {/* 订单网格列表 */}
      <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map(order => (
              <div 
                  key={order.id} 
                  onClick={() => !isTrash && onEdit(order)} 
                  className="group relative p-6 premium-glass rounded-[2rem] border-white/5 hover:border-indigo-500/20 transition-all duration-500 hover:-translate-y-1 cursor-pointer flex flex-col lg:flex-row items-center gap-8 overflow-hidden"
              >
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -z-10 group-hover:bg-indigo-500/10 transition-colors" />

                  {/* 商品视觉 */}
                  <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500">
                        {order.imageUrl ? (
                            <img src={order.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Box size={28} className="text-slate-700 opacity-50" />
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl premium-glass border-white/10 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                        {order.quantity}
                      </div>
                  </div>

                  {/* 详情核心 */}
                  <div className="flex-1 min-w-0 space-y-3 text-center lg:text-left">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                          <h3 className="text-lg font-display font-bold text-white truncate max-w-sm" title={order.itemName}>{order.itemName}</h3>
                          {getStatusBadge(order)}
                      </div>
                      
                      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4 text-[11px] font-bold tracking-tight">
                          <div className="flex items-center gap-1.5 text-indigo-400/80">
                            <DollarSign size={12} />
                            <span>${(order.priceUSD * order.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Hash size={12} />
                            <span>{order.clientOrderId || '未分配内部号'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <ShoppingBag size={12} />
                            <span className="uppercase opacity-60">{order.platform}</span>
                          </div>
                      </div>

                      {order.notes && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-slate-400 italic">
                            <FileText size={10} className="text-amber-500/50" />
                            <span className="truncate max-w-[300px]">{order.notes}</span>
                          </div>
                      )}
                  </div>

                  {/* 收货地址 */}
                  <div className="w-full lg:w-64 px-6 py-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col gap-1">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">收货目的地</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2" title={order.buyerAddress}>
                        {order.buyerAddress}
                      </p>
                  </div>

                  {/* 物流链路 */}
                  <div className="w-full lg:w-48 flex flex-col gap-2 items-center lg:items-end">
                      <div className="flex flex-col gap-1 items-center lg:items-end">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">采购物流追踪</p>
                          <TrackLink num={order.trackingNumber} />
                      </div>
                      <div className="flex flex-col gap-1 items-center lg:items-end">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">国际转运单号</p>
                          {order.supplierTrackingNumber ? (
                              <TrackLink num={order.supplierTrackingNumber} />
                          ) : (
                              <span className="text-[10px] text-slate-700 italic">待录入</span>
                          )}
                      </div>
                  </div>

                  {/* 操作区 */}
                  <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6">
                      {isTrash ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onRestore?.(order.id); }} 
                          className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-2xl hover:bg-emerald-500/20 transition-colors"
                          title="还原项目"
                        >
                          <Clock size={18} />
                        </button>
                      ) : (
                        <>
                          <button className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 hover:text-white rounded-2xl hover:bg-white/10 transition-all">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} 
                            className="w-10 h-10 flex items-center justify-center bg-red-500/5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      <div className="w-10 h-10 flex items-center justify-center text-slate-800 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={20} />
                      </div>
                  </div>
              </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center premium-glass rounded-[3rem] border-white/5">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Box size={32} className="text-slate-700" />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-500">空空如也</h3>
                <p className="text-xs text-slate-600 mt-2">在该分类下未找到任何项目订单</p>
            </div>
          )}
      </div>
    </div>
  );
};

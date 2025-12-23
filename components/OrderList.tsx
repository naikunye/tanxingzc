import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderStatusCN, WarningRules } from '../types';
import { Edit2, Trash2, MapPin, Loader2, Search, Truck, ShoppingBag, CloudLightning, Filter, Download, Upload, Clock, Plane, CheckCircle2, Box, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { parseNaturalLanguageSearch } from '../services/geminiService';

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void; 
  onSync: () => void;
  isSyncing: boolean;
  onStatusChange?: (id: string, newStatus: OrderStatus) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchStatusChange?: (ids: string[], newStatus: OrderStatus) => void;
  onImport?: (data: any[]) => void;
  onBatchLogisticsUpdate?: (data: any[]) => void;
  initialFilter?: OrderStatus | 'All' | 'delayed';
  isTrash?: boolean;
  warningRules: WarningRules;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onRestore, onSync, isSyncing, initialFilter = 'All', isTrash = false, warningRules }) => {
  const [filter, setFilter] = useState<OrderStatus | 'All' | 'delayed'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

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
                          o.platformOrderId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) { setSelectedIds(new Set()); } 
      else { setSelectedIds(new Set(filteredOrders.map(o => o.id))); }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) { newSet.delete(id); } 
      else { newSet.add(id); }
      setSelectedIds(newSet);
  };

  const getStatusBadge = (order: Order) => {
    if (isTrash) return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-950/20 text-red-500 border-red-900/50 flex items-center gap-1"><Trash2 size={10}/> 已删除</span>;
    const status = order.status;
    let style = 'bg-slate-800 text-slate-400 border-slate-700';
    switch(status) {
      case OrderStatus.PURCHASED: style = 'bg-blue-900/20 text-blue-400 border-blue-900/50'; break;
      case OrderStatus.READY_TO_SHIP: style = 'bg-amber-900/20 text-amber-400 border-amber-900/50'; break;
      case OrderStatus.SHIPPED: style = 'bg-indigo-900/20 text-indigo-400 border-indigo-900/50'; break;
      case OrderStatus.DELIVERED: style = 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50'; break;
    }
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style}`}>{OrderStatusCN[status]}</span>;
  };

  const TrackLink = ({ num, label }: { num?: string, label?: string }) => {
    if (!num) return null;
    return (
      <a 
        href={`https://www.17track.net/zh-cn/track?nums=${num}`} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline transition-all group/link"
      >
        <span className="truncate max-w-[120px]">{label || num}</span>
        <ExternalLink size={10} className="opacity-40 group-hover/link:opacity-100" />
      </a>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-lg group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100" size={16} />
            <input type="text" placeholder="搜索订单..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/5 border border-white/5 rounded-xl focus:border-indigo-500/50 outline-none transition-all" />
        </div>
        <div className="flex items-center gap-3">
            <button onClick={onSync} disabled={isSyncing} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 transition-colors">
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudLightning size={14} />}
                智能同步
            </button>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide">
             {['All', ...Object.values(OrderStatus)].map((s: any) => (
                <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filter === s ? 'bg-indigo-600 text-white' : 'glass-card text-slate-400 hover:text-white'}`}>
                    {s === 'All' ? '全部订单' : OrderStatusCN[s as OrderStatus]}
                </button>
             ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-slate-500 font-bold border-b border-white/5">
                      <tr>
                          <th className="px-6 py-4 w-12"><button onClick={toggleSelectAll}>{selectedIds.size > 0 && selectedIds.size === filteredOrders.length ? <CheckSquare size={18} className="text-indigo-500"/> : <Square size={18} />}</button></th>
                          <th className="px-4 py-4 uppercase tracking-wider text-[11px]">商品信息 / 采购跟踪</th>
                          <th className="px-4 py-4 uppercase tracking-wider text-[11px]">订单状态 / 商家发货</th>
                          <th className="px-4 py-4 uppercase tracking-wider text-[11px]">平台渠道 / 内部号</th>
                          <th className="px-6 py-4 text-right uppercase tracking-wider text-[11px]">操作</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {filteredOrders.map(order => (
                          <tr key={order.id} onClick={() => !isTrash && onEdit(order)} className={`group transition-all ${selectedIds.has(order.id) ? 'bg-indigo-900/10' : 'hover:bg-white/5'} cursor-pointer`}>
                              <td className="px-6 py-6" onClick={(e) => toggleSelectOne(order.id, e)}><button>{selectedIds.has(order.id) ? <CheckSquare size={18} className="text-indigo-500"/> : <Square size={18} />}</button></td>
                              <td className="px-4 py-6">
                                  <div className="flex gap-4">
                                      <div className="w-12 h-12 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">{order.imageUrl ? <img src={order.imageUrl} alt="" className="w-full h-full object-cover" /> : <Box size={20} className="opacity-20" />}</div>
                                      <div className="min-w-0">
                                          <div className="font-bold line-clamp-1 mb-1">{order.itemName}</div>
                                          <div className="text-[10px] opacity-40 mb-1">
                                            {order.trackingNumber ? <TrackLink num={order.trackingNumber} label={`采购跟踪: ${order.trackingNumber}`} /> : '暂无采购单号'}
                                          </div>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-4 py-6">
                                  <div className="flex flex-col gap-1.5">
                                      {getStatusBadge(order)}
                                      {order.supplierTrackingNumber ? (
                                        <div className="text-[10px] font-mono bg-white/5 border border-white/5 px-1.5 py-0.5 rounded w-fit">
                                          <TrackLink num={order.supplierTrackingNumber} label={order.supplierTrackingNumber} />
                                        </div>
                                      ) : (
                                        <span className="text-[10px] opacity-30 italic">未录入发货单号</span>
                                      )}
                                  </div>
                              </td>
                              <td className="px-4 py-6">
                                  <div className="flex flex-col gap-1">
                                      <span className="text-xs opacity-50 font-bold">{order.platform}</span>
                                      {order.clientOrderId && <span className="text-[10px] font-mono text-indigo-400/80">#{order.clientOrderId}</span>}
                                  </div>
                              </td>
                              <td className="px-6 py-6 text-right">
                                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button className="p-2 hover:bg-white/10 rounded-lg"><Edit2 size={14} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
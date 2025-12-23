import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderStatusCN, WarningRules } from '../types';
import { Edit2, Trash2, MapPin, Loader2, Search, Truck, ShoppingBag, CloudLightning, Filter, Download, Upload, Clock, Plane, CheckCircle2, Box, CheckSquare, Square } from 'lucide-react';
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
  const [platformFilter, setPlatformFilter] = useState('All');
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);
  
  const getDelayType = (order: Order): 'purchase' | 'shipping' | null => {
    const now = new Date().getTime();
    if (order.status === OrderStatus.PURCHASED) {
        const purchaseTime = new Date(order.purchaseDate).getTime();
        const diffHours = (now - purchaseTime) / (1000 * 60 * 60);
        if (diffHours > warningRules.purchaseTimeoutHours) return 'purchase';
    }
    if (order.status === OrderStatus.SHIPPED) {
        const refTime = new Date(order.lastUpdated || order.purchaseDate).getTime();
        const diffDays = (now - refTime) / (1000 * 60 * 60 * 24);
        if (diffDays > warningRules.shippingTimeoutDays) return 'shipping';
    }
    return null;
  };

  const filteredOrders = (orders || []).filter(o => {
    let matchesStatus = true;
    if (!isTrash) {
        if (filter === 'All') matchesStatus = true;
        else if (filter === 'delayed') matchesStatus = getDelayType(o) !== null;
        else matchesStatus = o.status === filter;
    }
    const matchesSearch = o.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.buyerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.platformOrderId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'All' || (o.platform || '其他') === platformFilter;
    const matchesDateStart = !dateRange.start || o.purchaseDate >= dateRange.start;
    const matchesDateEnd = !dateRange.end || o.purchaseDate <= dateRange.end;
    const matchesNotes = !hasNotesFilter || (o.notes && o.notes.trim().length > 0);
    return matchesStatus && matchesSearch && matchesPlatform && matchesDateStart && matchesDateEnd && matchesNotes;
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

  const handleExport = () => {
    const headers = ["订单ID", "采购内部单号", "商品名称", "数量", "金额(USD)", "状态", "物流", "日期", "平台"];
    const rows = filteredOrders.map(o => [o.id, o.clientOrderId || '', o.itemName, o.quantity, o.priceUSD, OrderStatusCN[o.status], o.detailedStatus || '', o.purchaseDate, o.platform]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `导出订单.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleSmartSearch = async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchTerm.trim()) {
          setIsAiThinking(true);
          try {
              const criteria = await parseNaturalLanguageSearch(searchTerm);
              if (criteria) {
                  if (criteria.startDate || criteria.endDate) { setDateRange({ start: criteria.startDate || '', end: criteria.endDate || '' }); }
                  if (criteria.keyword) { setSearchTerm(criteria.keyword); }
              }
          } finally { setIsAiThinking(false); }
      }
  };

  const getStatusBadge = (order: Order) => {
    if (isTrash) return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-950/20 text-red-500 border-red-900/50 flex items-center gap-1"><Trash2 size={10}/> 已删除</span>;
    const status = order.status;
    let style = '';
    let icon = null;
    switch(status) {
      case OrderStatus.PENDING: style = 'bg-slate-800 text-slate-400 border-slate-700'; icon = <Clock size={10} />; break;
      case OrderStatus.PURCHASED: style = 'bg-blue-900/20 text-blue-400 border-blue-900/50'; icon = <ShoppingBag size={10} />; break;
      case OrderStatus.READY_TO_SHIP: style = 'bg-amber-900/20 text-amber-400 border-amber-900/50'; icon = <Box size={10} />; break;
      case OrderStatus.SHIPPED: style = 'bg-indigo-900/20 text-indigo-400 border-indigo-900/50'; icon = <Plane size={10} />; break;
      case OrderStatus.DELIVERED: style = 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50'; icon = <CheckCircle2 size={10} />; break;
      default: style = 'bg-slate-800 text-slate-400 border-slate-700';
    }
    return (
        <div className="flex flex-col items-start gap-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style} flex items-center gap-1`}>{icon}{OrderStatusCN[status]}</span>
            {order.detailedStatus && <div className="text-[9px] text-slate-500 font-medium truncate max-w-[120px]">{order.detailedStatus}</div>}
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <div className="relative w-full md:max-w-lg group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={16} />
                    <input type="text" placeholder="搜索关键词..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSmartSearch} className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none text-white transition-all" />
                    {isAiThinking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" size={14} />}
                </div>
                {!isTrash && (
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}><Filter size={18} /></button>
                )}
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button onClick={handleImportClick} className="px-4 py-2 text-slate-300 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 flex items-center gap-2 transition-colors"><Upload size={14} /> 导入</button>
                <button onClick={handleExport} className="px-4 py-2 text-emerald-400 text-xs font-bold bg-emerald-950/20 border border-emerald-900/50 rounded-xl hover:bg-emerald-900/40 flex items-center gap-2 transition-colors"><Download size={14} /> 导出</button>
                <button onClick={onSync} disabled={isSyncing} className="px-4 py-2 text-indigo-400 text-xs font-bold bg-indigo-950/20 border border-indigo-900/50 rounded-xl hover:bg-indigo-900/40 flex items-center gap-2 transition-colors">{isSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudLightning size={14} />} 同步</button>
            </div>
          </div>
      </div>
      {!isTrash && (
        <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide">
             {['All', ...Object.values(OrderStatus), 'delayed'].map((s: any) => (<button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-300'}`}>{s === 'All' ? '全部订单' : s === 'delayed' ? '异常预警' : OrderStatusCN[s as OrderStatus]}</button>))}
        </div>
      )}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-950/40 text-slate-500 font-bold border-b border-slate-800">
                      <tr>
                          <th className="px-6 py-4 w-12"><button onClick={toggleSelectAll} className="flex items-center">{selectedIds.size > 0 && selectedIds.size === filteredOrders.length ? <CheckSquare size={18} className="text-indigo-500"/> : <Square size={18} />}</button></th>
                          <th className="px-4 py-4 uppercase tracking-wider text-[11px]">商品信息 / 平台单号 (TikTok)</th>
                          <th className="px-4 py-4 uppercase tracking-wider text-[11px]">商家自发货 / 状态</th>
                          <th className="px-4 py-4 uppercase tracking-wider text-[11px]">采购来源 / 内部单号</th>
                          <th className="px-4 py-4 uppercase tracking-wider text-[11px]">备注</th>
                          <th className="px-6 py-4 text-right uppercase tracking-wider text-[11px]">操作</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                      {filteredOrders.map(order => (
                          <tr key={order.id} onClick={() => !isTrash && onEdit(order)} className={`group transition-all ${selectedIds.has(order.id) ? 'bg-indigo-900/10' : 'hover:bg-slate-800/30'} cursor-pointer`}>
                              <td className="px-6 py-6" onClick={(e) => toggleSelectOne(order.id, e)}><button>{selectedIds.has(order.id) ? <CheckSquare size={18} className="text-indigo-500"/> : <Square size={18} />}</button></td>
                              <td className="px-4 py-6">
                                  <div className="flex gap-4">
                                      <div className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">{order.imageUrl ? <img src={order.imageUrl} alt="" className="w-full h-full object-cover opacity-80" /> : <Box size={24} className="text-slate-700" />}</div>
                                      <div className="min-w-0">
                                          <div className="font-bold text-slate-200 line-clamp-1 leading-tight mb-1">{order.itemName}</div>
                                          <div className="text-xs text-slate-500 font-medium mb-2">${(order.priceUSD * order.quantity).toFixed(2)} (${order.priceUSD}x{order.quantity})</div>
                                          {order.platformOrderId && <div className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full w-fit font-mono">#{order.platformOrderId}</div>}
                                      </div>
                                  </div>
                              </td>
                              <td className="px-4 py-6">
                                  <div className="space-y-3">
                                      {getStatusBadge(order)}
                                      {order.supplierTrackingNumber ? (
                                          <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono text-slate-400 truncate">{order.supplierTrackingNumber}</div>
                                      ) : <div className="text-[10px] text-slate-700 italic">等待商家发货...</div>}
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate"><MapPin size={10} className="shrink-0" />{order.buyerAddress}</div>
                                  </div>
                              </td>
                              <td className="px-4 py-6">
                                  <div className="space-y-2">
                                      <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold text-slate-400">{order.platform}</span>
                                      {order.clientOrderId && <div className="text-[11px] font-mono text-indigo-400 font-bold">#{order.clientOrderId}</div>}
                                  </div>
                              </td>
                              <td className="px-4 py-6">{order.notes ? <div className="text-[11px] text-slate-500 line-clamp-2">{order.notes}</div> : <span className="text-slate-800">-</span>}</td>
                              <td className="px-6 py-6 text-right pt-8"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-2 text-slate-600 hover:text-white transition-colors"><Edit2 size={16} /></button><button onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button></div></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderStatusCN, TIMELINE_STEPS, WarningRules } from '../types.ts';
import { Edit2, Trash2, Package, MapPin, MessageSquare, Loader2, Search, Check, ExternalLink, Truck, List, Grid, MoreVertical, ShoppingBag, CloudLightning, AlertTriangle, Columns, Download, Copy, CheckCircle2, StickyNote, Hash, Filter, Calendar, Tag, XCircle, CheckSquare, Square, X, RotateCcw, Plane, Upload, Brain, Sparkles, Wand2, Clock, AlertCircle, Hourglass, Box } from 'lucide-react';
import { generateStatusUpdate, parseNaturalLanguageSearch } from '../services/geminiService.ts';
import { parseCSV } from '../services/csvService.ts';

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

export const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onRestore, onSync, isSyncing, onStatusChange, onBatchDelete, onBatchStatusChange, onImport, onBatchLogisticsUpdate, initialFilter = 'All', isTrash = false, warningRules }) => {
  const [filter, setFilter] = useState<OrderStatus | 'All' | 'delayed'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'board'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logisticsFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
      if (isTrash) setViewMode('table');
  }, [isTrash]);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);
  
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [platformFilter, setPlatformFilter] = useState('All');
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeFilterCount = [
    filter !== 'All',
    platformFilter !== 'All',
    !!dateRange.start,
    !!dateRange.end,
    hasNotesFilter
  ].filter(Boolean).length;

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
        if (viewMode === 'board') { matchesStatus = true; } 
        else {
            if (filter === 'All') matchesStatus = true;
            else if (filter === 'delayed') matchesStatus = getDelayType(o) !== null;
            else matchesStatus = o.status === filter;
        }
    }
    const matchesSearch = o.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.buyerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.supplierTrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.platformOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.clientOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.notes && o.notes.toLowerCase().includes(searchTerm.toLowerCase()));
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
    const headers = ["订单ID", "采购内部单号", "商品名称", "数量", "金额(USD)", "总价(USD)", "状态", "详细物流状态", "采购日期", "平台", "平台采购跟踪号", "收货地址", "平台单号（tiktok）", "商家自发货单号", "备注"];
    const rows = filteredOrders.map(o => [o.id, `"${o.clientOrderId || ''}"`, `"${o.itemName.replace(/"/g, '""')}"`, o.quantity, o.priceUSD, (o.priceUSD * o.quantity).toFixed(2), OrderStatusCN[o.status], o.detailedStatus || '', o.purchaseDate, o.platform, `"${o.trackingNumber || ''}"`, `"${o.buyerAddress.replace(/"/g, '""').replace(/\n/g, ' ')}"`, `"${o.platformOrderId || ''}"`, `"${o.supplierTrackingNumber || ''}"`, `"${o.notes || ''}"`]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `采购订单导出_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImport) {
          try {
              const data = await parseCSV(file);
              onImport(data);
          } catch (error) {
              alert('导入失败');
          }
      }
  };

  const handleLogisticsImportClick = () => {
      if (logisticsFileInputRef.current) {
          logisticsFileInputRef.current.value = '';
          logisticsFileInputRef.current.click();
      }
  };

  const handleSmartSearch = async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchTerm.trim()) {
          setIsAiThinking(true);
          try {
              const criteria = await parseNaturalLanguageSearch(searchTerm);
              if (criteria) {
                  if (criteria.startDate || criteria.endDate) { setDateRange({ start: criteria.startDate || '', end: criteria.endDate || '' }); }
                  if (criteria.platform && criteria.platform !== 'All') { setPlatformFilter(criteria.platform); }
                  if (criteria.status) {
                      const statusEnum = Object.values(OrderStatus).find(s => s === criteria.status);
                      if (statusEnum) setFilter(statusEnum as OrderStatus);
                  }
                  if (criteria.keyword) { setSearchTerm(criteria.keyword); } else { setSearchTerm(''); }
                  setShowFilters(true);
              }
          } finally { setIsAiThinking(false); }
      }
  };

  const getStatusBadge = (order: Order) => {
    if (isTrash) { return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-50 text-red-600 border-red-200 flex items-center gap-1"><Trash2 size={10}/> 已删除</span>; }
    const status = order.status;
    let style = '';
    let icon = null;
    switch(status) {
      case OrderStatus.PENDING: style = 'bg-slate-100 text-slate-600 border-slate-200'; icon = <Clock size={10} />; break;
      case OrderStatus.PURCHASED: style = 'bg-blue-50 text-blue-600 border-blue-200'; icon = <ShoppingBag size={10} />; break;
      case OrderStatus.READY_TO_SHIP: style = 'bg-amber-50 text-amber-600 border-amber-200'; icon = <Package size={10} />; break;
      case OrderStatus.SHIPPED: style = 'bg-indigo-50 text-indigo-600 border-indigo-200'; icon = <Plane size={10} />; break;
      case OrderStatus.DELIVERED: style = 'bg-emerald-50 text-emerald-600 border-emerald-200'; icon = <CheckCircle2 size={10} />; break;
      case OrderStatus.CANCELLED: style = 'bg-red-50 text-red-600 border-red-200'; icon = <XCircle size={10} />; break;
      default: style = 'bg-slate-100 text-slate-600 border-slate-200';
    }
    const delayType = getDelayType(order);
    return (
        <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style} flex items-center gap-1`}>{icon}{OrderStatusCN[status]}</span>
                {delayType === 'purchase' && (<div className="w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center animate-pulse"><AlertTriangle size={8} /></div>)}
                {delayType === 'shipping' && (<div className="w-4 h-4 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center animate-pulse"><Hourglass size={8} /></div>)}
            </div>
            {order.detailedStatus && (<div className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]">{order.detailedStatus}</div>)}
        </div>
    );
  };

  const getProgress = (status: OrderStatus) => {
      if (status === OrderStatus.CANCELLED) return 0;
      const index = TIMELINE_STEPS.indexOf(status);
      if (index === -1) return 0;
      return Math.round(((index + 1) / TIMELINE_STEPS.length) * 100);
  }

  const handleGenerateUpdate = async (order: Order, e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      setGeneratingId(order.id);
      const msg = await generateStatusUpdate(order);
      alert(`建议消息:\n\n${msg}`);
      setGeneratingId(null);
  };

  const open17Track = (num: string, e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); window.open(`https://t.17track.net/zh-cn#nums=${num}`, '_blank'); };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
      <input type="file" ref={logisticsFileInputRef} className="hidden" accept=".csv" onChange={(e) => {}} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <div className="relative w-full md:max-w-lg">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                        <button onClick={() => setIsSmartSearch(!isSmartSearch)} className={`p-1.5 rounded-lg transition-all ${isSmartSearch ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>
                            {isSmartSearch ? <Sparkles size={16} /> : <Search size={16} />}
                        </button>
                    </div>
                    <input type="text" placeholder={isSmartSearch ? "AI 助手: \"查一下还没发货的订单...\"" : "搜索关键词..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={isSmartSearch ? handleSmartSearch : undefined} className={`w-full pl-12 pr-10 py-2.5 text-sm border-none rounded-xl focus:ring-2 focus:ring-indigo-100 transition-all ${isSmartSearch ? 'bg-indigo-50/50 text-indigo-900' : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white'}`} />
                </div>
                {!isTrash && (
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}><Filter size={18} /> {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">{activeFilterCount}</span>}</button>
                )}
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button onClick={handleImportClick} className="px-4 py-2 text-slate-600 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-2"><Upload size={14} /> 导入</button>
                <button onClick={handleExport} className="px-4 py-2 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-2"><Download size={14} /> 导出</button>
                <button onClick={onSync} disabled={isSyncing} className="px-4 py-2 text-indigo-600 text-xs font-bold bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 flex items-center gap-2 disabled:opacity-50">{isSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudLightning size={14} />} 同步</button>
            </div>
          </div>
      </div>
      
      {!isTrash && (
        <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide">
             {['All', ...Object.values(OrderStatus), 'delayed'].map((s: any) => (<button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filter === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>{s === 'All' ? '全部订单' : s === 'delayed' ? '异常预警' : OrderStatusCN[s as OrderStatus]}</button>))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                          <th className="px-6 py-4 w-12"><button onClick={toggleSelectAll} className="flex items-center">{selectedIds.size > 0 && selectedIds.size === filteredOrders.length ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} />}</button></th>
                          <th className="px-4 py-4 w-[25%] uppercase tracking-wider text-[11px]">商品信息 / 平台单号 (TikTok)</th>
                          <th className="px-4 py-4 w-[25%] uppercase tracking-wider text-[11px]">商家自发货 / 状态</th>
                          <th className="px-4 py-4 w-[25%] uppercase tracking-wider text-[11px]">采购来源 / 内部单号 / 跟踪号</th>
                          <th className="px-4 py-4 w-[15%] uppercase tracking-wider text-[11px]">备注</th>
                          <th className="px-6 py-4 text-right uppercase tracking-wider text-[11px]">操作</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {filteredOrders.map(order => (
                          <tr key={order.id} onClick={() => !isTrash && onEdit(order)} className={`group transition-all ${selectedIds.has(order.id) ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'} cursor-pointer`}>
                              <td className="px-6 py-6 align-top" onClick={(e) => toggleSelectOne(order.id, e)}><button>{selectedIds.has(order.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} />}</button></td>
                              <td className="px-4 py-6 align-top">
                                  <div className="flex gap-4">
                                      <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">{order.imageUrl ? <img src={order.imageUrl} alt="" className="w-full h-full object-cover" /> : <Box size={24} className="text-slate-400" />}</div>
                                      <div className="min-w-0">
                                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1 leading-tight mb-1">{order.itemName}</div>
                                          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium mb-2">${(order.priceUSD * order.quantity).toFixed(2)} (${order.priceUSD}x{order.quantity})</div>
                                          {order.platformOrderId && <div className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full w-fit font-mono" title="TikTok 订单 ID">#{order.platformOrderId}</div>}
                                      </div>
                                  </div>
                              </td>
                              <td className="px-4 py-6 align-top">
                                  <div className="space-y-3">
                                      {getStatusBadge(order)}
                                      {order.supplierTrackingNumber ? (
                                          <div onClick={(e) => open17Track(order.supplierTrackingNumber!, e)} className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all">
                                              <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">商家自发货单号</div>
                                              <div className="font-mono text-[11px] text-slate-700 font-bold truncate">{order.supplierTrackingNumber}</div>
                                          </div>
                                      ) : <div className="text-[10px] text-slate-300 italic px-1">等待商家发货...</div>}
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1 truncate" title={order.buyerAddress}><MapPin size={12} className="shrink-0" />{order.buyerAddress}</div>
                                  </div>
                              </td>
                              <td className="px-4 py-6 align-top">
                                  <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600">{order.platform}</span>
                                          {order.clientOrderId && <span className="text-[11px] font-mono text-indigo-600 font-bold">#{order.clientOrderId}</span>}
                                      </div>
                                      {order.trackingNumber ? (
                                          <div onClick={(e) => open17Track(order.trackingNumber!, e)} className="p-2 border border-slate-200 rounded-lg bg-white hover:border-blue-400 hover:shadow-sm transition-all">
                                              <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">平台采购跟踪号</div>
                                              <div className="font-mono text-[11px] text-slate-600 font-medium truncate">{order.trackingNumber}</div>
                                          </div>
                                      ) : <div className="text-[10px] text-slate-300 italic px-1">等待平台分配单号...</div>}
                                  </div>
                              </td>
                              <td className="px-4 py-6 align-top">{order.notes ? <div className="text-xs text-slate-600 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30 line-clamp-3">{order.notes}</div> : <span className="text-slate-300">-</span>}</td>
                              <td className="px-6 py-6 text-right align-top pt-8"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleGenerateUpdate(order, e)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><MessageSquare size={16} /></button><button onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button></div></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
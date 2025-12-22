import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderStatusCN, TIMELINE_STEPS, WarningRules } from '../types.ts';
import { Edit2, Trash2, Package, MapPin, MessageSquare, Loader2, Search, Check, ExternalLink, Truck, List, Grid, MoreVertical, ShoppingBag, CloudLightning, AlertTriangle, Columns, Download, Copy, CheckCircle2, StickyNote, Hash, Filter, Calendar, Tag, XCircle, CheckSquare, Square, X, RotateCcw, Plane, Upload, Brain, Sparkles, Wand2, Clock, AlertCircle, Hourglass } from 'lucide-react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const platforms = Array.from(new Set(orders.map(o => o.platform || '其他').filter(Boolean))).sort();

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

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatchDeleteAction = () => {
      if (onBatchDelete && selectedIds.size > 0) {
          onBatchDelete(Array.from(selectedIds));
          clearSelection();
      }
  };

  const handleBatchStatusAction = (status: OrderStatus) => {
      if (onBatchStatusChange && selectedIds.size > 0) {
          onBatchStatusChange(Array.from(selectedIds), status);
          clearSelection();
      }
  };

  const handleBatchExportAction = () => {
      const exportList = filteredOrders.filter(o => selectedIds.has(o.id));
      if (exportList.length === 0) return;
      const headers = ["订单ID", "采购内部单号", "商品名称", "数量", "金额(USD)", "总价(USD)", "状态", "详细物流状态", "采购日期", "平台", "平台采购跟踪号", "收货地址", "平台订单号 (tiktok)", "商家自发货单号", "备注"];
      const rows = exportList.map(o => [o.id, `"${o.clientOrderId || ''}"`, `"${o.itemName.replace(/"/g, '""')}"`, o.quantity, o.priceUSD, (o.priceUSD * o.quantity).toFixed(2), OrderStatusCN[o.status], o.detailedStatus || '', o.purchaseDate, o.platform, `"${o.platformOrderId || ''}"`, `"${o.buyerAddress.replace(/"/g, '""').replace(/\n/g, ' ')}"`, `"${o.trackingNumber || ''}"`, `"${o.supplierTrackingNumber || ''}"`, `"${o.notes || ''}"`]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `选中订单导出_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      clearSelection();
  };

  const clearFilters = () => {
      setSearchTerm('');
      setDateRange({ start: '', end: '' });
      setPlatformFilter('All');
      setHasNotesFilter(false);
      if (filter === 'delayed') setFilter('All');
  };

  const activeFilterCount = [dateRange.start, dateRange.end, platformFilter !== 'All', hasNotesFilter, filter === 'delayed'].filter(Boolean).length;

  const handleExport = () => {
    const headers = ["订单ID", "采购内部单号", "商品名称", "数量", "金额(USD)", "总价(USD)", "状态", "详细物流状态", "采购日期", "平台", "平台采购跟踪号", "收货地址", "平台订单号 (tiktok)", "商家自发货单号", "备注"];
    const rows = filteredOrders.map(o => [o.id, `"${o.clientOrderId || ''}"`, `"${o.itemName.replace(/"/g, '""')}"`, o.quantity, o.priceUSD, (o.priceUSD * o.quantity).toFixed(2), OrderStatusCN[o.status], o.detailedStatus || '', o.purchaseDate, o.platform, `"${o.platformOrderId || ''}"`, `"${o.buyerAddress.replace(/"/g, '""').replace(/\n/g, ' ')}"`, `"${o.trackingNumber || ''}"`, `"${o.supplierTrackingNumber || ''}"`, `"${o.notes || ''}"`]);
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
              alert('CSV parsing failed.');
          }
      }
  };

  const handleLogisticsImportClick = () => {
      if (logisticsFileInputRef.current) {
          logisticsFileInputRef.current.value = '';
          logisticsFileInputRef.current.click();
      }
  };

  const handleLogisticsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onBatchLogisticsUpdate) {
          try {
              const data = await parseCSV(file);
              const updates = data.map(row => ({
                  id: row['订单ID'] || row['Order ID'] || row['id'],
                  clientOrderId: row['采购内部单号'] || row['客户单号'] || row['Client Order ID'] || row['clientOrderId'],
                  platformOrderId: row['平台采购跟踪号'] || row['平台订单号'] || row['Platform Order ID'] || row['platformOrderId'],
                  trackingNumber: row['平台订单号 (tiktok)'] || row['出库物流单号'] || row['发货物流单号'] || row['trackingNumber'],
                  supplierTrackingNumber: row['商家自发货单号'] || row['入库物流单号'] || row['商家物流单号'] || row['supplierTrackingNumber']
              }));
              onBatchLogisticsUpdate(updates);
          } catch (error) {
              alert('CSV format error.');
          }
      }
  };

  const handleSmartSearch = async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchTerm.trim()) {
          setIsAiThinking(true);
          try {
              setDateRange({ start: '', end: '' });
              setPlatformFilter('All');
              setHasNotesFilter(false);
              setFilter('All');
              const criteria = await parseNaturalLanguageSearch(searchTerm);
              if (criteria) {
                  if (criteria.startDate || criteria.endDate) { setDateRange({ start: criteria.startDate || '', end: criteria.endDate || '' }); }
                  if (criteria.platform && criteria.platform !== 'All') { setPlatformFilter(criteria.platform); }
                  if (criteria.status) {
                      if (criteria.status === 'delayed') { setFilter('delayed'); } 
                      else {
                           const statusEnum = Object.values(OrderStatus).find(s => s === criteria.status);
                           if (statusEnum) setFilter(statusEnum as OrderStatus);
                      }
                  }
                  if (criteria.keyword) { setSearchTerm(criteria.keyword); } else { setSearchTerm(''); }
                  setShowFilters(true);
              }
          } finally { setIsAiThinking(false); }
      }
  };

  const getStatusBadge = (order: Order) => {
    if (isTrash) { return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-red-50 text-red-600 border-red-200 flex items-center gap-1.5"><Trash2 size={12}/> 已删除</span>; }
    const status = order.status;
    let style = '';
    let icon = null;
    switch(status) {
      case OrderStatus.PENDING: style = 'bg-slate-100 text-slate-600 border-slate-200'; icon = <Clock size={12} />; break;
      case OrderStatus.PURCHASED: style = 'bg-blue-50 text-blue-600 border-blue-200'; icon = <ShoppingBag size={12} />; break;
      case OrderStatus.READY_TO_SHIP: style = 'bg-amber-50 text-amber-600 border-amber-200'; icon = <Package size={12} />; break;
      case OrderStatus.SHIPPED: style = 'bg-indigo-50 text-indigo-600 border-indigo-200'; icon = <Plane size={12} />; break;
      case OrderStatus.DELIVERED: style = 'bg-emerald-50 text-emerald-600 border-emerald-200'; icon = <CheckCircle2 size={12} />; break;
      case OrderStatus.CANCELLED: style = 'bg-red-50 text-red-600 border-red-200'; icon = <XCircle size={12} />; break;
      default: style = 'bg-slate-100 text-slate-600 border-slate-200';
    }
    const delayType = getDelayType(order);
    return (
        <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${style} whitespace-nowrap inline-flex items-center gap-1.5 transition-colors`}>{icon}{OrderStatusCN[status]}</span>
                {delayType === 'purchase' && (<span className="w-5 h-5 rounded-full bg-red-100 text-red-500 border border-red-200 flex items-center justify-center animate-pulse"><AlertTriangle size={10} strokeWidth={3} /></span>)}
                {delayType === 'shipping' && (<span className="w-5 h-5 rounded-full bg-orange-100 text-orange-500 border border-orange-200 flex items-center justify-center animate-pulse"><Hourglass size={10} strokeWidth={3} /></span>)}
            </div>
            {order.detailedStatus && (<div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium px-0.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div><span className="truncate max-w-[140px]">{order.detailedStatus}</span></div>)}
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

  const handleDelete = (id: string, e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }
  const handleRestore = (id: string, e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (onRestore) onRestore(id); }
  const open17Track = (num: string, e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); window.open(`https://t.17track.net/zh-cn#nums=${num}`, '_blank'); };

  const getDaysLeft = (deletedAt?: string) => {
      if (!deletedAt) return 14;
      const delDate = new Date(deletedAt);
      const expiryDate = new Date(delDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
      <input type="file" ref={logisticsFileInputRef} className="hidden" accept=".csv" onChange={handleLogisticsFileChange} />

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <div className={`relative w-full md:max-w-lg group transition-all duration-300 ${isSmartSearch ? 'scale-[1.01]' : ''}`}>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
                        <button onClick={() => setIsSmartSearch(!isSmartSearch)} className={`p-1.5 rounded-lg transition-all duration-300 ${isSmartSearch ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 rotate-180' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            {isSmartSearch ? <Sparkles size={16} /> : <Search size={16} />}
                        </button>
                    </div>
                    <input type="text" placeholder={isSmartSearch ? "AI 助手: \"查一下上周亚马逊买的还没发货的订单...\"" : "搜索商品、地址、备注或单号..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={isSmartSearch ? handleSmartSearch : undefined} disabled={isAiThinking} className={`w-full pl-12 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none transition-all ${isSmartSearch ? 'bg-gradient-to-r from-indigo-50/80 to-violet-50/80 dark:from-indigo-950/30 dark:to-violet-950/30 border-indigo-200 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 placeholder-indigo-400/70 text-indigo-900 dark:text-indigo-100 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-700 focus:border-slate-300 placeholder-slate-400 text-slate-800 dark:text-white'}`} />
                </div>
                {!isTrash && (
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 shrink-0 ${showFilters || activeFilterCount > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Filter size={18} /> {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{activeFilterCount}</span>}</button>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {isTrash ? <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">{filteredOrders.length} 个订单在回收站</span> : (
                    <>
                        {onImport && (
                            <div className="flex bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button onClick={handleImportClick} className="px-3 py-1.5 text-slate-600 dark:text-slate-300 rounded-md text-xs font-bold hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all flex items-center gap-2"><Upload size={14} /><span>导入订单</span></button>
                                {onBatchLogisticsUpdate && <button onClick={handleLogisticsImportClick} className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all flex items-center gap-2" title="批量更新物流单号"><Truck size={14} /><span>发货/更新</span></button>}
                            </div>
                        )}
                        <button onClick={handleExport} className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-2 border border-emerald-200 dark:border-emerald-800"><Download size={16} /><span className="hidden sm:inline">导出表格</span></button>
                        <button onClick={onSync} disabled={isSyncing} className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 disabled:opacity-50">{isSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudLightning size={16} />}<span className="hidden sm:inline">同步物流</span></button>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setViewMode('table')} className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><List size={16} /></button>
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Grid size={16} /></button>
                        </div>
                    </>
                )}
            </div>
          </div>
      </div>
      
      {!isTrash && (
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
             {['All', ...Object.values(OrderStatus), 'delayed'].map((s: any) => (<button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${filter === s ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-100 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{s === 'All' ? '全部订单' : s === 'delayed' ? '异常预警' : OrderStatusCN[s as OrderStatus]}</button>))}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"><Package className="text-slate-300 mx-auto mb-4" size={32} /><h3 className="text-sm font-bold text-slate-800 dark:text-white">{isTrash ? '回收站为空' : '暂无相关订单'}</h3></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-4 py-4 w-12 text-center"><button onClick={toggleSelectAll} className="flex items-center justify-center">{selectedIds.size > 0 && selectedIds.size === filteredOrders.length ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} />}</button></th>
                            <th className="px-4 py-3 font-semibold w-[25%]">商品信息 / 采购内部单号</th>
                            <th className="px-4 py-3 font-semibold w-[25%]">商家自发货 / 状态</th>
                            <th className="px-4 py-3 font-semibold w-[25%]">采购来源 / 平台采购跟踪号</th>
                            <th className="px-4 py-3 font-semibold w-[15%]">备注</th>
                            <th className="px-4 py-3 font-semibold text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredOrders.map(order => (
                            <tr key={order.id} onClick={() => !isTrash && onEdit(order)} className={`cursor-pointer transition-colors ${selectedIds.has(order.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                                <td className="px-4 py-4 text-center align-top pt-6" onClick={(e) => e.stopPropagation()}><button onClick={(e) => toggleSelectOne(order.id, e)}>{selectedIds.has(order.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} />}</button></td>
                                <td className="px-4 py-4 align-top">
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 rounded bg-slate-100 flex items-center justify-center shrink-0 border overflow-hidden">{order.imageUrl ? <img src={order.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-400" />}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">{order.itemName}</div>
                                            <div className="text-xs text-slate-500 mt-1">${(order.priceUSD * order.quantity).toFixed(2)} (${order.priceUSD} x {order.quantity})</div>
                                            {order.clientOrderId && <div className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit font-mono">{order.clientOrderId}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">{getStatusBadge(order)}</div>
                                        {!isTrash && order.status !== OrderStatus.CANCELLED && <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${order.status === OrderStatus.DELIVERED ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${getProgress(order.status)}%` }}></div></div>}
                                        {order.supplierTrackingNumber ? (
                                            <div onClick={(e) => open17Track(order.supplierTrackingNumber!, e)} className="px-2 py-1 bg-slate-50 border rounded-lg hover:border-blue-400 transition-all cursor-pointer">
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">商家自发货单号</div>
                                                <div className="font-mono text-xs text-slate-700 font-bold truncate">{order.supplierTrackingNumber}</div>
                                            </div>
                                        ) : <div className="text-[10px] text-slate-300 italic">待商家自发货</div>}
                                        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 truncate" title={order.buyerAddress}><MapPin size={12} className="shrink-0" />{order.buyerAddress}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{order.platform}</span>
                                            {order.platformOrderId && <span className="text-[10px] font-mono text-slate-500">#{order.platformOrderId}</span>}
                                        </div>
                                        {order.trackingNumber && (
                                            <div className="p-2 border rounded-lg bg-white">
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">Tiktok 订单标识</div>
                                                <div className="font-mono text-[10px] text-slate-600 truncate">{order.trackingNumber}</div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 align-top">{order.notes ? <div className="text-xs text-slate-600 bg-amber-50 p-2 rounded border border-amber-100 line-clamp-3 leading-relaxed">{order.notes}</div> : <span className="text-slate-300">-</span>}</td>
                                <td className="px-4 py-4 text-right align-top pt-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-end gap-1">{isTrash ? (<><button onClick={(e) => handleRestore(order.id, e)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded"><RotateCcw size={16} /></button><button onClick={(e) => handleDelete(order.id, e)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16} /></button></>) : (<><button onClick={(e) => handleGenerateUpdate(order.id ? order : order, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><MessageSquare size={16} /></button><button onClick={(e) => handleDelete(order.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button></>)}</div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};
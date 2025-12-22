
import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderStatusCN, TIMELINE_STEPS, WarningRules } from '../types';
import { Edit2, Trash2, Package, MapPin, MessageSquare, Loader2, Search, Check, ExternalLink, Truck, List, Grid, MoreVertical, ShoppingBag, CloudLightning, AlertTriangle, Columns, Download, Copy, CheckCircle2, StickyNote, Hash, Filter, Calendar, Tag, XCircle, CheckSquare, Square, X, RotateCcw, Plane, Upload, Brain, Sparkles, Wand2, Clock, AlertCircle, Hourglass } from 'lucide-react';
import { generateStatusUpdate, parseNaturalLanguageSearch } from '../services/geminiService';
import { parseCSV } from '../services/csvService';

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
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [platformFilter, setPlatformFilter] = useState('All');
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isTrash) setViewMode('table');
  }, [isTrash]);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);
  
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

  const filteredOrders = orders.filter(o => {
    let matchesStatus = true;
    if (!isTrash && viewMode !== 'board') {
        if (filter === 'delayed') matchesStatus = getDelayType(o) !== null;
        else if (filter !== 'All') matchesStatus = o.status === filter;
    }
    const matchesSearch = o.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.buyerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.supplierTrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.platformOrderId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlatform = platformFilter === 'All' || (o.platform || '其他') === platformFilter;
    const matchesDate = (!dateRange.start || o.purchaseDate >= dateRange.start) && (!dateRange.end || o.purchaseDate <= dateRange.end);
    const matchesNotes = !hasNotesFilter || (o.notes && o.notes.trim().length > 0);

    return matchesStatus && matchesSearch && matchesPlatform && matchesDate && matchesNotes;
  });

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredOrders.map(o => o.id)));
      }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
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
      const headers = ["订单ID", "客户单号", "商品名称", "数量", "金额(USD)", "状态", "平台", "收货地址", "TikTok平台单号"];
      const csvContent = [headers.join(','), ...exportList.map(o => [o.id, o.clientOrderId, o.itemName, o.quantity, o.priceUSD, o.status, o.platform, o.buyerAddress, o.trackingNumber].join(','))].join('\n');
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "export.csv";
      link.click();
      clearSelection();
  };

  const handleSmartSearch = async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchTerm.trim()) {
          setIsAiThinking(true);
          try {
              const criteria = await parseNaturalLanguageSearch(searchTerm);
              if (criteria) {
                  if (criteria.platform) setPlatformFilter(criteria.platform);
                  if (criteria.keyword) setSearchTerm(criteria.keyword);
                  setShowFilters(true);
              }
          } finally {
              setIsAiThinking(false);
          }
      }
  };

  const getStatusBadge = (order: Order) => {
    const status = order.status;
    const style = isTrash ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200';
    return (
        <span className={`px-2 py-1 rounded text-[11px] font-bold border ${style}`}>
            {isTrash ? '已删除' : OrderStatusCN[status]}
        </span>
    );
  };

  const getProgress = (status: OrderStatus) => {
      const index = TIMELINE_STEPS.indexOf(status);
      return Math.round(((index + 1) / TIMELINE_STEPS.length) * 100);
  };

  const open17Track = (num: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://t.17track.net/zh-cn#nums=${num}`, '_blank');
  };

  const activeFilterCount = [dateRange.start, dateRange.end, platformFilter !== 'All', hasNotesFilter].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-20 relative animate-fade-in">
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && onImport) onImport(await parseCSV(file));
      }} />
      <input type="file" ref={logisticsFileInputRef} className="hidden" accept=".csv" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && onBatchLogisticsUpdate) onBatchLogisticsUpdate(await parseCSV(file));
      }} />

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <button onClick={() => setIsSmartSearch(!isSmartSearch)} className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    {isSmartSearch ? <Sparkles size={16} className="text-indigo-500" /> : <Search size={16} className="text-slate-400" />}
                </button>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={isSmartSearch ? handleSmartSearch : undefined}
                    placeholder={isSmartSearch ? "AI 搜索: '查上周亚马逊买的'..." : "搜索内容..."}
                    className="w-full pl-12 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                {isAiThinking && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />}
            </div>
            <div className="flex gap-2 shrink-0">
                {!isTrash && (
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-lg border flex items-center gap-2 ${showFilters ? 'bg-indigo-50 border-indigo-200' : 'bg-white dark:bg-slate-900'}`}>
                        <Filter size={18} />
                        {activeFilterCount > 0 && <span className="bg-indigo-600 text-white px-1.5 rounded-full text-[10px]">{activeFilterCount}</span>}
                    </button>
                )}
                {!isTrash && (
                    <button onClick={onSync} disabled={isSyncing} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 flex items-center gap-2">
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <CloudLightning size={18} />}
                        <span className="hidden sm:inline text-sm font-bold">同步物流</span>
                    </button>
                )}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setViewMode('table')} className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}><List size={16}/></button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}><Grid size={16}/></button>
                </div>
            </div>
        </div>

        {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="text-sm p-2 border rounded dark:bg-slate-800 dark:border-slate-700">
                    <option value="All">所有平台</option>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="flex gap-2">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="flex-1 text-sm p-2 border rounded dark:bg-slate-800" />
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="flex-1 text-sm p-2 border rounded dark:bg-slate-800" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={hasNotesFilter} onChange={e => setHasNotesFilter(e.target.checked)} />
                    仅显示有备注
                </label>
            </div>
        )}
      </div>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50">
              <span className="text-sm font-bold">{selectedIds.size} 项已选</span>
              <div className="flex gap-4">
                  <button onClick={handleBatchExportAction} className="text-sm hover:text-indigo-400">导出</button>
                  <button onClick={handleBatchDeleteAction} className="text-sm text-red-400">删除</button>
                  {!isTrash && (
                      <button onClick={() => handleBatchStatusAction(OrderStatus.SHIPPED)} className="text-sm hover:text-indigo-400">更新已发货</button>
                  )}
              </div>
              <button onClick={clearSelection}><X size={18}/></button>
          </div>
      )}

      {/* Main List */}
      {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">暂无订单</p>
          </div>
      ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <button onClick={toggleSelectAll} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                                    {selectedIds.size === filteredOrders.length ? <CheckSquare size={18} className="text-indigo-500" /> : <Square size={18} />}
                                </button>
                            </th>
                            <th className="p-4 font-bold">商品信息</th>
                            <th className="p-4 font-bold">TikTok单号/进度</th>
                            <th className="p-4 font-bold">来源与备注</th>
                            <th className="p-4 font-bold text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredOrders.map(order => (
                            <tr key={order.id} onClick={() => !isTrash && onEdit(order)} className="group cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-slate-800/50">
                                <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                                    <button onClick={(e) => toggleSelectOne(order.id, e)}>
                                        {selectedIds.has(order.id) ? <CheckSquare size={18} className="text-indigo-500" /> : <Square size={18} className="text-slate-300" />}
                                    </button>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-3">
                                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded border flex items-center justify-center shrink-0">
                                            {order.imageUrl ? <img src={order.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-400" size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 dark:text-white truncate" title={order.itemName}>{order.itemName}</div>
                                            <div className="text-xs text-slate-500 mt-1">${order.priceUSD} x {order.quantity}</div>
                                            {order.clientOrderId && <div className="text-[10px] text-indigo-500 font-bold mt-1">ID: {order.clientOrderId}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(order)}
                                            {getDelayType(order) && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                        </div>
                                        <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full" style={{ width: `${getProgress(order.status)}%` }}></div>
                                        </div>
                                        {order.trackingNumber && (
                                            <div onClick={e => open17Track(order.trackingNumber!, e)} className="text-[11px] font-mono font-bold text-indigo-600 hover:underline">
                                                {order.trackingNumber}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">{order.platform || '其他'}</span>
                                        {order.notes && <div className="text-[11px] text-slate-500 truncate max-w-[150px] italic">"{order.notes}"</div>}
                                    </div>
                                </td>
                                <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-end gap-1">
                                        {isTrash ? (
                                            <button onClick={() => onRestore && onRestore(order.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded"><RotateCcw size={16}/></button>
                                        ) : (
                                            <button onClick={() => onEdit(order)} className="p-2 text-slate-400 hover:text-indigo-500 rounded"><Edit2 size={16}/></button>
                                        )}
                                        <button onClick={() => onDelete(order.id)} className="p-2 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </td>
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

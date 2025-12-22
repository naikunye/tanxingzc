
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logisticsFileInputRef = useRef<HTMLInputElement>(null);
  
  // Smart Search State
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Force table view in trash for simplicity, or handle other views
  useEffect(() => {
      if (isTrash) setViewMode('table');
  }, [isTrash]);

  // Update filter when prop changes
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);
  
  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [platformFilter, setPlatformFilter] = useState('All');
  const [hasNotesFilter, setHasNotesFilter] = useState(false);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Derive unique platforms from orders for the dropdown
  const platforms = Array.from(new Set(orders.map(o => o.platform || '其他').filter(Boolean))).sort();

  const getDelayType = (order: Order): 'purchase' | 'shipping' | null => {
    const now = new Date().getTime();
    
    // Purchase Delay Check
    if (order.status === OrderStatus.PURCHASED) {
        const purchaseTime = new Date(order.purchaseDate).getTime();
        const diffHours = (now - purchaseTime) / (1000 * 60 * 60);
        if (diffHours > warningRules.purchaseTimeoutHours) return 'purchase';
    }

    // Shipping Delay Check
    if (order.status === OrderStatus.SHIPPED) {
        const refTime = new Date(order.lastUpdated || order.purchaseDate).getTime();
        const diffDays = (now - refTime) / (1000 * 60 * 60 * 24);
        if (diffDays > warningRules.shippingTimeoutDays) return 'shipping';
    }
    
    return null;
  };

  const filteredOrders = (orders || []).filter(o => {
    // 1. Status Filter (Skip in trash mode)
    let matchesStatus = true;
    if (!isTrash) {
        if (viewMode === 'board') {
            matchesStatus = true; 
        } else {
            if (filter === 'All') matchesStatus = true;
            else if (filter === 'delayed') matchesStatus = getDelayType(o) !== null;
            else matchesStatus = o.status === filter;
        }
    }
    
    // 2. Search Filter
    const matchesSearch = o.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.buyerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.supplierTrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.platformOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.clientOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.notes && o.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // 3. Platform Filter
    const matchesPlatform = platformFilter === 'All' || (o.platform || '其他') === platformFilter;

    // 4. Date Range Filter
    const matchesDateStart = !dateRange.start || o.purchaseDate >= dateRange.start;
    const matchesDateEnd = !dateRange.end || o.purchaseDate <= dateRange.end;

    // 5. Notes Filter
    const matchesNotes = !hasNotesFilter || (o.notes && o.notes.trim().length > 0);

    return matchesStatus && matchesSearch && matchesPlatform && matchesDateStart && matchesDateEnd && matchesNotes;
  });

  // Batch Selection Logic
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
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
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
      // Create a temporary filtered list based on selection
      const exportList = filteredOrders.filter(o => selectedIds.has(o.id));
      if (exportList.length === 0) return;
      
      // Reuse export logic but with selected items
      const headers = [
        "订单ID", "客户单号", "商品名称", "数量", "金额(USD)", "总价(USD)", 
        "状态", "详细物流状态", "采购日期", "平台", "平台订单号", 
        "收货地址", "出库物流单号", "入库物流单号", "备注"
      ];
      const rows = exportList.map(o => [
        o.id,
        `"${o.clientOrderId || ''}"`,
        `"${o.itemName.replace(/"/g, '""')}"`,
        o.quantity,
        o.priceUSD,
        (o.priceUSD * o.quantity).toFixed(2),
        OrderStatusCN[o.status],
        o.detailedStatus || '',
        o.purchaseDate,
        o.platform,
        `"${o.platformOrderId || ''}"`,
        `"${o.buyerAddress.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${o.trackingNumber || ''}"`,
        `"${o.supplierTrackingNumber || ''}"`,
        `"${o.notes || ''}"`
      ]);
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

  const activeFilterCount = [
      dateRange.start, 
      dateRange.end, 
      platformFilter !== 'All', 
      hasNotesFilter,
      filter === 'delayed' // Treat delayed mode as an active filter
  ].filter(Boolean).length;


  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    // Standard Export (All Filtered)
    const headers = [
        "订单ID", "客户单号", "商品名称", "数量", "金额(USD)", "总价(USD)", 
        "状态", "详细物流状态", "采购日期", "平台", "平台订单号", 
        "收货地址", "出库物流单号", "入库物流单号", "备注"
    ];

    const rows = filteredOrders.map(o => [
        o.id,
        `"${o.clientOrderId || ''}"`,
        `"${o.itemName.replace(/"/g, '""')}"`, 
        o.quantity,
        o.priceUSD,
        (o.priceUSD * o.quantity).toFixed(2),
        OrderStatusCN[o.status],
        o.detailedStatus || '',
        o.purchaseDate,
        o.platform,
        `"${o.platformOrderId || ''}"`, 
        `"${o.buyerAddress.replace(/"/g, '""').replace(/\n/g, ' ')}"`, 
        `"${o.trackingNumber || ''}"`,
        `"${o.supplierTrackingNumber || ''}"`,
        `"${o.notes || ''}"`
    ]);

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
              alert('CSV parsing failed. Please check the file format.');
              console.error(error);
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
              // Normalize data keys (Order ID/Client ID -> id, Tracking -> trackingNumber)
              const updates = data.map(row => ({
                  id: row['订单ID'] || row['Order ID'] || row['id'],
                  clientOrderId: row['客户单号'] || row['Client Order ID'] || row['clientOrderId'],
                  platformOrderId: row['平台订单号'] || row['Platform Order ID'] || row['platformOrderId'],
                  trackingNumber: row['出库物流单号'] || row['发货物流单号'] || row['Tracking Number'] || row['trackingNumber'],
                  supplierTrackingNumber: row['入库物流单号'] || row['商家物流单号'] || row['Supplier Tracking'] || row['supplierTrackingNumber']
              }));
              onBatchLogisticsUpdate(updates);
          } catch (error) {
              alert('CSV format error. Ensure headers are correct.');
              console.error(error);
          }
      }
  };

  const handleSmartSearch = async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchTerm.trim()) {
          setIsAiThinking(true);
          try {
              // 1. Reset Filters first to allow new clean search
              setDateRange({ start: '', end: '' });
              setPlatformFilter('All');
              setHasNotesFilter(false);
              setFilter('All');

              const criteria = await parseNaturalLanguageSearch(searchTerm);
              if (criteria) {
                  // 2. Apply filters based on AI criteria
                  if (criteria.startDate || criteria.endDate) {
                      setDateRange({ start: criteria.startDate || '', end: criteria.endDate || '' });
                  }
                  if (criteria.platform && criteria.platform !== 'All') {
                      setPlatformFilter(criteria.platform);
                  }
                  if (criteria.status) {
                      if (criteria.status === 'delayed') {
                        setFilter('delayed');
                      } else {
                           // Try to match the enum directly
                           const statusEnum = Object.values(OrderStatus).find(s => s === criteria.status);
                           if (statusEnum) setFilter(statusEnum);
                      }
                  }
                  if (criteria.keyword) {
                      setSearchTerm(criteria.keyword);
                  } else {
                      setSearchTerm(''); // Clear raw query if converted entirely to filters
                  }
                  setShowFilters(true); // Auto expand to show what AI selected
              }
          } finally {
              setIsAiThinking(false);
          }
      }
  };

  const getStatusBadge = (order: Order) => {
    if (isTrash) {
         return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-red-50 text-red-600 border-red-200 flex items-center gap-1.5"><Trash2 size={12}/> 已删除</span>;
    }
    const status = order.status;
    let style = '';
    let icon = null;
    
    switch(status) {
      case OrderStatus.PENDING: 
        style = 'bg-slate-100 text-slate-600 border-slate-200'; 
        icon = <Clock size={12} />;
        break;
      case OrderStatus.PURCHASED: 
        style = 'bg-blue-50 text-blue-600 border-blue-200'; 
        icon = <ShoppingBag size={12} />;
        break;
      case OrderStatus.READY_TO_SHIP: 
        style = 'bg-amber-50 text-amber-600 border-amber-200'; 
        icon = <Package size={12} />;
        break;
      case OrderStatus.SHIPPED: 
        style = 'bg-indigo-50 text-indigo-600 border-indigo-200'; 
        icon = <Plane size={12} />;
        break;
      case OrderStatus.DELIVERED: 
        style = 'bg-emerald-50 text-emerald-600 border-emerald-200'; 
        icon = <CheckCircle2 size={12} />;
        break;
      case OrderStatus.CANCELLED: 
        style = 'bg-red-50 text-red-600 border-red-200'; 
        icon = <XCircle size={12} />;
        break;
      default: 
        style = 'bg-slate-100 text-slate-600 border-slate-200';
    }

    const delayType = getDelayType(order);

    return (
        <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${style} whitespace-nowrap inline-flex items-center gap-1.5 transition-colors`}>
                    {icon}
                    {OrderStatusCN[status]}
                </span>
                
                {/* Warning Icons */}
                {delayType === 'purchase' && (
                    <div className="relative group/warn">
                         <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 border border-red-200 flex items-center justify-center animate-pulse">
                            <AlertTriangle size={10} strokeWidth={3} />
                        </span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/warn:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                            采购超时
                        </div>
                    </div>
                )}
                {delayType === 'shipping' && (
                     <div className="relative group/warn">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-500 border border-orange-200 flex items-center justify-center animate-pulse">
                            <Hourglass size={10} strokeWidth={3} />
                        </span>
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/warn:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                            物流超时
                        </div>
                    </div>
                )}
            </div>
            
            {/* Detailed Status Text */}
            {order.detailedStatus && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium px-0.5" title={order.detailedStatus}>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    <span className="truncate max-w-[140px]">{order.detailedStatus}</span>
                </div>
            )}
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
      e.preventDefault();
      e.stopPropagation();
      setGeneratingId(order.id);
      const msg = await generateStatusUpdate(order);
      alert(`建议发送给客户的消息:\n\n${msg}`);
      setGeneratingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      onDelete(id);
  }

  const handleRestore = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onRestore) onRestore(id);
  }

  const open17Track = (trackingNumber: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`https://t.17track.net/zh-cn#nums=${trackingNumber}`, '_blank');
  };

  // ... (renderTimeline, handleDragStart etc can remain, but won't be used in table view often)
   const renderTimeline = (currentStatus: OrderStatus) => {
      if (currentStatus === OrderStatus.CANCELLED) return null;
      const currentIndex = TIMELINE_STEPS.indexOf(currentStatus);
      const progress = Math.max(0, (currentIndex / (TIMELINE_STEPS.length - 1)) * 100);

      return (
        <div className="mt-5 mb-2 px-1">
            <div className="relative h-1 bg-slate-100 dark:bg-slate-700 rounded-full mb-6 mx-2">
                <div 
                    className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
                <div className="absolute top-1/2 left-0 w-full transform -translate-y-1/2 flex justify-between">
                    {TIMELINE_STEPS.map((step, index) => {
                        const isCompleted = index <= currentIndex;
                        const isCurrent = index === currentIndex;
                        return (
                            <div key={step} className="flex flex-col items-center relative">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-[2px] z-10 transition-all duration-300 bg-white dark:bg-slate-800
                                    ${isCompleted ? 'border-indigo-500 text-indigo-500' : 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600'}
                                    ${isCurrent ? 'ring-4 ring-indigo-50 dark:ring-indigo-900/40 scale-110' : ''}
                                `}>
                                    {index < currentIndex ? <Check size={10} strokeWidth={4} /> : <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>}
                                </div>
                                <span className={`absolute top-7 text-[10px] font-medium whitespace-nowrap transition-colors duration-300
                                    ${isCurrent ? 'text-indigo-600 dark:text-indigo-400 font-bold' : isCompleted ? 'text-slate-600 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}
                                `}>
                                    {OrderStatusCN[step]}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      );
  };

  // --- Board View Logic ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData("orderId", id);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: OrderStatus) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("orderId");
      if (id && onStatusChange) {
          onStatusChange(id, status);
      }
  };

  const renderKanbanBoard = () => {
    const columns = Object.values(OrderStatus);
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] snap-x">
            {columns.map(status => {
                const columnOrders = filteredOrders.filter(o => o.status === status);
                return (
                    <div 
                        key={status} 
                        className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-900/50 rounded-xl flex flex-col snap-center border border-slate-200 dark:border-slate-800"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        {/* Column Header */}
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-t-xl sticky top-0 z-10">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{OrderStatusCN[status]}</h3>
                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold">{columnOrders.length}</span>
                        </div>
                        {/* Content ... (Same as before) */}
                         <div className="p-2 overflow-y-auto flex-1 custom-scrollbar space-y-2">
                            {columnOrders.map(order => (
                                <div 
                                    key={order.id} 
                                    draggable 
                                    onDragStart={(e) => handleDragStart(e, order.id)}
                                    onClick={() => onEdit(order)}
                                    className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-move group select-none relative"
                                >
                                     {getDelayType(order) !== null && (
                                        <div className="absolute top-2 right-2 text-red-500 animate-pulse">
                                            <AlertTriangle size={14} />
                                        </div>
                                    )}
                                    {/* ... Card Content (Simplified for brevity) ... */}
                                     <div className="flex gap-3 mb-2">
                                         <div className="w-12 h-12 rounded bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 shrink-0 overflow-hidden">
                                            {order.imageUrl ? (
                                                <img src={order.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-500"><Package size={16} /></div>
                                            )}
                                         </div>
                                         <div className="min-w-0">
                                             <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight mb-1">{order.itemName}</h4>
                                             <p className="text-xs text-slate-500 dark:text-slate-400">${order.priceUSD} x {order.quantity}</p>
                                         </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-700">
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">{order.platform}</span>
                                        {order.detailedStatus && <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">{order.detailedStatus}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const getDaysLeft = (deletedAt?: string) => {
      if (!deletedAt) return 14;
      const delDate = new Date(deletedAt);
      const expiryDate = new Date(delDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".csv" 
          onChange={handleFileChange} 
      />
      <input 
          type="file" 
          ref={logisticsFileInputRef} 
          className="hidden" 
          accept=".csv" 
          onChange={handleLogisticsFileChange} 
      />

      {/* Controls Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Top Bar: Search and Primary Actions */}
          <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                {/* Smart Search Input Area */}
                <div className={`relative w-full md:max-w-lg group transition-all duration-300 ${isSmartSearch ? 'scale-[1.01]' : ''}`}>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
                        <button 
                            onClick={() => setIsSmartSearch(!isSmartSearch)}
                            className={`p-1.5 rounded-lg transition-all duration-300 ${
                                isSmartSearch 
                                ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 rotate-180' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isSmartSearch ? "切换回普通搜索" : "切换到 AI 智能搜索"}
                        >
                            {isSmartSearch ? <Sparkles size={16} /> : <Search size={16} />}
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder={isSmartSearch ? "AI 助手: \"查一下上周亚马逊买的还没发货的订单...\"" : "搜索商品、地址、备注或单号..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={isSmartSearch ? handleSmartSearch : undefined}
                        disabled={isAiThinking}
                        className={`w-full pl-12 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none transition-all
                            ${isSmartSearch 
                                ? 'bg-gradient-to-r from-indigo-50/80 to-violet-50/80 dark:from-indigo-950/30 dark:to-violet-950/30 border-indigo-200 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 placeholder-indigo-400/70 text-indigo-900 dark:text-indigo-100 shadow-sm' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-700 focus:border-slate-300 placeholder-slate-400 text-slate-800 dark:text-white'}
                        `}
                    />
                     {isAiThinking && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                        </div>
                    )}
                </div>

                {!isTrash && (
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 shrink-0 ${
                            showFilters || activeFilterCount > 0
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title="高级筛选"
                    >
                        <Filter size={18} />
                        {activeFilterCount > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {isTrash ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
                        {filteredOrders.length} 个订单在回收站
                    </span>
                ) : (
                    <>
                        {/* Standard View Actions */}
                        {onImport && (
                            <div className="flex bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={handleImportClick}
                                    className="px-3 py-1.5 text-slate-600 dark:text-slate-300 rounded-md text-xs font-bold hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all flex items-center gap-2"
                                >
                                    <Upload size={14} />
                                    <span>导入订单</span>
                                </button>
                                {onBatchLogisticsUpdate && (
                                    <button
                                        onClick={handleLogisticsImportClick}
                                        className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all flex items-center gap-2"
                                        title="批量更新物流单号"
                                    >
                                        <Truck size={14} />
                                        <span>发货/更新</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleExport}
                            className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-2 border border-emerald-200 dark:border-emerald-800"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">导出表格</span>
                        </button>
                        <button
                            onClick={onSync}
                            disabled={isSyncing}
                            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
                        >
                            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudLightning size={16} />}
                            <span className="hidden sm:inline">同步物流</span>
                        </button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                <List size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                <Grid size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('board')}
                                className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                <Columns size={16} />
                            </button>
                        </div>
                    </>
                )}
            </div>
          </div>

          {/* Advanced Filter Panel */}
          {showFilters && !isTrash && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 p-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">采购日期范围</label>
                        <div className="flex gap-2">
                             <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                             />
                             <span className="text-slate-400 self-center">-</span>
                             <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white"
                             />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">采购平台</label>
                        <select 
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white h-[30px]"
                        >
                            <option value="All">所有平台</option>
                            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                     </div>
                     <div className="pb-1">
                         <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={hasNotesFilter}
                                onChange={(e) => setHasNotesFilter(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">仅显示有备注的订单</span>
                         </label>
                     </div>
                     <div className="pb-1">
                         <button 
                            onClick={clearFilters}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                            <XCircle size={14} />
                            清空筛选条件
                        </button>
                    </div>
                </div>
            </div>
          )}
      </div>
      
      {/* Filter Tabs */}
      {!isTrash && viewMode !== 'board' && (
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
             {['All', ...Object.values(OrderStatus)].map((s: any) => (
                <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                        filter === s 
                        ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-100 shadow-md' 
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    {s === 'All' ? '全部订单' : OrderStatusCN[s as OrderStatus]}
                </button>
             ))}
             {/* Dynamic Tab for Delayed */}
             {filter === 'delayed' && (
                 <button
                    onClick={() => setFilter('delayed')}
                    className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap bg-red-600 text-white border-red-600 shadow-md flex items-center gap-1"
                >
                    <AlertTriangle size={12} />
                    异常预警
                </button>
             )}
        </div>
      )}

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-fade-in border border-slate-700 w-[90%] md:w-auto">
              <div className="flex items-center gap-3 pr-4 border-r border-slate-700">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                      {selectedIds.size}
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">已选择</span>
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <button 
                    onClick={handleBatchExportAction}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  >
                      <Download size={14} /> 批量导出
                  </button>
                  
                  {!isTrash && (
                      <>
                        <div className="h-4 w-px bg-slate-700 mx-1"></div>
                        <div className="relative group">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors whitespace-nowrap">
                                <CheckCircle2 size={14} /> 更改状态
                            </button>
                            <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden hidden group-hover:block border border-slate-200 dark:border-slate-700 py-1">
                                {Object.values(OrderStatus).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleBatchStatusAction(status)}
                                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 block"
                                    >
                                        {OrderStatusCN[status]}
                                    </button>
                                ))}
                            </div>
                        </div>
                      </>
                  )}

                  <div className="h-4 w-px bg-slate-700 mx-1"></div>
                  
                  <button 
                    onClick={handleBatchDeleteAction}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  >
                      <Trash2 size={14} /> {isTrash ? '彻底删除' : '移入回收站'}
                  </button>
              </div>

              <button 
                onClick={clearSelection}
                className="ml-2 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                  <X size={16} />
              </button>
          </div>
      )}

      {/* Main List Rendering */}
      {viewMode === 'board' && !isTrash ? (
          renderKanbanBoard()
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                {isTrash ? <Trash2 className="text-slate-300" size={32} /> : <Package className="text-slate-300" size={32} />}
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{isTrash ? '回收站为空' : '暂无相关订单'}</h3>
            {!isTrash && <p className="text-slate-500 text-xs mt-1">请尝试更换搜索关键词或筛选条件</p>}
        </div>
      ) : (
        <>
            {viewMode === 'grid' && !isTrash ? (
                // GRID VIEW (Only for active orders)
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredOrders.map(order => (
                        <div 
                            key={order.id} 
                            onClick={() => onEdit(order)} 
                            className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border transition-all duration-300 cursor-pointer overflow-hidden group relative
                                ${selectedIds.has(order.id) ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/10 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700'}
                            `}
                        >
                             <div 
                                onClick={(e) => toggleSelectOne(order.id, e)}
                                className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer
                                    ${selectedIds.has(order.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400 backdrop-blur-sm'}
                                `}
                            >
                                <Check size={14} strokeWidth={3} />
                            </div>

                        <div className="p-5 flex flex-col sm:flex-row gap-6">
                            <div className="w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 flex items-center justify-center relative">
                                {order.imageUrl ? (
                                    <img src={order.imageUrl} alt={order.itemName} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Package size={32} className="text-slate-300" />
                                )}
                                <div className="absolute top-2 left-2">
                                     {getStatusBadge(order)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                {/* ... Same Content as previous Grid View ... */}
                                <div>
                                     <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-4">{order.itemName}</h3>
                                     {/* ... details ... */}
                                     <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">${(order.priceUSD * order.quantity).toFixed(2)}</div>
                                </div>
                                {renderTimeline(order.status)}
                                <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                                    <button onClick={(e) => handleGenerateUpdate(order, e)} className="p-2 text-slate-400 hover:text-indigo-600"><MessageSquare size={16}/></button>
                                    <button onClick={(e) => handleDelete(order.id, e)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                        </div>
                    ))}
                </div>
            ) : (
                // TABLE VIEW (Used for both Active and Trash)
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-4 w-12 text-center">
                                        <button onClick={toggleSelectAll} className="flex items-center justify-center text-slate-400 hover:text-indigo-600">
                                            {selectedIds.size > 0 && selectedIds.size === filteredOrders.length ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-semibold w-[30%]">商品信息 / 客户单号</th>
                                    <th className="px-4 py-3 font-semibold w-[25%]">采购来源 / 商家发货</th>
                                    <th className="px-4 py-3 font-semibold w-[25%]">发货物流 / 状态</th>
                                    <th className="px-4 py-3 font-semibold w-[15%]">备注</th>
                                    <th className="px-4 py-3 font-semibold text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredOrders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        onClick={() => !isTrash && onEdit(order)}
                                        className={`cursor-pointer transition-colors group 
                                            ${selectedIds.has(order.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-indigo-50/30 dark:hover:bg-slate-800'}
                                        `}
                                    >
                                        <td className="px-4 py-4 text-center align-top pt-6" onClick={(e) => e.stopPropagation()}>
                                             <button onClick={(e) => toggleSelectOne(order.id, e)} className="flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-indigo-600">
                                                {selectedIds.has(order.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} />}
                                            </button>
                                        </td>
                                        
                                        {/* Product & Client ID */}
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex gap-3">
                                                <div className="w-16 h-16 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                                    {order.imageUrl ? (
                                                        <img src={order.imageUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package size={20} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1" title={order.itemName}>{order.itemName}</div>
                                                    
                                                    <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs">
                                                        <div className="font-medium text-slate-600 dark:text-slate-400">
                                                            ${(order.priceUSD * order.quantity).toFixed(2)}
                                                            <span className="text-slate-400 ml-1 font-normal">(${order.priceUSD} x {order.quantity})</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {order.clientOrderId && (
                                                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded w-fit" title="客户单号">
                                                            <Hash size={10} />
                                                            <span className="font-mono font-bold">{order.clientOrderId}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Procurement Source */}
                                        <td className="px-4 py-4 align-top">
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        {order.platform}
                                                    </span>
                                                    {order.platformOrderId ? (
                                                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400" title="平台订单号">#{order.platformOrderId}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 italic">无平台单号</span>
                                                    )}
                                                </div>

                                                {/* Inbound Tracking Card */}
                                                {order.supplierTrackingNumber ? (
                                                    <div onClick={(e) => open17Track(order.supplierTrackingNumber!, e)} className="group/supplier cursor-pointer relative overflow-hidden bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm max-w-[200px]">
                                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                                                         <div className="px-2 py-1.5 pl-3">
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                                                                    <Truck size={9} /> 商家发货 (入库)
                                                                </span>
                                                            </div>
                                                            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-bold tracking-wide group-hover/supplier:text-blue-600 transition-colors truncate">
                                                                {order.supplierTrackingNumber}
                                                            </div>
                                                         </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 max-w-[200px]">
                                                        <Truck size={12} />
                                                        <span className="text-[10px]">待商家发货</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Logistics & Status */}
                                        <td className="px-4 py-4 align-top">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                     {getStatusBadge(order)}
                                                     {isTrash && (
                                                        <div className="text-[10px] font-mono text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                                                            {getDaysLeft(order.deletedAt)}天后清除
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Progress Bar for Active Orders */}
                                                {!isTrash && order.status !== OrderStatus.CANCELLED && (
                                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                order.status === OrderStatus.DELIVERED ? 'bg-emerald-500' :
                                                                order.status === OrderStatus.SHIPPED ? 'bg-indigo-500' :
                                                                'bg-blue-400'
                                                            }`}
                                                            style={{ width: `${getProgress(order.status)}%` }}
                                                        ></div>
                                                    </div>
                                                )}

                                                {!isTrash && (
                                                    <div className="space-y-2 pt-1">
                                                        {/* Outbound Tracking Card */}
                                                        {order.trackingNumber ? (
                                                            <div onClick={(e) => open17Track(order.trackingNumber!, e)} className="group/track cursor-pointer relative overflow-hidden bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm">
                                                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                                                 <div className="px-3 py-2 pl-4">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                                                                            <Plane size={10} /> 出库物流
                                                                        </span>
                                                                        <ExternalLink size={10} className="text-indigo-400 opacity-0 group-hover/track:opacity-100 transition-opacity" />
                                                                    </div>
                                                                    <div className="font-mono text-xs text-slate-700 dark:text-slate-200 font-bold tracking-wide group-hover/track:text-indigo-600 transition-colors">
                                                                        {order.trackingNumber}
                                                                    </div>
                                                                 </div>
                                                            </div>
                                                        ) : (
                                                             <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                                                <AlertCircle size={12} />
                                                                <span className="text-[10px]">待生成运单号</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Address Preview (More compact) */}
                                                <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded border border-slate-100 dark:border-slate-800/50" title={order.buyerAddress}>
                                                    <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                                    <span className="line-clamp-1 opacity-90">{order.buyerAddress}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Notes */}
                                        <td className="px-4 py-4 align-top">
                                            {order.notes ? (
                                                <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                                                    <StickyNote size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-3 leading-relaxed whitespace-pre-wrap">{order.notes}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300 pl-2">-</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-4 text-right align-top pt-6 cursor-default" onClick={(e) => e.stopPropagation()}>
                                             <div className="flex items-center justify-end gap-1">
                                                {isTrash ? (
                                                    <>
                                                        <button 
                                                            onClick={(e) => handleRestore(order.id, e)}
                                                            className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                                            title="还原"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDelete(order.id, e)}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                            title="彻底删除"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={(e) => handleGenerateUpdate(order, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors" title="生成通知"><MessageSquare size={16} /></button>
                                                        <button onClick={(e) => handleDelete(order.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="移入回收站"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        }
        </>
      )}
    </div>
  );
};

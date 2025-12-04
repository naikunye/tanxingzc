
import React, { useState } from 'react';
import { Order, OrderStatus, OrderStatusCN, TIMELINE_STEPS } from '../types';
import { Edit2, Trash2, Package, MapPin, MessageSquare, Loader2, Search, Check, ExternalLink, Truck, List, Grid, MoreVertical, ShoppingBag, CloudLightning } from 'lucide-react';
import { generateStatusUpdate } from '../services/geminiService';

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onSync, isSyncing }) => {
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const filteredOrders = (orders || []).filter(o => {
    const matchesStatus = filter === 'All' || o.status === filter;
    const matchesSearch = o.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.buyerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.supplierTrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.platformOrderId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: OrderStatus) => {
    let colors = '';
    switch(status) {
      case OrderStatus.DELIVERED: colors = 'bg-emerald-100 text-emerald-700 border-emerald-200'; break;
      case OrderStatus.SHIPPED: colors = 'bg-blue-100 text-blue-700 border-blue-200'; break;
      case OrderStatus.READY_TO_SHIP: colors = 'bg-amber-100 text-amber-700 border-amber-200'; break;
      case OrderStatus.PURCHASED: colors = 'bg-indigo-100 text-indigo-700 border-indigo-200'; break;
      case OrderStatus.CANCELLED: colors = 'bg-red-50 text-red-600 border-red-100'; break;
      default: colors = 'bg-slate-100 text-slate-600 border-slate-200';
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${colors} whitespace-nowrap inline-flex items-center`}>
            {OrderStatusCN[status]}
        </span>
    );
  };

  const handleGenerateUpdate = async (order: Order, e: React.MouseEvent) => {
      e.stopPropagation();
      setGeneratingId(order.id);
      const msg = await generateStatusUpdate(order);
      alert(`建议发送给客户的消息:\n\n${msg}`);
      setGeneratingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // CRITICAL: Stop event from bubbling to row click
      onDelete(id);
  }

  const open17Track = (trackingNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://t.17track.net/zh-cn#nums=${trackingNumber}`, '_blank');
  };

  const renderTimeline = (currentStatus: OrderStatus) => {
      if (currentStatus === OrderStatus.CANCELLED) return null;
      const currentIndex = TIMELINE_STEPS.indexOf(currentStatus);
      const progress = Math.max(0, (currentIndex / (TIMELINE_STEPS.length - 1)) * 100);

      return (
        <div className="mt-5 mb-2 px-1">
            <div className="relative h-1 bg-slate-100 rounded-full mb-6 mx-2">
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
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-[2px] z-10 transition-all duration-300 bg-white
                                    ${isCompleted ? 'border-indigo-500 text-indigo-500' : 'border-slate-200 text-slate-300'}
                                    ${isCurrent ? 'ring-4 ring-indigo-50 scale-110' : ''}
                                `}>
                                    {index < currentIndex ? <Check size={10} strokeWidth={4} /> : <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>}
                                </div>
                                <span className={`absolute top-7 text-[10px] font-medium whitespace-nowrap transition-colors duration-300
                                    ${isCurrent ? 'text-indigo-600 font-bold' : isCompleted ? 'text-slate-600' : 'text-slate-300'}
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

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input
                type="text"
                placeholder="搜索商品、地址或单号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none focus:bg-white transition-all placeholder-slate-400 text-slate-800"
            />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <button
                onClick={onSync}
                disabled={isSyncing}
                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-200 disabled:opacity-50"
                title="检查并更新所有订单的物流状态"
            >
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudLightning size={16} />}
                <span className="hidden sm:inline">同步物流状态</span>
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
            
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                 <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    title="列表模式"
                 >
                    <List size={16} /> <span className="hidden sm:inline">列表</span>
                 </button>
                 <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    title="卡片模式"
                 >
                    <Grid size={16} /> <span className="hidden sm:inline">卡片</span>
                 </button>
            </div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
         {['All', ...Object.values(OrderStatus)].map((s: any) => (
            <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                    filter === s 
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
                {s === 'All' ? '全部订单' : OrderStatusCN[s as OrderStatus]}
            </button>
         ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Package className="text-slate-300" size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">暂无相关订单</h3>
            <p className="text-slate-500 text-xs mt-1">请尝试更换搜索关键词或筛选条件</p>
        </div>
      ) : (
        <>
            {viewMode === 'grid' ? (
                // GRID VIEW
                <div className="grid grid-cols-1 gap-6">
                    {filteredOrders.map(order => (
                        <div key={order.id} onClick={() => onEdit(order)} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group">
                        <div className="p-5 flex flex-col sm:flex-row gap-6">
                            <div className="w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center relative">
                                {order.imageUrl ? (
                                    <img src={order.imageUrl} alt={order.itemName} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Package size={32} className="text-slate-300" />
                                )}
                                <div className="absolute top-2 left-2">
                                     {getStatusBadge(order.status)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 truncate pr-4">{order.itemName}</h3>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{order.platform}</span>
                                                {order.platformOrderId && (
                                                    <span className="text-slate-400 font-mono">ID: {order.platformOrderId}</span>
                                                )}
                                                <span>•</span>
                                                <span>{order.purchaseDate}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-slate-900">${(order.priceUSD * order.quantity).toFixed(2)}</div>
                                            <div className="text-xs text-slate-400">单价: ${order.priceUSD} x {order.quantity}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <MapPin size={14} className="mt-0.5 text-indigo-400 shrink-0" />
                                            <span className="line-clamp-2 leading-relaxed">{order.buyerAddress}</span>
                                        </div>

                                        {/* Tracking Numbers Section */}
                                        <div className="flex flex-col gap-2">
                                            {order.trackingNumber && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-slate-500 font-medium w-16">发货单号:</span>
                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono border border-indigo-100 flex-1 truncate">{order.trackingNumber}</span>
                                                    <button 
                                                        onClick={(e) => open17Track(order.trackingNumber!, e)}
                                                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline shrink-0"
                                                    >
                                                        <Truck size={12} /> 查询
                                                    </button>
                                                </div>
                                            )}
                                            {order.supplierTrackingNumber && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-slate-500 font-medium w-16">采购单号:</span>
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono border border-slate-200 flex-1 truncate">{order.supplierTrackingNumber}</span>
                                                    <button 
                                                        onClick={(e) => open17Track(order.supplierTrackingNumber!, e)}
                                                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium hover:underline shrink-0"
                                                    >
                                                        <Truck size={12} /> 查询
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {renderTimeline(order.status)}

                                <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100 mt-2">
                                    <button 
                                        onClick={(e) => handleGenerateUpdate(order, e)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                    >
                                        {generatingId === order.id ? <Loader2 className="animate-spin" size={14} /> : <MessageSquare size={14} />}
                                        生成通知
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(order.id, e)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        删除
                                    </button>
                                </div>
                            </div>
                        </div>
                        </div>
                    ))}
                </div>
            ) : (
                // TABLE VIEW
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 w-1/3">商品信息</th>
                                    <th className="px-6 py-4">状态</th>
                                    <th className="px-6 py-4">金额</th>
                                    <th className="px-6 py-4 w-1/4">收货信息</th>
                                    <th className="px-6 py-4">物流</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOrders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        onClick={() => onEdit(order)}
                                        className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                                                    {order.imageUrl ? (
                                                        <img src={order.imageUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package size={16} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">{order.itemName}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {order.platform}
                                                        {order.platformOrderId && <span className="text-slate-400 ml-1 font-mono">#{order.platformOrderId}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">${(order.priceUSD * order.quantity).toFixed(2)}</div>
                                            <div className="text-xs text-slate-400">${order.priceUSD} x {order.quantity}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="line-clamp-2 text-slate-600 text-xs leading-relaxed" title={order.buyerAddress}>
                                                {order.buyerAddress}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {order.trackingNumber && (
                                                    <button 
                                                        onClick={(e) => open17Track(order.trackingNumber!, e)}
                                                        className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors font-mono w-full"
                                                        title="查询发货物流"
                                                    >
                                                        <Truck size={12} /> {order.trackingNumber}
                                                    </button>
                                                )}
                                                {order.supplierTrackingNumber && (
                                                     <button 
                                                        onClick={(e) => open17Track(order.supplierTrackingNumber!, e)}
                                                        className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors font-mono w-full mt-1"
                                                        title="查询采购物流"
                                                    >
                                                        <span className="text-[10px] text-slate-400">采:</span> {order.supplierTrackingNumber}
                                                    </button>
                                                )}
                                                {!order.trackingNumber && !order.supplierTrackingNumber && (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={(e) => handleGenerateUpdate(order, e)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="生成通知"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(order.id, e)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="删除"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN } from '../types';
import { Edit2, Trash2, Search, Box, CloudLightning, Clock, DollarSign, ExternalLink, MessageSquare, Hash, Copy, CopyPlus } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (order: Order) => void;
  onRestore?: (id: string) => void; 
  onSync: () => void;
  isSyncing: boolean;
  initialFilter?: OrderStatus | 'All';
  isTrash?: boolean;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onDuplicate, onRestore, onSync, isSyncing, initialFilter = 'All', isTrash = false }) => {
  const [filter, setFilter] = useState<OrderStatus | 'All'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  
  const filteredOrders = orders.filter(o => {
    if (!isTrash && filter !== 'All' && o.status !== filter) return false;
    const search = searchTerm.toLowerCase();
    return o.itemName.toLowerCase().includes(search) || 
           o.buyerAddress.toLowerCase().includes(search) || 
           o.clientOrderId?.toLowerCase().includes(search) || 
           (o.notes && o.notes.toLowerCase().includes(search));
  });

  const handleCopyText = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const total = (order.priceUSD * order.quantity).toFixed(2);
    const text = `📦 项目: ${order.itemName}\n🔢 数量: ${order.quantity}\n💰 价格: $${order.priceUSD} (总计: $${total})\n📍 地址: ${order.buyerAddress}${order.notes ? `\n📝 备注: ${order.notes}` : ''}`;
    
    navigator.clipboard.writeText(text).then(() => {
      // In a real app we'd use a toast, here we use a minimal visual cue if possible or just rely on the button state
      // But we have alert as fallback
      alert('订单详情已复制到剪贴板');
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
    let style = 'bg-slate-800 text-slate-400 border-slate-700';
    if (status === OrderStatus.PURCHASED) style = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    else if (status === OrderStatus.SHIPPED) style = 'bg-[#6366f1]/20 text-[#a5b4fc] border-[#6366f1]/30'; 
    else if (status === OrderStatus.READY_TO_SHIP) style = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    else if (status === OrderStatus.DELIVERED) style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    else if (status === OrderStatus.CANCELLED) style = 'bg-slate-800 text-slate-500 border-slate-700';
    
    return <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${style}`}>{OrderStatusCN[status]}</span>;
  };

  return (
    <div className="space-y-8 animate-slide-up pb-20">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative w-full md:max-w-xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500" size={16} />
            <input 
              type="text" 
              placeholder="通过单号、关键词、备注或地址搜索您的项目资产..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-16 pr-6 py-4 bg-[#0a0f1d]/60 border border-white/5 rounded-2xl text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/30 outline-none transition-all" 
            />
        </div>
        <div className="flex items-center gap-4">
            {!isTrash && (
              <div className="flex p-1.5 premium-glass rounded-2xl border-white/5 bg-slate-900/40">
                 {['All', ...Object.values(OrderStatus)].map((s: any) => (
                    <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>
                        {s === 'All' ? '全部项目' : OrderStatusCN[s as OrderStatus]}
                    </button>
                 ))}
              </div>
            )}
            <button onClick={onSync} disabled={isSyncing} className="p-4 premium-glass border-white/5 rounded-2xl text-indigo-400 hover:bg-white/5 transition-all">
                <CloudLightning size={18} className={isSyncing ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      {/* List Area */}
      <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map(order => (
            <div key={order.id} onClick={() => !isTrash && onEdit(order)} className="group relative p-6 md:p-8 premium-glass rounded-[2.5rem] border-white/5 hover:border-white/15 transition-all cursor-pointer flex flex-col lg:flex-row items-center gap-10">
                
                {/* Thumbnail & Quantity Badge */}
                <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-[1.8rem] bg-[#0d1425] flex items-center justify-center text-slate-800 overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-2xl">
                        {order.imageUrl ? (
                          <img src={order.imageUrl} alt={order.itemName} className="w-full h-full object-cover" />
                        ) : (
                          <Box size={36} strokeWidth={1} />
                        )}
                        <div className="absolute bottom-1 right-1 bg-[#1e293b] text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#1e293b] shadow-inner">
                            {order.quantity}
                        </div>
                    </div>
                </div>
                
                {/* Info Section */}
                <div className="flex-1 min-w-0 space-y-4 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <h3 className="text-xl font-display font-bold text-slate-100 truncate max-w-sm">{order.itemName}</h3>
                        <div className="flex justify-center lg:justify-start">{getStatusBadge(order.status)}</div>
                    </div>
                    
                    <div className="flex flex-wrap justify-center lg:justify-start items-center gap-5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        <div className="flex items-center gap-2">
                          <DollarSign size={13} className="text-indigo-500" /> 
                          <span className="text-slate-300 font-display font-bold">${(order.priceUSD * order.quantity).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash size={12} className="text-slate-700" />
                          <span className="text-slate-400 font-mono tracking-tighter">
                            {order.platformOrderId || order.clientOrderId || '未分配内部号'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                           <ExternalLink size={12} />
                           <span className="bg-white/5 px-2 py-0.5 rounded text-[9px] font-black text-slate-400">{order.platform?.toUpperCase() || 'EXTERNAL'}</span>
                        </div>
                    </div>

                    {/* Notes Tag */}
                    {order.notes && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#fef3c7]/5 border border-[#fef3c7]/10 rounded-xl text-[10px] font-bold text-[#fbbf24]/80">
                        <MessageSquare size={12} className="fill-[#fbbf24]/20" />
                        <span>{order.notes}</span>
                      </div>
                    )}
                </div>

                {/* Address Section */}
                <div className="w-full lg:w-72 px-8 py-6 rounded-[2.5rem] bg-slate-900/30 border border-white/5 space-y-1 shrink-0 group-hover:bg-slate-900/50 transition-colors">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">收货目的地</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-medium">
                      {order.buyerAddress}
                    </p>
                </div>

                {/* Logistics Details */}
                <div className="w-full lg:w-48 space-y-4 shrink-0 pr-4">
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest text-right">采购物流追踪</p>
                        <p className={`text-[11px] text-right font-mono truncate ${order.supplierTrackingNumber ? 'text-slate-400' : 'text-slate-700 italic'}`}>
                          {order.supplierTrackingNumber || '待录入'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest text-right">国际转运单号</p>
                        <p className={`text-[11px] text-right font-mono truncate ${order.trackingNumber ? 'text-indigo-400/80' : 'text-slate-700 italic'}`}>
                          {order.trackingNumber || '待录入'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-l border-white/5 pl-8 shrink-0">
                    {isTrash ? (
                        <button onClick={(e) => { e.stopPropagation(); onRestore?.(order.id); }} className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all"><Clock size={18}/></button>
                    ) : (
                        <>
                            <button 
                              onClick={(e) => handleCopyText(e, order)}
                              title="复制文本到剪贴板"
                              className="p-4 bg-white/5 text-slate-600 hover:bg-white/10 hover:text-indigo-400 rounded-2xl transition-all border border-white/5"
                            >
                              <Copy size={16}/>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDuplicate?.(order); }}
                              title="使用此订单作为模板新建"
                              className="p-4 bg-white/5 text-slate-600 hover:bg-white/10 hover:text-emerald-400 rounded-2xl transition-all border border-white/5"
                            >
                              <CopyPlus size={16}/>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                              className="p-4 bg-white/5 text-slate-600 hover:bg-white/10 hover:text-white rounded-2xl transition-all border border-white/5"
                            >
                              <Edit2 size={16}/>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} 
                              className="p-4 bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-500/10"
                            >
                              <Trash2 size={16}/>
                            </button>
                        </>
                    )}
                </div>
            </div>
          ))}
      </div>
    </div>
  );
};

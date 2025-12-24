import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderStatusCN } from '../types';
import { Edit2, Trash2, Search, Box, CloudLightning, Clock, DollarSign, ExternalLink, MessageSquare, Hash, Copy, CopyPlus, Download, Upload, FileJson, Globe } from 'lucide-react';
import { exportToCSV, parseCSV } from '../services/csvService';
import { exportToJSON, parseJSONFile } from '../services/dataService';

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (order: Order) => void;
  onRestore?: (id: string) => void; 
  onSync: () => void;
  onImport?: (data: any[], format: 'csv' | 'json') => void;
  isSyncing: boolean;
  initialFilter?: OrderStatus | 'All';
  isTrash?: boolean;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onDuplicate, onRestore, onSync, onImport, isSyncing, initialFilter = 'All', isTrash = false }) => {
  const [filter, setFilter] = useState<OrderStatus | 'All'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  
  const filteredOrders = orders.filter(o => {
    if (!isTrash && filter !== 'All' && o.status !== filter) return false;
    const search = searchTerm.toLowerCase();
    return o.itemName.toLowerCase().includes(search) || 
           o.buyerAddress.toLowerCase().includes(search) || 
           o.clientOrderId?.toLowerCase().includes(search) || 
           (o.notes && o.notes.toLowerCase().includes(search)) ||
           (o.platform && o.platform.toLowerCase().includes(search));
  });

  const handleExportCSV = () => {
    const headers = ['ID', '商品名称', '数量', '美金单价', '收货地址', '采购日期', '平台', '平台单号', '内部单号', '状态', '物流单号', '供应商单号', '备注', '最后更新'];
    const keys = ['id', 'itemName', 'quantity', 'priceUSD', 'buyerAddress', 'purchaseDate', 'platform', 'platformOrderId', 'clientOrderId', 'status', 'trackingNumber', 'supplierTrackingNumber', 'notes', 'lastUpdated'];
    const filename = `探行科技_订单导出_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(orders, headers, keys, filename);
  };

  const handleExportJSON = () => {
    const filename = `探行科技_订单导出_${new Date().toISOString().split('T')[0]}.json`;
    exportToJSON(orders, filename);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      try {
        const data = await parseCSV(file);
        onImport(data, 'csv');
      } catch (err) {
        alert('CSV 解析失败');
      }
      e.target.value = '';
    }
  };

  const handleJSONImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      try {
        const data = await parseJSONFile(file);
        onImport(data, 'json');
      } catch (err) {
        alert('JSON 解析失败');
      }
      e.target.value = '';
    }
  };

  const handleCopyText = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const total = (order.priceUSD * order.quantity).toFixed(2);
    const text = `📦 项目: ${order.itemName}\n🔢 数量: ${order.quantity}\n💰 价格: $${order.priceUSD} (总计: $${total})\n📍 地址: ${order.buyerAddress}${order.notes ? `\n📝 备注: ${order.notes}` : ''}`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert('订单详情已复制到剪贴板');
    });
  };

  const handleTrackClick = (e: React.MouseEvent, num: string) => {
    e.stopPropagation();
    if (num) {
      window.open(`https://www.17track.net/zh-cn/track?nums=${num}`, '_blank');
    }
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
      <input type="file" ref={csvInputRef} onChange={handleCSVImport} accept=".csv" className="hidden" />
      <input type="file" ref={jsonInputRef} onChange={handleJSONImport} accept=".json" className="hidden" />

      {/* Search & Action Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="relative w-full md:max-w-xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500" size={16} />
            <input 
              type="text" 
              placeholder="搜索项目关键词、单号、平台或备注..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-16 pr-6 py-4 bg-[#0a0f1d]/60 border border-white/5 rounded-2xl text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/30 outline-none transition-all" 
            />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-center xl:justify-end">
            {!isTrash && (
              <>
                <div className="flex p-1.5 premium-glass rounded-2xl border-white/5 bg-slate-900/40">
                  {['All', ...Object.values(OrderStatus)].map((s: any) => (
                      <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>
                          {s === 'All' ? '全部项目' : OrderStatusCN[s as OrderStatus]}
                      </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <div className="flex premium-glass rounded-2xl border-white/5 overflow-hidden">
                    <button onClick={() => csvInputRef.current?.click()} title="导入 CSV" className="p-4 text-slate-400 hover:text-white hover:bg-white/5 transition-all border-r border-white/5">
                        <Upload size={18} />
                    </button>
                    <button onClick={() => jsonInputRef.current?.click()} title="导入 JSON" className="p-4 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-all">
                        <FileJson size={18} />
                    </button>
                  </div>
                  
                  <div className="flex premium-glass rounded-2xl border-white/5 overflow-hidden">
                    <button onClick={handleExportCSV} title="导出 CSV" className="p-4 text-emerald-400 hover:bg-emerald-500/10 transition-all border-r border-white/5">
                        <Download size={18} />
                    </button>
                    <button onClick={handleExportJSON} title="导出 JSON" className="p-4 text-emerald-400 hover:bg-emerald-500/10 transition-all">
                        <FileJson size={18} />
                    </button>
                  </div>

                  <button onClick={onSync} disabled={isSyncing} title="同步物流" className="p-4 premium-glass border-white/5 rounded-2xl text-indigo-400 hover:bg-white/5 transition-all">
                      <CloudLightning size={18} className={isSyncing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {filteredOrders.length > 0 ? filteredOrders.map(order => (
            <div key={order.id} onClick={() => !isTrash && onEdit(order)} className="group relative p-6 md:p-8 premium-glass rounded-[2.5rem] border-white/5 hover:border-white/15 transition-all cursor-pointer flex flex-col lg:flex-row items-center gap-10">
                
                {/* Thumbnail */}
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
                
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-4 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <h3 className="text-xl font-display font-bold text-slate-100 truncate max-w-sm">{order.itemName}</h3>
                        <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2">
                            {getStatusBadge(order.status)}
                            {order.platform && (
                              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-indigo-500/5 text-slate-400 border border-white/5 uppercase tracking-wider flex items-center gap-1.5 group-hover:text-indigo-400/80 transition-colors">
                                <Globe size={10} className="text-indigo-400/40" />
                                {order.platform}
                              </span>
                            )}
                        </div>
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
                    </div>

                    {order.notes && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#fef3c7]/5 border border-[#fef3c7]/10 rounded-xl text-[10px] font-bold text-[#fbbf24]/80">
                        <MessageSquare size={12} className="fill-[#fbbf24]/20" />
                        <span>{order.notes}</span>
                      </div>
                    )}
                </div>

                {/* Address */}
                <div className="w-full lg:w-72 px-8 py-6 rounded-[2.5rem] bg-slate-900/30 border border-white/5 space-y-1 shrink-0 group-hover:bg-slate-900/50 transition-colors">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">收货目的地</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-medium">{order.buyerAddress}</p>
                </div>

                {/* Logistics */}
                <div className="w-full lg:w-48 space-y-4 shrink-0 pr-4">
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest text-right">商家物流</p>
                        {/* 由于数据反转，商家物流现在对应 trackingNumber */}
                        {order.trackingNumber ? (
                          <button 
                            onClick={(e) => handleTrackClick(e, order.trackingNumber!)}
                            className="w-full text-[11px] text-right font-mono truncate text-slate-400 hover:text-indigo-400 hover:underline transition-all block"
                            title="点击追踪商家物流"
                          >
                            {order.trackingNumber}
                          </button>
                        ) : (
                          <p className="text-[11px] text-right font-mono truncate text-slate-400">待录入</p>
                        )}
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest text-right">国际运单</p>
                        {/* 由于数据反转，国际运单现在对应 supplierTrackingNumber */}
                        {order.supplierTrackingNumber ? (
                          <button 
                            onClick={(e) => handleTrackClick(e, order.supplierTrackingNumber!)}
                            className="w-full text-[11px] text-right font-mono truncate text-indigo-400/80 hover:text-indigo-400 hover:underline transition-all block"
                            title="点击追踪国际运单"
                          >
                            {order.supplierTrackingNumber}
                          </button>
                        ) : (
                          <p className="text-[11px] text-right font-mono truncate text-indigo-400/80">待录入</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-l border-white/5 pl-8 shrink-0">
                    {isTrash ? (
                        <button onClick={(e) => { e.stopPropagation(); onRestore?.(order.id); }} className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all"><Clock size={18}/></button>
                    ) : (
                        <>
                            <button onClick={(e) => handleCopyText(e, order)} title="复制文本" className="p-4 bg-white/5 text-slate-600 hover:bg-white/10 hover:text-indigo-400 rounded-2xl transition-all">
                              <Copy size={16}/>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDuplicate?.(order); }} title="设为模板" className="p-4 bg-white/5 text-slate-600 hover:bg-white/10 hover:text-emerald-400 rounded-2xl transition-all">
                              <CopyPlus size={16}/>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(order); }} className="p-4 bg-white/5 text-slate-600 hover:bg-white/10 hover:text-white rounded-2xl transition-all">
                              <Edit2 size={16}/>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} className="p-4 bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white rounded-2xl transition-all">
                              <Trash2 size={16}/>
                            </button>
                        </>
                    )}
                </div>
            </div>
          )) : (
            <div className="py-32 flex flex-col items-center justify-center premium-glass rounded-[3rem] border-white/5">
                <Box size={48} className="text-slate-800 mb-6 opacity-40" />
                <h3 className="text-xl font-display font-bold text-slate-500">队列为空</h3>
                <p className="text-xs text-slate-600 mt-2 uppercase tracking-widest">目前没有任何项目记录</p>
            </div>
          )}
      </div>
    </div>
  );
};
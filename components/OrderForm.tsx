import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN, Customer } from '../types.ts';
import { parseOrderText, parseOrderImage } from '../services/geminiService.ts';
import { Wand2, Save, X, Loader2, UploadCloud, FileText, ChevronRight, Truck, ShoppingCart, Image as ImageIcon, Users, Package, MapPin, Tag, Hash, Calendar, ShoppingBag, Sparkles } from 'lucide-react';

interface OrderFormProps {
  initialOrder?: Order | null;
  customers?: Customer[];
  onSave: (order: Order) => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialOrder, customers = [], onSave, onCancel }) => {
  const defaultFormData: Partial<Order> = {
    status: OrderStatus.PENDING,
    quantity: 1,
    purchaseDate: new Date().toISOString().split('T')[0],
    itemName: '',
    priceUSD: 0,
    buyerAddress: '',
    platform: '',
    platformOrderId: '',
    clientOrderId: '',
    trackingNumber: '',
    supplierTrackingNumber: '',
    imageUrl: '',
    notes: ''
  };

  const [formData, setFormData] = useState<Partial<Order>>(defaultFormData);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrder) { setFormData(initialOrder); } 
    else { setFormData(defaultFormData); }
  }, [initialOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'priceUSD' ? parseFloat(value) : value
    }));
  };

  const handleAiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { setAiImagePreview(reader.result as string); setAiInput(''); };
          reader.readAsDataURL(file);
      }
  };

  const handleAiParse = async () => {
    if (!aiInput.trim() && !aiImagePreview) return;
    setIsAiLoading(true);
    setError('');
    try {
      let parsedData;
      if (aiImagePreview) { parsedData = await parseOrderImage(aiImagePreview); } 
      else { parsedData = await parseOrderText(aiInput); }
      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          ...parsedData,
          status: prev.status || OrderStatus.PENDING,
          imageUrl: (aiImagePreview && !prev.imageUrl) ? aiImagePreview : prev.imageUrl
        }));
        setAiImagePreview(null);
        setAiInput('');
      } else { setError('未能识别有效信息'); }
    } catch (err) { setError('识别失败'); } finally { setIsAiLoading(false); }
  };

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customer = customers.find(c => c.id === customerId);
    if (customer) { setFormData(prev => ({ ...prev, buyerAddress: `${customer.name} ${customer.phone || ''}\n${customer.address}` })); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || !formData.buyerAddress) { setError('请确保填写商品名称和收货地址'); return; }
    onSave({
      id: initialOrder?.id || crypto.randomUUID(),
      lastUpdated: new Date().toISOString(),
      itemName: formData.itemName || '',
      quantity: formData.quantity || 1,
      priceUSD: formData.priceUSD || 0,
      buyerAddress: formData.buyerAddress || '',
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      platform: formData.platform || '其他',
      platformOrderId: formData.platformOrderId || '',
      clientOrderId: formData.clientOrderId || '',
      status: formData.status || OrderStatus.PENDING,
      trackingNumber: formData.trackingNumber || '',
      supplierTrackingNumber: formData.supplierTrackingNumber || '',
      imageUrl: formData.imageUrl || '',
      notes: formData.notes || ''
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-2 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {initialOrder ? '编辑订单' : '录入新订单'}
            </h2>
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
            </button>
        </div>

        <div className="p-8">
            {/* AI Parsing Section */}
            {!initialOrder && (
                <div className="mb-10 bg-[#f0f4ff] dark:bg-indigo-950/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/50 flex flex-col md:flex-row gap-5">
                    <div className="flex-1 relative">
                        {aiImagePreview ? (
                            <div className="h-32 bg-white dark:bg-slate-800 border rounded-xl flex items-center justify-center p-3 relative">
                                <img src={aiImagePreview} className="h-full object-contain rounded" />
                                <button onClick={() => setAiImagePreview(null)} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <textarea 
                                value={aiInput} 
                                onChange={(e) => setAiInput(e.target.value)} 
                                placeholder="粘贴订单文本或上传截图自动识别..." 
                                className="w-full p-4 text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl h-32 resize-none focus:ring-2 focus:ring-indigo-100 outline-none" 
                            />
                        )}
                    </div>
                    <div className="flex flex-col gap-3 shrink-0 md:w-36">
                        <label className="flex-1 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white/80 dark:bg-slate-800/50 hover:bg-white transition-all group">
                            <ImageIcon size={24} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-indigo-600 mt-2 tracking-tight">上传截图</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleAiImageUpload} />
                        </label>
                        <button 
                            onClick={handleAiParse} 
                            disabled={isAiLoading || (!aiInput && !aiImagePreview)} 
                            className="h-12 bg-indigo-500/80 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isAiLoading ? '识别中...' : '开始识别'}
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Left Column: Procurement */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <ShoppingCart size={18} className="text-indigo-600" />
                            </div>
                            <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">货物与采购</h3>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    商品名称 *
                                </label>
                                <input 
                                    type="text" 
                                    name="itemName" 
                                    value={formData.itemName} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="输入商品名称"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-none text-slate-800 dark:text-white font-medium" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">数量</label>
                                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">单价 (USD)</label>
                                    <input type="number" name="priceUSD" value={formData.priceUSD} onChange={handleChange} step="0.01" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">采购平台</label>
                                    <input type="text" name="platform" value={formData.platform} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">平台采购跟踪号</label>
                                    <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} placeholder="采购平台物流面单" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl font-mono text-sm outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">采购内部单号</label>
                                <input type="text" name="clientOrderId" value={formData.clientOrderId} onChange={handleChange} placeholder="您的内部参考单号" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl font-mono text-sm outline-none text-slate-600" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">备注</label>
                                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl resize-none outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Logistics */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Truck size={18} className="text-blue-600" />
                            </div>
                            <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">物流与收货</h3>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">收货地址 *</label>
                                    <div className="relative group">
                                        <select onChange={handleCustomerSelect} className="text-[11px] bg-slate-800 text-white rounded-md px-3 py-1.5 appearance-none pr-8 cursor-pointer hover:bg-slate-700 transition-colors font-bold border-none">
                                            <option value="">从客户库选择...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <ChevronRight size={14} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none opacity-50 text-white" />
                                    </div>
                                </div>
                                <textarea 
                                    name="buyerAddress" 
                                    value={formData.buyerAddress} 
                                    onChange={handleChange} 
                                    rows={5} 
                                    required 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-400" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">订单状态</label>
                                    <div className="relative">
                                        <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl appearance-none outline-none font-medium">
                                            {Object.values(OrderStatus).map(s => <option key={s} value={s}>{OrderStatusCN[s]}</option>)}
                                        </select>
                                        <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">采购日期</label>
                                    <div className="relative">
                                        <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none font-medium" />
                                        <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">商家自发货单号</label>
                                <input 
                                    type="text" 
                                    name="supplierTrackingNumber" 
                                    value={formData.supplierTrackingNumber} 
                                    onChange={handleChange} 
                                    placeholder="商家自发货物流面单" 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-400" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">平台单号 (TikTok)</label>
                                <input 
                                    type="text" 
                                    name="platformOrderId" 
                                    value={formData.platformOrderId} 
                                    onChange={handleChange} 
                                    placeholder="TikTok 订单 ID" 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-400" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800 pt-10">
                    <button type="button" onClick={onCancel} className="px-8 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                        取消
                    </button>
                    <button type="submit" className="px-12 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-xl shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2">
                        <Save size={18} />
                        保存订单
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN, Customer } from '../types';
import { parseOrderText, parseOrderImage } from '../services/geminiService';
import { Save, X, Loader2, Image as ImageIcon, Sparkles, Truck, ShoppingBag, Hash, MapPin } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto py-2 animate-fade-in">
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
        <div className="p-8 space-y-10">
            {!initialOrder && (
                <div className="bg-indigo-950/20 rounded-2xl p-6 border border-indigo-900/30 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 relative">
                        {aiImagePreview ? (
                            <div className="h-32 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center p-3 relative">
                                <img src={aiImagePreview} className="h-full object-contain rounded" alt="AI Preview" />
                                <button onClick={() => setAiImagePreview(null)} className="absolute top-2 right-2 p-1.5 bg-red-900/80 text-white rounded-full hover:bg-red-800 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <textarea 
                                value={aiInput} 
                                onChange={(e) => setAiInput(e.target.value)} 
                                placeholder="粘贴订单文本或上传截图自动识别..." 
                                className="w-full p-4 text-sm bg-slate-950/40 text-slate-100 placeholder-slate-600 border border-slate-800 rounded-xl h-32 resize-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all" 
                            />
                        )}
                        {error && <p className="absolute -bottom-6 left-1 text-[10px] text-red-400 font-bold">{error}</p>}
                    </div>
                    <div className="flex flex-col gap-3 shrink-0 md:w-40">
                        <label className="flex-1 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-slate-900/40 hover:bg-slate-800 transition-all group">
                            <ImageIcon size={24} className="text-slate-500 group-hover:text-indigo-400" />
                            <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">上传截图</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleAiImageUpload} />
                        </label>
                        <button 
                            type="button"
                            onClick={handleAiParse} 
                            disabled={isAiLoading || (!aiInput && !aiImagePreview)} 
                            className="h-12 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-30 shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2"
                        >
                            {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isAiLoading ? '解析中' : '智能识别'}
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <ShoppingBag size={20} className="text-indigo-500" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">采购详细信息</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">商品名称 *</label>
                                <input 
                                    type="text" 
                                    name="itemName" 
                                    value={formData.itemName} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="输入商品全称"
                                    className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none text-slate-100 font-medium transition-all" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">采购数量</label>
                                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">美金单价 (USD)</label>
                                    <input type="number" name="priceUSD" value={formData.priceUSD} onChange={handleChange} step="0.01" className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">采购平台</label>
                                    <input type="text" name="platform" value={formData.platform} onChange={handleChange} placeholder="如: AliExpress" className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">平台采购跟踪号</label>
                                    <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl font-mono text-sm text-slate-100 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">采购内部单号</label>
                                <input type="text" name="clientOrderId" value={formData.clientOrderId} onChange={handleChange} placeholder="CG-XXXX" className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl font-mono text-sm text-indigo-400 outline-none" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">备注</label>
                                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl resize-none outline-none text-slate-300" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <Truck size={20} className="text-blue-500" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">收货物流信息</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">收货地址 *</label>
                                    <select onChange={handleCustomerSelect} className="text-[10px] bg-slate-800 text-slate-100 rounded-lg px-2 py-1 appearance-none border-none outline-none ring-1 ring-slate-700">
                                        <option value="">快速选择客户...</option>
                                        {customers.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                    </select>
                                </div>
                                <textarea 
                                    name="buyerAddress" 
                                    value={formData.buyerAddress} 
                                    onChange={handleChange} 
                                    rows={5} 
                                    required 
                                    className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 text-slate-100 rounded-2xl resize-none outline-none focus:border-blue-500 transition-all" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">订单状态</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 outline-none font-bold appearance-none">
                                        {Object.values(OrderStatus).map(s => <option key={s} value={s} className="bg-slate-900">{OrderStatusCN[s]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">采购日期</label>
                                    <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-100 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">商家自发货单号</label>
                                <input type="text" name="supplierTrackingNumber" value={formData.supplierTrackingNumber} onChange={handleChange} placeholder="物流单号" className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 text-slate-100 rounded-2xl font-mono text-sm outline-none" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">TikTok 平台单号</label>
                                <input type="text" name="platformOrderId" value={formData.platformOrderId} onChange={handleChange} className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 text-slate-100 rounded-2xl font-mono text-sm outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-6 border-t border-slate-800 pt-10">
                    <button type="button" onClick={onCancel} className="px-8 py-4 text-xs font-bold text-slate-500 hover:text-slate-200 transition-all uppercase tracking-widest">取消</button>
                    <button type="submit" className="px-14 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-3">
                        <Save size={18} />
                        保存并同步
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
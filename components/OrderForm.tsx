import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN, Customer } from '../types';
import { parseOrderText, parseOrderImage } from '../services/geminiService';
import { Save, X, Loader2, Image as ImageIcon, Sparkles, Truck, ShoppingBag, ExternalLink, Search } from 'lucide-react';

interface OrderFormProps {
  initialOrder?: Order | null;
  customers?: Customer[];
  onSave: (order: Order) => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialOrder, customers = [], onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Order>>({
    status: OrderStatus.PENDING,
    quantity: 1,
    purchaseDate: new Date().toISOString().split('T')[0],
    itemName: '',
    priceUSD: 0,
    buyerAddress: '',
    platform: '',
    trackingNumber: '',
    supplierTrackingNumber: '',
    platformOrderId: '',
    clientOrderId: '',
  });
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (initialOrder) setFormData({ ...formData, ...initialOrder });
  }, [initialOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'priceUSD' ? parseFloat(value) : value
    }));
  };

  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const parsedData = await parseOrderText(aiInput);
      if (parsedData) {
        setFormData(prev => ({ ...prev, ...parsedData }));
        setAiInput('');
      }
    } finally { setIsAiLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: initialOrder?.id || crypto.randomUUID(),
      lastUpdated: new Date().toISOString(),
    } as Order);
  };

  const openTrack = (num?: string) => {
    if (!num) return;
    window.open(`https://www.17track.net/zh-cn/track?nums=${num}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto py-2 animate-fade-in">
      <div className="glass-card rounded-3xl p-8 space-y-10">
        {!initialOrder && (
            <div className="bg-indigo-500/10 rounded-2xl p-6 border border-indigo-500/10 flex flex-col md:flex-row gap-4">
                <textarea 
                    value={aiInput} 
                    onChange={(e) => setAiInput(e.target.value)} 
                    placeholder="粘贴订单信息，AI 自动识别..." 
                    className="flex-1 p-4 text-sm bg-black/10 border border-white/5 rounded-xl h-24 resize-none focus:border-indigo-500 outline-none transition-all" 
                />
                <button onClick={handleAiParse} disabled={isAiLoading || !aiInput} className="px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-30 transition-all font-bold text-sm flex items-center justify-center gap-2">
                    {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    智能解析
                </button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h3 className="text-sm font-bold opacity-30 uppercase tracking-widest flex items-center gap-2"><ShoppingBag size={14}/> 基本信息</h3>
                    <div className="space-y-4">
                        <input name="itemName" value={formData.itemName} onChange={handleChange} placeholder="商品名称" required className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none focus:border-indigo-500" />
                        <div className="flex gap-4">
                            <input name="quantity" type="number" value={formData.quantity} onChange={handleChange} placeholder="数量" className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none" />
                            <input name="priceUSD" type="number" step="0.01" value={formData.priceUSD} onChange={handleChange} placeholder="单价(USD)" className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none" />
                        </div>
                        <input name="platform" value={formData.platform} onChange={handleChange} placeholder="采购平台" className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none" />
                        
                        <div className="relative group">
                            <input name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} placeholder="平台采购跟踪号" className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none pr-12" />
                            <button type="button" onClick={() => openTrack(formData.trackingNumber)} disabled={!formData.trackingNumber} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-indigo-400 disabled:opacity-0 transition-all">
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-sm font-bold opacity-30 uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> 物流状态</h3>
                    <div className="space-y-4">
                        <div className="relative group">
                            <input name="supplierTrackingNumber" value={formData.supplierTrackingNumber} onChange={handleChange} placeholder="商家自发货单号" className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none pr-12" />
                            <button type="button" onClick={() => openTrack(formData.supplierTrackingNumber)} disabled={!formData.supplierTrackingNumber} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-indigo-400 disabled:opacity-0 transition-all">
                                <ExternalLink size={16} />
                            </button>
                        </div>
                        <textarea name="buyerAddress" value={formData.buyerAddress} onChange={handleChange} placeholder="收货详细地址" rows={4} className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none focus:border-indigo-500 resize-none" />
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full px-5 py-3 bg-black/10 border border-white/5 rounded-xl outline-none appearance-none">
                            {Object.values(OrderStatus).map(s => <option key={s} value={s} className="bg-slate-900">{OrderStatusCN[s]}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-white/5 pt-8">
                <button type="button" onClick={onCancel} className="px-6 py-3 font-bold opacity-40 hover:opacity-100">取消</button>
                <button type="submit" className="px-10 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold shadow-lg transition-all">保存订单</button>
            </div>
        </form>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN, Customer } from '../types.ts';
import { parseOrderText, parseOrderImage } from '../services/geminiService.ts';
import { Wand2, Save, X, Loader2, UploadCloud, FileText, ChevronRight, Truck, ShoppingCart, Image as ImageIcon, Users } from 'lucide-react';

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

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData(prev => ({ ...prev, imageUrl: reader.result as string })); };
      reader.readAsDataURL(file);
    }
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
    if (!formData.itemName || !formData.buyerAddress) { setError('必填项缺失'); return; }
    onSave({
      id: initialOrder?.id || crypto.randomUUID(),
      lastUpdated: new Date().toISOString(),
      itemName: formData.itemName || '',
      quantity: formData.quantity || 1,
      priceUSD: formData.priceUSD || 0,
      buyerAddress: formData.buyerAddress || '',
      purchaseDate: formData.purchaseDate || new Date().toISOString(),
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
    <div className="max-w-6xl mx-auto my-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-8 py-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">{initialOrder ? '编辑订单' : '录入新订单'}</h2>
            <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-8">
            {!initialOrder && (
                <div className="mb-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-6 border border-indigo-100 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        {aiImagePreview ? (
                            <div className="h-24 bg-white border rounded-lg flex items-center justify-center p-2"><img src={aiImagePreview} className="h-full object-contain" /><button onClick={()=>setAiImagePreview(null)} className="ml-4 text-xs text-red-500">移除图片</button></div>
                        ) : (
                            <textarea value={aiInput} onChange={(e)=>setAiInput(e.target.value)} placeholder="粘贴订单文本或上传截图自动识别..." className="w-full p-3 text-sm border rounded-lg h-24 resize-none" />
                        )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 md:w-32">
                        <label className="flex-1 border-2 border-dashed border-indigo-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50"><ImageIcon size={20} className="text-indigo-400"/><span className="text-[10px] mt-1">上传截图</span><input type="file" className="hidden" accept="image/*" onChange={handleAiImageUpload} /></label>
                        <button onClick={handleAiParse} disabled={isAiLoading || (!aiInput && !aiImagePreview)} className="h-10 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">{isAiLoading ? '识别中...' : '开始识别'}</button>
                    </div>
                </div>
            )}
            {error && <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2"><FileText size={18} className="text-indigo-500" /><h3 className="text-sm font-bold uppercase tracking-wider">货物与采购</h3></div>
                        <div><label className="block text-sm font-bold mb-2">商品名称 *</label><input type="text" name="itemName" value={formData.itemName} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-100" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold mb-2">数量</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className="w-full px-4 py-2 border rounded-lg" /></div>
                            <div><label className="block text-sm font-bold mb-2">单价 (USD)</label><input type="number" name="priceUSD" value={formData.priceUSD} onChange={handleChange} step="0.01" className="w-full px-4 py-2 border rounded-lg" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold mb-2">采购平台</label><input type="text" name="platform" value={formData.platform} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" /></div>
                            <div><label className="block text-sm font-bold mb-2">采购平台单号</label><input type="text" name="platformOrderId" value={formData.platformOrderId} onChange={handleChange} placeholder="商家提供的订单ID" className="w-full px-4 py-2 border rounded-lg font-mono" /></div>
                        </div>
                        <div><label className="block text-sm font-bold mb-2">采购内部单号</label><input type="text" name="clientOrderId" value={formData.clientOrderId} onChange={handleChange} placeholder="您的内部参考单号" className="w-full px-4 py-2 border rounded-lg font-mono" /></div>
                        <div><label className="block text-sm font-bold mb-2">备注</label><input type="text" name="notes" value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-bold mb-2">商品图片</label><div className="flex gap-4"><label className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50"><UploadCloud className="text-slate-400"/><input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} /></label>{formData.imageUrl && <div className="w-24 h-24 border rounded-lg overflow-hidden relative"><img src={formData.imageUrl} className="w-full h-full object-cover" /><button type="button" onClick={()=>setFormData({...formData, imageUrl:''})} className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg"><X size={10}/></button></div>}</div></div>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2"><Truck size={18} className="text-indigo-500" /><h3 className="text-sm font-bold uppercase tracking-wider">物流与收货</h3></div>
                        <div><div className="flex justify-between items-center mb-2"><label className="block text-sm font-bold">收货地址 *</label><select onChange={handleCustomerSelect} className="text-xs border rounded p-1"><option value="">从客户库选择...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><textarea name="buyerAddress" value={formData.buyerAddress} onChange={handleChange} rows={5} required className="w-full px-4 py-2 border rounded-lg resize-none" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold mb-2">订单状态</label><select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">{Object.values(OrderStatus).map(s=><option key={s} value={s}>{OrderStatusCN[s]}</option>)}</select></div>
                            <div><label className="block text-sm font-bold mb-2">采购日期</label><input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" /></div>
                        </div>
                        <div><label className="block text-sm font-bold mb-2">商家自发货单号</label><input type="text" name="supplierTrackingNumber" value={formData.supplierTrackingNumber} onChange={handleChange} placeholder="商家自发货物流面单" className="w-full px-4 py-2 border rounded-lg font-mono" /></div>
                        <div><label className="block text-sm font-bold mb-2">平台采购跟踪号</label><input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} placeholder="TikTok/平台侧的跟踪号" className="w-full px-4 py-2 border rounded-lg font-mono" /></div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 border-t pt-8">
                    <button type="button" onClick={onCancel} className="px-6 py-2 border rounded-lg hover:bg-slate-50">取消</button>
                    <button type="submit" className="px-10 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg">保存订单</button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
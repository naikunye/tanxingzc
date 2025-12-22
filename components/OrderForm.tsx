
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN, Customer } from '../types';
import { parseOrderText, parseOrderImage } from '../services/geminiService';
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
    if (initialOrder) setFormData(initialOrder);
    else setFormData(defaultFormData);
  }, [initialOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'priceUSD' ? parseFloat(value) : value
    }));
  };

  const handleAiParse = async () => {
    if (!aiInput.trim() && !aiImagePreview) return;
    setIsAiLoading(true);
    setError('');
    try {
      const parsedData = aiImagePreview ? await parseOrderImage(aiImagePreview) : await parseOrderText(aiInput);
      if (parsedData) {
        setFormData(prev => ({ ...prev, ...parsedData, status: prev.status || OrderStatus.PENDING }));
        setAiImagePreview(null);
        setAiInput('');
      } else setError('未能识别有效信息');
    } catch (err) {
      setError('识别失败');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || !formData.buyerAddress) {
      setError('商品名称和收货地址是必填项');
      return;
    }
    const orderToSave: Order = {
      id: initialOrder?.id || crypto.randomUUID(),
      lastUpdated: new Date().toISOString(),
      itemName: formData.itemName || '',
      quantity: Number(formData.quantity) || 1,
      priceUSD: Number(formData.priceUSD) || 0,
      buyerAddress: formData.buyerAddress || '',
      purchaseDate: formData.purchaseDate || new Date().toISOString(),
      platform: formData.platform || '其他',
      platformOrderId: formData.platformOrderId || '',
      clientOrderId: formData.clientOrderId || '',
      status: (formData.status as OrderStatus) || OrderStatus.PENDING,
      trackingNumber: formData.trackingNumber || '',
      supplierTrackingNumber: formData.supplierTrackingNumber || '',
      imageUrl: formData.imageUrl || '',
      notes: formData.notes || ''
    };
    onSave(orderToSave);
  };

  return (
    <div className="max-w-6xl mx-auto my-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold">{initialOrder ? '编辑订单' : '录入新订单'}</h2>
            <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-8">
            {!initialOrder && (
                <div className="mb-10 bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 flex flex-col md:flex-row gap-4">
                    <textarea 
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        placeholder="粘贴订单文本或点击上传截图识别..."
                        className="flex-1 p-4 text-sm rounded-lg border h-[120px] focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                    <div className="flex flex-col gap-2">
                        <button onClick={handleAiParse} disabled={isAiLoading || (!aiInput && !aiImagePreview)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isAiLoading ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                            <span>智能识别</span>
                        </button>
                    </div>
                </div>
            )}

            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                    <h3 className="font-bold border-b pb-2 flex items-center gap-2"><FileText size={18}/> 核心信息</h3>
                    <input type="text" name="itemName" value={formData.itemName} onChange={handleChange} placeholder="商品名称 *" className="w-full p-3 border rounded-lg" required />
                    <div className="flex gap-4">
                        <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="数量" className="flex-1 p-3 border rounded-lg" />
                        <input type="number" name="priceUSD" value={formData.priceUSD} onChange={handleChange} placeholder="金额 (USD)" className="flex-1 p-3 border rounded-lg" />
                    </div>
                    <div className="flex gap-4">
                        <input type="text" name="platform" value={formData.platform} onChange={handleChange} placeholder="平台 (Amazon/Temu等)" className="flex-1 p-3 border rounded-lg" />
                        <input type="text" name="clientOrderId" value={formData.clientOrderId} onChange={handleChange} placeholder="客户内部单号" className="flex-1 p-3 border rounded-lg" />
                    </div>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="内部备注" className="w-full p-3 border rounded-lg h-24" />
                </div>

                <div className="space-y-6">
                    <h3 className="font-bold border-b pb-2 flex items-center gap-2"><Truck size={18}/> 物流与收货</h3>
                    <textarea name="buyerAddress" value={formData.buyerAddress} onChange={handleChange} placeholder="收货地址 *" className="w-full p-3 border rounded-lg h-32" required />
                    <div className="flex gap-4">
                        <select name="status" value={formData.status} onChange={handleChange} className="flex-1 p-3 border rounded-lg">
                            {Object.values(OrderStatus).map(s => <option key={s} value={s}>{OrderStatusCN[s]}</option>)}
                        </select>
                        <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="flex-1 p-3 border rounded-lg" />
                    </div>
                    <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} placeholder="TikTok平台单号" className="w-full p-3 border rounded-lg" />
                </div>

                <div className="lg:col-span-2 flex justify-end gap-4 pt-8 border-t">
                    <button type="button" onClick={onCancel} className="px-6 py-2 border rounded-lg">取消</button>
                    <button type="submit" className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700">保存订单</button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

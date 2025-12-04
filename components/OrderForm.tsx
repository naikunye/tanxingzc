
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderStatusCN } from '../types';
import { parseOrderText } from '../services/geminiService';
import { Wand2, Save, X, Loader2, UploadCloud, FileText, ChevronRight, Truck, ShoppingCart } from 'lucide-react';

interface OrderFormProps {
  initialOrder?: Order | null;
  onSave: (order: Order) => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialOrder, onSave, onCancel }) => {
  const defaultFormData: Partial<Order> = {
    status: OrderStatus.PENDING,
    quantity: 1,
    purchaseDate: new Date().toISOString().split('T')[0],
    itemName: '',
    priceUSD: 0,
    buyerAddress: '',
    platform: '',
    platformOrderId: '',
    trackingNumber: '',
    supplierTrackingNumber: '',
    imageUrl: '',
    notes: ''
  };

  const [formData, setFormData] = useState<Partial<Order>>(defaultFormData);
  
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialOrder) {
      setFormData(initialOrder);
    } else {
      setFormData(defaultFormData);
    }
  }, [initialOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'priceUSD' ? parseFloat(value) : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    setError('');
    try {
      const parsedData = await parseOrderText(aiInput);
      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          ...parsedData,
          status: prev.status || OrderStatus.PENDING
        }));
      }
    } catch (err) {
      setError('识别失败，请检查网络或重试');
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
      quantity: formData.quantity || 1,
      priceUSD: formData.priceUSD || 0,
      buyerAddress: formData.buyerAddress || '',
      purchaseDate: formData.purchaseDate || new Date().toISOString(),
      platform: formData.platform || '其他',
      platformOrderId: formData.platformOrderId || '',
      status: formData.status || OrderStatus.PENDING,
      trackingNumber: formData.trackingNumber || '',
      supplierTrackingNumber: formData.supplierTrackingNumber || '',
      imageUrl: formData.imageUrl || '',
      notes: formData.notes || ''
    };
    onSave(orderToSave);
  };

  return (
    <div className="max-w-4xl mx-auto my-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
          
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
                <h2 className="text-xl font-bold text-slate-900">
                {initialOrder ? '编辑订单' : '录入新订单'}
                </h2>
                <p className="text-slate-500 text-xs mt-1">请填写以下详细信息</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
            </button>
        </div>

        <div className="p-8 bg-white">
            {/* AI Parsing Section */}
            {!initialOrder && (
                <div className="mb-10 bg-indigo-50/50 rounded-xl border border-indigo-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wand2 className="text-indigo-600" size={16} />
                            <h3 className="font-semibold text-indigo-900 text-sm">智能粘贴识别</h3>
                        </div>
                        <span className="text-xs text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100 font-medium">支持 微信/Excel/文本</span>
                    </div>
                    <div className="p-6">
                        <div className="relative">
                            <textarea 
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="请粘贴任何混乱的订单文本，例如：'帮我买5个iPhone 15手机壳，发到深圳市南山区... 单价12美金，亚马逊买的，订单号123-456'"
                                className="w-full p-4 pr-32 text-sm bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none min-h-[120px] transition-all placeholder-slate-400 text-slate-900 shadow-sm"
                            />
                            <button 
                                onClick={handleAiParse}
                                disabled={isAiLoading || !aiInput}
                                className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
                            >
                                {isAiLoading ? <Loader2 className="animate-spin" size={14} /> : 'AI 自动填充'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm flex items-center gap-3">
                <div className="w-5 h-5 bg-red-200 rounded-full flex items-center justify-center text-red-700 font-bold text-xs shrink-0">!</div>
                {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                
                {/* Left Column: Product Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3 mb-6">
                        <FileText size={18} className="text-indigo-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">货物与采购</h3>
                    </div>
                    
                    <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">商品名称 <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        name="itemName" 
                        value={formData.itemName || ''} 
                        onChange={handleChange}
                        placeholder="请输入商品名称"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium shadow-sm"
                        required
                    />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">数量</label>
                            <input 
                            type="number" 
                            name="quantity" 
                            value={formData.quantity || 0} 
                            onChange={handleChange}
                            min="1"
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">单价 (USD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-slate-400 font-medium">$</span>
                                <input 
                                type="number" 
                                name="priceUSD" 
                                value={formData.priceUSD || 0} 
                                onChange={handleChange}
                                step="0.01"
                                className="w-full pl-8 px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 font-mono font-medium shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">采购平台</label>
                            <input 
                                type="text" 
                                name="platform" 
                                value={formData.platform || ''} 
                                onChange={handleChange}
                                list="platform-options"
                                placeholder="选择或输入平台"
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium shadow-sm"
                            />
                            <datalist id="platform-options">
                                <option value="Amazon">Amazon</option>
                                <option value="TikTok Shop">TikTok Shop</option>
                                <option value="eBay">eBay</option>
                                <option value="Walmart">Walmart</option>
                                <option value="Costco">Costco</option>
                                <option value="Temu">Temu</option>
                                <option value="Shein">Shein</option>
                                <option value="Best Buy">Best Buy</option>
                                <option value="Target">Target</option>
                                <option value="AliExpress">AliExpress</option>
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">平台订单号 (Order ID)</label>
                            <input 
                                type="text" 
                                name="platformOrderId" 
                                value={formData.platformOrderId || ''} 
                                onChange={handleChange}
                                placeholder="如: 114-1234567-..."
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 font-mono font-medium shadow-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">采购运单号 (商家发货)</label>
                        <input 
                            type="text" 
                            name="supplierTrackingNumber" 
                            value={formData.supplierTrackingNumber || ''} 
                            onChange={handleChange}
                            placeholder="填写供应商发货物流单号 (如: TBA...)"
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 font-mono font-medium shadow-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">商品图片</label>
                        <div className="flex items-start gap-4">
                        <label className="cursor-pointer flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 hover:border-indigo-400 transition-all group bg-white">
                            <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                            <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600">点击上传</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                        {formData.imageUrl && (
                            <div className="relative w-32 h-32 flex-shrink-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm group">
                                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, imageUrl: ''})}
                                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white shadow-sm border border-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Logistics Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3 mb-6">
                        <Truck size={18} className="text-indigo-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">物流与收货</h3>
                    </div>

                    <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">收货人地址信息 <span className="text-red-500">*</span></label>
                    <textarea 
                        name="buyerAddress" 
                        value={formData.buyerAddress || ''} 
                        onChange={handleChange}
                        rows={5}
                        placeholder="请填写完整的收货人姓名、电话、详细地址..."
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none text-slate-900 placeholder:text-slate-400 font-medium leading-relaxed shadow-sm"
                        required
                    />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">当前状态</label>
                        <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium shadow-sm"
                        >
                        {Object.values(OrderStatus).map(s => (
                            <option key={s} value={s}>{OrderStatusCN[s]}</option>
                        ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">采购日期</label>
                        <input 
                        type="date" 
                        name="purchaseDate" 
                        value={formData.purchaseDate} 
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium shadow-sm"
                        />
                    </div>
                    </div>

                    <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">发货运单号 (发给客户)</label>
                    <input 
                        type="text" 
                        name="trackingNumber" 
                        value={formData.trackingNumber || ''} 
                        onChange={handleChange}
                        placeholder="填写尾程物流单号"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 font-mono font-medium shadow-sm"
                    />
                    </div>
                    
                    <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">内部备注</label>
                    <input 
                        type="text" 
                        name="notes" 
                        value={formData.notes || ''} 
                        onChange={handleChange}
                        placeholder="可选备注..."
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium shadow-sm"
                    />
                    </div>
                </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-slate-100 gap-4">
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors text-sm shadow-sm"
                >
                    取消
                </button>
                <button 
                    type="submit" 
                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 shadow-md shadow-indigo-200 transition-all text-sm transform active:scale-95"
                >
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

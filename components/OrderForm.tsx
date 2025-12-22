
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

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAiImagePreview(reader.result as string);
              setAiInput(''); 
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAiParse = async () => {
    if (!aiInput.trim() && !aiImagePreview) return;
    setIsAiLoading(true);
    setError('');
    
    try {
      let parsedData;
      if (aiImagePreview) {
          parsedData = await parseOrderImage(aiImagePreview);
      } else {
          parsedData = await parseOrderText(aiInput);
      }

      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          ...parsedData,
          status: prev.status || OrderStatus.PENDING,
          imageUrl: (aiImagePreview && !prev.imageUrl) ? aiImagePreview : prev.imageUrl
        }));
        setAiImagePreview(null);
        setAiInput('');
      } else {
          setError('未能识别出有效信息，请重试');
      }
    } catch (err) {
      setError('识别失败，请检查网络或重试');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    if (!customerId) return;
    
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        const addressInfo = `${customer.name} ${customer.phone || ''}\n${customer.address}`;
        setFormData(prev => ({ ...prev, buyerAddress: addressInfo }));
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
      clientOrderId: formData.clientOrderId || '',
      status: formData.status || OrderStatus.PENDING,
      trackingNumber: formData.trackingNumber || '',
      supplierTrackingNumber: formData.supplierTrackingNumber || '',
      imageUrl: formData.imageUrl || '',
      notes: formData.notes || ''
    };
    onSave(orderToSave);
  };

  return (
    <div className="max-w-6xl mx-auto my-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden">
          
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {initialOrder ? '编辑订单' : '录入新订单'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">请填写以下详细信息</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
            </button>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900">
            {/* AI Parsing Section */}
            {!initialOrder && (
                <div className="mb-10 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 overflow-hidden relative">
                    <div className="px-6 py-4 border-b border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-900/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wand2 className="text-indigo-600 dark:text-indigo-400" size={16} />
                            <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 text-sm">智能识别 (AI Vision)</h3>
                        </div>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-500/30 font-medium">支持 截图/文本/Excel</span>
                    </div>
                    <div className="p-6 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            {aiImagePreview ? (
                                <div className="relative w-full h-[120px] bg-slate-100 dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-center overflow-hidden group">
                                    <img src={aiImagePreview} alt="AI Parse Preview" className="h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center transition-all">
                                        <button 
                                            onClick={() => setAiImagePreview(null)}
                                            className="bg-white/90 text-slate-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm"
                                        >
                                            移除图片
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <textarea 
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    placeholder="粘贴订单文本，或直接点击右侧上传截图..."
                                    className="w-full p-4 text-sm bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none h-[120px] transition-all placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white shadow-sm resize-none"
                                />
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-2 shrink-0 md:w-32">
                             <label className="flex-1 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors flex flex-col items-center justify-center p-2 group text-center h-[56px] md:h-auto">
                                <ImageIcon className="text-indigo-400 group-hover:text-indigo-600 dark:text-indigo-500 dark:group-hover:text-indigo-400 mb-1" size={20} />
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-tight">上传截图<br/>自动填写</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleAiImageUpload} />
                             </label>
                             <button 
                                onClick={handleAiParse}
                                disabled={isAiLoading || (!aiInput && !aiImagePreview)}
                                className="h-10 md:h-auto md:flex-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors"
                            >
                                {isAiLoading ? <Loader2 className="animate-spin" size={14} /> : '开始识别'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50 text-sm flex items-center gap-3">
                <div className="w-5 h-5 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center text-red-700 dark:text-red-200 font-bold text-xs shrink-0">!</div>
                {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                
                {/* Left Column: Product Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                        <FileText size={18} className="text-indigo-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">货物与采购</h3>
                    </div>
                    
                    <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">商品名称 <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        name="itemName" 
                        value={formData.itemName || ''} 
                        onChange={handleChange}
                        placeholder="请输入商品名称"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium shadow-sm"
                        required
                    />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">数量</label>
                            <input 
                            type="number" 
                            name="quantity" 
                            value={formData.quantity || 0} 
                            onChange={handleChange}
                            min="1"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-medium shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">金额 (USD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500 font-medium">$</span>
                                <input 
                                type="number" 
                                name="priceUSD" 
                                value={formData.priceUSD || 0} 
                                onChange={handleChange}
                                step="0.01"
                                className="w-full pl-8 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-mono font-medium shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">采购平台</label>
                            <input 
                                type="text" 
                                name="platform" 
                                value={formData.platform || ''} 
                                onChange={handleChange}
                                list="platform-options"
                                placeholder="选择或输入平台"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium shadow-sm"
                            />
                            <datalist id="platform-options">
                                <option value="AliExpress">AliExpress</option>
                                <option value="Temu">Temu</option>
                                <option value="Shein">Shein</option>
                                <option value="Amazon">Amazon</option>
                                <option value="TikTok Shop">TikTok Shop</option>
                                <option value="eBay">eBay</option>
                                <option value="Walmart">Walmart</option>
                                <option value="Costco">Costco</option>
                                <option value="Best Buy">Best Buy</option>
                                <option value="Target">Target</option>
                                <option value="1688">1688</option>
                                <option value="Taobao">Taobao</option>
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">平台订单号 (采购单号)</label>
                            <input 
                                type="text" 
                                name="platformOrderId" 
                                value={formData.platformOrderId || ''} 
                                onChange={handleChange}
                                placeholder="如: 114-1234567-..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-mono font-medium shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Order ID Input Below Platform Section */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">客户内部单号 (Client Order ID)</label>
                        <input 
                            type="text" 
                            name="clientOrderId" 
                            value={formData.clientOrderId || ''} 
                            onChange={handleChange}
                            placeholder="如: ORD-2024-001"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-mono font-medium shadow-sm"
                        />
                    </div>

                    {/* Note Input (Moved from Right Column) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">内部备注</label>
                        <input 
                            type="text" 
                            name="notes" 
                            value={formData.notes || ''} 
                            onChange={handleChange}
                            placeholder="仅代采专员可见..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium shadow-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">商品图片</label>
                        <div className="flex items-start gap-4">
                        <label className="cursor-pointer flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group bg-white dark:bg-slate-800">
                            <UploadCloud className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors mb-2" />
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">点击上传</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                        </label>
                        {formData.imageUrl && (
                            <div className="relative w-32 h-32 flex-shrink-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm group">
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
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                        <Truck size={18} className="text-indigo-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">物流与收货</h3>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">收货人地址信息 <span className="text-red-500">*</span></label>
                            {customers.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-indigo-500" />
                                    <select 
                                        value=""
                                        onChange={handleCustomerSelect}
                                        className="text-xs border border-slate-200 dark:border-slate-700 rounded py-1 px-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                        <option value="">从客户列表选择...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <textarea 
                            name="buyerAddress" 
                            value={formData.buyerAddress || ''} 
                            onChange={handleChange}
                            rows={5}
                            placeholder="请填写完整的收货人姓名、电话、详细地址..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium leading-relaxed shadow-sm"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">订单进度状态</label>
                        <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-medium shadow-sm"
                        >
                        {Object.values(OrderStatus).map(s => (
                            <option key={s} value={s}>{OrderStatusCN[s]}</option>
                        ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">采购日期</label>
                        <input 
                        type="date" 
                        name="purchaseDate" 
                        value={formData.purchaseDate} 
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-medium shadow-sm"
                        />
                    </div>
                    </div>

                    <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">出库物流单号 (发给客户)</label>
                    <input 
                        type="text" 
                        name="trackingNumber" 
                        value={formData.trackingNumber || ''} 
                        onChange={handleChange}
                        placeholder="填写发往目的地的国际/国内运单号"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-mono font-medium shadow-sm"
                    />
                    </div>
                    
                    {/* Supplier Tracking */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">商家发货单号 (入库跟踪)</label>
                        <input 
                            type="text" 
                            name="supplierTrackingNumber" 
                            value={formData.supplierTrackingNumber || ''} 
                            onChange={handleChange}
                            placeholder="填写供应商发往中转仓库的单号"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-mono font-medium shadow-sm"
                        />
                    </div>
                </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-slate-100 dark:border-slate-800 gap-4">
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors text-sm shadow-sm"
                >
                    取消
                </button>
                <button 
                    type="submit" 
                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 transition-all text-sm transform active:scale-95"
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

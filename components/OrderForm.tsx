
import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderStatusCN, Customer } from '../types';
import { parseOrderText, parseOrderImage } from '../services/geminiService';
import { Save, X, Loader2, Image as ImageIcon, Sparkles, Box, DollarSign, Truck, ClipboardList, Calendar, Hash, Globe, UserPlus, Trash2, Upload, RefreshCw, ExternalLink } from 'lucide-react';

interface OrderFormProps {
  initialOrder?: Order | null;
  customers?: Customer[];
  onSave: (order: Order) => void;
  onCancel: () => void;
  onNavigateToCustomers?: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialOrder, customers = [], onSave, onCancel, onNavigateToCustomers }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (initialOrder) { 
      setFormData({ ...defaultFormData, ...initialOrder }); 
    } else { 
      setFormData(defaultFormData); 
    }
  }, [initialOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'priceUSD' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, imageUrl: base64String }));
      
      // 只有在新建模式下才询问是否 AI 识别
      if (!initialOrder && confirm('检测到图片上传，是否尝试让 AI 自动识别订单内容？')) {
        setIsAiLoading(true);
        try {
          const parsed = await parseOrderImage(base64String);
          if (parsed) {
            setFormData(prev => ({ ...prev, ...parsed, imageUrl: base64String }));
          }
        } catch (err) {
          alert('图片识别失败，请手动录入内容');
        } finally {
          setIsAiLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
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
    } catch (err) { 
      alert('AI 解析失败，请手动录入'); 
    } finally { 
      setIsAiLoading(false); 
    }
  };

  const handleTrackClick = (num: string) => {
    if (num) {
      window.open(`https://www.17track.net/zh-cn/track?nums=${num}`, '_blank');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || !formData.buyerAddress) { 
      alert('请填写必填项（商品名称和收货地址）'); 
      return; 
    }
    onSave({
      ...formData as Order,
      id: initialOrder?.id || crypto.randomUUID(),
      lastUpdated: new Date().toISOString(),
    });
  };

  const SectionHeader = ({ icon: Icon, title, subtitle }: any) => (
    <div className="flex items-center gap-4 border-b border-white/5 pb-6 mb-8">
        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400"><Icon size={20} /></div>
        <div>
            <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto py-4 animate-slide-up">
      {/* 隐藏的文件输入框 */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      <div className="premium-glass rounded-[3rem] border-white/5 overflow-hidden shadow-2xl">
        <div className="p-10 md:p-16 space-y-12">
          
          {/* AI 快捷解析区 - 仅在新建时显示 */}
          {!initialOrder && (
            <div className="bg-slate-900/40 rounded-[2rem] p-8 border border-white/5 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 w-full">
                <p className="text-xs text-slate-500 mb-4 ml-1 italic font-medium">✨ 粘贴订单截图或描述文本，AI 将自动为您填写表单...</p>
                <textarea 
                  value={aiInput} 
                  onChange={(e) => setAiInput(e.target.value)}
                  className="w-full p-6 bg-black/20 border border-white/5 rounded-2xl text-sm text-slate-300 outline-none focus:border-indigo-500/30 min-h-[100px] resize-none"
                  placeholder="例如: iPhone 15 Pro, 数量2, 单价$999, 地址: 美国加州..."
                />
              </div>
              <div className="flex flex-col gap-3 w-full md:w-44">
                 <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl border border-white/5 transition-all group"
                 >
                    <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">上传截图</span>
                 </button>
                 <button 
                  type="button" 
                  onClick={handleAiParse}
                  disabled={isAiLoading || !aiInput}
                  className="flex items-center justify-center gap-2 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl transition-all disabled:opacity-30 group"
                >
                  {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest">智能识别</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* 左侧：采购详细信息 */}
            <div className="space-y-8">
                <SectionHeader icon={ClipboardList} title="采购详细信息" subtitle="Procurement Details" />
                
                <div className="space-y-6">
                    {/* 商品图上传与预览区 */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">商品缩略图</label>
                        <div className="flex items-start gap-6">
                            {formData.imageUrl ? (
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl transition-transform group-hover:scale-[1.02]">
                                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 flex flex-col gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                            className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-colors"
                                            title="删除图片"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-500 transition-colors"
                                            title="更换图片"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-32 h-32 rounded-3xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group"
                                >
                                    <Upload size={24} className="group-hover:-translate-y-1 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">上传商品图</span>
                                </button>
                            )}
                            <div className="flex-1 py-2">
                                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                    建议上传清晰的商品主图或订单截图，<br/>
                                    系统将自动压缩并在列表页展示。<br/>
                                    支持 JPG, PNG 格式。
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">商品名称 *</label>
                        <input type="text" name="itemName" value={formData.itemName} onChange={handleChange} required className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/40" placeholder="输入采购商品全称" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">采购数量</label>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">美金单价 (USD)</label>
                            <input type="number" name="priceUSD" value={formData.priceUSD} onChange={handleChange} step="0.01" className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">采购平台</label>
                            <input type="text" name="platform" value={formData.platform} onChange={handleChange} className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" placeholder="如: AliExpress, 1688" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">平台物流追踪号</label>
                            <div className="relative">
                                <input type="text" name="supplierTrackingNumber" value={formData.supplierTrackingNumber} onChange={handleChange} className="w-full px-6 py-4.5 pr-14 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" placeholder="采购网站原始单号" />
                                {formData.supplierTrackingNumber && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleTrackClick(formData.supplierTrackingNumber!)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                                        title="追踪此单号"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">采购内部单号</label>
                        <input type="text" name="clientOrderId" value={formData.clientOrderId} onChange={handleChange} className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" placeholder="输入您的内部流水号" />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">备注信息</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/40 resize-none" placeholder="添加相关备注说明..." />
                    </div>
                </div>
            </div>

            {/* 右侧：收货与物流信息 */}
            <div className="space-y-8">
                <SectionHeader icon={Truck} title="收货与物流信息" subtitle="Delivery & Logistics" />

                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">客户收货地址 *</label>
                            <button type="button" onClick={onNavigateToCustomers} className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg hover:bg-indigo-500/20 transition-all">快速选择合伙人...</button>
                        </div>
                        <textarea name="buyerAddress" value={formData.buyerAddress} onChange={handleChange} required rows={6} className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/40 resize-none" placeholder="收货人姓名、电话及详细地址" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">订单状态</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none appearance-none cursor-pointer">
                                {Object.entries(OrderStatusCN).map(([key, val]) => <option key={key} value={key} className="bg-slate-900">{val}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">采购日期</label>
                            <div className="relative">
                                <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">国际转运/自发货单号</label>
                        <div className="relative">
                            <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} className="w-full px-6 py-4.5 pr-14 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" placeholder="输入用于提供给买家的物流单号" />
                            {formData.trackingNumber && (
                                <button 
                                    type="button" 
                                    onClick={() => handleTrackClick(formData.trackingNumber!)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                                    title="追踪此单号"
                                >
                                    <ExternalLink size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">外部交易平台单号</label>
                        <input type="text" name="platformOrderId" value={formData.platformOrderId} onChange={handleChange} className="w-full px-6 py-4.5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none" placeholder="如 TikTok / Amazon 订单号" />
                    </div>
                </div>

                <div className="pt-12 flex justify-end gap-6">
                    <button type="button" onClick={onCancel} className="px-10 py-4.5 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">取消操作</button>
                    <button type="submit" className="px-16 py-4.5 bg-white text-indigo-950 rounded-2xl font-black text-sm shadow-2xl hover:bg-indigo-50 transition-all flex items-center gap-3">
                        <Save size={20} />
                        保存项目记录
                    </button>
                </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

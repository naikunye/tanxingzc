
import React, { useState, useRef } from 'react';
import { Customer } from '../types';
import { Search, Plus, Trash2, MapPin, Phone, User, X, Save, Upload, Download } from 'lucide-react';
import { parseCSV, exportToCSV } from '../services/csvService';

interface CustomerListProps {
  customers: Customer[];
  onSave: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onImport?: (data: any[]) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({ customers, onSave, onDelete, onImport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditing(true);
  };

  const handleAdd = () => {
    // Fix: Removed 'tags' property as it is not part of the Customer interface
    setEditingCustomer({
      id: crypto.randomUUID(),
      name: '',
      phone: '',
      address: '',
      notes: ''
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer.name || !editingCustomer.address) {
        alert('请填写合伙人姓名和地址');
        return;
    }
    onSave(editingCustomer as Customer);
    setIsEditing(false);
    setEditingCustomer({});
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(id);
  }

  const handleExport = () => {
      const headers = ['ID', '合伙人姓名', '联系电话', '收货地址', '备注'];
      const keys = ['id', 'name', 'phone', 'address', 'notes'];
      const filename = `探行科技_合伙人列表_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(customers, headers, keys, filename);
  };

  const handleImportClick = () => {
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImport) {
          try {
              const data = await parseCSV(file);
              onImport(data);
          } catch (error) {
              alert('CSV 解析失败，请检查文件格式是否正确。');
              console.error(error);
          }
      }
  };

  if (isEditing) {
      return (
          <div className="max-w-2xl mx-auto premium-glass rounded-[2rem] border border-white/10 p-10 animate-fade-in premium-shadow">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-display font-bold text-white">{editingCustomer.id && customers.some(c => c.id === editingCustomer.id) ? '编辑合伙人信息' : '录入新合伙人'}</h2>
                  <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-500 transition-colors">
                      <X size={24} />
                  </button>
              </div>
              <form onSubmit={handleSave} className="space-y-6">
                  <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">合伙人/客户姓名 *</label>
                      <input 
                          type="text" 
                          value={editingCustomer.name || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none text-white font-medium transition-all"
                          placeholder="输入姓名"
                          required
                      />
                  </div>
                  <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">联系电话</label>
                      <input 
                          type="text" 
                          value={editingCustomer.phone || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none text-white font-medium transition-all"
                          placeholder="输入联系电话"
                      />
                  </div>
                  <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">固定收货地址 *</label>
                      <textarea 
                          value={editingCustomer.address || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none text-white font-medium transition-all resize-none"
                          rows={3}
                          placeholder="输入详细的收货地址"
                          required
                      />
                  </div>
                   <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">备注说明</label>
                      <input 
                          type="text" 
                          value={editingCustomer.notes || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none text-white font-medium transition-all"
                          placeholder="额外说明信息..."
                      />
                  </div>
                  <div className="flex justify-end gap-4 pt-6 mt-4">
                      <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 text-slate-500 hover:text-slate-300 font-bold text-xs uppercase tracking-widest transition-colors">取消</button>
                      <button type="submit" className="px-10 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2">
                        <Save size={18} /> 保存合伙人
                      </button>
                  </div>
              </form>
          </div>
      )
  }

  return (
    <div className="space-y-8 animate-fade-in">
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileChange} 
        />

        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="relative w-full md:max-w-xl group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500" size={18} />
                <input
                    type="text"
                    placeholder="搜索合伙人姓名、电话或地址..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-4.5 text-sm premium-glass rounded-2xl border-white/5 focus:border-indigo-500/30 outline-none text-white"
                />
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
                {onImport && (
                    <button onClick={handleImportClick} className="px-5 py-4 premium-glass border-white/5 text-slate-400 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all">
                        <Upload size={16} />
                        批量导入
                    </button>
                )}
                <button onClick={handleExport} className="px-5 py-4 premium-glass border-white/5 text-emerald-400 hover:text-emerald-300 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all">
                    <Download size={16} />
                    导出数据
                </button>
                <button onClick={handleAdd} className="w-full md:w-auto px-8 py-4 bg-white text-indigo-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 shadow-2xl transition-all flex items-center justify-center gap-3">
                    <Plus size={20} strokeWidth={3} />
                    新增合伙人
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCustomers.map(customer => (
                <div key={customer.id} onClick={() => handleEdit(customer)} className="group bg-white/5 premium-glass rounded-[2.5rem] border border-white/5 p-8 hover:border-indigo-500/20 transition-all cursor-pointer relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -z-10 group-hover:bg-indigo-500/10 transition-colors" />
                     
                     <div className="flex justify-between items-start mb-6">
                         <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-display font-black text-xl border border-indigo-500/20 shadow-xl group-hover:rotate-6 transition-transform">
                                 {customer.name.charAt(0)}
                             </div>
                             <div>
                                 <h3 className="font-display font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{customer.name}</h3>
                                 <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 tracking-tight mt-1">
                                     <Phone size={12} className="text-slate-600" />
                                     {customer.phone || '未录入联系方式'}
                                 </div>
                             </div>
                         </div>
                         <button onClick={(e) => handleDelete(customer.id, e)} className="p-3 text-slate-700 hover:text-red-500 bg-white/5 hover:bg-red-500/10 rounded-xl transition-all">
                             <Trash2 size={18} />
                         </button>
                     </div>
                     
                     <div className="space-y-3 mt-8">
                         <div className="flex items-start gap-3 text-xs text-slate-400 bg-white/5 p-4 rounded-2xl border border-white/5">
                             <MapPin size={16} className="shrink-0 mt-0.5 text-indigo-500/60" />
                             <span className="leading-relaxed line-clamp-2">{customer.address}</span>
                         </div>
                         {customer.notes && (
                            <div className="px-4 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-500/80 font-bold flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                {customer.notes}
                            </div>
                         )}
                     </div>
                </div>
            ))}
             {filteredCustomers.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center premium-glass rounded-[3rem] border-white/5">
                    <User size={48} className="text-slate-800 mb-6 opacity-40" />
                    <h3 className="text-xl font-display font-bold text-slate-500">未找到相关合伙人</h3>
                    <p className="text-xs text-slate-600 mt-2 uppercase tracking-widest">请尝试调整搜索关键词</p>
                </div>
            )}
        </div>
    </div>
  );
};

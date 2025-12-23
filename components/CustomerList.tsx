
import React, { useState, useRef } from 'react';
import { Customer } from '../types';
import { Search, Plus, Trash2, MapPin, Phone, User, X, Save, Upload, Download, FileJson } from 'lucide-react';
import { parseCSV, exportToCSV } from '../services/csvService';
import { parseJSONFile, exportToJSON } from '../services/dataService';

interface CustomerListProps {
  customers: Customer[];
  onSave: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onImport?: (data: any[], format: 'csv' | 'json') => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({ customers, onSave, onDelete, onImport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer>>({});
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportCSV = () => {
      const headers = ['ID', '合伙人姓名', '联系电话', '收货地址', '备注'];
      const keys = ['id', 'name', 'phone', 'address', 'notes'];
      const filename = `探行科技_合伙人列表_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(customers, headers, keys, filename);
  };

  const handleExportJSON = () => {
      const filename = `探行科技_合伙人列表_${new Date().toISOString().split('T')[0]}.json`;
      exportToJSON(customers, filename);
  };

  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImport) {
          try {
              const data = await parseCSV(file);
              onImport(data, 'csv');
          } catch (error) {
              alert('CSV 解析失败');
          }
      }
  };

  const handleJSONFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImport) {
          try {
              const data = await parseJSONFile(file);
              onImport(data, 'json');
          } catch (error) {
              alert('JSON 解析失败');
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
        <input type="file" ref={csvInputRef} className="hidden" accept=".csv" onChange={handleCSVFileChange} />
        <input type="file" ref={jsonInputRef} className="hidden" accept=".json" onChange={handleJSONFileChange} />

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
                    <div className="flex premium-glass rounded-2xl border-white/5 overflow-hidden">
                        <button onClick={() => csvInputRef.current?.click()} className="px-5 py-4 text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all border-r border-white/5">
                            <Upload size={16} /> CSV
                        </button>
                        <button onClick={() => jsonInputRef.current?.click()} className="px-5 py-4 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all">
                            <FileJson size={16} /> JSON
                        </button>
                    </div>
                )}
                <div className="flex premium-glass rounded-2xl border-white/5 overflow-hidden">
                    <button onClick={handleExportCSV} className="px-5 py-4 text-emerald-400 hover:text-emerald-300 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all border-r border-white/5">
                        <Download size={16} /> CSV
                    </button>
                    <button onClick={handleExportJSON} className="px-5 py-4 text-emerald-400 hover:text-emerald-300 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all">
                        <FileJson size={16} /> JSON
                    </button>
                </div>
                <button onClick={handleAdd} className="w-full md:w-auto px-8 py-4 bg-white text-indigo-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 shadow-2xl transition-all flex items-center justify-center gap-3">
                    <Plus size={20} strokeWidth={3} />
                    新增合伙人
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCustomers.map(customer => (
                <div key={customer.id} onClick={() => handleEdit(customer)} className="group bg-white/5 premium-glass rounded-[2.5rem] border border-white/5 p-8 hover:border-indigo-500/20 transition-all cursor-pointer relative overflow-hidden">
                     <div className="flex justify-between items-start mb-6">
                         <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-display font-black text-xl border border-indigo-500/20 shadow-xl group-hover:rotate-6 transition-transform">
                                 {customer.name.charAt(0)}
                             </div>
                             <div>
                                 <h3 className="font-display font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{customer.name}</h3>
                                 <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 tracking-tight mt-1">
                                     <Phone size={12} className="text-slate-600" />
                                     {customer.phone || '未录入电话'}
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
                     </div>
                </div>
            ))}
        </div>
    </div>
  );
};

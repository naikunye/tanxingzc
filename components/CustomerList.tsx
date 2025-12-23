import React, { useState, useRef } from 'react';
import { Customer } from '../types.ts';
import { Search, Plus, Trash2, MapPin, Phone, User, X, Save, Upload, Download } from 'lucide-react';
import { parseCSV, exportToCSV } from '../services/csvService.ts';

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
    setEditingCustomer({
      id: crypto.randomUUID(),
      name: '',
      phone: '',
      address: '',
      tags: [],
      notes: ''
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer.name || !editingCustomer.address) {
        alert('请填入姓名和地址');
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
      const headers = ['ID', '客户名称', '电话', '地址', '备注'];
      const keys = ['id', 'name', 'phone', 'address', 'notes'];
      const filename = `客户列表导出_${new Date().toISOString().split('T')[0]}.csv`;
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
              alert('CSV 解析失败，请检查文件格式。');
              console.error(error);
          }
      }
  };

  if (isEditing) {
      return (
          <div className="max-w-2xl mx-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">{editingCustomer.id ? '编辑客户' : '新增客户'}</h2>
                  <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500">
                      <X size={20} />
                  </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                  <div>
                      <label className="block text-sm font-bold text-slate-400 mb-1">客户名称 *</label>
                      <input 
                          type="text" 
                          value={editingCustomer.name || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                          required
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-400 mb-1">联系电话</label>
                      <input 
                          type="text" 
                          value={editingCustomer.phone || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-400 mb-1">收货地址 *</label>
                      <textarea 
                          value={editingCustomer.address || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                          rows={3}
                          required
                      />
                  </div>
                  <div className="flex justify-end gap-3 pt-6">
                      <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-500 hover:text-white transition-colors">取消</button>
                      <button type="submit" className="px-8 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all flex items-center gap-2">
                        <Save size={16} /> 保存
                      </button>
                  </div>
              </form>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-fade-in">
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="relative w-full md:max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={16} />
                <input type="text" placeholder="搜索客户..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-white" />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleImportClick} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 flex items-center gap-2 border border-slate-700"><Upload size={16} /> 导入</button>
                <button onClick={handleExport} className="px-4 py-2 bg-emerald-950/20 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-900/50 hover:bg-emerald-900/40 flex items-center gap-2"><Download size={16} /> 导出</button>
                <button onClick={handleAdd} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"><Plus size={18} /> 新增客户</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map(customer => (
                <div key={customer.id} onClick={() => handleEdit(customer)} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 hover:border-indigo-500/50 transition-all cursor-pointer group relative shadow-sm">
                     <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/20">
                                 {customer.name.charAt(0)}
                             </div>
                             <div>
                                 <h3 className="font-bold text-white">{customer.name}</h3>
                                 <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                     <Phone size={10} /> {customer.phone || '-'}
                                 </div>
                             </div>
                         </div>
                         <button onClick={(e) => handleDelete(customer.id, e)} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                     </div>
                     <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/50 flex items-start gap-2 text-xs text-slate-400">
                         <MapPin size={14} className="shrink-0 mt-0.5 text-indigo-500" />
                         <span className="line-clamp-2">{customer.address}</span>
                     </div>
                </div>
            ))}
        </div>
    </div>
  );
};
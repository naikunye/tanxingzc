
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
        alert('Name and Address are required');
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

  // Import/Export Handlers
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
              alert('CSV parsing failed. Please check the file format.');
              console.error(error);
          }
      }
  };

  if (isEditing) {
      return (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingCustomer.id ? '编辑客户' : '新增客户'}</h2>
                  <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                      <X size={20} />
                  </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">客户名称 *</label>
                      <input 
                          type="text" 
                          value={editingCustomer.name || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          required
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">联系电话</label>
                      <input 
                          type="text" 
                          value={editingCustomer.phone || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">收货地址 *</label>
                      <textarea 
                          value={editingCustomer.address || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          rows={3}
                          required
                      />
                  </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">备注</label>
                      <input 
                          type="text" 
                          value={editingCustomer.notes || ''} 
                          onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                      <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors">取消</button>
                      <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2">
                        <Save size={16} /> 保存
                      </button>
                  </div>
              </form>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-fade-in">
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileChange} 
        />

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="relative w-full md:max-w-md group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
                <input
                    type="text"
                    placeholder="搜索客户姓名、电话或地址..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                {onImport && (
                    <button onClick={handleImportClick} className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                        <Upload size={16} />
                        导入
                    </button>
                )}
                <button onClick={handleExport} className="px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                    <Download size={16} />
                    导出
                </button>
                <button onClick={handleAdd} className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors">
                    <Plus size={18} />
                    新增客户
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map(customer => (
                <div key={customer.id} onClick={() => handleEdit(customer)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group relative">
                     <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-100 dark:border-indigo-800">
                                 {customer.name.charAt(0)}
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-900 dark:text-white">{customer.name}</h3>
                                 <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                     <Phone size={10} />
                                     {customer.phone || '无电话'}
                                 </div>
                             </div>
                         </div>
                         <button onClick={(e) => handleDelete(customer.id, e)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                             <Trash2 size={16} />
                         </button>
                     </div>
                     
                     <div className="space-y-2 mt-4">
                         <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                             <MapPin size={14} className="shrink-0 mt-0.5 text-indigo-400" />
                             <span className="line-clamp-2">{customer.address}</span>
                         </div>
                         {customer.notes && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                                {customer.notes}
                            </div>
                         )}
                     </div>
                </div>
            ))}
             {filteredCustomers.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 dark:text-slate-600">
                    <User size={48} className="mx-auto mb-2 opacity-20" />
                    <p>没有找到相关客户</p>
                </div>
            )}
        </div>
    </div>
  );
};

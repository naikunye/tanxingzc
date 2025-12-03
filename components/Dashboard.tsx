import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Order, OrderStatus, OrderStatusCN } from '../types';
import { DollarSign, Package, Truck, Clock, ShoppingBag } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ orders }) => {
  
  const stats = {
    totalSpent: orders.reduce((acc, curr) => acc + (curr.priceUSD * curr.quantity), 0),
    totalOrders: orders.length,
    active: orders.filter(o => [OrderStatus.PENDING, OrderStatus.PURCHASED, OrderStatus.READY_TO_SHIP, OrderStatus.SHIPPED].includes(o.status)).length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length
  };

  const statusData = Object.values(OrderStatus).map(status => ({
    name: OrderStatusCN[status],
    value: orders.filter(o => o.status === status).length
  })).filter(d => d.value > 0);

  // Group by platform
  const platformData = orders.reduce((acc: any[], curr) => {
    const existing = acc.find(a => a.name === curr.platform);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: curr.platform || '其他', value: 1 });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

  const StatCard = ({ icon: Icon, bgClass, iconColor, title, value, subtext }: any) => (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start space-x-4 hover:shadow-md transition-all duration-300 group">
          <div className={`p-3 rounded-lg ${bgClass} group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={24} className={iconColor} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1 tracking-wide uppercase">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            icon={DollarSign} 
            bgClass="bg-blue-50"
            iconColor="text-blue-600"
            title="总采购金额 (USD)" 
            value={`$${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
            subtext="累计交易总额"
        />
        <StatCard 
            icon={ShoppingBag} 
            bgClass="bg-violet-50"
            iconColor="text-violet-600"
            title="总订单数" 
            value={stats.totalOrders} 
            subtext="所有历史订单"
        />
        <StatCard 
            icon={Clock} 
            bgClass="bg-amber-50"
            iconColor="text-amber-600"
            title="待处理采购" 
            value={stats.pending} 
            subtext="需尽快购买"
        />
        <StatCard 
            icon={Truck} 
            bgClass="bg-emerald-50"
            iconColor="text-emerald-600"
            title="运输中/已发货" 
            value={stats.active - stats.pending} 
            subtext="物流在途"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Distribution */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                订单状态分布
            </h3>
            <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                {statusData.map((entry, index) => (
                    <div key={index} className="flex items-center text-xs text-slate-600 font-medium">
                        <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        {entry.name} <span className="ml-1 opacity-75">({entry.value})</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Platform Stats */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
                 <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                热门采购平台 TOP 5
            </h3>
             <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData} layout="vertical" margin={{top: 0, right: 30, left: 20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} width={80} />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                             {platformData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};
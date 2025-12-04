
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
import { DollarSign, Package, Truck, Clock, ShoppingBag, AlertTriangle, ArrowRight } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ orders }) => {
  
  // Calculate Delayed Orders: Status is PURCHASED, and PurchaseDate was > 48 hours ago
  const delayedOrders = orders.filter(o => {
      if (o.status !== OrderStatus.PURCHASED) return false;
      const purchaseTime = new Date(o.purchaseDate).getTime();
      const now = new Date().getTime();
      const diffHours = (now - purchaseTime) / (1000 * 60 * 60);
      return diffHours > 48;
  });

  const stats = {
    totalSpent: orders.reduce((acc, curr) => acc + (curr.priceUSD * curr.quantity), 0),
    totalOrders: orders.length,
    active: orders.filter(o => [OrderStatus.PENDING, OrderStatus.PURCHASED, OrderStatus.READY_TO_SHIP, OrderStatus.SHIPPED].includes(o.status)).length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    delayed: delayedOrders.length
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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start space-x-4 hover:shadow-md transition-all duration-300 group min-w-0">
          <div className={`p-3 rounded-lg ${bgClass} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
            <Icon size={24} className={iconColor} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 mb-1 tracking-wide uppercase truncate">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight truncate">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 mt-1 font-medium truncate">{subtext}</p>}
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
            icon={ShoppingBag} 
            bgClass="bg-violet-50"
            iconColor="text-violet-600"
            title="订单总数" 
            value={stats.totalOrders} 
            subtext="所有历史订单"
        />
        <StatCard 
            icon={DollarSign} 
            bgClass="bg-blue-50"
            iconColor="text-blue-600"
            title="总采购金额" 
            value={`$${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
            subtext="累计交易总额"
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
        {/* New Warning Card */}
        <StatCard 
            icon={AlertTriangle} 
            bgClass="bg-red-50"
            iconColor="text-red-600"
            title="发货超时预警" 
            value={stats.delayed} 
            subtext="超过48h未更新轨迹"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">
             {/* Platform Stats */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    热门采购平台 TOP 5
                </h3>
                <div className="h-64">
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

            {/* Status Distribution */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        订单状态分布
                    </h3>
                    <div className="h-64 w-full">
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
                </div>
                <div className="flex flex-wrap justify-center content-center gap-x-6 gap-y-3 w-full md:w-auto md:max-w-[200px]">
                    {statusData.map((entry, index) => (
                        <div key={index} className="flex items-center text-xs text-slate-600 font-medium w-full">
                            <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="flex-1">{entry.name}</span>
                            <span className="font-bold opacity-75">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Column: Delayed Orders List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[700px]">
            <div className="p-6 border-b border-slate-100 bg-red-50/50">
                 <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={16} />
                    超时未更新 ( &gt;48h )
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {delayedOrders.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Package size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs">暂无超时订单，一切正常！</p>
                    </div>
                ) : (
                    delayedOrders.map(order => (
                        <div key={order.id} className="p-4 rounded-lg bg-red-50 border border-red-100 group hover:bg-red-100 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{order.itemName}</h4>
                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-red-200 text-red-600 font-mono">
                                    {order.purchaseDate}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">{order.platform}</span>
                                {order.platformOrderId ? (
                                    <span className="font-mono text-slate-400">#{order.platformOrderId.slice(-6)}</span>
                                ) : (
                                    <span className="text-red-400 font-medium">无单号</span>
                                )}
                            </div>
                             <div className="mt-2 text-[10px] text-red-600 flex items-center gap-1 font-medium">
                                <Clock size={10} /> 卖家未发货?
                            </div>
                        </div>
                    ))
                )}
            </div>
             {delayedOrders.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500">
                    建议检查平台单号并手动同步
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

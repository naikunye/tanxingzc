
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';
import { Order, OrderStatus, OrderStatusCN, WarningRules } from '../types';
import { DollarSign, Clock, CheckCircle2, ShoppingBag } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  warningRules: WarningRules;
  onNavigate?: (filter: OrderStatus | 'All' | 'delayed') => void;
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', 
];

export const Dashboard: React.FC<DashboardProps> = ({ orders, warningRules, onNavigate }) => {
  const stats = {
    totalSpent: orders.reduce((acc, curr) => acc + (curr.priceUSD * curr.quantity), 0),
    totalOrders: orders.length,
    active: orders.filter(o => [OrderStatus.PENDING, OrderStatus.PURCHASED, OrderStatus.READY_TO_SHIP, OrderStatus.SHIPPED].includes(o.status)).length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
  };

  const statusData = Object.values(OrderStatus).map(status => ({
    name: OrderStatusCN[status],
    value: orders.filter(o => o.status === status).length
  })).filter(d => d.value > 0);

  const StatCard = ({ icon: Icon, title, value, subtext, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`glass-card p-6 rounded-2xl flex items-start space-x-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
    >
      <div className={`p-3 rounded-xl bg-indigo-600/10 text-indigo-400`}>
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        <p className="text-[10px] opacity-40 mt-1">{subtext}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} title="订单总数" value={stats.totalOrders} subtext="累计所有记录" onClick={() => onNavigate && onNavigate('All')} />
        <StatCard icon={Clock} title="待采购" value={stats.pending} subtext="需尽快下单" onClick={() => onNavigate && onNavigate(OrderStatus.PENDING)} />
        <StatCard icon={CheckCircle2} title="活跃订单" value={stats.active} subtext="流程流转中" />
        <StatCard icon={DollarSign} title="累计金额" value={`$${stats.totalSpent.toLocaleString()}`} subtext="USD 统计" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-8 rounded-3xl h-[400px]">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-8 opacity-50">订单状态分布</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                {statusData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                <Label value={stats.totalOrders} position="center" className="fill-current font-bold" style={{ fontSize: '24px' }} />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-8 rounded-3xl h-[400px]">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-8 opacity-50">数据趋势</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

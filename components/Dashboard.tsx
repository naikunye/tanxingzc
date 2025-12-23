
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
import { DollarSign, Clock, CheckCircle2, ShoppingBag, TrendingUp, Briefcase } from 'lucide-react';

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

  const StatCard = ({ icon: Icon, title, value, subtext, onClick, variant = 'indigo' }: any) => (
    <div 
      onClick={onClick}
      className={`group relative p-8 premium-glass rounded-[2.5rem] border-white/5 transition-all duration-500 hover:-translate-y-2 cursor-pointer overflow-hidden premium-shadow hover:border-white/20`}
    >
      <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${variant}-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700`} />
      
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl bg-${variant}-500/10 text-${variant}-400 group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <TrendingUp size={16} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</p>
        <h3 className="text-4xl font-display font-bold tracking-tighter text-white tabular-nums">{value}</h3>
        <p className="text-[10px] font-medium text-slate-500 pt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span>
            {subtext}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up pb-12">
      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Briefcase} title="项目总量" value={stats.totalOrders} subtext="活跃采集项目" onClick={() => onNavigate && onNavigate('All')} variant="indigo" />
        <StatCard icon={Clock} title="待采购任务" value={stats.pending} subtext="高优先级队列" onClick={() => onNavigate && onNavigate(OrderStatus.PENDING)} variant="amber" />
        <StatCard icon={CheckCircle2} title="运营中项目" value={stats.active} subtext="全链路流转中" variant="emerald" />
        <StatCard icon={DollarSign} title="成交资产" value={`$${Math.floor(stats.totalSpent).toLocaleString()}`} subtext="USD 价值统计" variant="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 圆形分布图 */}
        <div className="premium-glass p-10 rounded-[3rem] h-[480px] border-white/5 relative overflow-hidden group">
          <div className="flex justify-between items-center mb-10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Status Allocation</h3>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie 
                data={statusData} 
                cx="50%" 
                cy="50%" 
                innerRadius={110} 
                outerRadius={150} 
                paddingAngle={8} 
                dataKey="value" 
                stroke="none"
              >
                {statusData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                <Label 
                    value={stats.totalOrders} 
                    position="center" 
                    content={({viewBox}: any) => {
                        const {cx, cy} = viewBox;
                        return (
                            <g>
                                <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="middle" className="fill-white font-display font-bold text-5xl tracking-tighter">
                                    {stats.totalOrders}
                                </text>
                                <text x={cx} y={cy + 30} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600 font-bold text-[10px] uppercase tracking-widest">
                                    Total Items
                                </text>
                            </g>
                        )
                    }}
                />
              </Pie>
              <Tooltip 
                contentStyle={{backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
                itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 柱状趋势图 */}
        <div className="premium-glass p-10 rounded-[3rem] h-[480px] border-white/5 group">
          <div className="flex justify-between items-center mb-10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Flow Dynamics</h3>
              <div className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span className="w-1 h-1 rounded-full bg-white/40"></span>
                  <span className="w-1 h-1 rounded-full bg-white/60"></span>
              </div>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={statusData}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#475569', fontSize: 10, fontWeight: 700}}
                dy={20}
              />
              <YAxis hide />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.03)', radius: 10}} 
                contentStyle={{backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}}
              />
              <Bar 
                dataKey="value" 
                fill="#6366f1" 
                radius={[15, 15, 15, 15]} 
                barSize={50} 
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

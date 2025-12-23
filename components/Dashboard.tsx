
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
  Cell
} from 'recharts';
import { Order, OrderStatus, OrderStatusCN } from '../types';
import { Briefcase, Clock, CheckCircle2, DollarSign, LayoutGrid } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  onNavigate?: (filter: OrderStatus | 'All') => void;
}

const COLORS = ['#ef4444', '#a855f7', '#6366f1', '#10b981', '#fbbf24'];

export const Dashboard: React.FC<DashboardProps> = ({ orders, onNavigate }) => {
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    active: orders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED).length,
    value: orders.reduce((acc, curr) => acc + (curr.priceUSD * curr.quantity), 0),
  };

  const statusData = Object.values(OrderStatus).map((status, index) => ({
    name: OrderStatusCN[status],
    value: orders.filter(o => o.status === status).length,
    fill: COLORS[index % COLORS.length]
  })).filter(d => d.value > 0);

  const StatCard = ({ icon: Icon, title, value, subtext, variant = 'indigo', onClick }: any) => (
    <div onClick={onClick} className="group premium-glass p-10 rounded-[2.5rem] border-white/5 hover:border-white/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-full min-h-[220px]">
        <div className={`p-3 w-fit rounded-xl bg-${variant}-500/10 text-${variant}-400 mb-6`}>
            <Icon size={24} />
        </div>
        <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
            <h3 className="text-6xl font-display font-black text-white tabular-nums tracking-tighter">{value}</h3>
        </div>
        <div className="mt-6 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full bg-${variant}-500`}></span>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{subtext}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Briefcase} title="资产总数" value={stats.total} subtext="全球采购项目" variant="indigo" onClick={() => onNavigate?.('All')} />
        <StatCard icon={Clock} title="任务队列" value={stats.pending} subtext="高优先级别积压" variant="purple" onClick={() => onNavigate?.(OrderStatus.PENDING)} />
        <StatCard icon={CheckCircle2} title="运营中项目" value={stats.active} subtext="实时物流链路" variant="emerald" onClick={() => onNavigate?.('All')} />
        <StatCard icon={DollarSign} title="资产总估值" value={`$${Math.round(stats.value)}`} subtext="USD 价值总计" variant="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="premium-glass p-12 rounded-[3.5rem] h-[550px] relative">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">业务节点分布</h3>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold">实时订单状态占比</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl text-slate-500"><LayoutGrid size={20} /></div>
            </div>
            <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={8} stroke="none">
                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '12px', padding: '12px 20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>

        <div className="premium-glass p-12 rounded-[3.5rem] h-[550px]">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">运营效能监控</h3>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold">各阶段订单吞吐量</p>
                </div>
                <div className="flex gap-1 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="75%">
                <BarChart data={statusData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} dy={20} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px' }} />
                    <Bar dataKey="value" radius={[20, 20, 20, 20]} barSize={40}>
                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

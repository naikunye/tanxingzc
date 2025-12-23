
import React, { useState } from 'react';
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
  Label,
  Sector
} from 'recharts';
import { Order, OrderStatus, OrderStatusCN, WarningRules } from '../types';
import { DollarSign, Clock, CheckCircle2, ShoppingBag, TrendingUp, Briefcase, LayoutDashboard } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  warningRules: WarningRules;
  onNavigate?: (filter: OrderStatus | 'All' | 'delayed') => void;
}

// 精致的高对比度配色方案
const CHART_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#10b981', // Emerald
];

// 中文化高级提示框组件
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="premium-glass px-5 py-3.5 rounded-[1.25rem] border border-white/10 shadow-2xl animate-slide-up">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{label || payload[0].name}</p>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].fill || payload[0].payload.fill }} />
          <span className="text-sm font-display font-bold text-white tabular-nums">
            {payload[0].value} <span className="text-[10px] text-slate-500 font-medium ml-1">项订单</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// 饼图活跃扇区渲染逻辑
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.4))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
    </g>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ orders, warningRules, onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const stats = {
    totalSpent: orders.reduce((acc, curr) => acc + (curr.priceUSD * curr.quantity), 0),
    totalOrders: orders.length,
    active: orders.filter(o => [OrderStatus.PENDING, OrderStatus.PURCHASED, OrderStatus.READY_TO_SHIP, OrderStatus.SHIPPED].includes(o.status)).length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
  };

  const statusData = Object.values(OrderStatus).map((status, index) => ({
    name: OrderStatusCN[status],
    value: orders.filter(o => o.status === status).length,
    fill: CHART_COLORS[index % CHART_COLORS.length]
  })).filter(d => d.value > 0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const StatCard = ({ icon: Icon, title, value, subtext, onClick, variant = 'indigo' }: any) => (
    <div 
      onClick={onClick}
      className={`group relative p-10 premium-glass rounded-[3rem] border-white/5 transition-all duration-700 hover:-translate-y-3 cursor-pointer overflow-hidden premium-shadow hover:border-white/20`}
    >
      <div className={`absolute -top-16 -right-16 w-48 h-48 bg-${variant}-500/10 blur-[64px] rounded-full group-hover:scale-150 transition-transform duration-1000`} />
      
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4.5 rounded-[1.25rem] bg-${variant}-500/10 text-${variant}-400 group-hover:bg-${variant}-500 group-hover:text-white transition-all duration-500`}>
          <Icon size={26} strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-4 group-hover:translate-x-0">
          <TrendingUp size={12} />
          实时同步
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">{title}</p>
        <h3 className="text-5xl font-display font-black tracking-tighter text-white tabular-nums leading-none">
            {value}
        </h3>
        <div className="flex items-center gap-2 pt-4">
             <div className={`w-1.5 h-1.5 rounded-full bg-${variant}-500 animate-pulse`}></div>
             <p className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">
                {subtext}
             </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-slide-up pb-24">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.6}/>
          </linearGradient>
        </defs>
      </svg>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard icon={Briefcase} title="资产总数" value={stats.totalOrders} subtext="全球采购项目" onClick={() => onNavigate && onNavigate('All')} variant="indigo" />
        <StatCard icon={Clock} title="任务队列" value={stats.pending} subtext="高优先级积压" onClick={() => onNavigate && onNavigate(OrderStatus.PENDING)} variant="purple" />
        <StatCard icon={CheckCircle2} title="运营中项目" value={stats.active} subtext="实时物流链路" variant="emerald" />
        <StatCard icon={DollarSign} title="资产总估值" value={`$${Math.floor(stats.totalSpent).toLocaleString()}`} subtext="USD 价值总计" variant="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="premium-glass p-12 rounded-[4rem] h-[550px] border-white/5 relative overflow-hidden group">
          <div className="flex justify-between items-center mb-12">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">业务节点分布</h3>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">实时订单状态占比</p>
              </div>
              <div className="w-12 h-12 rounded-2xl premium-glass flex items-center justify-center text-indigo-400 group-hover:rotate-12 transition-all">
                  <LayoutDashboard size={20} />
              </div>
          </div>
          <ResponsiveContainer width="100%" height="75%">
            <PieChart>
              <Pie 
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={statusData} 
                cx="50%" 
                cy="50%" 
                innerRadius={135} 
                outerRadius={165} 
                paddingAngle={12} 
                dataKey="value" 
                stroke="none"
                onMouseEnter={onPieEnter}
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-all cursor-pointer" />
                ))}
                <Label 
                    value={stats.totalOrders} 
                    position="center" 
                    content={({viewBox}: any) => {
                        const {cx, cy} = viewBox;
                        return (
                            <g>
                                <text x={cx} y={cy - 12} textAnchor="middle" dominantBaseline="middle" className="fill-white font-display font-black text-6xl tracking-tighter">
                                    {stats.totalOrders}
                                </text>
                                <text x={cx} y={cy + 38} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600 font-black text-[11px] uppercase tracking-[0.4em]">
                                    项订单
                                </text>
                            </g>
                        )
                    }}
                />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-glass p-12 rounded-[4rem] h-[550px] border-white/5 group">
          <div className="flex justify-between items-center mb-12">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">运营效能监控</h3>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">各阶段订单吞吐量</p>
              </div>
              <div className="flex gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-pulse"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70 animate-pulse" style={{animationDelay: '0.2s'}}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" style={{animationDelay: '0.4s'}}></span>
              </div>
          </div>
          <ResponsiveContainer width="100%" height="75%">
            <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#475569', fontSize: 10, fontWeight: 900}}
                dy={25}
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 24 }} 
                content={<CustomTooltip />}
              />
              <Bar 
                dataKey="value" 
                fill="url(#barGradient)" 
                radius={[25, 25, 25, 25]} 
                barSize={55}
                animationBegin={200}
                animationDuration={1800}
                animationEasing="ease-in-out"
              >
                {statusData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    className="hover:brightness-125 transition-all cursor-pointer" 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

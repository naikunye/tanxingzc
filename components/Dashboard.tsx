
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
  Cell,
  Label
} from 'recharts';
import { Order, OrderStatus, OrderStatusCN, WarningRules } from '../types';
import { DollarSign, Clock, AlertTriangle, Hourglass, CheckCircle2, Plane, AlertCircle, Warehouse, ShoppingCart, Archive, Home, Truck, ShoppingBag } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  warningRules: WarningRules;
  onNavigate?: (filter: OrderStatus | 'All' | 'delayed') => void;
}

const CHART_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

// Helper to determine order health
type HealthStatus = 'normal' | 'impending' | 'overdue';

export const Dashboard: React.FC<DashboardProps> = ({ orders, warningRules, onNavigate }) => {
  const now = new Date().getTime();
  const ONE_HOUR = 1000 * 60 * 60;
  const ONE_DAY = ONE_HOUR * 24;

  const getOrderHealth = (order: Order): { status: HealthStatus, msg: string, timeLeftHours: number } => {
      // 1. Check Purchase Health
      if (order.status === OrderStatus.PURCHASED) {
          const purchaseTime = new Date(order.purchaseDate).getTime();
          const elapsedHours = (now - purchaseTime) / ONE_HOUR;
          const limitHours = warningRules.purchaseTimeoutHours;
          
          if (elapsedHours > limitHours) {
              return { status: 'overdue', msg: `发货超时 ${Math.floor(elapsedHours - limitHours)}h`, timeLeftHours: 0 };
          } else if (elapsedHours > (limitHours - warningRules.impendingBufferHours)) {
              return { status: 'impending', msg: `剩 ${Math.floor(limitHours - elapsedHours)}h 超时`, timeLeftHours: limitHours - elapsedHours };
          }
      }

      // 2. Check Shipping Health
      if (order.status === OrderStatus.SHIPPED) {
          // Fallback to purchaseDate if lastUpdated is missing (though it shouldn't be for shipped items)
          const refTime = new Date(order.lastUpdated || order.purchaseDate).getTime();
          const elapsedDays = (now - refTime) / ONE_DAY;
          const limitDays = warningRules.shippingTimeoutDays;

          if (elapsedDays > limitDays) {
              return { status: 'overdue', msg: `物流超时 ${Math.floor(elapsedDays - limitDays)}天`, timeLeftHours: 0 };
          } else if (elapsedDays > (limitDays - (warningRules.impendingBufferHours / 24))) {
              // Convert buffer hours to days for comparison
              return { status: 'impending', msg: `即将超时 (未签收)`, timeLeftHours: 0 };
          }
      }

      return { status: 'normal', msg: '正常', timeLeftHours: 0 };
  };

  // Group Orders by Warning Status
  const warningList = orders.map(o => ({ ...o, health: getOrderHealth(o) }))
                            .filter(o => o.health.status !== 'normal')
                            .sort((a, b) => {
                                // Sort Order: Overdue first, then Impending. Within category, worst first.
                                if (a.health.status !== b.health.status) {
                                    return a.health.status === 'overdue' ? -1 : 1;
                                }
                                return 0;
                            });

  const overdueCount = warningList.filter(o => o.health.status === 'overdue').length;
  const impendingCount = warningList.filter(o => o.health.status === 'impending').length;

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

  // Platform Data Calculation (Top 8)
  const platformCounts: Record<string, number> = {};
  orders.forEach(o => {
      const p = o.platform || '其他';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
  });

  const platformData = Object.keys(platformCounts).map(key => ({
      name: key,
      value: platformCounts[key]
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  // --- New Logic for Split Logistics Flows ---

  // 1. Inbound Flow (Procurement -> Warehouse)
  const inboundData = {
      toBuy: orders.filter(o => o.status === OrderStatus.PENDING).length,
      purchased: orders.filter(o => o.status === OrderStatus.PURCHASED && !o.supplierTrackingNumber).length,
      supplierTransit: orders.filter(o => 
          // Has supplier tracking but not yet arrived (Ready to Ship)
          (o.status === OrderStatus.PURCHASED || o.status === OrderStatus.PENDING) && !!o.supplierTrackingNumber
      ).length,
      arrived: orders.filter(o => o.status === OrderStatus.READY_TO_SHIP).length
  };

  // 2. Outbound Flow (Warehouse -> Customer)
  const outboundData = {
      ready: orders.filter(o => o.status === OrderStatus.READY_TO_SHIP).length, // Shared node (End of Inbound, Start of Outbound)
      inTransit: orders.filter(o => o.status === OrderStatus.SHIPPED && (!o.detailedStatus || ['运输中', '已发货', '已揽收'].includes(o.detailedStatus))).length,
      deliveryIssue: orders.filter(o => o.status === OrderStatus.SHIPPED && ['投递失败/待取', '到达待取', '运输异常', '运输过久'].includes(o.detailedStatus || '')).length,
      delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 text-xs">
          <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label || payload[0].name}</p>
          <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }}></div>
             <span className="text-slate-500 dark:text-slate-400">{payload[0].name === 'value' ? '订单数量' : payload[0].name}:</span>
             <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{payload[0].value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ icon: Icon, theme, title, value, subtext, onClick, isWarning, isImpending }: any) => {
    const themes: any = {
        violet: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
        blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
        red: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' }
    };
    
    const currentTheme = themes[theme] || themes.violet;
    const warningClass = isWarning ? 'ring-2 ring-red-500 ring-offset-2' : isImpending ? 'ring-2 ring-orange-400 ring-offset-2' : '';

    return (
      <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-start space-x-4 transition-all duration-300 group min-w-0 relative ring-offset-white dark:ring-offset-slate-900
            ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-indigo-200 dark:hover:border-slate-700' : ''}
            ${warningClass}
        `}
      >
          {(isWarning || isImpending) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWarning ? 'bg-red-400' : 'bg-orange-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isWarning ? 'bg-red-500' : 'bg-orange-500'}`}></span>
            </span>
          )}
          <div className={`p-3 rounded-lg ${currentTheme.bg} ${(!isWarning && !isImpending) && 'group-hover:scale-110'} transition-transform duration-300 shrink-0`}>
            <Icon size={24} className={currentTheme.text} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-bold mb-1 tracking-wide uppercase truncate ${isWarning ? 'text-red-600' : isImpending ? 'text-orange-600' : 'text-slate-500 dark:text-slate-400'}`}>{title}</p>
            <h3 className={`text-2xl font-bold tracking-tight truncate ${isWarning ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{value}</h3>
            {subtext && <p className={`text-xs mt-1 font-medium truncate ${isWarning ? 'text-red-500/80' : 'text-slate-400 dark:text-slate-500'}`}>{subtext}</p>}
          </div>
      </div>
    );
  };

  // Reusable Flow Component
  const LogisticsFlow = ({ title, steps, colorClass, lineColor }: { title: string, steps: any[], colorClass: string, lineColor: string }) => (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            {steps[0].icon} {/* Use first icon as header icon */}
            {title}
        </h3>
        <div className="relative flex justify-between items-start pt-2 px-2">
            {/* Connecting Line */}
            <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -z-0">
                 <div className={`h-full ${lineColor} opacity-20 w-full`}></div>
            </div>

            {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center relative z-10 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm transition-transform hover:scale-110 ${step.count > 0 ? colorClass : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        {React.cloneElement(step.icon, { size: 16 })}
                    </div>
                    <div className="mt-3 text-center">
                        <div className={`text-xl font-bold ${step.count > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                            {step.count}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight">{step.label}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
            icon={ShoppingBag} 
            theme="violet"
            title="订单总数" 
            value={stats.totalOrders} 
            subtext="累计所有订单"
            onClick={() => onNavigate && onNavigate('All')}
        />
        <StatCard 
            icon={Clock} 
            theme="amber"
            title="待采购" 
            value={stats.pending} 
            subtext="等待下单"
            onClick={() => onNavigate && onNavigate(OrderStatus.PENDING)}
        />
        <StatCard 
            icon={AlertTriangle} 
            theme="red"
            title="已超时预警" 
            value={overdueCount} 
            subtext="发货或物流严重滞后"
            isWarning={overdueCount > 0}
            onClick={() => onNavigate && onNavigate('delayed')}
        />
        <StatCard 
            icon={Hourglass} 
            theme="orange"
            title="即将超时" 
            value={impendingCount} 
            subtext={`未来 ${warningRules.impendingBufferHours}h 内需关注`}
            isImpending={impendingCount > 0}
            onClick={() => onNavigate && onNavigate('delayed')}
        />
        <StatCard 
            icon={DollarSign} 
            theme="blue"
            title="总采购额" 
            value={`$${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })}`} 
            subtext="USD 累计金额"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Logistics & Charts */}
        <div className="lg:col-span-2 space-y-6">
             
            {/* 1. Inbound Logistics Flow */}
            <LogisticsFlow 
                title="采购入库链路 (Inbound)"
                colorClass="bg-blue-500 text-white"
                lineColor="bg-blue-500"
                steps={[
                    { label: '待采购', count: inboundData.toBuy, icon: <ShoppingCart /> },
                    { label: '待商家发', count: inboundData.purchased, icon: <Clock /> },
                    { label: '商家在途', count: inboundData.supplierTransit, icon: <Truck /> },
                    { label: '已入库', count: inboundData.arrived, icon: <Warehouse /> }
                ]}
            />

            {/* 2. Outbound Logistics Flow */}
            <LogisticsFlow 
                title="发货履约链路 (Outbound)"
                colorClass="bg-emerald-500 text-white"
                lineColor="bg-emerald-500"
                steps={[
                    { label: '待出库', count: outboundData.ready, icon: <Archive /> },
                    { label: '国际运输', count: outboundData.inTransit, icon: <Plane /> },
                    { label: '异常/待取', count: outboundData.deliveryIssue, icon: <AlertCircle /> },
                    { label: '客户签收', count: outboundData.delivered, icon: <Home /> }
                ]}
            />

            {/* Status Distribution (Pie Chart) */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-8 items-center mt-2">
                <div className="flex-1 w-full relative">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wider flex items-center gap-2">
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
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    animationBegin={0}
                                    animationDuration={1500}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                    <Label 
                                        value={stats.totalOrders} 
                                        position="center" 
                                        className="fill-slate-800 dark:fill-white text-3xl font-bold"
                                        style={{ fontSize: '24px', fontWeight: 'bold' }}
                                    />
                                    <Label 
                                        value="Total" 
                                        position="center" 
                                        dy={20}
                                        className="fill-slate-500 dark:fill-slate-400 text-xs uppercase"
                                        style={{ fontSize: '12px' }}
                                    />
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="flex flex-wrap justify-center content-center gap-x-6 gap-y-3 w-full md:w-auto md:max-w-[200px] border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-6">
                    {statusData.map((entry, index) => (
                        <div key={index} className="flex items-center text-xs text-slate-600 dark:text-slate-300 font-medium w-full">
                            <div className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                            <span className="flex-1 truncate mr-2">{entry.name}</span>
                            <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Platform Distribution (Bar Chart) */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-violet-500 rounded-full"></div>
                    平台订单分布 (Top 8)
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.4} />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 11, fill: '#64748b' }} 
                                axisLine={false} 
                                tickLine={false}
                                interval={0}
                                dy={10}
                            />
                            <YAxis 
                                tick={{ fontSize: 11, fill: '#64748b' }} 
                                axisLine={false} 
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip 
                                content={<CustomTooltip />}
                                cursor={{ fill: '#f1f5f9', opacity: 0.2 }}
                            />
                            <Bar 
                                dataKey="value" 
                                fill="url(#barGradient)" 
                                radius={[6, 6, 0, 0]} 
                                barSize={45} 
                                animationDuration={1500}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>

        {/* Right Column: Warning List */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full max-h-[820px]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    风险监控大屏
                </h3>
                <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
                    {warningList.length}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {warningList.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                        <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50 text-emerald-500" />
                        <p className="text-xs">无风险订单，运行完美！</p>
                    </div>
                ) : (
                    warningList.map(order => {
                        const isOverdue = order.health.status === 'overdue';
                        const themeColor = isOverdue ? 'red' : 'orange';
                        const bgColor = isOverdue ? 'bg-red-50 dark:bg-red-900/10' : 'bg-orange-50 dark:bg-orange-900/10';
                        const borderColor = isOverdue ? 'border-red-100 dark:border-red-900/30' : 'border-orange-100 dark:border-orange-900/30';
                        const textColor = isOverdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400';

                        return (
                            <div key={order.id} 
                                className={`p-4 rounded-lg border transition-colors cursor-pointer group ${bgColor} ${borderColor} hover:opacity-90`}
                                onClick={() => onNavigate && onNavigate('delayed')}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{order.itemName}</h4>
                                    <span className={`text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border font-mono font-bold ${textColor} ${borderColor}`}>
                                        {isOverdue ? '已超时' : '即将超时'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-slate-500 dark:text-slate-400">{order.platform}</span>
                                    <span className="font-mono text-slate-400 dark:text-slate-500">#{order.platformOrderId?.slice(-6) || 'NoID'}</span>
                                </div>
                                
                                <div className={`mt-2 text-[10px] flex items-center justify-between font-medium ${textColor}`}>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} /> 
                                        {order.health.msg}
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 px-1.5 rounded">
                                        {order.status === OrderStatus.PURCHASED ? '待发货' : '待签收'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
             {warningList.length > 0 && (
                <div 
                    onClick={() => onNavigate && onNavigate('delayed')}
                    className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    处理所有风险订单 &rarr;
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

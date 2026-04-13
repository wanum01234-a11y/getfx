import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Layout } from "@/components/layout";
import { mockDashboardStats, mockChartDataDaily, mockChartDataWeekly, mockChartDataMonthly, type Trade } from "@/lib/mock-data";
import { useDemoMode, useMt5Trades } from "@/lib/mt5";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity, Hash, Briefcase } from "lucide-react";

const normalizeSymbolKey = (symbol: string) => {
  return String(symbol || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

const getPipSize = (symbol: string): number | null => {
  const key = normalizeSymbolKey(symbol);

  if (key.includes("BTC") || key.includes("ETH")) return null;

  if (key.includes("XAU")) return 0.01;
  if (key.includes("XAG")) return 0.01;
  if (key.includes("USOIL") || key.includes("WTI")) return 0.01;

  if (key.includes("US30") || key.includes("NAS") || key.includes("SPX")) return 1;

  if (key.endsWith("JPY")) return 0.01;

  const looksLikeForex = /^[A-Z]{6}$/.test(key);
  if (looksLikeForex) return 0.0001;

  return 1;
};

const calcPips = (trade: Trade) => {
  if (trade.status !== "Closed") return 0;
  if (!Number.isFinite(trade.entryPrice)) return 0;
  if (!Number.isFinite(trade.closePrice)) return 0;

  const entry = trade.entryPrice;
  const close = trade.closePrice as number;
  const rawDiff = trade.type === "Sell" ? entry - close : close - entry;

  const pipSize = getPipSize(trade.symbol);
  if (pipSize === null) return rawDiff;
  if (!Number.isFinite(pipSize)) return 0;

  return rawDiff / pipSize;
};

const dedupeTradesById = (trades: Trade[]) => {
  const map = new Map<string, Trade>();
  for (const t of trades) {
    if (!t || !t.id) continue;
    const existing = map.get(t.id);
    if (!existing) {
      map.set(t.id, t);
      continue;
    }

    if (existing.status !== "Closed" && t.status === "Closed") {
      map.set(t.id, t);
      continue;
    }

    map.set(t.id, { ...existing, ...t });
  }
  return Array.from(map.values());
};

export default function Dashboard() {
  const useDemo = useDemoMode();
  const openTradesQuery = useMt5Trades("open", !useDemo);
  const closedTradesQuery = useMt5Trades("closed", !useDemo);
  const [timeframe, setTimeframe] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");

  const openTrades = useMemo<Trade[]>(() => {
    if (useDemo) return [];
    return Array.isArray(openTradesQuery.data) ? openTradesQuery.data : [];
  }, [openTradesQuery.data, useDemo]);

  const closedTrades = useMemo<Trade[]>(() => {
    if (useDemo) return [];
    return Array.isArray(closedTradesQuery.data) ? closedTradesQuery.data : [];
  }, [closedTradesQuery.data, useDemo]);

  const resolvedStats = useMemo(() => {
    if (useDemo) return mockDashboardStats;

    const uniqueAllTrades = dedupeTradesById([...openTrades, ...closedTrades]);
    const uniqueClosedTrades = dedupeTradesById(closedTrades).filter((t) => t.status === "Closed");
    const totalProfit = uniqueAllTrades.reduce((sum, t) => sum + (Number.isFinite(t.profit) ? t.profit : 0), 0);
    const wins = uniqueClosedTrades.filter((t) => (Number.isFinite(t.profit) ? t.profit : 0) > 0).length;
    const winRate = uniqueClosedTrades.length > 0 ? Number(((wins / uniqueClosedTrades.length) * 100).toFixed(1)) : 0;
    const totalPips = uniqueClosedTrades.reduce((sum, t) => sum + calcPips(t), 0);

    return {
      totalTrades: uniqueAllTrades.length,
      totalProfit,
      totalPips: Number.isFinite(totalPips) ? Number(totalPips.toFixed(1)) : 0,
      openTradesCount: dedupeTradesById(openTrades).length,
      closedTradesCount: uniqueClosedTrades.length,
      winRate,
    };
  }, [closedTrades, openTrades, useDemo]);

  const chartData = timeframe === "Daily" ? mockChartDataDaily 
                  : timeframe === "Weekly" ? mockChartDataWeekly 
                  : mockChartDataMonthly;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  return (
    <Layout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-6"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
            <p className="text-muted-foreground mt-1">Your trading performance at a glance.</p>
          </div>
        </motion.div>

        {/* Top Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Profit" 
            value={`$${resolvedStats.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
            icon={<TrendingUp className="w-5 h-5" />} 
            trend="+12.5%" 
            trendUp={true} 
            highlight="primary"
          />
          <StatCard 
            title="Total Trades" 
            value={resolvedStats.totalTrades.toString()} 
            icon={<Hash className="w-5 h-5" />} 
            highlight="muted"
          />
          <StatCard 
            title="Total Pips" 
            value={resolvedStats.totalPips.toLocaleString()} 
            icon={<Activity className="w-5 h-5" />} 
            trend="+340 this week" 
            trendUp={true} 
            highlight="primary"
          />
          <StatCard 
            title="Win Rate" 
            value={`${resolvedStats.winRate}%`} 
            icon={<Briefcase className="w-5 h-5" />} 
            highlight="muted"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:border-white/20"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Subtle glow effect behind chart */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/10 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-lg font-semibold text-white">Performance</h2>
                <div className="text-sm text-muted-foreground mt-1">Equity growth over time</div>
              </div>
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                {(["Daily", "Weekly", "Monthly"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      timeframe === t 
                        ? "bg-white/10 text-white shadow-sm" 
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[300px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Profit']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Right Sidebar Stats */}
          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="glass-card rounded-2xl p-6 border border-white/10 hover:border-white/20 relative overflow-hidden group"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <h2 className="text-lg font-semibold text-white mb-4">Trade Distribution</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,191,255,0.8)]"></div>
                    <span className="text-sm text-muted-foreground">Open Trades</span>
                  </div>
                  <span className="text-lg font-medium text-white">{resolvedStats.openTradesCount}</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-1/4 rounded-full"></div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                    <span className="text-sm text-muted-foreground">Closed Trades</span>
                  </div>
                  <span className="text-lg font-medium text-white">{resolvedStats.closedTradesCount}</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-muted-foreground w-3/4 rounded-full"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="glass-card rounded-2xl p-6 border border-white/10 hover:border-white/20 relative overflow-hidden group"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,191,255,0.10),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
                <TrendingUp className="w-24 h-24" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2 relative z-10">System Status</h2>
              <p className="text-sm text-muted-foreground mb-4 relative z-10">All trading systems are operational.</p>
              <div className="flex items-center gap-2 text-sm text-primary font-medium relative z-10">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,191,255,0.8)]"></span>
                Connected to Exchange
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}

function StatCard({ title, value, icon, trend, trendUp, highlight }: { title: string, value: string, icon: React.ReactNode, trend?: string, trendUp?: boolean, highlight: "primary" | "muted" }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="glass-card rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-colors"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_60%)]" />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
          
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${highlight === 'primary' ? 'bg-primary/10 text-primary' : 'bg-white/5 text-muted-foreground'}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

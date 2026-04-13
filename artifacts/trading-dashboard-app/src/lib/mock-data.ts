export interface Trade {
  id: string;
  symbol: string;
  type: "Buy" | "Sell";
  lot: number;
  entryPrice: number;
  currentPrice?: number;
  closePrice?: number;
  profit: number;
  status: "Open" | "Closed";
  duration?: string;
  openedAt: string;
  closedAt?: string;
}

export const mockOpenTrades: Trade[] = [
  { id: "trd_1", symbol: "BTC/USD", type: "Buy", lot: 0.5, entryPrice: 62450.00, currentPrice: 63120.50, profit: 335.25, status: "Open", openedAt: "2024-05-12T08:30:00Z" },
  { id: "trd_2", symbol: "ETH/USD", type: "Sell", lot: 2.0, entryPrice: 3100.20, currentPrice: 3050.10, profit: 100.20, status: "Open", openedAt: "2024-05-12T09:15:00Z" },
  { id: "trd_3", symbol: "EUR/USD", type: "Buy", lot: 1.5, entryPrice: 1.0850, currentPrice: 1.0820, profit: -45.00, status: "Open", openedAt: "2024-05-12T10:05:00Z" },
  { id: "trd_4", symbol: "XAU/USD", type: "Buy", lot: 0.1, entryPrice: 2340.50, currentPrice: 2355.80, profit: 153.00, status: "Open", openedAt: "2024-05-12T11:20:00Z" },
  { id: "trd_5", symbol: "SOL/USD", type: "Sell", lot: 10.0, entryPrice: 145.60, currentPrice: 148.20, profit: -260.00, status: "Open", openedAt: "2024-05-12T12:00:00Z" },
];

export const mockClosedTrades: Trade[] = [
  { id: "trd_101", symbol: "GBP/JPY", type: "Sell", lot: 1.0, entryPrice: 192.40, closePrice: 191.80, profit: 420.00, status: "Closed", duration: "4h 15m", openedAt: "2024-05-11T08:00:00Z", closedAt: "2024-05-11T12:15:00Z" },
  { id: "trd_102", symbol: "BTC/USD", type: "Buy", lot: 0.2, entryPrice: 61000.00, closePrice: 61800.00, profit: 160.00, status: "Closed", duration: "2h 30m", openedAt: "2024-05-11T14:00:00Z", closedAt: "2024-05-11T16:30:00Z" },
  { id: "trd_103", symbol: "ETH/USD", type: "Buy", lot: 1.5, entryPrice: 2950.00, closePrice: 2900.00, profit: -75.00, status: "Closed", duration: "1h 10m", openedAt: "2024-05-10T09:00:00Z", closedAt: "2024-05-10T10:10:00Z" },
  { id: "trd_104", symbol: "USD/JPY", type: "Buy", lot: 2.0, entryPrice: 155.20, closePrice: 156.10, profit: 850.00, status: "Closed", duration: "1d 2h", openedAt: "2024-05-09T08:00:00Z", closedAt: "2024-05-10T10:00:00Z" },
  { id: "trd_105", symbol: "XAU/USD", type: "Sell", lot: 0.5, entryPrice: 2320.00, closePrice: 2335.00, profit: -750.00, status: "Closed", duration: "5h 45m", openedAt: "2024-05-09T14:00:00Z", closedAt: "2024-05-09T19:45:00Z" },
  { id: "trd_106", symbol: "AVAX/USD", type: "Buy", lot: 50.0, entryPrice: 32.40, closePrice: 36.80, profit: 220.00, status: "Closed", duration: "8h 20m", openedAt: "2024-05-08T04:00:00Z", closedAt: "2024-05-08T12:20:00Z" },
];

export const mockDashboardStats = {
  totalTrades: 124,
  totalProfit: 14850.50,
  totalPips: 3420,
  openTradesCount: mockOpenTrades.length,
  closedTradesCount: mockClosedTrades.length,
  winRate: 68.5,
};

export const mockChartDataDaily = [
  { time: "00:00", profit: 12000 },
  { time: "04:00", profit: 12400 },
  { time: "08:00", profit: 12100 },
  { time: "12:00", profit: 13500 },
  { time: "16:00", profit: 13200 },
  { time: "20:00", profit: 14850 },
];

export const mockChartDataWeekly = [
  { time: "Mon", profit: 10500 },
  { time: "Tue", profit: 11200 },
  { time: "Wed", profit: 10800 },
  { time: "Thu", profit: 12500 },
  { time: "Fri", profit: 14850 },
  { time: "Sat", profit: 14850 },
  { time: "Sun", profit: 14850 },
];

export const mockChartDataMonthly = [
  { time: "Week 1", profit: 8500 },
  { time: "Week 2", profit: 10200 },
  { time: "Week 3", profit: 12800 },
  { time: "Week 4", profit: 14850 },
];

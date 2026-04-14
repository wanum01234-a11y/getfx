import { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { mockOpenTrades, Trade } from "@/lib/mock-data";
import { useDemoMode, useMt5Trades } from "@/lib/mt5";
import { WhatsAppTradeShareDialog } from "@/components/whatsapp-trade-share-dialog";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function OpenTrades() {
  const useDemo = useDemoMode();
  const mt5 = useMt5Trades("open", !useDemo);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareInitialId, setShareInitialId] = useState<string | undefined>(undefined);

  const trades = useMemo<Trade[]>(() => {
    if (useDemo) return mockOpenTrades;
    return Array.isArray(mt5.data) ? mt5.data : [];
  }, [mt5.data, useDemo]);

  const openShare = (tradeId?: string) => {
    setShareInitialId(tradeId);
    setShareOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Open Trades</h1>
            <p className="text-muted-foreground mt-1">Live market positions and real-time PnL.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium">Symbol</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Lot</th>
                  <th className="px-6 py-4 font-medium">Entry Price</th>
                  <th className="px-6 py-4 font-medium">Current Price</th>
                  <th className="px-6 py-4 font-medium">Profit</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={trade.id} 
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,191,255,0.8)]"></div>
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        trade.type === 'Buy' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{trade.lot.toFixed(2)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{trade.entryPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-white font-medium">{trade.currentPrice?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openShare(trade.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-primary hover:text-white text-muted-foreground transition-all"
                        title="Share via WhatsApp"
                        aria-label={`Share ${trade.symbol} open trade via WhatsApp`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {trades.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No open trades currently.
            </div>
          )}
        </div>

        <WhatsAppTradeShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          trades={trades}
          initialSelectedTradeId={shareInitialId}
        />
      </div>
    </Layout>
  );
}

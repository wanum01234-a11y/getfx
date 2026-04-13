import { useState } from "react";
import { Layout } from "@/components/layout";
import { mockClosedTrades, Trade } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { Clock, Calendar, ArrowRight, MessageCircle } from "lucide-react";

export default function ClosedTrades() {
  const [trades] = useState<Trade[]>(mockClosedTrades);

  const generateClosedTradeMessage = (trade: Trade) => {
    return [
      "Trade Closed",
      `Symbol: ${trade.symbol}`,
      `Type: ${trade.type}`,
      `Entry: ${trade.entryPrice}`,
      `Close: ${trade.closePrice}`,
      `Profit: ${trade.profit >= 0 ? "+" : ""}$${trade.profit.toFixed(2)}`,
      `Duration: ${trade.duration}`,
    ].join("\n");
  };

  const shareClosedTrade = (trade: Trade) => {
    const url = `https://wa.me/?text=${encodeURIComponent(generateClosedTradeMessage(trade))}`;
    window.open(url, "_blank");
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Trade History</h1>
            <p className="text-muted-foreground mt-1">Completed positions and final outcomes.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium">Symbol</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Entry → Close</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium text-right">Profit</th>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          trade.profit >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {trade.symbol.split('/')[0]}
                        </div>
                        <div>
                          <div className="font-medium text-white">{trade.symbol}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(trade.closedAt || "").toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        trade.type === 'Buy' ? 'bg-white/10 text-white' : 'bg-white/5 text-muted-foreground'
                      }`}>
                        {trade.type} {trade.lot.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{trade.entryPrice.toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-white font-medium">{trade.closePrice?.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {trade.duration}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold text-lg ${trade.profit >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]' : 'text-red-400'}`}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => shareClosedTrade(trade)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-primary hover:text-white text-muted-foreground transition-all hover:shadow-[0_0_14px_rgba(0,191,255,0.35)]"
                        title="Share closed trade via WhatsApp"
                        aria-label={`Share ${trade.symbol} closed trade via WhatsApp`}
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
              No closed trades history.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

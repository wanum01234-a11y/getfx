import { useState } from "react";
import { Layout } from "@/components/layout";
import { mockOpenTrades, Trade } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ExternalLink, Edit2, X, Share2, Save } from "lucide-react";

export default function OpenTrades() {
  const [trades] = useState<Trade[]>(mockOpenTrades);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [template, setTemplate] = useState(`🚀 Trade Alert
Symbol: {symbol}
Type: {type}
Entry: {entry}
Profit: {profit}`);

  const handleShareClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsModalOpen(true);
  };

  const generateMessage = (trade: Trade, tmpl: string) => {
    return tmpl
      .replace("{symbol}", trade.symbol)
      .replace("{type}", trade.type)
      .replace("{entry}", trade.entryPrice.toString())
      .replace("{profit}", `$${trade.profit.toFixed(2)}`);
  };

  const executeShare = () => {
    if (!selectedTrade) return;
    const msg = generateMessage(selectedTrade, template);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setIsModalOpen(false);
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
                        onClick={() => handleShareClick(trade)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-primary hover:text-white text-muted-foreground transition-all"
                        title="Share via WhatsApp"
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
      </div>

      <AnimatePresence>
        {isModalOpen && selectedTrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  Share Trade
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Message Template
                  </label>
                  <textarea 
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Available variables: <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">{`{symbol}`}</code> <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">{`{type}`}</code> <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">{`{entry}`}</code> <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">{`{profit}`}</code>
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</h4>
                  <pre className="text-sm text-white font-sans whitespace-pre-wrap">
                    {generateMessage(selectedTrade, template)}
                  </pre>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeShare}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,191,255,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

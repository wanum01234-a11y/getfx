import { useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { mockClosedTrades, mockOpenTrades } from "@/lib/mock-data";
import {
  buildWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATE,
  getSavedWhatsAppTemplate,
  saveWhatsAppTemplate,
  whatsappVariables,
} from "@/lib/whatsapp-template";
import { motion } from "framer-motion";
import { Check, Copy, RotateCcw, Save, Wand2 } from "lucide-react";

export default function WhatsAppTemplateSettings() {
  const [template, setTemplate] = useState(getSavedWhatsAppTemplate);
  const [saved, setSaved] = useState(false);
  const [previewType, setPreviewType] = useState<"open" | "closed">("open");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const previewTrade = previewType === "open" ? mockOpenTrades[0] : mockClosedTrades[0];
  const previewMessage = useMemo(
    () => buildWhatsAppMessage(previewTrade, template),
    [previewTrade, template],
  );

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplate((current) => `${current}${variable}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextTemplate = `${template.slice(0, start)}${variable}${template.slice(end)}`;
    setTemplate(nextTemplate);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const handleSave = () => {
    saveWhatsAppTemplate(template);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    setTemplate(DEFAULT_WHATSAPP_TEMPLATE);
  };

  const handleCopyPreview = async () => {
    await navigator.clipboard.writeText(previewMessage);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium mb-4">
              <Wand2 className="w-3.5 h-3.5" />
              WhatsApp Sharing Control
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">WhatsApp Template Settings</h1>
            <p className="text-muted-foreground mt-1">
              Customize the exact message sent from Open Trades and Closed Trades.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Default
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 hover:shadow-[0_0_18px_rgba(0,191,255,0.35)] transition-all"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved" : "Save Template"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl border border-white/10 overflow-hidden"
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Message Builder</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add or remove any text. Click variables below to insert live trade values.
              </p>
            </div>

            <div className="p-6 space-y-5">
              <textarea
                ref={textareaRef}
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                className="w-full min-h-72 bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono leading-relaxed custom-scrollbar"
                spellCheck={false}
              />

              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Available Variables</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {whatsappVariables.map((variable) => (
                    <button
                      key={variable.key}
                      onClick={() => insertVariable(variable.key)}
                      className="text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-primary/10 hover:border-primary/40 transition-all p-3 group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <code className="text-primary text-xs bg-primary/10 px-2 py-1 rounded-lg">
                          {variable.key}
                        </code>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-primary">
                          Insert
                        </span>
                      </div>
                      <div className="text-white text-sm font-medium mt-2">{variable.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{variable.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="space-y-6"
          >
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Live Preview</h2>
                  <p className="text-sm text-muted-foreground mt-1">See how variables convert before sharing.</p>
                </div>
                <button
                  onClick={handleCopyPreview}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary hover:text-white text-muted-foreground transition-all flex items-center justify-center"
                  title="Copy preview"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/30 border border-white/10">
                  {(["open", "closed"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPreviewType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        previewType === type
                          ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                          : "text-muted-foreground hover:text-white"
                      }`}
                    >
                      {type === "open" ? "Open Trade" : "Closed Trade"}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 min-h-72">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-4">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,191,255,0.8)]" />
                    WhatsApp Message Output
                  </div>
                  <pre className="text-sm text-white font-sans whitespace-pre-wrap leading-relaxed">
                    {previewMessage}
                  </pre>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white">How it works</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>1. Write any custom text in the template box.</p>
                <p>2. Insert variables where live trade values should appear.</p>
                <p>3. Save once. Open Trades and Closed Trades both use this saved template.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Copy, Link as LinkIcon, Webhook } from "lucide-react";
import { clearAllData, saveSetting } from "@/lib/settings";

const USE_DEMO_STORAGE_KEY = "nexus-use-demo-data";

const getUseDemoDefault = () => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(USE_DEMO_STORAGE_KEY);
  if (raw === null) return true;
  return raw !== "false";
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [useDemoData, setUseDemoData] = useState(getUseDemoDefault);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookUrlNoKey, setWebhookUrlNoKey] = useState<string | null>(null);
  const [requireKey, setRequireKey] = useState<boolean>(true);
  const [includeKey, setIncludeKey] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearStep, setClearStep] = useState<1 | 2>(1);
  const [clearAcknowledge, setClearAcknowledge] = useState(false);

  const resolvedWebhookUrl = useMemo(() => {
    if (webhookUrl && includeKey) return webhookUrl;
    if (webhookUrlNoKey && !includeKey) return webhookUrlNoKey;
    if (webhookUrl && !includeKey) return webhookUrl;
    const envOrigin = (import.meta.env.VITE_PUBLIC_BASE_URL || import.meta.env.VITE_BASE_URL || "").trim();
    const origin = typeof window === "undefined" ? envOrigin : envOrigin || window.location.origin;
    return origin ? `${origin}/api/webhook/mt5?key=YOUR_SECRET` : null;
  }, [includeKey, webhookUrl, webhookUrlNoKey]);

  const toggleUseDemo = (next: boolean) => {
    setUseDemoData(next);
    window.localStorage.setItem(USE_DEMO_STORAGE_KEY, String(next));
    window.dispatchEvent(new CustomEvent("nexus-demo-mode-updated", { detail: next }));

    // API-first persistence (safe): if API fails, localStorage still controls behavior.
    saveSetting("demo_mode", String(next)).catch(() => {
      // ignore (fallback remains localStorage)
    });
  };

  const onClearAllData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      await queryClient.cancelQueries({ queryKey: ["mt5"] });
      queryClient.removeQueries({ queryKey: ["mt5"] });
      await queryClient.invalidateQueries({ queryKey: ["mt5"] });
      await queryClient.refetchQueries({ queryKey: ["mt5"] });
      toast({ title: "Cleared", description: "All dashboard data was cleared." });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to clear data",
        description: "Make sure the API server is running.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const loadWebhookUrl = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/mt5");
      if (!res.ok) throw new Error("Failed to load webhook settings");
      const json = (await res.json()) as {
        webhookUrl: string;
        webhookUrlWithKey?: string;
        webhookUrlNoKey?: string;
        requireKey?: boolean;
      };
      setWebhookUrl(json.webhookUrlWithKey || json.webhookUrl);
      setWebhookUrlNoKey(json.webhookUrlNoKey || null);
      const serverRequiresKey = json.requireKey !== false;
      setRequireKey(serverRequiresKey);
      setIncludeKey(serverRequiresKey);
    } catch {
      toast({
        variant: "destructive",
        title: "Could not load webhook URL",
        description: "Make sure the API server is running.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhook = async () => {
    if (!resolvedWebhookUrl) return;
    await navigator.clipboard.writeText(resolvedWebhookUrl);
    toast({ title: "Copied", description: "Webhook URL copied to clipboard." });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium mb-4">
              <Webhook className="w-3.5 h-3.5" />
              Integrations
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Control data sources and integrations.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">MT5 Webhook Integration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send live trading data from MT5 Expert Advisor into this dashboard.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  Webhook URL
                </div>
                <div className="text-xs text-muted-foreground">Keep this secret. Anyone with it can push trades.</div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={loadWebhookUrl} disabled={isLoading}>
                  Load URL
                </Button>
                <Button onClick={copyWebhook} disabled={!resolvedWebhookUrl}>
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <code className="text-sm text-white break-all">{resolvedWebhookUrl || "Loading..."}</code>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div>
                <div className="text-sm font-semibold text-white">Include Secret Key</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {requireKey
                    ? "This server requires a key. Keep it enabled."
                    : "Optional. You can send without a key for easier testing."}
                </div>
              </div>
              <Switch
                checked={includeKey}
                onCheckedChange={(next) => setIncludeKey(requireKey ? true : next)}
                disabled={requireKey}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div>
                <div className="text-sm font-semibold text-white">Use Demo Data</div>
                <div className="text-xs text-muted-foreground mt-1">
                  If disabled, the dashboard will try to load real MT5 webhook data first.
                </div>
              </div>
              <Switch checked={useDemoData} onCheckedChange={toggleUseDemo} />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div>
                <div className="text-sm font-semibold text-white">Clear All Data</div>
                <div className="text-xs text-muted-foreground mt-1">Deletes trades and account snapshots from the server (keeps settings).</div>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  setClearStep(1);
                  setClearDialogOpen(true);
                }}
                disabled={isClearing}
              >
                {isClearing ? "Clearing..." : "Clear All Data"}
              </Button>
            </div>

            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {clearStep === 1 ? "Confirm" : "Final confirmation"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {clearStep === 1
                      ? "Do you want to clear all MT5 trades and account data from the database?"
                      : "This will permanently delete ALL MT5 trades (open + closed) and account snapshots. This action cannot be undone."}
                  </AlertDialogDescription>
                  {clearStep === 2 ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-red-400">
                        Warning: your data will be cleared now.
                      </div>
                      <div className="text-xs text-red-400/90">
                        This action will remove real MT5 trades from the database. After clearing, new incoming webhook entries will appear as fresh real data.
                      </div>
                      <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 cursor-pointer select-none">
                        <Checkbox
                          checked={clearAcknowledge}
                          onCheckedChange={(v) => setClearAcknowledge(v === true)}
                        />
                        <span className="text-sm text-muted-foreground leading-5">
                          I understand this will permanently delete my real MT5 data.
                        </span>
                      </label>
                    </div>
                  ) : null}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setClearDialogOpen(false);
                      setClearStep(1);
                      setClearAcknowledge(false);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>

                  {clearStep === 1 ? (
                    <AlertDialogAction
                      onClick={(e) => {
                        // Keep dialog open for step 2 (Radix closes on Action click unless prevented)
                        e.preventDefault();
                        setClearStep(2);
                        setClearAcknowledge(false);
                        setClearDialogOpen(true);
                      }}
                    >
                      Continue
                    </AlertDialogAction>
                  ) : (
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={!clearAcknowledge || isClearing}
                      onClick={async () => {
                        setClearDialogOpen(false);
                        setClearStep(1);
                        setClearAcknowledge(false);
                        await onClearAllData();
                      }}
                    >
                      Yes, clear now
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <div className="text-sm font-semibold text-white">How to use webhook</div>
              <div className="text-xs text-muted-foreground">
                1) Click <span className="text-white font-medium">Load URL</span> and copy the webhook URL.
                <br />
                2) Paste it in your MT5 EA.
                <br />
                3) Send JSON data. It will appear in the dashboard automatically.
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <code className="text-xs text-white break-all">
                  {`{\n  "balance": 1000,\n  "equity": 1050\n}`}
                </code>
              </div>

              <div className="text-xs text-muted-foreground">
                If using a secret key, keep <span className="text-white font-medium">Include Secret Key</span> ON and make sure your URL contains:
                <br />
                <span className="text-white font-mono">?key=YOUR_KEY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

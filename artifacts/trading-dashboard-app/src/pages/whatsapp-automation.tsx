import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Send, Save } from "lucide-react";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/lib/whatsapp-template";

type AutomationSettings = {
  enabled: boolean;
  sendOpenAlerts: boolean;
  sendClosedAlerts: boolean;
  twilioAccountSid: string;
  twilioFromNumber: string;
  userToNumber: string;
  hasAuthToken: boolean;
  template: string;
};

export default function WhatsAppAutomationPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [sendOpenAlerts, setSendOpenAlerts] = useState(true);
  const [sendClosedAlerts, setSendClosedAlerts] = useState(true);

  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioFromNumber, setTwilioFromNumber] = useState("whatsapp:+14155238886");
  const [userToNumber, setUserToNumber] = useState("whatsapp:+");

  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);

  const templatePreview = useMemo(() => {
    return template
      .replaceAll("{symbol}", "EURUSD")
      .replaceAll("{type}", "Buy")
      .replaceAll("{entry}", "1.08000")
      .replaceAll("{profit}", "+$12.50")
      .replaceAll("{status}", "Open");
  }, [template]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/whatsapp-automation");
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as AutomationSettings;

      setEnabled(json.enabled);
      setSendOpenAlerts(json.sendOpenAlerts);
      setSendClosedAlerts(json.sendClosedAlerts);
      setTwilioAccountSid(json.twilioAccountSid || "");
      setTwilioFromNumber(json.twilioFromNumber || "whatsapp:+14155238886");
      setUserToNumber(json.userToNumber || "whatsapp:+");
      setTemplate(json.template || DEFAULT_WHATSAPP_TEMPLATE);

      setTwilioAuthToken("");

      if (json.hasAuthToken) {
        toast({ title: "Loaded", description: "Twilio settings loaded. Auth token is hidden for security." });
      }
    } catch {
      toast({ variant: "destructive", title: "Load failed", description: "Make sure the API server is running." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/whatsapp-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          sendOpenAlerts,
          sendClosedAlerts,
          twilioAccountSid,
          twilioAuthToken: twilioAuthToken || undefined,
          twilioFromNumber,
          userToNumber,
          template,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      toast({ title: "Saved", description: "WhatsApp automation settings saved." });
      setTwilioAuthToken("");
    } catch {
      toast({ variant: "destructive", title: "Save failed", description: "Please check your inputs." });
    } finally {
      setLoading(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/whatsapp-automation/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "✅ Test message from Fxprotrade (WhatsApp Automation)" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Sent", description: "Test WhatsApp message sent." });
    } catch {
      toast({ variant: "destructive", title: "Test failed", description: "Could not send message. Check Twilio settings." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium mb-4">
              <MessageCircle className="w-3.5 h-3.5" />
              Automation
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">WhatsApp Automation</h1>
            <p className="text-muted-foreground mt-1">Configure Twilio once. Trade updates will be sent automatically.</p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={loadSettings} disabled={loading}>
              Reload
            </Button>
            <Button onClick={save} disabled={loading}>
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Automation Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">Enable/disable alerts without changing your webhook.</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div>
                <div className="text-sm font-semibold text-white">Enable WhatsApp Automation</div>
                <div className="text-xs text-muted-foreground mt-1">When enabled, webhook trade events trigger WhatsApp messages.</div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div>
                  <div className="text-sm font-semibold text-white">Send Open Trade Alerts</div>
                  <div className="text-xs text-muted-foreground mt-1">Send message when a new trade opens.</div>
                </div>
                <Switch checked={sendOpenAlerts} onCheckedChange={setSendOpenAlerts} />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div>
                  <div className="text-sm font-semibold text-white">Send Closed Trade Alerts</div>
                  <div className="text-xs text-muted-foreground mt-1">Send message when a trade closes.</div>
                </div>
                <Switch checked={sendClosedAlerts} onCheckedChange={setSendClosedAlerts} />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Twilio Configuration</h2>
            <p className="text-sm text-muted-foreground mt-1">Credentials are stored on the server and never shown again after saving.</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Account SID</Label>
                <Input value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Auth Token</Label>
                <Input value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} type="password" placeholder="••••••••" />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Twilio WhatsApp Number (from)</Label>
                <Input value={twilioFromNumber} onChange={(e) => setTwilioFromNumber(e.target.value)} placeholder="whatsapp:+14155238886" />
              </div>

              <div className="space-y-2">
                <Label className="text-white">User WhatsApp Number (to)</Label>
                <Input value={userToNumber} onChange={(e) => setUserToNumber(e.target.value)} placeholder="whatsapp:+923001234567" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={test} disabled={testing || loading || !enabled}>
                <Send className="w-4 h-4" />
                {testing ? "Sending..." : "Test Connection"}
              </Button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Message Template</h2>
            <p className="text-sm text-muted-foreground mt-1">Uses the same variables and default template as the existing WhatsApp Template page.</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Template</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="min-h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Preview</div>
              <pre className="text-sm text-white whitespace-pre-wrap">{templatePreview}</pre>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

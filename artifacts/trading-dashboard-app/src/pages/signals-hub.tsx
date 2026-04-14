import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MessageCircle, Tag } from "lucide-react";
import { createSignalsTemplate, deleteSignalsTemplate, fetchSignalsTemplates, updateSignalsTemplate, type SignalsTemplate } from "@/lib/signals-templates";
import { useDemoMode, useMt5Account, useMt5Trades } from "@/lib/mt5";
import type { Trade } from "@/lib/mock-data";
import { SignalsTemplateShareDialog } from "@/components/signals-template-share-dialog";

const CATEGORIES = [
  "New Trade",
  "Running Trade",
  "Profit Booked",
  "Stop Loss",
  "Daily Summary",
  "Marketing / Alerts",
] as const;

type FormState = {
  id?: string;
  title: string;
  category: string;
  content: string;
};

const emptyForm = (): FormState => ({
  title: "",
  category: CATEGORIES[0],
  content: "",
});

const categoryBadgeClass = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes("profit")) return "bg-green-500/10 text-green-400 border-green-500/20";
  if (c.includes("stop")) return "bg-red-500/10 text-red-400 border-red-500/20";
  if (c.includes("daily")) return "bg-blue-500/10 text-blue-300 border-blue-500/20";
  if (c.includes("marketing")) return "bg-purple-500/10 text-purple-300 border-purple-500/20";
  return "bg-white/10 text-white border-white/10";
};

export default function SignalsHubPage() {
  const useDemo = useDemoMode();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["signals", "templates"],
    queryFn: fetchSignalsTemplates,
    enabled: !useDemo,
    staleTime: 10_000,
  });

  const openTradesQuery = useMt5Trades("open", !useDemo);
  const closedTradesQuery = useMt5Trades("closed", !useDemo);
  const accountQuery = useMt5Account(!useDemo);

  const trades = useMemo<Trade[]>(() => {
    const open = Array.isArray(openTradesQuery.data) ? openTradesQuery.data : [];
    const closed = Array.isArray(closedTradesQuery.data) ? closedTradesQuery.data : [];
    return [...open, ...closed];
  }, [closedTradesQuery.data, openTradesQuery.data]);

  const stats = useMemo(() => {
    const account = accountQuery.data;
    const closed = Array.isArray(closedTradesQuery.data) ? closedTradesQuery.data : [];
    const wins = closed.filter((t) => Number.isFinite(t.profit) && t.profit > 0).length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

    return {
      totalTrades: Number((account as { totalTrades?: unknown } | undefined)?.totalTrades ?? 0),
      balance: Number((account as { balance?: unknown } | undefined)?.balance ?? 0),
      equity: Number((account as { equity?: unknown } | undefined)?.equity ?? 0),
      winRate,
    };
  }, [accountQuery.data, closedTradesQuery.data]);

  const templates = useMemo<SignalsTemplate[]>(() => {
    if (useDemo) return [];
    return Array.isArray(templatesQuery.data) ? templatesQuery.data : [];
  }, [templatesQuery.data, useDemo]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareTemplate, setShareTemplate] = useState<SignalsTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: { title: string; category: string; content: string }) => createSignalsTemplate(body),
    onSuccess: async () => {
      toast({ title: "Created", description: "Template created." });
      setEditorOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["signals", "templates"] });
    },
    onError: () => toast({ variant: "destructive", title: "Create failed", description: "Could not create template." }),
  });

  const updateMutation = useMutation({
    mutationFn: (body: { id: string; title: string; category: string; content: string }) => updateSignalsTemplate(body),
    onSuccess: async () => {
      toast({ title: "Saved", description: "Template updated." });
      setEditorOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["signals", "templates"] });
    },
    onError: () => toast({ variant: "destructive", title: "Save failed", description: "Could not update template." }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSignalsTemplate(id),
    onSuccess: async () => {
      toast({ title: "Deleted", description: "Template deleted." });
      await queryClient.invalidateQueries({ queryKey: ["signals", "templates"] });
    },
    onError: () => toast({ variant: "destructive", title: "Delete failed", description: "Could not delete template." }),
  });

  const openCreate = () => {
    setForm(emptyForm());
    setEditorOpen(true);
  };

  const openEdit = (t: SignalsTemplate) => {
    setForm({ id: t.id, title: t.title, category: t.category, content: t.content });
    setEditorOpen(true);
  };

  const save = () => {
    const title = form.title.trim();
    const category = form.category.trim();
    const content = form.content.trim();

    if (!title || !category || !content) {
      toast({ variant: "destructive", title: "Validation", description: "Title, category and content are required." });
      return;
    }

    if (form.id) {
      updateMutation.mutate({ id: form.id, title, category, content });
      return;
    }

    createMutation.mutate({ title, category, content });
  };

  const openShare = (t: SignalsTemplate) => {
    setShareTemplate(t);
    setShareOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Signals Hub</h1>
            <p className="text-muted-foreground mt-1">Manage announcement templates and share them instantly to WhatsApp.</p>
          </div>

          <Button onClick={openCreate} disabled={useDemo}>
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <div>
                <div className="text-white font-semibold">Templates</div>
                <div className="text-xs text-muted-foreground">
                  Supports variables: {"{symbol}"}, {"{type}"}, {"{entry}"}, {"{sl}"}, {"{tp}"}, {"{profit}"}, {"{total_trades}"}, {"{win_rate}"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {useDemo ? (
              <div className="text-sm text-muted-foreground">Disable demo mode to manage Signals Hub templates.</div>
            ) : templatesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground">No templates found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-bold text-lg leading-tight">{t.title}</div>
                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold mt-2 ${categoryBadgeClass(t.category)}`}>
                          {t.category}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Preview</div>
                      <div className="text-sm text-white whitespace-pre-wrap line-clamp-5">{t.content}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openEdit(t)}>
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button variant="secondary" onClick={() => deleteMutation.mutate(t.id)}>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                      <Button onClick={() => openShare(t)}>
                        <MessageCircle className="w-4 h-4" />
                        Share
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Template" : "New Template"}</DialogTitle>
              <DialogDescription>Create announcement templates and reuse them for WhatsApp updates.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Title</Label>
                <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Category</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-black">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Message Content</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
                  className="min-h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Available Variables</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {[
                    "{symbol}",
                    "{type}",
                    "{entry}",
                    "{sl}",
                    "{tp}",
                    "{profit}",
                    "{total_trades}",
                    "{win_rate}",
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, content: `${s.content}${s.content.endsWith("\n") || s.content.length === 0 ? "" : " "}${v}` }))}
                      className="text-left rounded-lg border border-white/10 bg-white/[0.03] hover:bg-primary/10 hover:border-primary/40 transition-all px-3 py-2"
                      title="Click to insert"
                    >
                      <code className="text-primary">{v}</code>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={createMutation.isPending || updateMutation.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SignalsTemplateShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          trades={trades}
          templateContent={shareTemplate?.content ?? ""}
          stats={stats}
        />
      </div>
    </Layout>
  );
}

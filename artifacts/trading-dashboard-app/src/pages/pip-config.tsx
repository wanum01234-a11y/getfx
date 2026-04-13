import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  createPipSetting,
  deletePipSetting,
  fetchPipSettings,
  type PipSetting,
  updatePipSetting,
} from "@/lib/pip-settings";

type Category = "forex" | "crypto" | "commodity" | "index";

const normalizeSymbol = (value: string) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

export default function PipConfigPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("forex");
  const [newPipSize, setNewPipSize] = useState("0.0001");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["pip-settings"],
    queryFn: fetchPipSettings,
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    const list = Array.isArray(query.data) ? query.data : [];
    const q = search.trim().toUpperCase();
    if (!q) return list;
    return list.filter((r) => r.symbol.toUpperCase().includes(q) || r.category.toUpperCase().includes(q));
  }, [query.data, search]);

  const [drafts, setDrafts] = useState<Record<number, { category?: Category; pipSize?: string }>>({});

  const setDraft = (id: number, patch: { category?: Category; pipSize?: string }) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["pip-settings"] });
    await queryClient.refetchQueries({ queryKey: ["pip-settings"] });
  };

  const onAdd = async () => {
    const symbol = normalizeSymbol(newSymbol);
    const pipSize = Number(newPipSize);

    if (!symbol) {
      toast({ variant: "destructive", title: "Validation", description: "Symbol is required" });
      return;
    }
    if (!Number.isFinite(pipSize) || pipSize <= 0 || pipSize > 1_000_000) {
      toast({ variant: "destructive", title: "Validation", description: "Pip Size must be a positive number" });
      return;
    }

    try {
      await createPipSetting({ symbol, category: newCategory, pipSize });
      await refresh();
      setNewSymbol("");
      toast({ title: "Saved", description: "Pip setting added." });
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not save pip setting" });
    }
  };

  const onSaveRow = async (row: PipSetting) => {
    const draft = drafts[row.id] || {};
    const pipSizeRaw = draft.pipSize ?? String(row.pipSize);
    const pipSize = Number(pipSizeRaw);
    const category = (draft.category ?? row.category) as Category;

    if (!Number.isFinite(pipSize) || pipSize <= 0 || pipSize > 1_000_000) {
      toast({ variant: "destructive", title: "Validation", description: "Pip Size must be a positive number" });
      return;
    }

    setSavingId(row.id);
    try {
      await updatePipSetting(row.id, { category, pipSize });
      await refresh();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      toast({ title: "Saved", description: "Pip setting updated." });
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not update pip setting" });
    } finally {
      setSavingId(null);
    }
  };

  const onDeleteRow = async (id: number) => {
    setDeletingId(id);
    try {
      await deletePipSetting(id);
      await refresh();
      toast({ title: "Deleted", description: "Pip setting deleted." });
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not delete pip setting" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Pip Configuration</h1>
            <p className="text-muted-foreground mt-1">Manage pip sizes per instrument symbol.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="w-full md:w-80">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search symbol or category..." />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => refresh()} disabled={query.isFetching}>
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="Symbol (e.g. EURUSD)" />

              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forex">forex</SelectItem>
                  <SelectItem value="commodity">commodity</SelectItem>
                  <SelectItem value="crypto">crypto</SelectItem>
                  <SelectItem value="index">index</SelectItem>
                </SelectContent>
              </Select>

              <Input value={newPipSize} onChange={(e) => setNewPipSize(e.target.value)} placeholder="Pip Size (e.g. 0.0001)" />

              <Button onClick={onAdd} disabled={query.isFetching}>
                Add
              </Button>
            </div>
          </div>

          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pip Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const draft = drafts[row.id] || {};
                  const pipSizeValue = draft.pipSize ?? String(row.pipSize);
                  const categoryValue = (draft.category ?? row.category) as Category;

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-white">{row.symbol}</TableCell>
                      <TableCell>
                        <Select value={categoryValue} onValueChange={(v) => setDraft(row.id, { category: v as Category })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="forex">forex</SelectItem>
                            <SelectItem value="commodity">commodity</SelectItem>
                            <SelectItem value="crypto">crypto</SelectItem>
                            <SelectItem value="index">index</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={pipSizeValue} onChange={(e) => setDraft(row.id, { pipSize: e.target.value })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => onSaveRow(row)}
                            disabled={savingId === row.id || deletingId === row.id}
                          >
                            {savingId === row.id ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => onDeleteRow(row.id)}
                            disabled={savingId === row.id || deletingId === row.id}
                          >
                            {deletingId === row.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {rows.length === 0 ? <div className="p-6 text-center text-muted-foreground">No pip settings found.</div> : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}

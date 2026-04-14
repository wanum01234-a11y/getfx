export type SignalsTemplate = {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt?: string;
};

export const fetchSignalsTemplates = async () => {
  const res = await fetch("/api/signals-templates");
  if (!res.ok) throw new Error("Failed to fetch signals templates");
  const json = (await res.json()) as { templates: SignalsTemplate[] };
  return json.templates;
};

export const createSignalsTemplate = async (body: { title: string; category: string; content: string }) => {
  const res = await fetch("/api/signals-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create signals template");
  return (await res.json()) as { ok: true; id: string };
};

export const updateSignalsTemplate = async (body: { id: string; title: string; category: string; content: string }) => {
  const res = await fetch("/api/signals-templates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update signals template");
  return (await res.json()) as { ok: true };
};

export const deleteSignalsTemplate = async (id: string) => {
  const res = await fetch(`/api/signals-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete signals template");
  return (await res.json()) as { ok: true };
};

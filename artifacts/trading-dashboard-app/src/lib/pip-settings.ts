export type PipSetting = {
  id: number;
  symbol: string;
  category: string;
  pipSize: number;
  updatedAt: string;
};

export type PipSettingCreateBody = {
  symbol: string;
  category: string;
  pipSize: number;
};

export type PipSettingUpdateBody = Partial<PipSettingCreateBody>;

let cache: PipSetting[] | null = null;
let cacheAt = 0;
const TTL_MS = 60_000;

export const fetchPipSettings = async (): Promise<PipSetting[]> => {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;

  const res = await fetch("/api/pip-settings");
  if (!res.ok) throw new Error("Failed to fetch pip settings");

  const json = (await res.json()) as { pipSettings?: PipSetting[] };
  cache = Array.isArray(json.pipSettings) ? json.pipSettings : [];
  cacheAt = now;
  return cache;
};

export const invalidatePipSettingsCache = () => {
  cache = null;
  cacheAt = 0;
};

export const createPipSetting = async (body: PipSettingCreateBody): Promise<void> => {
  const res = await fetch("/api/pip-settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create pip setting");
  invalidatePipSettingsCache();
};

export const updatePipSetting = async (id: number, body: PipSettingUpdateBody): Promise<void> => {
  const res = await fetch(`/api/pip-settings/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update pip setting");
  invalidatePipSettingsCache();
};

export const deletePipSetting = async (id: number): Promise<void> => {
  const res = await fetch(`/api/pip-settings/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete pip setting");
  invalidatePipSettingsCache();
};

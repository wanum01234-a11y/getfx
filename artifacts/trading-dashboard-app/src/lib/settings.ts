export type SettingsMap = Record<string, string>;

type GetSettingsResponse = {
  settings: SettingsMap;
};

type SaveSettingBody = {
  key: string;
  value: string;
};

export const fetchSettings = async (): Promise<SettingsMap> => {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  const json = (await res.json()) as GetSettingsResponse;
  return json.settings || {};
};

export const saveSetting = async (key: string, value: string): Promise<void> => {
  const body: SaveSettingBody = { key, value };
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save setting");
};

export const clearAllData = async (): Promise<void> => {
  const res = await fetch("/api/clear-data", { method: "POST" });
  if (!res.ok) throw new Error("Failed to clear data");
};

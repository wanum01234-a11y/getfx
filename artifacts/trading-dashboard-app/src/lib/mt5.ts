import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Trade } from "@/lib/mock-data";
import { fetchSettings } from "@/lib/settings";

const USE_DEMO_STORAGE_KEY = "nexus-use-demo-data";
const DEMO_MODE_SETTING_KEY = "demo_mode";

export const getUseDemoData = () => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(USE_DEMO_STORAGE_KEY);
  if (raw === null) return true;
  return raw !== "false";
};

const applyDemoModeValue = (next: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USE_DEMO_STORAGE_KEY, String(next));
  window.dispatchEvent(new CustomEvent("nexus-demo-mode-updated", { detail: next }));
};

export const useDemoMode = () => {
  const [useDemo, setUseDemo] = useState(getUseDemoData);

  useEffect(() => {
    let cancelled = false;

    // API-first: if server settings are available, apply them.
    // If API fails, fall back to existing localStorage behavior.
    fetchSettings()
      .then((settings) => {
        if (cancelled) return;
        const raw = settings[DEMO_MODE_SETTING_KEY];
        if (raw === undefined) return;
        const next = String(raw) !== "false";
        applyDemoModeValue(next);
        setUseDemo(next);
      })
      .catch(() => {
        // ignore, fallback to localStorage
      });

    const handler = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      if (typeof custom.detail === "boolean") setUseDemo(custom.detail);
      else setUseDemo(getUseDemoData());
    };

    window.addEventListener("nexus-demo-mode-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("nexus-demo-mode-updated", handler);
    };
  }, []);

  return useDemo;
};

const fetchTrades = async (status: "open" | "closed") => {
  const res = await fetch(`/api/mt5/trades/${status}`);
  if (!res.ok) throw new Error("Failed to fetch MT5 trades");
  const json = (await res.json()) as { trades: Trade[] };
  return json.trades;
};

export const useMt5Trades = (status: "open" | "closed", enabled: boolean) => {
  return useQuery({
    queryKey: ["mt5", "trades", status],
    queryFn: () => fetchTrades(status),
    enabled,
    staleTime: 3_000,
    refetchInterval: 5_000,
  });
};

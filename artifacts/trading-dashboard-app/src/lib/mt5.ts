import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Trade } from "@/lib/mock-data";

const USE_DEMO_STORAGE_KEY = "nexus-use-demo-data";

export const getUseDemoData = () => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(USE_DEMO_STORAGE_KEY);
  if (raw === null) return true;
  return raw !== "false";
};

export const useDemoMode = () => {
  const [useDemo, setUseDemo] = useState(getUseDemoData);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      if (typeof custom.detail === "boolean") setUseDemo(custom.detail);
      else setUseDemo(getUseDemoData());
    };

    window.addEventListener("nexus-demo-mode-updated", handler);
    return () => window.removeEventListener("nexus-demo-mode-updated", handler);
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

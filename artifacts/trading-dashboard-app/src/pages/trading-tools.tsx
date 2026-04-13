import { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, Info, RotateCcw, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

type TradeSide = "buy" | "sell";

type Accent = "cyan" | "violet" | "amber" | "emerald" | "rose";

const toNumber = (value: string): number | null => {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

const formatNumber = (value: number, decimals = 2) => {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-white text-right break-all">{value}</div>
    </div>
  );
}

const accentText = (accent: Accent) =>
  accent === "cyan"
    ? "text-cyan-300"
    : accent === "violet"
      ? "text-violet-300"
      : accent === "amber"
        ? "text-amber-300"
        : accent === "emerald"
          ? "text-emerald-300"
          : "text-red-300";

const accentRing = (accent: Accent) =>
  accent === "cyan"
    ? "focus-within:ring-cyan-400/25"
    : accent === "violet"
      ? "focus-within:ring-violet-400/25"
      : accent === "amber"
        ? "focus-within:ring-amber-400/25"
        : accent === "emerald"
          ? "focus-within:ring-emerald-400/25"
          : "focus-within:ring-red-400/25";

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-black/40 text-muted-foreground hover:text-white transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-[260px]">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function MotionCard({
  accent,
  children,
}: {
  accent: Accent;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  const accentClass =
    accent === "cyan"
      ? "from-cyan-400/25 via-sky-400/10 to-transparent"
      : accent === "violet"
        ? "from-violet-400/25 via-fuchsia-400/10 to-transparent"
        : accent === "amber"
          ? "from-amber-400/25 via-orange-400/10 to-transparent"
          : accent === "emerald"
            ? "from-emerald-400/25 via-teal-400/10 to-transparent"
            : "from-red-400/25 via-rose-400/10 to-transparent";

  const ringClass =
    accent === "cyan"
      ? "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_30px_80px_-40px_rgba(34,211,238,0.35)]"
      : accent === "violet"
        ? "hover:shadow-[0_0_0_1px_rgba(167,139,250,0.25),0_30px_80px_-40px_rgba(167,139,250,0.35)]"
        : accent === "amber"
          ? "hover:shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_30px_80px_-40px_rgba(251,191,36,0.35)]"
          : accent === "emerald"
            ? "hover:shadow-[0_0_0_1px_rgba(52,211,153,0.25),0_30px_80px_-40px_rgba(52,211,153,0.35)]"
            : "hover:shadow-[0_0_0_1px_rgba(248,113,113,0.25),0_30px_80px_-40px_rgba(248,113,113,0.35)]";

  return (
    <motion.div
      className="relative"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.35, ease: "easeOut" }}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -2,
              scale: 1.01,
            }
      }
      style={reduceMotion ? undefined : { transformStyle: "preserve-3d" }}
    >
      <div
        className={
          "pointer-events-none absolute -inset-px rounded-[18px] bg-gradient-to-br opacity-70 blur-[10px] transition-opacity duration-300 " +
          accentClass
        }
      />
      <div
        className={
          "pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)] opacity-70"
        }
      />
      <div
        className={
          "relative rounded-2xl transition-shadow duration-300 will-change-transform " +
          ringClass
        }
      >
        {children}
      </div>
    </motion.div>
  );
}

function CalculatorCard({
  title,
  description,
  children,
  onReset,
  accent,
  active,
  onActivate,
  emphasis,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onReset: () => void;
  accent: Accent;
  active: boolean;
  onActivate: () => void;
  emphasis?: boolean;
}) {
  const isEmphasized = Boolean(emphasis) || active;

  return (
    <MotionCard accent={accent}>
      <Card
        className={
          "glass-card border border-white/10 overflow-hidden rounded-2xl bg-black/30 ring-1 ring-transparent transition-colors focus-within:ring-2 " +
          accentRing(accent) +
          (active ? " ring-white/10" : "")
        }
        onMouseEnter={onActivate}
        onFocusCapture={onActivate}
      >
        <CardHeader className="border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className={"text-lg " + (isEmphasized ? accentText(accent) : "text-white")}>
                  {title}
                </CardTitle>
                {emphasis && (
                  <span
                    className={
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-black/40 " +
                      accentText(accent)
                    }
                  >
                    Priority
                  </span>
                )}
              </div>
              <CardDescription className="text-muted-foreground">{description}</CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={onReset}
              className="shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">{children}</CardContent>
      </Card>
    </MotionCard>
  );
}

function LotSizeCalculator({ active, onActivate }: { active: boolean; onActivate: () => void }) {
  const accent: Accent = "rose";
  const [balance, setBalance] = useState("1000");
  const [riskPct, setRiskPct] = useState("1");
  const [stopLossPips, setStopLossPips] = useState("20");

  const parsed = useMemo(() => {
    const b = toNumber(balance);
    const r = toNumber(riskPct);
    const sl = toNumber(stopLossPips);

    const errors: string[] = [];
    if (b === null || b <= 0) errors.push("Balance must be greater than 0.");
    if (r === null || r <= 0 || r > 100) errors.push("Risk must be between 0 and 100.");
    if (sl === null || sl <= 0) errors.push("Stop Loss must be greater than 0.");

    const riskAmount = b && r ? (b * r) / 100 : null;

    const assumedPipValuePerLot = 10;
    const lotSize =
      riskAmount !== null && sl !== null
        ? riskAmount / (sl * assumedPipValuePerLot)
        : null;

    return { errors, riskAmount, lotSize };
  }, [balance, riskPct, stopLossPips]);

  const onReset = () => {
    setBalance("1000");
    setRiskPct("1");
    setStopLossPips("20");
  };

  const lotText =
    parsed.lotSize === null
      ? "-"
      : `${formatNumber(Math.max(0, parsed.lotSize), 2)} lots`;

  return (
    <CalculatorCard
      title="Lot Size Calculator"
      description="Estimate position size based on risk and stop loss."
      onReset={onReset}
      accent={accent}
      active={active}
      onActivate={onActivate}
      emphasis
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText(accent) : "")}>Account Balance</Label>
          <Input value={balance} onChange={(e) => setBalance(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText(accent) : "")}>Risk (%)</Label>
          <Input value={riskPct} onChange={(e) => setRiskPct(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText(accent) : "")}>Stop Loss (pips)</Label>
          <Input
            value={stopLossPips}
            onChange={(e) => setStopLossPips(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">Results</div>
          <HelpTip text="Assumes $10 pip value per 1.00 lot (typical for many USD-quoted majors)." />
        </div>
        <ResultRow
          label="Risk Amount"
          value={parsed.riskAmount === null ? "-" : `$${formatNumber(parsed.riskAmount, 2)}`}
        />
        <div className={active ? accentText(accent) : ""}>
          <ResultRow label="Lot Size" value={lotText} />
        </div>
      </div>

      {parsed.errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {parsed.errors[0]}
        </div>
      )}
    </CalculatorCard>
  );
}

function ProfitLossCalculator({ active, onActivate }: { active: boolean; onActivate: () => void }) {
  const [entry, setEntry] = useState("1.08000");
  const [exit, setExit] = useState("1.08500");
  const [lots, setLots] = useState("0.10");
  const [side, setSide] = useState<TradeSide>("buy");

  const computed = useMemo(() => {
    const e = toNumber(entry);
    const x = toNumber(exit);
    const l = toNumber(lots);

    const errors: string[] = [];
    if (e === null || e <= 0) errors.push("Entry must be greater than 0.");
    if (x === null || x <= 0) errors.push("Exit must be greater than 0.");
    if (l === null || l <= 0) errors.push("Lot size must be greater than 0.");

    const rawDiff = e !== null && x !== null ? x - e : null;
    const direction = side === "buy" ? 1 : -1;
    const points = rawDiff !== null ? rawDiff * direction : null;

    const assumedContractValuePerLot = 100000;
    const pl = points !== null && l !== null ? points * assumedContractValuePerLot * l : null;

    return { errors, pl };
  }, [entry, exit, lots, side]);

  const onReset = () => {
    setEntry("1.08000");
    setExit("1.08500");
    setLots("0.10");
    setSide("buy");
  };

  const pl = computed.pl;
  const plText = pl === null ? "-" : `$${formatNumber(pl, 2)}`;
  const plTone = pl === null ? "text-white" : pl >= 0 ? "text-primary" : "text-destructive";

  return (
    <CalculatorCard
      title="Profit / Loss Calculator"
      description="Quick estimate of P/L for a price move."
      onReset={onReset}
      accent="violet"
      active={active}
      onActivate={onActivate}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("violet") : "")}>Entry Price</Label>
          <Input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("violet") : "")}>Exit Price</Label>
          <Input value={exit} onChange={(e) => setExit(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("violet") : "")}>Lot Size</Label>
          <Input value={lots} onChange={(e) => setLots(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-white">Trade Type</Label>
            <HelpTip text="This calculator uses a simplified FX contract size (100,000 units per 1.00 lot)." />
          </div>
          <Select value={side} onValueChange={(v) => setSide(v as TradeSide)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
        <div className="text-sm font-semibold text-white">Result</div>
        <div className={"text-2xl font-bold " + (active ? accentText("violet") : plTone)}>{plText}</div>
        <div className="text-xs text-muted-foreground">
          Estimate only. Real P/L depends on symbol, contract size, currency conversion, spreads and swaps.
        </div>
      </div>

      {computed.errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {computed.errors[0]}
        </div>
      )}
    </CalculatorCard>
  );
}

function RiskCalculator({ active, onActivate }: { active: boolean; onActivate: () => void }) {
  const [balance, setBalance] = useState("1000");
  const [riskPct, setRiskPct] = useState("1");
  const [stopLossPips, setStopLossPips] = useState("20");

  const computed = useMemo(() => {
    const b = toNumber(balance);
    const r = toNumber(riskPct);
    const sl = toNumber(stopLossPips);

    const errors: string[] = [];
    if (b === null || b <= 0) errors.push("Balance must be greater than 0.");
    if (r === null || r <= 0 || r > 100) errors.push("Risk must be between 0 and 100.");
    if (sl === null || sl <= 0) errors.push("Stop Loss must be greater than 0.");

    const riskAmount = b !== null && r !== null ? (b * r) / 100 : null;
    return { errors, riskAmount };
  }, [balance, riskPct, stopLossPips]);

  const onReset = () => {
    setBalance("1000");
    setRiskPct("1");
    setStopLossPips("20");
  };

  return (
    <CalculatorCard
      title="Risk Calculator"
      description="Convert risk percent into a monetary amount."
      onReset={onReset}
      accent="amber"
      active={active}
      onActivate={onActivate}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("amber") : "")}>Account Balance</Label>
          <Input value={balance} onChange={(e) => setBalance(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("amber") : "")}>Risk (%)</Label>
          <Input value={riskPct} onChange={(e) => setRiskPct(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("amber") : "")}>Stop Loss (pips)</Label>
          <Input
            value={stopLossPips}
            onChange={(e) => setStopLossPips(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
        <div className="text-sm font-semibold text-white">Risk Amount</div>
        <div className={"text-2xl font-bold " + (active ? accentText("amber") : "text-white")}>
          {computed.riskAmount === null ? "-" : `$${formatNumber(computed.riskAmount, 2)}`}
        </div>
        <div className="text-xs text-muted-foreground">
          Stop Loss is included for context; this calculator focuses on risk % only.
        </div>
      </div>

      {computed.errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {computed.errors[0]}
        </div>
      )}
    </CalculatorCard>
  );
}

function RiskRewardCalculator({ active, onActivate }: { active: boolean; onActivate: () => void }) {
  const [entry, setEntry] = useState("1.08000");
  const [stopLoss, setStopLoss] = useState("1.07800");
  const [takeProfit, setTakeProfit] = useState("1.08500");

  const computed = useMemo(() => {
    const e = toNumber(entry);
    const sl = toNumber(stopLoss);
    const tp = toNumber(takeProfit);

    const errors: string[] = [];
    if (e === null || e <= 0) errors.push("Entry must be greater than 0.");
    if (sl === null || sl <= 0) errors.push("Stop Loss must be greater than 0.");
    if (tp === null || tp <= 0) errors.push("Take Profit must be greater than 0.");

    if (e !== null && sl !== null && e === sl) errors.push("Entry and Stop Loss cannot be the same.");

    const risk = e !== null && sl !== null ? Math.abs(e - sl) : null;
    const reward = e !== null && tp !== null ? Math.abs(tp - e) : null;

    const rr = risk && reward ? reward / risk : null;

    return { errors, rr, risk, reward };
  }, [entry, stopLoss, takeProfit]);

  const onReset = () => {
    setEntry("1.08000");
    setStopLoss("1.07800");
    setTakeProfit("1.08500");
  };

  return (
    <CalculatorCard
      title="Risk Reward Calculator"
      description="See if the trade setup meets your R:R rules."
      onReset={onReset}
      accent="emerald"
      active={active}
      onActivate={onActivate}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("emerald") : "")}>Entry</Label>
          <Input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("emerald") : "")}>Stop Loss</Label>
          <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText("emerald") : "")}>Take Profit</Label>
          <Input
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">Results</div>
          <HelpTip text="Ratio shown as Reward / Risk. Values are based on absolute distance between prices." />
        </div>
        <ResultRow
          label="Risk Distance"
          value={computed.risk === null ? "-" : formatNumber(computed.risk, 5)}
        />
        <ResultRow
          label="Reward Distance"
          value={computed.reward === null ? "-" : formatNumber(computed.reward, 5)}
        />
        <div className={active ? accentText("emerald") : ""}>
          <ResultRow
            label="Risk/Reward"
            value={computed.rr === null ? "-" : `1 : ${formatNumber(computed.rr, 2)}`}
          />
        </div>
      </div>

      {computed.errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {computed.errors[0]}
        </div>
      )}
    </CalculatorCard>
  );
}

function PipCalculator({ active, onActivate }: { active: boolean; onActivate: () => void }) {
  const accent: Accent = "cyan";
  const [pair, setPair] = useState("EURUSD");
  const [lots, setLots] = useState("0.10");

  const computed = useMemo(() => {
    const l = toNumber(lots);

    const errors: string[] = [];
    if (!pair.trim()) errors.push("Pair is required.");
    if (l === null || l <= 0) errors.push("Lot size must be greater than 0.");

    const normalizedPair = pair.trim().toUpperCase();

    const pipValuePerLot = normalizedPair.endsWith("JPY") ? 9.1 : 10;
    const pipValue = l !== null ? pipValuePerLot * l : null;

    return { errors, pipValue, normalizedPair, pipValuePerLot };
  }, [pair, lots]);

  const onReset = () => {
    setPair("EURUSD");
    setLots("0.10");
  };

  return (
    <CalculatorCard
      title="Pip Calculator"
      description="Approximate pip value for a given pair and lot size."
      onReset={onReset}
      accent={accent}
      active={active}
      onActivate={onActivate}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className={"text-white " + (active ? accentText(accent) : "")}>Pair</Label>
            <HelpTip text="Uses simplified pip values: $10/lot for most USD-quoted majors, ~ $9.10/lot for JPY pairs." />
          </div>
          <Input value={pair} onChange={(e) => setPair(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className={"text-white " + (active ? accentText(accent) : "")}>Lot Size</Label>
          <Input value={lots} onChange={(e) => setLots(e.target.value)} inputMode="decimal" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
        <ResultRow label="Pair" value={computed.normalizedPair} />
        <ResultRow
          label="Pip Value (per 1.00 lot)"
          value={`$${formatNumber(computed.pipValuePerLot, 2)}`}
        />
        <ResultRow
          label="Pip Value (your lots)"
          value={computed.pipValue === null ? "-" : `$${formatNumber(computed.pipValue, 2)}`}
        />
      </div>

      {computed.errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {computed.errors[0]}
        </div>
      )}
    </CalculatorCard>
  );
}

export default function TradingToolsPage() {
  const reduceMotion = useReducedMotion();
  const [activeCard, setActiveCard] = useState<
    "lot" | "pl" | "risk" | "rr" | "pip" | "tips" | null
  >(null);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.35, ease: "easeOut" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,191,255,0.18),transparent_55%)]" />
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-[60px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-[60px]" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Trading Utilities
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Trading Tools</h1>
              <p className="text-muted-foreground mt-1">
                Fast calculators to plan risk, position size, and outcomes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="text-sm text-white font-medium">Live results</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <LotSizeCalculator active={activeCard === "lot"} onActivate={() => setActiveCard("lot")} />
          <ProfitLossCalculator active={activeCard === "pl"} onActivate={() => setActiveCard("pl")} />
          <RiskCalculator active={activeCard === "risk"} onActivate={() => setActiveCard("risk")} />
          <RiskRewardCalculator active={activeCard === "rr"} onActivate={() => setActiveCard("rr")} />
          <PipCalculator active={activeCard === "pip"} onActivate={() => setActiveCard("pip")} />

          <MotionCard accent="cyan">
            <Card className="glass-card border border-white/10 overflow-hidden rounded-2xl lg:col-span-2 xl:col-span-1 bg-black/30">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-white text-lg">Tips</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Make the tools match your broker & symbol settings.
                </CardDescription>
              </CardHeader>
              <CardContent
                className="space-y-4"
                onMouseEnter={() => setActiveCard("tips")}
                onFocusCapture={() => setActiveCard("tips")}
              >
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-sm font-semibold text-white">Defaults are examples</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    These calculators are lightweight and intentionally fast. For precision, validate pip value, contract size, and account currency in your terminal.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-sm font-semibold text-white">No page reloads</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Results update as you type, so you can tune a setup in seconds.
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="secondary"
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  Back to top
                </Button>
              </CardContent>
            </Card>
          </MotionCard>
        </div>
      </div>
    </Layout>
  );
}

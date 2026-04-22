"use client";

import { Trade } from "../types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props { trades: Trade[] }

function Row({
  icon,
  label,
  value,
  sub,
  subColor,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  subColor?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-medium text-gray-700">{label}</p>
          <p className={`text-[11px] mt-0.5 ${subColor ?? "text-gray-400"}`}>{sub}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-gray-900 tabular-nums">{value}</p>
        {trend && (
          <p className={`text-[10px] flex items-center gap-0.5 justify-end mt-0.5 ${trend.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend.value >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend.value).toFixed(1)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SecondaryStats({ trades }: Props) {
  const closed = trades.filter((t) => t.status === "Closed");
  const open = trades.filter((t) => t.status === "Open");
  const wins = closed.filter((t) => t.realizedPnl > 0);
  const losses = closed.filter((t) => t.realizedPnl < 0);

  const maxWin = wins.length > 0 ? Math.max(...wins.map((t) => t.realizedPnl)) : 0;
  const maxLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.realizedPnl)) : 0;

  const streak = (() => {
    if (!closed.length) return { current: 0, type: "—" as const };
    const s = [...closed].sort((a, b) => a.firstEntryDate.localeCompare(b.firstEntryDate));
    const type = s[s.length - 1].realizedPnl > 0 ? "W" as const : "L" as const;
    let cur = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      const w = s[i].realizedPnl > 0;
      if ((type === "W" && w) || (type === "L" && !w)) cur++;
      else break;
    }
    return { current: cur, type };
  })();

  const fmt = (n: number) =>
    `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div>
      <Row
        icon={<span className="text-sm">🏆</span>}
        label="Best Trade"
        value={maxWin > 0 ? `+${fmt(maxWin)}` : "—"}
        sub="largest single win"
        subColor="text-emerald-500"
      />
      <Row
        icon={<span className="text-sm">💔</span>}
        label="Worst Trade"
        value={maxLoss < 0 ? `−${fmt(maxLoss)}` : "—"}
        sub="largest single loss"
        subColor="text-red-400"
      />
      <Row
        icon={<span className="text-sm">🔥</span>}
        label="Streak"
        value={streak.current > 0 ? `${streak.current} ${streak.type}` : "—"}
        sub={streak.type === "W" ? "consecutive wins" : streak.type === "L" ? "consecutive losses" : "no streak"}
        subColor={streak.type === "W" ? "text-emerald-500" : streak.type === "L" ? "text-red-400" : "text-gray-400"}
      />
      <Row
        icon={<span className="text-sm">📂</span>}
        label="Open Positions"
        value={open.length}
        sub={open.length > 0 ? `${open.reduce((s, t) => s + t.openShares, 0)} total shares` : "none active"}
        subColor={open.length > 0 ? "text-blue-500" : "text-gray-400"}
      />
    </div>
  );
}

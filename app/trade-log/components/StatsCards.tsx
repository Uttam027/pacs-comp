"use client";

import { Trade } from "../types";
import { Card, CardContent } from "@/components/ui/card";

interface Props { trades: Trade[] }

export default function StatsCards({ trades: allTrades }: Props) {
  const trades = allTrades.filter((t) => t.status === "Closed");
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  const avgR = totalTrades > 0 ? trades.reduce((s, t) => s + t.rMultiple, 0) / totalTrades : 0;
  const maxWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0;
  const maxLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0;

  const streak = (() => {
    if (!trades.length) return { current: 0, type: "—" as const };
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    const type = sorted[sorted.length - 1].pnl > 0 ? "W" as const : "L" as const;
    let cur = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const w = sorted[i].pnl > 0;
      if ((type === "W" && w) || (type === "L" && !w)) cur++;
      else break;
    }
    return { current: cur, type };
  })();

  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const cards = [
    {
      label: "Net P&L",
      value: totalPnl !== 0 ? `${totalPnl >= 0 ? "+" : "−"}${fmt(totalPnl)}` : "—",
      color: totalPnl > 0 ? "text-emerald-600" : totalPnl < 0 ? "text-red-500" : "text-gray-400",
      bar: totalPnl > 0 ? "bg-emerald-500" : "bg-red-400",
      sub: `${totalTrades} closed`,
    },
    {
      label: "Win Rate",
      value: totalTrades > 0 ? `${winRate.toFixed(1)}%` : "—",
      color: winRate >= 50 ? "text-emerald-600" : "text-red-500",
      bar: winRate >= 50 ? "bg-emerald-500" : "bg-red-400",
      sub: `${wins.length}W · ${losses.length}L`,
    },
    {
      label: "Profit Factor",
      value: profitFactor > 0 ? profitFactor.toFixed(2) : "—",
      color: profitFactor >= 1.5 ? "text-emerald-600" : profitFactor > 1 ? "text-amber-500" : profitFactor > 0 ? "text-orange-500" : "text-gray-400",
      bar: profitFactor >= 1.5 ? "bg-emerald-500" : "bg-amber-400",
      sub: "Win ÷ |Loss|",
    },
    {
      label: "Avg R",
      value: totalTrades > 0 ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—",
      color: avgR >= 1 ? "text-emerald-600" : avgR >= 0 ? "text-amber-500" : "text-red-500",
      bar: avgR >= 1 ? "bg-emerald-500" : "bg-amber-400",
      sub: "per trade",
    },
    {
      label: "Best Trade",
      value: maxWin > 0 ? `+${fmt(maxWin)}` : "—",
      color: "text-emerald-600",
      bar: "bg-emerald-500",
      sub: "",
    },
    {
      label: "Worst Trade",
      value: maxLoss < 0 ? `−${fmt(maxLoss)}` : "—",
      color: "text-red-500",
      bar: "bg-red-400",
      sub: "",
    },
    {
      label: "Streak",
      value: streak.current > 0 ? `${streak.current} ${streak.type}` : "—",
      color: streak.type === "W" ? "text-emerald-600" : streak.type === "L" ? "text-red-500" : "text-gray-400",
      bar: streak.type === "W" ? "bg-emerald-500" : "bg-red-400",
      sub: "consecutive",
    },
    {
      label: "Avg Win",
      value: avgWin > 0 ? `+${fmt(avgWin)}` : "—",
      color: "text-emerald-600",
      bar: "bg-emerald-500",
      sub: avgLoss < 0 ? `Avg L: −${fmt(avgLoss)}` : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="relative overflow-hidden shadow-xs hover:shadow-sm transition-shadow py-0">
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.bar}`} />
          <CardContent className="pt-4 pb-3 px-3">
            <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">{card.label}</p>
            <p className={`text-sm font-bold tabular-nums leading-tight ${card.color}`}>{card.value}</p>
            {card.sub && <p className="text-[9px] text-gray-400 mt-1">{card.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

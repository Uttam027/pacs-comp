"use client";

import { Trade } from "../types";

interface Props { trades: Trade[] }

export default function StatsCards({ trades: allTrades }: Props) {
  const trades = allTrades.filter(t => t.status === "Closed");
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  const avgR = totalTrades > 0 ? trades.reduce((s, t) => s + t.rMultiple, 0) / totalTrades : 0;
  const maxWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const maxLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;

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
      value: `${totalPnl >= 0 ? "+" : "−"}${fmt(totalPnl)}`,
      color: totalPnl >= 0 ? "text-[#63dcb4]" : "text-[#f87171]",
      accent: totalPnl >= 0 ? "from-[#63dcb4]" : "from-[#f87171]",
      sub: `${totalTrades} closed`,
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? "text-[#63dcb4]" : "text-[#f87171]",
      accent: winRate >= 50 ? "from-[#63dcb4]" : "from-[#f87171]",
      sub: `${wins.length}W · ${losses.length}L`,
    },
    {
      label: "Profit Factor",
      value: profitFactor > 0 ? profitFactor.toFixed(2) : "—",
      color: profitFactor >= 1.5 ? "text-[#63dcb4]" : profitFactor > 1 ? "text-[#facc15]" : profitFactor > 0 ? "text-[#fb923c]" : "text-[#484f58]",
      accent: profitFactor >= 1.5 ? "from-[#63dcb4]" : "from-[#facc15]",
      sub: "Win÷|Loss|",
    },
    {
      label: "Avg R",
      value: avgR !== 0 ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—",
      color: avgR >= 1 ? "text-[#63dcb4]" : avgR >= 0 ? "text-[#facc15]" : "text-[#f87171]",
      accent: avgR >= 1 ? "from-[#63dcb4]" : "from-[#facc15]",
      sub: "per trade",
    },
    {
      label: "Best Trade",
      value: maxWin > 0 ? `+${fmt(maxWin)}` : "—",
      color: "text-[#63dcb4]",
      accent: "from-[#63dcb4]",
      sub: "",
    },
    {
      label: "Worst Trade",
      value: maxLoss < 0 ? `−${fmt(maxLoss)}` : "—",
      color: "text-[#f87171]",
      accent: "from-[#f87171]",
      sub: "",
    },
    {
      label: "Streak",
      value: streak.current > 0 ? `${streak.current} ${streak.type}` : "—",
      color: streak.type === "W" ? "text-[#63dcb4]" : streak.type === "L" ? "text-[#f87171]" : "text-[#484f58]",
      accent: streak.type === "W" ? "from-[#63dcb4]" : "from-[#f87171]",
      sub: "consecutive",
    },
    {
      label: "Avg Win",
      value: avgWin > 0 ? `+${fmt(avgWin)}` : "—",
      color: "text-[#63dcb4]",
      accent: "from-[#63dcb4]",
      sub: avgLoss < 0 ? `Avg L: −${fmt(avgLoss)}` : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(card => (
        <div key={card.label} className="bg-[#0d1117] border border-[#21262d] rounded-md p-3 relative overflow-hidden group hover:border-[#30363d] transition-colors">
          <div className={`absolute top-0 left-0 w-full h-0.5 bg-linear-to-r ${card.accent} to-transparent opacity-60`} />
          <p className="text-[9px] tracking-widest text-[#484f58] uppercase mb-2">{card.label}</p>
          <p className={`text-sm font-bold tabular-nums leading-tight ${card.color}`}>{card.value}</p>
          {card.sub && <p className="text-[9px] text-[#30363d] tracking-wide mt-1">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}

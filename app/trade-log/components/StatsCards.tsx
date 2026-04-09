"use client";

import { Trade } from "../types";

interface Props {
  trades: Trade[];
}

export default function StatsCards({ trades: allTrades }: Props) {
  const trades = allTrades.filter((t) => t.status === "Closed");

  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  const avgR = trades.length > 0 ? trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length : 0;
  const maxWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0;
  const maxLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0;

  const streak = (() => {
    if (trades.length === 0) return { current: 0, type: "—" };
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    let cur = 0;
    let type: "W" | "L" = sorted[sorted.length - 1].pnl > 0 ? "W" : "L";
    for (let i = sorted.length - 1; i >= 0; i--) {
      const w = sorted[i].pnl > 0;
      if ((type === "W" && w) || (type === "L" && !w)) cur++;
      else break;
    }
    return { current: cur, type };
  })();

  const cards = [
    {
      label: "Net P&L",
      value: `${totalPnl >= 0 ? "+" : ""}₹${Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      color: totalPnl >= 0 ? "text-[#4ade80]" : "text-[#f87171]",
      sub: `${totalTrades} closed trades`,
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? "text-[#4ade80]" : "text-[#f87171]",
      sub: `${wins.length}W / ${losses.length}L`,
    },
    {
      label: "Profit Factor",
      value: profitFactor > 0 ? profitFactor.toFixed(2) : "—",
      color: profitFactor >= 1.5 ? "text-[#4ade80]" : profitFactor > 0 ? "text-[#facc15]" : "text-[#555]",
      sub: "Avg Win / |Avg Loss|",
    },
    {
      label: "Avg R",
      value: `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R`,
      color: avgR >= 1 ? "text-[#4ade80]" : avgR >= 0 ? "text-[#facc15]" : "text-[#f87171]",
      sub: "per trade",
    },
    {
      label: "Best Trade",
      value: maxWin > 0 ? `+₹${maxWin.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—",
      color: "text-[#4ade80]",
      sub: "",
    },
    {
      label: "Worst Trade",
      value: maxLoss < 0 ? `-₹${Math.abs(maxLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—",
      color: "text-[#f87171]",
      sub: "",
    },
    {
      label: "Current Streak",
      value: streak.current > 0 ? `${streak.current} ${streak.type}` : "—",
      color: streak.type === "W" ? "text-[#4ade80]" : "text-[#f87171]",
      sub: "consecutive",
    },
    {
      label: "Avg Win",
      value: avgWin > 0 ? `+₹${avgWin.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—",
      color: "text-[#4ade80]",
      sub: `Avg Loss: ${avgLoss < 0 ? `-₹${Math.abs(avgLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#0f0f0f] border border-[#1a1a1a] p-3 space-y-1"
        >
          <p className="text-[9px] tracking-widest text-[#444] uppercase">{card.label}</p>
          <p className={`text-base font-bold tabular-nums ${card.color}`}>{card.value}</p>
          {card.sub && <p className="text-[9px] text-[#333] tracking-wide">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}

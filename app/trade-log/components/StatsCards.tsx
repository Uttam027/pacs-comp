"use client";

import { Trade } from "../types";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface Props { trades: Trade[] }

function TrendBadge({ value, label }: { value: number; label: string }) {
  if (value === 0) return <span className="text-[10px] text-gray-400 flex items-center gap-1"><Minus className="w-3 h-3" />{label}</span>;
  const up = value > 0;
  return (
    <span className={`text-[10px] flex items-center gap-1 ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="font-medium">{up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%</span>
      <span className="text-gray-400">{label}</span>
    </span>
  );
}

export default function StatsCards({ trades: allTrades }: Props) {
  const closed = allTrades.filter((t) => t.status === "Closed");
  const open = allTrades.filter((t) => t.status === "Open");

  // Open position metrics
  const capitalDeployed = open.reduce((s, t) => s + t.avgEntry * t.openShares, 0);
  const riskAtStop = open.reduce((s, t) => {
    const riskPerShare = Math.abs(t.avgEntry - t.stopLoss);
    return s + riskPerShare * t.openShares;
  }, 0);
  // Unrealized P&L based on partial exits already done (realized on open trades)
  const openRealizedPnl = open.reduce((s, t) => s + t.realizedPnl, 0);
  const total = closed.length;
  const wins = closed.filter((t) => t.realizedPnl > 0);
  const losses = closed.filter((t) => t.realizedPnl < 0);
  const winRate = total > 0 ? (wins.length / total) * 100 : 0;
  const totalPnl = allTrades.reduce((s, t) => s + t.realizedPnl, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.realizedPnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.realizedPnl, 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  const avgR = total > 0 ? closed.reduce((s, t) => s + t.rMultiple, 0) / total : 0;

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

  const cards = [
    {
      label: "Total Leads",
      customLabel: "Total Trades",
      icon: "📊",
      value: allTrades.length.toLocaleString("en-IN"),
      rawValue: allTrades.length,
      trendValue: 0,
      trendLabel: "vs last month",
      valueColor: "text-gray-900",
      accent: "bg-blue-500",
    },
    {
      label: "Net P&L",
      customLabel: "Net P&L",
      icon: "💰",
      value: totalPnl !== 0
        ? `${totalPnl >= 0 ? "+" : "−"}${fmt(totalPnl)}`
        : "—",
      rawValue: totalPnl,
      trendValue: 0,
      trendLabel: "vs last month",
      valueColor: totalPnl > 0 ? "text-emerald-600" : totalPnl < 0 ? "text-red-500" : "text-gray-900",
      accent: totalPnl >= 0 ? "bg-emerald-500" : "bg-red-400",
    },
    {
      label: "Win Rate",
      customLabel: "Win Rate",
      icon: "🎯",
      value: total > 0 ? `${winRate.toFixed(1)}%` : "—",
      rawValue: winRate,
      trendValue: 0,
      trendLabel: "vs last month",
      valueColor: winRate >= 50 ? "text-emerald-600" : winRate > 0 ? "text-red-500" : "text-gray-900",
      accent: winRate >= 50 ? "bg-emerald-500" : "bg-red-400",
    },
    {
      label: "Profit Factor",
      customLabel: "Profit Factor",
      icon: "⚖️",
      value: profitFactor > 0 ? profitFactor.toFixed(2) : "—",
      rawValue: profitFactor,
      trendValue: 0,
      trendLabel: "vs last month",
      valueColor: profitFactor >= 1.5 ? "text-emerald-600" : profitFactor > 1 ? "text-amber-500" : profitFactor > 0 ? "text-orange-500" : "text-gray-900",
      accent: profitFactor >= 1.5 ? "bg-emerald-500" : "bg-amber-400",
    },
    {
      label: "Avg R",
      customLabel: "Avg R-Multiple",
      icon: "📐",
      value: total > 0 ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—",
      rawValue: avgR,
      trendValue: 0,
      trendLabel: "closed trades",
      valueColor: avgR >= 1 ? "text-emerald-600" : avgR >= 0 ? "text-amber-500" : "text-red-500",
      accent: avgR >= 1 ? "bg-emerald-500" : "bg-amber-400",
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {cards.map((card) => (
          <div key={card.customLabel} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{card.icon}</span>
              <p className="text-[11px] font-medium text-gray-500">{card.customLabel}</p>
            </div>
            <p className={`text-xl font-bold tabular-nums ${card.valueColor}`}>{card.value}</p>
            <TrendBadge value={card.trendValue} label={card.trendLabel} />
          </div>
        ))}
      </div>

      {/* Mini breakdown bar */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-500">
        <span>
          <span className="font-semibold text-gray-900">{closed.length}</span> closed
        </span>
        <span>
          <span className="font-semibold text-blue-500">{open.length}</span> open
        </span>
        <span>
          <span className="font-semibold text-emerald-600">{wins.length}</span>W
        </span>
        <span>
          <span className="font-semibold text-red-500">{losses.length}</span>L
        </span>
        {streak.current > 0 && (
          <span className={`ml-auto font-semibold ${streak.type === "W" ? "text-emerald-600" : "text-red-500"}`}>
            {streak.current} {streak.type === "W" ? "win" : "loss"} streak
          </span>
        )}
      </div>

      {/* Open positions panel */}
      {open.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
              <Activity className="w-3 h-3 text-blue-600" />
            </div>
            <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-widest">Open Positions</p>
            <span className="ml-auto text-[10px] text-gray-400">no live feed · prices at entry</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-blue-50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-widest mb-1">Positions</p>
              <p className="text-lg font-bold text-blue-700 tabular-nums">{open.length}</p>
              <p className="text-[10px] text-blue-400 mt-0.5">
                {open.reduce((s, t) => s + t.openShares, 0).toLocaleString("en-IN")} shares
              </p>
            </div>
            <div className="bg-violet-50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-widest mb-1">Deployed</p>
              <p className="text-lg font-bold text-violet-700 tabular-nums">
                ₹{(capitalDeployed / 1000).toFixed(1)}k
              </p>
              <p className="text-[10px] text-violet-400 mt-0.5">at avg entry</p>
            </div>
            <div className="bg-red-50 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-red-500 font-semibold uppercase tracking-widest mb-1">Risk @ Stop</p>
              <p className="text-lg font-bold text-red-600 tabular-nums">
                −₹{(riskAtStop / 1000).toFixed(1)}k
              </p>
              <p className="text-[10px] text-red-400 mt-0.5">if all hit stop</p>
            </div>
          </div>

          {/* Per-position rows */}
          <div className="space-y-1">
            {open.map((t) => {
              const risk = Math.abs(t.avgEntry - t.stopLoss) * t.openShares;
              const riskPct = t.avgEntry > 0 ? (Math.abs(t.avgEntry - t.stopLoss) / t.avgEntry) * 100 : 0;
              return (
                <div key={t.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors text-[11px]">
                  <span className="font-bold text-gray-900 w-14 truncate">{t.ticker}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${t.direction === "Long" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                    {t.direction}
                  </span>
                  <span className="text-gray-500">{t.openShares.toLocaleString("en-IN")} sh</span>
                  <span className="text-gray-400">@ ₹{t.avgEntry.toFixed(1)}</span>
                  {t.realizedPnl !== 0 && (
                    <span className={`font-semibold ${t.realizedPnl > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {t.realizedPnl > 0 ? "+" : "−"}₹{Math.abs(t.realizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })} realized
                    </span>
                  )}
                  <span className="ml-auto text-red-400 font-medium">
                    −₹{risk.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({riskPct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>

          {openRealizedPnl !== 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              <span className="text-gray-400">Partial exits on open trades:</span>
              <span className={`font-semibold ${openRealizedPnl > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {openRealizedPnl > 0 ? "+" : "−"}₹{Math.abs(openRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

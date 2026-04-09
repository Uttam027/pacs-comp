"use client";

import { useState, useEffect, useCallback } from "react";
import TradeForm from "./components/TradeForm";
import TradeTable from "./components/TradeTable";
import StatsCards from "./components/StatsCards";
import EquityCurveChart from "./components/EquityCurveChart";
import WinLossChart from "./components/WinLossChart";
import PnlBarChart from "./components/PnlBarChart";
import SetupPerformanceChart from "./components/SetupPerformanceChart";
import RMultipleChart from "./components/RMultipleChart";
import MonthlyPnlChart from "./components/MonthlyPnlChart";
import { Trade } from "./types";

const CARD = "bg-[#0d1117] border border-[#21262d] p-4 rounded-md";
const LABEL = "text-[9px] tracking-widest text-[#484f58] uppercase mb-3 font-mono";

export default function TradeLogPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [filterSetup, setFilterSetup] = useState("All");
  const [filterResult, setFilterResult] = useState("All");

  useEffect(() => {
    const stored = localStorage.getItem("trade-log");
    if (stored) setTrades(JSON.parse(stored));
  }, []);

  const persist = useCallback((updated: Trade[]) => {
    setTrades(updated);
    localStorage.setItem("trade-log", JSON.stringify(updated));
  }, []);

  const addTrade = (trade: Trade) => {
    persist([...trades, { ...trade, id: crypto.randomUUID() }]);
    setShowForm(false);
  };

  const updateTrade = (trade: Trade) => {
    persist(trades.map(t => t.id === trade.id ? trade : t));
    setEditingTrade(null);
  };

  const deleteTrade = (id: string) => persist(trades.filter(t => t.id !== id));

  const filteredTrades = trades.filter(t => {
    const setupOk = filterSetup === "All" || t.setup === filterSetup;
    const resultOk =
      filterResult === "All" ||
      (filterResult === "Win" && t.pnl > 0) ||
      (filterResult === "Loss" && t.pnl < 0) ||
      (filterResult === "BE" && t.pnl === 0);
    return setupOk && resultOk;
  });

  const setups = ["All", ...Array.from(new Set(trades.map(t => t.setup).filter(Boolean)))];

  return (
    <div className="min-h-screen bg-[#010409] text-[#e6edf3] font-mono">

      {/* Header */}
      <div className="border-b border-[#21262d] px-6 py-4 flex items-center justify-between bg-[#0d1117]">
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 bg-gradient-to-b from-[#63dcb4] to-[#3b82f6] rounded-full" />
          <div>
            <h1 className="text-sm font-bold tracking-[0.2em] text-[#e6edf3] uppercase">Trade Logbook</h1>
            <p className="text-[9px] text-[#484f58] tracking-widest mt-0.5 uppercase">Personal · Minervini Method</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingTrade(null); }}
          className="bg-gradient-to-r from-[#63dcb4] to-[#3b82f6] text-[#010409] text-[10px] font-bold px-5 py-2 tracking-widest uppercase rounded hover:opacity-90 transition-opacity"
        >
          + Log Trade
        </button>
      </div>

      <div className="px-6 py-6 space-y-5 max-w-[1600px] mx-auto">

        {/* Stats */}
        <StatsCards trades={filteredTrades} />

        {/* Row 1: Equity Curve (wide) + Win/Loss donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`${CARD} lg:col-span-2`}>
            <p className={LABEL}>Equity Curve</p>
            <EquityCurveChart trades={filteredTrades} />
          </div>
          <div className={CARD}>
            <p className={LABEL}>Win / Loss / BE</p>
            <WinLossChart trades={filteredTrades} />
          </div>
        </div>

        {/* Row 2: P&L per trade bar + Monthly P&L */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={CARD}>
            <p className={LABEL}>P&amp;L per Trade</p>
            <PnlBarChart trades={filteredTrades} />
          </div>
          <div className={CARD}>
            <p className={LABEL}>Monthly P&amp;L</p>
            <MonthlyPnlChart trades={filteredTrades} />
          </div>
        </div>

        {/* Row 3: R-Multiple bar + Setup Performance horizontal bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={CARD}>
            <p className={LABEL}>R-Multiple per Trade</p>
            <RMultipleChart trades={filteredTrades} />
          </div>
          <div className={CARD}>
            <p className={LABEL}>P&amp;L by Setup</p>
            <SetupPerformanceChart trades={filteredTrades} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap pt-1">
          <span className="text-[9px] text-[#484f58] tracking-widest uppercase">Filter:</span>
          <div className="flex gap-1">
            {["All", "Win", "Loss", "BE"].map(r => (
              <button
                key={r}
                onClick={() => setFilterResult(r)}
                className={`text-[9px] px-3 py-1 tracking-widest uppercase border rounded transition-all ${
                  filterResult === r
                    ? r === "Win" ? "bg-[rgba(99,220,180,0.15)] text-[#63dcb4] border-[#63dcb4]"
                    : r === "Loss" ? "bg-[rgba(248,113,113,0.15)] text-[#f87171] border-[#f87171]"
                    : "bg-[#21262d] text-[#e6edf3] border-[#30363d]"
                    : "border-[#21262d] text-[#484f58] hover:border-[#30363d] hover:text-[#8b949e]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {setups.map(s => (
              <button
                key={s}
                onClick={() => setFilterSetup(s)}
                className={`text-[9px] px-3 py-1 tracking-widest uppercase border rounded transition-all ${
                  filterSetup === s
                    ? "bg-[rgba(59,130,246,0.15)] text-[#60a5fa] border-[#3b82f6]"
                    : "border-[#21262d] text-[#484f58] hover:border-[#30363d] hover:text-[#8b949e]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[9px] text-[#30363d] tracking-widest">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <TradeTable
          trades={filteredTrades}
          onEdit={t => { setEditingTrade(t); setShowForm(true); }}
          onDelete={deleteTrade}
        />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] border border-[#30363d] w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
              <h2 className="text-xs font-bold tracking-widest uppercase text-[#e6edf3]">
                {editingTrade ? "Edit Trade" : "Log New Trade"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingTrade(null); }}
                className="text-[#484f58] hover:text-[#e6edf3] text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <TradeForm
                initial={editingTrade}
                onSubmit={editingTrade ? updateTrade : addTrade}
                onCancel={() => { setShowForm(false); setEditingTrade(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import TradeForm from "./components/TradeForm";
import TradeTable from "./components/TradeTable";
import StatsCards from "./components/StatsCards";
import EquityCurveChart from "./components/EquityCurveChart";
import WinLossChart from "./components/WinLossChart";
import { Trade } from "./types";

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
    const updated = [...trades, { ...trade, id: crypto.randomUUID() }];
    persist(updated);
    setShowForm(false);
  };

  const updateTrade = (trade: Trade) => {
    const updated = trades.map((t) => (t.id === trade.id ? trade : t));
    persist(updated);
    setEditingTrade(null);
  };

  const deleteTrade = (id: string) => {
    persist(trades.filter((t) => t.id !== id));
  };

  const filteredTrades = trades.filter((t) => {
    const setupOk = filterSetup === "All" || t.setup === filterSetup;
    const resultOk =
      filterResult === "All" ||
      (filterResult === "Win" && t.pnl > 0) ||
      (filterResult === "Loss" && t.pnl < 0) ||
      (filterResult === "BE" && t.pnl === 0);
    return setupOk && resultOk;
  });

  const setups = ["All", ...Array.from(new Set(trades.map((t) => t.setup).filter(Boolean)))];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] font-mono">
      {/* Header */}
      <div className="border-b border-[#1f1f1f] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-white uppercase">
            Trade Log
          </h1>
          <p className="text-[10px] text-[#555] tracking-widest mt-0.5 uppercase">
            Personal Trading Journal
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingTrade(null); }}
          className="bg-[#e8e8e8] text-black text-xs font-bold px-4 py-2 tracking-widest uppercase hover:bg-white transition-colors"
        >
          + New Trade
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <StatsCards trades={filteredTrades} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1f1f1f] p-4">
            <p className="text-[10px] tracking-widest text-[#555] uppercase mb-3">Equity Curve</p>
            <EquityCurveChart trades={filteredTrades} />
          </div>
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] p-4">
            <p className="text-[10px] tracking-widest text-[#555] uppercase mb-3">Win / Loss / BE</p>
            <WinLossChart trades={filteredTrades} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-[10px] text-[#555] tracking-widest uppercase">Filter:</span>
          <div className="flex gap-1">
            {["All", "Win", "Loss", "BE"].map((r) => (
              <button
                key={r}
                onClick={() => setFilterResult(r)}
                className={`text-[10px] px-3 py-1 tracking-widest uppercase border transition-colors ${
                  filterResult === r
                    ? "bg-[#e8e8e8] text-black border-[#e8e8e8]"
                    : "border-[#2a2a2a] text-[#555] hover:border-[#444] hover:text-[#aaa]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {setups.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSetup(s)}
                className={`text-[10px] px-3 py-1 tracking-widest uppercase border transition-colors ${
                  filterSetup === s
                    ? "bg-[#1a3a2a] text-[#4ade80] border-[#4ade80]"
                    : "border-[#2a2a2a] text-[#555] hover:border-[#444] hover:text-[#aaa]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] text-[#555]">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <TradeTable
          trades={filteredTrades}
          onEdit={(t) => { setEditingTrade(t); setShowForm(true); }}
          onDelete={deleteTrade}
        />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
              <h2 className="text-xs font-bold tracking-widest uppercase text-white">
                {editingTrade ? "Edit Trade" : "Log Trade"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingTrade(null); }}
                className="text-[#555] hover:text-white text-lg leading-none"
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

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    persist(trades.map((t) => (t.id === trade.id ? trade : t)));
    setEditingTrade(null);
    setShowForm(false);
  };

  const deleteTrade = (id: string) => persist(trades.filter((t) => t.id !== id));

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">Trade Logbook</h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase mt-0.5">Personal · Minervani Method</p>
          </div>
          <Button
            onClick={() => { setShowForm(true); setEditingTrade(null); }}
            className="text-xs tracking-widest uppercase"
          >
            + Log Trade
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* Stats */}
        <StatsCards trades={filteredTrades} />

        {/* Row 1: Equity Curve + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Equity Curve</p>
            <EquityCurveChart trades={filteredTrades} />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Win / Loss / BE</p>
            <WinLossChart trades={filteredTrades} />
          </div>
        </div>

        {/* Row 2: P&L bars + Monthly */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">P&amp;L per Trade</p>
            <PnlBarChart trades={filteredTrades} />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Monthly P&amp;L</p>
            <MonthlyPnlChart trades={filteredTrades} />
          </div>
        </div>

        {/* Row 3: R-Multiple + Setup Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">R-Multiple per Trade</p>
            <RMultipleChart trades={filteredTrades} />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">P&amp;L by Setup</p>
            <SetupPerformanceChart trades={filteredTrades} />
          </div>
        </div>

        <Separator />

        {/* Filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-gray-400 font-medium mr-1">Filter:</span>
          {["All", "Win", "Loss", "BE"].map((r) => (
            <Badge
              key={r}
              variant={filterResult === r ? "default" : "outline"}
              className="cursor-pointer text-[10px] tracking-widest uppercase"
              onClick={() => setFilterResult(r)}
            >
              {r}
            </Badge>
          ))}
          <Separator orientation="vertical" className="h-5 mx-1" />
          {setups.map((s) => (
            <Badge
              key={s}
              variant={filterSetup === s ? "secondary" : "outline"}
              className="cursor-pointer text-[10px] tracking-widest uppercase"
              onClick={() => setFilterSetup(s)}
            >
              {s}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-gray-400">
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

      {/* Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingTrade(null); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest uppercase font-bold">
              {editingTrade ? "Edit Trade" : "Log New Trade"}
            </DialogTitle>
          </DialogHeader>
          <TradeForm
            initial={editingTrade}
            onSubmit={editingTrade ? updateTrade : addTrade}
            onCancel={() => { setShowForm(false); setEditingTrade(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

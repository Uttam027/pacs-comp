"use client";

import { useState, useEffect, useCallback } from "react";
import TradeForm from "./components/TradeForm";
import TradeDetail from "./components/TradeDetail";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function TradeLogPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [filterSetup, setFilterSetup] = useState("All");
  const [filterResult, setFilterResult] = useState("All");

  useEffect(() => {
    const stored = localStorage.getItem("trade-log-v2");
    if (stored) setTrades(JSON.parse(stored));
  }, []);

  const persist = useCallback((updated: Trade[]) => {
    setTrades(updated);
    localStorage.setItem("trade-log-v2", JSON.stringify(updated));
  }, []);

  const addTrade = (trade: Trade) => {
    persist([...trades, trade]);
    setShowForm(false);
  };

  const updateTrade = (trade: Trade) => {
    persist(trades.map((t) => t.id === trade.id ? trade : t));
    setSelectedTrade(trade);
  };

  const deleteTrade = (id: string) => {
    persist(trades.filter((t) => t.id !== id));
    setSelectedTrade(null);
  };

  const filteredTrades = trades.filter((t) => {
    const setupOk = filterSetup === "All" || t.setup === filterSetup;
    const resultOk =
      filterResult === "All" ||
      (filterResult === "Open" && t.status === "Open") ||
      (filterResult === "Closed" && t.status === "Closed") ||
      (filterResult === "Win" && t.realizedPnl > 0) ||
      (filterResult === "Loss" && t.realizedPnl < 0);
    return setupOk && resultOk;
  });

  const setups = ["All", ...Array.from(new Set(trades.map((t) => t.setup).filter(Boolean)))];
  const openCount = trades.filter((t) => t.status === "Open").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">Trade Logbook</h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase mt-0.5">Personal · Minervani Method</p>
          </div>
          <div className="flex items-center gap-3">
            {openCount > 0 && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">
                {openCount} open position{openCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Button onClick={() => setShowForm(true)} className="text-xs tracking-widest uppercase">
              + Open Trade
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        <StatsCards trades={filteredTrades} />

        {/* Charts row 1 */}
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

        {/* Charts row 2 */}
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

        {/* Charts row 3 */}
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
          {["All", "Open", "Closed", "Win", "Loss"].map((r) => (
            <Badge key={r} variant={filterResult === r ? "default" : "outline"}
              className="cursor-pointer text-[10px] tracking-widest uppercase" onClick={() => setFilterResult(r)}>
              {r}
            </Badge>
          ))}
          <Separator orientation="vertical" className="h-5 mx-1" />
          {setups.map((s) => (
            <Badge key={s} variant={filterSetup === s ? "secondary" : "outline"}
              className="cursor-pointer text-[10px] tracking-widest uppercase" onClick={() => setFilterSetup(s)}>
              {s}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? "s" : ""}
          </span>
        </div>

        <TradeTable trades={filteredTrades} onOpen={setSelectedTrade} />
      </div>

      {/* Open new trade dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest uppercase font-bold">Open New Trade</DialogTitle>
          </DialogHeader>
          <TradeForm onSubmit={addTrade} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Manage existing trade dialog */}
      <Dialog open={!!selectedTrade} onOpenChange={(o) => { if (!o) setSelectedTrade(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest uppercase font-bold flex items-center gap-2">
              {selectedTrade?.ticker}
              <Badge variant="outline" className={`text-[9px] ${selectedTrade?.direction === "Long" ? "text-blue-600 border-blue-200 bg-blue-50" : "text-red-500 border-red-200 bg-red-50"}`}>
                {selectedTrade?.direction}
              </Badge>
              <Badge variant="outline" className={`text-[9px] ${selectedTrade?.status === "Open" ? "text-blue-600 border-blue-200 bg-blue-50" : "text-emerald-600 border-emerald-200 bg-emerald-50"}`}>
                {selectedTrade?.status}
              </Badge>
              <span className="text-gray-300 font-normal text-xs">{selectedTrade?.setup}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedTrade && (
            <TradeDetail
              trade={selectedTrade}
              onUpdate={updateTrade}
              onDelete={deleteTrade}
              onClose={() => setSelectedTrade(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import TradeForm from "./components/TradeForm";
import TradeDetail from "./components/TradeDetail";
import TradeTable from "./components/TradeTable";
import StatsCards from "./components/StatsCards";
import SecondaryStats from "./components/SecondaryStats";
import EquityCurveChart from "./components/EquityCurveChart";
import WinLossChart from "./components/WinLossChart";
import RMultipleChart from "./components/RMultipleChart";
import MonthlyPnlChart from "./components/MonthlyPnlChart";
import Sidebar from "./components/Sidebar";
import { Trade } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SlidersHorizontal, Calendar } from "lucide-react";

const TABS = ["Overview", "Trade Log", "Analytics"] as const;
type Tab = typeof TABS[number];

const TAB_TO_NAV: Record<string, Tab> = {
  overview: "Overview",
  trades: "Trade Log",
  analytics: "Analytics",
  equity: "Overview",
};

export default function TradeLogPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [filterSetup, setFilterSetup] = useState("All");
  const [filterResult, setFilterResult] = useState("All");
  const [activeNav, setActiveNav] = useState("overview");
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  useEffect(() => {
    fetch("/api/trade-log")
      .then((r) => r.json())
      .then((data: Trade[]) => setTrades(Array.isArray(data) ? data : []))
      .catch(() => setTrades([]))
      .finally(() => setLoading(false));
  }, []);

  const handleNavChange = (nav: string) => {
    setActiveNav(nav);
    setActiveTab(TAB_TO_NAV[nav] ?? "Overview");
  };

  const addTrade = useCallback(async (trade: Trade) => {
    try {
      const res = await fetch("/api/trade-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
      if (res.ok) {
        setTrades((prev) => [...prev, trade]);
        setShowForm(false);
      } else {
        const text = await res.text();
        alert(`Failed to save trade (${res.status}):\n${text.slice(0, 500)}`);
      }
    } catch (err) {
      alert(`Network error: ${err}`);
    }
  }, []);

  const updateTrade = useCallback(async (trade: Trade) => {
    const res = await fetch("/api/trade-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });
    if (res.ok) {
      setTrades((prev) => prev.map((t) => t.id === trade.id ? trade : t));
      setSelectedTrade(trade);
    }
  }, []);

  const deleteTrade = useCallback(async (id: string) => {
    const res = await fetch(`/api/trade-log?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setSelectedTrade(null);
    }
  }, []);

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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeTab={activeNav} onTabChange={handleNavChange} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  const navMap: Record<Tab, string> = {
                    "Overview": "overview",
                    "Trade Log": "trades",
                    "Analytics": "analytics",
                  };
                  setActiveNav(navMap[tab]);
                }}
                className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {openCount > 0 && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                {openCount} open
              </Badge>
            )}
            <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors">
              <SlidersHorizontal className="w-3 h-3" />
              {filterSetup !== "All" ? filterSetup : "All Setups"}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors">
              <Calendar className="w-3 h-3" />
              All Time
            </button>
            <Button onClick={() => setShowForm(true)} size="sm" className="text-xs h-8">
              + Open Trade
            </Button>
          </div>
        </header>

        {/* Page title row */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">
            {activeTab === "Overview" ? "Dashboard" : activeTab}
          </h1>
          <p className="text-xs text-gray-400">
            {trades.length} trades · Minervini Method
          </p>
        </div>

        {/* Content */}
        <main className="flex-1 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <p className="text-sm text-gray-300 tracking-widest uppercase animate-pulse">Loading…</p>
            </div>
          ) : (
            <>
              {activeTab === "Overview" && (
                <OverviewTab
                  trades={filteredTrades}
                  filterResult={filterResult}
                  filterSetup={filterSetup}
                  setups={setups}
                  onFilterResult={setFilterResult}
                  onFilterSetup={setFilterSetup}
                  onOpenTrade={setSelectedTrade}
                />
              )}
              {activeTab === "Trade Log" && (
                <TradeLogTab
                  trades={filteredTrades}
                  filterResult={filterResult}
                  filterSetup={filterSetup}
                  setups={setups}
                  onFilterResult={setFilterResult}
                  onFilterSetup={setFilterSetup}
                  onOpenTrade={setSelectedTrade}
                />
              )}
              {activeTab === "Analytics" && (
                <AnalyticsTab trades={filteredTrades} />
              )}
            </>
          )}
        </main>
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

// ── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  trades,
  filterResult,
  filterSetup,
  setups,
  onFilterResult,
  onFilterSetup,
  onOpenTrade,
}: {
  trades: Trade[];
  filterResult: string;
  filterSetup: string;
  setups: string[];
  onFilterResult: (v: string) => void;
  onFilterSetup: (v: string) => void;
  onOpenTrade: (t: Trade) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Stats overview */}
      <StatsCards trades={trades} />

      {/* Charts row: equity curve + secondary stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Equity Curve</p>
              <p className="text-xs text-gray-400 mt-0.5">Cumulative realized P&amp;L over time</p>
            </div>
            <div className="flex gap-1">
              {["Sent", "Opened", "Clicked"].map((l, i) => (
                <span key={l} className={`text-[10px] flex items-center gap-1 text-gray-400 ${i > 0 ? "ml-3" : ""}`}>
                  <span className={`w-2 h-2 rounded-full ${i === 0 ? "bg-violet-500" : i === 1 ? "bg-emerald-500" : "bg-amber-400"}`} />
                  {l === "Sent" ? "Entry" : l === "Opened" ? "Closed" : "Open"}
                </span>
              ))}
            </div>
          </div>
          <EquityCurveChart trades={trades} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-900">Secondary Stats</p>
          </div>
          <SecondaryStats trades={trades} />
        </div>
      </div>

      {/* Monthly P&L + R-Multiple */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">P&amp;L by Period</p>
        </div>
        <MonthlyPnlChart trades={trades} />
      </div>

      {/* Filters + Trade table (mini) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-gray-900">Recent Trades</p>
          <div className="flex gap-1.5 flex-wrap">
            {["All", "Open", "Closed", "Win", "Loss"].map((r) => (
              <button
                key={r}
                onClick={() => onFilterResult(r)}
                className={`text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md border transition-colors ${
                  filterResult === r
                    ? "bg-gray-900 text-white border-gray-900"
                    : "text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {r}
              </button>
            ))}
            <div className="w-px bg-gray-200 mx-1" />
            {setups.slice(0, 6).map((s) => (
              <button
                key={s}
                onClick={() => onFilterSetup(s)}
                className={`text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md border transition-colors ${
                  filterSetup === s
                    ? "bg-gray-100 text-gray-900 border-gray-300 font-semibold"
                    : "text-gray-400 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-gray-400 self-center">
              {trades.length} trade{trades.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <TradeTable trades={trades} onOpen={onOpenTrade} />
      </div>
    </div>
  );
}

// ── Trade Log Tab ───────────────────────────────────────────────────────────

function TradeLogTab({
  trades,
  filterResult,
  filterSetup,
  setups,
  onFilterResult,
  onFilterSetup,
  onOpenTrade,
}: {
  trades: Trade[];
  filterResult: string;
  filterSetup: string;
  setups: string[];
  onFilterResult: (v: string) => void;
  onFilterSetup: (v: string) => void;
  onOpenTrade: (t: Trade) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 mr-2">All Trades</p>
          {["All", "Open", "Closed", "Win", "Loss"].map((r) => (
            <button
              key={r}
              onClick={() => onFilterResult(r)}
              className={`text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md border transition-colors ${
                filterResult === r
                  ? "bg-gray-900 text-white border-gray-900"
                  : "text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {r}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1" />
          {setups.map((s) => (
            <button
              key={s}
              onClick={() => onFilterSetup(s)}
              className={`text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md border transition-colors ${
                filterSetup === s
                  ? "bg-gray-100 text-gray-900 border-gray-300 font-semibold"
                  : "text-gray-400 border-gray-200 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-gray-400 self-center">
            {trades.length} trade{trades.length !== 1 ? "s" : ""}
          </span>
        </div>
        <TradeTable trades={trades} onOpen={onOpenTrade} />
      </div>
    </div>
  );
}

// ── Analytics Tab ───────────────────────────────────────────────────────────

function AnalyticsTab({ trades }: { trades: Trade[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <p className="text-sm font-semibold text-gray-900 mb-1">Win / Loss Breakdown</p>
          <p className="text-xs text-gray-400 mb-4">Distribution of trade outcomes</p>
          <WinLossChart trades={trades} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <p className="text-sm font-semibold text-gray-900 mb-1">R-Multiple per Trade</p>
          <p className="text-xs text-gray-400 mb-4">Risk-adjusted return by trade</p>
          <RMultipleChart trades={trades} />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="text-sm font-semibold text-gray-900 mb-1">Equity Curve</p>
        <p className="text-xs text-gray-400 mb-4">Cumulative realized P&amp;L over time</p>
        <EquityCurveChart trades={trades} />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="text-sm font-semibold text-gray-900 mb-1">P&amp;L by Period</p>
        <p className="text-xs text-gray-400 mb-4">Monthly and weekly breakdown</p>
        <MonthlyPnlChart trades={trades} />
      </div>
    </div>
  );
}

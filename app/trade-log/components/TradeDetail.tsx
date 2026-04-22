"use client";

import { useState, useEffect, useCallback } from "react";
import { Trade, EntryLeg, ExitLeg, computeTrade } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface QuoteData {
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  marketState: string;
}

interface Props {
  trade: Trade;
  onUpdate: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const GRADES = ["A+", "A", "B", "C", "D"];

// Guess Yahoo ticker suffix: if no dot, append .NS for NSE India
function toYahooTicker(ticker: string): string {
  if (ticker.includes(".")) return ticker;
  return `${ticker}.NS`;
}

export default function TradeDetail({ trade, onUpdate, onDelete, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [newEntry, setNewEntry] = useState({ date: today, price: "", shares: "", notes: "" });
  const [newExit, setNewExit] = useState({ date: today, price: "", shares: "", notes: "" });
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddExit, setShowAddExit] = useState(false);
  const [grade, setGrade] = useState(trade.grade ?? "A");
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [tags, setTags] = useState(trade.tags ?? "");
  const [stopLoss, setStopLoss] = useState(String(trade.stopLoss));
  const [ticker, setTicker] = useState(trade.ticker);
  const [yahooTicker, setYahooTicker] = useState(trade.yahooTicker ?? "");

  // Live quote state
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  const fetchQuote = useCallback(async (overrideYahoo?: string) => {
    if (trade.status !== "Open" || !trade.ticker) return;
    setQuoteLoading(true);
    setQuoteError("");
    try {
      const symbol = overrideYahoo ?? yahooTicker ?? toYahooTicker(trade.ticker);
      const res = await fetch(`/api/trade-log/quote?ticker=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuote(data);
    } catch (e) {
      setQuoteError(String(e));
    } finally {
      setQuoteLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.ticker, trade.status]);

  // Auto-fetch on open
  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  // Unrealized P&L based on live price
  const unrealizedPnl = quote && trade.openShares > 0 && trade.avgEntry > 0
    ? trade.direction === "Long"
      ? (quote.price - trade.avgEntry) * trade.openShares
      : (trade.avgEntry - quote.price) * trade.openShares
    : null;

  const unrealizedPct = quote && trade.avgEntry > 0
    ? trade.direction === "Long"
      ? ((quote.price - trade.avgEntry) / trade.avgEntry) * 100
      : ((trade.avgEntry - quote.price) / trade.avgEntry) * 100
    : null;

  const totalPnl = (trade.realizedPnl ?? 0) + (unrealizedPnl ?? 0);

  const win = trade.realizedPnl > 0;
  const loss = trade.realizedPnl < 0;
  const pnlColor = win ? "text-emerald-600" : loss ? "text-red-500" : "text-gray-400";
  const unrealColor = unrealizedPnl != null
    ? unrealizedPnl > 0 ? "text-emerald-600" : unrealizedPnl < 0 ? "text-red-500" : "text-gray-400"
    : "text-gray-400";

  const addEntryLeg = () => {
    if (!newEntry.price || !newEntry.shares) return;
    const leg: EntryLeg = {
      id: crypto.randomUUID(),
      date: newEntry.date,
      price: parseFloat(newEntry.price),
      shares: parseInt(newEntry.shares),
      notes: newEntry.notes,
    };
    const updated = computeTrade({ ...trade, entries: [...trade.entries, leg] });
    onUpdate(updated);
    setNewEntry({ date: today, price: "", shares: "", notes: "" });
    setShowAddEntry(false);
  };

  const addExitLeg = () => {
    if (!newExit.price || !newExit.shares) return;
    const shares = Math.min(parseInt(newExit.shares), trade.openShares);
    const leg: ExitLeg = {
      id: crypto.randomUUID(),
      date: newExit.date,
      price: parseFloat(newExit.price),
      shares,
      notes: newExit.notes,
    };
    const updated = computeTrade({ ...trade, exits: [...trade.exits, leg] });
    onUpdate(updated);
    setNewExit({ date: today, price: "", shares: "", notes: "" });
    setShowAddExit(false);
  };

  const removeEntryLeg = (id: string) =>
    onUpdate(computeTrade({ ...trade, entries: trade.entries.filter((e) => e.id !== id) }));

  const removeExitLeg = (id: string) =>
    onUpdate(computeTrade({ ...trade, exits: trade.exits.filter((e) => e.id !== id) }));

  const saveInfo = () =>
    onUpdate(computeTrade({ ...trade, grade, notes, tags, stopLoss: parseFloat(stopLoss) || trade.stopLoss }));

  const progressPct = trade.totalShares > 0 ? Math.round((trade.exitedShares / trade.totalShares) * 100) : 0;
  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5">

      {/* Live price banner — only for open trades */}
      {trade.status === "Open" && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Live Price · {toYahooTicker(trade.ticker)}</p>
                {quoteLoading && <p className="text-xs text-gray-400 animate-pulse">Fetching...</p>}
                {quoteError && <p className="text-xs text-red-400">Could not fetch price</p>}
                {quote && !quoteLoading && (
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">₹{quote.price.toFixed(2)}</span>
                    <span className={`text-xs font-semibold ${quote.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePct >= 0 ? "+" : ""}{quote.changePct.toFixed(2)}%)
                    </span>
                    <Badge variant="outline" className={`text-[9px] ${quote.marketState === "REGULAR" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-gray-400 border-gray-200"}`}>
                      {quote.marketState === "REGULAR" ? "Market Open" : "Market Closed"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => fetchQuote()} disabled={quoteLoading}
              className="text-[9px] tracking-widest uppercase text-gray-400 h-6 px-2">
              ↻ Refresh
            </Button>
          </div>

          {/* Unrealized P&L */}
          {quote && trade.openShares > 0 && unrealizedPnl != null && (
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-blue-100 pt-3">
              <div>
                <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Unrealized P&L</p>
                <p className={`text-sm font-bold tabular-nums ${unrealColor}`}>
                  {unrealizedPnl >= 0 ? "+" : "−"}{fmt(unrealizedPnl)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Unrealized %</p>
                <p className={`text-sm font-bold tabular-nums ${unrealColor}`}>
                  {unrealizedPct != null ? `${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(2)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Total P&L (incl. open)</p>
                <p className={`text-sm font-bold tabular-nums ${totalPnl >= 0 ? "text-emerald-600" : totalPnl < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {totalPnl >= 0 ? "+" : "−"}{fmt(totalPnl)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Realized P&L",
            value: trade.realizedPnl !== 0 ? `${win ? "+" : "−"}${fmt(trade.realizedPnl)}` : "—",
            cls: pnlColor,
          },
          {
            label: "Avg Entry",
            value: trade.avgEntry > 0 ? `₹${trade.avgEntry.toFixed(2)}` : "—",
            cls: "text-gray-800",
          },
          {
            label: "Avg Exit",
            value: trade.avgExit > 0 ? `₹${trade.avgExit.toFixed(2)}` : "—",
            cls: "text-gray-800",
          },
          {
            label: "R Multiple",
            value: trade.exitedShares > 0 ? `${trade.rMultiple >= 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}R` : "—",
            cls: pnlColor,
          },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
            <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{s.label}</p>
            <p className={`text-sm font-bold tabular-nums ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Exit progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{trade.exitedShares} of {trade.totalShares} shares exited</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all ${progressPct === 100 ? "bg-emerald-500" : "bg-blue-400"}`}
            style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex gap-2 items-center text-[10px] text-gray-400">
          <span className="text-blue-500 font-medium">{trade.openShares} open</span>
          <span>·</span>
          <span>{trade.exitedShares} exited</span>
        </div>
      </div>

      <Separator />

      {/* Entry legs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">Entry Lots</p>
          {trade.status === "Open" && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddEntry((v) => !v)}
              className="h-6 text-[10px] tracking-widest uppercase px-2">
              {showAddEntry ? "Cancel" : "+ Add Lot"}
            </Button>
          )}
        </div>

        {/* Header row */}
        <div className="grid grid-cols-12 gap-2 px-2 mb-0.5">
          {["#", "Date", "Price", "Shares", "Amount", "Note", ""].map((h) => (
            <span key={h} className={`text-[9px] font-semibold tracking-widest text-gray-300 uppercase ${h === "Price" || h === "Amount" ? "col-span-2" : h === "Date" ? "col-span-2" : h === "Note" ? "col-span-2" : "col-span-1"}`}>{h}</span>
          ))}
        </div>

        <div className="space-y-1">
          {trade.entries.map((leg, i) => {
            const amount = leg.price * leg.shares;
            return (
              <div key={leg.id} className="grid grid-cols-12 gap-2 items-center text-xs bg-blue-50/50 border border-blue-100 rounded px-2 py-1.5">
                <span className="col-span-1 text-[9px] text-gray-400 font-mono">#{i + 1}</span>
                <span className="col-span-2 text-gray-500 font-mono">{leg.date}</span>
                <span className="col-span-2 font-semibold text-gray-800">₹{leg.price.toFixed(2)}</span>
                <span className="col-span-1 text-gray-600">{leg.shares}</span>
                <span className="col-span-3 font-semibold text-blue-700">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                <span className="col-span-2 text-gray-400 truncate text-[9px]">{leg.notes}</span>
                <div className="col-span-1 flex justify-end">
                  {trade.status === "Open" && (
                    <button onClick={() => removeEntryLeg(leg.id)} className="text-gray-300 hover:text-red-400 leading-none">×</button>
                  )}
                </div>
              </div>
            );
          })}
          {/* Total entry amount */}
          <div className="grid grid-cols-12 gap-2 px-2 pt-1 border-t border-gray-100">
            <span className="col-span-3 text-[9px] text-gray-400 uppercase tracking-wider">Total</span>
            <span className="col-span-2"></span>
            <span className="col-span-1 text-xs font-semibold text-gray-700">{trade.totalShares}</span>
            <span className="col-span-3 text-xs font-bold text-blue-700">
              ₹{(trade.avgEntry * trade.totalShares).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {showAddEntry && (
          <div className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-md p-2 border border-gray-200">
            <div className="col-span-3 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Date</Label>
              <Input type="date" value={newEntry.date} onChange={(e) => setNewEntry((p) => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Price ₹</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={newEntry.price}
                onChange={(e) => setNewEntry((p) => ({ ...p, price: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Shares</Label>
              <Input type="number" placeholder="0" value={newEntry.shares}
                onChange={(e) => setNewEntry((p) => ({ ...p, shares: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">
                Amount: {newEntry.price && newEntry.shares
                  ? `₹${(parseFloat(newEntry.price) * parseInt(newEntry.shares)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                  : "—"}
              </Label>
              <Input placeholder="note" value={newEntry.notes}
                onChange={(e) => setNewEntry((p) => ({ ...p, notes: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-1">
              <Button type="button" size="sm" onClick={addEntryLeg} className="h-8 w-full text-[10px]">Add</Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Exit legs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">Exit Lots</p>
          {trade.openShares > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-400">{trade.openShares} sh remaining</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddExit((v) => !v)}
                className="h-6 text-[10px] tracking-widest uppercase px-2">
                {showAddExit ? "Cancel" : "+ Exit Lot"}
              </Button>
            </div>
          )}
        </div>

        {trade.exits.length === 0 ? (
          <p className="text-[10px] text-gray-300 italic">No exits yet</p>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-2 mb-0.5">
              {["#", "Date", "Price", "Shares", "Proceeds", "P&L", "Note", ""].map((h, i) => (
                <span key={i} className={`text-[9px] font-semibold tracking-widest text-gray-300 uppercase ${h === "Price" || h === "Proceeds" || h === "P&L" ? "col-span-2" : h === "Date" ? "col-span-2" : h === "Note" ? "col-span-1" : "col-span-1"}`}>{h}</span>
              ))}
            </div>

            <div className="space-y-1">
              {trade.exits.map((leg, i) => {
                const proceeds = leg.price * leg.shares;
                const legPnl = trade.direction === "Long"
                  ? (leg.price - trade.avgEntry) * leg.shares
                  : (trade.avgEntry - leg.price) * leg.shares;
                return (
                  <div key={leg.id} className={`grid grid-cols-12 gap-2 items-center text-xs rounded px-2 py-1.5 border ${legPnl >= 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"}`}>
                    <span className="col-span-1 text-[9px] text-gray-400 font-mono">#{i + 1}</span>
                    <span className="col-span-2 text-gray-500 font-mono">{leg.date}</span>
                    <span className="col-span-2 font-semibold text-gray-800">₹{leg.price.toFixed(2)}</span>
                    <span className="col-span-1 text-gray-600">{leg.shares}</span>
                    <span className="col-span-2 text-gray-700">₹{proceeds.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    <span className={`col-span-2 font-bold tabular-nums ${legPnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {legPnl >= 0 ? "+" : "−"}₹{Math.abs(legPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="col-span-1 text-gray-400 truncate text-[9px]">{leg.notes}</span>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => removeExitLeg(leg.id)} className="text-gray-300 hover:text-red-400 leading-none">×</button>
                    </div>
                  </div>
                );
              })}
              {/* Total row */}
              <div className="grid grid-cols-12 gap-2 px-2 pt-1 border-t border-gray-100">
                <span className="col-span-3 text-[9px] text-gray-400 uppercase tracking-wider">Total</span>
                <span className="col-span-2"></span>
                <span className="col-span-1 text-xs font-semibold text-gray-700">{trade.exitedShares}</span>
                <span className="col-span-2 text-xs font-semibold text-gray-700">
                  ₹{(trade.avgExit * trade.exitedShares).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                <span className={`col-span-2 text-xs font-bold ${win ? "text-emerald-600" : loss ? "text-red-500" : "text-gray-400"}`}>
                  {trade.realizedPnl !== 0 ? `${win ? "+" : "−"}₹${Math.abs(trade.realizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                </span>
              </div>
            </div>
          </>
        )}

        {showAddExit && (
          <div className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-md p-2 border border-gray-200">
            <div className="col-span-3 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Date</Label>
              <Input type="date" value={newExit.date} onChange={(e) => setNewExit((p) => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Exit Price ₹</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={newExit.price}
                onChange={(e) => setNewExit((p) => ({ ...p, price: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Shares</Label>
              <Input type="number" placeholder={String(trade.openShares)} value={newExit.shares}
                onChange={(e) => setNewExit((p) => ({ ...p, shares: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">
                P&L preview: {newExit.price && newExit.shares && trade.avgEntry > 0
                  ? (() => {
                      const pnl = trade.direction === "Long"
                        ? (parseFloat(newExit.price) - trade.avgEntry) * parseInt(newExit.shares)
                        : (trade.avgEntry - parseFloat(newExit.price)) * parseInt(newExit.shares);
                      return `${pnl >= 0 ? "+" : "−"}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
                    })()
                  : "—"}
              </Label>
              <Input placeholder="note" value={newExit.notes}
                onChange={(e) => setNewExit((p) => ({ ...p, notes: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-1">
              <Button type="button" size="sm" onClick={addExitLeg} className="h-8 w-full text-[10px]">Exit</Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Stop Loss ₹</Label>
          <Input type="number" step="0.01" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Grade</Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tags</Label>
        <Input placeholder="earnings play, sector rotation, ..." value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={saveInfo} className="tracking-widest uppercase text-xs">Save</Button>
        <Button type="button" variant="outline" onClick={onClose} className="tracking-widest uppercase text-xs">Close</Button>
        <Button type="button" variant="ghost"
          onClick={() => { if (confirm(`Delete ${trade.ticker}?`)) { onDelete(trade.id); onClose(); } }}
          className="ml-auto text-[10px] tracking-widest uppercase text-gray-300 hover:text-red-500">
          Delete
        </Button>
      </div>
    </div>
  );
}

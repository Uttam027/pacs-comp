"use client";

import { useState } from "react";
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

interface Props {
  trade: Trade;
  onUpdate: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const SETUPS = ["VCP", "Breakout", "Pullback", "Base Breakout", "Earnings", "Reversal", "Other"];
const GRADES = ["A+", "A", "B", "C", "D"];

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

  const win = trade.realizedPnl > 0;
  const loss = trade.realizedPnl < 0;
  const pnlColor = win ? "text-emerald-600" : loss ? "text-red-500" : "text-gray-400";

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
    const maxShares = trade.openShares;
    const shares = Math.min(parseInt(newExit.shares), maxShares);
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

  const removeEntryLeg = (id: string) => {
    const updated = computeTrade({ ...trade, entries: trade.entries.filter((e) => e.id !== id) });
    onUpdate(updated);
  };

  const removeExitLeg = (id: string) => {
    const updated = computeTrade({ ...trade, exits: trade.exits.filter((e) => e.id !== id) });
    onUpdate(updated);
  };

  const saveInfo = () => {
    const updated = computeTrade({
      ...trade,
      grade,
      notes,
      tags,
      stopLoss: parseFloat(stopLoss) || trade.stopLoss,
    });
    onUpdate(updated);
  };

  const progressPct = trade.totalShares > 0
    ? Math.round((trade.exitedShares / trade.totalShares) * 100)
    : 0;

  return (
    <div className="space-y-5">

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Realized P&L",
            value: trade.realizedPnl !== 0
              ? `${win ? "+" : "−"}₹${Math.abs(trade.realizedPnl).toLocaleString("en-IN")}`
              : "—",
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

      {/* Exit progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{trade.exitedShares} of {trade.totalShares} shares exited</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${progressPct === 100 ? "bg-emerald-500" : "bg-blue-400"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-2 items-center text-[10px] text-gray-400">
          <span className="text-blue-500 font-medium">{trade.openShares} open</span>
          <span>·</span>
          <span>{trade.exitedShares} exited</span>
          <span>·</span>
          <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${trade.status === "Open" ? "text-blue-600 border-blue-200 bg-blue-50" : "text-emerald-600 border-emerald-200 bg-emerald-50"}`}>
            {trade.status}
          </Badge>
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

        <div className="space-y-1">
          {trade.entries.map((leg, i) => (
            <div key={leg.id} className="grid grid-cols-12 gap-2 items-center text-xs bg-blue-50/50 border border-blue-100 rounded px-2 py-1.5">
              <span className="col-span-1 text-[9px] text-gray-400 font-mono">#{i + 1}</span>
              <span className="col-span-2 text-gray-500 font-mono">{leg.date}</span>
              <span className="col-span-3 font-semibold text-gray-800">₹{leg.price.toLocaleString("en-IN")}</span>
              <span className="col-span-2 text-gray-600">{leg.shares} sh</span>
              <span className="col-span-3 text-gray-400 truncate">{leg.notes}</span>
              <div className="col-span-1 flex justify-end">
                {trade.status === "Open" && (
                  <button onClick={() => removeEntryLeg(leg.id)} className="text-gray-300 hover:text-red-400 text-xs leading-none">×</button>
                )}
              </div>
            </div>
          ))}
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
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Note</Label>
              <Input placeholder="optional" value={newEntry.notes}
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
              <span className="text-[9px] text-gray-400">max: {trade.openShares} sh</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddExit((v) => !v)}
                className="h-6 text-[10px] tracking-widest uppercase px-2">
                {showAddExit ? "Cancel" : "+ Exit Lot"}
              </Button>
            </div>
          )}
        </div>

        {trade.exits.length === 0 && (
          <p className="text-[10px] text-gray-300 italic">No exits yet</p>
        )}

        <div className="space-y-1">
          {trade.exits.map((leg, i) => {
            const entryCost = trade.avgEntry * leg.shares;
            const proceeds = leg.price * leg.shares;
            const legPnl = trade.direction === "Long" ? proceeds - entryCost : entryCost - proceeds;
            return (
              <div key={leg.id} className={`grid grid-cols-12 gap-2 items-center text-xs rounded px-2 py-1.5 border ${legPnl >= 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"}`}>
                <span className="col-span-1 text-[9px] text-gray-400 font-mono">#{i + 1}</span>
                <span className="col-span-2 text-gray-500 font-mono">{leg.date}</span>
                <span className="col-span-3 font-semibold text-gray-800">₹{leg.price.toLocaleString("en-IN")}</span>
                <span className="col-span-2 text-gray-600">{leg.shares} sh</span>
                <span className={`col-span-2 font-semibold tabular-nums ${legPnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {legPnl >= 0 ? "+" : "−"}₹{Math.abs(legPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                <span className="col-span-1 text-gray-400 truncate text-[9px]">{leg.notes}</span>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => removeExitLeg(leg.id)} className="text-gray-300 hover:text-red-400 text-xs leading-none">×</button>
                </div>
              </div>
            );
          })}
        </div>

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
              <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Note</Label>
              <Input placeholder="optional" value={newExit.notes}
                onChange={(e) => setNewExit((p) => ({ ...p, notes: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-1">
              <Button type="button" size="sm" onClick={addExitLeg} className="h-8 w-full text-[10px]">Exit</Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Meta info */}
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
          Delete Trade
        </Button>
      </div>
    </div>
  );
}

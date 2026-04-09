"use client";

import { useState } from "react";
import { Trade, EntryLeg, computeTrade, TradeDirection } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSubmit: (trade: Trade) => Promise<void> | void;
  onCancel: () => void;
}

const SETUPS = ["VCP", "Breakout", "Pullback", "Base Breakout", "Earnings", "Reversal", "Other"];

export default function TradeForm({ onSubmit, onCancel }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [submitting, setSubmitting] = useState(false);
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<TradeDirection>("Long");
  const [setup, setSetup] = useState("VCP");
  const [stopLoss, setStopLoss] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  // First entry leg — required
  const [legs, setLegs] = useState<{ date: string; price: string; shares: string; notes: string }[]>([
    { date: today, price: "", shares: "", notes: "" },
  ]);

  const addLeg = () => setLegs((prev) => [...prev, { date: today, price: "", shares: "", notes: "" }]);
  const removeLeg = (i: number) => setLegs((prev) => prev.filter((_, idx) => idx !== i));
  const updateLeg = (i: number, key: string, val: string) =>
    setLegs((prev) => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  // Compute preview
  const parsedLegs = legs.filter((l) => l.price && l.shares).map((l) => ({
    price: parseFloat(l.price), shares: parseInt(l.shares),
  }));
  const totalShares = parsedLegs.reduce((s, l) => s + l.shares, 0);
  const avgEntry = totalShares > 0
    ? parsedLegs.reduce((s, l) => s + l.price * l.shares, 0) / totalShares
    : 0;
  const risk = avgEntry > 0 && stopLoss ? Math.abs(avgEntry - parseFloat(stopLoss)) * totalShares : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Manual validation — required fields
    if (!ticker.trim()) return alert("Ticker is required");
    if (!stopLoss || parseFloat(stopLoss) <= 0) return alert("Stop loss is required");
    const validLegs = legs.filter((l) => l.price && l.shares && parseFloat(l.price) > 0 && parseInt(l.shares) > 0);
    if (validLegs.length === 0) return alert("At least one entry lot with price and shares is required");

    const entryLegs: EntryLeg[] = validLegs.map((l) => ({
      id: crypto.randomUUID(),
      date: l.date,
      price: parseFloat(l.price),
      shares: parseInt(l.shares),
      notes: l.notes,
    }));

    const raw: Trade = {
      id: crypto.randomUUID(),
      ticker: ticker.toUpperCase(),
      direction,
      status: "Open",
      setup,
      stopLoss: parseFloat(stopLoss) || 0,
      entries: entryLegs,
      exits: [],
      avgEntry: 0,
      avgExit: 0,
      totalShares: 0,
      exitedShares: 0,
      openShares: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      pnlPct: 0,
      rMultiple: 0,
      firstEntryDate: entryLegs[0]?.date ?? today,
      notes,
      tags,
      grade: "A",
    };

    setSubmitting(true);
    try {
      await onSubmit(computeTrade(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Basic info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Ticker</Label>
          <Input placeholder="RELIANCE" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="uppercase font-semibold tracking-wider" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as TradeDirection)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Long">Long</SelectItem>
              <SelectItem value="Short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Setup</Label>
          <Select value={setup} onValueChange={setSetup}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SETUPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5 max-w-40">
        <Label className="text-xs">Stop Loss ₹</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)} />
      </div>

      {/* Entry legs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold tracking-widest uppercase text-gray-500">Entry Lots</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLeg}
            className="h-6 text-[10px] tracking-widest uppercase px-2">+ Add Lot</Button>
        </div>

        <div className="space-y-2">
          {legs.map((leg, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-md p-2 border border-gray-100">
              <div className="col-span-3 space-y-1">
                <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Date</Label>
                <Input type="date" value={leg.date} onChange={(e) => updateLeg(i, "date", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Price ₹</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={leg.price}
                  onChange={(e) => updateLeg(i, "price", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Shares</Label>
                <Input type="number" placeholder="0" value={leg.shares}
                  onChange={(e) => updateLeg(i, "shares", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[9px] text-gray-400 uppercase tracking-wider">Note</Label>
                <Input placeholder="optional" value={leg.notes}
                  onChange={(e) => updateLeg(i, "notes", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-1 flex justify-end">
                {legs.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLeg(i)}
                    className="h-8 w-8 p-0 text-gray-300 hover:text-red-400">×</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {totalShares > 0 && avgEntry > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div>
            <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Avg Entry</p>
            <p className="text-sm font-bold text-gray-800">₹{avgEntry.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Total Shares</p>
            <p className="text-sm font-bold text-gray-800">{totalShares}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Max Risk ₹</p>
            <p className="text-sm font-bold text-red-500">{risk > 0 ? `−₹${risk.toFixed(0)}` : "—"}</p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Tags</Label>
        <Input placeholder="earnings play, sector rotation, ..." value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes / Rationale</Label>
        <Textarea rows={2} placeholder="Why did you take this trade?" value={notes}
          onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={submitting} className="tracking-widest uppercase text-xs">
          {submitting ? "Saving..." : "Open Trade"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="tracking-widest uppercase text-xs">Cancel</Button>
      </div>
    </form>
  );
}

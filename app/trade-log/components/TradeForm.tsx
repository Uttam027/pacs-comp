"use client";

import { useState, useEffect } from "react";
import { Trade, TradeDirection, TradeStatus } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  initial: Trade | null;
  onSubmit: (trade: Trade) => void;
  onCancel: () => void;
}

const SETUPS = ["VCP", "Breakout", "Pullback", "Base Breakout", "Earnings", "Reversal", "Other"];
const GRADES = ["A+", "A", "B", "C", "D"];

export default function TradeForm({ initial, onSubmit, onCancel }: Props) {
  const blank = (): Omit<Trade, "id"> => ({
    date: new Date().toISOString().split("T")[0],
    exitDate: "",
    ticker: "",
    direction: "Long",
    status: "Closed",
    setup: "VCP",
    entry: 0,
    exit: 0,
    stopLoss: 0,
    shares: 0,
    pnl: 0,
    pnlPct: 0,
    rMultiple: 0,
    notes: "",
    tags: "",
    grade: "A",
  });

  const [form, setForm] = useState<Omit<Trade, "id">>(blank());

  useEffect(() => {
    setForm(initial ? { ...initial } : blank());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const set = (key: keyof Omit<Trade, "id">, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    const { entry, exit, stopLoss, shares, direction } = form;
    if (entry > 0 && exit && exit > 0 && shares > 0) {
      const rawPnl = direction === "Long" ? (exit - entry) * shares : (entry - exit) * shares;
      const pnlPct = direction === "Long" ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
      const risk = Math.abs(entry - stopLoss) * shares;
      const rMult = risk > 0 ? rawPnl / risk : 0;
      setForm((prev) => ({
        ...prev,
        pnl: parseFloat(rawPnl.toFixed(2)),
        pnlPct: parseFloat(pnlPct.toFixed(2)),
        rMultiple: parseFloat(rMult.toFixed(2)),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.entry, form.exit, form.stopLoss, form.shares, form.direction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, id: initial?.id ?? "" } as Trade);
  };

  const pnlColor = form.pnl > 0 ? "text-emerald-600" : form.pnl < 0 ? "text-red-500" : "text-gray-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Ticker</Label>
          <Input
            placeholder="RELIANCE"
            value={form.ticker}
            onChange={(e) => set("ticker", e.target.value.toUpperCase())}
            className="uppercase font-semibold tracking-wider"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Entry Date</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Direction</Label>
          <Select value={form.direction} onValueChange={(v) => set("direction", v as TradeDirection)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Long">Long</SelectItem>
              <SelectItem value="Short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as TradeStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Closed">Closed</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Setup</Label>
          <Select value={form.setup} onValueChange={(v) => set("setup", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SETUPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "entry", label: "Entry ₹" },
          { key: "exit", label: "Exit ₹" },
          { key: "stopLoss", label: "Stop Loss ₹" },
          { key: "shares", label: "Qty / Shares" },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <Input
              type="number"
              step="0.01"
              value={(form[key as keyof typeof form] as number) || ""}
              onChange={(e) => set(key as keyof Omit<Trade, "id">, parseFloat(e.target.value) || 0)}
              required={key === "entry" || key === "shares"}
            />
          </div>
        ))}
      </div>

      {/* Auto-calculated */}
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
        {[
          { lbl: "P&L ₹", val: form.pnl, fmt: (v: number) => `${v >= 0 ? "+" : "−"}₹${Math.abs(v).toLocaleString("en-IN")}` },
          { lbl: "P&L %", val: form.pnlPct, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` },
          { lbl: "R Multiple", val: form.rMultiple, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R` },
        ].map(({ lbl, val, fmt }) => (
          <div key={lbl}>
            <p className="text-[9px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{lbl}</p>
            <p className={`text-base font-bold tabular-nums ${val > 0 ? "text-emerald-600" : val < 0 ? "text-red-500" : "text-gray-400"}`}>
              {fmt(val)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Exit Date</Label>
          <Input type="date" value={form.exitDate || ""} onChange={(e) => set("exitDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Grade</Label>
          <Select value={form.grade} onValueChange={(v) => set("grade", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tags (comma separated)</Label>
        <Input
          placeholder="earnings play, sector rotation, ..."
          value={form.tags || ""}
          onChange={(e) => set("tags", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes / Rationale</Label>
        <Textarea
          rows={3}
          placeholder="Why did you take this trade? What was the thesis?"
          value={form.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
          className="resize-none"
        />
      </div>

      {/* Preview pnl color so it's used */}
      <span className={`hidden ${pnlColor}`} />

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="tracking-widest uppercase text-xs">
          {initial ? "Update Trade" : "Log Trade"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="tracking-widest uppercase text-xs">
          Cancel
        </Button>
      </div>
    </form>
  );
}

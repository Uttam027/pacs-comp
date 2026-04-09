"use client";

import { useState, useEffect } from "react";
import { Trade, TradeDirection, TradeStatus } from "../types";

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
    setForm(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    const { entry, exit, stopLoss, shares, direction } = form;
    if (entry > 0 && exit && exit > 0 && shares > 0) {
      const rawPnl = direction === "Long" ? (exit - entry) * shares : (entry - exit) * shares;
      const pnlPct = direction === "Long" ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
      const risk = Math.abs(entry - stopLoss) * shares;
      const rMult = risk > 0 ? rawPnl / risk : 0;
      setForm(prev => ({
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

  const input = "w-full bg-[#010409] border border-[#21262d] text-[#e6edf3] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#30363d] placeholder-[#30363d] tracking-wide transition-colors";
  const label = "text-[9px] text-[#484f58] tracking-widest uppercase block mb-1.5";
  const field = "space-y-0.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label className={label}>Ticker</label>
          <input className={`${input} uppercase font-bold`} placeholder="RELIANCE" value={form.ticker}
            onChange={e => set("ticker", e.target.value.toUpperCase())} required />
        </div>
        <div className={field}>
          <label className={label}>Entry Date</label>
          <input type="date" className={input} value={form.date} onChange={e => set("date", e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={field}>
          <label className={label}>Direction</label>
          <select className={input} value={form.direction} onChange={e => set("direction", e.target.value as TradeDirection)}>
            <option>Long</option>
            <option>Short</option>
          </select>
        </div>
        <div className={field}>
          <label className={label}>Status</label>
          <select className={input} value={form.status} onChange={e => set("status", e.target.value as TradeStatus)}>
            <option>Closed</option>
            <option>Open</option>
          </select>
        </div>
        <div className={field}>
          <label className={label}>Setup</label>
          <select className={input} value={form.setup} onChange={e => set("setup", e.target.value)}>
            {SETUPS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "entry", label: "Entry ₹" },
          { key: "exit", label: "Exit ₹" },
          { key: "stopLoss", label: "Stop Loss ₹" },
          { key: "shares", label: "Shares / Qty" },
        ].map(({ key, label: lbl }) => (
          <div key={key} className={field}>
            <label className={label}>{lbl}</label>
            <input type="number" step="0.01" className={input}
              value={(form[key as keyof typeof form] as number) || ""}
              onChange={e => set(key as keyof Omit<Trade, "id">, parseFloat(e.target.value) || 0)}
              required={key === "entry" || key === "shares"} />
          </div>
        ))}
      </div>

      {/* Auto-calculated preview */}
      <div className="grid grid-cols-3 gap-3 bg-[#010409] border border-[#21262d] rounded p-3">
        {[
          { lbl: "P&L ₹", val: form.pnl, fmt: (v: number) => `${v >= 0 ? "+" : "−"}₹${Math.abs(v).toLocaleString("en-IN")}` },
          { lbl: "P&L %", val: form.pnlPct, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` },
          { lbl: "R Multiple", val: form.rMultiple, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R` },
        ].map(({ lbl, val, fmt }) => (
          <div key={lbl}>
            <p className={label}>{lbl}</p>
            <p className={`text-sm font-bold tabular-nums ${val > 0 ? "text-[#63dcb4]" : val < 0 ? "text-[#f87171]" : "text-[#484f58]"}`}>
              {fmt(val)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label className={label}>Exit Date</label>
          <input type="date" className={input} value={form.exitDate || ""} onChange={e => set("exitDate", e.target.value)} />
        </div>
        <div className={field}>
          <label className={label}>Grade</label>
          <select className={input} value={form.grade} onChange={e => set("grade", e.target.value)}>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className={field}>
        <label className={label}>Tags (comma separated)</label>
        <input className={input} placeholder="earnings play, sector rotation, ..." value={form.tags || ""}
          onChange={e => set("tags", e.target.value)} />
      </div>

      <div className={field}>
        <label className={label}>Notes / Rationale</label>
        <textarea rows={3} className={`${input} resize-none`}
          placeholder="Why did you take this trade? What was the thesis?"
          value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit"
          className="bg-linear-to-r from-[#63dcb4] to-[#3b82f6] text-[#010409] text-[10px] font-bold px-6 py-2 tracking-widest uppercase rounded hover:opacity-90 transition-opacity">
          {initial ? "Update Trade" : "Log Trade"}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-[#21262d] text-[#484f58] text-[10px] px-6 py-2 tracking-widest uppercase rounded hover:border-[#30363d] hover:text-[#8b949e] transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

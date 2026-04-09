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
    if (initial) {
      setForm({ ...initial });
    } else {
      setForm(blank());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const set = (key: keyof Omit<Trade, "id">, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Auto-calculate P&L, %, R-Multiple when fields change
  useEffect(() => {
    const { entry, exit, stopLoss, shares, direction } = form;
    if (entry > 0 && exit && exit > 0 && shares > 0) {
      const rawPnl = direction === "Long"
        ? (exit - entry) * shares
        : (entry - exit) * shares;
      const pnlPct = direction === "Long"
        ? ((exit - entry) / entry) * 100
        : ((entry - exit) / entry) * 100;
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
    onSubmit({ ...form, id: (initial?.id ?? "") } as Trade);
  };

  const inputCls =
    "w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e8e8e8] text-xs px-3 py-2 focus:outline-none focus:border-[#555] placeholder-[#333] tracking-wide";
  const labelCls = "text-[10px] text-[#555] tracking-widest uppercase block mb-1";
  const fieldCls = "space-y-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-3">
        <div className={fieldCls}>
          <label className={labelCls}>Ticker</label>
          <input
            className={inputCls + " uppercase"}
            placeholder="AAPL"
            value={form.ticker}
            onChange={(e) => set("ticker", e.target.value.toUpperCase())}
            required
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Entry Date</label>
          <input
            type="date"
            className={inputCls}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-3">
        <div className={fieldCls}>
          <label className={labelCls}>Direction</label>
          <select
            className={inputCls}
            value={form.direction}
            onChange={(e) => set("direction", e.target.value as TradeDirection)}
          >
            <option>Long</option>
            <option>Short</option>
          </select>
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Status</label>
          <select
            className={inputCls}
            value={form.status}
            onChange={(e) => set("status", e.target.value as TradeStatus)}
          >
            <option>Closed</option>
            <option>Open</option>
          </select>
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Setup</label>
          <select
            className={inputCls}
            value={form.setup}
            onChange={(e) => set("setup", e.target.value)}
          >
            {SETUPS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Row 3 — Prices */}
      <div className="grid grid-cols-4 gap-3">
        <div className={fieldCls}>
          <label className={labelCls}>Entry ₹</label>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={form.entry || ""}
            onChange={(e) => set("entry", parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Exit ₹</label>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={form.exit || ""}
            onChange={(e) => set("exit", parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Stop Loss ₹</label>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={form.stopLoss || ""}
            onChange={(e) => set("stopLoss", parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Shares / Qty</label>
          <input
            type="number"
            className={inputCls}
            value={form.shares || ""}
            onChange={(e) => set("shares", parseInt(e.target.value) || 0)}
            required
          />
        </div>
      </div>

      {/* Auto-calculated */}
      <div className="grid grid-cols-3 gap-3 bg-[#0a0a0a] border border-[#1a1a1a] p-3">
        <div>
          <p className={labelCls}>P&amp;L ₹</p>
          <p className={`text-sm font-bold ${form.pnl > 0 ? "text-[#4ade80]" : form.pnl < 0 ? "text-[#f87171]" : "text-[#888]"}`}>
            {form.pnl > 0 ? "+" : ""}{form.pnl.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <p className={labelCls}>P&amp;L %</p>
          <p className={`text-sm font-bold ${form.pnlPct > 0 ? "text-[#4ade80]" : form.pnlPct < 0 ? "text-[#f87171]" : "text-[#888]"}`}>
            {form.pnlPct > 0 ? "+" : ""}{form.pnlPct.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className={labelCls}>R Multiple</p>
          <p className={`text-sm font-bold ${form.rMultiple > 0 ? "text-[#4ade80]" : form.rMultiple < 0 ? "text-[#f87171]" : "text-[#888]"}`}>
            {form.rMultiple > 0 ? "+" : ""}{form.rMultiple.toFixed(2)}R
          </p>
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-2 gap-3">
        <div className={fieldCls}>
          <label className={labelCls}>Exit Date</label>
          <input
            type="date"
            className={inputCls}
            value={form.exitDate || ""}
            onChange={(e) => set("exitDate", e.target.value)}
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Grade</label>
          <select
            className={inputCls}
            value={form.grade}
            onChange={(e) => set("grade", e.target.value)}
          >
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div className={fieldCls}>
        <label className={labelCls}>Tags (comma separated)</label>
        <input
          className={inputCls}
          placeholder="earnings play, sector rotation, ..."
          value={form.tags || ""}
          onChange={(e) => set("tags", e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className={fieldCls}>
        <label className={labelCls}>Notes / Rationale</label>
        <textarea
          rows={3}
          className={inputCls + " resize-none"}
          placeholder="Why did you take this trade? What was the thesis?"
          value={form.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-[#e8e8e8] text-black text-xs font-bold px-6 py-2 tracking-widest uppercase hover:bg-white transition-colors"
        >
          {initial ? "Update" : "Log Trade"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-[#2a2a2a] text-[#555] text-xs px-6 py-2 tracking-widest uppercase hover:border-[#444] hover:text-[#aaa] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

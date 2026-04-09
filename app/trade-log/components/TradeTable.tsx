"use client";

import { useState } from "react";
import { Trade } from "../types";

interface Props {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

type SortKey = keyof Trade;

export default function TradeTable({ trades, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...trades].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="ml-1 text-[#888]">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : (
      <span className="ml-1 text-[#333]">↕</span>
    );

  const thCls = "text-[9px] tracking-widest uppercase text-[#555] text-left px-3 py-2 cursor-pointer hover:text-[#888] whitespace-nowrap select-none border-b border-[#1a1a1a]";
  const tdCls = "px-3 py-2.5 text-xs border-b border-[#111]";

  if (trades.length === 0) {
    return (
      <div className="border border-[#1f1f1f] bg-[#0f0f0f] p-12 text-center">
        <p className="text-[#333] text-xs tracking-widest uppercase">No trades logged yet.</p>
        <p className="text-[#222] text-[10px] tracking-widest mt-1">Click &quot;+ New Trade&quot; to begin.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#1f1f1f] bg-[#0f0f0f] overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="bg-[#0a0a0a]">
            <th className={thCls} onClick={() => handleSort("date")}>Date <SortIcon k="date" /></th>
            <th className={thCls} onClick={() => handleSort("ticker")}>Ticker <SortIcon k="ticker" /></th>
            <th className={thCls} onClick={() => handleSort("direction")}>Dir <SortIcon k="direction" /></th>
            <th className={thCls} onClick={() => handleSort("setup")}>Setup <SortIcon k="setup" /></th>
            <th className={thCls} onClick={() => handleSort("entry")}>Entry <SortIcon k="entry" /></th>
            <th className={thCls} onClick={() => handleSort("exit")}>Exit <SortIcon k="exit" /></th>
            <th className={thCls} onClick={() => handleSort("shares")}>Qty <SortIcon k="shares" /></th>
            <th className={thCls} onClick={() => handleSort("pnl")}>P&amp;L ₹ <SortIcon k="pnl" /></th>
            <th className={thCls} onClick={() => handleSort("pnlPct")}>% <SortIcon k="pnlPct" /></th>
            <th className={thCls} onClick={() => handleSort("rMultiple")}>R <SortIcon k="rMultiple" /></th>
            <th className={thCls} onClick={() => handleSort("grade")}>Grade <SortIcon k="grade" /></th>
            <th className={thCls}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((trade) => {
            const isWin = trade.pnl > 0;
            const isLoss = trade.pnl < 0;
            const expanded = expandedId === trade.id;
            return (
              <>
                <tr
                  key={trade.id}
                  className="hover:bg-[#111] transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : trade.id)}
                >
                  <td className={tdCls + " text-[#666]"}>{trade.date}</td>
                  <td className={tdCls}>
                    <span className="font-bold text-white tracking-wider">{trade.ticker}</span>
                    {trade.status === "Open" && (
                      <span className="ml-2 text-[8px] bg-[#1a3a2a] text-[#4ade80] px-1.5 py-0.5 tracking-widest uppercase">Open</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 ${trade.direction === "Long" ? "bg-[#1a2a3a] text-[#60a5fa]" : "bg-[#2a1a1a] text-[#f87171]"}`}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className={tdCls + " text-[#888] text-[10px] tracking-wide"}>{trade.setup}</td>
                  <td className={tdCls + " tabular-nums text-[#aaa]"}>₹{trade.entry.toLocaleString("en-IN")}</td>
                  <td className={tdCls + " tabular-nums text-[#aaa]"}>
                    {trade.exit ? `₹${trade.exit.toLocaleString("en-IN")}` : <span className="text-[#333]">—</span>}
                  </td>
                  <td className={tdCls + " tabular-nums text-[#666]"}>{trade.shares}</td>
                  <td className={tdCls + " tabular-nums font-bold"}>
                    <span className={isWin ? "text-[#4ade80]" : isLoss ? "text-[#f87171]" : "text-[#888]"}>
                      {trade.pnl > 0 ? "+" : ""}₹{Math.abs(trade.pnl).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className={tdCls + " tabular-nums"}>
                    <span className={isWin ? "text-[#4ade80]" : isLoss ? "text-[#f87171]" : "text-[#888]"}>
                      {trade.pnlPct > 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className={tdCls + " tabular-nums"}>
                    <span className={isWin ? "text-[#4ade80]" : isLoss ? "text-[#f87171]" : "text-[#888]"}>
                      {trade.rMultiple > 0 ? "+" : ""}{trade.rMultiple.toFixed(2)}R
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 ${
                      trade.grade === "A+" || trade.grade === "A" ? "text-[#4ade80]" :
                      trade.grade === "B" ? "text-[#facc15]" :
                      trade.grade === "C" ? "text-[#f97316]" : "text-[#f87171]"
                    }`}>
                      {trade.grade}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEdit(trade)}
                        className="text-[10px] text-[#555] hover:text-[#aaa] tracking-widest uppercase transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${trade.ticker}?`)) onDelete(trade.id);
                        }}
                        className="text-[10px] text-[#3a1a1a] hover:text-[#f87171] tracking-widest uppercase transition-colors"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr key={`${trade.id}-exp`} className="bg-[#0a0a0a]">
                    <td colSpan={12} className="px-6 py-4 border-b border-[#111]">
                      <div className="grid grid-cols-2 gap-4">
                        {trade.notes && (
                          <div>
                            <p className="text-[9px] text-[#444] tracking-widest uppercase mb-1">Notes</p>
                            <p className="text-xs text-[#888] leading-relaxed">{trade.notes}</p>
                          </div>
                        )}
                        {trade.tags && (
                          <div>
                            <p className="text-[9px] text-[#444] tracking-widest uppercase mb-1">Tags</p>
                            <div className="flex gap-1 flex-wrap">
                              {trade.tags.split(",").map((tag) => (
                                <span key={tag.trim()} className="text-[9px] border border-[#2a2a2a] text-[#555] px-2 py-0.5 tracking-wide">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {trade.exitDate && (
                          <div>
                            <p className="text-[9px] text-[#444] tracking-widest uppercase mb-1">Exit Date</p>
                            <p className="text-xs text-[#888]">{trade.exitDate}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] text-[#444] tracking-widest uppercase mb-1">Stop Loss</p>
                          <p className="text-xs text-[#888]">₹{trade.stopLoss.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

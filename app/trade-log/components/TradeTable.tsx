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
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...trades].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <span className="ml-1 text-[#63dcb4]">{sortDir === "asc" ? "↑" : "↓"}</span>
      : <span className="ml-1 text-[#21262d]">↕</span>;

  const th = "text-[9px] tracking-widest uppercase text-[#484f58] text-left px-3 py-2.5 cursor-pointer hover:text-[#8b949e] whitespace-nowrap select-none border-b border-[#21262d] transition-colors";
  const td = "px-3 py-3 text-xs border-b border-[#161b22]";

  if (!trades.length) return (
    <div className="border border-[#21262d] bg-[#0d1117] rounded-md p-16 text-center">
      <p className="text-[#30363d] text-xs tracking-widest uppercase">No trades logged yet</p>
      <p className="text-[#21262d] text-[10px] tracking-widest mt-1">Click &quot;+ Log Trade&quot; to begin</p>
    </div>
  );

  return (
    <div className="border border-[#21262d] bg-[#0d1117] rounded-md overflow-x-auto">
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="bg-[#010409]">
            {([
              ["date", "Date"],
              ["ticker", "Ticker"],
              ["direction", "Dir"],
              ["setup", "Setup"],
              ["entry", "Entry"],
              ["exit", "Exit"],
              ["shares", "Qty"],
              ["pnl", "P&L ₹"],
              ["pnlPct", "%"],
              ["rMultiple", "R"],
              ["grade", "Grade"],
            ] as [SortKey, string][]).map(([key, label]) => (
              <th key={key} className={th} onClick={() => handleSort(key)}>
                {label}<SortIcon k={key} />
              </th>
            ))}
            <th className={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(trade => {
            const win = trade.pnl > 0;
            const loss = trade.pnl < 0;
            const expanded = expandedId === trade.id;
            const pnlColor = win ? "text-[#63dcb4]" : loss ? "text-[#f87171]" : "text-[#484f58]";

            return (
              <>
                <tr
                  key={trade.id}
                  className={`hover:bg-[#161b22] transition-colors cursor-pointer ${expanded ? "bg-[#161b22]" : ""}`}
                  onClick={() => setExpandedId(expanded ? null : trade.id)}
                >
                  <td className={`${td} text-[#484f58] tabular-nums`}>{trade.date}</td>
                  <td className={td}>
                    <span className="font-bold text-[#e6edf3] tracking-wider">{trade.ticker}</span>
                    {trade.status === "Open" && (
                      <span className="ml-2 text-[8px] bg-[rgba(99,220,180,0.1)] text-[#63dcb4] border border-[rgba(99,220,180,0.3)] px-1.5 py-0.5 tracking-widest uppercase rounded-sm">Open</span>
                    )}
                  </td>
                  <td className={td}>
                    <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm ${
                      trade.direction === "Long"
                        ? "bg-[rgba(59,130,246,0.1)] text-[#60a5fa] border border-[rgba(59,130,246,0.3)]"
                        : "bg-[rgba(248,113,113,0.1)] text-[#f87171] border border-[rgba(248,113,113,0.3)]"
                    }`}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className={`${td} text-[#8b949e] text-[10px] tracking-wide`}>{trade.setup}</td>
                  <td className={`${td} tabular-nums text-[#8b949e]`}>₹{trade.entry.toLocaleString("en-IN")}</td>
                  <td className={`${td} tabular-nums text-[#8b949e]`}>
                    {trade.exit ? `₹${trade.exit.toLocaleString("en-IN")}` : <span className="text-[#30363d]">—</span>}
                  </td>
                  <td className={`${td} tabular-nums text-[#484f58]`}>{trade.shares}</td>
                  <td className={`${td} tabular-nums font-bold`}>
                    <span className={pnlColor}>
                      {trade.pnl > 0 ? "+" : trade.pnl < 0 ? "−" : ""}₹{Math.abs(trade.pnl).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className={`${td} tabular-nums`}>
                    <span className={pnlColor}>{trade.pnlPct > 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%</span>
                  </td>
                  <td className={`${td} tabular-nums`}>
                    <span className={`font-semibold ${pnlColor}`}>{trade.rMultiple > 0 ? "+" : ""}{trade.rMultiple.toFixed(2)}R</span>
                  </td>
                  <td className={td}>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                      trade.grade === "A+" ? "bg-[rgba(99,220,180,0.15)] text-[#63dcb4]" :
                      trade.grade === "A"  ? "bg-[rgba(99,220,180,0.08)] text-[#63dcb4]" :
                      trade.grade === "B"  ? "bg-[rgba(250,204,21,0.1)] text-[#facc15]" :
                      trade.grade === "C"  ? "bg-[rgba(251,146,60,0.1)] text-[#fb923c]" :
                                             "bg-[rgba(248,113,113,0.1)] text-[#f87171]"
                    }`}>
                      {trade.grade}
                    </span>
                  </td>
                  <td className={td} onClick={e => e.stopPropagation()}>
                    <div className="flex gap-3">
                      <button onClick={() => onEdit(trade)} className="text-[9px] text-[#484f58] hover:text-[#60a5fa] tracking-widest uppercase transition-colors">Edit</button>
                      <button onClick={() => { if (confirm(`Delete ${trade.ticker}?`)) onDelete(trade.id); }} className="text-[9px] text-[#30363d] hover:text-[#f87171] tracking-widest uppercase transition-colors">Del</button>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr key={`${trade.id}-exp`} className="bg-[#0d1117]">
                    <td colSpan={12} className="px-6 py-4 border-b border-[#161b22]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {trade.notes && (
                          <div className="col-span-2">
                            <p className="text-[9px] text-[#30363d] tracking-widest uppercase mb-1">Notes</p>
                            <p className="text-xs text-[#8b949e] leading-relaxed">{trade.notes}</p>
                          </div>
                        )}
                        {trade.tags && (
                          <div>
                            <p className="text-[9px] text-[#30363d] tracking-widest uppercase mb-1">Tags</p>
                            <div className="flex gap-1 flex-wrap">
                              {trade.tags.split(",").map(tag => (
                                <span key={tag.trim()} className="text-[9px] border border-[#21262d] text-[#484f58] px-2 py-0.5 rounded-sm tracking-wide">{tag.trim()}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] text-[#30363d] tracking-widest uppercase mb-1">Stop Loss</p>
                          <p className="text-xs text-[#f87171]">₹{trade.stopLoss.toLocaleString("en-IN")}</p>
                        </div>
                        {trade.exitDate && (
                          <div>
                            <p className="text-[9px] text-[#30363d] tracking-widest uppercase mb-1">Exit Date</p>
                            <p className="text-xs text-[#8b949e]">{trade.exitDate}</p>
                          </div>
                        )}
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

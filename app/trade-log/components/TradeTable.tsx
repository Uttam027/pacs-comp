"use client";

import { useState } from "react";
import { Trade } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    sortKey === k
      ? <span className="ml-1 text-gray-900">{sortDir === "asc" ? "↑" : "↓"}</span>
      : <span className="ml-1 text-gray-300">↕</span>;

  if (!trades.length) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-16 text-center">
        <p className="text-gray-300 text-sm">No trades logged yet</p>
        <p className="text-gray-200 text-xs mt-1">Click &quot;+ Log Trade&quot; to begin</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
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
              <TableHead
                key={key}
                className="text-[9px] tracking-widest uppercase font-semibold text-gray-400 cursor-pointer hover:text-gray-700 transition-colors whitespace-nowrap"
                onClick={() => handleSort(key)}
              >
                {label}<SortIcon k={key} />
              </TableHead>
            ))}
            <TableHead className="text-[9px] tracking-widest uppercase font-semibold text-gray-400 whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((trade) => {
            const win = trade.pnl > 0;
            const loss = trade.pnl < 0;
            const expanded = expandedId === trade.id;
            const pnlColor = win ? "text-emerald-600" : loss ? "text-red-500" : "text-gray-400";

            return (
              <>
                <TableRow
                  key={trade.id}
                  className={`cursor-pointer transition-colors ${expanded ? "bg-gray-50" : ""}`}
                  onClick={() => setExpandedId(expanded ? null : trade.id)}
                >
                  <TableCell className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{trade.date}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900 tracking-wider">{trade.ticker}</span>
                      {trade.status === "Open" && (
                        <Badge variant="outline" className="text-[8px] py-0 px-1 text-emerald-600 border-emerald-300 bg-emerald-50">Open</Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[9px] tracking-wider ${
                        trade.direction === "Long"
                          ? "text-blue-600 border-blue-200 bg-blue-50"
                          : "text-red-500 border-red-200 bg-red-50"
                      }`}
                    >
                      {trade.direction}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-gray-500">{trade.setup}</TableCell>
                  <TableCell className="text-xs tabular-nums text-gray-600">₹{trade.entry.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-xs tabular-nums text-gray-600">
                    {trade.exit ? `₹${trade.exit.toLocaleString("en-IN")}` : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-gray-400">{trade.shares}</TableCell>

                  <TableCell className="text-xs tabular-nums font-bold">
                    <span className={pnlColor}>
                      {trade.pnl > 0 ? "+" : trade.pnl < 0 ? "−" : ""}₹{Math.abs(trade.pnl).toLocaleString("en-IN")}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs tabular-nums">
                    <span className={pnlColor}>{trade.pnlPct > 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%</span>
                  </TableCell>

                  <TableCell className="text-xs tabular-nums">
                    <span className={`font-semibold ${pnlColor}`}>{trade.rMultiple > 0 ? "+" : ""}{trade.rMultiple.toFixed(2)}R</span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        trade.grade === "A+" ? "text-emerald-700 border-emerald-300 bg-emerald-50" :
                        trade.grade === "A"  ? "text-emerald-600 border-emerald-200 bg-emerald-50/50" :
                        trade.grade === "B"  ? "text-amber-600 border-amber-200 bg-amber-50" :
                        trade.grade === "C"  ? "text-orange-500 border-orange-200 bg-orange-50" :
                                               "text-red-500 border-red-200 bg-red-50"
                      }`}
                    >
                      {trade.grade}
                    </Badge>
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] tracking-widest uppercase text-gray-400 hover:text-gray-700"
                        onClick={() => onEdit(trade)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] tracking-widest uppercase text-gray-300 hover:text-red-500"
                        onClick={() => { if (confirm(`Delete ${trade.ticker}?`)) onDelete(trade.id); }}>Del</Button>
                    </div>
                  </TableCell>
                </TableRow>

                {expanded && (
                  <TableRow key={`${trade.id}-exp`} className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={12} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {trade.notes && (
                          <div className="col-span-2">
                            <p className="text-[9px] font-semibold tracking-widest text-gray-300 uppercase mb-1">Notes</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{trade.notes}</p>
                          </div>
                        )}
                        {trade.tags && (
                          <div>
                            <p className="text-[9px] font-semibold tracking-widest text-gray-300 uppercase mb-1.5">Tags</p>
                            <div className="flex gap-1 flex-wrap">
                              {trade.tags.split(",").map((tag) => (
                                <Badge key={tag.trim()} variant="secondary" className="text-[9px] px-1.5">
                                  {tag.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] font-semibold tracking-widest text-gray-300 uppercase mb-1">Stop Loss</p>
                          <p className="text-xs text-red-500 font-medium">₹{trade.stopLoss.toLocaleString("en-IN")}</p>
                        </div>
                        {trade.exitDate && (
                          <div>
                            <p className="text-[9px] font-semibold tracking-widest text-gray-300 uppercase mb-1">Exit Date</p>
                            <p className="text-xs text-gray-600">{trade.exitDate}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

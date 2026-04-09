"use client";

import { Trade } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Props {
  trades: Trade[];
  onOpen: (trade: Trade) => void;
}

export default function TradeTable({ trades, onOpen }: Props) {
  const sorted = [...trades].sort((a, b) => b.firstEntryDate.localeCompare(a.firstEntryDate));

  if (!trades.length) return (
    <div className="border border-gray-200 rounded-lg bg-white p-16 text-center">
      <p className="text-gray-300 text-sm">No trades logged yet</p>
      <p className="text-gray-200 text-xs mt-1">Click &quot;+ Log Trade&quot; to begin</p>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            {["Date", "Ticker", "Dir", "Setup", "Avg Entry", "Avg Exit", "Shares", "Open", "Realized P&L", "%", "R", "Grade", "Status", ""].map((h) => (
              <TableHead key={h} className="text-[9px] tracking-widest uppercase font-semibold text-gray-400 whitespace-nowrap">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((trade) => {
            const win = trade.realizedPnl > 0;
            const loss = trade.realizedPnl < 0;
            const pnlColor = win ? "text-emerald-600" : loss ? "text-red-500" : "text-gray-400";

            return (
              <TableRow key={trade.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onOpen(trade)}>

                <TableCell className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{trade.firstEntryDate}</TableCell>

                <TableCell>
                  <span className="text-xs font-bold text-gray-900 tracking-wider">{trade.ticker}</span>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={`text-[9px] tracking-wider ${
                    trade.direction === "Long" ? "text-blue-600 border-blue-200 bg-blue-50" : "text-red-500 border-red-200 bg-red-50"
                  }`}>
                    {trade.direction}
                  </Badge>
                </TableCell>

                <TableCell className="text-xs text-gray-500">{trade.setup}</TableCell>
                <TableCell className="text-xs tabular-nums text-gray-600">
                  {trade.avgEntry > 0 ? `₹${trade.avgEntry.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-xs tabular-nums text-gray-600">
                  {trade.avgExit > 0 ? `₹${trade.avgExit.toFixed(2)}` : <span className="text-gray-300">—</span>}
                </TableCell>
                <TableCell className="text-xs tabular-nums text-gray-500">{trade.totalShares}</TableCell>
                <TableCell className="text-xs tabular-nums text-blue-500 font-medium">{trade.openShares}</TableCell>

                <TableCell className="text-xs tabular-nums font-bold">
                  <span className={pnlColor}>
                    {trade.realizedPnl > 0 ? "+" : trade.realizedPnl < 0 ? "−" : ""}
                    {trade.realizedPnl !== 0 ? `₹${Math.abs(trade.realizedPnl).toLocaleString("en-IN")}` : "—"}
                  </span>
                </TableCell>

                <TableCell className="text-xs tabular-nums">
                  <span className={pnlColor}>
                    {trade.pnlPct !== 0 ? `${trade.pnlPct > 0 ? "+" : ""}${trade.pnlPct.toFixed(2)}%` : "—"}
                  </span>
                </TableCell>

                <TableCell className="text-xs tabular-nums">
                  <span className={`font-semibold ${pnlColor}`}>
                    {trade.exitedShares > 0 ? `${trade.rMultiple >= 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}R` : "—"}
                  </span>
                </TableCell>

                <TableCell>
                  {trade.grade ? (
                    <Badge variant="outline" className={`text-[9px] font-bold ${
                      trade.grade === "A+" ? "text-emerald-700 border-emerald-300 bg-emerald-50" :
                      trade.grade === "A"  ? "text-emerald-600 border-emerald-200 bg-emerald-50/50" :
                      trade.grade === "B"  ? "text-amber-600 border-amber-200 bg-amber-50" :
                      trade.grade === "C"  ? "text-orange-500 border-orange-200 bg-orange-50" :
                                             "text-red-500 border-red-200 bg-red-50"
                    }`}>{trade.grade}</Badge>
                  ) : <span className="text-gray-200">—</span>}
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={`text-[9px] ${
                    trade.status === "Open"
                      ? "text-blue-600 border-blue-200 bg-blue-50"
                      : "text-emerald-600 border-emerald-200 bg-emerald-50"
                  }`}>{trade.status}</Badge>
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm"
                    className="h-6 px-2 text-[9px] tracking-widest uppercase text-gray-400 hover:text-gray-700"
                    onClick={() => onOpen(trade)}>
                    {trade.status === "Open" ? "Manage →" : "View →"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

export default function EquityCurveChart({ trades }: { trades: Trade[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const closed = [...trades]
      .filter((t) => t.status === "Closed" && t.realizedPnl !== 0)
      .sort((a, b) => {
        const dateA = a.lastExitDate ?? a.firstEntryDate;
        const dateB = b.lastExitDate ?? b.firstEntryDate;
        return dateA.localeCompare(dateB);
      });

    const openTrades = [...trades]
      .filter((t) => t.status === "Open")
      .sort((a, b) => a.firstEntryDate.localeCompare(b.firstEntryDate));

    let cum = 0;
    const points: { date: string; value: number; ticker: string; isOpen?: boolean }[] = [];

    if (closed.length > 0) {
      points.push({ date: closed[0].firstEntryDate, value: 0, ticker: "" });
    }

    closed.forEach((t) => {
      cum += t.realizedPnl;
      const date = t.lastExitDate ?? t.firstEntryDate;
      points.push({ date, value: parseFloat(cum.toFixed(2)), ticker: t.ticker });
    });

    // Add open trades as dots at the current cumulative level (they haven't added to realized PnL yet)
    // Each open trade gets a point at its entry date, sitting at the current cumulative baseline
    // with partial realized PnL if any exits have been made
    const openPoints: { date: string; value: number; ticker: string; riskAtStop: number; deployed: number; partialPnl: number }[] = [];
    openTrades.forEach((t) => {
      const partialPnl = t.realizedPnl; // realized P&L from partial exits
      const riskAtStop = Math.abs(t.avgEntry - t.stopLoss) * t.openShares;
      const deployed = t.avgEntry * t.openShares;
      openPoints.push({
        date: t.firstEntryDate,
        value: parseFloat((cum + partialPnl).toFixed(2)),
        ticker: t.ticker,
        riskAtStop,
        deployed,
        partialPnl,
      });
    });

    const allPoints = [...points, ...openPoints.map((p) => ({ ...p, isOpen: true }))];
    allPoints.sort((a, b) => a.date.localeCompare(b.date));

    const closedData = allPoints.map((p) => p.isOpen ? null : p.value);
    const openData = allPoints.map((p) => p.isOpen ? p.value : null);

    const labels = allPoints.map((p) => {
      if (!p.date) return "";
      const d = new Date(p.date);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
    });

    if (chartRef.current) chartRef.current.destroy();

    const last = points[points.length - 1]?.value ?? 0;
    const ctx = canvasRef.current.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, last >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)");
    grad.addColorStop(1, last >= 0 ? "rgba(16,185,129,0.01)" : "rgba(239,68,68,0.01)");

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Realized P&L",
            data: closedData,
            borderColor: last >= 0 ? "#10b981" : "#ef4444",
            backgroundColor: grad,
            borderWidth: 2,
            fill: true,
            pointRadius: closedData.filter(Boolean).length > 30 ? 0 : 4,
            pointBackgroundColor: last >= 0 ? "#10b981" : "#ef4444",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension: 0.4,
            spanGaps: false,
          },
          {
            label: "Open Positions",
            data: openData,
            borderColor: "#3b82f6",
            backgroundColor: "transparent",
            borderWidth: 0,
            pointRadius: 7,
            pointHoverRadius: 9,
            pointBackgroundColor: "#3b82f6",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#fff",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            titleColor: "#6b7280",
            bodyColor: "#111827",
            padding: 10,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                const p = allPoints[idx];
                return p?.ticker ? `${p.date} · ${p.ticker}` : p?.date ?? "";
              },
              label: (c) => {
                const idx = c.dataIndex;
                const p = allPoints[idx];
                const v: number = c.parsed.y ?? 0;
                if (p?.isOpen) {
                  const op = openPoints.find((o) => o.ticker === p.ticker && o.date === p.date);
                  const lines = [` 🔵 OPEN — cumulative base: ₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN")}`];
                  if (op) {
                    lines.push(` Deployed: ₹${op.deployed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`);
                    lines.push(` Risk @ stop: −₹${op.riskAtStop.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`);
                    if (op.partialPnl !== 0) lines.push(` Partial realized: ${op.partialPnl > 0 ? "+" : "−"}₹${Math.abs(op.partialPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`);
                  }
                  return lines;
                }
                return ` Cumulative: ₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN")}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#d1d5db", font: { size: 9 }, maxTicksLimit: 8, maxRotation: 0 },
            grid: { color: "#f3f4f6" },
            border: { color: "#e5e7eb" },
          },
          y: {
            ticks: {
              color: "#9ca3af",
              font: { size: 9 },
              callback: (v) => v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "",
            },
            grid: { color: "#f3f4f6" },
            border: { color: "#e5e7eb" },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [trades]);

  const openTrades = trades.filter((t) => t.status === "Open");

  if (!trades.filter((t) => t.status === "Closed").length && !openTrades.length)
    return <div className="h-64 flex items-center justify-center"><p className="text-gray-200 text-xs">No trades yet</p></div>;

  const totalRisk = openTrades.reduce((s, t) => s + Math.abs(t.avgEntry - t.stopLoss) * t.openShares, 0);
  const totalDeployed = openTrades.reduce((s, t) => s + t.avgEntry * t.openShares, 0);

  return (
    <div>
      <div className="h-64"><canvas ref={canvasRef} /></div>
      {openTrades.length > 0 && (
        <div className="mt-3 flex items-center gap-4 flex-wrap border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span className="text-gray-500">{openTrades.length} open position{openTrades.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="text-[11px] text-gray-500">
            Deployed: <span className="font-semibold text-gray-700">₹{totalDeployed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="text-[11px] text-gray-500">
            Max risk: <span className="font-semibold text-red-500">−₹{totalRisk.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-400">
            {openTrades.map((t) => (
              <span key={t.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                {t.ticker}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

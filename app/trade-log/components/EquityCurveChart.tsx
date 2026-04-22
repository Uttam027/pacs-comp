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

    let cum = 0;
    const points: { date: string; value: number; ticker: string }[] = [];

    // Start from zero
    if (closed.length > 0) {
      points.push({ date: closed[0].firstEntryDate, value: 0, ticker: "" });
    }

    closed.forEach((t) => {
      cum += t.realizedPnl;
      const date = t.lastExitDate ?? t.firstEntryDate;
      points.push({ date, value: parseFloat(cum.toFixed(2)), ticker: t.ticker });
    });

    const data = points.map((p) => p.value);
    const labels = points.map((p) => {
      if (!p.date) return "";
      const d = new Date(p.date);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
    });

    if (chartRef.current) chartRef.current.destroy();

    const last = data[data.length - 1] ?? 0;
    const ctx = canvasRef.current.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, last >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)");
    grad.addColorStop(1, last >= 0 ? "rgba(16,185,129,0.01)" : "rgba(239,68,68,0.01)");

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data,
          borderColor: last >= 0 ? "#10b981" : "#ef4444",
          backgroundColor: grad,
          borderWidth: 2,
          fill: true,
          pointRadius: data.length > 30 ? 0 : 4,
          pointBackgroundColor: last >= 0 ? "#10b981" : "#ef4444",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          tension: 0.4,
        }],
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
                const p = points[idx];
                return p?.ticker ? `${p.date} · ${p.ticker}` : p?.date ?? "";
              },
              label: (c) => {
                const v: number = c.parsed.y ?? 0;
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

  if (!trades.filter((t) => t.status === "Closed").length)
    return <div className="h-64 flex items-center justify-center"><p className="text-gray-200 text-xs">No closed trades yet</p></div>;
  return <div className="h-64"><canvas ref={canvasRef} /></div>;
}

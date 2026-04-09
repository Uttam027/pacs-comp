"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip } from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

interface Props { trades: Trade[] }

export default function PnlBarChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = [...trades].filter((t) => t.status === "Closed").sort((a, b) => a.date.localeCompare(b.date));
    const data = closed.map((t) => t.pnl);
    const labels = closed.map((t, i) => `#${i + 1} ${t.ticker}`);
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((v) => v >= 0 ? "#d1fae5" : "#fee2e2"),
          borderColor: data.map((v) => v >= 0 ? "#10b981" : "#ef4444"),
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#fff", borderColor: "#e5e7eb", borderWidth: 1,
            titleColor: "#6b7280", bodyColor: "#111827", padding: 10,
            callbacks: {
              label: (ctx) => {
                const val: number = ctx.parsed.y ?? 0;
                return ` ₹${val >= 0 ? "+" : ""}${val.toLocaleString("en-IN")}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: "#d1d5db", font: { size: 9 }, maxTicksLimit: 10 }, grid: { display: false }, border: { color: "#e5e7eb" } },
          y: {
            ticks: { color: "#9ca3af", font: { size: 9 }, callback: (val) => val != null ? `₹${Number(val).toLocaleString("en-IN")}` : "" },
            grid: { color: "#f3f4f6" }, border: { color: "#e5e7eb" },
          },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [trades]);

  if (!trades.filter((t) => t.status === "Closed").length)
    return <div className="h-52 flex items-center justify-center"><p className="text-gray-200 text-xs">No closed trades yet</p></div>;

  return <div className="h-52"><canvas ref={canvasRef} /></div>;
}

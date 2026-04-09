"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip } from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

export default function RMultipleChart({ trades }: { trades: Trade[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = [...trades].filter((t) => t.status === "Closed").sort((a, b) => a.firstEntryDate.localeCompare(b.firstEntryDate));
    const data = closed.map((t) => t.rMultiple);
    const labels = closed.map((t, i) => `#${i + 1} ${t.ticker}`);
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: data.map((v) => v >= 2 ? "#d1fae5" : v >= 1 ? "#a7f3d0" : v >= 0 ? "#fef9c3" : "#fee2e2"), borderColor: data.map((v) => v >= 2 ? "#10b981" : v >= 1 ? "#34d399" : v >= 0 ? "#f59e0b" : "#ef4444"), borderWidth: 1.5, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#fff", borderColor: "#e5e7eb", borderWidth: 1, titleColor: "#6b7280", bodyColor: "#111827", padding: 10, callbacks: { label: (c) => { const v: number = c.parsed.y ?? 0; return ` ${v >= 0 ? "+" : ""}${v.toFixed(2)}R`; } } } },
        scales: { x: { ticks: { color: "#d1d5db", font: { size: 9 }, maxTicksLimit: 10 }, grid: { display: false }, border: { color: "#e5e7eb" } }, y: { ticks: { color: "#9ca3af", font: { size: 9 }, callback: (v) => v != null ? `${Number(v).toFixed(1)}R` : "" }, grid: { color: "#f3f4f6" }, border: { color: "#e5e7eb" } } },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [trades]);

  if (!trades.filter((t) => t.status === "Closed").length)
    return <div className="h-52 flex items-center justify-center"><p className="text-gray-200 text-xs">No data</p></div>;
  return <div className="h-52"><canvas ref={canvasRef} /></div>;
}

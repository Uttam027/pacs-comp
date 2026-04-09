"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip } from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

export default function SetupPerformanceChart({ trades }: { trades: Trade[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const setupMap: Record<string, number[]> = {};
    trades.forEach((t) => { if (!setupMap[t.setup]) setupMap[t.setup] = []; setupMap[t.setup].push(t.realizedPnl); });
    const labels = Object.keys(setupMap);
    const totals = labels.map((s) => parseFloat(setupMap[s].reduce((a, b) => a + b, 0).toFixed(2)));
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: { labels, datasets: [{ data: totals, backgroundColor: totals.map((v) => v >= 0 ? "#d1fae5" : "#fee2e2"), borderColor: totals.map((v) => v >= 0 ? "#10b981" : "#ef4444"), borderWidth: 1.5, borderRadius: 4 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#fff", borderColor: "#e5e7eb", borderWidth: 1, titleColor: "#6b7280", bodyColor: "#111827", padding: 10, callbacks: { label: (c) => { const v: number = c.parsed.x ?? 0; const count = setupMap[labels[c.dataIndex]]?.length ?? 0; return [` ₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN")}`, ` ${count} trade${count !== 1 ? "s" : ""}`]; } } } },
        scales: { x: { ticks: { color: "#9ca3af", font: { size: 9 }, callback: (v) => v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "" }, grid: { color: "#f3f4f6" }, border: { color: "#e5e7eb" } }, y: { ticks: { color: "#6b7280", font: { size: 10 } }, grid: { display: false }, border: { color: "#e5e7eb" } } },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [trades]);

  if (!trades.length)
    return <div className="h-52 flex items-center justify-center"><p className="text-gray-200 text-xs">No data</p></div>;
  return <div className="h-52"><canvas ref={canvasRef} /></div>;
}

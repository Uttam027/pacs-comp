"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

export default function WinLossChart({ trades }: { trades: Trade[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = trades.filter((t) => t.status === "Closed");
    const wins = closed.filter((t) => t.realizedPnl > 0).length;
    const losses = closed.filter((t) => t.realizedPnl < 0).length;
    const be = closed.filter((t) => t.realizedPnl === 0).length;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: { labels: ["Win", "Loss", "BE"], datasets: [{ data: [wins, losses, be], backgroundColor: ["#d1fae5", "#fee2e2", "#f3f4f6"], borderColor: ["#10b981", "#ef4444", "#d1d5db"], borderWidth: 2, hoverBackgroundColor: ["#a7f3d0", "#fecaca", "#e5e7eb"] }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        plugins: { legend: { position: "bottom", labels: { color: "#6b7280", font: { size: 9 }, boxWidth: 8, padding: 14 } }, tooltip: { backgroundColor: "#fff", borderColor: "#e5e7eb", borderWidth: 1, titleColor: "#6b7280", bodyColor: "#111827", padding: 10, callbacks: { label: (c) => { const t = wins + losses + be; return ` ${c.parsed} (${t > 0 ? ((c.parsed / t) * 100).toFixed(1) : 0}%)`; } } } },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [trades]);

  if (!trades.filter((t) => t.status === "Closed").length)
    return <div className="h-52 flex items-center justify-center"><p className="text-gray-200 text-xs">No data</p></div>;
  return <div className="h-52"><canvas ref={canvasRef} /></div>;
}

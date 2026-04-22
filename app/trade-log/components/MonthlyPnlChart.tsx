"use client";

import { useEffect, useRef, useState } from "react";
import { Trade } from "../types";
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip } from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

// Get ISO week string: "2024-W03"
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1 ... Sun=7
  d.setDate(d.getDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  // key = "2024-W03" — show as "W03 '24"
  const [year, w] = key.split("-");
  return `${w} '${year.slice(2)}`;
}

export default function MonthlyPnlChart({ trades }: { trades: Trade[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [view, setView] = useState<"monthly" | "weekly">("monthly");

  useEffect(() => {
    if (!canvasRef.current) return;

    const map: Record<string, number> = {};

    trades.forEach((t) => {
      if (t.realizedPnl === 0) return;
      const date = t.lastExitDate ?? t.firstEntryDate;
      const key = view === "monthly" ? date.slice(0, 7) : getWeekKey(date);
      map[key] = (map[key] ?? 0) + t.realizedPnl;
    });

    const keys = Object.keys(map).sort();
    const data = keys.map((k) => parseFloat(map[k].toFixed(2)));
    const labels = keys.map((k) =>
      view === "monthly"
        ? (() => { const [y, m] = k.split("-"); return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); })()
        : weekLabel(k)
    );

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
          borderRadius: 5,
          borderSkipped: false,
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
              label: (c) => {
                const v: number = c.parsed.y ?? 0;
                return ` ₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN")}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#9ca3af", font: { size: 9 }, maxRotation: view === "weekly" ? 45 : 0, maxTicksLimit: view === "weekly" ? 16 : 24 },
            grid: { display: false },
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
  }, [trades, view]);

  if (!trades.length)
    return <div className="h-60 flex items-center justify-center"><p className="text-gray-200 text-xs">No data</p></div>;

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(["monthly", "weekly"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-[9px] tracking-widest uppercase px-2 py-0.5 rounded border transition-colors ${
              view === v
                ? "bg-gray-800 text-white border-gray-800"
                : "text-gray-400 border-gray-200 hover:border-gray-400"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="h-60"><canvas ref={canvasRef} /></div>
    </div>
  );
}

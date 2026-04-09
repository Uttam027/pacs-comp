"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import {
  Chart,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
} from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

interface Props { trades: Trade[] }

export default function MonthlyPnlChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = trades.filter(t => t.status === "Closed");

    const monthMap: Record<string, number> = {};
    closed.forEach(t => {
      const month = t.date.slice(0, 7); // YYYY-MM
      monthMap[month] = (monthMap[month] ?? 0) + t.pnl;
    });

    const labels = Object.keys(monthMap).sort();
    const data = labels.map(m => parseFloat(monthMap[m].toFixed(2)));
    const colors = data.map(v => v >= 0 ? "rgba(99,220,180,0.7)" : "rgba(248,113,113,0.7)");
    const borders = data.map(v => v >= 0 ? "#63dcb4" : "#f87171");

    // Format labels as "Jan 25"
    const formattedLabels = labels.map(l => {
      const [y, m] = l.split("-");
      const d = new Date(parseInt(y), parseInt(m) - 1);
      return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    });

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: formattedLabels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0d1117",
            borderColor: "#30363d",
            borderWidth: 1,
            titleColor: "#8b949e",
            bodyColor: "#e6edf3",
            padding: 10,
            titleFont: { family: "monospace", size: 10 },
            bodyFont: { family: "monospace", size: 12, weight: "bold" },
            callbacks: {
              label: ctx => {
                const val: number = ctx.parsed.y ?? 0;
                return ` ₹${val >= 0 ? "+" : ""}${val.toLocaleString("en-IN")}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#8b949e", font: { family: "monospace", size: 9 } },
            grid: { display: false },
            border: { color: "#21262d" },
          },
          y: {
            ticks: {
              color: "#484f58",
              font: { family: "monospace", size: 9 },
              callback: val => val != null ? `₹${Number(val).toLocaleString("en-IN")}` : "",
            },
            grid: { color: "#161b22" },
            border: { color: "#21262d" },
          },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [trades]);

  if (!trades.filter(t => t.status === "Closed").length)
    return <div className="h-52 flex items-center justify-center"><p className="text-[#30363d] text-[10px] tracking-widest uppercase">No data</p></div>;

  return <div className="h-52"><canvas ref={canvasRef} /></div>;
}

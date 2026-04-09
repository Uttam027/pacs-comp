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

export default function PnlBarChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = [...trades].filter(t => t.status === "Closed").sort((a, b) => a.date.localeCompare(b.date));
    const data = closed.map(t => t.pnl);
    const labels = closed.map((t, i) => `#${i + 1} ${t.ticker}`);
    const colors = data.map(v => v >= 0 ? "rgba(99,220,180,0.75)" : "rgba(248,113,113,0.75)");
    const borders = data.map(v => v >= 0 ? "#63dcb4" : "#f87171");

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 3,
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
            ticks: { color: "#30363d", font: { family: "monospace", size: 9 }, maxTicksLimit: 10 },
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
    return <div className="h-52 flex items-center justify-center"><p className="text-[#30363d] text-[10px] tracking-widest uppercase">No closed trades yet</p></div>;

  return <div className="h-52"><canvas ref={canvasRef} /></div>;
}

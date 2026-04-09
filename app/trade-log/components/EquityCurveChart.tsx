"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

interface Props {
  trades: Trade[];
}

export default function EquityCurveChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const closed = [...trades]
      .filter((t) => t.status === "Closed")
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulative = 0;
    const data = closed.map((t) => {
      cumulative += t.pnl;
      return cumulative;
    });
    const labels = closed.map((t) => t.ticker);

    if (chartRef.current) chartRef.current.destroy();

    const isPositive = data.length > 0 && data[data.length - 1] >= 0;
    const lineColor = isPositive ? "#4ade80" : "#f87171";
    const fillColor = isPositive ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)";

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 1.5,
            fill: true,
            pointRadius: data.length > 30 ? 0 : 3,
            pointBackgroundColor: lineColor,
            pointBorderColor: lineColor,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111",
            borderColor: "#2a2a2a",
            borderWidth: 1,
            titleColor: "#888",
            bodyColor: "#e8e8e8",
            titleFont: { family: "monospace", size: 10 },
            bodyFont: { family: "monospace", size: 11 },
            callbacks: {
              label: (ctx) => {
                const val: number = ctx.parsed.y ?? 0;
                return ` ₹${val >= 0 ? "+" : ""}${val.toLocaleString("en-IN")}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#333",
              font: { family: "monospace", size: 9 },
              maxTicksLimit: 8,
            },
            grid: { color: "#111" },
            border: { color: "#1a1a1a" },
          },
          y: {
            ticks: {
              color: "#444",
              font: { family: "monospace", size: 9 },
              callback: (val) => val != null ? `₹${Number(val).toLocaleString("en-IN")}` : "",
            },
            grid: { color: "#111" },
            border: { color: "#1a1a1a" },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [trades]);

  if (trades.filter((t) => t.status === "Closed").length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-[#222] text-[10px] tracking-widest uppercase">No closed trades</p>
      </div>
    );
  }

  return <div className="h-48"><canvas ref={canvasRef} /></div>;
}

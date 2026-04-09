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

export default function RMultipleChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = [...trades].filter(t => t.status === "Closed").sort((a, b) => a.date.localeCompare(b.date));
    const data = closed.map(t => t.rMultiple);
    const labels = closed.map((t, i) => `#${i + 1} ${t.ticker}`);
    const colors = data.map(v => {
      if (v >= 2) return "rgba(99,220,180,0.9)";
      if (v >= 1) return "rgba(99,220,180,0.5)";
      if (v >= 0) return "rgba(250,204,21,0.5)";
      return "rgba(248,113,113,0.7)";
    });
    const borders = data.map(v => {
      if (v >= 2) return "#63dcb4";
      if (v >= 1) return "#63dcb4";
      if (v >= 0) return "#facc15";
      return "#f87171";
    });

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
                return ` ${val >= 0 ? "+" : ""}${val.toFixed(2)}R`;
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
              callback: val => val != null ? `${Number(val).toFixed(1)}R` : "",
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

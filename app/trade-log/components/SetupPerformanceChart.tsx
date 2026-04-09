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

export default function SetupPerformanceChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = trades.filter(t => t.status === "Closed");

    const setupMap: Record<string, number[]> = {};
    closed.forEach(t => {
      if (!setupMap[t.setup]) setupMap[t.setup] = [];
      setupMap[t.setup].push(t.pnl);
    });

    const labels = Object.keys(setupMap);
    const totals = labels.map(s => setupMap[s].reduce((a, b) => a + b, 0));
    const colors = totals.map(v => v >= 0 ? "rgba(99,220,180,0.75)" : "rgba(248,113,113,0.75)");
    const borders = totals.map(v => v >= 0 ? "#63dcb4" : "#f87171");

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: totals,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: "y",
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
                const val: number = ctx.parsed.x ?? 0;
                const setup = labels[ctx.dataIndex];
                const count = setupMap[setup]?.length ?? 0;
                return [` ₹${val >= 0 ? "+" : ""}${val.toLocaleString("en-IN")}`, ` ${count} trade${count !== 1 ? "s" : ""}`];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#484f58",
              font: { family: "monospace", size: 9 },
              callback: val => val != null ? `₹${Number(val).toLocaleString("en-IN")}` : "",
            },
            grid: { color: "#161b22" },
            border: { color: "#21262d" },
          },
          y: {
            ticks: { color: "#8b949e", font: { family: "monospace", size: 10 } },
            grid: { display: false },
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

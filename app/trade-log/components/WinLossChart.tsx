"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface Props { trades: Trade[] }

export default function WinLossChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const closed = trades.filter(t => t.status === "Closed");
    const wins = closed.filter(t => t.pnl > 0).length;
    const losses = closed.filter(t => t.pnl < 0).length;
    const be = closed.filter(t => t.pnl === 0).length;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: ["Win", "Loss", "BE"],
        datasets: [{
          data: [wins, losses, be],
          backgroundColor: ["rgba(99,220,180,0.15)", "rgba(248,113,113,0.15)", "rgba(139,148,158,0.1)"],
          borderColor: ["#63dcb4", "#f87171", "#484f58"],
          borderWidth: 2,
          hoverBackgroundColor: ["rgba(99,220,180,0.3)", "rgba(248,113,113,0.3)", "rgba(139,148,158,0.2)"],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#484f58",
              font: { family: "monospace", size: 9 },
              boxWidth: 8,
              padding: 14,
            },
          },
          tooltip: {
            backgroundColor: "#0d1117",
            borderColor: "#30363d",
            borderWidth: 1,
            titleColor: "#8b949e",
            bodyColor: "#e6edf3",
            padding: 10,
            titleFont: { family: "monospace", size: 10 },
            bodyFont: { family: "monospace", size: 12 },
            callbacks: {
              label: ctx => {
                const total = wins + losses + be;
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : "0";
                return ` ${ctx.parsed} trades (${pct}%)`;
              },
            },
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

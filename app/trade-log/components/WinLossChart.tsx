"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface Props {
  trades: Trade[];
}

export default function WinLossChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const closed = trades.filter((t) => t.status === "Closed");
    const wins = closed.filter((t) => t.pnl > 0).length;
    const losses = closed.filter((t) => t.pnl < 0).length;
    const be = closed.filter((t) => t.pnl === 0).length;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: ["Win", "Loss", "BE"],
        datasets: [
          {
            data: [wins, losses, be],
            backgroundColor: ["#166534", "#7f1d1d", "#292524"],
            borderColor: ["#4ade80", "#f87171", "#444"],
            borderWidth: 1,
            hoverBackgroundColor: ["#15803d", "#991b1b", "#3a3a3a"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#555",
              font: { family: "monospace", size: 9 },
              boxWidth: 8,
              padding: 12,
            },
          },
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

  if (trades.filter((t) => t.status === "Closed").length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-[#222] text-[10px] tracking-widest uppercase">No data</p>
      </div>
    );
  }

  return <div className="h-48"><canvas ref={canvasRef} /></div>;
}

"use client";

import { useEffect, useRef } from "react";
import { Trade } from "../types";
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

interface Props { trades: Trade[]; liveUnrealizedPnl: number | null }

export default function EquityCurveChart({ trades, liveUnrealizedPnl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const closed = [...trades]
      .filter((t) => t.status === "Closed" && t.realizedPnl !== 0)
      .sort((a, b) => {
        const dateA = a.lastExitDate ?? a.firstEntryDate;
        const dateB = b.lastExitDate ?? b.firstEntryDate;
        return dateA.localeCompare(dateB);
      });

    let cum = 0;
    const points: { date: string; value: number; ticker: string }[] = [];

    if (closed.length > 0) {
      points.push({ date: closed[0].firstEntryDate, value: 0, ticker: "" });
    }

    closed.forEach((t) => {
      cum += t.realizedPnl;
      const date = t.lastExitDate ?? t.firstEntryDate;
      points.push({ date, value: parseFloat(cum.toFixed(2)), ticker: t.ticker });
    });

    const realizedData = points.map((p) => p.value);
    const labels = points.map((p) => {
      if (!p.date) return "";
      const d = new Date(p.date);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
    });

    // Dashed unrealized extension: last realized point + today's date with realized+unrealized value
    const hasUnrealized = liveUnrealizedPnl !== null && liveUnrealizedPnl !== 0 && trades.some((t) => t.status === "Open");
    const unrealizedData: (number | null)[] = realizedData.map(() => null);
    let unrealizedLabel = "";
    if (hasUnrealized && points.length > 0) {
      // Bridge point: last realized value (connects the two lines)
      unrealizedData[unrealizedData.length - 1] = cum;
      // Extension point: realized + unrealized
      const totalWithUnrealized = parseFloat((cum + liveUnrealizedPnl!).toFixed(2));
      unrealizedData.push(totalWithUnrealized);
      const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
      labels.push(today);
      unrealizedLabel = today;
      realizedData.push(null as unknown as number);
      points.push({ date: unrealizedLabel, value: totalWithUnrealized, ticker: "" });
    }

    if (chartRef.current) chartRef.current.destroy();

    const last = cum;
    const ctx = canvasRef.current.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, last >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)");
    grad.addColorStop(1, last >= 0 ? "rgba(16,185,129,0.01)" : "rgba(239,68,68,0.01)");

    const unrealizedColor = (liveUnrealizedPnl ?? 0) >= 0 ? "#3b82f6" : "#f97316";

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Realized P&L",
            data: realizedData,
            borderColor: last >= 0 ? "#10b981" : "#ef4444",
            backgroundColor: grad,
            borderWidth: 2,
            fill: true,
            pointRadius: realizedData.filter((v) => v !== null).length > 30 ? 0 : 4,
            pointBackgroundColor: last >= 0 ? "#10b981" : "#ef4444",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension: 0.4,
            spanGaps: false,
          },
          ...(hasUnrealized ? [{
            label: "With Unrealized",
            data: unrealizedData,
            borderColor: unrealizedColor,
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 4],
            fill: false,
            pointRadius: [0, ...unrealizedData.slice(1).map((v, i) => i === unrealizedData.length - 2 ? 5 : 0)],
            pointBackgroundColor: unrealizedColor,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension: 0,
            spanGaps: false,
          } as never] : []),
        ],
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
              title: (items) => {
                const idx = items[0].dataIndex;
                const p = points[idx];
                return p?.ticker ? `${p.date} · ${p.ticker}` : p?.date ?? "";
              },
              label: (c) => {
                const v: number = c.parsed.y ?? 0;
                if (c.datasetIndex === 1) {
                  return [
                    ` Realized: ₹${cum >= 0 ? "+" : ""}${cum.toLocaleString("en-IN")}`,
                    ` Unrealized: ${(liveUnrealizedPnl ?? 0) >= 0 ? "+" : "−"}₹${Math.abs(liveUnrealizedPnl ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                    ` Total: ₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN")}`,
                  ];
                }
                return ` Realized: ₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN")}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#d1d5db", font: { size: 9 }, maxTicksLimit: 8, maxRotation: 0 },
            grid: { color: "#f3f4f6" },
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
  }, [trades, liveUnrealizedPnl]);

  const openTrades = trades.filter((t) => t.status === "Open");

  if (!trades.filter((t) => t.status === "Closed").length && !openTrades.length)
    return <div className="h-64 flex items-center justify-center"><p className="text-gray-200 text-xs">No closed trades yet</p></div>;

  const upnl = liveUnrealizedPnl;
  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div>
      <div className="h-64"><canvas ref={canvasRef} /></div>
      {openTrades.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-[11px] flex-wrap">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2.5 h-2 rounded-sm bg-emerald-500 inline-block" />
            Realized
          </span>
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="inline-flex gap-0.5">
              <span className="w-1.5 h-2 rounded-sm bg-blue-500 inline-block" />
              <span className="w-1 h-2 inline-block" />
              <span className="w-1.5 h-2 rounded-sm bg-blue-500 inline-block" />
            </span>
            With unrealized
          </span>
          <span className="text-gray-400">{openTrades.length} open · {openTrades.map((t) => t.ticker).join(", ")}</span>
          {upnl !== null ? (
            <span className={`ml-auto font-semibold ${upnl > 0 ? "text-blue-600" : upnl < 0 ? "text-red-500" : "text-gray-400"}`}>
              {upnl > 0 ? "+" : upnl < 0 ? "−" : ""}{upnl !== 0 ? fmt(upnl) : "—"} unrealized
            </span>
          ) : (
            <span className="ml-auto text-gray-300 text-[10px]">fetching live prices…</span>
          )}
        </div>
      )}
    </div>
  );
}

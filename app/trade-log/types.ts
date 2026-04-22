export type TradeDirection = "Long" | "Short";
export type TradeStatus = "Open" | "Closed";

// A single buy/add leg
export interface EntryLeg {
  id: string;
  date: string;       // YYYY-MM-DD
  price: number;
  shares: number;
  notes?: string;
}

// A single sell/exit leg
export interface ExitLeg {
  id: string;
  date: string;       // YYYY-MM-DD
  price: number;
  shares: number;
  notes?: string;
}

export interface Trade {
  id: string;
  ticker: string;
  direction: TradeDirection;
  status: TradeStatus;
  setup: string;            // VCP, Breakout, Pullback, etc.
  stopLoss: number;         // initial stop loss price
  entries: EntryLeg[];      // one or more staggered entry lots
  exits: ExitLeg[];         // one or more staggered exit lots

  // Computed / cached fields (recalculated on save)
  avgEntry: number;         // weighted avg entry price
  avgExit: number;          // weighted avg exit price (0 if still open)
  totalShares: number;      // total shares entered
  exitedShares: number;     // total shares exited so far
  openShares: number;       // totalShares - exitedShares
  realizedPnl: number;      // P&L on exited portion
  unrealizedPnl: number;    // not tracked — left 0 (no live price feed)
  pnlPct: number;           // % based on avg entry
  rMultiple: number;        // realizedPnl / (avgEntry - stopLoss) / totalShares

  notes?: string;           // overall trade notes
  tags?: string;
  grade?: string;           // A+, A, B, C, D
  yahooTicker?: string;     // override for Yahoo Finance symbol (e.g. futures: NIFTY25APRFUT.NS)

  // Derived dates
  firstEntryDate: string;
  lastExitDate?: string;
}

// Helper: recompute all derived fields from legs
export function computeTrade(t: Trade): Trade {
  const entries = t.entries ?? [];
  const exits = t.exits ?? [];

  const totalShares = entries.reduce((s, e) => s + e.shares, 0);
  const totalCost = entries.reduce((s, e) => s + e.price * e.shares, 0);
  const avgEntry = totalShares > 0 ? totalCost / totalShares : 0;

  const exitedShares = exits.reduce((s, e) => s + e.shares, 0);
  const exitedProceeds = exits.reduce((s, e) => s + e.price * e.shares, 0);
  const avgExit = exitedShares > 0 ? exitedProceeds / exitedShares : 0;

  const openShares = Math.max(totalShares - exitedShares, 0);

  let realizedPnl = 0;
  if (exitedShares > 0 && avgEntry > 0) {
    realizedPnl = t.direction === "Long"
      ? (avgExit - avgEntry) * exitedShares
      : (avgEntry - avgExit) * exitedShares;
  }

  const pnlPct = avgEntry > 0 && avgExit > 0
    ? t.direction === "Long"
      ? ((avgExit - avgEntry) / avgEntry) * 100
      : ((avgEntry - avgExit) / avgEntry) * 100
    : 0;

  const riskPerShare = Math.abs(avgEntry - t.stopLoss);
  const totalRisk = riskPerShare * totalShares;
  const rMultiple = totalRisk > 0 ? realizedPnl / totalRisk : 0;

  const firstEntryDate = entries.length > 0
    ? entries.slice().sort((a, b) => a.date.localeCompare(b.date))[0].date
    : t.firstEntryDate ?? "";

  const sortedExits = exits.slice().sort((a, b) => b.date.localeCompare(a.date));
  const lastExitDate = sortedExits[0]?.date;

  // Auto-close if all shares exited
  const status: TradeStatus = openShares === 0 && totalShares > 0 ? "Closed" : t.status;

  return {
    ...t,
    avgEntry: parseFloat(avgEntry.toFixed(2)),
    avgExit: parseFloat(avgExit.toFixed(2)),
    totalShares,
    exitedShares,
    openShares,
    realizedPnl: parseFloat(realizedPnl.toFixed(2)),
    unrealizedPnl: 0,
    pnlPct: parseFloat(pnlPct.toFixed(2)),
    rMultiple: parseFloat(rMultiple.toFixed(2)),
    firstEntryDate,
    lastExitDate,
    status,
  };
}

export type TradeDirection = "Long" | "Short";
export type TradeStatus = "Open" | "Closed";

export interface Trade {
  id: string;
  date: string;           // entry date YYYY-MM-DD
  exitDate?: string;      // exit date YYYY-MM-DD
  ticker: string;
  direction: TradeDirection;
  status: TradeStatus;
  setup: string;          // VCP, Breakout, Pullback, etc.
  entry: number;
  exit?: number;
  stopLoss: number;
  shares: number;
  pnl: number;            // in rupees / dollars
  pnlPct: number;         // % gain/loss
  rMultiple: number;      // R multiple
  notes?: string;
  tags?: string;          // comma separated
  grade?: string;         // A, B, C, D
}

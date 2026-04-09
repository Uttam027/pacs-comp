import { NextRequest, NextResponse } from "next/server";

// Fetches live quote from Yahoo Finance unofficial JSON API.
// Called server-side to avoid CORS. Supports NSE (.NS) and BSE (.BO) suffixes.
// Usage: GET /api/trade-log/quote?ticker=RELIANCE.NS
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 }, // cache 60s
    });

    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error("No data from Yahoo");

    const price: number = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose: number = meta.previousClose ?? meta.chartPreviousClose;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const currency: string = meta.currency ?? "INR";
    const marketState: string = meta.marketState ?? "CLOSED";

    return NextResponse.json({ ticker, price, prevClose, change, changePct, currency, marketState });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Trade } from "@/app/trade-log/types";

const TRADES_KEY = "trade-log-v2";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function getTrades(): Promise<Trade[]> {
  const data = await redis.get<Trade[]>(TRADES_KEY);
  return data ?? [];
}

// GET all trades
export async function GET() {
  try {
    const trades = await getTrades();
    return NextResponse.json(trades);
  } catch {
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}

// POST — add a new trade
export async function POST(req: NextRequest) {
  try {
    const trade: Trade = await req.json();
    const trades = await getTrades();
    trades.push(trade);
    await redis.set(TRADES_KEY, trades);
    return NextResponse.json(trade, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save trade" }, { status: 500 });
  }
}

// PUT — update an existing trade by id
export async function PUT(req: NextRequest) {
  try {
    const trade: Trade = await req.json();
    const trades = await getTrades();
    const idx = trades.findIndex((t) => t.id === trade.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    trades[idx] = trade;
    await redis.set(TRADES_KEY, trades);
    return NextResponse.json(trade);
  } catch {
    return NextResponse.json({ error: "Failed to update trade" }, { status: 500 });
  }
}

// DELETE — remove a trade by id (passed as ?id=xxx)
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const trades = await getTrades();
    const filtered = trades.filter((t) => t.id !== id);
    await redis.set(TRADES_KEY, filtered);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete trade" }, { status: 500 });
  }
}

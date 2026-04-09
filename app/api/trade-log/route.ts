import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Trade } from "@/app/trade-log/types";

const TRADES_KEY = "trade-log-v2";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(`Missing Redis env vars. URL=${!!url} TOKEN=${!!token}`);
  }
  return new Redis({ url, token });
}

async function getTrades(): Promise<Trade[]> {
  const data = await getRedis().get<Trade[]>(TRADES_KEY);
  return data ?? [];
}

export async function GET() {
  try {
    const trades = await getTrades();
    return NextResponse.json(trades);
  } catch (e) {
    console.error("[trade-log GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const trade: Trade = await req.json();
    const redis = getRedis();
    const trades = await redis.get<Trade[]>(TRADES_KEY) ?? [];
    trades.push(trade);
    await redis.set(TRADES_KEY, trades);
    return NextResponse.json(trade, { status: 201 });
  } catch (e) {
    console.error("[trade-log POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const trade: Trade = await req.json();
    const redis = getRedis();
    const trades = await redis.get<Trade[]>(TRADES_KEY) ?? [];
    const idx = trades.findIndex((t) => t.id === trade.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    trades[idx] = trade;
    await redis.set(TRADES_KEY, trades);
    return NextResponse.json(trade);
  } catch (e) {
    console.error("[trade-log PUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const redis = getRedis();
    const trades = await redis.get<Trade[]>(TRADES_KEY) ?? [];
    await redis.set(TRADES_KEY, trades.filter((t) => t.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[trade-log DELETE]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

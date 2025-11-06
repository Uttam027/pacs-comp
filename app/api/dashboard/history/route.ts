import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const HISTORY_KEY = 'dashboard-history';

// Initialize Redis client (will use environment variables)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// GET endpoint - fetch historical data
export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { data: null, warning: 'Database not configured' },
        { status: 200 }
      );
    }

    const history = await redis.get(HISTORY_KEY);

    if (!history) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}

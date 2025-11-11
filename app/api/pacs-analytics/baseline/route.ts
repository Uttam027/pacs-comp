import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const BASELINE_KEY = 'pacs-analytics-baseline';
const BASELINE_TTL = 90 * 24 * 60 * 60; // 90 days in seconds

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// GET endpoint - fetch baseline pattern data
export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { data: null, warning: 'Database not configured' },
        { status: 200 }
      );
    }

    const data = await redis.get(BASELINE_KEY);

    if (!data) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching baseline data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch baseline data' },
      { status: 500 }
    );
  }
}

// POST endpoint - save baseline pattern data
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the data structure
    if (!body.patterns || !body.districts || !body.setupDate) {
      return NextResponse.json(
        { error: 'Invalid baseline data structure' },
        { status: 400 }
      );
    }

    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Save baseline data with TTL (90 days)
    await redis.set(BASELINE_KEY, body, { ex: BASELINE_TTL });

    return NextResponse.json(
      { message: 'Baseline saved successfully', data: body },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving baseline data:', error);
    return NextResponse.json(
      { error: 'Failed to save baseline data' },
      { status: 500 }
    );
  }
}

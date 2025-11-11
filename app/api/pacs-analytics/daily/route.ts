import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const DAILY_KEY_PREFIX = 'pacs-analytics-daily';
const DAILY_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const MAX_DAILY_SNAPSHOTS = 30;

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// GET endpoint - fetch daily snapshots
export async function GET(request: Request) {
  try {
    if (!redis) {
      return NextResponse.json(
        { data: null, warning: 'Database not configured' },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      // Fetch specific date snapshot
      const key = `${DAILY_KEY_PREFIX}:${date}`;
      const data = await redis.get(key);
      return NextResponse.json({ data }, { status: 200 });
    } else {
      // Fetch all daily snapshots
      const keys = await redis.keys(`${DAILY_KEY_PREFIX}:*`);

      if (!keys || keys.length === 0) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }

      // Get all snapshots
      const snapshots = await Promise.all(
        keys.map(async (key) => {
          const data = await redis.get(key);
          return { date: key.replace(`${DAILY_KEY_PREFIX}:`, ''), data };
        })
      );

      // Sort by date (most recent first)
      snapshots.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      return NextResponse.json({ data: snapshots }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching daily data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily data' },
      { status: 500 }
    );
  }
}

// POST endpoint - save daily snapshot
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the data structure
    if (!body.date || !body.snapshot) {
      return NextResponse.json(
        { error: 'Invalid daily data structure' },
        { status: 400 }
      );
    }

    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const key = `${DAILY_KEY_PREFIX}:${body.date}`;

    // Save daily snapshot with TTL (30 days)
    await redis.set(key, body.snapshot, { ex: DAILY_TTL });

    // Clean up old snapshots (keep only last 30)
    const keys = await redis.keys(`${DAILY_KEY_PREFIX}:*`);

    if (keys && keys.length > MAX_DAILY_SNAPSHOTS) {
      // Get all snapshots with dates
      const snapshots = await Promise.all(
        keys.map(async (k) => {
          return { key: k, date: k.replace(`${DAILY_KEY_PREFIX}:`, '') };
        })
      );

      // Sort by date (oldest first)
      snapshots.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // Delete oldest ones
      const toDelete = snapshots.slice(0, snapshots.length - MAX_DAILY_SNAPSHOTS);
      await Promise.all(toDelete.map(s => redis.del(s.key)));
    }

    return NextResponse.json(
      { message: 'Daily snapshot saved successfully', data: body },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving daily data:', error);
    return NextResponse.json(
      { error: 'Failed to save daily data' },
      { status: 500 }
    );
  }
}

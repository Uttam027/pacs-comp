import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const DASHBOARD_KEY = 'dashboard-data';
const HISTORY_KEY = 'dashboard-history';
const MAX_HISTORY_DAYS = 30;

// Initialize Redis client (will use environment variables)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// GET endpoint - fetch dashboard data
export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { data: null, warning: 'Database not configured' },
        { status: 200 }
      );
    }

    const data = await redis.get(DASHBOARD_KEY);

    if (!data) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST endpoint - save dashboard data
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the data structure
    if (!body.reportDate || !body.districts || !body.totals) {
      return NextResponse.json(
        { error: 'Invalid data structure' },
        { status: 400 }
      );
    }

    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Save current data
    await redis.set(DASHBOARD_KEY, body);

    // Save to history with date as key
    const dateKey = body.reportDate.replace(/\./g, '-'); // Convert 04.11.2025 to 04-11-2025

    // Get existing history
    const history = await redis.get(HISTORY_KEY) || {};

    // Add new entry
    (history as any)[dateKey] = {
      districts: body.districts,
      totals: body.totals,
      timestamp: new Date().toISOString()
    };

    // Keep only last 30 days
    const historyEntries = Object.entries(history as any);
    if (historyEntries.length > MAX_HISTORY_DAYS) {
      // Sort by date and keep only recent ones
      const sortedEntries = historyEntries.sort((a, b) => {
        const dateA = new Date(a[0].split('-').reverse().join('-'));
        const dateB = new Date(b[0].split('-').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });

      const recentHistory = Object.fromEntries(sortedEntries.slice(0, MAX_HISTORY_DAYS));
      await redis.set(HISTORY_KEY, recentHistory);
    } else {
      await redis.set(HISTORY_KEY, history);
    }

    return NextResponse.json(
      { message: 'Data saved successfully', data: body },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    );
  }
}

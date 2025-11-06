"use client";
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type District = {
  name: string;
  pacsAlloted: number;
  dctCompleted: number;
  golive: number;
  onSystemAudit: number;
  hoc: number;
  handholding: number;
  epacs: number;
  dynamicDayEnd: number;
};

type HistoryData = {
  [date: string]: {
    districts: District[];
    totals: any;
    timestamp: string;
  };
};

type DistrictProgress = {
  name: string;
  change: number;
  oldValue: number;
  newValue: number;
  percentage: number;
};

export default function TrackChangePage() {
  const [history, setHistory] = useState<HistoryData>({});
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'golive' | 'epacs' | 'dynamicDayEnd'>('golive');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/dashboard/history');
      const result = await response.json();
      setHistory(result.data || {});
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (days: number): { top: DistrictProgress[], bottom: DistrictProgress[], fromDate: string, toDate: string } => {
    const dates = Object.keys(history).sort((a, b) => {
      const dateA = new Date(a.split('-').reverse().join('-'));
      const dateB = new Date(b.split('-').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });

    if (dates.length < 2) {
      return { top: [], bottom: [], fromDate: '', toDate: '' };
    }

    const latestDate = dates[0];
    const compareDate = dates[Math.min(days, dates.length - 1)];

    const latestData = history[latestDate];
    const compareData = history[compareDate];

    if (!latestData || !compareData) {
      return { top: [], bottom: [], fromDate: '', toDate: '' };
    }

    const progress: DistrictProgress[] = [];

    latestData.districts.forEach((latestDistrict) => {
      const compareDistrict = compareData.districts.find(d => d.name === latestDistrict.name);
      if (compareDistrict) {
        const oldValue = compareDistrict[selectedMetric];
        const newValue = latestDistrict[selectedMetric];
        const change = newValue - oldValue;
        const percentage = oldValue > 0 ? ((change / oldValue) * 100) : 0;

        progress.push({
          name: latestDistrict.name,
          change,
          oldValue,
          newValue,
          percentage
        });
      }
    });

    progress.sort((a, b) => b.change - a.change);

    // Convert dates back to DD.MM.YYYY format
    const fromDateFormatted = compareDate.split('-').join('.');
    const toDateFormatted = latestDate.split('-').join('.');

    return {
      top: progress.slice(0, 5),
      bottom: progress.slice(-5).reverse(),
      fromDate: fromDateFormatted,
      toDate: toDateFormatted
    };
  };

  const metrics = [
    { key: 'golive' as const, label: 'Go Live' },
    { key: 'epacs' as const, label: 'E-PACS' },
    { key: 'dynamicDayEnd' as const, label: 'Day End' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  const dates = Object.keys(history);
  if (dates.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <h1 className="text-2xl font-light text-gray-900 mb-4">Progress Tracker</h1>
            <p className="text-gray-600 mb-4">Not enough data to show progress.</p>
            <p className="text-sm text-gray-500">Upload at least 2 PDF reports on different dates to track progress.</p>
          </div>
        </div>
      </div>
    );
  }

  const dailyProgress = calculateProgress(1);
  const weeklyProgress = calculateProgress(7);
  const currentProgress = viewMode === 'daily' ? dailyProgress : weeklyProgress;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-light text-gray-900">Progress Tracker</h1>
          <p className="text-gray-600 mt-2">Track district-wise improvements over time</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  viewMode === 'daily'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Day-to-Day
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  viewMode === 'weekly'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                7-Day Change
              </button>
            </div>

            {/* Metric Selector */}
            <div className="flex gap-2 flex-wrap">
              {metrics.map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedMetric === metric.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-sm border border-green-100">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-medium text-gray-900">
                Top 5 Performers
              </h2>
            </div>
            {currentProgress.fromDate && currentProgress.toDate && (
              <p className="text-sm text-gray-600 ml-8">
                Comparing: <span className="font-medium">{currentProgress.fromDate}</span> → <span className="font-medium">{currentProgress.toDate}</span>
              </p>
            )}
          </div>
          <div className="space-y-3">
            {currentProgress.top.map((district, index) => (
              <div key={district.name} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{district.name}</div>
                    <div className="text-sm text-gray-500">
                      {district.oldValue} → {district.newValue}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium text-green-600">+{district.change}</div>
                  {district.percentage > 0 && (
                    <div className="text-xs text-green-600">+{district.percentage.toFixed(1)}%</div>
                  )}
                </div>
              </div>
            ))}
            {currentProgress.top.length === 0 && (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 shadow-sm border border-orange-100">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-medium text-gray-900">
                Bottom 5 Performers
              </h2>
            </div>
            {currentProgress.fromDate && currentProgress.toDate && (
              <p className="text-sm text-gray-600 ml-8">
                Comparing: <span className="font-medium">{currentProgress.fromDate}</span> → <span className="font-medium">{currentProgress.toDate}</span>
              </p>
            )}
          </div>
          <div className="space-y-3">
            {currentProgress.bottom.map((district, index) => (
              <div key={district.name} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{district.name}</div>
                    <div className="text-sm text-gray-500">
                      {district.oldValue} → {district.newValue}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-medium ${district.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {district.change >= 0 ? '+' : ''}{district.change}
                  </div>
                  {district.percentage !== 0 && (
                    <div className={`text-xs ${district.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {district.percentage >= 0 ? '+' : ''}{district.percentage.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
            {currentProgress.bottom.length === 0 && (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Upload PDF reports daily to track progress over time.
            Historical data is stored for the last 30 days.
          </p>
        </div>
      </div>
    </div>
  );
}

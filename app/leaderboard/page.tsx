"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Medal, Award, TrendingUp, Star, Crown, Zap, Target, CheckCircle } from 'lucide-react';

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

type DashboardData = {
  reportDate: string;
  districts: District[];
  totals: any;
};

type DistrictScore = {
  name: string;
  score: number;
  golivePercent: number;
  epacsPercent: number;
  dayEndPercent: number;
  overallPercent: number;
  rank: number;
  badge: 'gold' | 'silver' | 'bronze' | 'participant';
  achievements: string[];
};

const CompetitiveLeaderboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'overall' | 'golive' | 'epacs' | 'dayend'>('overall');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();
        if (result.data) {
          setDashboardData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const calculateDistrictScores = (): DistrictScore[] => {
    if (!dashboardData) return [];

    return dashboardData.districts.map(district => {
      const golivePercent = (district.golive / district.pacsAlloted) * 100;
      const epacsPercent = (district.epacs / district.pacsAlloted) * 100;
      const dayEndPercent = (district.dynamicDayEnd / district.pacsAlloted) * 100;

      // Weighted overall score: GoLive (40%), E-PACS (35%), Day-End (25%)
      const overallPercent = (golivePercent * 0.4) + (epacsPercent * 0.35) + (dayEndPercent * 0.25);

      const achievements: string[] = [];

      // Achievement badges
      if (golivePercent === 100) achievements.push('100% Go-Live');
      if (epacsPercent === 100) achievements.push('100% E-PACS');
      if (dayEndPercent === 100) achievements.push('100% Day-End');
      if (golivePercent >= 90) achievements.push('Go-Live Champion');
      if (epacsPercent >= 90) achievements.push('E-PACS Leader');
      if (dayEndPercent >= 50) achievements.push('Day-End Pioneer');
      if (overallPercent >= 80) achievements.push('Top Performer');
      if (district.golive > 200) achievements.push('200+ PACS Live');

      return {
        name: district.name,
        score: Math.round(overallPercent * 10), // Score out of 1000
        golivePercent,
        epacsPercent,
        dayEndPercent,
        overallPercent,
        rank: 0, // Will be set after sorting
        badge: 'participant',
        achievements
      };
    });
  };

  const getRankedDistricts = (): DistrictScore[] => {
    const scores = calculateDistrictScores();

    // Sort based on selected category
    let sorted = [...scores];

    switch (selectedCategory) {
      case 'golive':
        sorted.sort((a, b) => b.golivePercent - a.golivePercent);
        break;
      case 'epacs':
        sorted.sort((a, b) => b.epacsPercent - a.epacsPercent);
        break;
      case 'dayend':
        sorted.sort((a, b) => b.dayEndPercent - a.dayEndPercent);
        break;
      default:
        sorted.sort((a, b) => b.overallPercent - a.overallPercent);
    }

    // Assign ranks and badges
    sorted.forEach((district, index) => {
      district.rank = index + 1;
      if (index === 0) district.badge = 'gold';
      else if (index === 1) district.badge = 'silver';
      else if (index === 2) district.badge = 'bronze';
      else district.badge = 'participant';
    });

    return sorted;
  };

  const filteredDistricts = getRankedDistricts().filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'gold': return <Crown className="w-5 h-5 text-yellow-600" />;
      case 'silver': return <Medal className="w-5 h-5 text-gray-600" />;
      case 'bronze': return <Award className="w-5 h-5 text-orange-600" />;
      default: return <Star className="w-5 h-5 text-blue-600" />;
    }
  };

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  const topThree = filteredDistricts.slice(0, 3);
  const restOfDistricts = filteredDistricts.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  <h1 className="text-3xl font-bold text-gray-900">District Leaderboard</h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">Competitive rankings • Updated {dashboardData.reportDate}</p>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('overall')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 'overall'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trophy size={16} />
                Overall Score
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory('golive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 'golive'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap size={16} />
                Go Live
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory('epacs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 'epacs'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target size={16} />
                E-PACS
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory('dayend')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 'dayend'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                Dynamic Day-End
              </div>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search districts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Podium - Top 3 */}
        {topThree.length >= 3 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Top Performers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* 2nd Place */}
              <div className="order-2 md:order-1">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-lg border-2 border-gray-300 text-center transform md:translate-y-8">
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                      <Medal className="w-8 h-8 text-gray-700" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-700 mb-2">2</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{topThree[1].name}</h3>
                  <div className="text-2xl font-bold text-gray-800 mb-1">
                    {selectedCategory === 'overall' && `${topThree[1].score} pts`}
                    {selectedCategory === 'golive' && `${topThree[1].golivePercent.toFixed(1)}%`}
                    {selectedCategory === 'epacs' && `${topThree[1].epacsPercent.toFixed(1)}%`}
                    {selectedCategory === 'dayend' && `${topThree[1].dayEndPercent.toFixed(1)}%`}
                  </div>
                  <div className="text-xs text-gray-600">
                    {topThree[1].achievements.slice(0, 2).join(' • ')}
                  </div>
                </div>
              </div>

              {/* 1st Place */}
              <div className="order-1 md:order-2">
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl p-8 shadow-xl border-4 border-yellow-400 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                      <Crown className="w-10 h-10 text-yellow-800" />
                    </div>
                  </div>
                  <div className="text-5xl font-bold text-yellow-700 mb-2">1</div>
                  <h3 className="font-bold text-xl text-gray-900 mb-3">{topThree[0].name}</h3>
                  <div className="text-3xl font-bold text-yellow-800 mb-2">
                    {selectedCategory === 'overall' && `${topThree[0].score} pts`}
                    {selectedCategory === 'golive' && `${topThree[0].golivePercent.toFixed(1)}%`}
                    {selectedCategory === 'epacs' && `${topThree[0].epacsPercent.toFixed(1)}%`}
                    {selectedCategory === 'dayend' && `${topThree[0].dayEndPercent.toFixed(1)}%`}
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center mt-3">
                    {topThree[0].achievements.slice(0, 3).map((achievement, idx) => (
                      <span key={idx} className="text-xs bg-yellow-300 text-yellow-900 px-2 py-1 rounded-full">
                        {achievement}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="order-3">
                <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-6 shadow-lg border-2 border-orange-300 text-center transform md:translate-y-8">
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-orange-300 rounded-full flex items-center justify-center">
                      <Award className="w-8 h-8 text-orange-700" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-orange-700 mb-2">3</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{topThree[2].name}</h3>
                  <div className="text-2xl font-bold text-orange-800 mb-1">
                    {selectedCategory === 'overall' && `${topThree[2].score} pts`}
                    {selectedCategory === 'golive' && `${topThree[2].golivePercent.toFixed(1)}%`}
                    {selectedCategory === 'epacs' && `${topThree[2].epacsPercent.toFixed(1)}%`}
                    {selectedCategory === 'dayend' && `${topThree[2].dayEndPercent.toFixed(1)}%`}
                  </div>
                  <div className="text-xs text-gray-600">
                    {topThree[2].achievements.slice(0, 2).join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Rankings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Full Rankings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">District</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Score</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Go Live</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">E-PACS</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Day-End</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Achievements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDistricts.map((district, index) => (
                  <tr
                    key={district.name}
                    className={`hover:bg-gray-50 transition ${
                      district.rank <= 3 ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{district.rank}</span>
                        {district.rank <= 3 && getBadgeIcon(district.badge)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{district.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-purple-600">{district.score}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-green-600">{district.golivePercent.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-pink-600">{district.epacsPercent.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-cyan-600">{district.dayEndPercent.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {district.achievements.slice(0, 2).map((achievement, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {achievement}
                          </span>
                        ))}
                        {district.achievements.length > 2 && (
                          <span className="text-xs text-gray-500">+{district.achievements.length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitiveLeaderboard;

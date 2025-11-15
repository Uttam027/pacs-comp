"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Medal, Award, TrendingUp, Star, Crown, Zap, Target, CheckCircle, TrendingDown } from 'lucide-react';

type DistrictStats = {
  district: string;
  total: number;
  dynamicT7: number;
  dynamicT1: number;
  consistentPACS: number;
  newPACS: number;
  droppedPACS: number;
};

type DistrictScore = {
  name: string;
  score: number;
  t7Percent: number;
  t1Percent: number;
  consistentPercent: number;
  newPACS: number;
  droppedPACS: number;
  total: number;
  rank: number;
  badge: 'gold' | 'silver' | 'bronze' | 'participant';
  achievements: string[];
  performanceGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
};

const CompetitiveLeaderboard = () => {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<'overall' | 't7' | 't1' | 'consistent' | 'new' | 'dropped'>('overall');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/pacs-analytics/daily');
        const result = await response.json();

        if (result.data && result.data.length > 0) {
          const latest = result.data[0];
          if (latest && latest.data && latest.data.results) {
            setAnalysisData(latest.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch PACS analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calculateDistrictStats = (): DistrictStats[] => {
    if (!analysisData || !analysisData.results) return [];

    const districtMap = new Map<string, DistrictStats>();

    analysisData.results.forEach((pacs: any) => {
      const district = pacs.district;
      if (!districtMap.has(district)) {
        districtMap.set(district, {
          district,
          total: 0,
          dynamicT7: 0,
          dynamicT1: 0,
          consistentPACS: 0,
          newPACS: 0,
          droppedPACS: 0
        });
      }

      const stats = districtMap.get(district)!;
      stats.total++;

      if (pacs.isDynamicT7) stats.dynamicT7++;
      if (pacs.isDynamicT1) stats.dynamicT1++;

      if (pacs.category === 'Consistent PACS') stats.consistentPACS++;
      else if (pacs.category === 'New PACS') stats.newPACS++;
      else if (pacs.category === 'Dropped PACS') stats.droppedPACS++;
    });

    return Array.from(districtMap.values());
  };

  const calculateDistrictScores = (): DistrictScore[] => {
    const stats = calculateDistrictStats();

    return stats.map(district => {
      const t7Percent = district.total > 0 ? (district.dynamicT7 / district.total) * 100 : 0;
      const t1Percent = district.total > 0 ? (district.dynamicT1 / district.total) * 100 : 0;
      const consistentPercent = district.total > 0 ? (district.consistentPACS / district.total) * 100 : 0;
      const droppedPercent = district.total > 0 ? (district.droppedPACS / district.total) * 100 : 0;

      // Scoring formula:
      // T-7: 35% weight (higher is better)
      // T-1: 30% weight (higher is better)
      // Consistent: 25% weight (higher is better)
      // Dropped: -20% weight (lower is better, so we penalize)
      // New: +5% bonus (positive indicator)

      const baseScore = (t7Percent * 0.35) + (t1Percent * 0.30) + (consistentPercent * 0.25);
      const droppedPenalty = droppedPercent * 0.20;
      const newBonus = district.total > 0 ? (district.newPACS / district.total) * 5 : 0;

      const overallScore = Math.max(0, baseScore - droppedPenalty + newBonus);

      const achievements: string[] = [];

      // Achievement badges
      if (t7Percent >= 95) achievements.push('🏆 T-7 Champion');
      else if (t7Percent >= 85) achievements.push('⭐ T-7 Leader');

      if (t1Percent >= 95) achievements.push('🎯 T-1 Champion');
      else if (t1Percent >= 85) achievements.push('💫 T-1 Leader');

      if (consistentPercent >= 80) achievements.push('🔥 Consistency Master');
      else if (consistentPercent >= 60) achievements.push('✨ Highly Consistent');

      if (droppedPercent === 0 && district.total > 20) achievements.push('💎 Zero Drops');
      else if (droppedPercent < 5) achievements.push('🛡️ Low Dropout');

      if (district.newPACS >= 10) achievements.push('🚀 Growth Leader');
      else if (district.newPACS >= 5) achievements.push('📈 Growing');

      if (overallScore >= 90) achievements.push('👑 Elite Performer');
      else if (overallScore >= 75) achievements.push('⚡ Top Performer');

      // Performance grade
      let performanceGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
      if (overallScore >= 90) performanceGrade = 'A+';
      else if (overallScore >= 80) performanceGrade = 'A';
      else if (overallScore >= 70) performanceGrade = 'B+';
      else if (overallScore >= 60) performanceGrade = 'B';
      else if (overallScore >= 50) performanceGrade = 'C';
      else performanceGrade = 'D';

      return {
        name: district.district,
        score: Math.round(overallScore * 10),
        t7Percent,
        t1Percent,
        consistentPercent,
        newPACS: district.newPACS,
        droppedPACS: district.droppedPACS,
        total: district.total,
        rank: 0,
        badge: 'participant',
        achievements,
        performanceGrade
      };
    });
  };

  const getRankedDistricts = (): DistrictScore[] => {
    const scores = calculateDistrictScores();
    let sorted = [...scores];

    switch (selectedCategory) {
      case 't7':
        sorted.sort((a, b) => b.t7Percent - a.t7Percent);
        break;
      case 't1':
        sorted.sort((a, b) => b.t1Percent - a.t1Percent);
        break;
      case 'consistent':
        sorted.sort((a, b) => b.consistentPercent - a.consistentPercent);
        break;
      case 'new':
        sorted.sort((a, b) => b.newPACS - a.newPACS);
        break;
      case 'dropped':
        sorted.sort((a, b) => a.droppedPACS - b.droppedPACS); // Lower is better
        break;
      default:
        sorted.sort((a, b) => b.score - a.score);
    }

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

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'gold': return <Crown className="w-5 h-5 text-yellow-600" />;
      case 'silver': return <Medal className="w-5 h-5 text-gray-600" />;
      case 'bronze': return <Award className="w-5 h-5 text-orange-600" />;
      default: return <Star className="w-5 h-5 text-blue-600" />;
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A+') return 'bg-green-100 text-green-800 border-green-300';
    if (grade === 'A') return 'bg-green-50 text-green-700 border-green-200';
    if (grade === 'B+') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (grade === 'B') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-4">Please upload PACS analytics data first.</p>
          <Link href="/pacs-analytics" className="inline-block px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
            Go to PACS Analytics
          </Link>
        </div>
      </div>
    );
  }

  const topThree = filteredDistricts.slice(0, 3);

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
                  <h1 className="text-3xl font-bold text-gray-900">PACS Performance Leaderboard</h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">Based on T-7, T-1, Consistency & Growth Metrics</p>
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
              onClick={() => setSelectedCategory('t7')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 't7'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap size={16} />
                T-7 Performance
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory('t1')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 't1'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target size={16} />
                T-1 Performance
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory('consistent')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 'consistent'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                Consistency
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 'new'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} />
                New PACS
              </div>
            </button>
            <button
              onClick={() => setSelectedCategory('dropped')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === 'dropped'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingDown size={16} />
                Dropped (Less is Better)
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
                    {selectedCategory === 't7' && `${topThree[1].t7Percent.toFixed(1)}%`}
                    {selectedCategory === 't1' && `${topThree[1].t1Percent.toFixed(1)}%`}
                    {selectedCategory === 'consistent' && `${topThree[1].consistentPercent.toFixed(1)}%`}
                    {selectedCategory === 'new' && `${topThree[1].newPACS} PACS`}
                    {selectedCategory === 'dropped' && `${topThree[1].droppedPACS} PACS`}
                  </div>
                  <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold border-2 ${getGradeColor(topThree[1].performanceGrade)}`}>
                    Grade: {topThree[1].performanceGrade}
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
                    {selectedCategory === 't7' && `${topThree[0].t7Percent.toFixed(1)}%`}
                    {selectedCategory === 't1' && `${topThree[0].t1Percent.toFixed(1)}%`}
                    {selectedCategory === 'consistent' && `${topThree[0].consistentPercent.toFixed(1)}%`}
                    {selectedCategory === 'new' && `${topThree[0].newPACS} PACS`}
                    {selectedCategory === 'dropped' && `${topThree[0].droppedPACS} PACS`}
                  </div>
                  <div className={`inline-block mt-3 px-4 py-2 rounded-full text-base font-bold border-2 ${getGradeColor(topThree[0].performanceGrade)}`}>
                    Grade: {topThree[0].performanceGrade}
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
                    {selectedCategory === 't7' && `${topThree[2].t7Percent.toFixed(1)}%`}
                    {selectedCategory === 't1' && `${topThree[2].t1Percent.toFixed(1)}%`}
                    {selectedCategory === 'consistent' && `${topThree[2].consistentPercent.toFixed(1)}%`}
                    {selectedCategory === 'new' && `${topThree[2].newPACS} PACS`}
                    {selectedCategory === 'dropped' && `${topThree[2].droppedPACS} PACS`}
                  </div>
                  <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold border-2 ${getGradeColor(topThree[2].performanceGrade)}`}>
                    Grade: {topThree[2].performanceGrade}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Full Rankings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Scoring: T-7 (35%), T-1 (30%), Consistency (25%), Growth bonus (+5%), Dropped penalty (-20%)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">District</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Grade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Score</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">T-7</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">T-1</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Consistent</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">New</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Dropped</th>
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
                      <div className="text-xs text-gray-500">{district.total} total PACS</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${getGradeColor(district.performanceGrade)}`}>
                        {district.performanceGrade}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-purple-600">{district.score}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-green-600">{district.t7Percent.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-blue-600">{district.t1Percent.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-cyan-600">{district.consistentPercent.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-pink-600">{district.newPACS}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-red-600">{district.droppedPACS}</div>
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

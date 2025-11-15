"use client";
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Map, Network } from 'lucide-react';

// Dynamic imports for client-side only components
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

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

// Rajasthan district coordinates (approximate center points)
const districtCoordinates: { [key: string]: { lat: number; lng: number } } = {
  'AJMER': { lat: 26.4499, lng: 74.6399 },
  'ALWAR': { lat: 27.5530, lng: 76.6346 },
  'BANSWARA': { lat: 23.5471, lng: 74.4421 },
  'BARAN': { lat: 25.1000, lng: 76.5167 },
  'BARMER': { lat: 25.7500, lng: 71.3833 },
  'BHARATPUR': { lat: 27.2173, lng: 77.4900 },
  'BHILWARA': { lat: 25.3467, lng: 74.6406 },
  'BIKANER': { lat: 28.0229, lng: 73.3119 },
  'BUNDI': { lat: 25.4305, lng: 75.6499 },
  'CHITTORGARH': { lat: 24.8794, lng: 74.6291 },
  'CHURU': { lat: 28.2970, lng: 74.9647 },
  'DAUSA': { lat: 26.8938, lng: 76.5633 },
  'DHOLPUR': { lat: 26.7019, lng: 77.8934 },
  'DUNGARPUR': { lat: 23.8429, lng: 73.7144 },
  'GANGANAGAR': { lat: 29.9167, lng: 73.8833 },
  'HANUMANGARH': { lat: 29.5822, lng: 74.3220 },
  'JAIPUR': { lat: 26.9124, lng: 75.7873 },
  'JAISALMER': { lat: 26.9157, lng: 70.9083 },
  'JALORE': { lat: 25.3461, lng: 72.6156 },
  'JHALAWAR': { lat: 24.5979, lng: 76.1612 },
  'JHUNJHUNU': { lat: 28.1300, lng: 75.3980 },
  'JODHPUR': { lat: 26.2389, lng: 73.0243 },
  'KARAULI': { lat: 26.4984, lng: 77.0205 },
  'KOTA': { lat: 25.2138, lng: 75.8648 },
  'NAGAUR': { lat: 27.2020, lng: 73.7333 },
  'PALI': { lat: 25.7711, lng: 73.3234 },
  'PRATAPGARH': { lat: 24.0311, lng: 74.7789 },
  'RAJSAMAND': { lat: 25.0714, lng: 73.8800 },
  'SAWAI MADHOPUR': { lat: 26.0173, lng: 76.3493 },
  'SIKAR': { lat: 27.6119, lng: 75.1399 },
  'SIROHI': { lat: 24.8857, lng: 72.8581 },
  'TONK': { lat: 26.1544, lng: 75.7900 },
  'UDAIPUR': { lat: 24.5854, lng: 73.7125 }
};

const AdvancedVisualizations = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedView, setSelectedView] = useState<'map' | 'network'>('network');
  const [selectedMetric, setSelectedMetric] = useState<'golive' | 'epacs' | 'dynamicDayEnd'>('golive');
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const mapRef = useRef<any>(null);

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

  // Network graph data preparation
  const getNetworkData = () => {
    if (!dashboardData) return { nodes: [], links: [] };

    const nodes = dashboardData.districts.map(district => {
      const percentage = (district[selectedMetric] / district.pacsAlloted) * 100;
      return {
        id: district.name,
        name: district.name,
        value: district[selectedMetric],
        total: district.pacsAlloted,
        percentage,
        color: percentage >= 80 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444',
        size: Math.max(5, district.pacsAlloted / 10)
      };
    });

    // Create links between districts with similar performance (within 10% of each other)
    const links: any[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const diff = Math.abs(nodes[i].percentage - nodes[j].percentage);
        if (diff < 15) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: 1,
            distance: diff < 5 ? 50 : 100
          });
        }
      }
    }

    return { nodes, links };
  };

  const networkData = getNetworkData();

  // Map marker data
  const getMapMarkers = () => {
    if (!dashboardData) return [];

    return dashboardData.districts
      .map(district => {
        const coords = districtCoordinates[district.name];
        if (!coords) return null;

        const percentage = (district[selectedMetric] / district.pacsAlloted) * 100;
        return {
          ...district,
          ...coords,
          percentage,
          color: percentage >= 80 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'
        };
      })
      .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
  };

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading visualizations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-2xl font-light text-gray-900">Advanced Visualizations</h1>
                <p className="text-sm text-gray-500 mt-1">Interactive maps and network analysis</p>
              </div>
            </div>
          </div>

          {/* View Selector */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setSelectedView('network')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                selectedView === 'network'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Network size={16} />
              <span>Network Graph</span>
            </button>
            <button
              onClick={() => setSelectedView('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                selectedView === 'map'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Map size={16} />
              <span>Geospatial Map</span>
            </button>
          </div>

          {/* Metric Selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedMetric('golive')}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                selectedMetric === 'golive'
                  ? 'bg-green-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Go Live
            </button>
            <button
              onClick={() => setSelectedMetric('epacs')}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                selectedMetric === 'epacs'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              E-PACS
            </button>
            <button
              onClick={() => setSelectedMetric('dynamicDayEnd')}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                selectedMetric === 'dynamicDayEnd'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Dynamic Day-End
            </button>
          </div>
        </div>
      </div>

      {/* Visualization Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedView === 'network' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">District Performance Network</h2>
              <p className="text-sm text-gray-500 mt-1">
                Districts with similar performance levels are connected. Hover over nodes for details.
              </p>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600">High Performance (80%+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="text-xs text-gray-600">Medium Performance (50-80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-xs text-gray-600">Low Performance (&lt;50%)</span>
                </div>
              </div>
            </div>
            <div style={{ height: '700px', background: '#fafafa' }}>
              <ForceGraph2D
                graphData={networkData}
                nodeLabel={(node: any) => `
                  <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: system-ui;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">${node.name}</div>
                    <div style="font-size: 12px; color: #666;">
                      <div style="margin-bottom: 4px;"><strong>${selectedMetric === 'golive' ? 'Go Live' : selectedMetric === 'epacs' ? 'E-PACS' : 'Day-End'}:</strong> ${node.value} / ${node.total}</div>
                      <div><strong>Percentage:</strong> ${node.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                `}
                nodeColor={(node: any) => node.color}
                nodeVal={(node: any) => node.size}
                nodeRelSize={6}
                linkColor={() => '#cbd5e1'}
                linkWidth={1}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                onNodeHover={setHoveredNode}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                cooldownTime={3000}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
              />
            </div>
            {hoveredNode && (
              <div className="p-4 bg-blue-50 border-t border-blue-100">
                <div className="text-sm">
                  <span className="font-medium text-blue-900">{hoveredNode.name}</span>
                  <span className="text-blue-600 ml-2">
                    {hoveredNode.percentage.toFixed(1)}% ({hoveredNode.value}/{hoveredNode.total})
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Rajasthan Geospatial Distribution</h2>
              <p className="text-sm text-gray-500 mt-1">
                Geographic distribution of PACS performance across Rajasthan districts.
              </p>
            </div>
            <div style={{ height: '700px', position: 'relative' }}>
              <GeospatialMap markers={getMapMarkers()} metric={selectedMetric} />
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">High Performers</div>
            <div className="text-3xl font-light text-green-600">
              {networkData.nodes.filter(n => n.percentage >= 80).length}
            </div>
            <div className="text-xs text-gray-500 mt-2">Districts above 80%</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">Medium Performers</div>
            <div className="text-3xl font-light text-amber-600">
              {networkData.nodes.filter(n => n.percentage >= 50 && n.percentage < 80).length}
            </div>
            <div className="text-xs text-gray-500 mt-2">Districts 50-80%</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">Needs Attention</div>
            <div className="text-3xl font-light text-red-600">
              {networkData.nodes.filter(n => n.percentage < 50).length}
            </div>
            <div className="text-xs text-gray-500 mt-2">Districts below 50%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Geospatial Map Component
const GeospatialMap = dynamic(
  () => import('./GeospatialMapComponent').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">Loading map...</div>
        </div>
      </div>
    )
  }
);

export default AdvancedVisualizations;

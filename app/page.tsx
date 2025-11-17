"use client";
import React, { useState, useEffect, use } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload, TrendingUp, TrendingDown, Calendar, AlertCircle, Check, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

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

type Totals = Omit<District, 'name'>;

type DashboardData = {
  reportDate: string;
  districts: District[];
  totals: Totals;
};

type MetricKey = keyof Omit<District, 'name'>;
type ViewMode = MetricKey | 'table';

type HistoryData = {
  [date: string]: {
    districts: District[];
    totals: any;
    timestamp: string;
  };
};

type DistrictChange = {
  metric: 'golive' | 'epacs' | 'dynamicDayEnd';
  label: string;
  currentValue: number;
  dailyChange: number;
  weeklyChange: number;
  dailyFromDate: string;
  weeklyFromDate: string;
};

const PACSProgressDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<ViewMode>('golive');
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof District>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hasHistoricalData, setHasHistoricalData] = useState(false);
  const [history, setHistory] = useState<HistoryData>({});
  const [districtChanges, setDistrictChanges] = useState<DistrictChange[]>([]);

  const sampleData = {
    reportDate: '04.11.2025',
    districts: [
      { name: 'AJMER', pacsAlloted: 208, dctCompleted: 201, golive: 194, onSystemAudit: 88, hoc: 71, handholding: 177, epacs: 71, dynamicDayEnd: 13 },
      { name: 'ALWAR', pacsAlloted: 248, dctCompleted: 247, golive: 234, onSystemAudit: 64, hoc: 62, handholding: 182, epacs: 60, dynamicDayEnd: 52 },
      { name: 'BANSWARA', pacsAlloted: 226, dctCompleted: 191, golive: 164, onSystemAudit: 42, hoc: 40, handholding: 79, epacs: 40, dynamicDayEnd: 31 },
      { name: 'BARAN', pacsAlloted: 123, dctCompleted: 121, golive: 112, onSystemAudit: 54, hoc: 59, handholding: 50, epacs: 48, dynamicDayEnd: 14 },
      { name: 'BARMER', pacsAlloted: 397, dctCompleted: 336, golive: 232, onSystemAudit: 81, hoc: 15, handholding: 89, epacs: 13, dynamicDayEnd: 0 },
      { name: 'BHARATPUR', pacsAlloted: 282, dctCompleted: 191, golive: 147, onSystemAudit: 44, hoc: 31, handholding: 114, epacs: 26, dynamicDayEnd: 3 },
      { name: 'BHILWARA', pacsAlloted: 359, dctCompleted: 352, golive: 339, onSystemAudit: 65, hoc: 31, handholding: 85, epacs: 30, dynamicDayEnd: 9 },
      { name: 'BIKANER', pacsAlloted: 234, dctCompleted: 233, golive: 227, onSystemAudit: 62, hoc: 39, handholding: 67, epacs: 32, dynamicDayEnd: 10 },
      { name: 'BUNDI', pacsAlloted: 158, dctCompleted: 158, golive: 137, onSystemAudit: 70, hoc: 49, handholding: 113, epacs: 46, dynamicDayEnd: 9 },
      { name: 'CHITTORGARH', pacsAlloted: 320, dctCompleted: 316, golive: 308, onSystemAudit: 103, hoc: 51, handholding: 176, epacs: 50, dynamicDayEnd: 4 },
      { name: 'CHURU', pacsAlloted: 192, dctCompleted: 192, golive: 192, onSystemAudit: 69, hoc: 30, handholding: 30, epacs: 29, dynamicDayEnd: 2 },
      { name: 'DAUSA', pacsAlloted: 178, dctCompleted: 174, golive: 150, onSystemAudit: 82, hoc: 49, handholding: 140, epacs: 45, dynamicDayEnd: 45 },
      { name: 'DUNGARPUR', pacsAlloted: 134, dctCompleted: 101, golive: 92, onSystemAudit: 35, hoc: 26, handholding: 77, epacs: 23, dynamicDayEnd: 9 },
      { name: 'HANUMANGARH', pacsAlloted: 238, dctCompleted: 222, golive: 194, onSystemAudit: 46, hoc: 18, handholding: 81, epacs: 17, dynamicDayEnd: 0 },
      { name: 'JAIPUR', pacsAlloted: 377, dctCompleted: 365, golive: 356, onSystemAudit: 99, hoc: 57, handholding: 54, epacs: 54, dynamicDayEnd: 2 },
      { name: 'JAISALMER', pacsAlloted: 58, dctCompleted: 51, golive: 25, onSystemAudit: 5, hoc: 19, handholding: 22, epacs: 18, dynamicDayEnd: 0 },
      { name: 'JALORE', pacsAlloted: 187, dctCompleted: 159, golive: 156, onSystemAudit: 51, hoc: 31, handholding: 88, epacs: 28, dynamicDayEnd: 6 },
      { name: 'JHALAWAR', pacsAlloted: 212, dctCompleted: 212, golive: 212, onSystemAudit: 126, hoc: 68, handholding: 55, epacs: 63, dynamicDayEnd: 23 },
      { name: 'JHUNJHUNU', pacsAlloted: 268, dctCompleted: 245, golive: 236, onSystemAudit: 135, hoc: 57, handholding: 73, epacs: 55, dynamicDayEnd: 30 },
      { name: 'JODHPUR', pacsAlloted: 298, dctCompleted: 262, golive: 245, onSystemAudit: 111, hoc: 31, handholding: 229, epacs: 27, dynamicDayEnd: 1 },
      { name: 'KOTA', pacsAlloted: 161, dctCompleted: 157, golive: 131, onSystemAudit: 58, hoc: 50, handholding: 99, epacs: 47, dynamicDayEnd: 13 },
      { name: 'NAGAUR', pacsAlloted: 324, dctCompleted: 228, golive: 192, onSystemAudit: 51, hoc: 30, handholding: 56, epacs: 30, dynamicDayEnd: 29 },
      { name: 'PALI', pacsAlloted: 154, dctCompleted: 149, golive: 136, onSystemAudit: 88, hoc: 25, handholding: 92, epacs: 21, dynamicDayEnd: 1 },
      { name: 'SAWAI MADHOPUR', pacsAlloted: 221, dctCompleted: 219, golive: 209, onSystemAudit: 66, hoc: 53, handholding: 150, epacs: 51, dynamicDayEnd: 0 },
      { name: 'SIKAR', pacsAlloted: 262, dctCompleted: 261, golive: 259, onSystemAudit: 137, hoc: 34, handholding: 55, epacs: 35, dynamicDayEnd: 1 },
      { name: 'SIROHI', pacsAlloted: 81, dctCompleted: 76, golive: 66, onSystemAudit: 24, hoc: 18, handholding: 48, epacs: 17, dynamicDayEnd: 6 },
      { name: 'SRI GANGANAGAR', pacsAlloted: 334, dctCompleted: 308, golive: 278, onSystemAudit: 133, hoc: 46, handholding: 174, epacs: 41, dynamicDayEnd: 14 },
      { name: 'TONK', pacsAlloted: 209, dctCompleted: 185, golive: 184, onSystemAudit: 66, hoc: 39, handholding: 143, epacs: 38, dynamicDayEnd: 2 },
      { name: 'UDAIPUR', pacsAlloted: 338, dctCompleted: 329, golive: 326, onSystemAudit: 86, hoc: 63, handholding: 181, epacs: 59, dynamicDayEnd: 30 },
    ],
    totals: {
      pacsAlloted: 6781,
      dctCompleted: 6241,
      golive: 5733,
      onSystemAudit: 2141,
      hoc: 1192,
      handholding: 2979,
      epacs: 1114,
      dynamicDayEnd: 359
    }
  };

  const calculateDistrictChanges = (districtName: string) => {
    const dates = Object.keys(history).sort((a, b) => {
      const dateA = new Date(a.split('-').reverse().join('-'));
      const dateB = new Date(b.split('-').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });

    if (dates.length < 2) {
      setDistrictChanges([]);
      return;
    }

    const latestDate = dates[0];
    const dailyDate = dates[Math.min(1, dates.length - 1)];
    const weeklyDate = dates[Math.min(7, dates.length - 1)];

    const latestData = history[latestDate];
    const dailyData = history[dailyDate];
    const weeklyData = history[weeklyDate];

    if (!latestData || !dailyData || !weeklyData) {
      setDistrictChanges([]);
      return;
    }

    const latestDistrict = latestData.districts.find(d => d.name === districtName);
    const dailyDistrict = dailyData.districts.find(d => d.name === districtName);
    const weeklyDistrict = weeklyData.districts.find(d => d.name === districtName);

    if (!latestDistrict || !dailyDistrict || !weeklyDistrict) {
      setDistrictChanges([]);
      return;
    }

    const metrics: Array<{ metric: 'golive' | 'epacs' | 'dynamicDayEnd'; label: string }> = [
      { metric: 'golive', label: 'Go Live' },
      { metric: 'epacs', label: 'E-PACS' },
      { metric: 'dynamicDayEnd', label: 'Dynamic Day-End' }
    ];

    const changes: DistrictChange[] = metrics.map(({ metric, label }) => ({
      metric,
      label,
      currentValue: latestDistrict[metric],
      dailyChange: latestDistrict[metric] - dailyDistrict[metric],
      weeklyChange: latestDistrict[metric] - weeklyDistrict[metric],
      dailyFromDate: dailyDate.split('-').join('.'),
      weeklyFromDate: weeklyDate.split('-').join('.')
    }));

    setDistrictChanges(changes);
  };

  useEffect(() => {
    // Fetch data from API
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();

        if (result.data) {
          setDashboardData(result.data);
        } else {
          setDashboardData(sampleData);
        }

        // Check for historical data
        const historyResponse = await fetch('/api/dashboard/history');
        const historyResult = await historyResponse.json();
        const historyData = historyResult.data || {};
        setHistory(historyData);
        setHasHistoricalData(Object.keys(historyData).length >= 3);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setDashboardData(sampleData);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Calculate district changes when district is selected
    if (selectedDistrict && Object.keys(history).length > 0) {
      calculateDistrictChanges(selectedDistrict);
    }
  }, [selectedDistrict, history]);

  const parsePDFData = async (file: File) => {
    try {
      setLoading(true);
      setUploadStatus('Loading...');

      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      setUploadStatus('Reading...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      
      const textItems = textContent.items.map((item: any) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5]
      }));

      textItems.sort((a: any, b: any) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff < 5) return a.x - b.x;
        return b.y - a.y;
      });

      const rows: string[] = [];
      let currentRow: string[] = [];
      let lastY = textItems[0]?.y;

      textItems.forEach((item: any) => {
        if (Math.abs(item.y - lastY) > 5) {
          if (currentRow.length > 0) {
            rows.push(currentRow.join(' '));
          }
          currentRow = [item.text];
          lastY = item.y;
        } else {
          currentRow.push(item.text);
        }
      });
      if (currentRow.length > 0) {
        rows.push(currentRow.join(' '));
      }

      const dateMatch = rows.join(' ').match(/(\d{2}\.\d{2}\.\d{4})/);
      const reportDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-GB').replace(/\//g, '.');

      const districtNames = [
        'AJMER', 'ALWAR', 'BANSWARA', 'BARAN', 'BARMER', 'BHARATPUR', 'BHILWARA',
        'BIKANER', 'BUNDI', 'CHITTORGARH', 'CHURU', 'DAUSA', 'DUNGARPUR',
        'HANUMANGARH', 'JAIPUR', 'JAISALMER', 'JALORE', 'JHALAWAR', 'JHUNJHUNU',
        'JODHPUR', 'KOTA', 'NAGAUR', 'PALI', 'SAWAI MADHOPUR', 'SIKAR', 'SIROHI',
        'SRI GANGANAGAR', 'TONK', 'UDAIPUR'
      ];

      const districts: District[] = [];

      rows.forEach((row: string) => {
        for (const districtName of districtNames) {
          if (row.includes(districtName)) {
            const numbers = row.match(/-?\d+/g);
            if (numbers && numbers.length >= 8) { // Reduced threshold for flexibility
              const nums = numbers.map(n => parseInt(n));

              // Helper function to safely get value at index
              const getVal = (idx: number) => (nums[idx] !== undefined ? nums[idx] : 0);

              const districtData = {
                name: districtName,
                pacsAlloted: getVal(1),
                dctCompleted: getVal(3),
                golive: getVal(6),
                onSystemAudit: getVal(12),
                hoc: getVal(15),
                handholding: getVal(18),
                epacs: getVal(21),
                dynamicDayEnd: getVal(24)
              };

              console.log(`${districtName}: EPACS=${getVal(21)}, Array length=${numbers.length}`);
              console.log(`  Indices -> [1]:${getVal(1)} [3]:${getVal(3)} [6]:${getVal(6)} [12]:${getVal(12)} [15]:${getVal(15)} [18]:${getVal(18)} [21]:${getVal(21)} [24]:${getVal(24)}`);
              console.log(`  All numbers:`, nums);

              districts.push(districtData);
            } else {
              console.warn(`⚠️ ${districtName}: Not enough numbers (found ${numbers?.length || 0}, need ≥8)`);
              if (numbers) console.log(`   Available numbers:`, numbers);
            }
            break;
          }
        }
      });

      if (districts.length === 0) {
        throw new Error('No data found');
      }

      const totals = {
        pacsAlloted: districts.reduce((sum, d) => sum + d.pacsAlloted, 0),
        dctCompleted: districts.reduce((sum, d) => sum + d.dctCompleted, 0),
        golive: districts.reduce((sum, d) => sum + d.golive, 0),
        onSystemAudit: districts.reduce((sum, d) => sum + d.onSystemAudit, 0),
        hoc: districts.reduce((sum, d) => sum + d.hoc, 0),
        handholding: districts.reduce((sum, d) => sum + d.handholding, 0),
        epacs: districts.reduce((sum, d) => sum + d.epacs, 0),
        dynamicDayEnd: districts.reduce((sum, d) => sum + d.dynamicDayEnd, 0)
      };

      console.log(`\n📊 PARSING SUMMARY:`);
      console.log(`Districts parsed: ${districts.length}/29`);
      console.log(`Total EPACS calculated: ${totals.epacs}`);
      console.log(`Missing districts: ${29 - districts.length}`);

      const newData = { reportDate, districts, totals };
      setUploadStatus(`✓ Loaded ${districts.length} districts`);
      setDashboardData(newData);

      // Save to API (Vercel KV)
      try {
        const response = await fetch('/api/dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newData),
        });

        if (!response.ok) {
          console.error('Failed to save data to server');
          setUploadStatus('⚠ Data loaded but not saved to server');
        } else {
          setUploadStatus(`✓ Loaded ${districts.length} districts & saved to server`);
        }
      } catch (error) {
        console.error('Error saving to server:', error);
        setUploadStatus('⚠ Data loaded but not saved to server');
      }

      setTimeout(() => {
        setUploadStatus('');
        setLoading(false);
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      setUploadStatus('Error parsing PDF');
      setTimeout(() => {
        setUploadStatus('');
        setLoading(false);
      }, 3000);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      parsePDFData(file);
    }
    event.target.value = '';
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    setUploadStatus(`Processing ${files.length} files...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') {
        failCount++;
        continue;
      }

      try {
        setUploadStatus(`Processing ${i + 1}/${files.length}: ${file.name}`);
        await parsePDFData(file);
        successCount++;
        // Small delay between uploads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        failCount++;
      }
    }

    setUploadStatus(`✓ Uploaded ${successCount} files successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);

    setTimeout(() => {
      setUploadStatus('');
      setLoading(false);
      // Refresh the page to show latest data
      window.location.reload();
    }, 2000);

    event.target.value = '';
  };

  const getTopBottomDistricts = (metric: keyof Omit<District, 'name'>, count = 5) => {
    if (!dashboardData) return { top: [], bottom: [] };

    const sorted = [...dashboardData.districts].sort((a, b) => {
      const aPercentage = (a[metric] as number / a.pacsAlloted) * 100;
      const bPercentage = (b[metric] as number / b.pacsAlloted) * 100;
      return bPercentage - aPercentage;
    });

    return {
      top: sorted.slice(0, count).map(d => ({
        name: d.name,
        value: d[metric] as number,
        percentage: ((d[metric] as number / d.pacsAlloted) * 100).toFixed(1),
        total: d.pacsAlloted
      })),
      bottom: sorted.slice(-count).reverse().map(d => ({
        name: d.name,
        value: d[metric] as number,
        percentage: ((d[metric] as number / d.pacsAlloted) * 100).toFixed(1),
        total: d.pacsAlloted
      }))
    };
  };

  const getActionItems = () => {
    if (!dashboardData) return { dctToGolive: [], hocToEpacs: [], epacsToDayEnd: [], totals: { dctToGolive: 0, hocToEpacs: 0, epacsToDayEnd: 0 } };

    const dctToGolive = dashboardData.districts
      .filter(d => d.dctCompleted > d.golive)
      .map(d => ({ name: d.name, gap: d.dctCompleted - d.golive }))
      .sort((a, b) => b.gap - a.gap);

    const hocToEpacs = dashboardData.districts
      .filter(d => d.hoc > d.epacs)
      .map(d => ({ name: d.name, gap: d.hoc - d.epacs }))
      .sort((a, b) => b.gap - a.gap);

    const epacsToDayEnd = dashboardData.districts
      .filter(d => d.epacs > d.dynamicDayEnd)
      .map(d => ({ name: d.name, gap: d.epacs - d.dynamicDayEnd }))
      .sort((a, b) => b.gap - a.gap);

    const totals = {
      dctToGolive: dctToGolive.reduce((sum, item) => sum + item.gap, 0),
      hocToEpacs: hocToEpacs.reduce((sum, item) => sum + item.gap, 0),
      epacsToDayEnd: epacsToDayEnd.reduce((sum, item) => sum + item.gap, 0)
    };

    return { dctToGolive, hocToEpacs, epacsToDayEnd, totals };
  };

  const getDistrictAnalysis = (districtName: string | District) => {
    if (!dashboardData || !districtName) return null;

    const name = typeof districtName === 'string' ? districtName : districtName.name;
    const district = dashboardData.districts.find(d => d.name === name);
    if (!district) return null;

    const actions = [];

    if (district.dctCompleted > district.golive) {
      actions.push({
        stage: 'DCT → Go-Live',
        gap: district.dctCompleted - district.golive,
        message: `${district.dctCompleted - district.golive} PACS have DCT completed but not yet Go-Live`,
        color: 'amber'
      });
    }

    if (district.hoc > district.epacs) {
      actions.push({
        stage: 'HoC → E-PACS',
        gap: district.hoc - district.epacs,
        message: `${district.hoc - district.epacs} PACS have HoC completed but no E-PACS declaration`,
        color: 'purple'
      });
    }

    if (district.epacs > district.dynamicDayEnd) {
      actions.push({
        stage: 'E-PACS → Dynamic Day-End',
        gap: district.epacs - district.dynamicDayEnd,
        message: `${district.epacs - district.dynamicDayEnd} PACS have E-PACS but no dynamic day-end`,
        color: 'cyan'
      });
    }

    return { district, actions };
  };

  const handleSort = (column: keyof District) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedDistricts = () => {
    if (!dashboardData) return [];

    const sorted = [...dashboardData.districts].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'name') {
        return sortDirection === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  };

  const metrics: { key: ViewMode; label: string }[] = [
    { key: 'golive', label: 'Go Live' },
    { key: 'onSystemAudit', label: 'Audit' },
    { key: 'hoc', label: 'HoC' },
    { key: 'epacs', label: 'E-PACS' },
    { key: 'dynamicDayEnd', label: 'Dynamic Day-End' },
    { key: 'table', label: 'All Districts' }
  ];

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading</p>
        </div>
      </div>
    );
  }

  const { top, bottom } = getTopBottomDistricts(selectedMetric !== 'table' ? selectedMetric : 'golive');
  const actionItems = getActionItems();
  const totalActions = actionItems.totals.dctToGolive + actionItems.totals.hocToEpacs + actionItems.totals.epacsToDayEnd;
  const districtAnalysis = selectedDistrict ? getDistrictAnalysis(selectedDistrict) : null;
  const sortedDistricts = getSortedDistricts();

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl sm:text-4xl font-light text-gray-900">PACS Computerisation Progress (Rajasthan State) </h1>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={16} />
              <span>{dashboardData.reportDate}</span>
            </div>
            {(() => {
              // Parse report date (DD.MM.YYYY)
              const [day, month, year] = dashboardData.reportDate.split('.').map(Number);
              const reportDate = new Date(year, month - 1, day);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              reportDate.setHours(0, 0, 0, 0);

              const diffTime = today.getTime() - reportDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays > 0) {
                return (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600 font-medium">
                      Report is {diffDays} day{diffDays > 1 ? 's' : ''} old. Please upload latest data!
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <label className={`inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm rounded-full cursor-pointer hover:bg-gray-800 transition ${loading ? 'opacity-50' : ''}`}>
              <Upload size={16} />
              <span>{loading ? uploadStatus : 'Upload Report'}</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={loading} />
            </label>

            {!hasHistoricalData && (
              <label className={`inline-flex items-center gap-2 px-6 py-2.5 bg-purple-500 text-white text-sm rounded-full cursor-pointer hover:bg-purple-600 transition ${loading ? 'opacity-50' : ''}`}>
                <Upload size={16} />
                <span>Bulk Upload (7 Days)</span>
                <input type="file" accept=".pdf" multiple onChange={handleBulkUpload} className="hidden" disabled={loading} />
              </label>
            )}

            <Link href="/track-change" className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 transition">
              <BarChart3 size={16} />
              <span>Track Progress</span>
            </Link>

            <Link href="/pacs-analytics" className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white text-sm rounded-full hover:bg-emerald-600 transition">
              <Activity size={16} />
              <span>PACS Analytics</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-2">Total PACS</div>
            <div className="text-3xl font-light text-gray-900">{dashboardData.totals.pacsAlloted.toLocaleString()}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-2">Go Live</div>
            <div className="text-3xl font-light text-gray-900">{dashboardData.totals.golive.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{width: `${(dashboardData.totals.golive / dashboardData.totals.pacsAlloted) * 100}%`}}></div>
              </div>
              <span className="text-xs text-gray-500">{((dashboardData.totals.golive / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-2">Audits</div>
            <div className="text-3xl font-light text-gray-900">{dashboardData.totals.onSystemAudit.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{width: `${(dashboardData.totals.onSystemAudit / dashboardData.totals.pacsAlloted) * 100}%`}}></div>
              </div>
              <span className="text-xs text-gray-500">{((dashboardData.totals.onSystemAudit / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-2">E-PACS</div>
            <div className="text-3xl font-light text-gray-900">{dashboardData.totals.epacs.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{width: `${(dashboardData.totals.epacs / dashboardData.totals.pacsAlloted) * 100}%`}}></div>
              </div>
              <span className="text-xs text-gray-500">{((dashboardData.totals.epacs / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-4">Select Metric or District</div>
          <div className="flex flex-wrap gap-2 items-center">
            {metrics.map((metric) => (
              <button
                key={metric.key}
                onClick={() => {
                  setSelectedMetric(metric.key);
                  setShowActions(false);
                  setSelectedDistrict(null);
                }}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  selectedMetric === metric.key && !showActions && !selectedDistrict
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {metric.label}
              </button>
            ))}
            
            {totalActions > 0 && (
              <>
                <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1"></div>
                <button
                  onClick={() => {
                    setShowActions(!showActions);
                    setSelectedDistrict(null);
                  }}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition inline-flex items-center gap-2 ${
                    showActions
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  <AlertCircle size={16} />
                  <span>Actions ({totalActions})</span>
                </button>
              </>
            )}
            
            <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1"></div>
            
            <select
              value={selectedDistrict || ''}
              onChange={(e) => {
                setSelectedDistrict(e.target.value || null);
                setShowActions(false);
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium border-none outline-none cursor-pointer transition ${
                selectedDistrict
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <option value="">Select District</option>
              {dashboardData.districts.map((district) => (
                <option key={district.name} value={district.name}>{district.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* District Analysis */}
        {selectedDistrict && districtAnalysis && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-medium text-gray-900">{selectedDistrict}</h2>
                <p className="text-sm text-gray-600 mt-1">Total: {districtAnalysis.district.pacsAlloted} PACS</p>
              </div>
              <button onClick={() => setSelectedDistrict(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-white/50 transition">Close</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Go Live</div>
                <div className="text-2xl font-light text-gray-900">{districtAnalysis.district.golive}</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">{((districtAnalysis.district.golive / districtAnalysis.district.pacsAlloted) * 100).toFixed(1)}%</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Audit</div>
                <div className="text-2xl font-light text-gray-900">{districtAnalysis.district.onSystemAudit}</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">{((districtAnalysis.district.onSystemAudit / districtAnalysis.district.pacsAlloted) * 100).toFixed(1)}%</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">E-PACS</div>
                <div className="text-2xl font-light text-gray-900">{districtAnalysis.district.epacs}</div>
                <div className="text-xs text-pink-600 font-medium mt-1">{((districtAnalysis.district.epacs / districtAnalysis.district.pacsAlloted) * 100).toFixed(1)}%</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Dynamic Day-End</div>
                <div className="text-2xl font-light text-gray-900">{districtAnalysis.district.dynamicDayEnd}</div>
                <div className="text-xs text-cyan-600 font-medium mt-1">{((districtAnalysis.district.dynamicDayEnd / districtAnalysis.district.pacsAlloted) * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Progress Tracking */}
            {districtChanges.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {districtChanges.map((change) => (
                  <div key={change.metric} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm font-medium text-gray-900 mb-3">{change.label}</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500">Day-to-Day</div>
                          <div className="text-xs text-gray-400 mt-0.5">from {change.dailyFromDate}</div>
                        </div>
                        <div className={`text-lg font-semibold ${change.dailyChange > 0 ? 'text-green-600' : change.dailyChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {change.dailyChange > 0 ? '+' : ''}{change.dailyChange}
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500">7-Day Change</div>
                          <div className="text-xs text-gray-400 mt-0.5">from {change.weeklyFromDate}</div>
                        </div>
                        <div className={`text-lg font-semibold ${change.weeklyChange > 0 ? 'text-green-600' : change.weeklyChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {change.weeklyChange > 0 ? '+' : ''}{change.weeklyChange}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {districtAnalysis.actions.length > 0 ? (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={20} className="text-amber-600" />
                  <h3 className="text-lg font-medium text-gray-900">Suggested Actions</h3>
                </div>
                <div className="space-y-4">
                  {districtAnalysis.actions.map((action, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      action.color === 'amber' ? 'bg-amber-50 border-amber-400' :
                      action.color === 'purple' ? 'bg-purple-50 border-purple-400' :
                      'bg-cyan-50 border-cyan-400'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-1">{action.stage}</div>
                          <div className="text-sm text-gray-600">{action.message}</div>
                        </div>
                        <div className={`text-2xl font-bold ${
                          action.color === 'amber' ? 'text-amber-600' :
                          action.color === 'purple' ? 'text-purple-600' :
                          'text-cyan-600'
                        }`}>{action.gap}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <Check size={48} className="text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">All On Track!</h3>
                <p className="text-sm text-gray-600">No pending actions for this district.</p>
              </div>
            )}
          </div>
        )}

        {/* Actions View */}
        {showActions && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8 shadow-sm border border-amber-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600" />
                <h2 className="text-lg font-medium text-gray-900">Action Required</h2>
              </div>
              <button onClick={() => setShowActions(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-white/50 transition">Hide</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="text-sm font-medium text-gray-900 mb-1">DCT → Go-Live</div>
                <div className="text-xs text-gray-500 mb-4">{actionItems.dctToGolive.length} districts, {actionItems.totals.dctToGolive} PACS pending</div>
                {actionItems.dctToGolive.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.dctToGolive.slice(0, 5).map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-medium">{index + 1}</div>
                          <span className="text-xs font-medium text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-amber-600">{item.gap}</span>
                      </div>
                    ))}
                    {actionItems.dctToGolive.length > 5 && <div className="text-xs text-gray-400 text-center pt-2">+{actionItems.dctToGolive.length - 5} more</div>}
                  </div>
                ) : <div className="flex items-center justify-center py-6 text-xs text-gray-400"><Check size={16} className="mr-1" />All on track</div>}
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="text-sm font-medium text-gray-900 mb-1">HoC → E-PACS</div>
                <div className="text-xs text-gray-500 mb-4">{actionItems.hocToEpacs.length} districts, {actionItems.totals.hocToEpacs} PACS pending</div>
                {actionItems.hocToEpacs.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.hocToEpacs.slice(0, 5).map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium">{index + 1}</div>
                          <span className="text-xs font-medium text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-purple-600">{item.gap}</span>
                      </div>
                    ))}
                    {actionItems.hocToEpacs.length > 5 && <div className="text-xs text-gray-400 text-center pt-2">+{actionItems.hocToEpacs.length - 5} more</div>}
                  </div>
                ) : <div className="flex items-center justify-center py-6 text-xs text-gray-400"><Check size={16} className="mr-1" />All on track</div>}
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="text-sm font-medium text-gray-900 mb-1">E-PACS → Dynamic Day-End</div>
                <div className="text-xs text-gray-500 mb-4">{actionItems.epacsToDayEnd.length} districts, {actionItems.totals.epacsToDayEnd} PACS pending</div>
                {actionItems.epacsToDayEnd.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.epacsToDayEnd.slice(0, 5).map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-medium">{index + 1}</div>
                          <span className="text-xs font-medium text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-cyan-600">{item.gap}</span>
                      </div>
                    ))}
                    {actionItems.epacsToDayEnd.length > 5 && <div className="text-xs text-gray-400 text-center pt-2">+{actionItems.epacsToDayEnd.length - 5} more</div>}
                  </div>
                ) : <div className="flex items-center justify-center py-6 text-xs text-gray-400"><Check size={16} className="mr-1" />All on track</div>}
              </div>
            </div>
          </div>
        )}

        {/* Top/Bottom */}
        {!showActions && !selectedDistrict && selectedMetric !== 'table' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-emerald-500" />
                <h2 className="text-lg font-medium text-gray-900">Top 5 Districts</h2>
              </div>
              <div className="space-y-4">
                {top.map((district, index) => (
                  <div key={district.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-medium">{index + 1}</div>
                        <span className="text-sm font-medium text-gray-900">{district.name}</span>
                      </div>
                      <span className="text-lg font-light text-gray-900">{district.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width: `${district.percentage}%`}}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{district.value} / {district.total}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <TrendingDown size={20} className="text-rose-500" />
                <h2 className="text-lg font-medium text-gray-900">Bottom 5 Districts</h2>
              </div>
              <div className="space-y-4">
                {bottom.map((district, index) => (
                  <div key={district.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-medium">{index + 1}</div>
                        <span className="text-sm font-medium text-gray-900">{district.name}</span>
                      </div>
                      <span className="text-lg font-light text-gray-900">{district.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all" style={{width: `${district.percentage}%`}}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{district.value} / {district.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Overview Chart */}
        {!showActions && !selectedDistrict && selectedMetric !== 'table' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-6">District Overview</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dashboardData.districts.slice(0, 15)} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#9ca3af" style={{ fontSize: '11px' }} tickLine={false} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="golive" fill="#10b981" radius={[4, 4, 0, 0]} name="Go Live" />
                <Bar dataKey="onSystemAudit" fill="#6366f1" radius={[4, 4, 0, 0]} name="Audit" />
                <Bar dataKey="hoc" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="HoC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* All Districts Table */}
        {!showActions && !selectedDistrict && selectedMetric === 'table' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th onClick={() => handleSort('name')} className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-2">
                        District
                        {sortColumn === 'name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th onClick={() => handleSort('pacsAlloted')} className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-2">
                        Total
                        {sortColumn === 'pacsAlloted' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th onClick={() => handleSort('dctCompleted')} className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-2">
                        DCT
                        {sortColumn === 'dctCompleted' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th onClick={() => handleSort('golive')} className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-2">
                        Go Live
                        {sortColumn === 'golive' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th onClick={() => handleSort('onSystemAudit')} className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-2">
                        Audit
                        {sortColumn === 'onSystemAudit' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th onClick={() => handleSort('epacs')} className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-2">
                        E-PACS
                        {sortColumn === 'epacs' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th onClick={() => handleSort('dynamicDayEnd')} className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-2">
                        Dynamic Day-End
                        {sortColumn === 'dynamicDayEnd' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedDistricts.map((district, index) => (
                    <tr key={district.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{district.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">{district.pacsAlloted}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{district.dctCompleted}</span>
                          <span className="text-xs text-emerald-600 font-medium">{((district.dctCompleted / district.pacsAlloted) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{district.golive}</span>
                          <span className="text-xs text-blue-600 font-medium">{((district.golive / district.pacsAlloted) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{district.onSystemAudit}</span>
                          <span className="text-xs text-indigo-600 font-medium">{((district.onSystemAudit / district.pacsAlloted) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{district.epacs}</span>
                          <span className="text-xs text-pink-600 font-medium">{((district.epacs / district.pacsAlloted) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{district.dynamicDayEnd}</span>
                          <span className="text-xs text-cyan-600 font-medium">{((district.dynamicDayEnd / district.pacsAlloted) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{dashboardData.totals.pacsAlloted.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {dashboardData.totals.dctCompleted.toLocaleString()} <span className="text-xs text-emerald-600">({((dashboardData.totals.dctCompleted / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%)</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {dashboardData.totals.golive.toLocaleString()} <span className="text-xs text-blue-600">({((dashboardData.totals.golive / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%)</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {dashboardData.totals.onSystemAudit.toLocaleString()} <span className="text-xs text-indigo-600">({((dashboardData.totals.onSystemAudit / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%)</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {dashboardData.totals.epacs.toLocaleString()} <span className="text-xs text-pink-600">({((dashboardData.totals.epacs / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%)</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {dashboardData.totals.dynamicDayEnd.toLocaleString()} <span className="text-xs text-cyan-600">({((dashboardData.totals.dynamicDayEnd / dashboardData.totals.pacsAlloted) * 100).toFixed(0)}%)</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="text-center py-8">
          <p className="text-xs text-gray-400">PACS Computerisation Progress Dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default PACSProgressDashboard;
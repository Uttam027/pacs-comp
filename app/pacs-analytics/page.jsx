"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, BarChart3, Upload, Info, TrendingUp,
  ChevronLeft, ChevronRight, Moon, Sun,
  Search, FileText,
} from 'lucide-react';

const TABS = ["Dashboard", "Upload", "Trends"];

function PACSSidebar({ activeTab, onTabChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  const navItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Upload", label: "Upload CSV", icon: Upload },
    { id: "Trends", label: "Trend Analysis", icon: BarChart3 },
    { id: "info", label: "Definitions", icon: Info },
  ];

  return (
    <aside
      className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${collapsed ? "w-14" : "w-52"}`}
      style={{ minHeight: "100vh" }}
    >
      <div className={`flex items-center gap-2 px-4 py-4 border-b border-gray-100 ${collapsed ? "justify-center px-0" : ""}`}>
        <div className="shrink-0 w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 leading-none tracking-tight">PACS</p>
            <p className="text-[9px] text-gray-400 tracking-widest uppercase mt-0.5">Analytics</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                active
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className={`shrink-0 ${active ? "w-4 h-4 text-gray-900" : "w-4 h-4 text-gray-400"}`} />
              {!collapsed && <span className="text-[13px]">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-2 py-3 space-y-1">
        <button
          onClick={() => setDark(!dark)}
          className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? (dark ? "Light mode" : "Dark mode") : undefined}
        >
          {dark ? <Sun className="w-4 h-4 text-gray-400" /> : <Moon className="w-4 h-4 text-gray-400" />}
          {!collapsed && <span className="text-[13px]">{dark ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-[13px]">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export default function PACSAnalytics() {
  // Initialize with yesterday's date
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getYesterdayDate());
  const [todayFile, setTodayFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [allSnapshots, setAllSnapshots] = useState([]);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const [isTrendExpanded, setIsTrendExpanded] = useState(false);
  const [selectedPACS, setSelectedPACS] = useState(null);
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
  const [sortDaysAgo, setSortDaysAgo] = useState(null); // null = no sort, 'asc' = ascending, 'desc' = descending
  const [trendDistrict, setTrendDistrict] = useState('all'); // District filter for trend analysis
  const [trendCategories, setTrendCategories] = useState(['all']); // Category filter for trend analysis
  const [activeTab, setActiveTab] = useState("Dashboard");

  useEffect(() => {
    // Default to yesterday's date (since reports are for yesterday's day-end)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    setSelectedDate(yesterdayStr);
    loadLatestAnalysis();
  }, []);

  const loadLatestAnalysis = async () => {
    try {
      const response = await fetch('/api/pacs-analytics/daily');
      const result = await response.json();

      console.log('API Response:', result);

      // Store all snapshots for history display
      if (result.data && Array.isArray(result.data)) {
        setAllSnapshots(result.data);
        console.log(`📊 Found ${result.data.length} day(s) of uploaded data`);
      }

      if (result.data && result.data.length > 0) {
        // Always load the most recent snapshot
        const latest = result.data[0];

        console.log('📅 Most recent snapshot date:', latest.date);
        console.log('Loading snapshot:', latest);

        if (latest && latest.data) {
          const data = latest.data;

          // Check if this is old data structure (has 'changes' instead of 'results')
          if (data.changes && !data.results) {
            console.log('Old data structure detected, skipping load. Please upload new CSV.');
            // Don't set analysis - let user upload fresh data
          } else if (data.results && data.stats) {
            // New data structure
            setAnalysis(data);
            // Update selectedDate to match the loaded snapshot
            setSelectedDate(latest.date);
            console.log('Analysis set (new structure):', data);
            console.log('Selected date updated to:', latest.date);
          }
        }
      } else {
        console.log('No data found, upload form should show');
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
    } finally {
      setInitialLoading(false);
      console.log('Initial loading complete, analysis:', analysis);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Empty or invalid CSV');

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    console.log('CSV Headers:', headers);
    console.log('Looking for columns: PACS ID, PACS Name, District Name, Last Day End Date');

    const data = {};

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const pacsId = values[headers.indexOf('PACS ID')];

      if (i === 1) {
        // Debug first row
        console.log('First data row:', {
          pacsId,
          name: values[headers.indexOf('PACS Name')],
          district: values[headers.indexOf('District Name')],
          lastDayEnd: values[headers.indexOf('Last Day End Date')]
        });
      }

      if (pacsId) {
        data[pacsId] = {
          id: pacsId,
          name: values[headers.indexOf('PACS Name')] || '',
          district: values[headers.indexOf('District Name')] || '',
          lastDayEnd: values[headers.indexOf('Last Day End Date')] || ''
        };
      }
    }

    console.log(`Parsed ${Object.keys(data).length} PACS from CSV`);

    if (Object.keys(data).length === 0) {
      throw new Error('No valid PACS data found in CSV');
    }

    return data;
  };

  const extractDateFromFilename = (filename) => {
    // Try YYYY-MM-DD format first
    let match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    // Try DDMMYYYY format (e.g., 01112025)
    match = filename.match(/(\d{8})/);
    if (match) {
      const dateStr = match[1];
      // Parse as DDMMYYYY
      const day = dateStr.substring(0, 2);
      const month = dateStr.substring(2, 4);
      const year = dateStr.substring(4, 8);

      // Validate the date is reasonable
      if (parseInt(day) > 0 && parseInt(day) <= 31 &&
          parseInt(month) > 0 && parseInt(month) <= 12 &&
          parseInt(year) >= 2020 && parseInt(year) <= 2030) {
        return `${year}-${month}-${day}`;
      }
    }

    return null;
  };

  const parseDateString = (dateStr) => {
    // Handle different date formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
    if (!dateStr) return null;

    try {
      // Ensure dateStr is a string
      const dateString = typeof dateStr === 'string' ? dateStr : String(dateStr);

      // Try DD-MM-YYYY or DD/MM/YYYY format (common in Indian data)
      const parts = dateString.split(/[-/]/);
      if (parts.length === 3) {
        const [first, second, third] = parts;

        // If third part is 4 digits, it's likely YYYY
        if (third.length === 4) {
          // DD-MM-YYYY format - convert strings to integers
          return new Date(parseInt(third), parseInt(second) - 1, parseInt(first));
        } else if (first.length === 4) {
          // YYYY-MM-DD format - convert strings to integers
          return new Date(parseInt(first), parseInt(second) - 1, parseInt(third));
        }
      }

      // Fallback to default parsing
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return null;
    }
  };

  const calculateDaysBetween = (date1, date2) => {
    const d1 = parseDateString(date1) || new Date(date1);
    const d2 = new Date(date2);

    // Set both dates to midnight to compare just the date part
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  const handleAnalyze = async () => {
    if (!todayFile) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentData = parseCSV(await todayFile.text());
      const snapshotDate = new Date(selectedDate);

      // Get previous day's data from API
      const prevDateStr = new Date(snapshotDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log('🔍 Looking for previous day data:', prevDateStr);
      console.log('   Current snapshot date:', selectedDate);

      // Also fetch all snapshots to see what dates are available
      const allResponse = await fetch('/api/pacs-analytics/daily');
      const allResult = await allResponse.json();
      if (allResult.data && allResult.data.length > 0) {
        console.log('📅 Available dates in database:', allResult.data.map(s => s.date).join(', '));
      }

      const prevResponse = await fetch(`/api/pacs-analytics/daily?date=${prevDateStr}`);
      const prevResult = await prevResponse.json();
      const previousSnapshot = prevResult.data || null;
      const previousResults = previousSnapshot?.results || null;

      if (previousResults) {
        console.log('✅ Previous day data found:', previousResults.length, 'PACS');
      } else {
        console.log('⚠️ No previous day data found. New/Consistent/Dropped detection will be skipped.');
        console.log('   This is normal for first-time uploads or when no data exists for', prevDateStr);
        console.log('   💡 Tip: Make sure you have uploaded data for', prevDateStr, 'first');
      }

      const results = [];
      const districts = new Set();
      const stats = {
        total: 0,
        dynamicT7: 0,
        dynamicT1: 0,
        newPACS: 0,
        droppedPACS: 0,
        consistentPACS: 0
      };

      // Calculate T-7 date (7 days before snapshot)
      const t7Date = new Date(snapshotDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Debug: Log snapshot date format
      console.log('Snapshot date:', selectedDate, 'as Date object:', snapshotDate);

      // Process current PACS
      let debugCount = 0;
      Object.entries(currentData).forEach(([pacsId, pacs]) => {
        stats.total++;
        districts.add(pacs.district);

        if (!pacs.lastDayEnd || pacs.lastDayEnd.trim() === '') {
          results.push({
            ...pacs,
            category: 'no-activity',
            categoryLabel: 'No Activity',
            daysSinceLastDayEnd: null,
            lastDayEndDate: null
          });
          return;
        }

        const lastDayEndDate = parseDateString(pacs.lastDayEnd);
        const daysSince = calculateDaysBetween(pacs.lastDayEnd, snapshotDate);

        // Debug: Log first few PACS to see date parsing
        if (debugCount < 5) {
          console.log(`PACS ${debugCount + 1}:`, {
            id: pacsId,
            name: pacs.name,
            lastDayEndRaw: pacs.lastDayEnd,
            lastDayEndParsed: lastDayEndDate,
            snapshotDate: snapshotDate,
            daysSince: daysSince,
            isDynamicT1: daysSince === 0
          });
          debugCount++;
        }

        // Debug: Log T-1 PACS
        if (daysSince === 0) {
          console.log('✅ T-1 PACS found:', {
            id: pacsId,
            name: pacs.name,
            lastDayEnd: pacs.lastDayEnd,
            parsedDate: lastDayEndDate,
            snapshotDate: snapshotDate,
            daysSince
          });
        }

        let category = '';
        let categoryLabel = '';
        let primaryCategory = '';  // Track T-7/T-1 separately

        // Check Dynamic Day End T-7 (within last 7 days INCLUDING snapshot date)
        // daysSince 0-6 means last 7 days (0=today, 6=6 days ago)
        const isDynamicT7 = daysSince >= 0 && daysSince <= 6;

        // Check Dynamic Day End T-1 (same as snapshot date)
        const isDynamicT1 = daysSince === 0;

        if (isDynamicT7) {
          stats.dynamicT7++;

          if (isDynamicT1) {
            stats.dynamicT1++;
            primaryCategory = 'dynamic-t1';
            category = 'dynamic-t1';
            categoryLabel = 'Dynamic Day End (T-1)';
          } else {
            primaryCategory = 'dynamic-t7';
            category = 'dynamic-t7';
            categoryLabel = 'Dynamic Day End (T-7)';
          }

          // Check if New or Consistent (secondary classification)
          if (previousResults) {
            const prevPacsResult = previousResults.find(p => p.id === pacsId);
            const wasDynamicT7Yesterday = prevPacsResult && prevPacsResult.isDynamicT7;

            // New PACS: Is in T-7 today BUT was NOT in T-7 yesterday
            // This means they appear in T-7 for the first time
            if (!wasDynamicT7Yesterday) {
              category = 'new';
              categoryLabel = 'New PACS';
              stats.newPACS++;
            } else {
              // Consistent PACS: Was in T-7 yesterday AND is in T-7 today
              category = 'consistent';
              categoryLabel = 'Consistent PACS';
              stats.consistentPACS++;
            }
          }
        } else {
          primaryCategory = 'inactive';
          category = 'inactive';
          categoryLabel = 'Inactive (>T-7)';
        }

        results.push({
          ...pacs,
          category,
          primaryCategory,  // Add primaryCategory field
          categoryLabel,
          daysSinceLastDayEnd: daysSince,
          lastDayEndDate: pacs.lastDayEnd,
          isDynamicT7,
          isDynamicT1
        });
      });

      // Find Dropped PACS (were in previous T-7 but not in current T-7)
      if (previousResults) {
        previousResults.forEach((prevPacs) => {
          if (prevPacs.isDynamicT7) {
            // Check if this PACS is no longer in T-7 in current data
            const currentPacs = currentData[prevPacs.id];
            if (!currentPacs) {
              // PACS completely missing from current data
              stats.droppedPACS++;
              results.push({
                id: prevPacs.id,
                name: prevPacs.name || prevPacs.id,
                district: prevPacs.district || 'Unknown',
                category: 'dropped',
                categoryLabel: 'Dropped PACS',
                daysSinceLastDayEnd: null,
                lastDayEndDate: prevPacs.lastDayEndDate
              });
            } else if (!currentPacs.lastDayEnd || currentPacs.lastDayEnd.trim() === '') {
              // PACS exists but has no day-end activity now
              stats.droppedPACS++;
              results.push({
                id: prevPacs.id,
                name: prevPacs.name || prevPacs.id,
                district: prevPacs.district || 'Unknown',
                category: 'dropped',
                categoryLabel: 'Dropped PACS',
                daysSinceLastDayEnd: null,
                lastDayEndDate: prevPacs.lastDayEndDate
              });
            } else {
              // Check if current PACS is now outside T-7
              const currentLastDayEndDate = new Date(currentPacs.lastDayEnd);
              const currentDaysSince = calculateDaysBetween(currentLastDayEndDate, snapshotDate);
              if (currentDaysSince > 6) {
                // PACS was in T-7 yesterday but is now outside T-7 (> 6 days ago)
                stats.droppedPACS++;
                results.push({
                  id: prevPacs.id,
                  name: prevPacs.name || prevPacs.id,
                  district: prevPacs.district || 'Unknown',
                  category: 'dropped',
                  categoryLabel: 'Dropped PACS',
                  daysSinceLastDayEnd: currentDaysSince,
                  lastDayEndDate: currentPacs.lastDayEnd
                });
              }
            }
          }
        });
      }

      const analysisData = {
        snapshotDate: selectedDate,
        results,
        stats,
        districts: Array.from(districts).sort(),
        pacsList: currentData
      };

      // Save to API
      const saveResponse = await fetch('/api/pacs-analytics/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          snapshot: analysisData
        })
      });

      if (!saveResponse.ok) {
        console.warn('Failed to save analysis to database');
      }

      setAnalysis(analysisData);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setTodayFile(file);
    setError(null);

    const detectedDate = extractDateFromFilename(file.name);
    if (detectedDate) {
      setSelectedDate(detectedDate);
    }
  };

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const detectedDate = extractDateFromFilename(file.name);

      if (!detectedDate) {
        results.push({ file: file.name, status: 'failed', reason: 'Could not detect date from filename' });
        failCount++;
        continue;
      }

      try {
        const currentData = parseCSV(await file.text());
        const snapshotDate = new Date(detectedDate);

        // Get previous day's data
        const prevDateStr = new Date(snapshotDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const prevResponse = await fetch(`/api/pacs-analytics/daily?date=${prevDateStr}`);
        const prevResult = await prevResponse.json();
        const previousSnapshot = prevResult.data || null;
        const previousResults = previousSnapshot?.results || null;

        const analysisResults = [];
        const districts = new Set();
        const stats = {
          total: 0,
          dynamicT7: 0,
          dynamicT1: 0,
          newPACS: 0,
          droppedPACS: 0,
          consistentPACS: 0
        };

        // Process current PACS
        Object.entries(currentData).forEach(([pacsId, pacs]) => {
          stats.total++;
          districts.add(pacs.district);

          if (!pacs.lastDayEnd || pacs.lastDayEnd.trim() === '') {
            analysisResults.push({
              ...pacs,
              category: 'no-activity',
              categoryLabel: 'No Activity',
              daysSinceLastDayEnd: null,
              lastDayEndDate: null
            });
            return;
          }

          const daysSince = calculateDaysBetween(pacs.lastDayEnd, snapshotDate);
          let category = '';
          let categoryLabel = '';
          let primaryCategory = '';

          const isDynamicT7 = daysSince >= 0 && daysSince <= 6;
          const isDynamicT1 = daysSince === 0;

          if (isDynamicT7) {
            stats.dynamicT7++;

            if (isDynamicT1) {
              stats.dynamicT1++;
              primaryCategory = 'dynamic-t1';
              category = 'dynamic-t1';
              categoryLabel = 'Dynamic Day End (T-1)';
            } else {
              primaryCategory = 'dynamic-t7';
              category = 'dynamic-t7';
              categoryLabel = 'Dynamic Day End (T-7)';
            }

            if (previousResults) {
              const prevPacsResult = previousResults.find(p => p.id === pacsId);
              const wasDynamicT7Yesterday = prevPacsResult && prevPacsResult.isDynamicT7;

              // New PACS: Is in T-7 today BUT was NOT in T-7 yesterday
              // This means they appear in T-7 for the first time
              if (!wasDynamicT7Yesterday) {
                category = 'new';
                categoryLabel = 'New PACS';
                stats.newPACS++;
              } else {
                // Consistent PACS: Was in T-7 yesterday AND is in T-7 today
                category = 'consistent';
                categoryLabel = 'Consistent PACS';
                stats.consistentPACS++;
              }
            }
          } else {
            primaryCategory = 'inactive';
            category = 'inactive';
            categoryLabel = 'Inactive (>T-7)';
          }

          analysisResults.push({
            ...pacs,
            category,
            primaryCategory,
            categoryLabel,
            daysSinceLastDayEnd: daysSince,
            lastDayEndDate: pacs.lastDayEnd,
            isDynamicT7,
            isDynamicT1
          });
        });

        // Find Dropped PACS
        if (previousResults) {
          previousResults.forEach((prevPacs) => {
            if (prevPacs.isDynamicT7) {
              const currentPacs = currentData[prevPacs.id];
              if (!currentPacs || !currentPacs.lastDayEnd || currentPacs.lastDayEnd.trim() === '') {
                stats.droppedPACS++;
                analysisResults.push({
                  id: prevPacs.id,
                  name: prevPacs.name || prevPacs.id,
                  district: prevPacs.district || 'Unknown',
                  category: 'dropped',
                  categoryLabel: 'Dropped PACS',
                  daysSinceLastDayEnd: null,
                  lastDayEndDate: prevPacs.lastDayEndDate
                });
              } else {
                const currentDaysSince = calculateDaysBetween(currentPacs.lastDayEnd, snapshotDate);
                if (currentDaysSince > 6) {
                  stats.droppedPACS++;
                  analysisResults.push({
                    id: prevPacs.id,
                    name: prevPacs.name || prevPacs.id,
                    district: prevPacs.district || 'Unknown',
                    category: 'dropped',
                    categoryLabel: 'Dropped PACS',
                    daysSinceLastDayEnd: currentDaysSince,
                    lastDayEndDate: currentPacs.lastDayEnd
                  });
                }
              }
            }
          });
        }

        const analysisData = {
          snapshotDate: detectedDate,
          results: analysisResults,
          stats,
          districts: Array.from(districts).sort(),
          pacsList: currentData
        };

        // Save to API
        const saveResponse = await fetch('/api/pacs-analytics/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: detectedDate,
            snapshot: analysisData
          })
        });

        if (saveResponse.ok) {
          results.push({ file: file.name, date: detectedDate, status: 'success' });
          successCount++;
        } else {
          results.push({ file: file.name, date: detectedDate, status: 'failed', reason: 'Failed to save to database' });
          failCount++;
        }
      } catch (err) {
        results.push({ file: file.name, status: 'failed', reason: err.message });
        failCount++;
      }
    }

    setLoading(false);

    // Show summary
    const summary = `Bulk upload complete!\n✓ Success: ${successCount}\n✗ Failed: ${failCount}\n\nDetails:\n${results.map(r => `${r.file}: ${r.status}${r.reason ? ` (${r.reason})` : ''}`).join('\n')}`;
    alert(summary);

    // Reload to show latest data
    await loadLatestAnalysis();
  };

  const filteredData = () => {
    if (!analysis) return [];

    // Debug: Log first PACS to see data structure
    if (analysis.results && analysis.results.length > 0 && filterCategory !== 'all') {
      console.log('🔍 Filter Debug:', {
        filterCategory,
        firstPACS: {
          name: analysis.results[0].name,
          category: analysis.results[0].category,
          primaryCategory: analysis.results[0].primaryCategory,
          isDynamicT7: analysis.results[0].isDynamicT7,
          isDynamicT1: analysis.results[0].isDynamicT1
        },
        totalResults: analysis.results.length
      });
    }

    let filtered = analysis.results.filter(p => {
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDistrict = filterDistrict === 'all' || p.district === filterDistrict;

      // Special handling for dynamic-t7 and dynamic-t1 filters
      // These should match based on the T-7/T-1 flags, not the category
      let matchesCategory;
      if (filterCategory === 'dynamic-t7') {
        matchesCategory = p.isDynamicT7 === true;
      } else if (filterCategory === 'dynamic-t1') {
        matchesCategory = p.isDynamicT1 === true;
      } else if (filterCategory === 'all') {
        matchesCategory = true;
      } else {
        // For other categories (new, consistent, dropped, inactive), match by category
        matchesCategory = p.category === filterCategory;
      }

      return matchesSearch && matchesCategory && matchesDistrict;
    });

    // Apply sorting if enabled
    if (sortDaysAgo) {
      filtered = [...filtered].sort((a, b) => {
        const daysA = a.daysSinceLastDayEnd !== null ? a.daysSinceLastDayEnd : 999999;
        const daysB = b.daysSinceLastDayEnd !== null ? b.daysSinceLastDayEnd : 999999;

        if (sortDaysAgo === 'asc') {
          return daysA - daysB;
        } else {
          return daysB - daysA;
        }
      });
    }

    return filtered;
  };

  // Generate trend data from all snapshots
  const getTrendData = () => {
    if (!allSnapshots || allSnapshots.length === 0) return [];

    // Sort snapshots by date (oldest first for the chart)
    const sortedSnapshots = [...allSnapshots].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Take last 30 days only
    const last30 = sortedSnapshots.slice(-30);

    return last30.map(snapshot => {
      const results = snapshot.data?.results || [];

      // Filter by district if not 'all'
      const districtFiltered = trendDistrict === 'all'
        ? results
        : results.filter(p => p.district === trendDistrict);

      // Calculate stats based on filtered data
      const stats = {
        dynamicT7: districtFiltered.filter(p => p.isDynamicT7).length,
        dynamicT1: districtFiltered.filter(p => p.isDynamicT1).length,
        newPACS: districtFiltered.filter(p => p.category === 'new').length,
        consistentPACS: districtFiltered.filter(p => p.category === 'consistent').length,
        droppedPACS: districtFiltered.filter(p => p.category === 'dropped').length,
        total: districtFiltered.length
      };

      return {
        date: new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: snapshot.date,
        'T-7': stats.dynamicT7 || 0,
        'T-1': stats.dynamicT1 || 0,
        'New': stats.newPACS || 0,
        'Consistent': stats.consistentPACS || 0,
        'Dropped': stats.droppedPACS || 0,
        'Inactive': stats.total ? (stats.total - stats.dynamicT7) : 0
      };
    });
  };

  // Calculate district-specific statistics
  const getDistrictStats = () => {
    if (!analysis || !analysis.results || filterDistrict === 'all') return null;

    const districtPACS = analysis.results.filter(p => p.district === filterDistrict);

    const stats = {
      total: districtPACS.length,
      dynamicT7: districtPACS.filter(p => p.isDynamicT7).length,
      dynamicT1: districtPACS.filter(p => p.isDynamicT1).length,
      newPACS: districtPACS.filter(p => p.category === 'new').length,
      consistentPACS: districtPACS.filter(p => p.category === 'consistent').length,
      droppedPACS: districtPACS.filter(p => p.category === 'dropped').length,
      inactive: districtPACS.filter(p => p.category === 'inactive').length,
    };

    return stats;
  };

  // Build timeline for a specific PACS
  const buildPACSTimeline = (pacsId) => {
    if (!allSnapshots || allSnapshots.length === 0) return [];

    const timeline = [];
    const sortedSnapshots = [...allSnapshots].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    sortedSnapshots.forEach(snapshot => {
      const pacsData = snapshot.data?.results?.find(p => p.id === pacsId);
      if (pacsData) {
        timeline.push({
          date: snapshot.date,
          category: pacsData.category,
          primaryCategory: pacsData.primaryCategory || pacsData.category,
          categoryLabel: pacsData.categoryLabel,
          lastDayEnd: pacsData.lastDayEndDate,
          daysAgo: pacsData.daysSinceLastDayEnd,
          isDynamicT7: pacsData.isDynamicT7,
          isDynamicT1: pacsData.isDynamicT1
        });
      }
    });

    return timeline.slice(-30); // Last 30 days
  };

  // Get category color for timeline visualization
  const getCategoryColor = (category) => {
    const colors = {
      'dynamic-t1': '#06b6d4',
      'dynamic-t7': '#0ea5e9',
      'new': '#10b981',
      'consistent': '#f59e0b',
      'dropped': '#ef4444',
      'inactive': '#9ca3af',
      'no-activity': '#d1d5db'
    };
    return colors[category] || '#e5e7eb';
  };

  // Calculate timeline statistics
  const getTimelineStats = (timeline) => {
    if (!timeline || timeline.length === 0) return null;

    const activeDays = timeline.filter(d => d.isDynamicT7).length;

    // Calculate current streak
    let currentStreak = 0;
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].isDynamicT7) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    timeline.forEach(day => {
      if (day.isDynamicT7) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    // Count status changes
    let statusChanges = 0;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].category !== timeline[i - 1].category) {
        statusChanges++;
      }
    }

    return {
      totalDays: timeline.length,
      activeDays,
      currentStreak,
      longestStreak,
      statusChanges,
      currentStatus: timeline[timeline.length - 1]
    };
  };

  // Generate PDF Report for Dropped PACS
  const generateDroppedPACSReport = async () => {
    console.log('🔵 Starting PDF generation...');

    if (!analysis || !analysis.results) {
      console.log('❌ No analysis data');
      return;
    }

    // Filter for dropped PACS only
    const droppedPACS = analysis.results.filter(p => p.category === 'dropped');
    console.log(`📊 Found ${droppedPACS.length} dropped PACS`);

    if (droppedPACS.length === 0) {
      alert('No dropped PACS to report');
      return;
    }

    try {
      console.log('📦 Loading jsPDF library...');
      // Dynamically import jsPDF (client-side only)
      const jsPDFModule = await import('jspdf');
      console.log('✅ jsPDF module loaded:', jsPDFModule);

      const jsPDF = jsPDFModule.default;
      console.log('✅ jsPDF constructor:', jsPDF);

      console.log('🎨 Creating PDF document...');
      const doc = new jsPDF();
      console.log('✅ PDF document created');

      // Import autoTable function
      const autoTable = (await import('jspdf-autotable')).default;
      console.log('✅ autoTable function loaded:', typeof autoTable);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Dropped PACS Report', pageWidth / 2, 20, { align: 'center' });

      // Snapshot Date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const snapshotDateStr = new Date(analysis.snapshotDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Snapshot Date: ${snapshotDateStr}`, pageWidth / 2, 28, { align: 'center' });

      // Report generation date
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, pageWidth / 2, 34, { align: 'center' });
      doc.setTextColor(0);

      // Executive Summary Box
      doc.setFillColor(254, 202, 202); // Light red background
      doc.rect(14, 40, pageWidth - 28, 30, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 20, 48);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Dropped PACS: ${droppedPACS.length}`, 20, 56);

      // District breakdown
      const districtCounts = {};
      droppedPACS.forEach(p => {
        districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
      });
      const topDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      doc.text(`Top 3 Districts: ${topDistricts.map(d => `${d[0]} (${d[1]})`).join(', ')}`, 20, 64);

      // District-wise Summary Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('District-wise Breakdown', 14, 80);

      const districtData = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([district, count]) => [
          district,
          count,
          `${((count / droppedPACS.length) * 100).toFixed(1)}%`
        ]);

      autoTable(doc, {
        startY: 85,
        head: [['District', 'Dropped PACS', 'Percentage']],
        body: districtData,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' }
        }
      });

      // Detailed PACS List
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed List of Dropped PACS', 14, 20);

      const pacsData = droppedPACS.map(p => [
        p.id,
        p.name,
        p.district,
        p.lastDayEndDate || 'N/A',
        p.daysSinceLastDayEnd !== null ? `${p.daysSinceLastDayEnd} days` : 'N/A'
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['PACS ID', 'PACS Name', 'District', 'Last Day End', 'Days Ago']],
        body: pacsData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 70 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25, halign: 'center' }
        },
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(128);
          doc.text(
            `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      });

      // Add insights page
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Insights & Recommendations', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 30;

      doc.setFont('helvetica', 'bold');
      doc.text('What are "Dropped PACS"?', 14, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      const droppedDef = 'Dropped PACS are those that were performing day-end activities within the T-7 window ' +
        '(last 7 days) on the previous snapshot but are NO LONGER within T-7 on the current snapshot. ' +
        'This indicates a recent decline in activity.';
      const droppedDefLines = doc.splitTextToSize(droppedDef, pageWidth - 28);
      doc.text(droppedDefLines, 14, yPos);
      yPos += droppedDefLines.length * 5 + 10;

      doc.setFont('helvetica', 'bold');
      doc.text('Recommended Actions:', 14, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');

      const actions = [
        '1. Immediate Follow-up: Contact PACS leadership to understand reasons for activity cessation',
        '2. Technical Support: Check for system issues, connectivity problems, or training needs',
        '3. Prioritize High-Impact Districts: Focus on districts with the most dropped PACS',
        '4. Monitor Recovery: Track if dropped PACS return to T-7 status in coming days',
        '5. Document Issues: Record common reasons for drops to prevent future occurrences'
      ];

      actions.forEach(action => {
        const lines = doc.splitTextToSize(action, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5 + 4;
      });

      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Priority Districts for Action:', 14, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');

      topDistricts.forEach(([district, count], index) => {
        doc.text(`${index + 1}. ${district}: ${count} dropped PACS (${((count / droppedPACS.length) * 100).toFixed(1)}%)`, 20, yPos);
        yPos += 6;
      });

      // Footer on insights page
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Generated by PACS Analytics System | ${new Date().toLocaleDateString('en-US')}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Save PDF
      console.log('💾 Saving PDF...');
      const fileName = `Dropped_PACS_Report_${analysis.snapshotDate}.pdf`;
      doc.save(fileName);
      console.log('✅ PDF saved:', fileName);

      alert(`Report generated successfully!\nFile: ${fileName}\nTotal Dropped PACS: ${droppedPACS.length}`);
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      alert(`Failed to generate PDF report.\n\nError: ${error.message}\n\nPlease check the browser console for details.`);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PACSSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {analysis && analysis.snapshotDate && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {new Date(analysis.snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Badge>
            )}
            <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors">
              ← Home
            </Link>
          </div>
        </header>

        {/* Page title row */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">
            {activeTab === "Dashboard" ? "PACS Analytics" : activeTab === "Upload" ? "Upload CSV" : "Trend Analysis"}
          </h1>
          <p className="text-xs text-gray-400">
            T-7 Classification · Dynamic Day End
          </p>
        </div>

        {/* Content */}
        <main className="flex-1 px-6 py-5">
          {initialLoading ? (
            <div className="flex items-center justify-center py-32">
              <p className="text-sm text-gray-300 tracking-widest uppercase animate-pulse">Loading…</p>
            </div>
          ) : (
            <>
              {activeTab === "Dashboard" && (
                <DashboardTab
                  analysis={analysis}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  filterDistrict={filterDistrict}
                  setFilterDistrict={setFilterDistrict}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  sortDaysAgo={sortDaysAgo}
                  setSortDaysAgo={setSortDaysAgo}
                  filteredData={filteredData}
                  getDistrictStats={getDistrictStats}
                  setSelectedPACS={setSelectedPACS}
                  setIsTimelineDialogOpen={setIsTimelineDialogOpen}
                  generateDroppedPACSReport={generateDroppedPACSReport}
                />
              )}
              {activeTab === "Upload" && (
                <UploadTab
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  todayFile={todayFile}
                  setTodayFile={setTodayFile}
                  loading={loading}
                  error={error}
                  setError={setError}
                  analysis={analysis}
                  setAnalysis={setAnalysis}
                  handleAnalyze={handleAnalyze}
                  handleFileChange={handleFileChange}
                  handleBulkUpload={handleBulkUpload}
                  allSnapshots={allSnapshots}
                />
              )}
              {activeTab === "Trends" && (
                <TrendsTab
                  allSnapshots={allSnapshots}
                  analysis={analysis}
                  getTrendData={getTrendData}
                  trendDistrict={trendDistrict}
                  setTrendDistrict={setTrendDistrict}
                  trendCategories={trendCategories}
                  setTrendCategories={setTrendCategories}
                />
              )}
              {activeTab === "info" && (
                <InfoTab allSnapshots={allSnapshots} />
              )}
            </>
          )}
        </main>
      </div>

      {/* PACS Timeline Dialog */}
      <Dialog open={isTimelineDialogOpen} onOpenChange={setIsTimelineDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedPACS?.name || 'PACS Timeline'}
            </DialogTitle>
            <DialogDescription>
              {selectedPACS?.district && `District: ${selectedPACS.district} · `}
              Activity timeline for the last {allSnapshots.length} days
            </DialogDescription>
          </DialogHeader>

          {selectedPACS && (() => {
            const timeline = buildPACSTimeline(selectedPACS.id);
            const stats = getTimelineStats(timeline);

            if (!stats) {
              return (
                <div className="text-center py-12 text-gray-500">
                  No timeline data available for this PACS
                </div>
              );
            }

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">Current Status</div>
                    <div className="text-sm font-semibold" style={{ color: getCategoryColor(stats.currentStatus.category) }}>
                      {stats.currentStatus.categoryLabel}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">Active Days</div>
                    <div className="text-lg font-semibold text-blue-600">{stats.activeDays}/{stats.totalDays}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">Current Streak</div>
                    <div className="text-lg font-semibold text-green-600">{stats.currentStreak} days</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">Longest Streak</div>
                    <div className="text-lg font-semibold text-purple-600">{stats.longestStreak} days</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">Status Changes</div>
                    <div className="text-lg font-semibold text-amber-600">{stats.statusChanges}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {timeline.map((day, index) => (
                      <div
                        key={index}
                        className="relative group shrink-0"
                        style={{ width: '32px', height: '80px', backgroundColor: getCategoryColor(day.category), borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          <div className="font-semibold">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                          <div>{day.categoryLabel}</div>
                          {day.lastDayEnd && <div className="text-gray-300">Last: {day.lastDayEnd}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Status Legend</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {[
                      { cat: 'dynamic-t1', label: 'Dynamic (T-1)' },
                      { cat: 'dynamic-t7', label: 'Dynamic (T-7)' },
                      { cat: 'new', label: 'New PACS' },
                      { cat: 'consistent', label: 'Consistent' },
                      { cat: 'dropped', label: 'Dropped' },
                      { cat: 'inactive', label: 'Inactive' },
                    ].map(({ cat, label }) => (
                      <div key={cat} className="flex items-center gap-2">
                        <div style={{ width: '16px', height: '16px', backgroundColor: getCategoryColor(cat), borderRadius: '3px' }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {timeline.slice().reverse().slice(0, 10).map((day, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <div style={{ width: '12px', height: '12px', backgroundColor: getCategoryColor(day.category), borderRadius: '2px' }} />
                          <span className="text-gray-600">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium" style={{ color: getCategoryColor(day.category) }}>{day.categoryLabel}</span>
                          {day.lastDayEnd && <span className="text-xs text-gray-500">Last: {day.lastDayEnd}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab({
  analysis, filterCategory, setFilterCategory, filterDistrict, setFilterDistrict,
  searchTerm, setSearchTerm, sortDaysAgo, setSortDaysAgo, filteredData,
  getDistrictStats, setSelectedPACS, setIsTimelineDialogOpen, generateDroppedPACSReport
}) {
  const getCategoryBadgeStyle = (category) => {
    const map = {
      'dynamic-t1': 'bg-cyan-100 text-cyan-700',
      'dynamic-t7': 'bg-sky-100 text-sky-700',
      'new': 'bg-emerald-100 text-emerald-700',
      'consistent': 'bg-amber-100 text-amber-700',
      'dropped': 'bg-red-100 text-red-700',
      'inactive': 'bg-gray-100 text-gray-500',
    };
    return map[category] || 'bg-gray-100 text-gray-500';
  };

  if (!analysis || !analysis.stats || !analysis.results) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
          <Upload className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">No data uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Go to the Upload tab to add your first CSV report</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { key: 'dynamic-t7', label: 'Dynamic (T-7)', value: analysis.stats.dynamicT7 || 0, sub: 'Within 7 days', color: 'text-sky-600', border: 'border-sky-200', bg: 'bg-sky-50' },
    { key: 'dynamic-t1', label: 'Dynamic (T-1)', value: analysis.stats.dynamicT1 || 0, sub: 'Same day', color: 'text-cyan-600', border: 'border-cyan-200', bg: 'bg-cyan-50' },
    { key: 'new', label: 'New PACS', value: analysis.stats.newPACS || 0, sub: 'Started today', color: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50' },
    { key: 'consistent', label: 'Consistent', value: analysis.stats.consistentPACS || 0, sub: 'Ongoing', color: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50' },
    { key: 'dropped', label: 'Dropped', value: analysis.stats.droppedPACS || 0, sub: 'Lost', color: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50', reportBtn: true },
  ];

  const districtStats = getDistrictStats();
  const data = filteredData();

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            onClick={() => setFilterCategory(filterCategory === card.key ? 'all' : card.key)}
            className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm ${
              filterCategory === card.key ? card.border + ' shadow-sm' : 'border-gray-100'
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${card.color}`}>{card.label}</p>
            <p className={`text-3xl font-bold ${card.color} mb-1`}>{card.value}</p>
            <p className="text-xs text-gray-400">{card.sub}</p>
            {card.reportBtn && (
              <button
                onClick={(e) => { e.stopPropagation(); generateDroppedPACSReport(); }}
                disabled={!card.value}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg py-1.5 transition-colors"
              >
                <FileText className="w-3 h-3" />
                PDF Report
              </button>
            )}
          </div>
        ))}
      </div>

      {/* District Stats (when filtered) */}
      {districtStats && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <p className="text-sm font-semibold text-gray-900 mb-4">
            {filterDistrict} District
            <span className="text-xs font-normal text-gray-400 ml-2">({districtStats.total} total PACS)</span>
          </p>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'T-7', value: districtStats.dynamicT7, cls: 'bg-sky-50 text-sky-700' },
              { label: 'T-1', value: districtStats.dynamicT1, cls: 'bg-cyan-50 text-cyan-700' },
              { label: 'New', value: districtStats.newPACS, cls: 'bg-emerald-50 text-emerald-700' },
              { label: 'Consistent', value: districtStats.consistentPACS, cls: 'bg-amber-50 text-amber-700' },
              { label: 'Dropped', value: districtStats.droppedPACS, cls: 'bg-red-50 text-red-700' },
              { label: 'Inactive', value: districtStats.inactive, cls: 'bg-gray-50 text-gray-500' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-lg p-3 ${cls}`}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 opacity-70">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 mr-2">Results</p>

          {/* Category pills */}
          {[
            { val: 'all', label: 'All' },
            { val: 'dynamic-t7', label: 'T-7' },
            { val: 'dynamic-t1', label: 'T-1' },
            { val: 'new', label: 'New' },
            { val: 'consistent', label: 'Consistent' },
            { val: 'dropped', label: 'Dropped' },
            { val: 'inactive', label: 'Inactive' },
          ].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setFilterCategory(val)}
              className={`text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md border transition-colors ${
                filterCategory === val
                  ? "bg-gray-900 text-white border-gray-900"
                  : "text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="w-px bg-gray-200 mx-1" />

          {/* District select */}
          <select
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2.5 py-1 text-gray-600 bg-white hover:border-gray-400 transition-colors"
          >
            <option value="all">All Districts</option>
            {(analysis.districts || []).map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Search */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2.5 py-1 ml-auto">
            <Search className="w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search PACS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs outline-none w-36 text-gray-700 placeholder-gray-400"
            />
          </div>

          <span className="text-[10px] text-gray-400 self-center">{data.length} PACS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {['PACS Name', 'District', 'Category', 'Last Day End', null].map((col, i) => (
                  col === null ? (
                    <th
                      key="days"
                      onClick={() => setSortDaysAgo(sortDaysAgo === null ? 'asc' : sortDaysAgo === 'asc' ? 'desc' : null)}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    >
                      <span className="flex items-center gap-1">
                        Days Ago
                        <span className="text-[10px]">{sortDaysAgo === 'asc' ? '↑' : sortDaysAgo === 'desc' ? '↓' : '⇅'}</span>
                      </span>
                    </th>
                  ) : (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{col}</th>
                  )
                ))}
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 200).map((p, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelectedPACS(p); setIsTimelineDialogOpen(true); }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.district}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getCategoryBadgeStyle(p.category)}`}>
                      {p.categoryLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.lastDayEndDate || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.daysSinceLastDayEnd === 0 ? 'Today' : p.daysSinceLastDayEnd !== null ? `${p.daysSinceLastDayEnd}d` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs">
                    {p.category === 'new' ? 'First appearance in T-7' :
                     p.category === 'consistent' ? 'Continuing from previous day' :
                     p.category === 'dropped' ? 'Previously in T-7, now inactive' :
                     p.category === 'inactive' ? `Last activity >7 days ago` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No PACS found · Try adjusting your filters</p>
          </div>
        )}
        {data.length > 200 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
            Showing first 200 of {data.length.toLocaleString()} PACS
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload Tab ───────────────────────────────────────────────────────────────

function UploadTab({
  selectedDate, setSelectedDate, todayFile, setTodayFile, loading, error, setError,
  analysis, setAnalysis, handleAnalyze, handleFileChange, handleBulkUpload, allSnapshots
}) {
  return (
    <div className="space-y-5 max-w-2xl">
      {!analysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">Welcome to PACS Analytics</p>
          <p className="text-xs text-blue-600">Upload your first CSV report to start tracking Dynamic Day End activity.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-semibold text-gray-900">Upload Options</p>
          <div className="flex gap-2">
            <label className="text-xs cursor-pointer border border-blue-200 bg-blue-50 text-blue-700 rounded-md px-3 py-1.5 hover:bg-blue-100 transition-colors font-medium">
              Bulk Upload
              <input type="file" accept=".csv" multiple onChange={handleBulkUpload} disabled={loading} className="hidden" />
            </label>
            {analysis && (
              <button
                onClick={() => { setAnalysis(null); setTodayFile(null); }}
                className="text-xs border border-red-200 bg-red-50 text-red-700 rounded-md px-3 py-1.5 hover:bg-red-100 transition-colors font-medium"
              >
                Clear Data
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Snapshot Date</label>
            <input
              type="date"
              value={selectedDate || ''}
              onChange={async (e) => {
                const newDate = e?.target?.value;
                if (!newDate) return;
                setSelectedDate(newDate);
                setError(null);
                try {
                  const response = await fetch(`/api/pacs-analytics/daily?date=${newDate}`);
                  const result = await response.json();
                  if (result.data && result.data.results) {
                    setAnalysis(result.data);
                  } else {
                    setAnalysis(null);
                  }
                } catch {
                  setAnalysis(null);
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-400 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1">Date of the CoopsIndia report</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">CSV File</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-10 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all">
              <div className="text-3xl mb-3">📄</div>
              <p className="text-sm font-medium text-gray-700">{todayFile ? todayFile.name : 'Click to select CSV file'}</p>
              <p className="text-xs text-gray-400 mt-1">{todayFile ? 'File ready to analyze' : 'or drag and drop here'}</p>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!todayFile || loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing…' : 'Analyze & Save'}
          </button>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠ {error}
            </div>
          )}
        </div>
      </div>

      {allSnapshots.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <p className="text-sm font-semibold text-gray-900 mb-3">Upload History
            <span className="text-xs font-normal text-gray-400 ml-2">({allSnapshots.length} days)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {allSnapshots.map((s) => (
              <span key={s.date} className="text-xs px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-gray-600">
                {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trends Tab ───────────────────────────────────────────────────────────────

function TrendsTab({ allSnapshots, analysis, getTrendData, trendDistrict, setTrendDistrict, trendCategories, setTrendCategories }) {
  if (allSnapshots.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-sm text-gray-400">Upload at least 2 days of data to view trends</p>
      </div>
    );
  }

  const trendData = getTrendData();
  const latest = trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const earliest = trendData.length > 0 ? trendData[0] : null;

  return (
    <div className="space-y-5">
      {/* Summary row */}
      {latest && earliest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'T-7 Change', val: latest['T-7'] - earliest['T-7'], color: latest['T-7'] >= earliest['T-7'] ? 'text-emerald-600' : 'text-red-500' },
            { label: 'T-1 Change', val: latest['T-1'] - earliest['T-1'], color: latest['T-1'] >= earliest['T-1'] ? 'text-emerald-600' : 'text-red-500' },
            { label: 'New Today', val: latest['New'], color: 'text-emerald-600' },
            { label: 'Dropped Today', val: latest['Dropped'], color: 'text-red-500' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{val >= 0 ? `+${val}` : val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">PACS Activity Trends</p>
            <p className="text-xs text-gray-400 mt-0.5">Last {trendData.length} days of historical data</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">District</label>
              <select
                value={trendDistrict}
                onChange={(e) => setTrendDistrict(e.target.value)}
                className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-600 bg-white"
              >
                <option value="all">All Districts</option>
                {analysis && analysis.results && [...new Set(analysis.results.map(p => p.district))].sort().map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Categories</label>
              <select
                multiple
                value={trendCategories}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, o => o.value);
                  setTrendCategories(selected.length > 0 ? selected : ['all']);
                }}
                className="text-xs border border-gray-200 rounded-md px-2.5 py-1 text-gray-600 bg-white h-20"
              >
                <option value="all">All</option>
                <option value="T-7">T-7</option>
                <option value="T-1">T-1</option>
                <option value="New">New PACS</option>
                <option value="Consistent">Consistent</option>
                <option value="Dropped">Dropped</option>
                <option value="Inactive">Inactive</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-0.5">Ctrl/Cmd to multi-select</p>
            </div>
          </div>
        </div>

        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" style={{ fontSize: '11px' }} stroke="#9ca3af" />
              <YAxis style={{ fontSize: '11px' }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {(trendCategories.includes('all') || trendCategories.includes('T-7')) && <Line type="monotone" dataKey="T-7" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} activeDot={{ r: 5 }} />}
              {(trendCategories.includes('all') || trendCategories.includes('T-1')) && <Line type="monotone" dataKey="T-1" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} activeDot={{ r: 5 }} />}
              {(trendCategories.includes('all') || trendCategories.includes('New')) && <Line type="monotone" dataKey="New" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />}
              {(trendCategories.includes('all') || trendCategories.includes('Consistent')) && <Line type="monotone" dataKey="Consistent" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} />}
              {(trendCategories.includes('all') || trendCategories.includes('Dropped')) && <Line type="monotone" dataKey="Dropped" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} activeDot={{ r: 5 }} />}
              {(trendCategories.includes('all') || trendCategories.includes('Inactive')) && <Line type="monotone" dataKey="Inactive" stroke="#9ca3af" strokeWidth={2} dot={{ fill: '#9ca3af', r: 3 }} activeDot={{ r: 5 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ allSnapshots }) {
  const defs = [
    { color: '#0ea5e9', label: 'Dynamic Day End (T-7)', desc: 'Last day-end within last 7 days (including snapshot date)' },
    { color: '#06b6d4', label: 'Dynamic Day End (T-1)', desc: 'Last day-end equals snapshot date (most current)' },
    { color: '#10b981', label: 'New PACS', desc: 'Not in T-7 yesterday, but performed day-end today' },
    { color: '#f59e0b', label: 'Consistent PACS', desc: 'In T-7 list on both current and previous day' },
    { color: '#ef4444', label: 'Dropped PACS', desc: 'Were in T-7 yesterday, but not in current list' },
    { color: '#9ca3af', label: 'Inactive (>T-7)', desc: 'Last day-end more than 7 days old' },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="text-sm font-semibold text-gray-900 mb-4">Category Definitions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defs.map(({ color, label, desc }) => (
            <div key={label} className="flex gap-3">
              <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} />
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <p className="text-sm font-semibold text-gray-900 mb-3">System Info</p>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md font-medium">
            ☁ Cloud Database (Redis) — syncs across devices
          </span>
          {allSnapshots.length > 0 && (
            <span className="text-xs px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-md font-medium">
              {allSnapshots.length} day{allSnapshots.length !== 1 ? 's' : ''} of data stored
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

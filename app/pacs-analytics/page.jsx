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
  DialogTrigger,
} from "@/components/ui/dialog";

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

    return analysis.results.filter(p => {
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
  };

  if (initialLoading) {
    console.log('Rendering loading screen...');
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #111',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading PACS Analytics...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
      const stats = snapshot.data?.stats || {};
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
    if (!analysis || !analysis.results) return;

    // Filter for dropped PACS only
    const droppedPACS = analysis.results.filter(p => p.category === 'dropped');

    if (droppedPACS.length === 0) {
      alert('No dropped PACS to report');
      return;
    }

    try {
      // Dynamically import jsPDF (client-side only)
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');

      const doc = new jsPDF();
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

      doc.autoTable({
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

      doc.autoTable({
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
      const fileName = `Dropped_PACS_Report_${analysis.snapshotDate}.pdf`;
      doc.save(fileName);

      alert(`Report generated successfully!\nFile: ${fileName}\nTotal Dropped PACS: ${droppedPACS.length}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please check the console for details.');
    }
  };

  console.log('Rendering main page, analysis:', analysis);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Back to Dashboard Link */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <span style={{ fontSize: '16px' }}>←</span>
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#111' }}>
                PACS Analytics (T-7 Classification)
              </h1>
              <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '0' }}>
                Track Dynamic Day End activity and PACS status changes
              </p>
            </div>

            {/* Snapshot Date Box */}
            {analysis && analysis.snapshotDate && (
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                minWidth: '220px'
              }}>
                <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px', fontWeight: '500' }}>
                  📅 Snapshot Date
                </p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#15803d', margin: '0' }}>
                  {new Date(analysis.snapshotDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Collapsible Info Section */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            marginBottom: '12px',
            overflow: 'hidden'
          }}>
            {/* Accordion Header */}
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              style={{
                width: '100%',
                padding: '16px 20px',
                backgroundColor: isInfoExpanded ? '#f9fafb' : 'white',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px' }}>ℹ️</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', textAlign: 'left' }}>
                    Pattern Definitions & Upload History
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', textAlign: 'left' }}>
                    {isInfoExpanded ? 'Click to hide' : (allSnapshots.length > 0 ? `Click to view category definitions and ${allSnapshots.length} upload${allSnapshots.length !== 1 ? 's' : ''}` : 'Click to view category definitions')}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '20px', color: '#6b7280', transition: 'transform 0.2s', transform: isInfoExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {/* Accordion Content */}
            {isInfoExpanded && (
              <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #e5e7eb' }}>
                {/* Category Definitions */}
                <div style={{ paddingTop: '20px' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📊</span>
                    <span>Category Definitions</span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                    fontSize: '12px',
                    lineHeight: '1.6'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0ea5e9', marginBottom: '4px' }}>
                        💙 Dynamic Day End (T-7)
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        Last day-end within last 7 days (including snapshot date)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#06b6d4', marginBottom: '4px' }}>
                        🔵 Dynamic Day End (T-1)
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        Last day-end equals snapshot date (most current)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>
                        🟢 New PACS
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        Not in T-7 yesterday, but performed day-end today
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>
                        🟡 Consistent PACS
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        In T-7 list on both current and previous day
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#ef4444', marginBottom: '4px' }}>
                        🔴 Dropped PACS
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        Were in T-7 yesterday, but not in current list
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#9ca3af', marginBottom: '4px' }}>
                        ⚪ Inactive ({'>'}T-7)
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        Last day-end more than 7 days old
                      </div>
                    </div>
                  </div>
                </div>

                {/* Database Info */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px',
                    display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    <span>☁️</span>
                    <span style={{ fontWeight: '500' }}>Using Cloud Database (Redis) - Syncs Across Devices</span>
                  </div>

                  {allSnapshots.length > 0 && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#ede9fe', borderRadius: '6px',
                      display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b21a8', border: '1px solid #c4b5fd' }}>
                      <span>📅</span>
                      <span style={{ fontWeight: '500' }}>{allSnapshots.length} day{allSnapshots.length !== 1 ? 's' : ''} of data uploaded</span>
                    </div>
                  )}
                </div>

                {/* Upload History */}
                {allSnapshots.length > 0 && (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📅</span>
                      <span>Upload History ({allSnapshots.length} days)</span>
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {allSnapshots.map((snapshot) => (
                        <div
                          key={snapshot.date}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span>
                            {new Date(snapshot.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info message if no data */}
        {!analysis && (
          <div style={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1565c0' }}>
              ℹ️ Welcome to PACS Analytics (T-7 Classification)
            </div>
            <div style={{ color: '#1976d2' }}>
              Upload your first CSV report below to start tracking Dynamic Day End activity and PACS status changes.
            </div>
          </div>
        )}

        {/* Upload Section - Collapsible */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          marginBottom: '24px',
          overflow: 'hidden'
        }}>
          {/* Accordion Header */}
          <button
            onClick={() => setIsUploadExpanded(!isUploadExpanded)}
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: isUploadExpanded ? '#f9fafb' : 'white',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>📤</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', textAlign: 'left' }}>
                  Upload CSV Report
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', textAlign: 'left' }}>
                  {isUploadExpanded ? 'Click to hide upload section' : 'Click to upload or analyze CSV reports'}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '20px', color: '#6b7280', transition: 'transform 0.2s', transform: isUploadExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>

          {/* Accordion Content */}
          {isUploadExpanded && (
            <div style={{ padding: '32px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Upload Options</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{
                    padding: '8px 16px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    border: '1px solid #93c5fd',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'inline-block'
                  }}>
                    📦 Bulk Upload (Multiple Files)
                    <input
                      type="file"
                      accept=".csv"
                      multiple
                      onChange={handleBulkUpload}
                      disabled={loading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {analysis && (
                    <button
                      onClick={() => {
                        setAnalysis(null);
                        setTodayFile(null);
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setSelectedDate(yesterday.toISOString().split('T')[0]);
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      🗑️ Clear & Upload New
                    </button>
                  )}
                </div>
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Snapshot Date (Report Date)
              </label>
              <input
                type="date"
                value={selectedDate || ''}
                onChange={async (e) => {
                  const newDate = e?.target?.value;

                  if (!newDate) {
                    console.log('⚠️ No date selected');
                    return;
                  }

                  console.log('📅 Date changed to:', newDate);
                  setSelectedDate(newDate);
                  setError(null);

                  // Try to load snapshot for this date
                  try {
                    const response = await fetch(`/api/pacs-analytics/daily?date=${newDate}`);
                    const result = await response.json();

                    if (result.data && result.data.results) {
                      console.log('✅ Loaded snapshot for', newDate);
                      setAnalysis(result.data);
                    } else {
                      console.log('ℹ️ No snapshot found for', newDate);
                      setAnalysis(null);
                    }
                  } catch (err) {
                    console.error('Error loading snapshot for date:', err);
                    setAnalysis(null);
                  }
                }}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                Date of the CoopsIndia report (data captured till this date)
              </p>
            </div>

            <label style={{ display: 'block', border: '2px dashed #d1d5db', borderRadius: '12px', padding: '32px',
              textAlign: 'center', cursor: 'pointer', marginBottom: '20px', backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '6px' }}>
                {todayFile ? todayFile.name : 'Click to select CSV file'}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {todayFile ? 'File ready to analyze' : 'Or drag and drop here'}
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={handleAnalyze}
              disabled={!todayFile || loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: todayFile && !loading ? '#111' : '#e5e7eb',
                color: todayFile && !loading ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: todayFile && !loading ? 'pointer' : 'not-allowed'
              }}>
              {loading ? 'Analyzing...' : 'Analyze & Show Results'}
            </button>

            {error && (
              <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}
            </div>
          )}
        </div>

        {/* Trend Chart Section - Collapsible */}
        {allSnapshots.length >= 2 && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            marginBottom: '24px',
            overflow: 'hidden'
          }}>
            {/* Accordion Header */}
            <button
              onClick={() => setIsTrendExpanded(!isTrendExpanded)}
              style={{
                width: '100%',
                padding: '16px 20px',
                backgroundColor: isTrendExpanded ? '#f9fafb' : 'white',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px' }}>📈</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', textAlign: 'left' }}>
                    Trend Analysis
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', textAlign: 'left' }}>
                    {isTrendExpanded ? 'Click to hide trend charts' : `View ${allSnapshots.length} days of historical trends`}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '20px', color: '#6b7280', transition: 'transform 0.2s', transform: isTrendExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {/* Accordion Content */}
            {isTrendExpanded && (
              <div style={{ padding: '32px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>
                    PACS Activity Trends (Last {getTrendData().length} Days)
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>
                    Track how PACS classifications change over time to identify patterns and trends
                  </p>
                </div>

                {/* Chart */}
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getTrendData()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        style={{ fontSize: '12px' }}
                        stroke="#6b7280"
                      />
                      <YAxis
                        style={{ fontSize: '12px' }}
                        stroke="#6b7280"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="T-7"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ fill: '#0ea5e9', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="T-1"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={{ fill: '#06b6d4', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="New"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Consistent"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Dropped"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Stats */}
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px'
                }}>
                  {getTrendData().length > 0 && (() => {
                    const latest = getTrendData()[getTrendData().length - 1];
                    const earliest = getTrendData()[0];

                    return (
                      <>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>T-7 Change</div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: latest['T-7'] >= earliest['T-7'] ? '#10b981' : '#ef4444' }}>
                            {latest['T-7'] >= earliest['T-7'] ? '+' : ''}{latest['T-7'] - earliest['T-7']}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>T-1 Change</div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: latest['T-1'] >= earliest['T-1'] ? '#10b981' : '#ef4444' }}>
                            {latest['T-1'] >= earliest['T-1'] ? '+' : ''}{latest['T-1'] - earliest['T-1']}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>New PACS Trend</div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
                            {latest['New']} today
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Dropped Trend</div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>
                            {latest['Dropped']} today
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {analysis && analysis.stats && analysis.results && (
          <div>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div
                onClick={() => setFilterCategory('dynamic-t7')}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  border: '2px solid #bae6fd',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}>
                <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                  💙 DYNAMIC (T-7)
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0ea5e9', marginBottom: '4px' }}>
                  {analysis.stats?.dynamicT7 || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#0369a1' }}>Within 7 days</div>
              </div>

              <div
                onClick={() => setFilterCategory('dynamic-t1')}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  border: '2px solid #a5f3fc',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}>
                <div style={{ fontSize: '11px', color: '#0891b2', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                  🔵 DYNAMIC (T-1)
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#06b6d4', marginBottom: '4px' }}>
                  {analysis.stats?.dynamicT1 || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#0e7490' }}>Same day</div>
              </div>

              <div
                onClick={() => setFilterCategory('new')}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  border: '2px solid #bbf7d0',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                  🟢 NEW PACS
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                  {analysis.stats?.newPACS || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#15803d' }}>Started today</div>
              </div>

              <div
                onClick={() => setFilterCategory('consistent')}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  border: '2px solid #fed7aa',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}>
                <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                  🟡 CONSISTENT
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
                  {analysis.stats?.consistentPACS || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#c2410c' }}>Ongoing</div>
              </div>

              <div
                onClick={() => setFilterCategory('dropped')}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  border: '2px solid #fecaca',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                  🔴 DROPPED
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>
                  {analysis.stats?.droppedPACS || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '12px' }}>Lost</div>

                {/* Generate Report Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the filter
                    generateDroppedPACSReport();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  disabled={!analysis.stats?.droppedPACS || analysis.stats.droppedPACS === 0}
                  title="Generate PDF report for dropped PACS"
                >
                  <span>📄</span>
                  <span>Generate Report</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search PACS name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '11px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />

              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                style={{
                  padding: '11px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minWidth: '160px',
                  backgroundColor: 'white',
                  color: '#111'
                }}>
                <option value="all">All Districts</option>
                {(analysis.districts || []).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: '11px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minWidth: '180px',
                  backgroundColor: 'white',
                  color: '#111'
                }}>
                <option value="all">All Categories</option>
                <option value="dynamic-t1">🔵 Dynamic (T-1)</option>
                <option value="dynamic-t7">💙 Dynamic (T-7)</option>
                <option value="new">🟢 New PACS</option>
                <option value="consistent">🟡 Consistent</option>
                <option value="dropped">🔴 Dropped</option>
                <option value="inactive">⚪ Inactive ({'>'}T-7)</option>
              </select>
            </div>

            {/* District Statistics */}
            {getDistrictStats() && (
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '16px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📊</span>
                  <span>{filterDistrict} District Statistics</span>
                  <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280' }}>
                    ({getDistrictStats().total} total PACS)
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px'
                }}>
                  {/* T-7 */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '8px',
                    border: '1px solid #93c5fd'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#1e40af', marginBottom: '4px' }}>
                      💙 Dynamic (T-7)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#1e40af' }}>
                      {getDistrictStats().dynamicT7}
                    </div>
                  </div>

                  {/* T-1 */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#cffafe',
                    borderRadius: '8px',
                    border: '1px solid #67e8f9'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#0e7490', marginBottom: '4px' }}>
                      🔵 Dynamic (T-1)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#0e7490' }}>
                      {getDistrictStats().dynamicT1}
                    </div>
                  </div>

                  {/* New PACS */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '8px',
                    border: '1px solid #6ee7b7'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#047857', marginBottom: '4px' }}>
                      🟢 New PACS
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#047857' }}>
                      {getDistrictStats().newPACS}
                    </div>
                  </div>

                  {/* Consistent */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #fcd34d'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#92400e', marginBottom: '4px' }}>
                      🟡 Consistent
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#92400e' }}>
                      {getDistrictStats().consistentPACS}
                    </div>
                  </div>

                  {/* Dropped */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#991b1b', marginBottom: '4px' }}>
                      🔴 Dropped
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#991b1b' }}>
                      {getDistrictStats().droppedPACS}
                    </div>
                  </div>

                  {/* Inactive */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#4b5563', marginBottom: '4px' }}>
                      ⚪ Inactive ({'>'}T-7)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#4b5563' }}>
                      {getDistrictStats().inactive}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}>
                        PACS NAME
                      </th>
                      <th style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}>
                        DISTRICT
                      </th>
                      <th style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}>
                        CATEGORY
                      </th>
                      <th style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}>
                        LAST DAY END
                      </th>
                      <th style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}>
                        DAYS AGO
                      </th>
                      <th style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase'
                      }}>
                        REASON
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData().slice(0, 200).map((p, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: '#111', fontWeight: '500' }}>
                          <button
                            onClick={() => {
                              setSelectedPACS(p);
                              setIsTimelineDialogOpen(true);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontWeight: '500',
                              fontSize: '14px',
                              padding: '0',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#1e40af'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#2563eb'}
                          >
                            {p.name}
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {p.district}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor:
                              p.category === 'dynamic-t1' ? '#cffafe' :
                              p.category === 'dynamic-t7' ? '#e0f2fe' :
                              p.category === 'new' ? '#dcfce7' :
                              p.category === 'consistent' ? '#fef3c7' :
                              p.category === 'dropped' ? '#fee2e2' : '#f3f4f6',
                            color:
                              p.category === 'dynamic-t1' ? '#0e7490' :
                              p.category === 'dynamic-t7' ? '#0369a1' :
                              p.category === 'new' ? '#15803d' :
                              p.category === 'consistent' ? '#d97706' :
                              p.category === 'dropped' ? '#dc2626' : '#6b7280'
                          }}>
                            {p.categoryLabel}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {p.lastDayEndDate || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {p.daysSinceLastDayEnd === 0 ? 'Today' :
                           p.daysSinceLastDayEnd !== null ? `${p.daysSinceLastDayEnd} days` : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {(() => {
                            // Check secondary categories first (New, Consistent, Dropped)
                            // These have more specific reasons than the primary categories

                            // New PACS
                            if (p.category === 'new') {
                              return 'First appearance in Dynamic T-7 (day-end today)';
                            }

                            // Consistent PACS
                            if (p.category === 'consistent') {
                              return 'Continuing activity from previous day';
                            }

                            // Dropped PACS
                            if (p.category === 'dropped') {
                              return 'Previously in T-7, now inactive';
                            }

                            // Inactive PACS
                            if (p.category === 'inactive') {
                              const daysText = p.daysSinceLastDayEnd !== null ?
                                `${p.daysSinceLastDayEnd} days ago` : 'unknown';
                              return `Last activity >7 days ago (${daysText})`;
                            }

                            // Dynamic T-7 or T-1 PACS (without secondary classification)
                            if (p.isDynamicT7 || p.isDynamicT1) {
                              const daysText = p.daysSinceLastDayEnd === 0 ? 'today' :
                                               p.daysSinceLastDayEnd === 1 ? '1 day ago' :
                                               `${p.daysSinceLastDayEnd} days ago`;
                              return `Day-end on ${p.lastDayEndDate || 'unknown date'} (${daysText})`;
                            }

                            return '—';
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredData().length === 0 && (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#9ca3af' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#6b7280' }}>No PACS found</div>
                  <div style={{ fontSize: '13px', marginTop: '6px' }}>Try adjusting your filters</div>
                </div>
              )}

              {filteredData().length > 200 && (
                <div style={{
                  padding: '14px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                  borderTop: '1px solid #e5e7eb',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Showing first 200 of {filteredData().length.toLocaleString()} PACS
                </div>
              )}
            </div>
          </div>
        )}

        {/* PACS Timeline Dialog */}
        <Dialog open={isTimelineDialogOpen} onOpenChange={setIsTimelineDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {selectedPACS?.name || 'PACS Timeline'}
              </DialogTitle>
              <DialogDescription>
                {selectedPACS?.district && `District: ${selectedPACS.district} • `}
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
                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Current Status</div>
                      <div className="text-sm font-semibold" style={{ color: getCategoryColor(stats.currentStatus.category) }}>
                        {stats.currentStatus.categoryLabel}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Active Days</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {stats.activeDays}/{stats.totalDays}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Current Streak</div>
                      <div className="text-lg font-semibold text-green-600">
                        {stats.currentStreak} days
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Longest Streak</div>
                      <div className="text-lg font-semibold text-purple-600">
                        {stats.longestStreak} days
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Status Changes</div>
                      <div className="text-lg font-semibold text-amber-600">
                        {stats.statusChanges}
                      </div>
                    </div>
                  </div>

                  {/* Visual Timeline */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
                    <div className="flex gap-1 overflow-x-auto pb-2">
                      {timeline.map((day, index) => (
                        <div
                          key={index}
                          className="relative group flex-shrink-0"
                          style={{
                            width: '32px',
                            height: '80px',
                            backgroundColor: getCategoryColor(day.category),
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            <div className="font-semibold">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            <div>{day.categoryLabel}</div>
                            {day.lastDayEnd && <div className="text-gray-300">Last: {day.lastDayEnd}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Status Legend</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div style={{ width: '20px', height: '20px', backgroundColor: getCategoryColor('dynamic-t1'), borderRadius: '4px' }}></div>
                        <span>Dynamic (T-1)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '20px', height: '20px', backgroundColor: getCategoryColor('dynamic-t7'), borderRadius: '4px' }}></div>
                        <span>Dynamic (T-7)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '20px', height: '20px', backgroundColor: getCategoryColor('new'), borderRadius: '4px' }}></div>
                        <span>New PACS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '20px', height: '20px', backgroundColor: getCategoryColor('consistent'), borderRadius: '4px' }}></div>
                        <span>Consistent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '20px', height: '20px', backgroundColor: getCategoryColor('dropped'), borderRadius: '4px' }}></div>
                        <span>Dropped</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '20px', height: '20px', backgroundColor: getCategoryColor('inactive'), borderRadius: '4px' }}></div>
                        <span>Inactive</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Change Log */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {timeline.slice().reverse().slice(0, 10).map((day, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center gap-3">
                            <div style={{ width: '12px', height: '12px', backgroundColor: getCategoryColor(day.category), borderRadius: '2px' }}></div>
                            <span className="text-gray-600">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium" style={{ color: getCategoryColor(day.category) }}>
                              {day.categoryLabel}
                            </span>
                            {day.lastDayEnd && (
                              <span className="text-xs text-gray-500">
                                Last: {day.lastDayEnd}
                              </span>
                            )}
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
    </div>
  );
}

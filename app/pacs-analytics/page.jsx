"use client";
import React, { useState, useEffect } from 'react';

export default function PACSAnalytics() {
  const [selectedDate, setSelectedDate] = useState('');
  const [todayFile, setTodayFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    loadLatestAnalysis();
  }, []);

  const loadLatestAnalysis = async () => {
    try {
      const response = await fetch('/api/pacs-analytics/daily');
      const result = await response.json();

      console.log('API Response:', result);

      if (result.data && result.data.length > 0) {
        const latest = result.data[0];
        console.log('Latest snapshot:', latest);
        if (latest && latest.data) {
          const data = latest.data;

          // Check if this is old data structure (has 'changes' instead of 'results')
          if (data.changes && !data.results) {
            console.log('Old data structure detected, skipping load. Please upload new CSV.');
            // Don't set analysis - let user upload fresh data
          } else if (data.results && data.stats) {
            // New data structure
            setAnalysis(data);
            console.log('Analysis set (new structure):', data);
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
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const parseDateString = (dateStr) => {
    // Handle different date formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
    if (!dateStr) return null;

    // Try DD-MM-YYYY or DD/MM/YYYY format (common in Indian data)
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const [first, second, third] = parts;

      // If third part is 4 digits, it's likely YYYY
      if (third.length === 4) {
        // DD-MM-YYYY format
        return new Date(third, second - 1, first);
      } else if (first.length === 4) {
        // YYYY-MM-DD format
        return new Date(first, second - 1, third);
      }
    }

    // Fallback to default parsing
    return new Date(dateStr);
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
      const prevResponse = await fetch(`/api/pacs-analytics/daily?date=${prevDateStr}`);
      const prevResult = await prevResponse.json();
      const previousSnapshot = prevResult.data || null;
      const previousResults = previousSnapshot?.results || null;

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

        // Check Dynamic Day End T-7 (within last 7 days)
        const isDynamicT7 = daysSince >= 0 && daysSince <= 7;

        // Check Dynamic Day End T-1 (same as snapshot date)
        const isDynamicT1 = daysSince === 0;

        if (isDynamicT7) {
          stats.dynamicT7++;

          if (isDynamicT1) {
            stats.dynamicT1++;
            category = 'dynamic-t1';
            categoryLabel = 'Dynamic Day End (T-1)';
          } else {
            category = 'dynamic-t7';
            categoryLabel = 'Dynamic Day End (T-7)';
          }

          // Check if New or Consistent
          if (previousResults) {
            const prevPacsResult = previousResults.find(p => p.id === pacsId);
            const wasDynamicT7Yesterday = prevPacsResult && prevPacsResult.isDynamicT7;

            if (!wasDynamicT7Yesterday) {
              category = 'new';
              categoryLabel = 'New PACS';
              stats.newPACS++;
            } else {
              category = 'consistent';
              categoryLabel = 'Consistent PACS';
              stats.consistentPACS++;
            }
          }
        } else {
          category = 'inactive';
          categoryLabel = 'Inactive (>T-7)';
        }

        results.push({
          ...pacs,
          category,
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
              if (currentDaysSince > 7) {
                // PACS was in T-7 yesterday but is now outside T-7
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

  const filteredData = () => {
    if (!analysis) return [];

    return analysis.results.filter(p => {
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDistrict = filterDistrict === 'all' || p.district === filterDistrict;
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;

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

  console.log('Rendering main page, analysis:', analysis);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#111' }}>
            PACS Analytics (T-7 Classification)
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '16px' }}>
            Track Dynamic Day End activity and PACS status changes
          </p>

          {/* Category Definitions */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '12px'
          }}>
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
                  Last day-end within 7 days of snapshot date
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

          <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px',
            display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#15803d', border: '1px solid #bbf7d0' }}>
            <span>☁️</span>
            <span style={{ fontWeight: '500' }}>Using Cloud Database (Redis) - Syncs Across Devices</span>
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

        {/* Upload Section */}
        {(!analysis || !analysis.stats || !analysis.results) && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', backgroundColor: 'white', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Upload CSV Report</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Snapshot Date (Report Date)
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setError(null);
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

        {/* Results */}
        {analysis && analysis.stats && analysis.results && (
          <div>
            {/* Top action bar */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{
                flex: '1',
                minWidth: '250px',
                padding: '16px 20px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px'
              }}>
                <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px', fontWeight: '500' }}>
                  📅 Snapshot Date
                </p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#15803d' }}>
                  {analysis.snapshotDate ? new Date(analysis.snapshotDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>

              <button
                onClick={() => {
                  setAnalysis(null);
                  setTodayFile(null);
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setError(null);
                  setFilterCategory('all');
                  setSearchTerm('');
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#111',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                <span>📤</span>
                <span>Upload New CSV</span>
              </button>
            </div>

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
                <div style={{ fontSize: '12px', color: '#b91c1c' }}>Lost</div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData().slice(0, 200).map((p, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: '#111', fontWeight: '500' }}>
                          {p.name}
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
      </div>
    </div>
  );
}

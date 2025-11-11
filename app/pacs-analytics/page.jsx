"use client";
import React, { useState, useEffect } from 'react';

export default function PACSPattern() {
  const [mode, setMode] = useState('setup');
  const [setupFiles, setSetupFiles] = useState([]);
  const [todayFile, setTodayFile] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [baseline, setBaseline] = useState(null);
  const [dailyAnalysis, setDailyAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPattern, setFilterPattern] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');

  useEffect(() => {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);

    // Load baseline from API
    const loadBaseline = async () => {
      try {
        const response = await fetch('/api/pacs-analytics/baseline');
        const result = await response.json();

        if (result.data) {
          // Reconstruct baseline object from saved data
          const baseline = {
            pacsPatterns: result.data.patterns,
            stats: result.data.stats,
            districts: result.data.districts,
            dateRange: result.data.dateRange
          };
          setBaseline(baseline);
          setMode('daily');

          // Load latest daily analysis (if any)
          loadLatestDailyAnalysis();
        }
      } catch (err) {
        console.error('Load error:', err);
      }
    };

    loadBaseline();
  }, []);

  const loadLatestDailyAnalysis = async () => {
    try {
      const response = await fetch('/api/pacs-analytics/daily');
      const result = await response.json();

      if (result.data && result.data.length > 0) {
        // Get the most recent daily analysis
        const latest = result.data[0];
        if (latest && latest.data) {
          setDailyAnalysis(latest.data);
        }
      }
    } catch (err) {
      console.error('Error loading latest daily analysis:', err);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Empty or invalid CSV');
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const data = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const pacsId = values[headers.indexOf('PACS ID')];
      if (pacsId) {
        data[pacsId] = {
          id: pacsId,
          name: values[headers.indexOf('PACS Name')] || '',
          district: values[headers.indexOf('District Name')] || '',
          lastDayEnd: values[headers.indexOf('Last Day End Date')] || ''
        };
      }
    }
    
    if (Object.keys(data).length === 0) {
      throw new Error('No valid PACS data found in CSV');
    }
    
    return data;
  };

  const wasActiveOnDay = (lastDayEndStr, dayDate) => {
    if (!lastDayEndStr) return false;
    try {
      const lastDate = new Date(lastDayEndStr);
      const daysSince = Math.floor((dayDate - lastDate) / (1000 * 60 * 60 * 24));
      return daysSince <= 1;
    } catch {
      return false;
    }
  };

  const extractDateFromFilename = (filename) => {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const analyzePattern = async (files) => {
    const dailyData = [];
    
    for (let file of files) {
      const text = await file.text();
      const data = parseCSV(text);
      const fileDate = extractDateFromFilename(file.name);
      const date = fileDate ? new Date(fileDate) : new Date();
      dailyData.push({ date, data });
    }

    dailyData.sort((a, b) => a.date - b.date);

    const pacsPatterns = {};
    const allDistricts = new Set();

    Object.keys(dailyData[0].data).forEach(pacsId => {
      const firstDay = dailyData[0].data[pacsId];
      if (!firstDay) return;

      allDistricts.add(firstDay.district);

      let activeDays = 0;
      dailyData.forEach(day => {
        const pacs = day.data[pacsId];
        if (pacs && wasActiveOnDay(pacs.lastDayEnd, day.date)) {
          activeDays++;
        }
      });

      const totalDays = dailyData.length;
      const consistencyRate = (activeDays / totalDays) * 100;
      const hasEverWorked = firstDay.lastDayEnd && firstDay.lastDayEnd.trim() !== '';
      
      let pattern, patternLabel;
      if (!hasEverWorked) {
        pattern = 'never';
        patternLabel = 'Never Started';
      } else if (activeDays === 0) {
        pattern = 'stopped';
        patternLabel = 'Stopped';
      } else if (consistencyRate >= 80) {
        pattern = 'regular';
        patternLabel = 'Regular (Daily)';
      } else if (consistencyRate >= 40) {
        pattern = 'irregular';
        patternLabel = 'Irregular';
      } else {
        pattern = 'stopped';
        patternLabel = 'Stopped';
      }

      pacsPatterns[pacsId] = {
        id: firstDay.id,
        name: firstDay.name,
        district: firstDay.district,
        activeDays,
        totalDays,
        consistencyRate: consistencyRate.toFixed(1),
        pattern,
        patternLabel,
        lastDayEnd: firstDay.lastDayEnd
      };
    });

    const stats = { regular: 0, irregular: 0, stopped: 0, never: 0 };
    Object.values(pacsPatterns).forEach(p => stats[p.pattern]++);

    return {
      pacsPatterns,
      stats,
      districts: Array.from(allDistricts).sort(),
      dateRange: {
        start: dailyData[0].date.toISOString().split('T')[0],
        end: dailyData[dailyData.length - 1].date.toISOString().split('T')[0],
        days: dailyData.length
      }
    };
  };

  const handleSetup = async () => {
    if (setupFiles.length < 2) {
      setError('Please upload at least 2 CSV files');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzePattern(setupFiles);

      // Save baseline to Redis via API
      const baselineData = {
        patterns: result.pacsPatterns,
        stats: result.stats,
        districts: result.districts,
        dateRange: result.dateRange,
        setupDate: new Date().toISOString()
      };

      const response = await fetch('/api/pacs-analytics/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baselineData)
      });

      if (!response.ok) {
        throw new Error('Failed to save baseline to database');
      }

      setBaseline(result);
      setMode('daily');
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateDate = (dateStr) => {
    const selected = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);

    if (selected > today) {
      return 'Cannot upload future dates';
    }

    const daysDiff = Math.floor((today - selected) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      return `Cannot upload data older than 7 days (this is ${daysDiff} days old)`;
    }

    if (baseline && selected < new Date(baseline.dateRange.end)) {
      return `Cannot upload date before baseline end (${baseline.dateRange.end})`;
    }

    return null;
  };

  const handleDailyAnalysis = async () => {
    if (!todayFile) {
      setError('Please select a CSV file');
      return;
    }

    const dateError = validateDate(selectedDate);
    if (dateError) {
      setError(dateError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const todayData = parseCSV(await todayFile.text());
      const analysisDate = new Date(selectedDate);
      const changes = [];

      const stats = {
        total: 0,
        breakingPattern: 0,
        recovering: 0,
        newStops: 0,
        newStarts: 0,
        stoppedRecent: 0
      };

      Object.entries(todayData).forEach(([pacsId, todayPacs]) => {
        const pattern = baseline.pacsPatterns[pacsId];
        if (!pattern) return;

        stats.total++;
        const todayActive = wasActiveOnDay(todayPacs.lastDayEnd, analysisDate);

        let change = '';
        let changeType = 'none';
        let daysSince = null;
        let sinceDate = null;

        if (todayPacs.lastDayEnd) {
          try {
            const lastDate = new Date(todayPacs.lastDayEnd);
            daysSince = Math.floor((analysisDate - lastDate) / (1000 * 60 * 60 * 24));
            sinceDate = lastDate.toISOString().split('T')[0];
          } catch (e) {}
        }

        if (pattern.pattern === 'regular' && !todayActive) {
          change = '⚠️ Regular PACS stopped!';
          changeType = 'breaking';
          stats.breakingPattern++;
        } else if (pattern.pattern === 'stopped' && todayActive) {
          change = '🎉 Stopped PACS recovered!';
          changeType = 'recovering';
          stats.recovering++;
        } else if (!todayActive && pattern.pattern === 'stopped') {
          change = '❌ Still stopped';
          changeType = 'stopped';
          stats.newStops++;
          if (daysSince !== null && daysSince > 0 && daysSince < 15) {
            stats.stoppedRecent++;
          }
        } else if (!todayActive && pattern.pattern === 'irregular') {
          change = '⚠️ Irregular - Not active';
          changeType = 'stopped';
          stats.newStops++;
          if (daysSince !== null && daysSince > 0 && daysSince < 15) {
            stats.stoppedRecent++;
          }
        } else if (todayActive && pattern.pattern !== 'regular') {
          change = '✅ Active today';
          changeType = 'started';
          stats.newStarts++;
        } else if (todayActive && pattern.pattern === 'regular') {
          change = '✅ Active';
          changeType = 'active';
        } else if (!todayActive && pattern.pattern === 'never') {
          change = '— Never started';
          changeType = 'never';
        }

        changes.push({
          ...todayPacs,
          pattern: pattern.pattern,
          patternLabel: pattern.patternLabel,
          consistencyRate: pattern.consistencyRate,
          todayActive,
          change,
          changeType,
          daysSince,
          sinceDate
        });
      });

      const dailySnapshot = {
        changes,
        stats,
        analysisDate: selectedDate
      };

      // Save daily snapshot to Redis via API
      const response = await fetch('/api/pacs-analytics/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          snapshot: dailySnapshot
        })
      });

      if (!response.ok) {
        console.warn('Failed to save daily snapshot to database');
      }

      setDailyAnalysis(dailySnapshot);
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
    
    // Auto-detect date from filename
    const detectedDate = extractDateFromFilename(file.name);
    if (detectedDate) {
      setSelectedDate(detectedDate);
    }
  };

  const resetBaseline = async () => {
    if (confirm('Reset baseline? This will clear all data from the database.')) {
      try {
        // Delete baseline from Redis (we'll need a DELETE endpoint for this)
        // For now, just clear local state - the TTL will eventually clean it up
        setBaseline(null);
        setMode('setup');
        setDailyAnalysis(null);
        setSetupFiles([]);
        setTodayFile(null);
        setError(null);
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  const filteredData = () => {
    if (!baseline) return [];
    
    const data = dailyAnalysis ? dailyAnalysis.changes : Object.values(baseline.pacsPatterns);
    
    return data.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDistrict = filterDistrict === 'all' || p.district === filterDistrict;
      
      let matchesFilter;
      if (filterPattern === 'stoppedrecent') {
        matchesFilter = !p.todayActive && p.daysSince !== null && p.daysSince > 0 && p.daysSince < 15;
      } else if (dailyAnalysis && (filterPattern === 'breaking' || filterPattern === 'recovering')) {
        matchesFilter = p.changeType === filterPattern;
      } else {
        matchesFilter = filterPattern === 'all' || p.pattern === filterPattern;
      }
      
      return matchesSearch && matchesFilter && matchesDistrict;
    });
  };

  // Main render
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#111' }}>
            PACS Pattern Analysis
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '16px' }}>
            {mode === 'setup' ? 'Upload 10-12 days of CSV files to identify patterns' : 'Daily monitoring with date-specific uploads'}
          </p>

          {/* Pattern Definitions Box */}
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
              <span>Pattern Definitions</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              fontSize: '12px',
              lineHeight: '1.6'
            }}>
              <div>
                <div style={{ fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
                  🟢 Regular (Daily)
                </div>
                <div style={{ color: '#6b7280' }}>
                  80%+ consistency rate - PACS performs day-end operations almost every day
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#ea580c', marginBottom: '4px' }}>
                  🟡 Irregular
                </div>
                <div style={{ color: '#6b7280' }}>
                  40-80% consistency - PACS performs day-end operations occasionally, not daily
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                  🔴 Stopped
                </div>
                <div style={{ color: '#6b7280' }}>
                  &lt;40% consistency or no recent activity - PACS has stopped performing day-end
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                  ⚪ Never Started
                </div>
                <div style={{ color: '#6b7280' }}>
                  No day-end date ever recorded - PACS has never performed any day-end operation
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#b91c1c', marginBottom: '4px' }}>
                  ⚠️ Breaking Pattern
                </div>
                <div style={{ color: '#6b7280' }}>
                  Previously regular PACS that stopped - requires immediate attention
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#16a34a', marginBottom: '4px' }}>
                  🎉 Recovering
                </div>
                <div style={{ color: '#6b7280' }}>
                  Previously stopped PACS that is now active again - positive change
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#c2410c', marginBottom: '4px' }}>
                  🟠 Recently Stopped (&lt;15 Days)
                </div>
                <div style={{ color: '#6b7280' }}>
                  Stopped within last 15 days - still recoverable with intervention
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

        {/* SETUP MODE */}
        {mode === 'setup' && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '48px', backgroundColor: 'white' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Initial Setup</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
              Upload 10-12 days of CSV files to establish baseline patterns
            </p>
            
            <label style={{ display: 'block', border: '2px dashed #d1d5db', borderRadius: '12px', padding: '48px',
              textAlign: 'center', cursor: 'pointer', marginBottom: '24px', backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '8px', color: '#111' }}>
                {setupFiles.length > 0 ? `${setupFiles.length} files selected` : 'Select multiple CSV files'}
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Click or drag and drop files here</div>
              {setupFiles.length > 0 && (
                <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280', maxHeight: '150px', overflow: 'auto',
                  textAlign: 'left', padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  {setupFiles.map((f, i) => (
                    <div key={i} style={{ padding: '4px 0' }}>✓ {f.name}</div>
                  ))}
                </div>
              )}
              <input 
                type="file" 
                accept=".csv" 
                multiple 
                onChange={(e) => {
                  setSetupFiles(Array.from(e.target.files));
                  setError(null);
                }}
                style={{ display: 'none' }} 
              />
            </label>

            <button 
              onClick={handleSetup} 
              disabled={setupFiles.length < 2 || loading}
              style={{ 
                width: '100%', 
                padding: '14px', 
                backgroundColor: setupFiles.length >= 2 && !loading ? '#111' : '#e5e7eb',
                color: setupFiles.length >= 2 && !loading ? 'white' : '#9ca3af', 
                border: 'none', 
                borderRadius: '10px',
                fontSize: '15px', 
                fontWeight: '600', 
                cursor: setupFiles.length >= 2 && !loading ? 'pointer' : 'not-allowed' 
              }}>
              {loading ? 'Analyzing...' : 'Analyze & Create Baseline'}
            </button>

            {error && (
              <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', color: '#b91c1c', fontSize: '14px' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '10px' }}>💡 Tips:</p>
              <ul style={{ fontSize: '12px', color: '#1e3a8a', lineHeight: '1.8', marginLeft: '20px' }}>
                <li>Upload CSV files from last 7-15 days (minimum 2 files)</li>
                <li>Files should have: PACS ID, PACS Name, District Name, Last Day End Date</li>
                <li>Date in filename (e.g., pacs_2025-11-06.csv) helps auto-detection</li>
                <li>After setup, you can upload daily CSVs with specific dates</li>
              </ul>
            </div>
          </div>
        )}

        {/* DAILY UPLOAD */}
        {mode === 'daily' && baseline && !dailyAnalysis && (
          <div>
            {/* Baseline info */}
            <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '10px',
              border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
                    ✅ Baseline Active
                  </p>
                  <p style={{ fontSize: '12px', color: '#166534' }}>
                    {baseline.dateRange.start} to {baseline.dateRange.end} · {baseline.dateRange.days} days · {Object.keys(baseline.pacsPatterns).length} PACS
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: '#15803d' }}>{baseline.stats.regular}</div>
                    <div style={{ fontSize: '10px', color: '#166534' }}>Regular</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: '#ea580c' }}>{baseline.stats.irregular}</div>
                    <div style={{ fontSize: '10px', color: '#9a3412' }}>Irregular</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: '#dc2626' }}>{baseline.stats.stopped}</div>
                    <div style={{ fontSize: '10px', color: '#991b1b' }}>Stopped</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: '#6b7280' }}>{baseline.stats.never}</div>
                    <div style={{ fontSize: '10px', color: '#4b5563' }}>Never</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload form */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', backgroundColor: 'white', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Upload CSV for Specific Date</h2>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Analysis Date
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
                  Auto-detected from filename or select manually (max 7 days old)
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
                onClick={handleDailyAnalysis} 
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

            {/* Reset button */}
            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={resetBaseline}
                style={{ 
                  padding: '8px 16px', 
                  border: 'none', 
                  background: 'transparent', 
                  fontSize: '12px',
                  color: '#9ca3af', 
                  textDecoration: 'underline', 
                  cursor: 'pointer' 
                }}>
                Reset Baseline
              </button>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {mode === 'daily' && dailyAnalysis && (
          <div>
            {/* Analysis date banner with upload prompt */}
            <div style={{ marginBottom: '24px' }}>
              {(() => {
                const analysisDate = new Date(dailyAnalysis.analysisDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                analysisDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((today - analysisDate) / (1000 * 60 * 60 * 24));
                const isOld = daysDiff > 0;

                return (
                  <div style={{
                    padding: '16px 20px',
                    backgroundColor: isOld ? '#fef3c7' : '#f0fdf4',
                    border: `1px solid ${isOld ? '#fbbf24' : '#bbf7d0'}`,
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: isOld ? '#92400e' : '#166534', marginBottom: '4px', fontWeight: '500' }}>
                        {isOld ? '⚠️ Showing Analysis from Previous Upload' : '✅ Latest Analysis'}
                      </p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: isOld ? '#78350f' : '#15803d' }}>
                        {analysisDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                        {daysDiff > 0 && (
                          <span style={{ fontSize: '13px', fontWeight: '500', marginLeft: '8px', color: isOld ? '#92400e' : '#166534' }}>
                            ({daysDiff} {daysDiff === 1 ? 'day' : 'days'} old)
                          </span>
                        )}
                      </p>
                    </div>
                    {isOld && (
                      <button
                        onClick={() => {
                          setDailyAnalysis(null);
                          setTodayFile(null);
                          setSelectedDate(new Date().toISOString().split('T')[0]);
                          setError(null);
                          setFilterPattern('all');
                          setSearchTerm('');
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}>
                        📤 Upload Latest CSV
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Stats Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '16px', 
              marginBottom: '32px' 
            }}>
              <div 
                onClick={() => setFilterPattern('breaking')}
                style={{ 
                  padding: '20px', 
                  backgroundColor: 'white', 
                  border: '2px solid #fee2e2', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⚠️ BREAKING
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                  {dailyAnalysis.stats.breakingPattern}
                </div>
                <div style={{ fontSize: '12px', color: '#991b1b' }}>Regular → Stopped</div>
              </div>

              <div 
                onClick={() => setFilterPattern('stoppedrecent')}
                style={{ 
                  padding: '20px', 
                  backgroundColor: 'white', 
                  border: '2px solid #fed7aa', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🟠 STOPPED &lt;15D
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ea580c', marginBottom: '4px' }}>
                  {dailyAnalysis.stats.stoppedRecent}
                </div>
                <div style={{ fontSize: '12px', color: '#9a3412' }}>Recent - Recoverable</div>
              </div>

              <div 
                onClick={() => setFilterPattern('recovering')}
                style={{ 
                  padding: '20px', 
                  backgroundColor: 'white', 
                  border: '2px solid #d1fae5', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎉 RECOVERING
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
                  {dailyAnalysis.stats.recovering}
                </div>
                <div style={{ fontSize: '12px', color: '#166534' }}>Stopped → Active</div>
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
                {baseline.districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={filterPattern}
                onChange={(e) => setFilterPattern(e.target.value)}
                style={{
                  padding: '11px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minWidth: '180px',
                  backgroundColor: 'white',
                  color: '#111'
                }}>
                <option value="all">All Patterns</option>
                <option value="stoppedrecent">🟠 Stopped &lt;15 Days</option>
                <option value="breaking">⚠️ Breaking Pattern</option>
                <option value="recovering">🎉 Recovering</option>
                <option value="regular">🟢 Regular</option>
                <option value="irregular">🟡 Irregular</option>
                <option value="stopped">🔴 All Stopped</option>
                <option value="never">⚪ Never Started</option>
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
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        PACS NAME
                      </th>
                      <th style={{ 
                        padding: '14px 16px', 
                        textAlign: 'left', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        DISTRICT
                      </th>
                      <th style={{ 
                        padding: '14px 16px', 
                        textAlign: 'left', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        PATTERN
                      </th>
                      <th style={{ 
                        padding: '14px 16px', 
                        textAlign: 'left', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        STATUS
                      </th>
                      <th style={{ 
                        padding: '14px 16px', 
                        textAlign: 'left', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        DAYS / SINCE
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
                              p.pattern === 'regular' ? '#f0fdf4' : 
                              p.pattern === 'irregular' ? '#fff7ed' : 
                              p.pattern === 'stopped' ? '#fef2f2' : '#f9fafb',
                            color: 
                              p.pattern === 'regular' ? '#15803d' : 
                              p.pattern === 'irregular' ? '#c2410c' : 
                              p.pattern === 'stopped' ? '#b91c1c' : '#6b7280'
                          }}>
                            {p.patternLabel}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {p.change}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {p.daysSince === 0 ? 'Today' : 
                           p.daysSince ? `${p.daysSince} days | ${p.sinceDate}` : '—'}
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

            {/* Back button */}
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => { 
                  setDailyAnalysis(null); 
                  setTodayFile(null); 
                  setSelectedDate(new Date().toISOString().split('T')[0]); 
                  setError(null);
                  setFilterPattern('all');
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
                  cursor: 'pointer' 
                }}>
                ↻ Upload Another Day's CSV
              </button>

              <button 
                onClick={resetBaseline}
                style={{ 
                  padding: '8px 16px', 
                  border: 'none', 
                  background: 'transparent', 
                  fontSize: '12px',
                  color: '#9ca3af', 
                  textDecoration: 'underline', 
                  cursor: 'pointer' 
                }}>
                Reset Baseline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
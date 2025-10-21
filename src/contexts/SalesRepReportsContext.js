import React, { createContext, useContext, useState, useCallback } from 'react';

const SalesRepReportsContext = createContext();

export const useSalesRepReports = () => {
  const context = useContext(SalesRepReportsContext);
  if (!context) {
    throw new Error('useSalesRepReports must be used within a SalesRepReportsProvider');
  }
  return context;
};

export const SalesRepReportsProvider = ({ children }) => {
  const [cachedData, setCachedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchKey, setLastFetchKey] = useState(null);

  // Generate a cache key based on division, sales reps, and columns
  const generateCacheKey = (division, salesReps, columns) => {
    return `${division}-${salesReps.join(',')}-${columns.map(c => c.columnKey).join(',')}`;
  };

  // Pre-load ALL sales rep reports data
  const preloadAllReports = useCallback(async (division, salesReps, columns) => {
    const cacheKey = generateCacheKey(division, salesReps, columns);
    
    // If already loaded with same key, skip
    if (lastFetchKey === cacheKey && cachedData) {
      console.log('✅ Sales rep reports already cached, skipping reload');
      return cachedData;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Pre-loading ALL sales rep reports in background...', {
        division,
        salesRepsCount: salesReps.length,
        columnsCount: columns.length
      });

      const response = await fetch('http://localhost:3001/api/sales-rep-reports-ultra-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division,
          salesReps,
          columns: columns.map(column => ({
            year: column.year,
            month: column.month,
            type: column.type || 'Actual',
            columnKey: `${column.year}-${column.month}-${column.type || 'Actual'}`
          }))
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ ULTRA-FAST loaded reports for', Object.keys(result.data).length, 'sales reps');
        setCachedData(result.data);
        setLastFetchKey(cacheKey);
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to load reports');
      }
    } catch (err) {
      console.error('❌ Error pre-loading sales rep reports:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cachedData, lastFetchKey]);

  // Get cached data for a specific sales rep
  const getReportData = useCallback((salesRep) => {
    if (!cachedData) {
      return null;
    }
    
    const upperSalesRep = String(salesRep).trim().toUpperCase();
    return cachedData[upperSalesRep] || null;
  }, [cachedData]);

  // Clear cache (useful when division changes)
  const clearCache = useCallback(() => {
    setCachedData(null);
    setLastFetchKey(null);
    setError(null);
  }, []);

  const value = {
    cachedData,
    loading,
    error,
    preloadAllReports,
    getReportData,
    clearCache,
    isCached: !!cachedData
  };

  return (
    <SalesRepReportsContext.Provider value={value}>
      {children}
    </SalesRepReportsContext.Provider>
  );
};











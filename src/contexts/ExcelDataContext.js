import React, { createContext, useState, useContext, useCallback } from 'react';
import * as XLSX from 'xlsx';

const ExcelDataContext = createContext();

export const useExcelData = () => useContext(ExcelDataContext);

export const ExcelDataProvider = ({ children }) => {
  const [excelData, setExcelData] = useState({});
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Function to load Excel file from API endpoint - use useCallback to prevent infinite loops
  const loadExcelData = useCallback(async (url = '/api/financials.xlsx') => {
    // Prevent loading if we're already loading or already have data
    if (loading || dataLoaded) {
      // console.log('Skipping load - already loading or data loaded:', { loading, dataLoaded });
      return;
    }
    
    // console.log('Loading Excel data from:', url);
    setLoading(true);
    setError(null);
    
    try {
      // console.log('Fetching data...');
      const res = await fetch(url);
      // console.log('Response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const buffer = await res.arrayBuffer();
      // console.log('Received buffer size:', buffer.byteLength);
      
      if (buffer.byteLength === 0) {
        throw new Error('Received empty file');
      }
      
      // Parse Excel data using xlsx library
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      // console.log('Workbook sheets:', workbook.SheetNames);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }
      
      // Get all sheet names (divisions)
      const sheetNames = workbook.SheetNames;
      setDivisions(sheetNames);
      
      // Convert sheets to JSON
      const parsedData = {};
      sheetNames.forEach(name => {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
        // console.log(`Sheet ${name} data structure:`, {
        //   rowCount: sheetData.length,
        //   columnCount: sheetData[0]?.length || 0,
        //   headers: sheetData[0],
        //   months: sheetData[1],
        //   types: sheetData[2],
        //   sampleSales: sheetData[3]?.slice(0, 5) // First 5 sales values
        // });
        if (!sheetData || sheetData.length === 0) {
          // console.warn(`Warning: Sheet ${name} is empty`);
        }
        parsedData[name] = sheetData;
      });
      
      setExcelData(parsedData);
      setDataLoaded(true);
      
      // Set default selected division if none is selected
      if (!selectedDivision && sheetNames.length > 0) {
        setSelectedDivision(sheetNames[0]);
      }
      
      return parsedData;
    } catch (err) {
      // console.error('Error loading Excel data:', err);
      setError('Failed to load Excel data: ' + err.message);
      throw err; // Re-throw to allow component to handle the error
    } finally {
      setLoading(false);
    }
  }, [loading, dataLoaded, selectedDivision]);
  
  // Values to expose in the context
  const value = {
    excelData,
    divisions,
    selectedDivision,
    setSelectedDivision,
    loading,
    error,
    loadExcelData,
    dataLoaded
  };
  
  return (
    <ExcelDataContext.Provider value={value}>
      {children}
    </ExcelDataContext.Provider>
  );
}; 
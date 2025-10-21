import React, { useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import countryCoordinates from './countryCoordinates';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useFilter } from '../../contexts/FilterContext';

// Fix for default markers in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

const SalesCountryLeafletMap = () => {
  const { selectedDivision } = useExcelData();
  const { columnOrder, basePeriodIndex } = useFilter();
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState(null);

  // Fetch countries from database
  const fetchCountriesFromDatabase = useCallback(async () => {
    if (!selectedDivision) return [];

    setLoading(true);
    setError(null);

    try {
      // Fetch for all divisions (FP, SB, TF, HCM)
      const response = await fetch(`http://localhost:3001/api/countries-db?division=${selectedDivision}`);
      const result = await response.json();
      
      if (result.success) {
        const countryNames = result.data.map(item => item.country);
        return countryNames.map(name => ({
          name: name,
          percentage: 0 // Will be calculated later if needed
        }));
      } else {
        setError(result.message || 'Failed to load countries');
        return [];
      }
    } catch (err) {
      setError('Failed to load countries: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedDivision]);

  // Fetch sales data from database for selected period
  const fetchSalesData = useCallback(async (periodColumn) => {
    if (!selectedDivision || !periodColumn) return [];
    
    console.log('🚀 Leaflet: Fetching sales data for division:', selectedDivision, 'period:', periodColumn);
    
    try {
      const response = await fetch('http://localhost:3001/api/sales-by-country-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          division: selectedDivision,
          year: periodColumn.year,
          months: [periodColumn.month],
          dataType: periodColumn.type
        })
      });
      
      console.log('📡 Leaflet: API Response status:', response.status);
      const result = await response.json();
      console.log('📡 Leaflet: API Response data:', result);
      
      if (result.success) {
        const transformedData = result.data.map(item => ({
          country: item.country,
          values: parseFloat(item.value || 0)
        }));
        console.log(`✅ Leaflet: Loaded sales data for ${transformedData.length} countries:`, transformedData);
        return transformedData;
      } else {
        console.error('❌ Leaflet: Failed to load sales data:', result.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Leaflet: Error loading sales data:', error);
      return [];
    }
  }, [selectedDivision]);

  // Removed unused getCountryPercentage function

  const getCountryCoordinates = (countryName) => {
    // Handle country name mappings
    const nameMap = {
      'UAE': 'United Arab Emirates',
      'KSA': 'Saudi Arabia',
      'USA': 'United States of America',
      'UK': 'United Kingdom'
    };

    // Try direct match first
    if (countryCoordinates[countryName]) {
      return countryCoordinates[countryName];
    }
    
    // Try with mapping
    const mappedName = nameMap[countryName];
    if (mappedName && countryCoordinates[mappedName]) {
      return countryCoordinates[mappedName];
    }
    
    // Try case-insensitive search
    const found = Object.keys(countryCoordinates).find(key => 
      key.toLowerCase() === countryName.toLowerCase()
    );
    
    if (found) {
      return countryCoordinates[found];
    }
    
    // Try partial match
    const partialMatch = Object.keys(countryCoordinates).find(key => 
      key.toLowerCase().includes(countryName.toLowerCase()) ||
      countryName.toLowerCase().includes(key.toLowerCase())
    );
    
    return partialMatch ? countryCoordinates[partialMatch] : null;
  };

  // Create fallback periods if columnOrder is empty
  const periods = columnOrder.length > 0 ? columnOrder : [
    { year: 2024, month: 1, type: 'Actual' },
    { year: 2024, month: 2, type: 'Actual' },
    { year: 2024, month: 3, type: 'Actual' },
    { year: 2024, month: 4, type: 'Actual' },
    { year: 2024, month: 5, type: 'Actual' },
    { year: 2024, month: 6, type: 'Actual' }
  ];

  // Set default selected period to base period when data loads
  useEffect(() => {
    console.log('📅 Leaflet: Period selection effect:', { columnOrderLength: columnOrder.length, basePeriodIndex, periodsLength: periods.length });
    if (periods.length > 0 && basePeriodIndex !== null) {
      console.log('🎯 Leaflet: Setting base period index:', basePeriodIndex);
      setSelectedPeriodIndex(basePeriodIndex);
    } else if (periods.length > 0) {
      console.log('🎯 Leaflet: Setting default period index: 0');
      setSelectedPeriodIndex(0);
    }
  }, [columnOrder, basePeriodIndex, periods]);

  // Load countries when division changes (initial load only)
  useEffect(() => {
    if (periods.length > 0 && selectedPeriodIndex < periods.length) {
      // This will be handled by the sales data useEffect
      return;
    }
    
    const loadCountries = async () => {
      console.log('🔄 Leaflet: Loading countries for division:', selectedDivision);
      const loadedCountries = await fetchCountriesFromDatabase();
      console.log('📊 Leaflet: Countries loaded:', loadedCountries.length);
      setCountries(loadedCountries);
    };
    
    loadCountries();
  }, [fetchCountriesFromDatabase, selectedDivision, periods, selectedPeriodIndex]);

  // Set default selected period to base period when data loads
  useEffect(() => {
    console.log('📅 Leaflet: Period selection effect:', { columnOrderLength: columnOrder.length, basePeriodIndex });
    if (columnOrder.length > 0 && basePeriodIndex !== null) {
      console.log('🎯 Leaflet: Setting base period index:', basePeriodIndex);
      setSelectedPeriodIndex(basePeriodIndex);
    } else if (columnOrder.length > 0) {
      console.log('🎯 Leaflet: Setting default period index: 0');
      setSelectedPeriodIndex(0);
    }
  }, [columnOrder, basePeriodIndex]);

  // Fetch data for selected period only
  useEffect(() => {
    if (periods.length > 0 && selectedPeriodIndex < periods.length) {
      const selectedPeriod = periods[selectedPeriodIndex];
      console.log('🔄 Leaflet: Fetching data for selected period:', selectedPeriod);
      
      const loadSalesData = async () => {
        // First get fresh countries list
        const loadedCountries = await fetchCountriesFromDatabase();
        console.log('📊 Leaflet: Fresh countries loaded:', loadedCountries.length);
        
        // Then get sales data
        const salesData = await fetchSalesData(selectedPeriod);
        console.log('📊 Leaflet: Sales data loaded:', salesData.length);
        
        // Calculate total sales (filter out invalid items)
        const validSalesData = salesData.filter(item => item && item.country && typeof item.values === 'number');
        const totalSales = validSalesData.reduce((sum, item) => sum + (item.values || 0), 0);
        console.log('💰 Leaflet: Total sales:', totalSales);
        
        // Update countries with calculated percentages (filter out invalid countries)
        const validCountries = loadedCountries.filter(country => country && country.name);
        const countriesWithPercentages = validCountries.map(country => {
          // Add null checks for country name
          if (!country || !country.name) {
            console.log('⚠️ Leaflet: Skipping invalid country:', country);
            return { ...country, percentage: 0 };
          }
          
          const salesItem = validSalesData.find(item => 
            item && item.country && country.name && 
            item.country.toLowerCase() === country.name.toLowerCase()
          );
          const percentage = salesItem && totalSales > 0 ? 
            (salesItem.values / totalSales) * 100 : 0;
          
          console.log(`📍 Leaflet: ${country.name}: ${salesItem?.values || 0} (${percentage.toFixed(2)}%)`);
          
          return {
            ...country,
            percentage: percentage
          };
        });
        
        // Filter out countries with percentage less than 0.1%
        const filteredCountries = countriesWithPercentages.filter(country => 
          country.percentage >= 0.1
        );
        
        console.log('🎯 Leaflet: Countries with percentages:', countriesWithPercentages);
        console.log('🎯 Leaflet: Filtered countries (>=0.1%):', filteredCountries);
        setCountries(filteredCountries);
      };
      
      loadSalesData();
    }
  }, [selectedPeriodIndex, periods, fetchSalesData, fetchCountriesFromDatabase]);

  // Initialize map only once when component mounts
  useEffect(() => {
    if (mapInstance) return; // Map already initialized

    const map = L.map('leaflet-map', {
      minZoom: 1, // Allow zooming out more
      maxZoom: 20, // Allow zooming in more for better detail
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      zoomSnap: 0.1, // Allow fractional zoom levels
      zoomDelta: 0.5 // Smaller zoom increments for smoother zooming
    }).setView([23.86863, 54.20671], 4); // Zoom to UAE (Local Market)

    // English-only map tile options:
    // Option 1: CARTO Voyager (clean, English labels)
    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20, // Match map maxZoom for better detail
      noWrap: true
    }).addTo(map);
    
    // Option 2: CARTO Positron (minimal, English-only)
    // L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    //   attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    //   maxZoom: 18,
    // }).addTo(map);
    
    // Option 3: Stamen Toner (black & white, English)
    // L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
    //   attribution: 'Map tiles by Stamen Design, CC BY 3.0 — Map data © OpenStreetMap contributors',
    //   maxZoom: 18,
    // }).addTo(map);

    setMapInstance(map);

    // Cleanup function to remove map when component unmounts
    return () => {
      if (map) {
        map.remove();
        setMapInstance(null);
      }
    };
  }, []); // Empty dependency array - run only once on mount

  // Update markers when countries data changes (preserves zoom/position)
  useEffect(() => {
    if (!mapInstance || !countries.length) return;

    // Clear existing markers
    mapInstance.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstance.removeLayer(layer);
      }
    });

    // Utility to create a custom SVG icon with % of sales inside the pin
    function createPinIcon(percentage) {
      const value = percentage.toFixed(1);
      const svg = `
        <svg width="40" height="54" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 54C20 54 0 34.5 0 20C0 8.9543 8.9543 0 20 0C31.0457 0 40 8.9543 40 20C40 34.5 20 54 20 54Z" fill="#003366"/>
          <circle cx="20" cy="20" r="17" fill="white"/>
          <text x="20" y="22" text-anchor="middle" fill="#003366" font-size="11" font-family="Arial" font-weight="bold" alignment-baseline="middle">${value}</text>
          <text x="20" y="32" text-anchor="middle" fill="#003366" font-size="9" font-family="Arial" font-weight="bold" alignment-baseline="middle">%</text>
        </svg>
      `;
      return L.divIcon({
        className: '', // No default styles
        html: svg,
        iconSize: [40, 54],
        iconAnchor: [20, 54],
        popupAnchor: [0, -54]
      });
    }

    // Add markers for countries with sales data
    countries.forEach((country) => {
      const coordinates = getCountryCoordinates(country.name);
      if (coordinates) {
        const icon = createPinIcon(country.percentage);
        L.marker([coordinates[1], coordinates[0]], { icon })
          .addTo(mapInstance)
          .bindPopup(`<b>${country.name}</b><br/>Market Share: ${country.percentage.toFixed(2)}%`);
      }
    });
  }, [countries, mapInstance]);

  // Show "Coming Soon" for non-FP divisions
  if (selectedDivision !== 'FP') {
    return (
      <div className="leaflet-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', backgroundColor: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ color: '#666', marginBottom: '20px' }}>🚧 Coming Soon</h3>
          <p style={{ color: '#888', fontSize: '16px' }}>
            2D Map View for {selectedDivision} division is currently under development.
          </p>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
            The database table <code>{selectedDivision.toLowerCase()}_data_excel</code> has been created and is ready for data.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="leaflet-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', backgroundColor: '#f8f9fa' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Loading countries data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div id="leaflet-map" className="leaflet-container" />
      
      {/* Period Selection */}
      {console.log('🎛️ Leaflet: Rendering period buttons:', { periodsLength: periods.length, periods })}
      {periods.length > 0 && (
        <div className="period-selector" style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          {periods.map((column, index) => (
            <button
              key={index}
              onClick={() => setSelectedPeriodIndex(index)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                background: selectedPeriodIndex === index ? '#1976d2' : '#fff',
                color: selectedPeriodIndex === index ? 'white' : '#333',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '80px'
              }}
              onMouseEnter={(e) => {
                if (selectedPeriodIndex !== index) {
                  e.target.style.background = '#f5f5f5';
                  e.target.style.borderColor = '#bbb';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPeriodIndex !== index) {
                  e.target.style.background = '#fff';
                  e.target.style.borderColor = '#ddd';
                }
              }}
            >
              {column.year} {column.month === 1 ? 'Jan' : 
                column.month === 2 ? 'Feb' :
                column.month === 3 ? 'Mar' :
                column.month === 4 ? 'Apr' :
                column.month === 5 ? 'May' :
                column.month === 6 ? 'Jun' :
                column.month === 7 ? 'Jul' :
                column.month === 8 ? 'Aug' :
                column.month === 9 ? 'Sep' :
                column.month === 10 ? 'Oct' :
                column.month === 11 ? 'Nov' : 'Dec'} {column.type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesCountryLeafletMap;
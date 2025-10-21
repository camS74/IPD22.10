const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
require('dotenv').config();

// Database imports
const { testConnection, pool } = require('./database/config');
const fpDataService = require('./database/FPDataService');
const sbDataService = require('./database/SBDataService');
const tfDataService = require('./database/TFDataService');
const hcmDataService = require('./database/HCMDataService');
const GlobalConfigService = require('./database/GlobalConfigService');
const productPerformanceService = require('./database/ProductPerformanceService');

const app = express();
const PORT = 3001;

// Initialize Global Config Service
const globalConfigService = new GlobalConfigService();

// Middleware
app.use(express.json());
app.use(bodyParser.json());

// Enable CORS with specific options
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Initialize global configuration system
async function initializeGlobalConfig() {
  try {
    // Check if global_config table exists
    const tableExists = await globalConfigService.tableExists();
    if (!tableExists) {
      console.log('⚠️  global_config table does not exist. Please run the database migration script.');
      console.log('   Run: node server/scripts/create-global-config-table.sql');
      return;
    }
    
    console.log('✅ Global configuration system initialized');
    
    // Load and log current configurations
    const configs = await globalConfigService.getAllConfigs();
    console.log('📋 Loaded global configurations:', Object.keys(configs));
    
    if (configs.standardColumnSelection) {
      console.log(`📊 standardColumnSelection has ${configs.standardColumnSelection.length} columns`);
    }
    
    if (configs.basePeriodIndex !== undefined) {
      console.log(`📅 basePeriodIndex: ${configs.basePeriodIndex}`);
    }
    
  } catch (error) {
    console.error('❌ Error initializing global configuration:', error);
  }
}

// Initialize global config on startup
initializeGlobalConfig();

// Root path handler with helpful message
app.get('/', (req, res) => {
  res.send('This is the backend API server. Please access the React application at <a href="http://localhost:3000">http://localhost:3000</a>');
});

// API endpoints for global configuration management (applies to all divisions)
app.get('/api/standard-config', async (req, res) => {
  try {
    console.log('🔍 GET /api/standard-config - Returning all global configs');
    const allConfigs = await globalConfigService.getAllConfigs();
    
    console.log('📊 All configs:', Object.keys(allConfigs));
    console.log('📊 standardColumnSelection length:', allConfigs.standardColumnSelection?.length || 0);
    console.log('📊 chartVisibleColumns length:', allConfigs.chartVisibleColumns?.length || 0);
    console.log('📊 basePeriodIndex:', allConfigs.basePeriodIndex);
    
    res.json({ success: true, data: allConfigs });
  } catch (error) {
    console.error('❌ Error retrieving all global configs:', error);
    res.status(500).json({ error: 'Failed to retrieve global configurations' });
  }
});

app.post('/api/standard-config', async (req, res) => {
  try {
    const { key, data } = req.body;
    console.log('🔍 POST /api/standard-config received:', { key, data, dataType: typeof data });
    
    // Fix: Allow data to be 0 (valid base period index)
    if (!key || (data === undefined || data === null)) {
      return res.status(400).json({ error: 'Key and data are required' });
    }
    
    await globalConfigService.setConfig(key, data);
    console.log(`✅ Saved global config for key: ${key}, data: ${data}`);
    res.json({ success: true, message: 'Global configuration saved' });
  } catch (error) {
    console.error('❌ Error saving global config:', error);
    res.status(500).json({ error: 'Failed to save global configuration' });
  }
});

app.get('/api/standard-config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const data = await globalConfigService.getConfig(key);
    
    if (data !== null) {
      console.log(`🔍 Retrieved global config for key: ${key}`);
      if (Array.isArray(data)) {
        // Handle different types of arrays - objects with id/year properties vs simple strings/values
        const displayItems = data.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item.id || item.year || JSON.stringify(item);
          } else {
            return item;
          }
        });
        console.log(`📊 Data is array with ${data.length} items:`, displayItems);
      } else {
        console.log(`📊 Data type: ${typeof data}, value:`, data);
      }
      res.json({ success: true, data });
    } else {
      console.log(`❌ No data found for key: ${key}`);
      res.status(404).json({ success: false, message: 'Global configuration not found' });
    }
  } catch (error) {
    console.error('❌ Error retrieving global config:', error);
    res.status(500).json({ error: 'Failed to retrieve global configuration' });
  }
});

app.delete('/api/standard-config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await globalConfigService.deleteConfig(key);
    
    if (deleted) {
      console.log(`✅ Deleted global config for key: ${key}`);
      res.json({ success: true, message: 'Global configuration deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Global configuration not found' });
    }
  } catch (error) {
    console.error('❌ Error deleting global config:', error);
    res.status(500).json({ error: 'Failed to delete global configuration' });
  }
});

// API endpoint to serve the Excel file
app.get('/api/financials.xlsx', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'financials.xlsx');
  
  console.log('Received request for Excel file');
  console.log('Looking for file at:', filePath);
  
  try {
    // Check if file exists
    if (fs.existsSync(filePath)) {
      console.log('File found, sending to client');
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'inline; filename=financials.xlsx');
      
      // Create read stream and pipe to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error reading file:', error);
        if (!res.headersSent) {
          res.status(500).send('Error reading Excel file');
        }
      });
      
      fileStream.on('end', () => {
        console.log('File sent successfully');
      });
    } else {
      console.error('Excel file not found at path:', filePath);
      res.status(404).send('Excel file not found');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal server error');
  }
});

// Add a new endpoint for API/excel-data that redirects to the correct endpoint
app.get('/api/excel-data', (req, res) => {
  console.log('Received request to /api/excel-data, redirecting to /api/financials.xlsx');
  res.redirect('/api/financials.xlsx');
});

// API endpoint to serve the Sales Excel file
app.get('/api/sales.xlsx', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'Sales.xlsx');
  
  console.log('Received request for Sales Excel file');
  console.log('Looking for file at:', filePath);
  
  try {
    // Check if file exists
    if (fs.existsSync(filePath)) {
      console.log('Sales file found, sending to client');
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'inline; filename=sales.xlsx');
      
      // Create read stream and pipe to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error reading Sales file:', error);
        if (!res.headersSent) {
          res.status(500).send('Error reading Sales Excel file');
        }
      });
      
      fileStream.on('end', () => {
        console.log('Sales file sent successfully');
      });
    } else {
      console.error('Sales Excel file not found at path:', filePath);
      res.status(404).send('Sales Excel file not found');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal server error');
  }
});

// Master Data endpoints for material percentages
const MASTER_DATA_FILE_PATH = path.join(__dirname, 'data', 'master-data.json');

// Load master data from file
function loadMasterData() {
  try {
    let existingData = {};
    
    if (fs.existsSync(MASTER_DATA_FILE_PATH)) {
      const data = fs.readFileSync(MASTER_DATA_FILE_PATH, 'utf8');
      existingData = JSON.parse(data);
    }
    
    // Get dynamic product groups from Sales.xlsx
    const dynamicGroups = getProductGroupsFromSalesData();
    
    // Merge existing data with dynamic product groups
    if (Object.keys(dynamicGroups).length > 0) {
      return mergeMasterDataWithDynamicGroups(existingData, dynamicGroups);
    } else {
      // Fallback to default if no dynamic data available
      return Object.keys(existingData).length > 0 ? existingData : getDefaultMasterData();
    }
  } catch (error) {
    console.error('Error loading master data:', error);
    return getDefaultMasterData();
  }
}

// Save master data to file
function saveMasterData(data) {
  try {
    fs.writeFileSync(MASTER_DATA_FILE_PATH, JSON.stringify(data, null, 2));
    console.log('Master data saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving master data:', error);
    return false;
  }
}

// Default master data structure based on the provided table
function getDefaultMasterData() {
  return {
    FP: {
      'Commercial Items Plain': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Commercial Items Printed': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Industrial Items Plain': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Industrial Items Printed': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Laminates': { PE: 50, BOPP: 5, PET: 15, Alu: 20, Paper: 10, 'PVC/PET': 0 },
      'Mono Film Printed': { PE: 40, BOPP: 5, PET: 0, Alu: 0, Paper: 55, 'PVC/PET': 0 },
      'Shrink Film Plain': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Shrink Film Printed': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Shrink Sleeves': { PE: 0, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 100 },
      'Wide Film': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Wrap Around Label': { PE: 0, BOPP: 100, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Services Charges': { PE: 0, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 }
    },
    SB: {
      // Default structure for SB division (Shopping Bags)
      'Shopping Bags Plain': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Shopping Bags Printed': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 }
    },
    TF: {
      // Default structure for TF division (Thermoforming)
      'Thermoforming Plain': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Thermoforming Printed': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 }
    },
    HCM: {
      // Default structure for HCM division (Harwal Container Manufacturing)
      'Preforms': { PE: 0, BOPP: 0, PET: 100, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Closures': { PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 }
    }
  };
}

// Function to extract product groups from Sales.xlsx dynamically
function getProductGroupsFromSalesData() {
  const XLSX = require('xlsx');
  const salesFilePath = path.join(__dirname, 'data', 'Sales.xlsx');
  
  if (!fs.existsSync(salesFilePath)) {
    console.log('Sales.xlsx not found, using default product groups');
    return {};
  }

  try {
    const workbook = XLSX.readFile(salesFilePath);
    const divisions = ['FP', 'SB', 'TF', 'HCM'];
    const productGroupsByDivision = {};

    divisions.forEach(division => {
      const sheetName = `${division}-Product Group`;
      if (workbook.SheetNames.includes(sheetName)) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const productGroups = [];
        // Extract unique product groups from column A (starting from row 4, index 3)
        for (let i = 3; i < data.length; i++) {
          const row = data[i];
          if (row && row[0] && row[3]) { // Product Group name exists and has Figures Heads
            const productGroup = row[0];
            if (!productGroups.includes(productGroup)) {
              productGroups.push(productGroup);
            }
          }
        }
        
        productGroupsByDivision[division] = productGroups;
      }
    });

    return productGroupsByDivision;
  } catch (error) {
    console.error('Error reading Sales.xlsx for product groups:', error);
    return {};
  }
}

// Function to merge existing master data with dynamic product groups
function mergeMasterDataWithDynamicGroups(existingData, dynamicGroups) {
  const defaultData = getDefaultMasterData();
  const mergedData = { ...existingData };

  Object.keys(dynamicGroups).forEach(division => {
    if (!mergedData[division]) {
      mergedData[division] = {};
    }

    dynamicGroups[division].forEach(productGroup => {
      if (!mergedData[division][productGroup]) {
        // Use default values if available, otherwise default to 100% PE
        if (defaultData[division] && defaultData[division][productGroup]) {
          mergedData[division][productGroup] = { ...defaultData[division][productGroup] };
        } else {
          mergedData[division][productGroup] = { 
            PE: 100, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 0 
          };
        }
      }
    });
  });

  return mergedData;
}

// API endpoint to get sales data for country reference
app.get('/api/sales-data', (req, res) => {
  try {
    console.log('Received request for sales data');
    const XLSX = require('xlsx');
    const salesFilePath = path.join(__dirname, 'data', 'Sales.xlsx');
    
    if (!fs.existsSync(salesFilePath)) {
      console.log('Sales.xlsx not found');
      return res.json({ success: true, data: [] });
    }

    const workbook = XLSX.readFile(salesFilePath);
    const salesData = [];
    
    // Process all sheets in the workbook
    workbook.SheetNames.forEach(sheetName => {
      console.log('Processing sheet:', sheetName);
      
      try {
        const worksheet = workbook.Sheets[sheetName];
        
        // For Countries sheets, also provide raw data to help with country extraction
        let data, rawData;
        
        if (sheetName.includes('-Countries')) {
          // Get both JSON and raw array data for Countries sheets
          data = XLSX.utils.sheet_to_json(worksheet);
          rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log(`✓ Countries sheet ${sheetName}: ${data.length} rows, raw structure available`);
        } else {
          // Regular processing for other sheets
          data = XLSX.utils.sheet_to_json(worksheet);
        }
        
        salesData.push({
          sheetName: sheetName,
          data: data,
          rawData: rawData // Available for Countries sheets
        });
        
        console.log(`✓ Sheet ${sheetName}: ${data.length} rows`);
      } catch (sheetError) {
        console.error(`Error processing sheet ${sheetName}:`, sheetError);
      }
    });
    
    console.log(`Loaded ${salesData.length} sheets from Sales.xlsx`);
    res.json({ success: true, data: salesData });
    
  } catch (error) {
    console.error('Error retrieving sales data:', error);
    res.status(500).json({ error: 'Failed to retrieve sales data' });
  }
});

// API endpoint to get master data
app.get('/api/master-data', (req, res) => {
  try {
    console.log('Received request for master data');
    const masterData = loadMasterData();
    res.json({ success: true, data: masterData });
  } catch (error) {
    console.error('Error retrieving master data:', error);
    res.status(500).json({ error: 'Failed to retrieve master data' });
  }
});

// Import ProductGroupDataService
const ProductGroupDataService = require('./database/ProductGroupDataService');

// API endpoint to get product group data for FP division
app.get('/api/product-groups/fp', async (req, res) => {
  try {
    const { year, months, type } = req.query;
    
    if (!year || !months || !type) {
      return res.status(400).json({ 
        error: 'Missing required parameters: year, months, type' 
      });
    }

    // Parse months parameter - it comes as JSON string from frontend
    let parsedMonths;
    try {
      parsedMonths = JSON.parse(months);
    } catch (parseError) {
      // If not JSON, treat as single month string
      parsedMonths = months;
    }

    // Normalize type to uppercase to match database
    const normalizedType = type.toUpperCase();

    console.log(`Received request for FP product groups: ${year}, ${JSON.stringify(parsedMonths)}, ${normalizedType}`);

    // Get product groups data
    const productGroupsData = await ProductGroupDataService.getProductGroupsData(year, parsedMonths, normalizedType);
    
    // Get material categories data
    const materialCategoriesData = await ProductGroupDataService.getMaterialCategoriesData(year, parsedMonths, normalizedType);
    
    // Get process categories data
    const processCategoriesData = await ProductGroupDataService.getProcessCategoriesData(year, parsedMonths, normalizedType);

    // Transform data to match expected format
    const transformedData = {
      productGroups: productGroupsData.map(row => ({
        name: row.productgroup,
        metrics: [
          { type: 'KGS', data: [parseFloat(row.kgs) || 0] },
          { type: 'Sales', data: [parseFloat(row.sales) || 0] },
          { type: 'MoRM', data: [parseFloat(row.morm) || 0] }
        ]
      })),
      materialCategories: materialCategoriesData.map(row => ({
        name: row.material,
        metrics: [
          { type: 'KGS', data: [parseFloat(row.kgs) || 0] },
          { type: 'Sales', data: [parseFloat(row.sales) || 0] },
          { type: 'MoRM', data: [parseFloat(row.morm) || 0] }
        ]
      })),
      processCategories: processCategoriesData.map(row => ({
        name: row.process,
        metrics: [
          { type: 'KGS', data: [parseFloat(row.kgs) || 0] },
          { type: 'Sales', data: [parseFloat(row.sales) || 0] },
          { type: 'MoRM', data: [parseFloat(row.morm) || 0] }
        ]
      }))
    };

    res.json({ success: true, data: transformedData });
    
  } catch (error) {
    console.error('Error retrieving FP product groups data:', error);
    res.status(500).json({ error: 'Failed to retrieve product groups data' });
  }
});

// API endpoint to get all product groups for FP division
app.get('/api/product-groups/fp/list', async (req, res) => {
  try {
    console.log('Received request for FP product groups list');
    
    const productGroups = await ProductGroupDataService.getAllProductGroups();
    const materials = await ProductGroupDataService.getAllMaterials();
    const processes = await ProductGroupDataService.getAllProcesses();

    res.json({ 
      success: true, 
      data: {
        productGroups,
        materials,
        processes
      }
    });
    
  } catch (error) {
    console.error('Error retrieving FP product groups list:', error);
    res.status(500).json({ error: 'Failed to retrieve product groups list' });
  }
});

// API endpoint to save master data
app.post('/api/master-data', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Master data is required' });
    }
    
    console.log('Received request to save master data');
    const success = saveMasterData(data);
    
    if (success) {
      res.json({ success: true, message: 'Master data saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save master data' });
    }
  } catch (error) {
    console.error('Error saving master data:', error);
    res.status(500).json({ error: 'Failed to save master data' });
  }
});

// toProperCase function removed - was only used for sales rep functionality

// Sales Rep Configuration Management
const SALES_REP_CONFIG_FILE = path.join(__dirname, 'data', 'sales-reps-config.json');

// Load sales rep configurations
function loadSalesRepConfig() {
  try {
    if (fs.existsSync(SALES_REP_CONFIG_FILE)) {
      const data = fs.readFileSync(SALES_REP_CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading sales rep config:', error);
    return {};
  }
}

// Save sales rep configurations
function saveSalesRepConfig(config) {
  try {
    fs.writeFileSync(SALES_REP_CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('Sales rep configuration saved successfully');
  } catch (error) {
    console.error('Error saving sales rep config:', error);
    throw error;
  }
}

// Helper function to get division-specific sales rep configuration
function getDivisionSalesRepConfig(division) {
  const config = loadSalesRepConfig();
  return config[division] || { defaults: [], selection: [], groups: {} };
}

// Helper function to check if a sales rep is actually a group
function isSalesRepGroup(division, salesRep) {
  const divisionConfig = getDivisionSalesRepConfig(division);
  return !!(divisionConfig.groups && divisionConfig.groups[salesRep]);
}

// Helper function to get group members for a sales rep
function getGroupMembers(division, salesRep) {
  const divisionConfig = getDivisionSalesRepConfig(division);
  return divisionConfig.groups && divisionConfig.groups[salesRep] ? divisionConfig.groups[salesRep] : [];
}

// Get sales rep defaults and groups for a division
app.get('/api/sales-reps-defaults', (req, res) => {
  try {
    const { division } = req.query;
    if (!division) {
      return res.status(400).json({ success: false, message: 'Division parameter is required' });
    }
    
    const config = loadSalesRepConfig();
    const divisionConfig = config[division] || {
      defaults: [],
      selection: [],
      groups: {}
    };
    
    res.json({ 
      success: true, 
      defaults: divisionConfig.defaults,
      selection: divisionConfig.selection,
      groups: divisionConfig.groups
    });
  } catch (error) {
    console.error('Error fetching sales rep defaults:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales rep defaults' });
  }
});

// Save sales rep defaults and groups for a division
app.post('/api/sales-reps-defaults', (req, res) => {
  try {
    const { division, defaults, selection, groups } = req.body;
    
    if (!division) {
      return res.status(400).json({ success: false, message: 'Division is required' });
    }
    
    const config = loadSalesRepConfig();
    config[division] = {
      defaults: defaults || [],
      selection: selection || [],
      groups: groups || {}
    };
    
    saveSalesRepConfig(config);
    
    res.json({ success: true, message: 'Sales rep configuration saved successfully' });
  } catch (error) {
    console.error('Error saving sales rep defaults:', error);
    res.status(500).json({ success: false, message: 'Failed to save sales rep defaults' });
  }
});

// Create or update a sales rep group
app.post('/api/sales-rep-groups', (req, res) => {
  try {
    const { division, groupName, members, originalGroupName } = req.body;
    
    if (!division || !groupName || !members || !Array.isArray(members)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Division, group name, and members array are required' 
      });
    }
    
    const config = loadSalesRepConfig();
    if (!config[division]) {
      config[division] = { defaults: [], selection: [], groups: {} };
    }
    
    // If updating an existing group with a new name, remove the old one
    if (originalGroupName && originalGroupName !== groupName && config[division].groups[originalGroupName]) {
      delete config[division].groups[originalGroupName];
    }
    
    config[division].groups[groupName] = members;
    saveSalesRepConfig(config);
    
    res.json({ success: true, message: 'Sales rep group saved successfully' });
  } catch (error) {
    console.error('Error saving sales rep group:', error);
    res.status(500).json({ success: false, message: 'Failed to save sales rep group' });
  }
});

// Delete a sales rep group
app.delete('/api/sales-rep-groups', (req, res) => {
  try {
    const { division, groupName } = req.query;
    
    if (!division || !groupName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Division and group name are required' 
      });
    }
    
    const config = loadSalesRepConfig();
    if (config[division] && config[division].groups && config[division].groups[groupName]) {
      delete config[division].groups[groupName];
      saveSalesRepConfig(config);
      res.json({ success: true, message: 'Sales rep group deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Sales rep group not found' });
    }
  } catch (error) {
    console.error('Error deleting sales rep group:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sales rep group' });
  }
});

// ========================================
// UNIVERSAL SALES REP GROUPS API ENDPOINTS
// ========================================

// Get sales rep groups for any division
app.get('/api/sales-rep-groups-universal', (req, res) => {
  try {
    const { division } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    const config = loadSalesRepConfig();
    const divisionConfig = config[division] || { groups: {} };
    
    res.json({ 
      success: true, 
      data: divisionConfig.groups || {},
      message: `Retrieved sales rep groups for ${division} division`
    });
  } catch (error) {
    console.error('Error fetching sales rep groups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales rep groups' });
  }
});

// Create or update sales rep group for any division
app.post('/api/sales-rep-groups-universal', (req, res) => {
  try {
    const { division, groupName, members, originalGroupName } = req.body;
    
    if (!division || !groupName || !members || !Array.isArray(members)) {
      return res.status(400).json({ 
        success: false, 
        message: 'division, groupName, and members array are required' 
      });
    }
    
    const config = loadSalesRepConfig();
    if (!config[division]) {
      config[division] = { defaults: [], selection: [], groups: {} };
    }
    
    // If updating an existing group with a new name, remove the old one
    if (originalGroupName && originalGroupName !== groupName && config[division].groups[originalGroupName]) {
      delete config[division].groups[originalGroupName];
    }
    
    config[division].groups[groupName] = members;
    saveSalesRepConfig(config);
    
    res.json({ success: true, message: 'Sales rep group saved successfully' });
  } catch (error) {
    console.error('Error saving sales rep group:', error);
    res.status(500).json({ success: false, message: 'Failed to save sales rep group' });
  }
});

// Delete sales rep group for any division
app.delete('/api/sales-rep-groups-universal', (req, res) => {
  try {
    const { division, groupName } = req.query;
    
    if (!division || !groupName) {
      return res.status(400).json({ 
        success: false, 
        message: 'division and groupName parameters are required' 
      });
    }
    
    const config = loadSalesRepConfig();
    if (config[division] && config[division].groups && config[division].groups[groupName]) {
      delete config[division].groups[groupName];
      saveSalesRepConfig(config);
      res.json({ success: true, message: 'Sales rep group deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Sales rep group not found' });
    }
  } catch (error) {
    console.error('Error deleting sales rep group:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sales rep group' });
  }
});

// Universal sales reps endpoint for all divisions
app.get('/api/sales-reps-universal', async (req, res) => {
  try {
    const { division } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    console.log(`🔍 Getting sales reps for division: ${division}`);
    
    const salesReps = await UniversalSalesByCountryService.getSalesRepsByDivision(division);
    
    res.json({ 
      success: true, 
      data: salesReps,
      message: `Retrieved ${salesReps.length} sales reps for ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting sales reps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales reps',
      message: error.message
    });
  }
});

// Universal customer dashboard endpoint for all divisions (KGS)
app.post('/api/customer-dashboard-universal', async (req, res) => {
  try {
    const { division, salesRep, periods = [] } = req.body;
    
    if (!division || !salesRep) {
      return res.status(400).json({ 
        success: false, 
        message: 'division and salesRep are required' 
      });
    }
    
    console.log(`🔍 Getting customer dashboard data for sales rep: ${salesRep} in division: ${division}`);
    
    // Check if salesRep is actually a group name
    let customers;
    
    if (isSalesRepGroup(division, salesRep)) {
      // It's a group - get customers for all members
      const groupMembers = getGroupMembers(division, salesRep);
      console.log(`Fetching customers for group '${salesRep}' with members:`, groupMembers);
      
      customers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, salesRep, groupMembers);
    } else {
      // It's an individual sales rep
      customers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, salesRep);
    }
    
    // Get batch customer sales data for all periods
    const dashboardData = {};
    
    for (const customer of customers) {
      dashboardData[customer] = {};
      
      for (const period of periods) {
        const { year, month, type = 'Actual' } = period;
        
        let salesData;
        if (isSalesRepGroup(division, salesRep)) {
          // Group data
          const groupMembers = getGroupMembers(division, salesRep);
          salesData = await UniversalSalesByCountryService.getCustomerSalesDataForGroup(division, groupMembers, customer, 'KGS', year, month, type);
        } else {
          // Individual sales rep data
          salesData = await UniversalSalesByCountryService.getCustomerSalesDataByValueType(division, salesRep, customer, 'KGS', year, month, type);
        }
        
        dashboardData[customer][`${year}-${month}-${type}`] = salesData;
      }
    }
    
    console.log(`✅ Retrieved customer dashboard data for ${customers.length} customers`);
    
    res.json({
      success: true,
      data: {
        salesRep,
        customers,
        dashboardData,
        isGroup: isSalesRepGroup(division, salesRep)
      },
      message: `Retrieved customer dashboard data for ${salesRep} in ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting customer dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer dashboard data',
      message: error.message
    });
  }
});

// Customer dashboard endpoint for AMOUNT (for Customer Insights percentage calculations)
app.post('/api/customer-dashboard-amount', async (req, res) => {
  try {
    const { division, salesRep, periods = [] } = req.body;
    
    if (!division || !salesRep) {
      return res.status(400).json({ 
        success: false, 
        message: 'division and salesRep are required' 
      });
    }
    
    console.log(`🔍 Getting customer AMOUNT data for sales rep: ${salesRep} in division: ${division}`);
    
    // Check if salesRep is actually a group name
    let customers;
    
    if (isSalesRepGroup(division, salesRep)) {
      // It's a group - get customers for all members
      const groupMembers = getGroupMembers(division, salesRep);
      console.log(`Fetching AMOUNT customers for group '${salesRep}' with members:`, groupMembers);
      
      customers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, salesRep, groupMembers);
    } else {
      // It's an individual sales rep
      customers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, salesRep);
    }
    
    // Get batch customer sales data for all periods (AMOUNT values)
    const dashboardData = {};
    
    for (const customer of customers) {
      dashboardData[customer] = {};
      
      for (const period of periods) {
        const { year, month, type = 'Actual' } = period;
        
        let salesData;
        if (isSalesRepGroup(division, salesRep)) {
          // Group data
          const groupMembers = getGroupMembers(division, salesRep);
          salesData = await UniversalSalesByCountryService.getCustomerSalesDataForGroup(division, groupMembers, customer, 'AMOUNT', year, month, type);
        } else {
          // Individual sales rep data
          salesData = await UniversalSalesByCountryService.getCustomerSalesDataByValueType(division, salesRep, customer, 'AMOUNT', year, month, type);
        }
        
        dashboardData[customer][`${year}-${month}-${type}`] = salesData;
      }
    }
    
    console.log(`✅ Retrieved customer AMOUNT data for ${customers.length} customers`);
    
    // Debug: Log first customer's data to verify AMOUNT values
    if (customers.length > 0) {
      const firstCustomer = customers[0];
      console.log(`🔍 DEBUG - First customer data:`, {
        customer: firstCustomer,
        data: dashboardData[firstCustomer]
      });
    }
    
    res.json({
      success: true,
      data: {
        salesRep,
        customers,
        dashboardData,
        isGroup: isSalesRepGroup(division, salesRep)
      },
      message: `Retrieved customer AMOUNT data for ${salesRep} in ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting customer AMOUNT data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer AMOUNT data',
      message: error.message
    });
  }
});

// --- Confirmed Customer Merges API ---
const confirmedMergesPath = path.join(__dirname, 'data', 'confirmed-merges.json');

// Helper to read merges
function readConfirmedMerges() {
  try {
    if (!fs.existsSync(confirmedMergesPath)) return [];
    const data = fs.readFileSync(confirmedMergesPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper to write merges
function writeConfirmedMerges(merges) {
  fs.writeFileSync(confirmedMergesPath, JSON.stringify(merges, null, 2), 'utf8');
}

// GET all confirmed merges
app.get('/api/confirmed-merges', (req, res) => {
  res.json({ success: true, data: readConfirmedMerges() });
});

// POST a new confirmed merge
app.post('/api/confirmed-merges', (req, res) => {
  const { group } = req.body;
  if (!Array.isArray(group) || group.length < 2) {
    return res.status(400).json({ success: false, message: 'Group must be an array of at least 2 customer names.' });
  }
  const merges = readConfirmedMerges();
  const sortedGroup = [...group].sort();
  if (!merges.some(g => JSON.stringify(g) === JSON.stringify(sortedGroup))) {
    merges.push(sortedGroup);
    writeConfirmedMerges(merges);
  }
  res.json({ success: true, message: 'Merge confirmed and saved.' });
});

// PUT to update all confirmed merges (for deletion)
app.put('/api/confirmed-merges', (req, res) => {
  const { merges } = req.body;
  if (!Array.isArray(merges)) {
    return res.status(400).json({ success: false, message: 'Merges must be an array.' });
  }
  writeConfirmedMerges(merges);
  res.json({ success: true, message: 'Merges updated successfully.' });
});

// PostgreSQL Database API Endpoints

// Test database connection
app.get('/api/db/test', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ success: true, message: 'Database connection successful' });
    } else {
      res.status(500).json({ success: false, message: 'Database connection failed' });
    }
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ success: false, message: 'Database connection error', error: error.message });
  }
});

// Get all sales representatives (legacy endpoint - now uses fp_data table)
app.get('/api/fp/sales-reps', async (req, res) => {
  try {
    console.log('🔍 Getting sales reps from fp_data_excel table (legacy endpoint)...');
    
    const client = await pool.connect();
    
    // Get unique sales rep names from fp_data_excel table
    const salesRepsResult = await client.query(`
      SELECT DISTINCT salesrepname 
      FROM fp_data_excel_excel 
      WHERE salesrepname IS NOT NULL 
      AND TRIM(salesrepname) != ''
      AND salesrepname != '(blank)'
      ORDER BY salesrepname
    `);
    
    const salesReps = salesRepsResult.rows.map(row => row.salesrepname);
    
    console.log(`✅ Found ${salesReps.length} unique sales reps from fp_data_excel`);
    
    client.release();
    
    res.json({ success: true, data: salesReps });
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales representatives', error: error.message });
  }
});



// Master Data API Endpoints

// Test endpoint to check if master data tables exist
app.get('/api/fp/master-data/test', async (req, res) => {
  try {
    // Test if the tables exist
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'fp_material_percentages'
      ) as material_table_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'fp_master_config'
      ) as config_table_exists
    `);
    
    // Test excluded categories
    const excludedCategories = await fpDataService.getExcludedProductGroups();
    const allProductGroups = await pool.query('SELECT DISTINCT productgroup FROM fp_data_excel WHERE productgroup IS NOT NULL ORDER BY productgroup');
    
    res.json({ 
      success: true, 
      message: 'Master data test endpoint working',
      tables: tableCheck.rows[0],
      excludedCategories: excludedCategories,
      allProductGroups: allProductGroups.rows.map(r => r.productgroup)
    });
  } catch (error) {
    console.error('Error testing master data tables:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test master data tables', 
      error: error.message 
    });
  }
});

// Get product groups for master data (excludes service charges, etc.)
app.get('/api/fp/master-data/product-groups', async (req, res) => {
  try {
    const productGroups = await fpDataService.getProductGroupsForMasterData();
    res.json({ success: true, data: productGroups });
  } catch (error) {
    console.error('Error fetching product groups for master data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch product groups', 
      error: error.message 
    });
  }
});

// Get all material percentages
app.get('/api/fp/master-data/material-percentages', async (req, res) => {
  try {
    const materialPercentages = await fpDataService.getMaterialPercentages();
    res.json({ success: true, data: materialPercentages });
  } catch (error) {
    console.error('Error fetching material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch material percentages', 
      error: error.message 
    });
  }
});

// Save material percentages for a product group
app.post('/api/fp/master-data/material-percentages', async (req, res) => {
  try {
    const { productGroup, percentages } = req.body;
    
    if (!productGroup || !percentages) {
      return res.status(400).json({ 
        success: false, 
        message: 'productGroup and percentages are required' 
      });
    }
    
    const result = await fpDataService.saveMaterialPercentage(productGroup, percentages);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save material percentages', 
      error: error.message 
    });
  }
});

// Initialize material percentages for all product groups
app.post('/api/fp/master-data/initialize', async (req, res) => {
  try {
    const productGroups = await fpDataService.initializeMaterialPercentages();
    res.json({ 
      success: true, 
      message: `Initialized material percentages for ${productGroups.length} product groups`,
      data: productGroups 
    });
  } catch (error) {
    console.error('Error initializing material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize material percentages', 
      error: error.message 
    });
  }
});

// ========================================
// SB Division Master Data API Endpoints
// ========================================

// Get product groups for SB master data
app.get('/api/sb/master-data/product-groups', async (req, res) => {
  try {
    const productGroups = await sbDataService.getProductGroupsForMasterData();
    res.json({ success: true, data: productGroups });
  } catch (error) {
    console.error('Error fetching SB product groups for master data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch SB product groups', 
      error: error.message 
    });
  }
});

// Get all SB material percentages
app.get('/api/sb/master-data/material-percentages', async (req, res) => {
  try {
    const materialPercentages = await sbDataService.getMaterialPercentages();
    res.json({ success: true, data: materialPercentages });
  } catch (error) {
    console.error('Error fetching SB material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch SB material percentages', 
      error: error.message 
    });
  }
});

// Save SB material percentages for a product group
app.post('/api/sb/master-data/material-percentages', async (req, res) => {
  try {
    const { productGroup, percentages } = req.body;
    
    if (!productGroup || !percentages) {
      return res.status(400).json({ 
        success: false, 
        message: 'productGroup and percentages are required' 
      });
    }
    
    const result = await sbDataService.saveMaterialPercentage(productGroup, percentages);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving SB material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save SB material percentages', 
      error: error.message 
    });
  }
});

// Initialize SB material percentages for all product groups
app.post('/api/sb/master-data/initialize', async (req, res) => {
  try {
    const productGroups = await sbDataService.initializeMaterialPercentages();
    res.json({ 
      success: true, 
      message: `Initialized SB material percentages for ${productGroups.length} product groups`,
      data: productGroups 
    });
  } catch (error) {
    console.error('Error initializing SB material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize SB material percentages', 
      error: error.message 
    });
  }
});

// ========================================
// TF Division Master Data API Endpoints
// ========================================

// Get product groups for TF master data
app.get('/api/tf/master-data/product-groups', async (req, res) => {
  try {
    const productGroups = await tfDataService.getProductGroupsForMasterData();
    res.json({ success: true, data: productGroups });
  } catch (error) {
    console.error('Error fetching TF product groups for master data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch TF product groups', 
      error: error.message 
    });
  }
});

// Get all TF material percentages
app.get('/api/tf/master-data/material-percentages', async (req, res) => {
  try {
    const materialPercentages = await tfDataService.getMaterialPercentages();
    res.json({ success: true, data: materialPercentages });
  } catch (error) {
    console.error('Error fetching TF material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch TF material percentages', 
      error: error.message 
    });
  }
});

// Save TF material percentages for a product group
app.post('/api/tf/master-data/material-percentages', async (req, res) => {
  try {
    const { productGroup, percentages } = req.body;
    
    if (!productGroup || !percentages) {
      return res.status(400).json({ 
        success: false, 
        message: 'productGroup and percentages are required' 
      });
    }
    
    const result = await tfDataService.saveMaterialPercentage(productGroup, percentages);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving TF material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save TF material percentages', 
      error: error.message 
    });
  }
});

// Initialize TF material percentages for all product groups
app.post('/api/tf/master-data/initialize', async (req, res) => {
  try {
    const productGroups = await tfDataService.initializeMaterialPercentages();
    res.json({ 
      success: true, 
      message: `Initialized TF material percentages for ${productGroups.length} product groups`,
      data: productGroups 
    });
  } catch (error) {
    console.error('Error initializing TF material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize TF material percentages', 
      error: error.message 
    });
  }
});

// ========================================
// HCM Division Master Data API Endpoints
// ========================================

// Get product groups for HCM master data
app.get('/api/hcm/master-data/product-groups', async (req, res) => {
  try {
    const productGroups = await hcmDataService.getProductGroupsForMasterData();
    res.json({ success: true, data: productGroups });
  } catch (error) {
    console.error('Error fetching HCM product groups for master data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch HCM product groups', 
      error: error.message 
    });
  }
});

// Get all HCM material percentages
app.get('/api/hcm/master-data/material-percentages', async (req, res) => {
  try {
    const materialPercentages = await hcmDataService.getMaterialPercentages();
    res.json({ success: true, data: materialPercentages });
  } catch (error) {
    console.error('Error fetching HCM material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch HCM material percentages', 
      error: error.message 
    });
  }
});

// Save HCM material percentages for a product group
app.post('/api/hcm/master-data/material-percentages', async (req, res) => {
  try {
    const { productGroup, percentages } = req.body;
    
    if (!productGroup || !percentages) {
      return res.status(400).json({ 
        success: false, 
        message: 'productGroup and percentages are required' 
      });
    }
    
    const result = await hcmDataService.saveMaterialPercentage(productGroup, percentages);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving HCM material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save HCM material percentages', 
      error: error.message 
    });
  }
});

// Initialize HCM material percentages for all product groups
app.post('/api/hcm/master-data/initialize', async (req, res) => {
  try {
    const productGroups = await hcmDataService.initializeMaterialPercentages();
    res.json({ 
      success: true, 
      message: `Initialized HCM material percentages for ${productGroups.length} product groups`,
      data: productGroups 
    });
  } catch (error) {
    console.error('Error initializing HCM material percentages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize HCM material percentages', 
      error: error.message 
    });
  }
});

// Get all product groups (optionally filtered by sales rep or group) - UNIVERSAL
app.get('/api/product-groups-universal', async (req, res) => {
  try {
    const { division, salesRep } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    let productGroups;
    
    if (salesRep) {
      // Check if salesRep is actually a group name
      if (isSalesRepGroup(division, salesRep)) {
        // It's a group - get product groups for all members
        const groupMembers = getGroupMembers(division, salesRep);
        console.log(`Fetching product groups for group '${salesRep}' with members:`, groupMembers);
        
        // Get product groups for each member and combine them
        const allProductGroups = new Set();
        
        for (const member of groupMembers) {
          try {
            const memberProductGroups = await UniversalSalesByCountryService.getProductGroupsBySalesRep(division, member);
            memberProductGroups.forEach(pg => {
              allProductGroups.add(pg.pgcombine || pg.product_group || pg);
            });
          } catch (memberError) {
            console.warn(`Failed to fetch product groups for member '${member}':`, memberError.message);
          }
        }
        
        // Convert Set back to array format expected by frontend
        productGroups = Array.from(allProductGroups).map(pgName => ({
          pgcombine: pgName,
          product_group: pgName
        }));
        
        console.log(`Found ${productGroups.length} unique product groups for group '${salesRep}'`);
      } else {
        // It's an individual sales rep
        productGroups = await UniversalSalesByCountryService.getProductGroupsBySalesRep(division, salesRep);
      }
    } else {
      // Get all product groups
      productGroups = await UniversalSalesByCountryService.getProductGroups(division);
    }
    
    res.json({ success: true, data: productGroups });
  } catch (error) {
    console.error('Error fetching product groups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product groups', error: error.message });
  }
});

// Legacy endpoint for FP division (kept for backward compatibility)
app.get('/api/fp/product-groups', async (req, res) => {
  try {
    const salesRep = req.query.salesRep;
    let productGroups;
    
    if (salesRep) {
      // Check if salesRep is actually a group name
      const config = loadSalesRepConfig();
      const fpConfig = config.FP || { groups: {} };
      
      if (fpConfig.groups && fpConfig.groups[salesRep]) {
        // It's a group - get product groups for all members
        const groupMembers = fpConfig.groups[salesRep];
        console.log(`Fetching product groups for group '${salesRep}' with members:`, groupMembers);
        
        // Get product groups for each member and combine them
        const allProductGroups = new Set();
        
        for (const member of groupMembers) {
          try {
            const memberProductGroups = await fpDataService.getProductGroupsBySalesRep(member);
            memberProductGroups.forEach(pg => {
              allProductGroups.add(pg.pgcombine || pg.product_group || pg);
            });
          } catch (memberError) {
            console.warn(`Failed to fetch product groups for member '${member}':`, memberError.message);
          }
        }
        
        // Convert Set back to array format expected by frontend
        productGroups = Array.from(allProductGroups).map(pgName => ({
          pgcombine: pgName,
          product_group: pgName
        }));
        
        console.log(`Found ${productGroups.length} unique product groups for group '${salesRep}'`);
      } else {
        // It's an individual sales rep
        productGroups = await fpDataService.getProductGroupsBySalesRep(salesRep);
      }
    } else {
      // Get all product groups
      productGroups = await fpDataService.getProductGroups();
    }
    
    res.json({ success: true, data: productGroups });
  } catch (error) {
    console.error('Error fetching product groups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product groups', error: error.message });
  }
});

// Get sales data for a specific sales rep, product group, and period
app.get('/api/fp/sales-data', async (req, res) => {
  try {
    const { salesRep, productGroup, valueType, year, month, dataType = 'actual' } = req.query;
    
    if (!salesRep || !productGroup || !year || !month) {
      return res.status(400).json({ 
        success: false, 
        message: 'salesRep, productGroup, year, and month are required' 
      });
    }
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let salesData;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get sales data for all members
      const groupMembers = fpConfig.groups[salesRep];
      
      if (valueType) {
        // Use value type specific query for groups
        salesData = 0;
        for (const member of groupMembers) {
          const memberData = await fpDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, dataType);
          salesData += memberData;
        }
      } else {
        salesData = await fpDataService.getSalesDataForGroup(groupMembers, productGroup, dataType, year, month);
      }
    } else {
      // It's an individual sales rep
      if (valueType) {
        salesData = await fpDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, dataType);
      } else {
        salesData = await fpDataService.getSalesData(salesRep, productGroup, dataType, year, month);
      }
    }
    
    res.json({ success: true, data: salesData });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales data', error: error.message });
  }
});

// API endpoint to get sales reps from fp_data table for FP division
app.get('/api/fp/sales-reps-from-db', async (req, res) => {
  try {
    console.log('🔍 Getting sales reps from fp_data_excel table...');
    
    const client = await pool.connect();
    
    // Get unique sales rep names from fp_data_excel table
    const salesRepsResult = await client.query(`
      SELECT DISTINCT salesrepname 
      FROM fp_data 
      WHERE salesrepname IS NOT NULL 
      AND TRIM(salesrepname) != ''
      AND salesrepname != '(blank)'
      ORDER BY salesrepname
    `);
    
    const salesReps = salesRepsResult.rows.map(row => row.salesrepname);
    
    console.log(`✅ Found ${salesReps.length} unique sales reps from fp_data_excel`);
    
    client.release();
    
    res.json({
      success: true,
      data: salesReps,
      message: `Retrieved ${salesReps.length} sales representatives from fp_data_excel table`
    });
    
  } catch (error) {
    console.error('❌ Error getting sales reps from fp_data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales representatives from database',
      message: error.message
    });
  }
});

// Optimized batch API endpoint for sales rep dashboard data - UNIVERSAL
app.post('/api/sales-rep-dashboard-universal', async (req, res) => {
  try {
    const { division, salesRep, valueTypes = ['KGS', 'Amount'], periods = [] } = req.body;
    
    if (!division || !salesRep) {
      return res.status(400).json({ 
        success: false, 
        message: 'division and salesRep are required' 
      });
    }
    
    console.log(`🔍 Getting dashboard data for sales rep: ${salesRep} in division: ${division}`);
    
    // Check if salesRep is actually a group name
    let productGroups;
    
    if (isSalesRepGroup(division, salesRep)) {
      // It's a group - get product groups for all members
      const groupMembers = getGroupMembers(division, salesRep);
      console.log(`Fetching data for group '${salesRep}' with members:`, groupMembers);
      
      const allProductGroups = new Set();
      for (const member of groupMembers) {
        try {
          const memberProductGroups = await UniversalSalesByCountryService.getProductGroupsBySalesRep(division, member);
          memberProductGroups.forEach(pg => allProductGroups.add(pg));
        } catch (memberError) {
          console.warn(`Failed to fetch product groups for member '${member}':`, memberError.message);
        }
      }
      productGroups = Array.from(allProductGroups);
    } else {
      // It's an individual sales rep
      productGroups = await UniversalSalesByCountryService.getProductGroupsBySalesRep(division, salesRep);
    }
    
    // Get batch sales data for all combinations
    const dashboardData = {};
    
    for (const productGroup of productGroups) {
      dashboardData[productGroup] = {};
      
      for (const valueType of valueTypes) {
        dashboardData[productGroup][valueType] = {};
        
        for (const period of periods) {
          const { year, month, type = 'Actual' } = period;
          
          let salesData;
          if (isSalesRepGroup(division, salesRep)) {
            // Group data - sum individual sales reps
            const groupMembers = getGroupMembers(division, salesRep);
            salesData = 0;
            for (const member of groupMembers) {
              let memberData;
              switch(division.toUpperCase()) {
                case 'FP':
                  memberData = await fpDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                  break;
                case 'SB':
                  memberData = await sbDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                  break;
                case 'TF':
                  memberData = await tfDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                  break;
                case 'HCM':
                  memberData = await hcmDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                  break;
                default:
                  memberData = await fpDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
              }
              salesData += memberData;
            }
          } else {
            // Individual sales rep data
            switch(division.toUpperCase()) {
              case 'FP':
                salesData = await fpDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                break;
              case 'SB':
                salesData = await sbDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                break;
              case 'TF':
                salesData = await tfDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                break;
              case 'HCM':
                salesData = await hcmDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                break;
              default:
                salesData = await fpDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
            }
          }
          
          dashboardData[productGroup][valueType][`${year}-${month}-${type}`] = salesData;
        }
      }
    }
    
    console.log(`✅ Retrieved dashboard data for ${productGroups.length} product groups`);
    
    res.json({
      success: true,
      data: {
        salesRep,
        productGroups,
        dashboardData,
        isGroup: isSalesRepGroup(division, salesRep)
      },
      message: `Retrieved dashboard data for ${salesRep} in ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting sales rep dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales rep dashboard data',
      message: error.message
    });
  }
});

// OPTIMIZED: Unified batch API endpoint for complete sales rep data (KGS + Amount + MoRM + Customer data)
app.post('/api/sales-rep-complete-data', async (req, res) => {
  try {
    const { division, salesRep, periods = [] } = req.body;
    
    if (!division || !salesRep) {
      return res.status(400).json({ 
        success: false, 
        message: 'division and salesRep are required' 
      });
    }
    
    console.log(`🚀 Getting complete data for sales rep: ${salesRep} in division: ${division}`);
    
    // Check if salesRep is actually a group name
    const isGroup = isSalesRepGroup(division, salesRep);
    let productGroups, customers;
    
    if (isGroup) {
      // It's a group - get product groups and customers for all members
      const groupMembers = getGroupMembers(division, salesRep);
      console.log(`Fetching complete data for group '${salesRep}' with members:`, groupMembers);
      
      // Get product groups for all group members
      const allProductGroups = new Set();
      const allCustomers = new Set();
      
      for (const member of groupMembers) {
        try {
          const memberProductGroups = await UniversalSalesByCountryService.getProductGroupsBySalesRep(division, member);
          memberProductGroups.forEach(pg => allProductGroups.add(pg));
          
          const memberCustomers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, member);
          memberCustomers.forEach(customer => allCustomers.add(customer));
        } catch (memberError) {
          console.warn(`Failed to fetch data for member '${member}':`, memberError.message);
        }
      }
      
      productGroups = Array.from(allProductGroups);
      customers = Array.from(allCustomers);
    } else {
      // It's an individual sales rep
      productGroups = await UniversalSalesByCountryService.getProductGroupsBySalesRep(division, salesRep);
      customers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, salesRep);
    }
    
    // Prepare batch data structures
    const dashboardData = {};
    const customerData = {};
    const valueTypes = ['KGS', 'Amount', 'MoRM'];
    
    // Initialize dashboard data structure
    for (const productGroup of productGroups) {
      dashboardData[productGroup] = {};
      for (const valueType of valueTypes) {
        dashboardData[productGroup][valueType] = {};
      }
    }
    
    // Initialize customer data structure
    for (const customer of customers) {
      customerData[customer] = {};
    }
    
    // Batch fetch all data using optimized queries
    const dataPromises = [];
    
    // Product group data promises
    for (const productGroup of productGroups) {
      for (const valueType of valueTypes) {
        for (const period of periods) {
          const { year, month, type = 'Actual' } = period;
          const periodKey = `${year}-${month}-${type}`;
          
          const promise = (async () => {
            try {
              let salesData;
              if (isGroup) {
                // Group data - sum individual sales reps
                const groupMembers = getGroupMembers(division, salesRep);
                salesData = 0;
                for (const member of groupMembers) {
                  let memberData;
                  switch(division.toUpperCase()) {
                    case 'FP':
                      memberData = await fpDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                      break;
                    case 'SB':
                      memberData = await sbDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                      break;
                    case 'TF':
                      memberData = await tfDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                      break;
                    case 'HCM':
                      memberData = await hcmDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                      break;
                    default:
                      memberData = await fpDataService.getSalesDataByValueType(member, productGroup, valueType, year, month, type);
                  }
                  salesData += memberData;
                }
              } else {
                // Individual sales rep data
                switch(division.toUpperCase()) {
                  case 'FP':
                    salesData = await fpDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                    break;
                  case 'SB':
                    salesData = await sbDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                    break;
                  case 'TF':
                    salesData = await tfDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                    break;
                  case 'HCM':
                    salesData = await hcmDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                    break;
                  default:
                    salesData = await fpDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
                }
              }
              
              dashboardData[productGroup][valueType][periodKey] = salesData;
            } catch (error) {
              console.error(`Error fetching ${valueType} data for ${productGroup} - ${periodKey}:`, error);
              dashboardData[productGroup][valueType][periodKey] = 0;
            }
          })();
          
          dataPromises.push(promise);
        }
      }
    }
    
    // Customer data promises (KGS only for performance)
    for (const customer of customers) {
      for (const period of periods) {
        const { year, month, type = 'Actual' } = period;
        const periodKey = `${year}-${month}-${type}`;
        
        const promise = (async () => {
          try {
            let customerSalesData;
            if (isGroup) {
              // Group data - sum individual sales reps
              const groupMembers = getGroupMembers(division, salesRep);
              customerSalesData = 0;
              for (const member of groupMembers) {
                let memberData;
                switch(division.toUpperCase()) {
                  case 'FP':
                    memberData = await fpDataService.getCustomerSalesDataByValueType(member, customer, 'KGS', year, month, type);
                    break;
                  default:
                    memberData = await fpDataService.getCustomerSalesDataByValueType(member, customer, 'KGS', year, month, type);
                }
                customerSalesData += memberData;
              }
            } else {
              // Individual sales rep data
              switch(division.toUpperCase()) {
                case 'FP':
                  customerSalesData = await fpDataService.getCustomerSalesDataByValueType(salesRep, customer, 'KGS', year, month, type);
                  break;
                default:
                  customerSalesData = await fpDataService.getCustomerSalesDataByValueType(salesRep, customer, 'KGS', year, month, type);
              }
            }
            
            customerData[customer][periodKey] = customerSalesData;
          } catch (error) {
            console.error(`Error fetching customer data for ${customer} - ${periodKey}:`, error);
            customerData[customer][periodKey] = 0;
          }
        })();
        
        dataPromises.push(promise);
      }
    }
    
    // Execute all promises in parallel for maximum performance
    await Promise.all(dataPromises);
    
    console.log(`✅ Retrieved complete data for ${productGroups.length} product groups and ${customers.length} customers`);
    
    res.json({
      success: true,
      data: {
        salesRep,
        productGroups,
        customers,
        dashboardData,
        customerData,
        isGroup
      },
      message: `Retrieved complete data for ${salesRep} in ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting complete sales rep data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve complete sales rep data',
      message: error.message
    });
  }
});

// Legacy endpoint for FP division (kept for backward compatibility)
app.post('/api/fp/sales-rep-dashboard', async (req, res) => {
  try {
    const { salesRep, valueTypes = ['KGS', 'Amount'], periods = [] } = req.body;
    
    if (!salesRep) {
      return res.status(400).json({ 
        success: false, 
        message: 'salesRep is required' 
      });
    }
    
    console.log(`🔍 Getting dashboard data for sales rep: ${salesRep}`);
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let productGroups;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get product groups for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching data for group '${salesRep}' with members:`, groupMembers);
      
      const allProductGroups = new Set();
      for (const member of groupMembers) {
        try {
          const memberProductGroups = await fpDataService.getProductGroupsBySalesRep(member);
          memberProductGroups.forEach(pg => allProductGroups.add(pg));
        } catch (memberError) {
          console.warn(`Failed to fetch product groups for member '${member}':`, memberError.message);
        }
      }
      productGroups = Array.from(allProductGroups);
    } else {
      // It's an individual sales rep
      productGroups = await fpDataService.getProductGroupsBySalesRep(salesRep);
    }
    
    // Get batch sales data for all combinations
    const dashboardData = {};
    
    for (const productGroup of productGroups) {
      dashboardData[productGroup] = {};
      
      for (const valueType of valueTypes) {
        dashboardData[productGroup][valueType] = {};
        
        for (const period of periods) {
          const { year, month, type = 'Actual' } = period;
          
          let salesData;
          if (fpConfig.groups && fpConfig.groups[salesRep]) {
            // Group data
            const groupMembers = fpConfig.groups[salesRep];
            salesData = await fpDataService.getSalesDataForGroup(groupMembers, productGroup, valueType, year, month, type);
          } else {
            // Individual sales rep data
            salesData = await fpDataService.getSalesDataByValueType(salesRep, productGroup, valueType, year, month, type);
          }
          
          dashboardData[productGroup][valueType][`${year}-${month}-${type}`] = salesData;
        }
      }
    }
    
    console.log(`✅ Retrieved dashboard data for ${productGroups.length} product groups`);
    
    res.json({
      success: true,
      data: {
        salesRep,
        productGroups,
        dashboardData,
        isGroup: !!(fpConfig.groups && fpConfig.groups[salesRep])
      },
      message: `Retrieved dashboard data for ${salesRep}`
    });
    
  } catch (error) {
    console.error('❌ Error getting sales rep dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales rep dashboard data',
      message: error.message
    });
  }
});

// Optimized batch API endpoint for customer dashboard data (KGS only)
app.post('/api/fp/customer-dashboard', async (req, res) => {
  try {
    const { salesRep, periods = [] } = req.body;
    
    if (!salesRep) {
      return res.status(400).json({ 
        success: false, 
        message: 'salesRep is required' 
      });
    }
    
    console.log(`🔍 Getting customer dashboard data for sales rep: ${salesRep}`);
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let customers;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get customers for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching customers for group '${salesRep}' with members:`, groupMembers);
      
      customers = await fpDataService.getCustomersForGroup(groupMembers);
    } else {
      // It's an individual sales rep
      customers = await fpDataService.getCustomersBySalesRep(salesRep);
    }
    
    // Get batch customer sales data for KGS only
    const dashboardData = {};
    
    for (const customer of customers) {
      dashboardData[customer] = {};
      
      for (const period of periods) {
        const { year, month, type = 'Actual' } = period;
        
        let salesData;
        if (fpConfig.groups && fpConfig.groups[salesRep]) {
          // Group data
          const groupMembers = fpConfig.groups[salesRep];
          salesData = await fpDataService.getCustomerSalesDataForGroup(groupMembers, customer, 'KGS', year, month, type);
        } else {
          // Individual sales rep data
          salesData = await fpDataService.getCustomerSalesDataByValueType(salesRep, customer, 'KGS', year, month, type);
        }
        
        dashboardData[customer][`${year}-${month}-${type}`] = salesData;
      }
    }
    
    console.log(`✅ Retrieved customer dashboard data for ${customers.length} customers`);
    
    res.json({
      success: true,
      data: {
        salesRep,
        customers,
        dashboardData,
        isGroup: !!(fpConfig.groups && fpConfig.groups[salesRep])
      },
      message: `Retrieved customer dashboard data for ${salesRep}`
    });
    
  } catch (error) {
    console.error('❌ Error getting customer dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer dashboard data',
      message: error.message
    });
  }
});

// Get yearly budget total for a specific sales rep and year
app.post('/api/fp/yearly-budget', async (req, res) => {
  try {
    const { salesRep, year, valuesType } = req.body;
    
    if (!salesRep || !year || !valuesType) {
      return res.status(400).json({ 
        success: false, 
        message: 'salesRep, year, and valuesType are required' 
      });
    }
    
    console.log(`🔍 Getting yearly budget for sales rep: ${salesRep}, year: ${year}, valuesType: ${valuesType}`);
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let yearlyBudgetTotal;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get yearly budget for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching yearly budget for group '${salesRep}' with members:`, groupMembers);
      
      yearlyBudgetTotal = await fpDataService.getYearlyBudget(salesRep, year, valuesType, groupMembers);
    } else {
      // It's an individual sales rep
      yearlyBudgetTotal = await fpDataService.getYearlyBudget(salesRep, year, valuesType);
    }
    
    console.log(`✅ Retrieved yearly budget total: ${yearlyBudgetTotal} for ${salesRep}`);
    
    res.json({
      success: true,
      data: yearlyBudgetTotal,
      message: `Retrieved yearly budget for ${salesRep} - ${year} (${valuesType})`
    });
    
  } catch (error) {
    console.error('❌ Error getting yearly budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve yearly budget',
      message: error.message
    });
  }
});

// Get sales by country for a specific sales rep and period
app.post('/api/fp/sales-by-country', async (req, res) => {
  try {
    const { salesRep, year, months, dataType = 'Actual' } = req.body;
    if (!salesRep || !year || !months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'salesRep, year, and months (array) are required' 
      });
    }
    console.log(`🔍 Getting sales by country for sales rep: ${salesRep}, year: ${year}, months: [${months.join(', ')}], dataType: ${dataType}`);
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let countrySalesData;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get sales by country for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching sales by country for group '${salesRep}' with members:`, groupMembers);
      
      countrySalesData = await fpDataService.getSalesByCountry(salesRep, year, months, dataType, groupMembers);
    } else {
      // It's an individual sales rep
      countrySalesData = await fpDataService.getSalesByCountry(salesRep, year, months, dataType);
    }
    
    console.log(`✅ Retrieved sales by country data: ${countrySalesData.length} countries for ${salesRep}`);
    
    res.json({
      success: true,
      data: countrySalesData,
      message: `Retrieved sales by country for ${salesRep} - ${year}/[${months.join(', ')}] (${dataType})`
    });
    
  } catch (error) {
    console.error('❌ Error getting sales by country:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales by country',
      message: error.message
    });
  }
});

// Get countries from fp_data database for FP division
app.get('/api/fp/countries', async (req, res) => {
  try {
    console.log('🔍 Getting countries from fp_data_excel database...');
    
    const countries = await fpDataService.getCountriesFromDatabase();
    
    console.log(`✅ Retrieved ${countries.length} countries from fp_data_excel database`);
    
    res.json({
      success: true,
      data: countries,
      message: `Retrieved ${countries.length} countries from database`
    });
    
  } catch (error) {
    console.error('❌ Error getting countries from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve countries from database',
      message: error.message
    });
  }
});

// Get countries by sales rep from fp_data database
app.get('/api/fp/countries-by-sales-rep', async (req, res) => {
  try {
    const { salesRep } = req.query;
    
    if (!salesRep) {
      return res.status(400).json({ 
        success: false, 
        message: 'salesRep parameter is required' 
      });
    }
    
    console.log(`🔍 Getting countries for sales rep: ${salesRep} from fp_data_excel database...`);
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let countries;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get countries for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching countries for group '${salesRep}' with members:`, groupMembers);
      
      countries = await fpDataService.getCountriesBySalesRep(salesRep, groupMembers);
    } else {
      // It's an individual sales rep
      countries = await fpDataService.getCountriesBySalesRep(salesRep);
    }
    
    console.log(`✅ Retrieved ${countries.length} countries for ${salesRep}`);
    
    res.json({
      success: true,
      data: countries,
      message: `Retrieved ${countries.length} countries for ${salesRep}`
    });
    
  } catch (error) {
    console.error('❌ Error getting countries by sales rep:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve countries by sales rep',
      message: error.message
    });
  }
});

// ============================================================
// PRODUCT PERFORMANCE API ENDPOINTS (KPI Executive Summary)
// ============================================================

/**
 * POST /api/fp/product-performance
 * Get comprehensive product performance data for KPI Executive Summary
 * 
 * Request Body:
 * {
 *   currentPeriod: { year: 2025, months: ['January', 'February'], type: 'Actual' },
 *   comparisonPeriod: { year: 2024, months: ['January', 'February'], type: 'Actual' } // optional
 * }
 */
app.post('/api/fp/product-performance', async (req, res) => {
  try {
    const { currentPeriod, comparisonPeriod } = req.body;
    
    // Validate current period
    if (!currentPeriod || !currentPeriod.year || !currentPeriod.months || !currentPeriod.type) {
      return res.status(400).json({
        success: false,
        message: 'currentPeriod with year, months array, and type is required'
      });
    }
    
    // Validate months is an array
    if (!Array.isArray(currentPeriod.months) || currentPeriod.months.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'currentPeriod.months must be a non-empty array'
      });
    }
    
    console.log('🔍 Fetching product performance data:', {
      current: `${currentPeriod.year} ${currentPeriod.months.join(', ')} (${currentPeriod.type})`,
      comparison: comparisonPeriod ? `${comparisonPeriod.year} ${comparisonPeriod.months.join(', ')} (${comparisonPeriod.type})` : 'None'
    });
    
    // Fetch comprehensive product performance data
    const data = await productPerformanceService.getComprehensiveProductPerformance(
      currentPeriod,
      comparisonPeriod
    );
    
    console.log('✅ Product performance data retrieved successfully:', {
      products: data.products.length,
      processCategories: Object.keys(data.processCategories).length,
      materialCategories: Object.keys(data.materialCategories).length,
      totalSales: data.summary.totalSales.toLocaleString()
    });
    
    res.json({
      success: true,
      data,
      meta: {
        currentPeriod: productPerformanceService.formatPeriod(currentPeriod),
        comparisonPeriod: comparisonPeriod ? productPerformanceService.formatPeriod(comparisonPeriod) : null,
        timestamp: new Date().toISOString()
      },
      debug: process.env.NODE_ENV === 'development' ? {
        productsCount: data.products.length,
        firstProduct: data.products[0] || null
      } : undefined
    });
    
  } catch (error) {
    console.error('❌ Error fetching product performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve product performance data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all customers for a division (for centralized merging)
app.get('/api/fp/all-customers', async (req, res) => {
  try {
    const { division } = req.query;
    
    if (!division) {
      return res.status(400).json({ 
        success: false, 
        message: 'division parameter is required' 
      });
    }
    
    console.log(`🔍 Getting all customers for division: ${division}`);
    
    // For now, only FP division is supported
    if (division !== 'FP') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only FP division is currently supported for customer merging' 
      });
    }
    
    // Get all unique customers from the fp_data_excel table
    const customers = await fpDataService.getAllCustomers();
    
    console.log(`✅ Retrieved ${customers.length} customers for ${division} division`);
    
    res.json({
      success: true,
      data: customers,
      message: `Retrieved ${customers.length} customers for ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting all customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve all customers',
      message: error.message
    });
  }
});

// Import UniversalSalesByCountryService
const UniversalSalesByCountryService = require('./database/UniversalSalesByCountryService');
const { validateDivision, getDivisionInfo } = require('./database/divisionDatabaseConfig');
const CustomerMergeRulesService = require('./database/CustomerMergeRulesService');
const GeographicDistributionService = require('./database/GeographicDistributionService');
const CustomerInsightsService = require('./database/CustomerInsightsService');
// const WorldCountriesService = require('./database/WorldCountriesService');

// ========================================
// NEW DATABASE-BASED SALES BY COUNTRY API ENDPOINTS
// ========================================

// Get countries from database for any division
app.get('/api/countries-db', async (req, res) => {
  try {
    const { division } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    console.log(`🔍 Getting countries from database for division: ${division}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const countries = await UniversalSalesByCountryService.getCountriesByDivision(division);
    
    console.log(`✅ Retrieved ${countries.length} countries from database for ${division} division`);
    
    res.json({
      success: true,
      data: countries,
      message: `Retrieved ${countries.length} countries from database for ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting countries from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve countries from database',
      message: error.message
    });
  }
});

// Get sales by country from database for any division
app.post('/api/sales-by-country-db', async (req, res) => {
  try {
    const { division, salesRep, year, months, dataType = 'Actual' } = req.body;

    if (!division || !year || !months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'division, year, and months (array) are required'
      });
    }
    
    console.log(`🔍 Getting sales by country from database for division: ${division}, salesRep: ${salesRep}, year: ${year}, months: [${months.join(', ')}], dataType: ${dataType}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let countrySalesData;
    
    if (salesRep && fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get sales by country for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching sales by country for group '${salesRep}' with members:`, groupMembers);
      
      countrySalesData = await UniversalSalesByCountryService.getSalesByCountry(division, salesRep, year, months, dataType, groupMembers);
    } else {
      // Individual or all sales reps (if salesRep missing or 'ALL')
      countrySalesData = await UniversalSalesByCountryService.getSalesByCountry(division, salesRep || null, year, months, dataType);
    }
    
    const salesRepDisplay = salesRep || 'All Sales Reps';
    console.log(`✅ Retrieved sales by country data: ${countrySalesData.length} countries for ${salesRepDisplay}`);
    
    res.json({
      success: true,
      data: countrySalesData,
      message: `Retrieved sales by country for ${salesRepDisplay} - ${year}/[${months.join(', ')}] (${dataType}) from database`
    });
    
  } catch (error) {
    console.error('❌ Error getting sales by country from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales by country from database',
      message: error.message
    });
  }
});

// Get countries by sales rep from database for any division
app.get('/api/countries-by-sales-rep-db', async (req, res) => {
  try {
    const { division, salesRep } = req.query;
    
    if (!division || !salesRep) {
      return res.status(400).json({
        success: false,
        message: 'division and salesRep parameters are required'
      });
    }
    
    console.log(`🔍 Getting countries for sales rep: ${salesRep} from database for division: ${division}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let countries;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get countries for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching countries for group '${salesRep}' with members:`, groupMembers);
      
      countries = await UniversalSalesByCountryService.getCountriesBySalesRep(division, salesRep, groupMembers);
    } else {
      // It's an individual sales rep
      countries = await UniversalSalesByCountryService.getCountriesBySalesRep(division, salesRep);
    }
    
    console.log(`✅ Retrieved ${countries.length} countries for ${salesRep} from database`);
    
    res.json({
      success: true,
      data: countries,
      message: `Retrieved ${countries.length} countries for ${salesRep} from database`
    });
    
  } catch (error) {
    console.error('❌ Error getting countries by sales rep from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve countries by sales rep from database',
      message: error.message
    });
  }
});

// Get geographic distribution data from database
app.post('/api/geographic-distribution', async (req, res) => {
  try {
    const { division = 'FP', year, months, type = 'Actual', includeComparison = false } = req.body;
    
    if (!year || !months || !Array.isArray(months)) {
      return res.status(400).json({
        success: false,
        message: 'year and months (array) are required'
      });
    }
    
    console.log(`🔍 Getting geographic distribution for division: ${division}, year: ${year}, months: ${months.join(', ')}, type: ${type}, includeComparison: ${includeComparison}`);
    console.log(`🔍 Request body:`, req.body);
    
    // Validate input parameters more thoroughly
    const yearNumber = parseInt(year);
    if (isNaN(yearNumber) || yearNumber < 2020 || yearNumber > 2035) {
      console.error(`❌ Invalid year: ${year} (type: ${typeof year})`);
      return res.status(400).json({
        success: false,
        message: `Invalid year: ${year}. Year must be an integer between 2020 and 2035.`
      });
    }
    
    if (!Array.isArray(months) || months.length === 0) {
      console.error(`❌ Invalid months: ${JSON.stringify(months)} (type: ${typeof months})`);
      return res.status(400).json({
        success: false,
        message: 'Months must be a non-empty array'
      });
    }
    
    console.log(`🔍 Months array details:`, {
      length: months.length,
      items: months.map(m => ({ value: m, type: typeof m }))
    });
    
    const geographicService = new GeographicDistributionService();
    const data = await geographicService.getGeographicDistributionData({
      division,
      year: yearNumber,
      months,
      type,
      includeComparison
    });
    
    console.log(`✅ Retrieved geographic distribution data for ${division} division:`, {
      totalSales: data.totalSales,
      countriesCount: data.countrySales?.length || 0,
      localPercentage: data.localPercentage,
      exportPercentage: data.exportPercentage
    });
    
    res.json({
      success: true,
      data,
      meta: {
        division,
        year,
        months,
        type,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting geographic distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve geographic distribution data',
      message: error.message
    });
  }
});

// Get customer insights data from database with merge rules applied
app.post('/api/customer-insights-db', async (req, res) => {
  try {
    const { division = 'FP', year, months, type = 'Actual' } = req.body;
    
    if (!year || !months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'year and months (array) are required'
      });
    }
    
    console.log(`🔍 Getting customer insights for division: ${division}, year: ${year}, months: [${months.join(', ')}], type: ${type}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const insights = await CustomerInsightsService.getCustomerInsights(division, year, months, type);
    
    console.log(`✅ Retrieved customer insights for ${division} division:`, {
      totalCustomers: insights.totalCustomers,
      topCustomer: insights.topCustomer,
      top3Customer: insights.top3Customer,
      top5Customer: insights.top5Customer
    });
    
    res.json({
      success: true,
      data: insights,
      meta: {
        division,
        year,
        months,
        type,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting customer insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer insights data',
      message: error.message
    });
  }
});

// Get unassigned countries with notification system (temporarily disabled)
// app.get('/api/unassigned-countries', async (req, res) => {
//   try {
//     const { division = 'FP' } = req.query;
//     
//     console.log(`🔍 Getting unassigned countries for division: ${division}`);
//     
//     const worldCountriesService = new WorldCountriesService();
//     const result = await worldCountriesService.getUnassignedCountries(division);
//     
//     console.log(`✅ Retrieved unassigned countries data for ${division} division`);
//     console.log(`📊 Total countries: ${result.totalCountries}, Unassigned: ${result.unassigned.length}, Suggestions: ${result.suggestions.length}`);
//     
//     res.json({
//       success: true,
//       data: result,
//       meta: {
//         division,
//         timestamp: new Date().toISOString(),
//         hasUnassignedCountries: result.unassigned.length > 0,
//         notificationMessage: result.unassigned.length > 0 
//           ? `⚠️ Found ${result.unassigned.length} unassigned countries that need regional assignment`
//           : '✅ All countries are properly assigned to regions'
//       }
//     });
//     
//   } catch (error) {
//     console.error('❌ Error getting unassigned countries:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to retrieve unassigned countries data',
//       message: error.message
//     });
//   }
// });

// Get division information and status
app.get('/api/division-info', async (req, res) => {
  try {
    const { division } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    console.log(`🔍 Getting division info for: ${division}`);
    
    try {
      const divisionInfo = getDivisionInfo(division);
      
      res.json({
        success: true,
        data: divisionInfo,
        message: `Retrieved division info for ${division}`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting division info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve division info',
      message: error.message
    });
  }
});

// Get country sales data for a specific period and value type
app.post('/api/country-sales-data-db', async (req, res) => {
  try {
    const { division, country, year, months, dataType = 'Actual', valueType = 'KGS' } = req.body;
    
    if (!division || !country || !year || !months) {
      return res.status(400).json({
        success: false,
        message: 'division, country, year, and months are required'
      });
    }
    
    console.log(`🔍 Getting country sales data from database for division: ${division}, country: ${country}, year: ${year}, months: [${months.join(', ')}], dataType: ${dataType}, valueType: ${valueType}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const salesData = await UniversalSalesByCountryService.getCountrySalesData(division, country, year, months, dataType, valueType);
    
    console.log(`✅ Retrieved country sales data: ${salesData} for ${country}`);
    
    res.json({
      success: true,
      data: salesData,
      message: `Retrieved sales data for ${country} - ${year}/[${months.join(', ')}] (${dataType}, ${valueType}) from database`
    });
    
  } catch (error) {
    console.error('❌ Error getting country sales data from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve country sales data from database',
      message: error.message
    });
  }
});

// ========================================
// SALES BY CUSTOMER API ENDPOINTS
// ========================================

// Get customers from database for any division
app.get('/api/customers-db', async (req, res) => {
  try {
    const { division } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    console.log(`🔍 Getting customers from database for division: ${division}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const customers = await UniversalSalesByCountryService.getAllCustomers(division);
    
    console.log(`✅ Retrieved ${customers.length} customers from database for ${division} division`);
    
    res.json({
      success: true,
      data: customers,
      message: `Retrieved ${customers.length} customers from database for ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting customers from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customers from database',
      message: error.message
    });
  }
});

// Batch endpoint for Sales Rep Divisional data - optimized for performance
app.post('/api/sales-rep-divisional-batch', async (req, res) => {
  try {
    const { division, salesReps, periods } = req.body;

    if (!division || !salesReps || !Array.isArray(salesReps) || !periods || !Array.isArray(periods)) {
      return res.status(400).json({
        success: false,
        message: 'division, salesReps (array), and periods (array) are required'
      });
    }
    
    console.log(`🔍 Batch getting sales rep divisional data for division: ${division}, ${salesReps.length} sales reps, ${periods.length} periods`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const batchData = {};
    
    // Process all sales reps and periods in parallel
    const promises = salesReps.map(async (salesRep) => {
      const salesRepData = {};
      
      // Process all periods for this sales rep
      const periodPromises = periods.map(async (period) => {
        try {
          const customerSalesData = await UniversalSalesByCountryService.getSalesByCustomer(
            division, 
            salesRep, 
            period.year, 
            period.months, 
            period.dataType
          );
          
          // Sum up all customer values for this sales rep and period
          const totalSales = customerSalesData.reduce((sum, customer) => sum + (customer.value || 0), 0);
          return { columnKey: period.columnKey, totalSales };
        } catch (err) {
          console.warn(`Error fetching data for sales rep ${salesRep}, period ${period.year}-${period.months}-${period.dataType}:`, err);
          return { columnKey: period.columnKey, totalSales: 0 };
        }
      });
      
      const periodResults = await Promise.all(periodPromises);
      periodResults.forEach(({ columnKey, totalSales }) => {
        salesRepData[columnKey] = totalSales;
      });
      
      return { salesRep, data: salesRepData };
    });
    
    const results = await Promise.all(promises);
    
    // Organize results by sales rep
    results.forEach(({ salesRep, data }) => {
      batchData[salesRep] = data;
    });
    
    console.log(`✅ Batch retrieved sales rep divisional data for ${salesReps.length} sales reps across ${periods.length} periods`);
    
    res.json({
      success: true,
      data: batchData,
      message: `Retrieved batch sales rep divisional data for ${salesReps.length} sales reps across ${periods.length} periods`
    });
    
  } catch (error) {
    console.error('❌ Error in batch sales rep divisional data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve batch sales rep divisional data',
      message: error.message
    });
  }
});

// ULTRA-FAST endpoint for Sales Rep Divisional data - single SQL query for ALL data
app.post('/api/sales-rep-divisional-ultra-fast', async (req, res) => {
  try {
    const { division, salesReps, columns } = req.body;

    if (!division || !salesReps || !Array.isArray(salesReps) || !columns || !Array.isArray(columns)) {
      return res.status(400).json({
        success: false,
        message: 'division, salesReps (array), and columns (array) are required'
      });
    }
    
    console.log(`🚀 ULTRA-FAST getting sales rep divisional data for division: ${division}, ${salesReps.length} sales reps, ${columns.length} columns`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Get the ultra-fast data using a single optimized query
    const ultraFastData = await UniversalSalesByCountryService.getSalesRepDivisionalUltraFast(
      division, 
      salesReps, 
      columns
    );
    
    console.log(`⚡ ULTRA-FAST retrieved sales rep divisional data for ${salesReps.length} sales reps across ${columns.length} columns`);
    
    res.json({
      success: true,
      data: ultraFastData,
      message: `ULTRA-FAST retrieved sales rep divisional data for ${salesReps.length} sales reps across ${columns.length} columns`
    });
    
  } catch (error) {
    console.error('❌ Error in ULTRA-FAST sales rep divisional data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ULTRA-FAST sales rep divisional data',
      message: error.message
    });
  }
});

// ULTRA-FAST endpoint for Sales by Customer data - optimized for performance
app.post('/api/sales-by-customer-ultra-fast', async (req, res) => {
  try {
    const { division, columns } = req.body;

    if (!division || !columns || !Array.isArray(columns)) {
      return res.status(400).json({
        success: false,
        message: 'division and columns (array) are required'
      });
    }
    
    console.log(`🚀 ULTRA-FAST getting sales by customer data for division: ${division}, ${columns.length} columns`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Get the ultra-fast data using optimized queries
    const ultraFastData = await UniversalSalesByCountryService.getSalesByCustomerUltraFast(
      division, 
      columns
    );
    
    console.log(`⚡ ULTRA-FAST retrieved sales by customer data across ${columns.length} columns`);
    
    res.json({
      success: true,
      data: ultraFastData,
      message: `ULTRA-FAST retrieved sales by customer data across ${columns.length} columns`
    });
    
  } catch (error) {
    console.error('❌ Error in ULTRA-FAST sales by customer data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ULTRA-FAST sales by customer data',
      message: error.message
    });
  }
});

// ULTRA-FAST endpoint for ALL Sales Rep Reports - loads all data at once
app.post('/api/sales-rep-reports-ultra-fast', async (req, res) => {
  try {
    const { division, salesReps, columns } = req.body;

    if (!division || !salesReps || !Array.isArray(salesReps) || !columns || !Array.isArray(columns)) {
      return res.status(400).json({
        success: false,
        message: 'division, salesReps (array), and columns (array) are required'
      });
    }
    
    console.log(`🚀 ULTRA-FAST getting ALL sales rep reports for division: ${division}, ${salesReps.length} sales reps, ${columns.length} columns`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Get the ultra-fast data using optimized queries
    const ultraFastData = await UniversalSalesByCountryService.getSalesRepReportsUltraFast(
      division, 
      salesReps,
      columns
    );
    
    console.log(`⚡ ULTRA-FAST retrieved reports data for ${salesReps.length} sales reps across ${columns.length} columns`);
    
    res.json({
      success: true,
      data: ultraFastData,
      message: `ULTRA-FAST retrieved reports data for ${salesReps.length} sales reps across ${columns.length} columns`
    });
    
  } catch (error) {
    console.error('❌ Error in ULTRA-FAST sales rep reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ULTRA-FAST sales rep reports data',
      message: error.message
    });
  }
});

// Get sales by customer from database for any division
app.post('/api/sales-by-customer-db', async (req, res) => {
  try {
    const { division, salesRep, year, months, dataType = 'Actual', valueType = 'AMOUNT' } = req.body;

    if (!division || !year || !months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'division, year, and months (array) are required'
      });
    }
    
    console.log(`🔍 Getting sales by customer from database for division: ${division}, salesRep: ${salesRep}, year: ${year}, months: [${months.join(', ')}], dataType: ${dataType}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let customerSalesData;
    
    if (salesRep && fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get sales by customer for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching sales by customer for group '${salesRep}' with members:`, groupMembers);
      
      customerSalesData = await UniversalSalesByCountryService.getSalesByCustomer(division, salesRep, year, months, dataType, groupMembers, valueType);
    } else {
      // Individual or all sales reps (if salesRep missing or 'ALL')
      customerSalesData = await UniversalSalesByCountryService.getSalesByCustomer(division, salesRep || null, year, months, dataType, null, valueType);
    }
    
    const salesRepDisplay = salesRep || 'All Sales Reps';
    console.log(`✅ Retrieved sales by customer data: ${customerSalesData.length} customers for ${salesRepDisplay}`);
    
    res.json({
      success: true,
      data: customerSalesData,
      message: `Retrieved sales by customer for ${salesRepDisplay} - ${year}/[${months.join(', ')}] (${dataType}) from database`
    });
    
  } catch (error) {
    console.error('❌ Error getting sales by customer from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales by customer from database',
      message: error.message
    });
  }
});

// Get customers by sales rep from database for any division
app.get('/api/customers-by-salesrep-db', async (req, res) => {
  try {
    const { division, salesRep } = req.query;
    
    if (!division || !salesRep) {
      return res.status(400).json({
        success: false,
        message: 'division and salesRep parameters are required'
      });
    }
    
    console.log(`🔍 Getting customers by sales rep from database for division: ${division}, salesRep: ${salesRep}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Check if salesRep is actually a group name
    const config = loadSalesRepConfig();
    const fpConfig = config.FP || { groups: {} };
    
    let customers;
    
    if (fpConfig.groups && fpConfig.groups[salesRep]) {
      // It's a group - get customers for all members
      const groupMembers = fpConfig.groups[salesRep];
      console.log(`Fetching customers for group '${salesRep}' with members:`, groupMembers);
      
      customers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, salesRep, groupMembers);
    } else {
      // Individual sales rep
      customers = await UniversalSalesByCountryService.getCustomersBySalesRep(division, salesRep);
    }
    
    console.log(`✅ Retrieved ${customers.length} customers for sales rep: ${salesRep}`);
    
    res.json({
      success: true,
      data: customers,
      message: `Retrieved ${customers.length} customers for sales rep ${salesRep} in ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting customers by sales rep from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customers by sales rep from database',
      message: error.message
    });
  }
});

// Get customer-sales rep mapping with latest data
app.get('/api/customer-sales-rep-mapping', async (req, res) => {
  try {
    const { division, year } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    console.log(`🔍 Getting customer-sales rep mapping for division: ${division}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Get table name based on division
    const tableMap = {
      'FP': 'fp_data_excel',
      'SB': 'sb_data_excel',
      'TF': 'tf_data_excel',
      'HCM': 'hcm_data_excel'
    };
    const tableName = tableMap[division];
    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: `Table not found for division: ${division}`
      });
    }
    
    // Get sales rep mappings for ALL customers, prioritizing the most recent year with data
    const query = `
      WITH customer_sales_rep AS (
        SELECT 
          customername as customer,
          salesrepname as sales_rep,
          year,
          ROW_NUMBER() OVER (
            PARTITION BY customername 
            ORDER BY year DESC, SUM(values) DESC
          ) as rn
        FROM ${tableName}
        WHERE customername IS NOT NULL
          AND TRIM(customername) != ''
          AND salesrepname IS NOT NULL
          AND TRIM(salesrepname) != ''
          AND UPPER(values_type) = 'AMOUNT'
        GROUP BY customername, salesrepname, year
      )
      SELECT customer, sales_rep
      FROM customer_sales_rep 
      WHERE rn = 1
      ORDER BY customer
    `;
    
    console.log(`🔍 Executing query: ${query}`);
    
    const result = await pool.query(query);
    
    // Convert to map for easy lookup - for now, just take the first sales rep for each customer
    const customerSalesRepMap = {};
    result.rows.forEach(row => {
      if (!customerSalesRepMap[row.customer]) {
        customerSalesRepMap[row.customer] = {
          salesRep: row.sales_rep,
          year: parseInt(year),
          month: 1
        };
      }
    });
    
    console.log(`✅ Retrieved ${Object.keys(customerSalesRepMap).length} customer-sales rep mappings`);
    
    res.json({
      success: true,
      data: customerSalesRepMap,
      message: `Retrieved ${Object.keys(customerSalesRepMap).length} customer-sales rep mappings`
    });
    
  } catch (error) {
    console.error('❌ Error getting customer-sales rep mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer-sales rep mapping',
      message: error.message
    });
  }
});

// Get customer sales data for a specific period and value type
app.post('/api/customer-sales-data-db', async (req, res) => {
  try {
    const { division, customer, year, months, dataType = 'Actual', valueType = 'KGS' } = req.body;
    
    if (!division || !customer || !year || !months) {
      return res.status(400).json({
        success: false,
        message: 'division, customer, year, and months are required'
      });
    }
    
    console.log(`🔍 Getting customer sales data from database for division: ${division}, customer: ${customer}, year: ${year}, months: [${months.join(', ')}], dataType: ${dataType}, valueType: ${valueType}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const salesData = await UniversalSalesByCountryService.getCustomerSalesData(division, customer, year, months, dataType, valueType);
    
    console.log(`✅ Retrieved customer sales data: ${salesData.length} records for ${customer}`);
    
    res.json({
      success: true,
      data: salesData,
      message: `Retrieved sales data for ${customer} - ${year}/[${months.join(', ')}] (${dataType}, ${valueType}) from database`
    });
    
  } catch (error) {
    console.error('❌ Error getting customer sales data from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer sales data from database',
      message: error.message
    });
  }
});

// ========================================
// CUSTOMER MERGE RULES API ENDPOINTS
// ========================================

// Add a single customer merge rule (without deleting existing ones)
app.post('/api/customer-merge-rules/add', async (req, res) => {
  try {
    const { salesRep, division, mergeRule } = req.body;
    
    if (!salesRep || !division || !mergeRule) {
      return res.status(400).json({
        success: false,
        message: 'Sales rep, division, and merge rule are required'
      });
    }

    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    await CustomerMergeRulesService.addMergeRule(salesRep, division, mergeRule);
    
    res.json({
      success: true,
      message: 'Merge rule added successfully'
    });
    
  } catch (error) {
    console.error('❌ Error adding merge rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add merge rule',
      error: error.message
    });
  }
});

// Save customer merge rules for a sales rep (REPLACES ALL)
app.post('/api/customer-merge-rules/save', async (req, res) => {
  try {
    const { salesRep, division, mergeRules } = req.body;
    
    if (!salesRep || !division || !Array.isArray(mergeRules)) {
      return res.status(400).json({
        success: false,
        message: 'salesRep, division, and mergeRules array are required'
      });
    }
    
    console.log(`💾 Saving merge rules for sales rep: ${salesRep}, division: ${division}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const result = await CustomerMergeRulesService.saveMergeRules(salesRep, division, mergeRules);
    
    console.log(`✅ Merge rules saved successfully for ${salesRep}`);
    
    res.json({
      success: true,
      message: `Merge rules saved successfully for ${salesRep}`,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error saving merge rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save merge rules',
      error: error.message
    });
  }
});

// Get customer merge rules for a sales rep
app.get('/api/customer-merge-rules/get', async (req, res) => {
  try {
    const { salesRep, division } = req.query;
    
    if (!salesRep || !division) {
      return res.status(400).json({
        success: false,
        message: 'salesRep and division parameters are required'
      });
    }
    
    console.log(`🔍 Getting merge rules for sales rep: ${salesRep}, division: ${division}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const mergeRules = await CustomerMergeRulesService.getMergeRules(salesRep, division);
    
    console.log(`✅ Retrieved ${mergeRules.length} merge rules for ${salesRep}`);
    
    res.json({
      success: true,
      data: mergeRules,
      message: `Retrieved ${mergeRules.length} merge rules for ${salesRep}`
    });
    
  } catch (error) {
    console.error('❌ Error getting merge rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get merge rules',
      error: error.message
    });
  }
});

// Get all merge rules for a division (for division-wide customer views)
app.get('/api/customer-merge-rules/division', async (req, res) => {
  try {
    const { division } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'division parameter is required'
      });
    }
    
    console.log(`🔍 Getting all merge rules for division: ${division}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const mergeRules = await CustomerMergeRulesService.getAllMergeRulesForDivision(division);
    
    console.log(`✅ Retrieved ${mergeRules.length} merge rules for ${division} division`);
    
    res.json({
      success: true,
      data: mergeRules,
      message: `Retrieved ${mergeRules.length} merge rules for ${division} division`
    });
    
  } catch (error) {
    console.error('❌ Error getting division merge rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get division merge rules',
      error: error.message
    });
  }
});

// Delete a specific merge rule
app.delete('/api/customer-merge-rules/delete', async (req, res) => {
  try {
    const { salesRep, division, mergedCustomerName } = req.body;
    
    if (!salesRep || !division || !mergedCustomerName) {
      return res.status(400).json({
        success: false,
        message: 'salesRep, division, and mergedCustomerName are required'
      });
    }
    
    console.log(`🗑️ Deleting merge rule for sales rep: ${salesRep}, merged customer: ${mergedCustomerName}`);
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const result = await CustomerMergeRulesService.deleteMergeRule(salesRep, division, mergedCustomerName);
    
    console.log(`✅ Merge rule deleted successfully`);
    
    res.json({
      success: true,
      message: 'Merge rule deleted successfully',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error deleting merge rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete merge rule',
      error: error.message
    });
  }
});

// Check if merge rules exist for a sales rep
app.get('/api/customer-merge-rules/exists', async (req, res) => {
  try {
    const { salesRep, division } = req.query;
    
    if (!salesRep || !division) {
      return res.status(400).json({
        success: false,
        message: 'salesRep and division parameters are required'
      });
    }
    
    // Validate division
    try {
      validateDivision(division);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    const hasRules = await CustomerMergeRulesService.hasMergeRules(salesRep, division);
    
    res.json({
      success: true,
      data: { hasRules },
      message: hasRules ? 'Merge rules exist' : 'No merge rules found'
    });
    
  } catch (error) {
    console.error('❌ Error checking merge rules existence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check merge rules existence',
      error: error.message
    });
  }
});

// Reset all merge rules (for testing/development)
app.delete('/api/customer-merge-rules/reset-all', async (req, res) => {
  try {
    await CustomerMergeRulesService.resetAllMergeRules();
    
    res.json({
      success: true,
      message: 'All merge rules have been reset'
    });
  } catch (error) {
    console.error('❌ Error resetting merge rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset merge rules',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Something broke!');
});

// Test database connection and start the server
const startServer = async () => {
  console.log('🚀 Starting IPDashboard Backend Server...');
  
  // Test database connection
  console.log('🔍 Testing database connection...');
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    console.log('✅ Database connection successful');
  } else {
    console.log('⚠️  Database connection failed - server will start but database features may not work');
    console.log('💡 Please check your .env file and ensure PostgreSQL is running');
  }
  
  app.listen(PORT, () => {
    console.log(`🌟 Backend server running on http://localhost:${PORT}`);
    console.log('📊 Available endpoints:');
    console.log('   - Excel data: /api/financials.xlsx, /api/sales.xlsx');
    console.log('   - Database test: /api/db/test');
    console.log('   - FP data: /api/fp/* (sales-reps, customers, countries, etc.)');
  });
};

startServer();

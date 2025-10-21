// Database configuration for each division
const divisionDatabaseConfig = {
  FP: {
    database: 'fp_database',
    table: 'fp_data_excel',
    connection: 'fp_pool', // Reference to existing FP database connection
    status: 'active' // Currently implemented
  },
  SB: {
    database: 'sb_database', // Future database
    table: 'sb_data_excel',  // Future table
    connection: 'sb_pool',    // Future connection
    status: 'planned' // To be implemented
  },
  TF: {
    database: 'tf_database', // Future database
    table: 'tf_data_excel',  // Future table
    connection: 'tf_pool',    // Future connection
    status: 'planned' // To be implemented
  },
  HCM: {
    database: 'hcm_database', // Future database
    table: 'hcm_data_excel',  // Future table
    connection: 'hcm_pool',    // Future connection
    status: 'planned' // To be implemented
  }
};

// Helper function to get database configuration for a division
const getDivisionConfig = (division) => {
  const config = divisionDatabaseConfig[division];
  if (!config) {
    throw new Error(`No database configuration found for division: ${division}`);
  }
  return config;
};

// Helper function to get table name for a division
const getTableName = (division) => {
  const config = getDivisionConfig(division);
  return config.table;
};

// Helper function to get database name for a division
const getDatabaseName = (division) => {
  const config = getDivisionConfig(division);
  return config.database;
};

// Helper function to check if division is active
const isDivisionActive = (division) => {
  const config = getDivisionConfig(division);
  return config.status === 'active';
};

// Helper function to get all active divisions
const getActiveDivisions = () => {
  return Object.keys(divisionDatabaseConfig).filter(division => 
    divisionDatabaseConfig[division].status === 'active'
  );
};

// Helper function to get all planned divisions
const getPlannedDivisions = () => {
  return Object.keys(divisionDatabaseConfig).filter(division => 
    divisionDatabaseConfig[division].status === 'planned'
  );
};

// Helper function to get division status
const getDivisionStatus = (division) => {
  const config = getDivisionConfig(division);
  return {
    division,
    status: config.status,
    database: config.database,
    table: config.table,
    message: config.status === 'active' 
      ? `Live data from ${config.database} PostgreSQL database`
      : `Will connect to ${config.database} PostgreSQL table when implemented`
  };
};

// Helper function to validate division
const validateDivision = (division) => {
  if (!division) {
    throw new Error('Division parameter is required');
  }
  
  if (!divisionDatabaseConfig[division]) {
    throw new Error(`Unsupported division: ${division}. Supported divisions: ${Object.keys(divisionDatabaseConfig).join(', ')}`);
  }
  
  return true;
};

// Helper function to get all divisions
const getAllDivisions = () => {
  return Object.keys(divisionDatabaseConfig);
};

// Helper function to get division info for frontend
const getDivisionInfo = (division) => {
  const config = getDivisionConfig(division);
  return {
    division,
    database: config.database,
    table: config.table,
    status: config.status,
    isActive: config.status === 'active',
    message: config.status === 'active' 
      ? `Live data from ${config.database} PostgreSQL database`
      : `Will connect to ${config.database} PostgreSQL table when implemented`
  };
};

module.exports = {
  divisionDatabaseConfig,
  getDivisionConfig,
  getTableName,
  getDatabaseName,
  isDivisionActive,
  getActiveDivisions,
  getPlannedDivisions,
  getDivisionStatus,
  validateDivision,
  getAllDivisions,
  getDivisionInfo
};
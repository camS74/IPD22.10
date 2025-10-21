// Test 2025 country mapping for RealWorld2DMap
const countryCoordinates = require('./countryCoordinates.js');

const COUNTRY_NAME_ALIASES = {
  'KSA': 'Saudi Arabia',
  'Kingdom of Saudi Arabia': 'Saudi Arabia',
  'Kingdom Of Saudi Arabia': 'Saudi Arabia',
  'KINGDOM OF SAUDI ARABIA': 'Saudi Arabia',
  'UNITED ARAB EMIRATES': 'United Arab Emirates',
  'UAE': 'United Arab Emirates',
  'Emirates': 'United Arab Emirates',
  'ALGERIA': 'Algeria',
  'IRAQ': 'Iraq',
  'KUWAIT': 'Kuwait',
  'UNITED STATES': 'United States of America',
  'UNITED STATES OF AMERICA': 'United States of America',
  'USA': 'United States of America',
  'US': 'United States of America',
  'BAHRAIN': 'Bahrain',
  'DJIBOUTI': 'Djibouti',
  'YEMEN': 'Yemen',
  'CONGO': 'Congo',
  'OMAN': 'Oman',
  'JORDAN': 'Jordan',
  'LEBANON': 'Lebanon',
  'MOROCCO': 'Morocco',
  'NIGER': 'Niger',
  'QATAR': 'Qatar',
  'SOMALIA': 'Somalia',
  'SUDAN': 'Sudan',
  'TUNISIA': 'Tunisia',
  'UGANDA': 'Uganda',
  'UNITED KINGDOM': 'United Kingdom'
};

function normalizeCountryName(name) {
  if (!name) return '';
  
  // First try exact match in aliases
  if (COUNTRY_NAME_ALIASES[name]) return COUNTRY_NAME_ALIASES[name];
  
  // Try case-insensitive match in aliases
  const lower = name.toLowerCase();
  for (const key in COUNTRY_NAME_ALIASES) {
    if (key.toLowerCase() === lower) return COUNTRY_NAME_ALIASES[key];
  }
  
  // Try partial match in aliases
  for (const key in COUNTRY_NAME_ALIASES) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return COUNTRY_NAME_ALIASES[key];
    }
  }
  
  // Try case-insensitive search in coordinates directly
  const found = Object.keys(countryCoordinates).find(key => 
    key.toLowerCase() === lower
  );
  if (found) return found;
  
  // Try partial match in coordinates
  const partialMatch = Object.keys(countryCoordinates).find(key => 
    key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  return name;
}

// Test with 2025 countries from database
const countries2025 = [
  'ALGERIA',
  'BAHRAIN', 
  'CONGO',
  'IRAQ',
  'JORDAN',
  'KINGDOM OF SAUDI ARABIA',
  'KUWAIT',
  'LEBANON',
  'MOROCCO',
  'NIGER',
  'OMAN',
  'QATAR',
  'SOMALIA',
  'SUDAN',
  'TUNISIA',
  'UGANDA',
  'UNITED ARAB EMIRATES',
  'UNITED KINGDOM',
  'UNITED STATES',
  'YEMEN'
];

console.log('Testing 2025 country mapping:');
let allMapped = true;
countries2025.forEach(country => {
  const normalized = normalizeCountryName(country);
  const hasCoords = countryCoordinates[normalized] ? '✅' : '❌';
  if (!countryCoordinates[normalized]) allMapped = false;
  console.log(`${country} -> ${normalized} ${hasCoords}`);
});

console.log(`\n${allMapped ? '✅' : '❌'} All countries mapped: ${allMapped ? 'YES' : 'NO'}`);

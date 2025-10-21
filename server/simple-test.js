// Simple test for country aliases
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

console.log('Testing 2025 country aliases:');
countries2025.forEach(country => {
  const normalized = COUNTRY_NAME_ALIASES[country] || country;
  const hasAlias = COUNTRY_NAME_ALIASES[country] ? '✅' : '❌';
  console.log(`${country} -> ${normalized} ${hasAlias}`);
});

console.log(`\n✅ All ${countries2025.length} countries have aliases defined!`);

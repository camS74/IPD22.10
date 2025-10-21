import React, { useState, useEffect, useCallback } from 'react';
import countryCoordinates from './countryCoordinates';
import { useExcelData } from '../../contexts/ExcelDataContext';
import './CountryReference.css';

// Import the regional mapping from KPIExecutiveSummary.js
const regionalMapping = {
  // UAE - Local
  'United Arab Emirates': 'UAE',
  'UAE': 'UAE',
  'UNITED ARAB EMIRATES': 'UAE',
  
  // Arabian Peninsula
  'Saudi Arabia': 'Arabian Peninsula',
  'Kingdom Of Saudi Arabia': 'Arabian Peninsula',
  'KINGDOM OF SAUDI ARABIA': 'Arabian Peninsula',
  'Kuwait': 'Arabian Peninsula',
  'KUWAIT': 'Arabian Peninsula',
  'Qatar': 'Arabian Peninsula',
  'QATAR': 'Arabian Peninsula',
  'Bahrain': 'Arabian Peninsula',
  'BAHRAIN': 'Arabian Peninsula',
  'Oman': 'Arabian Peninsula',
  'OMAN': 'Arabian Peninsula',
  'Yemen': 'Arabian Peninsula',
  'YEMEN': 'Arabian Peninsula',
  'KSA': 'Arabian Peninsula',
  
  // West Asia
  'Iraq': 'West Asia',
  'IRAQ': 'West Asia',
  
  // Levant
  'Lebanon': 'Levant',
  'LEBANON': 'Levant',
  'Jordan': 'Levant',
  'JORDAN': 'Levant',
  'Syria': 'Levant',
  'SYRIA': 'Levant',
  'Syrian Arab Republic': 'Levant',
  'Palestine': 'Levant',
  'PALESTINE': 'Levant',
  'Israel': 'Levant',
  'ISRAEL': 'Levant',
  
  // North Africa (MENA)
  'Egypt': 'North Africa',
  'EGYPT': 'North Africa',
  'Libya': 'North Africa',
  'LIBYA': 'North Africa',
  'Tunisia': 'North Africa',
  'TUNISIA': 'North Africa',
  'Algeria': 'North Africa',
  'ALGERIA': 'North Africa',
  'Morocco': 'North Africa',
  'MOROCCO': 'North Africa',
  'Sudan': 'North Africa',
  'SUDAN': 'North Africa',
  'South Sudan': 'North Africa',
  'SOUTH SUDAN': 'North Africa',
  'Djibouti': 'North Africa',
  'DJIBOUTI': 'North Africa',
  'Mauritania': 'North Africa',
  'MAURITANIA': 'North Africa',
  
  // Southern Africa
  'South Africa': 'Southern Africa',
  'SOUTH AFRICA': 'Southern Africa',
  'Botswana': 'Southern Africa',
  'BOTSWANA': 'Southern Africa',
  'Namibia': 'Southern Africa',
  'NAMIBIA': 'Southern Africa',
  'Zimbabwe': 'Southern Africa',
  'ZIMBABWE': 'Southern Africa',
  'Kenya': 'Southern Africa',
  'KENYA': 'Southern Africa',
  'Nigeria': 'Southern Africa',
  'NIGERIA': 'Southern Africa',
  'Ghana': 'Southern Africa',
  'GHANA': 'Southern Africa',
  'Senegal': 'Southern Africa',
  'SENEGAL': 'Southern Africa',
  'Sierra Leone': 'Southern Africa',
  'SIERRA LEONE': 'Southern Africa',
  'Cameroon': 'Southern Africa',
  'CAMEROON': 'Southern Africa',
  'Congo': 'Southern Africa',
  'CONGO': 'Southern Africa',
  'Republic of Congo': 'Southern Africa',
  'REPUBLIC OF CONGO': 'Southern Africa',
  'Republic of the Congo': 'Southern Africa',
  'REPUBLIC OF THE CONGO': 'Southern Africa',
  'Congo-Brazzaville': 'Southern Africa',
  'CONGO-BRAZZAVILLE': 'Southern Africa',
  'Democratic Republic of Congo': 'Southern Africa',
  'DEMOCRATIC REPUBLIC OF CONGO': 'Southern Africa',
  'Democratic Republic of the Congo': 'Southern Africa',
  'DEMOCRATIC REPUBLIC OF THE CONGO': 'Southern Africa',
  'DEMOCRATIC REPUBLIC OF THE CON': 'Southern Africa',
  'DR Congo': 'Southern Africa',
  'DR CONGO': 'Southern Africa',
  'D.R. Congo': 'Southern Africa',
  'D.R. CONGO': 'Southern Africa',
  'Congo-Kinshasa': 'Southern Africa',
  'CONGO-KINSHASA': 'Southern Africa',
  'Republic of Cong': 'Southern Africa',
  'REPUBLIC OF CONG': 'Southern Africa',
  'Uganda': 'Southern Africa',
  'UGANDA': 'Southern Africa',
  'Rwanda': 'Southern Africa',
  'RWANDA': 'Southern Africa',
  'Tanzania': 'Southern Africa',
  'UNITED REPUBLIC OF TANZANIA': 'Southern Africa',
  'Somalia': 'Southern Africa',
  'SOMALIA': 'Southern Africa',
  'SOMALILAND': 'Southern Africa',
  'Ethiopia': 'Southern Africa',
  'ETHIOPIA': 'Southern Africa',
  'Eritrea': 'Southern Africa',
  'ERITREA': 'Southern Africa',
  'Angola': 'Southern Africa',
  'ANGOLA': 'Southern Africa',
  'Togo': 'Southern Africa',
  'TOGO': 'Southern Africa',
  'Niger': 'Southern Africa',
  'NIGER': 'Southern Africa',
  'Burundi': 'Southern Africa',
  'BURUNDI': 'Southern Africa',
  'Ivory Coast': 'Southern Africa',
  'Cote D\'Ivoire': 'Southern Africa',
  'COTE D\'IVOIRE': 'Southern Africa',
  'Zambia': 'Southern Africa',
  'ZAMBIA': 'Southern Africa',
  'Madagascar': 'Southern Africa',
  'MADAGASCAR': 'Southern Africa',
  'Mali': 'Southern Africa',
  'MALI': 'Southern Africa',
  'Mozambique': 'Southern Africa',
  'MOZAMBIQUE': 'Southern Africa',
  'Gambia': 'Southern Africa',
  'GAMBIA': 'Southern Africa',
  'Guinea': 'Southern Africa',
  'GUINEA': 'Southern Africa',
  'Guinea-Bissau': 'Southern Africa',
  'GUINEA-BISSAU': 'Southern Africa',
  'Liberia': 'Southern Africa',
  'LIBERIA': 'Southern Africa',
  'Central African Republic': 'Southern Africa',
  'CENTRAL AFRICAN REPUBLIC': 'Southern Africa',
  'MAYOTTE': 'Southern Africa',
  'Benin': 'Southern Africa',
  'BENIN': 'Southern Africa',
  'Burkina Faso': 'Southern Africa',
  'BURKINA FASO': 'Southern Africa',
  'Cabo Verde': 'Southern Africa',
  'CABO VERDE': 'Southern Africa',
  'Chad': 'Southern Africa',
  'CHAD': 'Southern Africa',
  'Comoros': 'Southern Africa',
  'COMOROS': 'Southern Africa',
  'Equatorial Guinea': 'Southern Africa',
  'EQUATORIAL GUINEA': 'Southern Africa',
  'Eswatini': 'Southern Africa',
  'ESWATINI': 'Southern Africa',
  'Gabon': 'Southern Africa',
  'GABON': 'Southern Africa',
  'Lesotho': 'Southern Africa',
  'LESOTHO': 'Southern Africa',
  'Malawi': 'Southern Africa',
  'MALAWI': 'Southern Africa',
  'Mauritius': 'Southern Africa',
  'MAURITIUS': 'Southern Africa',
  'Sao Tome and Principe': 'Southern Africa',
  'SAO TOME AND PRINCIPE': 'Southern Africa',
  'Seychelles': 'Southern Africa',
  'SEYCHELLES': 'Southern Africa',
  
  // Europe
  'Germany': 'Europe',
  'GERMANY': 'Europe',
  'France': 'Europe',
  'FRANCE': 'Europe',
  'Italy': 'Europe',
  'ITALY': 'Europe',
  'Spain': 'Europe',
  'SPAIN': 'Europe',
  'United Kingdom': 'Europe',
  'UNITED KINGDOM': 'Europe',
  'Netherlands': 'Europe',
  'NETHERLANDS': 'Europe',
  'Belgium': 'Europe',
  'BELGIUM': 'Europe',
  'Poland': 'Europe',
  'POLAND': 'Europe',
  'Russia': 'Europe',
  'RUSSIA': 'Europe',
  'Turkey': 'Europe',
  'TURKEY': 'Europe',
  'Georgia': 'Europe',
  'GEORGIA': 'Europe',
  'Turkmenistan': 'Europe',
  'TURKMENISTAN': 'Europe',
  'Armenia': 'Europe',
  'ARMENIA': 'Europe',
  'Albania': 'Europe',
  'ALBANIA': 'Europe',
  'Andorra': 'Europe',
  'ANDORRA': 'Europe',
  'Austria': 'Europe',
  'AUSTRIA': 'Europe',
  'Azerbaijan': 'Europe',
  'AZERBAIJAN': 'Europe',
  'Belarus': 'Europe',
  'BELARUS': 'Europe',
  'Bosnia and Herzegovina': 'Europe',
  'BOSNIA AND HERZEGOVINA': 'Europe',
  'Bulgaria': 'Europe',
  'BULGARIA': 'Europe',
  'Croatia': 'Europe',
  'CROATIA': 'Europe',
  'Cyprus': 'Europe',
  'CYPRUS': 'Europe',
  'Czech Republic': 'Europe',
  'CZECH REPUBLIC': 'Europe',
  'Denmark': 'Europe',
  'DENMARK': 'Europe',
  'Estonia': 'Europe',
  'ESTONIA': 'Europe',
  'Finland': 'Europe',
  'FINLAND': 'Europe',
  'Greece': 'Europe',
  'GREECE': 'Europe',
  'Hungary': 'Europe',
  'HUNGARY': 'Europe',
  'Iceland': 'Europe',
  'ICELAND': 'Europe',
  'Ireland': 'Europe',
  'IRELAND': 'Europe',
  'Kazakhstan': 'Europe',
  'KAZAKHSTAN': 'Europe',
  'Latvia': 'Europe',
  'LATVIA': 'Europe',
  'Liechtenstein': 'Europe',
  'LIECHTENSTEIN': 'Europe',
  'Lithuania': 'Europe',
  'LITHUANIA': 'Europe',
  'Luxembourg': 'Europe',
  'LUXEMBOURG': 'Europe',
  'Malta': 'Europe',
  'MALTA': 'Europe',
  'Moldova': 'Europe',
  'MOLDOVA': 'Europe',
  'Monaco': 'Europe',
  'MONACO': 'Europe',
  'Montenegro': 'Europe',
  'MONTENEGRO': 'Europe',
  'North Macedonia': 'Europe',
  'NORTH MACEDONIA': 'Europe',
  'Norway': 'Europe',
  'NORWAY': 'Europe',
  'Portugal': 'Europe',
  'PORTUGAL': 'Europe',
  'Romania': 'Europe',
  'ROMANIA': 'Europe',
  'Serbia': 'Europe',
  'SERBIA': 'Europe',
  'Slovakia': 'Europe',
  'SLOVAKIA': 'Europe',
  'Slovenia': 'Europe',
  'SLOVENIA': 'Europe',
  'Sweden': 'Europe',
  'SWEDEN': 'Europe',
  'Switzerland': 'Europe',
  'SWITZERLAND': 'Europe',
  'Ukraine': 'Europe',
  'UKRAINE': 'Europe',
  
  // Americas
  'United States': 'Americas',
  'UNITED STATES': 'Americas',
  'United States of America': 'Americas',
  'Canada': 'Americas',
  'CANADA': 'Americas',
  'Mexico': 'Americas',
  'MEXICO': 'Americas',
  'Brazil': 'Americas',
  'BRAZIL': 'Americas',
  'Argentina': 'Americas',
  'ARGENTINA': 'Americas',
  'Chile': 'Americas',
  'CHILE': 'Americas',
  'Colombia': 'Americas',
  'COLOMBIA': 'Americas',
  'USA': 'Americas',
  'Antigua and Barbuda': 'Americas',
  'ANTIGUA AND BARBUDA': 'Americas',
  'Bahamas': 'Americas',
  'BAHAMAS': 'Americas',
  'Barbados': 'Americas',
  'BARBADOS': 'Americas',
  'Belize': 'Americas',
  'BELIZE': 'Americas',
  'Bolivia': 'Americas',
  'BOLIVIA': 'Americas',
  'Costa Rica': 'Americas',
  'COSTA RICA': 'Americas',
  'Cuba': 'Americas',
  'CUBA': 'Americas',
  'Dominica': 'Americas',
  'DOMINICA': 'Americas',
  'Dominican Republic': 'Americas',
  'DOMINICAN REPUBLIC': 'Americas',
  'Ecuador': 'Americas',
  'ECUADOR': 'Americas',
  'El Salvador': 'Americas',
  'EL SALVADOR': 'Americas',
  'Grenada': 'Americas',
  'GRENADA': 'Americas',
  'Guatemala': 'Americas',
  'GUATEMALA': 'Americas',
  'Guyana': 'Americas',
  'GUYANA': 'Americas',
  'Haiti': 'Americas',
  'HAITI': 'Americas',
  'Honduras': 'Americas',
  'HONDURAS': 'Americas',
  'Jamaica': 'Americas',
  'JAMAICA': 'Americas',
  'Nicaragua': 'Americas',
  'NICARAGUA': 'Americas',
  'Panama': 'Americas',
  'PANAMA': 'Americas',
  'Paraguay': 'Americas',
  'PARAGUAY': 'Americas',
  'Peru': 'Americas',
  'PERU': 'Americas',
  'Saint Kitts and Nevis': 'Americas',
  'SAINT KITTS AND NEVIS': 'Americas',
  'Saint Lucia': 'Americas',
  'SAINT LUCIA': 'Americas',
  'Saint Vincent and the Grenadines': 'Americas',
  'SAINT VINCENT AND THE GRENADINES': 'Americas',
  'Suriname': 'Americas',
  'SURINAME': 'Americas',
  'Trinidad and Tobago': 'Americas',
  'TRINIDAD AND TOBAGO': 'Americas',
  'Uruguay': 'Americas',
  'URUGUAY': 'Americas',
  'Venezuela': 'Americas',
  'VENEZUELA': 'Americas',
  
  // Asia-Pacific
  'China': 'Asia-Pacific',
  'CHINA': 'Asia-Pacific',
  'Japan': 'Asia-Pacific',
  'JAPAN': 'Asia-Pacific',
  'South Korea': 'Asia-Pacific',
  'SOUTH KOREA': 'Asia-Pacific',
  'Taiwan': 'Asia-Pacific',
  'TAIWAN': 'Asia-Pacific',
  'India': 'Asia-Pacific',
  'INDIA': 'Asia-Pacific',
  'Pakistan': 'Asia-Pacific',
  'PAKISTAN': 'Asia-Pacific',
  'Sri Lanka': 'Asia-Pacific',
  'SRI LANKA': 'Asia-Pacific',
  'Bangladesh': 'Asia-Pacific',
  'BANGLADESH': 'Asia-Pacific',
  'Indonesia': 'Asia-Pacific',
  'INDONESIA': 'Asia-Pacific',
  'Malaysia': 'Asia-Pacific',
  'MALAYSIA': 'Asia-Pacific',
  'Thailand': 'Asia-Pacific',
  'THAILAND': 'Asia-Pacific',
  'Philippines': 'Asia-Pacific',
  'PHILIPPINES': 'Asia-Pacific',
  'Vietnam': 'Asia-Pacific',
  'VIETNAM': 'Asia-Pacific',
  'Australia': 'Asia-Pacific',
  'AUSTRALIA': 'Asia-Pacific',
  'New Zealand': 'Asia-Pacific',
  'NEW ZEALAND': 'Asia-Pacific',
  'Singapore': 'Asia-Pacific',
  'SINGAPORE': 'Asia-Pacific',
  'Afghanistan': 'Asia-Pacific',
  'AFGHANISTAN': 'Asia-Pacific',
  'Tajikistan': 'Asia-Pacific',
  'TAJIKISTAN': 'Asia-Pacific',
  'Bhutan': 'Asia-Pacific',
  'BHUTAN': 'Asia-Pacific',
  'Brunei': 'Asia-Pacific',
  'BRUNEI': 'Asia-Pacific',
  'Cambodia': 'Asia-Pacific',
  'CAMBODIA': 'Asia-Pacific',
  'Fiji': 'Asia-Pacific',
  'FIJI': 'Asia-Pacific',
  'Hong Kong': 'Asia-Pacific',
  'HONG KONG': 'Asia-Pacific',
  'Iran': 'Asia-Pacific',
  'IRAN': 'Asia-Pacific',
  'Kiribati': 'Asia-Pacific',
  'KIRIBATI': 'Asia-Pacific',
  'Kyrgyzstan': 'Asia-Pacific',
  'KYRGYZSTAN': 'Asia-Pacific',
  'Laos': 'Asia-Pacific',
  'LAOS': 'Asia-Pacific',
  'Macau': 'Asia-Pacific',
  'MACAU': 'Asia-Pacific',
  'Maldives': 'Asia-Pacific',
  'MALDIVES': 'Asia-Pacific',
  'Marshall Islands': 'Asia-Pacific',
  'MARSHALL ISLANDS': 'Asia-Pacific',
  'Micronesia': 'Asia-Pacific',
  'MICRONESIA': 'Asia-Pacific',
  'Mongolia': 'Asia-Pacific',
  'MONGOLIA': 'Asia-Pacific',
  'Myanmar': 'Asia-Pacific',
  'MYANMAR': 'Asia-Pacific',
  'Nauru': 'Asia-Pacific',
  'NAURU': 'Asia-Pacific',
  'Nepal': 'Asia-Pacific',
  'NEPAL': 'Asia-Pacific',
  'North Korea': 'Asia-Pacific',
  'NORTH KOREA': 'Asia-Pacific',
  'Palau': 'Asia-Pacific',
  'PALAU': 'Asia-Pacific',
  'Papua New Guinea': 'Asia-Pacific',
  'PAPUA NEW GUINEA': 'Asia-Pacific',
  'Samoa': 'Asia-Pacific',
  'SAMOA': 'Asia-Pacific',
  'Solomon Islands': 'Asia-Pacific',
  'SOLOMON ISLANDS': 'Asia-Pacific',
  'Timor-Leste': 'Asia-Pacific',
  'TIMOR-LESTE': 'Asia-Pacific',
  'Tonga': 'Asia-Pacific',
  'TONGA': 'Asia-Pacific',
  'Tuvalu': 'Asia-Pacific',
  'TUVALU': 'Asia-Pacific',
  'Uzbekistan': 'Asia-Pacific',
  'UZBEKISTAN': 'Asia-Pacific',
  'Vanuatu': 'Asia-Pacific',
  'VANUATU': 'Asia-Pacific',
  'San Marino': 'Europe',
  'SAN MARINO': 'Europe',
  
  // Americas
  'United States': 'Americas',
  'United States of America': 'Americas',
  'USA': 'Americas',
  
  // Europe  
  'United Kingdom': 'Europe',
  'UK': 'Europe',
  'Great Britain': 'Europe',
  'Britain': 'Europe',
  'England': 'Europe',
  'Czech Republic': 'Europe',
  'Czechia': 'Europe',
  'North Macedonia': 'Europe',
  'Macedonia': 'Europe',
  'FYROM': 'Europe',
  
  // Africa variations
  'Ivory Coast': 'Southern Africa',
  'Cote D\'Ivoire': 'Southern Africa',
  'Côte d\'Ivoire': 'Southern Africa',
  'Eswatini': 'Southern Africa',
  'Swaziland': 'Southern Africa',
  'Cabo Verde': 'Southern Africa',
  'Cape Verde': 'Southern Africa',
  
  // Asia-Pacific
  'Myanmar': 'Asia-Pacific',
  'Burma': 'Asia-Pacific',
  'Taiwan': 'Asia-Pacific',
  'Republic of China': 'Asia-Pacific',
  'Chinese Taipei': 'Asia-Pacific',
  
  // Levant
  'Palestine': 'Levant',
  'Palestinian Territory': 'Levant',
  'State of Palestine': 'Levant',
  'West Bank and Gaza': 'Levant',
  'WEST BANK AND GAZA': 'Levant'
};

// Country name patterns for fuzzy matching
const countryPatterns = {
  'uae': ['emirates', 'uae'],
  'saudi': ['saudi', 'ksa', 'kingdom of saudi'],
  'uk': ['united kingdom', 'uk', 'britain'],
  'usa': ['united states', 'usa', 'america'],
  'drc': ['democratic republic', 'congo'],
  'ivory': ['ivory', 'cote d\'ivoire'],
  'tanzania': ['tanzania'],
  'korea': ['korea'],
  'czech': ['czech', 'czechia'],
  'bosnia': ['bosnia', 'herzegovina'],
  'myanmar': ['myanmar', 'burma'],
  'eswatini': ['eswatini', 'swaziland'],
  'taiwan': ['taiwan', 'republic of china'],
  'palestine': ['palestine', 'palestinian']
};

// Function to get region for a country using the same logic as KPIExecutiveSummary.js
export const getRegionForCountry = (countryName) => {
  // Direct lookup
  let region = regionalMapping[countryName];
  
  // If no direct match, try case-insensitive matching
  if (!region) {
    const countryLower = countryName.toLowerCase();
    
    // Check for UAE variations first
    if (countryLower.includes('emirates') || countryLower === 'uae') {
      region = 'UAE';
    } 
    // Check for Saudi Arabia variations
    else if (countryLower.includes('saudi') || countryLower === 'ksa' || countryLower.includes('kingdom')) {
      region = 'GCC';
    }
    // Check for Congo variations
    else if (countryLower.includes('congo') || countryLower.includes('cong')) {
      // Democratic Republic of Congo vs Republic of Congo distinction
      if (countryLower.includes('democratic') || countryLower.includes('dr congo') || countryLower.includes('d.r.')) {
        region = 'Southern Africa'; // Democratic Republic of Congo
      } else {
        region = 'Southern Africa'; // Republic of Congo (Congo-Brazzaville)
      }
    }
    // Check for other fuzzy matches using patterns
    else {
      // Try pattern matching first
      let patternMatch = false;
      for (const [key, patterns] of Object.entries(countryPatterns)) {
        if (patterns.some(pattern => countryLower.includes(pattern))) {
          // Find a matching entry in regionalMapping that contains this pattern
          for (const [mapKey, mapValue] of Object.entries(regionalMapping)) {
            if (mapKey.toLowerCase().includes(key)) {
              region = mapValue;
              patternMatch = true;
              break;
            }
          }
          if (patternMatch) break;
        }
      }
      
      // If no pattern match, try exact case-insensitive match
      if (!patternMatch) {
        for (const [key, value] of Object.entries(regionalMapping)) {
          if (key.toLowerCase() === countryLower) {
            region = value;
            break;
          }
        }
      }
    }
  }
  
  return region || 'Unassigned';
};

const CountryReference = () => {
  const { selectedDivision } = useExcelData(); // Get selectedDivision from same context as Dashboard
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [excelCountries, setExcelCountries] = useState(new Map()); // Store both original and matched names
  const [unassignedCountries, setUnassignedCountries] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  // Enhanced country name matching using fuzzy logic
  const findBestCountryMatch = (excelCountryName) => {
    if (!excelCountryName) return null;

    const excelName = excelCountryName.toLowerCase().trim();
    
    // Direct exact match first
    const exactMatch = Object.keys(countryCoordinates).find(
      country => country.toLowerCase() === excelName
    );
    if (exactMatch) return exactMatch;

    // Common mappings and variations
    const commonMappings = {
      'uae': 'United Arab Emirates',
      'emirates': 'United Arab Emirates',
      'saudi arabia': 'Saudi Arabia',
      'kingdom of saudi arabia': 'Saudi Arabia',
      'ksa': 'Saudi Arabia',
      'usa': 'United States of America',
      'us': 'United States of America',
      'united states': 'United States of America',
      'america': 'United States of America',
      'uk': 'United Kingdom',
      'britain': 'United Kingdom',
      'great britain': 'United Kingdom',
      'england': 'United Kingdom',
      'russia': 'Russia',
      'russian federation': 'Russia',
      'south korea': 'South Korea',
      'korea': 'South Korea',
      'republic of korea': 'South Korea',
      'north korea': 'North Korea',
      'democratic people\'s republic of korea': 'North Korea',
      'dprk': 'North Korea',
      'iran': 'Iran',
      'islamic republic of iran': 'Iran',
      'syria': 'Syria',
      'syrian arab republic': 'Syria',
      'congo': 'Congo',
      'republic of congo': 'Congo',
      'democratic republic of congo': 'Democratic Republic of Congo',
      'dr congo': 'Democratic Republic of Congo',
      'drc': 'Democratic Republic of Congo',
      'ivory coast': 'Ivory Coast',
      'cote d\'ivoire': 'Ivory Coast',
      'czech republic': 'Czech Republic',
      'czechia': 'Czech Republic',
      'slovakia': 'Slovakia',
      'slovak republic': 'Slovakia',
      'bosnia': 'Bosnia and Herzegovina',
      'herzegovina': 'Bosnia and Herzegovina',
      'macedonia': 'North Macedonia',
      'north macedonia': 'North Macedonia',
      'fyrom': 'North Macedonia',
      'myanmar': 'Myanmar',
      'burma': 'Myanmar',
      'cape verde': 'Cabo Verde',
      'cabo verde': 'Cabo Verde',
      'swaziland': 'Eswatini',
      'eswatini': 'Eswatini',
      'hong kong': 'Hong Kong',
      'macau': 'Macau',
      'macao': 'Macau',
      'taiwan': 'Taiwan',
      'republic of china': 'Taiwan',
      'palestine': 'Palestine',
      'palestinian territory': 'Palestine',
      'west bank': 'Palestine',
      'gaza': 'Palestine'
    };

    // Check common mappings
    const mappedCountry = commonMappings[excelName];
    if (mappedCountry && countryCoordinates[mappedCountry]) {
      return mappedCountry;
    }

    // Partial matching - check if Excel name is contained in any country name
    const partialMatch = Object.keys(countryCoordinates).find(country => {
      const countryLower = country.toLowerCase();
      return countryLower.includes(excelName) || excelName.includes(countryLower.split(' ')[0]);
    });
    if (partialMatch) return partialMatch;

    // Word-based matching - check individual words
    const excelWords = excelName.split(/\s+/);
    const wordMatch = Object.keys(countryCoordinates).find(country => {
      const countryWords = country.toLowerCase().split(/\s+/);
      return excelWords.some(excelWord => 
        countryWords.some(countryWord => 
          countryWord.includes(excelWord) || excelWord.includes(countryWord)
        )
      );
    });
    if (wordMatch) return wordMatch;

    return null;
  };

  // Function to get region for a country
  const getRegionForCountry = (countryName) => {
    return regionalMapping[countryName] || regionalMapping[countryName.toUpperCase()] || 'Unassigned';
  };

  // Helper to classify market type
  const getMarketType = (countryName) => {
    if (!countryName) return 'Unknown';
    const normalized = countryName.trim().toUpperCase();
    return normalized === 'UNITED ARAB EMIRATES' || normalized === 'UAE' ? 'Local Market' : 'Export Market';
  };

  // Function to get countries from database for all divisions
  const getAllCountriesFromDataSource = useCallback(async () => {
    const countriesMap = new Map(); // originalName -> matchedName
    
    if (!selectedDivision) {
      return countriesMap;
    }

    // For all divisions (FP, SB, TF, HCM), use database data
    try {
      console.log(`🔍 Fetching countries from database for ${selectedDivision} division...`);
      const response = await fetch(`/api/countries-db?division=${selectedDivision}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Countries from database for ${selectedDivision}:`, result.data);
        
        if (result.success && result.data) {
          result.data.forEach(countryData => {
            const countryName = countryData.country;
            const matchedCountry = findBestCountryMatch(countryName);
            if (matchedCountry) {
              countriesMap.set(countryName, matchedCountry);
            }
          });
        }
      } else {
        console.error(`❌ Failed to fetch countries from database for ${selectedDivision}:`, response.statusText);
      }
    } catch (error) {
      console.error(`❌ Error fetching countries from database for ${selectedDivision}:`, error);
    }
    
    return countriesMap;
  }, [selectedDivision]);

  // Function to fetch unassigned countries and show notifications
  const fetchUnassignedCountries = useCallback(async () => {
    if (!selectedDivision) return;
    
    try {
      console.log(`🔍 Fetching unassigned countries for ${selectedDivision} division...`);
      const response = await fetch(`/api/unassigned-countries?division=${selectedDivision}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Unassigned countries data:`, result.data);
        
        if (result.success && result.data) {
          setUnassignedCountries(result.data.unassigned || []);
          setNotificationMessage(result.meta.notificationMessage);
          setShowNotification(result.meta.hasUnassignedCountries);
          
          // Show notification for 5 seconds if there are unassigned countries
          if (result.meta.hasUnassignedCountries) {
            setTimeout(() => setShowNotification(false), 5000);
          }
        }
      } else {
        console.error(`❌ Failed to fetch unassigned countries for ${selectedDivision}:`, response.statusText);
      }
    } catch (error) {
      console.error(`❌ Error fetching unassigned countries for ${selectedDivision}:`, error);
    }
  }, [selectedDivision]);

  useEffect(() => {
    const loadCountries = async () => {
      if (selectedDivision) {
        const countriesMap = await getAllCountriesFromDataSource();
        setExcelCountries(countriesMap);
        
        // Also fetch unassigned countries for notifications
        await fetchUnassignedCountries();
      }
    };
    
    loadCountries();
  }, [selectedDivision, getAllCountriesFromDataSource, fetchUnassignedCountries]);

  // Get unique matched countries from Excel
  const matchedCountriesSet = new Set(Array.from(excelCountries.values()));
  
  const filteredCountries = Object.entries(countryCoordinates).filter(([countryName, coords]) => {
    const matchesSearch = countryName.toLowerCase().includes(searchTerm.toLowerCase());
    const inExcel = matchedCountriesSet.has(countryName);
    
    if (filterType === 'inExcel') return matchesSearch && inExcel;
    if (filterType === 'notInExcel') return matchesSearch && !inExcel;
    return matchesSearch;
  });

  // Get actual Excel countries count (before coordinate matching)
  const actualExcelCountries = Array.from(excelCountries.keys()).length;
  
  // Update stats to include unassigned countries
  const stats = {
    total: Object.keys(countryCoordinates).length,
    inDatabase: actualExcelCountries, // Countries found in division data
    notInDatabase: Object.keys(countryCoordinates).length - actualExcelCountries,
    unassigned: unassignedCountries.length // Countries without regional assignment
  };

  return (
    <div className="country-reference">
      {/* Notification Banner */}
      {showNotification && (
        <div className="notification-banner" style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
            <span style={{ color: '#856404', fontWeight: '500' }}>{notificationMessage}</span>
          </div>
          <button 
            onClick={() => setShowNotification(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#856404'
            }}
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="country-reference-header">
        <h2>🌍 World Countries Reference</h2>
        <p>Countries from {selectedDivision || 'Selected'} division {selectedDivision === 'FP' ? '(Database)' : '(Excel)'} with geographical coordinates</p>
        <div className="stats-summary">
          <div className="stat-box total">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Countries</span>
          </div>
          <div className="stat-box in-excel">
            <span className="stat-number">{stats.inDatabase}</span>
            <span className="stat-label">In Database</span>
          </div>
          <div className="stat-box not-in-excel">
            <span className="stat-number">{stats.notInDatabase}</span>
            <span className="stat-label">Not in Database</span>
          </div>
          <div className="stat-box unassigned" style={{
            backgroundColor: stats.unassigned > 0 ? '#fff3cd' : '#d4edda',
            border: stats.unassigned > 0 ? '1px solid #ffeaa7' : '1px solid #c3e6cb'
          }}>
            <span className="stat-number" style={{ color: stats.unassigned > 0 ? '#856404' : '#155724' }}>
              {stats.unassigned}
            </span>
            <span className="stat-label" style={{ color: stats.unassigned > 0 ? '#856404' : '#155724' }}>
              Unassigned Regions
            </span>
          </div>
        </div>
      </div>
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Countries ({stats.total})
          </button>
          <button
            className={`filter-btn in-excel ${filterType === 'inExcel' ? 'active' : ''}`}
            onClick={() => setFilterType('inExcel')}
          >
            In Database ({stats.inDatabase})
          </button>
          <button
            className={`filter-btn not-in-excel ${filterType === 'notInExcel' ? 'active' : ''}`}
            onClick={() => setFilterType('notInExcel')}
          >
            Not in Database ({stats.notInDatabase})
          </button>
        </div>
      </div>

      <div className="countries-table-container">
        <table className="countries-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Country Name</th>
              <th>Region</th>
              <th>Market Type</th>
              <th>Longitude</th>
              <th>Latitude</th>
              <th>Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {filteredCountries.map(([countryName, coords]) => {
              const inExcel = matchedCountriesSet.has(countryName);
              // Find original Excel name if matched
              const originalName = Array.from(excelCountries.entries())
                .find(([orig, matched]) => matched === countryName)?.[0];
              // Get region for this country
              const region = getRegionForCountry(countryName);
              // Check if this country is unmatched (no coordinates)
              const isUnmatched = inExcel && (!coords || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1]));
              // Market type logic
              const marketType = getMarketType(countryName);
              return (
                <tr 
                  key={countryName} 
                  className={`country-row ${inExcel ? 'in-excel' : 'not-in-excel'}${isUnmatched ? ' unmatched-country' : ''}`}
                >
                  <td className="status-cell">
                    <span className={`status-indicator ${inExcel ? 'in-excel' : 'not-in-excel'}`}>{inExcel ? (isUnmatched ? '⚠️' : '✅') : '⚪'}</span>
                  </td>
                  <td className="country-name-cell">
                    <div className={`country-name${isUnmatched ? ' unmatched-country-text' : ''}`}>{countryName}</div>
                    {originalName && originalName !== countryName && (
                      <div className="excel-name">{selectedDivision === 'FP' ? 'Database' : 'Excel'}: "{originalName}"</div>
                    )}
                    {isUnmatched && <div className="unmatched-warning">No coordinates found</div>}
                  </td>
                  <td className={`region-cell ${region === 'Unassigned' ? 'unassigned' : region.toLowerCase().replace(/\s+/g, '-')}`}>{region}</td>
                  <td className="market-type-cell">{marketType}</td>
                  <td className="coord-cell">{coords && coords[0] ? coords[0].toFixed(4) + '°' : <span className="unmatched-country-text">N/A</span>}</td>
                  <td className="coord-cell">{coords && coords[1] ? coords[1].toFixed(4) + '°' : <span className="unmatched-country-text">N/A</span>}</td>
                  <td className="coords-array">{coords && coords[0] && coords[1] ? `[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]` : <span className="unmatched-country-text">N/A</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCountries.length === 0 && (
        <div className="no-results">
          <h3>No countries found</h3>
          <p>Try adjusting your search term or filter selection.</p>
        </div>
      )}
    </div>
  );
};

export default CountryReference;

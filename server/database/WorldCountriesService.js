const { Pool } = require('pg');
const { fpPool } = require('./fp_database_config');

class WorldCountriesService {
  constructor() {
    this.pool = fpPool;
  }

  /**
   * Comprehensive world countries database with regional assignments
   */
  getWorldCountriesDatabase() {
    return {
      // UAE - Local Market
      'United Arab Emirates': { region: 'UAE', marketType: 'Local', coordinates: [54.3773, 24.2992] },
      'UAE': { region: 'UAE', marketType: 'Local', coordinates: [54.3773, 24.2992] },
      'UNITED ARAB EMIRATES': { region: 'UAE', marketType: 'Local', coordinates: [54.3773, 24.2992] },
      
      // Arabian Peninsula (GCC)
      'Saudi Arabia': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [45.0792, 23.8859] },
      'Kingdom Of Saudi Arabia': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [45.0792, 23.8859] },
      'KINGDOM OF SAUDI ARABIA': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [45.0792, 23.8859] },
      'KSA': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [45.0792, 23.8859] },
      'Kuwait': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [47.4818, 29.3117] },
      'KUWAIT': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [47.4818, 29.3117] },
      'Qatar': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [51.1839, 25.3548] },
      'QATAR': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [51.1839, 25.3548] },
      'Bahrain': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [50.6378, 25.9304] },
      'BAHRAIN': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [50.6378, 25.9304] },
      'Oman': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [55.9233, 21.4735] },
      'OMAN': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [55.9233, 21.4735] },
      'Yemen': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [48.5164, 15.5527] },
      'YEMEN': { region: 'Arabian Peninsula', marketType: 'Export', coordinates: [48.5164, 15.5527] },
      
      // West Asia
      'Iraq': { region: 'West Asia', marketType: 'Export', coordinates: [43.6793, 33.2232] },
      'IRAQ': { region: 'West Asia', marketType: 'Export', coordinates: [43.6793, 33.2232] },
      'Iran': { region: 'West Asia', marketType: 'Export', coordinates: [53.6880, 32.4279] },
      'IRAN': { region: 'West Asia', marketType: 'Export', coordinates: [53.6880, 32.4279] },
      'Islamic Republic of Iran': { region: 'West Asia', marketType: 'Export', coordinates: [53.6880, 32.4279] },
      'Turkey': { region: 'West Asia', marketType: 'Export', coordinates: [35.2433, 38.9637] },
      'TURKEY': { region: 'West Asia', marketType: 'Export', coordinates: [35.2433, 38.9637] },
      'Afghanistan': { region: 'West Asia', marketType: 'Export', coordinates: [67.7100, 33.9391] },
      'AFGHANISTAN': { region: 'West Asia', marketType: 'Export', coordinates: [67.7100, 33.9391] },
      'Pakistan': { region: 'West Asia', marketType: 'Export', coordinates: [69.3451, 30.3753] },
      'PAKISTAN': { region: 'West Asia', marketType: 'Export', coordinates: [69.3451, 30.3753] },
      
      // Levant
      'Lebanon': { region: 'Levant', marketType: 'Export', coordinates: [35.8623, 33.8547] },
      'LEBANON': { region: 'Levant', marketType: 'Export', coordinates: [35.8623, 33.8547] },
      'Jordan': { region: 'Levant', marketType: 'Export', coordinates: [36.2384, 30.5852] },
      'JORDAN': { region: 'Levant', marketType: 'Export', coordinates: [36.2384, 30.5852] },
      'Syria': { region: 'Levant', marketType: 'Export', coordinates: [38.9968, 34.8021] },
      'SYRIA': { region: 'Levant', marketType: 'Export', coordinates: [38.9968, 34.8021] },
      'Syrian Arab Republic': { region: 'Levant', marketType: 'Export', coordinates: [38.9968, 34.8021] },
      'Palestine': { region: 'Levant', marketType: 'Export', coordinates: [35.2332, 31.9522] },
      'PALESTINE': { region: 'Levant', marketType: 'Export', coordinates: [35.2332, 31.9522] },
      'Palestinian Territory': { region: 'Levant', marketType: 'Export', coordinates: [35.2332, 31.9522] },
      'State of Palestine': { region: 'Levant', marketType: 'Export', coordinates: [35.2332, 31.9522] },
      'Israel': { region: 'Levant', marketType: 'Export', coordinates: [34.8516, 31.0461] },
      'ISRAEL': { region: 'Levant', marketType: 'Export', coordinates: [34.8516, 31.0461] },
      
      // North Africa
      'Egypt': { region: 'North Africa', marketType: 'Export', coordinates: [30.8025, 26.8206] },
      'EGYPT': { region: 'North Africa', marketType: 'Export', coordinates: [30.8025, 26.8206] },
      'Libya': { region: 'North Africa', marketType: 'Export', coordinates: [17.2283, 26.3351] },
      'LIBYA': { region: 'North Africa', marketType: 'Export', coordinates: [17.2283, 26.3351] },
      'Tunisia': { region: 'North Africa', marketType: 'Export', coordinates: [9.5375, 33.8869] },
      'TUNISIA': { region: 'North Africa', marketType: 'Export', coordinates: [9.5375, 33.8869] },
      'Algeria': { region: 'North Africa', marketType: 'Export', coordinates: [1.6596, 28.0339] },
      'ALGERIA': { region: 'North Africa', marketType: 'Export', coordinates: [1.6596, 28.0339] },
      'Morocco': { region: 'North Africa', marketType: 'Export', coordinates: [-7.0926, 31.6295] },
      'MOROCCO': { region: 'North Africa', marketType: 'Export', coordinates: [-7.0926, 31.6295] },
      'Sudan': { region: 'North Africa', marketType: 'Export', coordinates: [30.2176, 12.8628] },
      'SUDAN': { region: 'North Africa', marketType: 'Export', coordinates: [30.2176, 12.8628] },
      'South Sudan': { region: 'North Africa', marketType: 'Export', coordinates: [31.3069, 6.8770] },
      'SOUTH SUDAN': { region: 'North Africa', marketType: 'Export', coordinates: [31.3069, 6.8770] },
      'Djibouti': { region: 'North Africa', marketType: 'Export', coordinates: [42.5903, 11.8251] },
      'DJIBOUTI': { region: 'North Africa', marketType: 'Export', coordinates: [42.5903, 11.8251] },
      'Mauritania': { region: 'North Africa', marketType: 'Export', coordinates: [-10.9408, 21.0079] },
      'MAURITANIA': { region: 'North Africa', marketType: 'Export', coordinates: [-10.9408, 21.0079] },
      
      // Southern Africa
      'South Africa': { region: 'Southern Africa', marketType: 'Export', coordinates: [22.9375, -30.5595] },
      'SOUTH AFRICA': { region: 'Southern Africa', marketType: 'Export', coordinates: [22.9375, -30.5595] },
      'Botswana': { region: 'Southern Africa', marketType: 'Export', coordinates: [24.6848, -22.3285] },
      'BOTSWANA': { region: 'Southern Africa', marketType: 'Export', coordinates: [24.6848, -22.3285] },
      'Namibia': { region: 'Southern Africa', marketType: 'Export', coordinates: [18.4904, -22.9576] },
      'NAMIBIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [18.4904, -22.9576] },
      'Zimbabwe': { region: 'Southern Africa', marketType: 'Export', coordinates: [29.1549, -19.0154] },
      'ZIMBABWE': { region: 'Southern Africa', marketType: 'Export', coordinates: [29.1549, -19.0154] },
      'Kenya': { region: 'Southern Africa', marketType: 'Export', coordinates: [37.9062, -0.0236] },
      'KENYA': { region: 'Southern Africa', marketType: 'Export', coordinates: [37.9062, -0.0236] },
      'Nigeria': { region: 'Southern Africa', marketType: 'Export', coordinates: [8.6753, 9.0820] },
      'NIGERIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [8.6753, 9.0820] },
      'Ghana': { region: 'Southern Africa', marketType: 'Export', coordinates: [-1.0232, 7.9465] },
      'GHANA': { region: 'Southern Africa', marketType: 'Export', coordinates: [-1.0232, 7.9465] },
      'Senegal': { region: 'Southern Africa', marketType: 'Export', coordinates: [-14.4524, 14.4974] },
      'SENEGAL': { region: 'Southern Africa', marketType: 'Export', coordinates: [-14.4524, 14.4974] },
      'Sierra Leone': { region: 'Southern Africa', marketType: 'Export', coordinates: [-11.7799, 8.4606] },
      'SIERRA LEONE': { region: 'Southern Africa', marketType: 'Export', coordinates: [-11.7799, 8.4606] },
      'Cameroon': { region: 'Southern Africa', marketType: 'Export', coordinates: [12.3547, 7.3697] },
      'CAMEROON': { region: 'Southern Africa', marketType: 'Export', coordinates: [12.3547, 7.3697] },
      'Congo': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'CONGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'Republic of Congo': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'REPUBLIC OF CONGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'Republic of the Congo': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'REPUBLIC OF THE CONGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'Congo-Brazzaville': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'CONGO-BRAZZAVILLE': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'Democratic Republic of Congo': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'DEMOCRATIC REPUBLIC OF CONGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'Democratic Republic of the Congo': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'DEMOCRATIC REPUBLIC OF THE CONGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'DEMOCRATIC REPUBLIC OF THE CON': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'DR Congo': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'DR CONGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'D.R. Congo': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'D.R. CONGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'Congo-Kinshasa': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'CONGO-KINSHASA': { region: 'Southern Africa', marketType: 'Export', coordinates: [21.7587, -4.0383] },
      'Uganda': { region: 'Southern Africa', marketType: 'Export', coordinates: [32.2903, 1.3733] },
      'UGANDA': { region: 'Southern Africa', marketType: 'Export', coordinates: [32.2903, 1.3733] },
      'Rwanda': { region: 'Southern Africa', marketType: 'Export', coordinates: [29.8739, -1.9403] },
      'RWANDA': { region: 'Southern Africa', marketType: 'Export', coordinates: [29.8739, -1.9403] },
      'Tanzania': { region: 'Southern Africa', marketType: 'Export', coordinates: [34.8888, -6.3690] },
      'UNITED REPUBLIC OF TANZANIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [34.8888, -6.3690] },
      'Somalia': { region: 'Southern Africa', marketType: 'Export', coordinates: [46.1996, 5.1521] },
      'SOMALIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [46.1996, 5.1521] },
      'SOMALILAND': { region: 'Southern Africa', marketType: 'Export', coordinates: [46.1996, 5.1521] },
      'Ethiopia': { region: 'Southern Africa', marketType: 'Export', coordinates: [40.4897, 9.1450] },
      'ETHIOPIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [40.4897, 9.1450] },
      'Eritrea': { region: 'Southern Africa', marketType: 'Export', coordinates: [39.7823, 15.1794] },
      'ERITREA': { region: 'Southern Africa', marketType: 'Export', coordinates: [39.7823, 15.1794] },
      'Angola': { region: 'Southern Africa', marketType: 'Export', coordinates: [17.8739, -11.2027] },
      'ANGOLA': { region: 'Southern Africa', marketType: 'Export', coordinates: [17.8739, -11.2027] },
      'Togo': { region: 'Southern Africa', marketType: 'Export', coordinates: [0.8248, 8.6195] },
      'TOGO': { region: 'Southern Africa', marketType: 'Export', coordinates: [0.8248, 8.6195] },
      'Niger': { region: 'Southern Africa', marketType: 'Export', coordinates: [8.0817, 17.6078] },
      'NIGER': { region: 'Southern Africa', marketType: 'Export', coordinates: [8.0817, 17.6078] },
      'Burundi': { region: 'Southern Africa', marketType: 'Export', coordinates: [29.9189, -3.3731] },
      'BURUNDI': { region: 'Southern Africa', marketType: 'Export', coordinates: [29.9189, -3.3731] },
      'Ivory Coast': { region: 'Southern Africa', marketType: 'Export', coordinates: [-5.5471, 7.5400] },
      'Cote D\'Ivoire': { region: 'Southern Africa', marketType: 'Export', coordinates: [-5.5471, 7.5400] },
      'COTE D\'IVOIRE': { region: 'Southern Africa', marketType: 'Export', coordinates: [-5.5471, 7.5400] },
      'Zambia': { region: 'Southern Africa', marketType: 'Export', coordinates: [27.8493, -13.1339] },
      'ZAMBIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [27.8493, -13.1339] },
      'Madagascar': { region: 'Southern Africa', marketType: 'Export', coordinates: [46.8691, -18.7669] },
      'MADAGASCAR': { region: 'Southern Africa', marketType: 'Export', coordinates: [46.8691, -18.7669] },
      'Mali': { region: 'Southern Africa', marketType: 'Export', coordinates: [-3.9962, 17.5707] },
      'MALI': { region: 'Southern Africa', marketType: 'Export', coordinates: [-3.9962, 17.5707] },
      'Mozambique': { region: 'Southern Africa', marketType: 'Export', coordinates: [35.5296, -18.6657] },
      'MOZAMBIQUE': { region: 'Southern Africa', marketType: 'Export', coordinates: [35.5296, -18.6657] },
      'Gambia': { region: 'Southern Africa', marketType: 'Export', coordinates: [-15.3101, 13.4432] },
      'GAMBIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [-15.3101, 13.4432] },
      'Guinea': { region: 'Southern Africa', marketType: 'Export', coordinates: [-9.6966, 9.6412] },
      'GUINEA': { region: 'Southern Africa', marketType: 'Export', coordinates: [-9.6966, 9.6412] },
      'Guinea-Bissau': { region: 'Southern Africa', marketType: 'Export', coordinates: [-15.1804, 11.8037] },
      'GUINEA-BISSAU': { region: 'Southern Africa', marketType: 'Export', coordinates: [-15.1804, 11.8037] },
      'Liberia': { region: 'Southern Africa', marketType: 'Export', coordinates: [-9.4295, 6.4281] },
      'LIBERIA': { region: 'Southern Africa', marketType: 'Export', coordinates: [-9.4295, 6.4281] },
      'Central African Republic': { region: 'Southern Africa', marketType: 'Export', coordinates: [20.9394, 6.6111] },
      'CENTRAL AFRICAN REPUBLIC': { region: 'Southern Africa', marketType: 'Export', coordinates: [20.9394, 6.6111] },
      'MAYOTTE': { region: 'Southern Africa', marketType: 'Export', coordinates: [45.1662, -12.8275] },
      'Benin': { region: 'Southern Africa', marketType: 'Export', coordinates: [2.3158, 9.3077] },
      'BENIN': { region: 'Southern Africa', marketType: 'Export', coordinates: [2.3158, 9.3077] },
      'Burkina Faso': { region: 'Southern Africa', marketType: 'Export', coordinates: [-2.1976, 12.2383] },
      'BURKINA FASO': { region: 'Southern Africa', marketType: 'Export', coordinates: [-2.1976, 12.2383] },
      'Cabo Verde': { region: 'Southern Africa', marketType: 'Export', coordinates: [-24.0132, 16.0020] },
      'CABO VERDE': { region: 'Southern Africa', marketType: 'Export', coordinates: [-24.0132, 16.0020] },
      'Cape Verde': { region: 'Southern Africa', marketType: 'Export', coordinates: [-24.0132, 16.0020] },
      'Chad': { region: 'Southern Africa', marketType: 'Export', coordinates: [18.7322, 15.4542] },
      'CHAD': { region: 'Southern Africa', marketType: 'Export', coordinates: [18.7322, 15.4542] },
      'Comoros': { region: 'Southern Africa', marketType: 'Export', coordinates: [43.8722, -11.6455] },
      'COMOROS': { region: 'Southern Africa', marketType: 'Export', coordinates: [43.8722, -11.6455] },
      'Equatorial Guinea': { region: 'Southern Africa', marketType: 'Export', coordinates: [10.2679, 1.6508] },
      'EQUATORIAL GUINEA': { region: 'Southern Africa', marketType: 'Export', coordinates: [10.2679, 1.6508] },
      'Eswatini': { region: 'Southern Africa', marketType: 'Export', coordinates: [31.4659, -26.5225] },
      'ESWATINI': { region: 'Southern Africa', marketType: 'Export', coordinates: [31.4659, -26.5225] },
      'Swaziland': { region: 'Southern Africa', marketType: 'Export', coordinates: [31.4659, -26.5225] },
      'Gabon': { region: 'Southern Africa', marketType: 'Export', coordinates: [11.6094, -0.8037] },
      'GABON': { region: 'Southern Africa', marketType: 'Export', coordinates: [11.6094, -0.8037] },
      'Lesotho': { region: 'Southern Africa', marketType: 'Export', coordinates: [28.2336, -29.6100] },
      'LESOTHO': { region: 'Southern Africa', marketType: 'Export', coordinates: [28.2336, -29.6100] },
      'Malawi': { region: 'Southern Africa', marketType: 'Export', coordinates: [34.3015, -13.2543] },
      'MALAWI': { region: 'Southern Africa', marketType: 'Export', coordinates: [34.3015, -13.2543] },
      'Mauritius': { region: 'Southern Africa', marketType: 'Export', coordinates: [57.5522, -20.3484] },
      'MAURITIUS': { region: 'Southern Africa', marketType: 'Export', coordinates: [57.5522, -20.3484] },
      'Sao Tome and Principe': { region: 'Southern Africa', marketType: 'Export', coordinates: [6.6131, 0.1864] },
      'SAO TOME AND PRINCIPE': { region: 'Southern Africa', marketType: 'Export', coordinates: [6.6131, 0.1864] },
      'Seychelles': { region: 'Southern Africa', marketType: 'Export', coordinates: [55.4919, -4.6796] },
      'SEYCHELLES': { region: 'Southern Africa', marketType: 'Export', coordinates: [55.4919, -4.6796] },
      
      // Europe
      'Germany': { region: 'Europe', marketType: 'Export', coordinates: [10.4515, 51.1657] },
      'GERMANY': { region: 'Europe', marketType: 'Export', coordinates: [10.4515, 51.1657] },
      'France': { region: 'Europe', marketType: 'Export', coordinates: [2.2137, 46.2276] },
      'FRANCE': { region: 'Europe', marketType: 'Export', coordinates: [2.2137, 46.2276] },
      'Italy': { region: 'Europe', marketType: 'Export', coordinates: [12.5674, 41.8719] },
      'ITALY': { region: 'Europe', marketType: 'Export', coordinates: [12.5674, 41.8719] },
      'Spain': { region: 'Europe', marketType: 'Export', coordinates: [-3.7492, 40.4637] },
      'SPAIN': { region: 'Europe', marketType: 'Export', coordinates: [-3.7492, 40.4637] },
      'United Kingdom': { region: 'Europe', marketType: 'Export', coordinates: [-3.4360, 55.3781] },
      'UNITED KINGDOM': { region: 'Europe', marketType: 'Export', coordinates: [-3.4360, 55.3781] },
      'UK': { region: 'Europe', marketType: 'Export', coordinates: [-3.4360, 55.3781] },
      'Great Britain': { region: 'Europe', marketType: 'Export', coordinates: [-3.4360, 55.3781] },
      'Britain': { region: 'Europe', marketType: 'Export', coordinates: [-3.4360, 55.3781] },
      'England': { region: 'Europe', marketType: 'Export', coordinates: [-3.4360, 55.3781] },
      'Netherlands': { region: 'Europe', marketType: 'Export', coordinates: [5.2913, 52.1326] },
      'NETHERLANDS': { region: 'Europe', marketType: 'Export', coordinates: [5.2913, 52.1326] },
      'Belgium': { region: 'Europe', marketType: 'Export', coordinates: [4.4699, 50.5039] },
      'BELGIUM': { region: 'Europe', marketType: 'Export', coordinates: [4.4699, 50.5039] },
      'Poland': { region: 'Europe', marketType: 'Export', coordinates: [19.1451, 51.9194] },
      'POLAND': { region: 'Europe', marketType: 'Export', coordinates: [19.1451, 51.9194] },
      'Russia': { region: 'Europe', marketType: 'Export', coordinates: [105.3188, 61.5240] },
      'RUSSIA': { region: 'Europe', marketType: 'Export', coordinates: [105.3188, 61.5240] },
      'Russian Federation': { region: 'Europe', marketType: 'Export', coordinates: [105.3188, 61.5240] },
      'Georgia': { region: 'Europe', marketType: 'Export', coordinates: [43.3569, 42.3154] },
      'GEORGIA': { region: 'Europe', marketType: 'Export', coordinates: [43.3569, 42.3154] },
      'Turkmenistan': { region: 'Europe', marketType: 'Export', coordinates: [59.5563, 38.9697] },
      'TURKMENISTAN': { region: 'Europe', marketType: 'Export', coordinates: [59.5563, 38.9697] },
      'Armenia': { region: 'Europe', marketType: 'Export', coordinates: [45.0382, 40.0691] },
      'ARMENIA': { region: 'Europe', marketType: 'Export', coordinates: [45.0382, 40.0691] },
      'Albania': { region: 'Europe', marketType: 'Export', coordinates: [20.1683, 41.1533] },
      'ALBANIA': { region: 'Europe', marketType: 'Export', coordinates: [20.1683, 41.1533] },
      'Andorra': { region: 'Europe', marketType: 'Export', coordinates: [1.6016, 42.5462] },
      'ANDORRA': { region: 'Europe', marketType: 'Export', coordinates: [1.6016, 42.5462] },
      'Austria': { region: 'Europe', marketType: 'Export', coordinates: [14.5501, 47.5162] },
      'AUSTRIA': { region: 'Europe', marketType: 'Export', coordinates: [14.5501, 47.5162] },
      'Azerbaijan': { region: 'Europe', marketType: 'Export', coordinates: [47.5769, 40.1431] },
      'AZERBAIJAN': { region: 'Europe', marketType: 'Export', coordinates: [47.5769, 40.1431] },
      'Belarus': { region: 'Europe', marketType: 'Export', coordinates: [27.9534, 53.7098] },
      'BELARUS': { region: 'Europe', marketType: 'Export', coordinates: [27.9534, 53.7098] },
      'Bosnia and Herzegovina': { region: 'Europe', marketType: 'Export', coordinates: [17.6791, 43.9159] },
      'BOSNIA AND HERZEGOVINA': { region: 'Europe', marketType: 'Export', coordinates: [17.6791, 43.9159] },
      'Bulgaria': { region: 'Europe', marketType: 'Export', coordinates: [25.4858, 42.7339] },
      'BULGARIA': { region: 'Europe', marketType: 'Export', coordinates: [25.4858, 42.7339] },
      'Croatia': { region: 'Europe', marketType: 'Export', coordinates: [15.2000, 45.1000] },
      'CROATIA': { region: 'Europe', marketType: 'Export', coordinates: [15.2000, 45.1000] },
      'Cyprus': { region: 'Europe', marketType: 'Export', coordinates: [33.4299, 35.1264] },
      'CYPRUS': { region: 'Europe', marketType: 'Export', coordinates: [33.4299, 35.1264] },
      'Czech Republic': { region: 'Europe', marketType: 'Export', coordinates: [15.4730, 49.8175] },
      'CZECH REPUBLIC': { region: 'Europe', marketType: 'Export', coordinates: [15.4730, 49.8175] },
      'Czechia': { region: 'Europe', marketType: 'Export', coordinates: [15.4730, 49.8175] },
      'Denmark': { region: 'Europe', marketType: 'Export', coordinates: [9.5018, 56.2639] },
      'DENMARK': { region: 'Europe', marketType: 'Export', coordinates: [9.5018, 56.2639] },
      'Estonia': { region: 'Europe', marketType: 'Export', coordinates: [25.0136, 58.5953] },
      'ESTONIA': { region: 'Europe', marketType: 'Export', coordinates: [25.0136, 58.5953] },
      'Finland': { region: 'Europe', marketType: 'Export', coordinates: [25.7482, 61.9241] },
      'FINLAND': { region: 'Europe', marketType: 'Export', coordinates: [25.7482, 61.9241] },
      'Greece': { region: 'Europe', marketType: 'Export', coordinates: [21.8243, 39.0742] },
      'GREECE': { region: 'Europe', marketType: 'Export', coordinates: [21.8243, 39.0742] },
      'Hungary': { region: 'Europe', marketType: 'Export', coordinates: [19.5033, 47.1625] },
      'HUNGARY': { region: 'Europe', marketType: 'Export', coordinates: [19.5033, 47.1625] },
      'Iceland': { region: 'Europe', marketType: 'Export', coordinates: [-19.0208, 64.9631] },
      'ICELAND': { region: 'Europe', marketType: 'Export', coordinates: [-19.0208, 64.9631] },
      'Ireland': { region: 'Europe', marketType: 'Export', coordinates: [-8.2439, 53.4129] },
      'IRELAND': { region: 'Europe', marketType: 'Export', coordinates: [-8.2439, 53.4129] },
      'Kazakhstan': { region: 'Europe', marketType: 'Export', coordinates: [66.9237, 48.0196] },
      'KAZAKHSTAN': { region: 'Europe', marketType: 'Export', coordinates: [66.9237, 48.0196] },
      'Latvia': { region: 'Europe', marketType: 'Export', coordinates: [24.6032, 56.8796] },
      'LATVIA': { region: 'Europe', marketType: 'Export', coordinates: [24.6032, 56.8796] },
      'Liechtenstein': { region: 'Europe', marketType: 'Export', coordinates: [9.5554, 47.1660] },
      'LIECHTENSTEIN': { region: 'Europe', marketType: 'Export', coordinates: [9.5554, 47.1660] },
      'Lithuania': { region: 'Europe', marketType: 'Export', coordinates: [23.8813, 55.1694] },
      'LITHUANIA': { region: 'Europe', marketType: 'Export', coordinates: [23.8813, 55.1694] },
      'Luxembourg': { region: 'Europe', marketType: 'Export', coordinates: [6.1296, 49.8153] },
      'LUXEMBOURG': { region: 'Europe', marketType: 'Export', coordinates: [6.1296, 49.8153] },
      'Malta': { region: 'Europe', marketType: 'Export', coordinates: [14.3754, 35.9375] },
      'MALTA': { region: 'Europe', marketType: 'Export', coordinates: [14.3754, 35.9375] },
      'Moldova': { region: 'Europe', marketType: 'Export', coordinates: [28.3699, 47.4116] },
      'MOLDOVA': { region: 'Europe', marketType: 'Export', coordinates: [28.3699, 47.4116] },
      'Monaco': { region: 'Europe', marketType: 'Export', coordinates: [7.4128, 43.7384] },
      'MONACO': { region: 'Europe', marketType: 'Export', coordinates: [7.4128, 43.7384] },
      'Montenegro': { region: 'Europe', marketType: 'Export', coordinates: [19.3744, 42.7087] },
      'MONTENEGRO': { region: 'Europe', marketType: 'Export', coordinates: [19.3744, 42.7087] },
      'North Macedonia': { region: 'Europe', marketType: 'Export', coordinates: [21.7453, 41.6086] },
      'NORTH MACEDONIA': { region: 'Europe', marketType: 'Export', coordinates: [21.7453, 41.6086] },
      'Macedonia': { region: 'Europe', marketType: 'Export', coordinates: [21.7453, 41.6086] },
      'FYROM': { region: 'Europe', marketType: 'Export', coordinates: [21.7453, 41.6086] },
      'Norway': { region: 'Europe', marketType: 'Export', coordinates: [8.4689, 60.4720] },
      'NORWAY': { region: 'Europe', marketType: 'Export', coordinates: [8.4689, 60.4720] },
      'Portugal': { region: 'Europe', marketType: 'Export', coordinates: [-8.2245, 39.3999] },
      'PORTUGAL': { region: 'Europe', marketType: 'Export', coordinates: [-8.2245, 39.3999] },
      'Romania': { region: 'Europe', marketType: 'Export', coordinates: [24.9668, 45.9432] },
      'ROMANIA': { region: 'Europe', marketType: 'Export', coordinates: [24.9668, 45.9432] },
      'Serbia': { region: 'Europe', marketType: 'Export', coordinates: [21.0059, 44.0165] },
      'SERBIA': { region: 'Europe', marketType: 'Export', coordinates: [21.0059, 44.0165] },
      'Slovakia': { region: 'Europe', marketType: 'Export', coordinates: [19.6990, 48.6690] },
      'SLOVAKIA': { region: 'Europe', marketType: 'Export', coordinates: [19.6990, 48.6690] },
      'Slovenia': { region: 'Europe', marketType: 'Export', coordinates: [14.9955, 46.1512] },
      'SLOVENIA': { region: 'Europe', marketType: 'Export', coordinates: [14.9955, 46.1512] },
      'Sweden': { region: 'Europe', marketType: 'Export', coordinates: [18.6435, 60.1282] },
      'SWEDEN': { region: 'Europe', marketType: 'Export', coordinates: [18.6435, 60.1282] },
      'Switzerland': { region: 'Europe', marketType: 'Export', coordinates: [8.2275, 46.8182] },
      'SWITZERLAND': { region: 'Europe', marketType: 'Export', coordinates: [8.2275, 46.8182] },
      'Ukraine': { region: 'Europe', marketType: 'Export', coordinates: [31.1656, 48.3794] },
      'UKRAINE': { region: 'Europe', marketType: 'Export', coordinates: [31.1656, 48.3794] },
      'San Marino': { region: 'Europe', marketType: 'Export', coordinates: [12.4578, 43.9424] },
      'SAN MARINO': { region: 'Europe', marketType: 'Export', coordinates: [12.4578, 43.9424] },
      
      // Americas
      'United States': { region: 'Americas', marketType: 'Export', coordinates: [-95.7129, 37.0902] },
      'UNITED STATES': { region: 'Americas', marketType: 'Export', coordinates: [-95.7129, 37.0902] },
      'United States of America': { region: 'Americas', marketType: 'Export', coordinates: [-95.7129, 37.0902] },
      'USA': { region: 'Americas', marketType: 'Export', coordinates: [-95.7129, 37.0902] },
      'US': { region: 'Americas', marketType: 'Export', coordinates: [-95.7129, 37.0902] },
      'America': { region: 'Americas', marketType: 'Export', coordinates: [-95.7129, 37.0902] },
      'Canada': { region: 'Americas', marketType: 'Export', coordinates: [-106.3468, 56.1304] },
      'CANADA': { region: 'Americas', marketType: 'Export', coordinates: [-106.3468, 56.1304] },
      'Mexico': { region: 'Americas', marketType: 'Export', coordinates: [-102.5528, 23.6345] },
      'MEXICO': { region: 'Americas', marketType: 'Export', coordinates: [-102.5528, 23.6345] },
      'Brazil': { region: 'Americas', marketType: 'Export', coordinates: [-51.9253, -14.2350] },
      'BRAZIL': { region: 'Americas', marketType: 'Export', coordinates: [-51.9253, -14.2350] },
      'Argentina': { region: 'Americas', marketType: 'Export', coordinates: [-63.6167, -38.4161] },
      'ARGENTINA': { region: 'Americas', marketType: 'Export', coordinates: [-63.6167, -38.4161] },
      'Chile': { region: 'Americas', marketType: 'Export', coordinates: [-71.5430, -35.6751] },
      'CHILE': { region: 'Americas', marketType: 'Export', coordinates: [-71.5430, -35.6751] },
      'Colombia': { region: 'Americas', marketType: 'Export', coordinates: [-74.2973, 4.5709] },
      'COLOMBIA': { region: 'Americas', marketType: 'Export', coordinates: [-74.2973, 4.5709] },
      'Peru': { region: 'Americas', marketType: 'Export', coordinates: [-75.0152, -9.1900] },
      'PERU': { region: 'Americas', marketType: 'Export', coordinates: [-75.0152, -9.1900] },
      'Venezuela': { region: 'Americas', marketType: 'Export', coordinates: [-66.5897, 6.4238] },
      'VENEZUELA': { region: 'Americas', marketType: 'Export', coordinates: [-66.5897, 6.4238] },
      'Ecuador': { region: 'Americas', marketType: 'Export', coordinates: [-78.1834, -1.8312] },
      'ECUADOR': { region: 'Americas', marketType: 'Export', coordinates: [-78.1834, -1.8312] },
      'Bolivia': { region: 'Americas', marketType: 'Export', coordinates: [-63.5887, -16.2902] },
      'BOLIVIA': { region: 'Americas', marketType: 'Export', coordinates: [-63.5887, -16.2902] },
      'Paraguay': { region: 'Americas', marketType: 'Export', coordinates: [-58.4438, -23.4425] },
      'PARAGUAY': { region: 'Americas', marketType: 'Export', coordinates: [-58.4438, -23.4425] },
      'Uruguay': { region: 'Americas', marketType: 'Export', coordinates: [-55.7658, -32.5228] },
      'URUGUAY': { region: 'Americas', marketType: 'Export', coordinates: [-55.7658, -32.5228] },
      'Guyana': { region: 'Americas', marketType: 'Export', coordinates: [-58.9302, 4.8604] },
      'GUYANA': { region: 'Americas', marketType: 'Export', coordinates: [-58.9302, 4.8604] },
      'Suriname': { region: 'Americas', marketType: 'Export', coordinates: [-56.0278, 3.9193] },
      'SURINAME': { region: 'Americas', marketType: 'Export', coordinates: [-56.0278, 3.9193] },
      'French Guiana': { region: 'Americas', marketType: 'Export', coordinates: [-53.1258, 3.9339] },
      'FRENCH GUIANA': { region: 'Americas', marketType: 'Export', coordinates: [-53.1258, 3.9339] },
      
      // Asia-Pacific
      'China': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [104.1954, 35.8617] },
      'CHINA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [104.1954, 35.8617] },
      'Japan': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [138.2529, 36.2048] },
      'JAPAN': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [138.2529, 36.2048] },
      'South Korea': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.7669, 35.9078] },
      'SOUTH KOREA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.7669, 35.9078] },
      'Republic of Korea': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.7669, 35.9078] },
      'Korea': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.7669, 35.9078] },
      'North Korea': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.5101, 40.3399] },
      'NORTH KOREA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.5101, 40.3399] },
      'Democratic People\'s Republic of Korea': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.5101, 40.3399] },
      'DPRK': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [127.5101, 40.3399] },
      'Taiwan': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [120.9605, 23.6978] },
      'TAIWAN': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [120.9605, 23.6978] },
      'Republic of China': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [120.9605, 23.6978] },
      'Chinese Taipei': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [120.9605, 23.6978] },
      'India': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [78.9629, 20.5937] },
      'INDIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [78.9629, 20.5937] },
      'Sri Lanka': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [80.7718, 7.8731] },
      'SRI LANKA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [80.7718, 7.8731] },
      'Bangladesh': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [90.3563, 23.6850] },
      'BANGLADESH': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [90.3563, 23.6850] },
      'Indonesia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [113.9213, -0.7893] },
      'INDONESIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [113.9213, -0.7893] },
      'Malaysia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [101.9758, 4.2105] },
      'MALAYSIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [101.9758, 4.2105] },
      'Thailand': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [100.9925, 15.8700] },
      'THAILAND': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [100.9925, 15.8700] },
      'Philippines': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [121.7740, 12.8797] },
      'PHILIPPINES': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [121.7740, 12.8797] },
      'Vietnam': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [108.2772, 14.0583] },
      'VIETNAM': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [108.2772, 14.0583] },
      'Australia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [133.7751, -25.2744] },
      'AUSTRALIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [133.7751, -25.2744] },
      'New Zealand': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [174.8860, -40.9006] },
      'NEW ZEALAND': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [174.8860, -40.9006] },
      'Singapore': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [103.8198, 1.3521] },
      'SINGAPORE': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [103.8198, 1.3521] },
      'Hong Kong': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [114.1095, 22.3964] },
      'HONG KONG': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [114.1095, 22.3964] },
      'Macau': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [113.5439, 22.1987] },
      'MACAU': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [113.5439, 22.1987] },
      'Macao': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [113.5439, 22.1987] },
      'Brunei': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [114.7277, 4.5353] },
      'BRUNEI': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [114.7277, 4.5353] },
      'Myanmar': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [95.9562, 21.9162] },
      'MYANMAR': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [95.9562, 21.9162] },
      'Burma': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [95.9562, 21.9162] },
      'Cambodia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [104.9910, 12.5657] },
      'CAMBODIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [104.9910, 12.5657] },
      'Laos': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [102.4955, 19.8563] },
      'LAOS': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [102.4955, 19.8563] },
      'Mongolia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [103.8467, 46.8625] },
      'MONGOLIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [103.8467, 46.8625] },
      'Nepal': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [84.1240, 28.3949] },
      'NEPAL': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [84.1240, 28.3949] },
      'Bhutan': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [90.4336, 27.5142] },
      'BHUTAN': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [90.4336, 27.5142] },
      'Maldives': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [73.5367, 3.2028] },
      'MALDIVES': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [73.5367, 3.2028] },
      'Fiji': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-178.0650, -16.5788] },
      'FIJI': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-178.0650, -16.5788] },
      'Papua New Guinea': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [143.9555, -6.3150] },
      'PAPUA NEW GUINEA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [143.9555, -6.3150] },
      'Solomon Islands': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [160.1562, -9.6457] },
      'SOLOMON ISLANDS': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [160.1562, -9.6457] },
      'Vanuatu': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [166.9592, -15.3767] },
      'VANUATU': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [166.9592, -15.3767] },
      'New Caledonia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [165.6180, -20.9043] },
      'NEW CALEDONIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [165.6180, -20.9043] },
      'French Polynesia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-149.4068, -17.6797] },
      'FRENCH POLYNESIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-149.4068, -17.6797] },
      'Samoa': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-172.1046, -13.7590] },
      'SAMOA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-172.1046, -13.7590] },
      'Tonga': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-175.1982, -21.1789] },
      'TONGA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-175.1982, -21.1789] },
      'Kiribati': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-157.3630, 1.8709] },
      'KIRIBATI': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [-157.3630, 1.8709] },
      'Tuvalu': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [177.6493, -7.1095] },
      'TUVALU': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [177.6493, -7.1095] },
      'Nauru': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [166.9315, -0.5228] },
      'NAURU': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [166.9315, -0.5228] },
      'Palau': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [134.5825, 7.5150] },
      'PALAU': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [134.5825, 7.5150] },
      'Marshall Islands': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [171.1845, 7.1315] },
      'MARSHALL ISLANDS': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [171.1845, 7.1315] },
      'Micronesia': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [150.5508, 7.4256] },
      'MICRONESIA': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [150.5508, 7.4256] },
      'Timor-Leste': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [125.7275, -8.8742] },
      'TIMOR-LESTE': { region: 'Asia-Pacific', marketType: 'Export', coordinates: [125.7275, -8.8742] }
    };
  }

  /**
   * Smart country assignment with fuzzy matching
   */
  smartCountryAssignment(countryName) {
    if (!countryName) return { region: 'Unassigned', marketType: 'Unknown', coordinates: null };
    
    const worldDB = this.getWorldCountriesDatabase();
    const normalizedName = countryName.toString().trim();
    
    // Direct exact match
    if (worldDB[normalizedName]) {
      return worldDB[normalizedName];
    }
    
    // Case-insensitive exact match
    for (const [key, value] of Object.entries(worldDB)) {
      if (key.toLowerCase() === normalizedName.toLowerCase()) {
        return value;
      }
    }
    
    // Fuzzy matching patterns
    const fuzzyPatterns = {
      'uae': ['emirates', 'uae'],
      'saudi': ['saudi', 'ksa', 'kingdom of saudi'],
      'uk': ['united kingdom', 'uk', 'britain', 'great britain', 'england'],
      'usa': ['united states', 'usa', 'america', 'us'],
      'drc': ['democratic republic', 'congo', 'dr congo', 'd.r. congo'],
      'ivory': ['ivory', 'cote d\'ivoire'],
      'tanzania': ['tanzania', 'united republic of tanzania'],
      'korea': ['korea', 'republic of korea'],
      'czech': ['czech', 'czechia'],
      'bosnia': ['bosnia', 'herzegovina'],
      'myanmar': ['myanmar', 'burma'],
      'eswatini': ['eswatini', 'swaziland'],
      'taiwan': ['taiwan', 'republic of china', 'chinese taipei'],
      'palestine': ['palestine', 'palestinian'],
      'macedonia': ['macedonia', 'north macedonia', 'fyrom'],
      'cape': ['cape verde', 'cabo verde']
    };
    
    const countryLower = normalizedName.toLowerCase();
    
    // Check fuzzy patterns
    for (const [key, patterns] of Object.entries(fuzzyPatterns)) {
      if (patterns.some(pattern => countryLower.includes(pattern))) {
        // Find matching entry in worldDB
        for (const [dbKey, dbValue] of Object.entries(worldDB)) {
          if (dbKey.toLowerCase().includes(key)) {
            return dbValue;
          }
        }
      }
    }
    
    // Word-based matching
    const countryWords = countryLower.split(/\s+/);
    for (const [key, value] of Object.entries(worldDB)) {
      const keyWords = key.toLowerCase().split(/\s+/);
      if (countryWords.some(word => keyWords.some(keyWord => 
        keyWord.includes(word) || word.includes(keyWord)
      ))) {
        return value;
      }
    }
    
    // Default to Unassigned
    return { region: 'Unassigned', marketType: 'Unknown', coordinates: null };
  }

  /**
   * Get countries with unassigned regions from database
   */
  async getUnassignedCountries(division = 'FP') {
    try {
      const query = `
        SELECT DISTINCT countryname
        FROM fp_data_excel
        WHERE countryname IS NOT NULL
          AND TRIM(countryname) != ''
        ORDER BY countryname
      `;
      
      const result = await this.pool.query(query);
      const countries = result.rows.map(row => row.countryname);
      
      const unassignedCountries = [];
      const suggestions = [];
      
      for (const country of countries) {
        const assignment = this.smartCountryAssignment(country);
        if (assignment.region === 'Unassigned') {
          unassignedCountries.push({
            country,
            currentRegion: 'Unassigned',
            suggestion: this.generateAssignmentSuggestion(country)
          });
        } else {
          suggestions.push({
            country,
            suggestedRegion: assignment.region,
            suggestedMarketType: assignment.marketType,
            confidence: this.calculateConfidence(country, assignment)
          });
        }
      }
      
      return {
        unassigned: unassignedCountries,
        suggestions,
        totalCountries: countries.length,
        assignedCountries: countries.length - unassignedCountries.length
      };
      
    } catch (error) {
      console.error('Error getting unassigned countries:', error);
      throw error;
    }
  }

  /**
   * Generate assignment suggestion for unassigned country
   */
  generateAssignmentSuggestion(countryName) {
    const countryLower = countryName.toLowerCase();
    
    // Geographic hints based on common patterns
    if (countryLower.includes('island') || countryLower.includes('islands')) {
      return { region: 'Asia-Pacific', marketType: 'Export', reason: 'Island nation pattern' };
    }
    
    if (countryLower.includes('republic') || countryLower.includes('democratic')) {
      return { region: 'Southern Africa', marketType: 'Export', reason: 'Republic pattern' };
    }
    
    if (countryLower.includes('federal') || countryLower.includes('federation')) {
      return { region: 'Europe', marketType: 'Export', reason: 'Federal state pattern' };
    }
    
    // Default suggestion
    return { region: 'Southern Africa', marketType: 'Export', reason: 'Default assignment for unknown countries' };
  }

  /**
   * Calculate confidence score for assignment
   */
  calculateConfidence(countryName, assignment) {
    const worldDB = this.getWorldCountriesDatabase();
    const normalizedName = countryName.toString().trim();
    
    // High confidence for exact matches
    if (worldDB[normalizedName]) {
      return 'High';
    }
    
    // Medium confidence for case-insensitive matches
    for (const key of Object.keys(worldDB)) {
      if (key.toLowerCase() === normalizedName.toLowerCase()) {
        return 'Medium';
      }
    }
    
    // Low confidence for fuzzy matches
    return 'Low';
  }

  /**
   * Update GeographicDistributionService with comprehensive mapping
   */
  updateGeographicDistributionService() {
    const worldDB = this.getWorldCountriesDatabase();
    
    // Generate the mapping code for GeographicDistributionService
    let mappingCode = `
  /**
   * Enhanced getRegionForCountry with comprehensive world countries database
   */
  getRegionForCountry(countryName) {
    if (!countryName) return 'Unassigned';
    
    const country = countryName.toString().trim().toLowerCase();
    
    // Comprehensive world countries database
    const worldCountries = {`;
    
    for (const [country, data] of Object.entries(worldDB)) {
      mappingCode += `
      '${country.toLowerCase()}': '${data.region}',`;
    }
    
    mappingCode += `
    };
    
    // Direct lookup
    let region = worldCountries[country];
    
    // If no direct match, try smart assignment
    if (!region) {
      const smartAssignment = this.smartCountryAssignment(countryName);
      region = smartAssignment.region;
    }
    
    return region || 'Unassigned';
  }`;
    
    return mappingCode;
  }
}

module.exports = WorldCountriesService;

const { pool } = require('./database/config');

const EXPECTED_COUNTRIES = [
  'UNITED ARAB EMIRATES','ALGERIA','IRAQ','MOROCCO','KINGDOM OF SAUDI ARABIA','OMAN','KUWAIT','SOMALIA','BAHRAIN','LEBANON','YEMEN','UNITED STATES','JORDAN','QATAR','NIGER','UNITED KINGDOM','UGANDA'
];

const HY1_MONTHS = [1,2,3,4,5,6];

async function main() {
  try {
    console.log('Diagnostics: fp_data_excel → 2025 HY1 (Jan–Jun) type=Actual, values_type=AMOUNT');

    // 1) Global counts for sanity
    const global = await pool.query(`
      SELECT COUNT(*) AS rows_2025, COUNT(DISTINCT UPPER(TRIM(countryname))) AS countries_2025
      FROM fp_data_excel
      WHERE year=2025 AND month = ANY($1)
        AND countryname IS NOT NULL AND TRIM(countryname)<>''
    `, [HY1_MONTHS]);
    console.log('Global 2025 HY1 rows:', global.rows[0].rows_2025, 'countries:', global.rows[0].countries_2025);

    // 2) Full list of countries present in HY1 2025 (any type/value_type) for reference
    const allCountries = await pool.query(`
      SELECT UPPER(TRIM(countryname)) AS country
      FROM fp_data_excel
      WHERE year=2025 AND month = ANY($1)
        AND countryname IS NOT NULL AND TRIM(countryname)<>''
      GROUP BY UPPER(TRIM(countryname))
      ORDER BY country
    `, [HY1_MONTHS]);
    console.log('\nCountries present in HY1/2025 (any type/value_type):', allCountries.rows.length);
    console.log(allCountries.rows.map(r=>r.country).join(', '));

    // 3) Target slice: Actual + AMOUNT
    const amountActual = await pool.query(`
      SELECT UPPER(TRIM(countryname)) AS country,
             SUM(values) AS amount,
             COUNT(*) AS records
      FROM fp_data_excel
      WHERE year=2025 AND month = ANY($1)
        AND LOWER(type)='actual' AND LOWER(values_type)='amount'
        AND countryname IS NOT NULL AND TRIM(countryname)<>'' AND values IS NOT NULL
      GROUP BY UPPER(TRIM(countryname))
      ORDER BY amount DESC
    `, [HY1_MONTHS]);
    const amountActualMap = new Map(amountActual.rows.map(r=>[r.country, r]));
    const grand = amountActual.rows.reduce((s,r)=> s + Number(r.amount||0), 0);
    console.log('\nActual+AMOUNT HY1/2025 countries:', amountActual.rows.length, 'Grand Total:', grand.toFixed(2));

    // 4) For each expected country, show presence and alternatives
    console.log('\nPer-country diagnostics:');
    for (const name of EXPECTED_COUNTRIES) {
      const key = name.trim().toUpperCase();
      const slice = amountActualMap.get(key);
      if (slice) {
        console.log(`✔ ${key} — Actual/AMOUNT total=${Number(slice.amount||0).toFixed(2)} records=${slice.records}`);
        continue;
      }
      // If missing in target slice, check other value types or type=budget
      const alt = await pool.query(`
        SELECT LOWER(values_type) AS vtype, LOWER(type) AS dtype, SUM(values) AS sum, COUNT(*) AS cnt
        FROM fp_data_excel
        WHERE year=2025 AND month = ANY($1)
          AND UPPER(TRIM(countryname))=$2
          AND countryname IS NOT NULL AND TRIM(countryname)<>'' AND values IS NOT NULL
        GROUP BY 1,2
        ORDER BY 1,2
      `, [HY1_MONTHS, key]);
      if (alt.rows.length === 0) {
        console.log(`✖ ${key} — No rows in HY1/2025 under any type/value_type.`);
      } else {
        console.log(`! ${key} — Not in Actual/AMOUNT; found:`);
        alt.rows.forEach(r => console.log(`   - ${r.dtype}/${r.vtype}: total=${Number(r.sum||0).toFixed(2)} (${r.cnt} rec)`));
      }
    }

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();


















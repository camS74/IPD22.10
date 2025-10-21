const { pool } = require('./database/config');

(async () => {
  try {
    console.log('Query: 2025 HY1 Actual, values_type=AMOUNT, case-insensitive countries');
    // If there are no rows, it might mean values_type casing differs or type casing differs.
    // Run a quick diagnostic summary first.
    const diag = await pool.query(`
      SELECT LOWER(values_type) AS vtype, LOWER(type) AS dtype, COUNT(*) AS cnt
      FROM fp_data_excel
      WHERE year = 2025 AND month IN (1,2,3,4,5,6)
        AND countryname IS NOT NULL AND TRIM(countryname) <> '' AND values IS NOT NULL
      GROUP BY LOWER(values_type), LOWER(type)
      ORDER BY 1,2;
    `);
    console.log('Combinations (values_type, type) for 2025 HY1:', diag.rows);

    const sql = `
      SELECT UPPER(TRIM(countryname)) AS country,
             SUM(values) AS amount,
             COUNT(*) AS records
      FROM fp_data_excel
      WHERE year = 2025
        AND month IN (1,2,3,4,5,6)
        AND LOWER(type) = 'actual'
        AND LOWER(values_type) = 'amount'
        AND countryname IS NOT NULL
        AND TRIM(countryname) <> ''
        AND values IS NOT NULL
      GROUP BY UPPER(TRIM(countryname))
      ORDER BY amount DESC;
    `;
    const res = await pool.query(sql);
    const rows = res.rows;
    const grand = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    console.log(`Countries: ${rows.length}`);
    console.log(`Grand Total: ${grand.toFixed(2)}`);
    rows.forEach((r, i) => {
      const amt = Number(r.amount || 0).toLocaleString('en-US');
      console.log(`${i + 1}. ${r.country} : ${amt} (${r.records} rec)`);
    });
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();



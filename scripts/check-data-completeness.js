/**
 * Check Data Completeness Script
 * Compare CSV exports with database to verify all data was imported
 */
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const initSqlJs = require('sql.js');

const APP_DATA_PATH = path.join(__dirname, '..', 'app-data');
const DB_PATH = path.join(APP_DATA_PATH, 'database.db');
const CSV_PATH = path.join(__dirname, '..', 'exported_csv');

async function main() {
  console.log('🔍 Checking Data Completeness\n');
  console.log('='.repeat(100));

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found at:', DB_PATH);
    return;
  }

  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(dbBuffer);

  // 1. Check Accounts
  console.log('\n📊 ACCOUNTS COMPARISON');
  console.log('-'.repeat(100));
  
  const acPath = path.join(CSV_PATH, 'AC.csv');
  if (fs.existsSync(acPath)) {
    const acContent = fs.readFileSync(acPath, 'utf-8');
    const acParsed = Papa.parse(acContent, { header: true, skipEmptyLines: true });
    const csvAccounts = acParsed.data.filter(row => 
      row.AC_TITLE1 && !row.AC_TITLE1.includes('Enter New Account')
    );
    
    const dbAccounts = db.exec(`SELECT COUNT(*) as count FROM accounts WHERE is_active = 1`);
    const dbCount = dbAccounts[0].values[0][0];
    
    console.log(`CSV Accounts (AC.csv):     ${csvAccounts.length}`);
    console.log(`Database Accounts:         ${dbCount}`);
    console.log(`Status: ${csvAccounts.length === dbCount ? '✅ Match' : '⚠️  Mismatch'}`);
  }

  // 2. Check Transactions/Vouchers
  console.log('\n\n💰 TRANSACTIONS COMPARISON');
  console.log('-'.repeat(100));
  
  const inv1Path = path.join(CSV_PATH, 'Inv1.csv');
  if (fs.existsSync(inv1Path)) {
    const inv1Content = fs.readFileSync(inv1Path, 'utf-8');
    const inv1Parsed = Papa.parse(inv1Content, { header: true, skipEmptyLines: true });
    const csvTransactions = inv1Parsed.data.filter(row => row.TR_No && row.Amount);
    
    // Group by TR_No to get unique transactions
    const uniqueTrNos = new Set(csvTransactions.map(row => row.TR_No));
    
    const dbVouchers = db.exec(`SELECT COUNT(*) as count FROM vouchers`);
    const dbCount = dbVouchers[0].values[0][0];
    
    console.log(`CSV Transactions (Inv1.csv): ${csvTransactions.length} entries`);
    console.log(`CSV Unique TR_No:            ${uniqueTrNos.size} transactions`);
    console.log(`Database Vouchers:           ${dbCount}`);
    console.log(`Status: ${uniqueTrNos.size <= dbCount ? '✅ All imported' : '⚠️  Some missing'}`);
    
    // Show transaction type breakdown from CSV
    console.log('\n📋 CSV Transaction Types:');
    const typeCount = {};
    csvTransactions.forEach(row => {
      const vtype = row.VType;
      typeCount[vtype] = (typeCount[vtype] || 0) + 1;
    });
    Object.keys(typeCount).sort().forEach(type => {
      const typeName = type === '101' ? 'Credit (Receipt)' : 
                       type === '102' ? 'Debit (Payment)' : 
                       type === '201' ? 'Journal' : `Unknown (${type})`;
      console.log(`   ${typeName}: ${typeCount[type]}`);
    });
    
    // Show database voucher types
    console.log('\n📋 Database Voucher Types:');
    const dbTypes = db.exec(`
      SELECT voucher_type, COUNT(*) as count 
      FROM vouchers 
      GROUP BY voucher_type 
      ORDER BY voucher_type
    `);
    if (dbTypes.length > 0 && dbTypes[0].values.length > 0) {
      dbTypes[0].values.forEach(row => {
        console.log(`   ${row[0]}: ${row[1]}`);
      });
    }
  }

  // 3. Check Date Range
  console.log('\n\n📅 DATE RANGE COMPARISON');
  console.log('-'.repeat(100));
  
  const t1Path = path.join(CSV_PATH, 'T1.csv');
  if (fs.existsSync(t1Path)) {
    const t1Content = fs.readFileSync(t1Path, 'utf-8');
    const t1Parsed = Papa.parse(t1Content, { header: true, skipEmptyLines: true });
    const dates = t1Parsed.data
      .filter(row => row.TR_Date)
      .map(row => row.TR_Date)
      .filter(date => date);
    
    if (dates.length > 0) {
      // Parse dates (M/D/YYYY format)
      const parsedDates = dates.map(d => {
        const parts = d.split('/');
        if (parts.length === 3) {
          return new Date(parts[2], parts[0] - 1, parts[1]);
        }
        return null;
      }).filter(d => d && !isNaN(d.getTime()));
      
      if (parsedDates.length > 0) {
        const minDate = new Date(Math.min(...parsedDates));
        const maxDate = new Date(Math.max(...parsedDates));
        
        console.log(`CSV Date Range (T1.csv):`);
        console.log(`   Earliest: ${minDate.toISOString().split('T')[0]}`);
        console.log(`   Latest:   ${maxDate.toISOString().split('T')[0]}`);
      }
    }
    
    const dbDates = db.exec(`
      SELECT 
        MIN(voucher_date) as min_date,
        MAX(voucher_date) as max_date
      FROM vouchers
    `);
    if (dbDates.length > 0 && dbDates[0].values.length > 0) {
      const [minDate, maxDate] = dbDates[0].values[0];
      console.log(`\nDatabase Date Range:`);
      console.log(`   Earliest: ${minDate}`);
      console.log(`   Latest:   ${maxDate}`);
    }
  }

  // 4. Sample Data Comparison
  console.log('\n\n🔬 SAMPLE DATA VERIFICATION');
  console.log('-'.repeat(100));
  
  if (fs.existsSync(inv1Path)) {
    const inv1Content = fs.readFileSync(inv1Path, 'utf-8');
    const inv1Parsed = Papa.parse(inv1Content, { header: true, skipEmptyLines: true });
    
    // Get first 5 transactions from CSV
    const sampleTransactions = inv1Parsed.data.slice(0, 5);
    
    console.log('First 5 transactions from CSV:');
    sampleTransactions.forEach((row, idx) => {
      console.log(`\n${idx + 1}. TR_No: ${row.TR_No}`);
      console.log(`   Amount: ${row.Amount}`);
      console.log(`   VType: ${row.VType} (${row.VType === '101' ? 'Credit' : row.VType === '102' ? 'Debit' : 'Journal'})`);
      console.log(`   Account: ${row.Account_Party}`);
      console.log(`   Narration: ${row.Narration}`);
    });
    
    // Check if these exist in database
    console.log('\n\nChecking if these transactions exist in database...');
    const firstTrNo = sampleTransactions[0].TR_No;
    const lastTrNo = sampleTransactions[4].TR_No;
    
    const dbCheck = db.exec(`
      SELECT COUNT(*) as count 
      FROM vouchers 
      WHERE narration LIKE '%TR_No: ${firstTrNo}%' 
         OR narration LIKE '%TR_No: ${lastTrNo}%'
    `);
    
    if (dbCheck.length > 0 && dbCheck[0].values.length > 0) {
      const found = dbCheck[0].values[0][0];
      console.log(`Found ${found} matching vouchers in database`);
    }
  }

  // 5. Summary
  console.log('\n\n📋 SUMMARY');
  console.log('='.repeat(100));
  
  const totalAccounts = db.exec(`SELECT COUNT(*) FROM accounts WHERE is_active = 1`);
  const totalVouchers = db.exec(`SELECT COUNT(*) FROM vouchers`);
  const totalEntries = db.exec(`SELECT COUNT(*) FROM voucher_entries`);
  
  console.log(`Total Active Accounts: ${totalAccounts[0].values[0][0]}`);
  console.log(`Total Vouchers:        ${totalVouchers[0].values[0][0]}`);
  console.log(`Total Entries:         ${totalEntries[0].values[0][0]}`);
  
  console.log('\n' + '='.repeat(100));

  db.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});

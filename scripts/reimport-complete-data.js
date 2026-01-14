/**
 * Fresh Migration Script
 * Systematically imports all data from CSV with proper double-entry accounting
 */
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const initSqlJs = require('sql.js');

const APP_DATA_PATH = path.join(__dirname, '..', 'app-data');
const DB_PATH = path.join(APP_DATA_PATH, 'database.db');
const CSV_PATH = path.join(__dirname, '..', 'exported_csv');

function loadCSV(filename) {
  const filePath = path.join(CSV_PATH, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return Papa.parse(content, { header: true, skipEmptyLines: true }).data;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    const m = parseInt(month), d = parseInt(day), y = parseInt(year);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

async function main() {
  console.log('🚀 FRESH DATA MIGRATION\n');
  console.log('='.repeat(100));

  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(dbBuffer);

  try {
    // Step 0: Reset opening balances on accounts so that balances are driven purely by vouchers
    // This prevents double-counting when legacy opening balances were previously stored on accounts
    console.log('\n🧹 Step 0: Resetting account opening balances...');
    db.run(`UPDATE accounts SET opening_balance = 0, opening_balance_type = NULL`);
    console.log('   ✓ Opening balances reset');

    // Step 1: Clear existing vouchers
    console.log('\n🗑️  Step 1: Clearing existing vouchers...');
    db.run('DELETE FROM voucher_entries');
    db.run('DELETE FROM vouchers');
    db.run('DELETE FROM sqlite_sequence WHERE name IN ("vouchers", "voucher_entries")');
    console.log('   ✓ Cleared');

    // Step 2: Load mappings
    console.log('\n📋 Step 2: Loading mappings...');
    const ac = loadCSV('AC.csv');
    const inv1 = loadCSV('Inv1.csv');
    const t1 = loadCSV('T1.csv');

    const caToCode = {};
    ac.forEach(row => {
      if (row.CA && row.PRTCODE) caToCode[row.CA] = row.PRTCODE;
    });

    const dateMap = {};
    t1.forEach(row => {
      if (row.TR_No && row.TR_Date) dateMap[row.TR_No] = parseDate(row.TR_Date);
    });

    // Load database accounts
    const accountMap = {};
    const accounts = db.exec(`SELECT account_id, account_code, account_name FROM accounts WHERE is_active = 1`);
    if (accounts.length > 0) {
      accounts[0].values.forEach(([id, code, name]) => {
        if (code) accountMap[code] = { id, name };
      });
    }

    // Find Cash account
    let cashAccount = Object.values(accountMap).find(a => 
      a.name.toLowerCase() === 'cash in hand' || a.name.toLowerCase() === 'cash'
    );
    if (!cashAccount) {
      cashAccount = Object.values(accountMap).find(a => a.name.toLowerCase().includes('cash'));
    }
    
    if (!cashAccount) {
      console.error('❌ No Cash account found!');
      return;
    }
    console.log(`   Cash Account: ${cashAccount.name} (ID: ${cashAccount.id})`);

    // Find or create Opening Balance Equity account
    let obeAccount = Object.values(accountMap).find(a => 
      a.name.toLowerCase().includes('opening balance')
    );
    if (!obeAccount) {
      db.run(`INSERT INTO accounts (account_code, account_name, account_type, is_active) VALUES ('99999999999', 'Opening Balance Equity', 'Equity', 1)`);
      const result = db.exec('SELECT last_insert_rowid()');
      obeAccount = { id: result[0].values[0][0], name: 'Opening Balance Equity' };
      accountMap['99999999999'] = obeAccount;
      console.log('   ✓ Created Opening Balance Equity account');
    }

    console.log(`   Accounts loaded: ${Object.keys(accountMap).length}`);
    console.log(`   Transactions to process: ${inv1.length}`);

    // Step 3: Group transactions by TR_No
    console.log('\n📊 Step 3: Grouping transactions...');
    const trGroups = {};
    inv1.forEach(row => {
      if (!row.TR_No) return;
      if (!trGroups[row.TR_No]) trGroups[row.TR_No] = [];
      trGroups[row.TR_No].push(row);
    });
    console.log(`   Transaction groups: ${Object.keys(trGroups).length}`);

    // Step 4: Process each transaction group
    console.log('\n📝 Step 4: Creating vouchers...');
    
    let created = 0;
    let errors = 0;
    const errorLog = [];
    const voucherCounters = { DBV: {}, CRV: {}, JRN: {} };

    function getNextVoucherNumber(prefix, year) {
      if (!voucherCounters[prefix][year]) voucherCounters[prefix][year] = 0;
      voucherCounters[prefix][year]++;
      return `${prefix}-${year}-${String(voucherCounters[prefix][year]).padStart(5, '0')}`;
    }

    for (const [trNo, entries] of Object.entries(trGroups)) {
      try {
        const firstEntry = entries[0];
        const vtype = firstEntry.VType;
        const date = dateMap[trNo] || (vtype === '100' ? '2005-01-01' : '2005-07-01');
        const year = new Date(date).getFullYear();

        // Determine voucher type and prefix
        let voucherType, prefix;
        if (vtype === '100') {
          voucherType = 'Journal'; prefix = 'JRN';
        } else if (vtype === '101') {
          voucherType = 'Credit'; prefix = 'CRV';
        } else if (vtype === '102') {
          voucherType = 'Debit'; prefix = 'DBV';
        } else {
          voucherType = 'Journal'; prefix = 'JRN';
        }

        // Calculate total amount
        let totalAmount = 0;
        entries.forEach(e => {
          totalAmount += Math.abs(parseFloat(e.Amount) || 0);
        });

        // Build narration
        const narration = `${firstEntry.Narration || ''} (TR_No: ${trNo})`.trim();
        const narrationUrdu = firstEntry.UNarration || null;

        // Create voucher
        const voucherNumber = getNextVoucherNumber(prefix, year);
        db.run(`
          INSERT INTO vouchers (voucher_number, voucher_type, voucher_date, narration, narration_urdu, total_amount, is_posted)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [voucherNumber, voucherType, date, narration, narrationUrdu, totalAmount]);
        
        const voucherId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

        // Create entries based on VType
        if (vtype === '100') {
          // Opening Balance: Single entry against Opening Balance Equity
          for (const entry of entries) {
            const ca = entry.Account_Party;
            const code = caToCode[ca];
            const account = code ? accountMap[code] : null;
            
            if (!account) {
              errorLog.push(`TR_No ${trNo}: Account CA ${ca} not found`);
              continue;
            }

            const amount = Math.abs(parseFloat(entry.Amount) || 0);
            const isNegative = parseFloat(entry.Amount) < 0;

            if (isNegative) {
              // Credit balance: Debit OBE, Credit Account
              db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, 0)`,
                [voucherId, obeAccount.id, amount]);
              db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, 0, ?)`,
                [voucherId, account.id, amount]);
            } else {
              // Debit balance: Debit Account, Credit OBE
              db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, 0)`,
                [voucherId, account.id, amount]);
              db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, 0, ?)`,
                [voucherId, obeAccount.id, amount]);
            }
          }
        } else if (vtype === '101') {
          // VType 101 "Received Cash" - Money received FROM this account
          // The account should be CREDITED (money going out of account)
          // Cash should be DEBITED (money coming into cash)
          for (const entry of entries) {
            const ca = entry.Account_Party;
            const code = caToCode[ca];
            const account = code ? accountMap[code] : null;
            
            if (!account) {
              errorLog.push(`TR_No ${trNo}: Account CA ${ca} not found`);
              continue;
            }

            const amount = Math.abs(parseFloat(entry.Amount) || 0);
            
            // Debit Cash
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, 0)`,
              [voucherId, cashAccount.id, amount]);
            // Credit Account
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, 0, ?)`,
              [voucherId, account.id, amount]);
          }
        } else if (vtype === '102') {
          // VType 102 "Payment in Cash" - Money paid TO this account
          // The account should be DEBITED (money coming into account)
          // Cash should be CREDITED (money going out of cash)
          for (const entry of entries) {
            const ca = entry.Account_Party;
            const code = caToCode[ca];
            const account = code ? accountMap[code] : null;
            
            if (!account) {
              errorLog.push(`TR_No ${trNo}: Account CA ${ca} not found`);
              continue;
            }

            const amount = Math.abs(parseFloat(entry.Amount) || 0);
            
            // Debit Account
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, 0)`,
              [voucherId, account.id, amount]);
            // Credit Cash
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, 0, ?)`,
              [voucherId, cashAccount.id, amount]);
          }
        } else if (vtype === '203') {
          // Bank Payment: Debit Account, Credit Bank (use first bank account or cash)
          for (const entry of entries) {
            const ca = entry.Account_Party;
            const code = caToCode[ca];
            const account = code ? accountMap[code] : null;
            
            if (!account) {
              errorLog.push(`TR_No ${trNo}: Account CA ${ca} not found`);
              continue;
            }

            const amount = Math.abs(parseFloat(entry.Amount) || 0);
            
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, 0)`,
              [voucherId, account.id, amount]);
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, 0, ?)`,
              [voucherId, cashAccount.id, amount]);
          }
        } else if (vtype === '204') {
          // Bank Receipt: Debit Bank, Credit Account
          for (const entry of entries) {
            const ca = entry.Account_Party;
            const code = caToCode[ca];
            const account = code ? accountMap[code] : null;
            
            if (!account) {
              errorLog.push(`TR_No ${trNo}: Account CA ${ca} not found`);
              continue;
            }

            const amount = Math.abs(parseFloat(entry.Amount) || 0);
            
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, 0)`,
              [voucherId, cashAccount.id, amount]);
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, 0, ?)`,
              [voucherId, account.id, amount]);
          }
        } else {
          // Journal and others: Debit Account, Credit Opening Balance Equity (as suspense)
          for (const entry of entries) {
            const ca = entry.Account_Party;
            const code = caToCode[ca];
            const account = code ? accountMap[code] : null;
            
            if (!account) {
              errorLog.push(`TR_No ${trNo}: Account CA ${ca} not found`);
              continue;
            }

            const amount = Math.abs(parseFloat(entry.Amount) || 0);
            
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, 0)`,
              [voucherId, account.id, amount]);
            db.run(`INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount) VALUES (?, ?, 0, ?)`,
              [voucherId, obeAccount.id, amount]);
          }
        }

        created++;
        if (created % 1000 === 0) {
          console.log(`   Created ${created} vouchers...`);
        }
      } catch (err) {
        errors++;
        errorLog.push(`TR_No ${trNo}: ${err.message}`);
      }
    }

    console.log(`\n✅ Created: ${created} vouchers`);
    console.log(`❌ Errors: ${errors}`);

    if (errorLog.length > 0 && errorLog.length <= 20) {
      console.log('\n⚠️  Error Details:');
      errorLog.slice(0, 20).forEach(err => console.log(`   ${err}`));
    }

    // Step 5: Verify balance
    console.log('\n📊 Step 5: Verifying balance...');
    const totalDebits = db.exec('SELECT SUM(debit_amount) FROM voucher_entries')[0].values[0][0];
    const totalCredits = db.exec('SELECT SUM(credit_amount) FROM voucher_entries')[0].values[0][0];
    const diff = Math.abs(totalDebits - totalCredits);
    
    console.log(`   Total Debits:  ${Math.round(totalDebits).toLocaleString()}`);
    console.log(`   Total Credits: ${Math.round(totalCredits).toLocaleString()}`);
    console.log(`   Difference:    ${Math.round(diff).toLocaleString()}`);
    console.log(`   ${diff < 1 ? '✅ BALANCED' : '❌ NOT BALANCED'}`);

    // Save database
    console.log('\n💾 Saving database...');
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('✅ Database saved');

    // Final stats
    const voucherCount = db.exec('SELECT COUNT(*) FROM vouchers')[0].values[0][0];
    const entryCount = db.exec('SELECT COUNT(*) FROM voucher_entries')[0].values[0][0];
    
    console.log('\n📊 Final Statistics:');
    console.log(`   Vouchers: ${voucherCount}`);
    console.log(`   Entries:  ${entryCount}`);

    console.log('\n' + '='.repeat(100));
    console.log('✅ Migration completed!');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    db.close();
  }
}

main();

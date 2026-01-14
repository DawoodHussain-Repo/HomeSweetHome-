const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

class AppDatabase {
  constructor(appDataPath) {
    this.appDataPath = appDataPath;
    this.dbPath = path.join(appDataPath, 'database.db');
    this.db = null;
    this.SQL = null;
    this._inTransaction = false;
  }

  async initialize() {
    // Ensure app-data directory exists
    if (!fs.existsSync(this.appDataPath)) {
      fs.mkdirSync(this.appDataPath, { recursive: true });
    }

    // Ensure legacy-data directory exists
    const legacyDataPath = path.join(this.appDataPath, '..', 'legacy-data');
    if (!fs.existsSync(legacyDataPath)) {
      fs.mkdirSync(legacyDataPath, { recursive: true });
    }

    // Initialize SQL.js
    this.SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
    }

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');

    // Create tables
    this.createTables();
    this.seedDefaultData();
    
    // Save database
    this.save();
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  createTables() {
    // Company info table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS company_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name TEXT DEFAULT 'My Company',
        address TEXT,
        phone TEXT,
        email TEXT,
        tax_id TEXT,
        financial_year_start TEXT DEFAULT '04-01',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Accounts table - Chart of Accounts
    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_code TEXT UNIQUE,
        account_name TEXT NOT NULL,
        account_name_urdu TEXT,
        account_type TEXT NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Income', 'Expense', 'Equity')),
        parent_account_id INTEGER,
        opening_balance REAL DEFAULT 0,
        opening_balance_type TEXT CHECK (opening_balance_type IN ('Debit', 'Credit')),
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_account_id) REFERENCES accounts(account_id)
      )
    `);
    
    // Add Urdu columns to existing accounts table if they don't exist
    try {
      this.db.run(`ALTER TABLE accounts ADD COLUMN account_name_urdu TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }

    // Vouchers table - Transaction headers
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vouchers (
        voucher_id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_number TEXT UNIQUE NOT NULL,
        voucher_type TEXT NOT NULL CHECK (voucher_type IN ('Debit', 'Credit', 'Journal')),
        voucher_date TEXT NOT NULL,
        narration TEXT,
        narration_urdu TEXT,
        total_amount REAL NOT NULL,
        is_posted INTEGER DEFAULT 1,
        legacy_raw_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (legacy_raw_id) REFERENCES legacy_raw_records(raw_id)
      )
    `);
    
    // Add Urdu columns to existing vouchers table if they don't exist
    try {
      this.db.run(`ALTER TABLE vouchers ADD COLUMN narration_urdu TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }

    // Voucher entries table - Transaction lines (double-entry)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS voucher_entries (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        debit_amount REAL DEFAULT 0,
        credit_amount REAL DEFAULT 0,
        narration TEXT,
        narration_urdu TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(account_id),
        CHECK (
          (debit_amount > 0 AND credit_amount = 0) OR 
          (credit_amount > 0 AND debit_amount = 0) OR
          (debit_amount = 0 AND credit_amount = 0)
        )
      )
    `);
    
    // Add Urdu columns to existing voucher_entries table if they don't exist
    try {
      this.db.run(`ALTER TABLE voucher_entries ADD COLUMN narration_urdu TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }

    // Legacy import batches table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS legacy_import_batches (
        batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_file TEXT,
        source_type TEXT CHECK (source_type IN ('CSV', 'Excel', 'JSON', 'Manual')),
        total_records INTEGER DEFAULT 0,
        processed_records INTEGER DEFAULT 0,
        failed_records INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'normalized', 'validated', 'posted', 'failed')),
        imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      )
    `);

    // Legacy raw records table - stores original data as-is
    this.db.run(`
      CREATE TABLE IF NOT EXISTS legacy_raw_records (
        raw_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        raw_payload TEXT NOT NULL,
        detected_date TEXT,
        detected_amount REAL,
        detected_debit_account TEXT,
        detected_credit_account TEXT,
        detected_narration TEXT,
        confidence_score REAL DEFAULT 0,
        status TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'normalized', 'mapped', 'validated', 'posted', 'failed', 'skipped')),
        validation_errors TEXT,
        warnings TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES legacy_import_batches(batch_id) ON DELETE CASCADE
      )
    `);

    // Legacy mapping rules table - for fuzzy matching account names
    this.db.run(`
      CREATE TABLE IF NOT EXISTS legacy_mapping_rules (
        rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
        legacy_text_pattern TEXT NOT NULL,
        mapped_account_id INTEGER NOT NULL,
        priority INTEGER DEFAULT 0,
        auto_apply INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapped_account_id) REFERENCES accounts(account_id)
      )
    `);

    // Migration audit log table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS migration_audit_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        raw_id INTEGER,
        action_taken TEXT NOT NULL,
        details TEXT,
        warnings TEXT,
        final_voucher_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES legacy_import_batches(batch_id),
        FOREIGN KEY (raw_id) REFERENCES legacy_raw_records(raw_id),
        FOREIGN KEY (final_voucher_id) REFERENCES vouchers(voucher_id)
      )
    `);

    // Create indexes for performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(voucher_date)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(voucher_type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_voucher_entries_voucher ON voucher_entries(voucher_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_voucher_entries_account ON voucher_entries(account_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_legacy_raw_batch ON legacy_raw_records(batch_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_legacy_raw_status ON legacy_raw_records(status)`);
  }

  seedDefaultData() {
    // Check if company info exists
    const companyExists = this.db.exec('SELECT COUNT(*) as count FROM company_info');
    if (companyExists[0]?.values[0][0] === 0) {
      this.db.run(`INSERT INTO company_info (id, company_name) VALUES (1, 'My Company')`);
    }

    // Check if default accounts exist
    const accountsExist = this.db.exec('SELECT COUNT(*) as count FROM accounts');
    if (accountsExist[0]?.values[0][0] === 0) {
      this.seedDefaultAccounts();
    }
  }

  seedDefaultAccounts() {
    const defaultAccounts = [
      // Assets
      { code: '1000', name: 'Cash', type: 'Asset' },
      { code: '1010', name: 'Petty Cash', type: 'Asset' },
      { code: '1100', name: 'Bank Account', type: 'Asset' },
      { code: '1200', name: 'Accounts Receivable', type: 'Asset' },
      { code: '1300', name: 'Inventory', type: 'Asset' },
      { code: '1400', name: 'Prepaid Expenses', type: 'Asset' },
      { code: '1500', name: 'Fixed Assets', type: 'Asset' },
      { code: '1510', name: 'Accumulated Depreciation', type: 'Asset' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'Liability' },
      { code: '2100', name: 'Accrued Expenses', type: 'Liability' },
      { code: '2200', name: 'Short-term Loans', type: 'Liability' },
      { code: '2300', name: 'Long-term Loans', type: 'Liability' },
      { code: '2400', name: 'Tax Payable', type: 'Liability' },
      
      // Equity
      { code: '3000', name: "Owner's Capital", type: 'Equity' },
      { code: '3100', name: 'Retained Earnings', type: 'Equity' },
      { code: '3200', name: 'Drawings', type: 'Equity' },
      
      // Income
      { code: '4000', name: 'Sales Revenue', type: 'Income' },
      { code: '4100', name: 'Service Revenue', type: 'Income' },
      { code: '4200', name: 'Interest Income', type: 'Income' },
      { code: '4300', name: 'Other Income', type: 'Income' },
      
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
      { code: '5100', name: 'Salaries & Wages', type: 'Expense' },
      { code: '5200', name: 'Rent Expense', type: 'Expense' },
      { code: '5300', name: 'Utilities Expense', type: 'Expense' },
      { code: '5400', name: 'Office Supplies', type: 'Expense' },
      { code: '5500', name: 'Depreciation Expense', type: 'Expense' },
      { code: '5600', name: 'Insurance Expense', type: 'Expense' },
      { code: '5700', name: 'Interest Expense', type: 'Expense' },
      { code: '5800', name: 'Bank Charges', type: 'Expense' },
      { code: '5900', name: 'Miscellaneous Expense', type: 'Expense' }
    ];

    for (const account of defaultAccounts) {
      this.db.run(
        `INSERT INTO accounts (account_code, account_name, account_type) VALUES (?, ?, ?)`,
        [account.code, account.name, account.type]
      );
    }
  }

  // Helper to convert sql.js result to array of objects
  resultToObjects(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  // Get single row as object
  getOne(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = values[i];
      });
      stmt.free();
      return obj;
    }
    stmt.free();
    return null;
  }

  // Get all rows as array of objects
  getAll(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = values[i];
      });
      results.push(obj);
    }
    stmt.free();
    return results;
  }

  // Run a statement (INSERT, UPDATE, DELETE)
  run(sql, params = []) {
    this.db.run(sql, params);
    const changes = this.db.getRowsModified();
    const lastId = this.getOne('SELECT last_insert_rowid() as id');
    // Don't save if we're in a transaction
    if (!this._inTransaction) {
      this.save();
    }
    return { changes, lastInsertRowid: lastId?.id };
  }

  // Execute raw SQL
  exec(sql) {
    this.db.exec(sql);
    // Don't save if we're in a transaction
    if (!this._inTransaction) {
      this.save();
    }
  }

  getCompanyInfo() {
    return this.getOne('SELECT * FROM company_info WHERE id = 1');
  }

  updateCompanyInfo(data) {
    this.run(`
      UPDATE company_info SET
        company_name = ?,
        address = ?,
        phone = ?,
        email = ?,
        tax_id = ?,
        financial_year_start = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      data.company_name,
      data.address,
      data.phone,
      data.email,
      data.tax_id,
      data.financial_year_start
    ]);
    return { success: true };
  }

  // Transaction wrapper for data integrity
  transaction(fn) {
    this._inTransaction = true;
    try {
      this.db.run('BEGIN TRANSACTION');
      const result = fn();
      this.db.run('COMMIT');
      this._inTransaction = false;
      this.save();
      return result;
    } catch (error) {
      this._inTransaction = false;
      try {
        this.db.run('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors if no transaction is active
      }
      throw error;
    }
  }

  close() {
    if (this.db) {
      try {
        this.save();
      } catch (e) {
        // Ignore save errors during close
      }
      try {
        this.db.close();
      } catch (e) {
        // Ignore close errors
      }
      this.db = null;
    }
  }

  backup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupPath = path.join(this.appDataPath, `backup-${timestamp}.db`);
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(backupPath, buffer);
      return { success: true, path: backupPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  exportCSV() {
    try {
      const exportPath = path.join(this.appDataPath, '..', 'exported_csv');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      // Export accounts
      const accounts = this.getAll('SELECT * FROM accounts ORDER BY account_code');
      if (accounts.length > 0) {
        const accountsCsv = this.arrayToCSV(accounts);
        fs.writeFileSync(path.join(exportPath, 'accounts.csv'), accountsCsv);
      }

      // Export vouchers
      const vouchers = this.getAll('SELECT * FROM vouchers ORDER BY voucher_date DESC');
      if (vouchers.length > 0) {
        const vouchersCsv = this.arrayToCSV(vouchers);
        fs.writeFileSync(path.join(exportPath, 'vouchers.csv'), vouchersCsv);
      }

      // Export voucher entries
      const entries = this.getAll(`
        SELECT ve.*, a.account_name, v.voucher_number, v.voucher_date
        FROM voucher_entries ve
        JOIN accounts a ON ve.account_id = a.account_id
        JOIN vouchers v ON ve.voucher_id = v.voucher_id
        ORDER BY v.voucher_date DESC, ve.voucher_id, ve.entry_id
      `);
      if (entries.length > 0) {
        const entriesCsv = this.arrayToCSV(entries);
        fs.writeFileSync(path.join(exportPath, 'voucher_entries.csv'), entriesCsv);
      }

      return { success: true, path: exportPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  arrayToCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

module.exports = AppDatabase;

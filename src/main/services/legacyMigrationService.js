/**
 * Legacy Migration Service - Handles import of legacy/unstructured data
 * Multi-phase pipeline: Ingest -> Normalize -> Map -> Validate -> Post
 */
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const Fuse = require('fuse.js');

class LegacyMigrationService {
  constructor(db, appDataPath) {
    this.db = db;
    this.legacyDataPath = path.join(appDataPath, '..', 'legacy-data');
  }

  // Scan legacy-data folder for importable files
  scanLegacyFiles() {
    if (!fs.existsSync(this.legacyDataPath)) {
      fs.mkdirSync(this.legacyDataPath, { recursive: true });
      return [];
    }

    const files = [];
    const entries = fs.readdirSync(this.legacyDataPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        let sourceType = null;
        
        if (ext === '.csv') sourceType = 'CSV';
        else if (ext === '.json') sourceType = 'JSON';
        else if (['.xlsx', '.xls'].includes(ext)) sourceType = 'Excel';
        
        if (sourceType) {
          const filePath = path.join(this.legacyDataPath, entry.name);
          const stats = fs.statSync(filePath);
          files.push({
            name: entry.name,
            path: filePath,
            sourceType,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    }
    
    return files;
  }

  // Phase 1: Ingest - Import raw data into staging tables
  importBatch(filePath, sourceType) {
    try {
      let rawRecords = [];
      
      if (sourceType === 'CSV') {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
        rawRecords = parsed.data.map(row => JSON.stringify(row));
      } else if (sourceType === 'JSON') {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        rawRecords = Array.isArray(data) ? data.map(r => JSON.stringify(r)) : [JSON.stringify(data)];
      } else {
        return { success: false, error: 'Unsupported file type. Use CSV or JSON.' };
      }

      const result = this.db.transaction(() => {
        // Create batch record
        const batchResult = this.db.run(`
          INSERT INTO legacy_import_batches (source_file, source_type, total_records, status)
          VALUES (?, ?, ?, 'pending')
        `, [path.basename(filePath), sourceType, rawRecords.length]);
        
        const batchId = batchResult.lastInsertRowid;

        // Insert raw records
        for (const payload of rawRecords) {
          this.db.run(`
            INSERT INTO legacy_raw_records (batch_id, raw_payload, status)
            VALUES (?, ?, 'raw')
          `, [batchId, payload]);
        }

        // Log the import
        this.logAudit(batchId, null, 'BATCH_IMPORTED', `Imported ${rawRecords.length} records from ${path.basename(filePath)}`);

        return { batch_id: batchId, records_imported: rawRecords.length };
      });

      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getBatches() {
    return this.db.getAll(`SELECT * FROM legacy_import_batches ORDER BY imported_at DESC`);
  }

  getRawRecords(batchId) {
    return this.db.getAll(`SELECT * FROM legacy_raw_records WHERE batch_id = ? ORDER BY raw_id`, [batchId]);
  }

  // Phase 2: Normalize - Attempt to parse and structure raw data
  normalizeRecords(batchId) {
    const records = this.db.getAll(`
      SELECT * FROM legacy_raw_records WHERE batch_id = ? AND status = 'raw'
    `, [batchId]);

    let normalized = 0;
    let failed = 0;

    for (const record of records) {
      try {
        const payload = JSON.parse(record.raw_payload);
        const normalized_data = this.attemptNormalization(payload);
        
        this.db.run(`
          UPDATE legacy_raw_records SET
            detected_date = ?,
            detected_amount = ?,
            detected_debit_account = ?,
            detected_credit_account = ?,
            detected_narration = ?,
            confidence_score = ?,
            status = 'normalized',
            warnings = ?
          WHERE raw_id = ?
        `, [
          normalized_data.date,
          normalized_data.amount,
          normalized_data.debit_account,
          normalized_data.credit_account,
          normalized_data.narration,
          normalized_data.confidence,
          normalized_data.warnings ? JSON.stringify(normalized_data.warnings) : null,
          record.raw_id
        ]);
        
        normalized++;
      } catch (error) {
        this.db.run(`
          UPDATE legacy_raw_records SET
            status = 'failed',
            validation_errors = ?
          WHERE raw_id = ?
        `, [JSON.stringify([error.message]), record.raw_id]);
        failed++;
      }
    }

    // Update batch status
    this.db.run(`
      UPDATE legacy_import_batches SET
        status = 'normalized',
        processed_records = ?,
        failed_records = ?
      WHERE batch_id = ?
    `, [normalized, failed, batchId]);

    this.logAudit(batchId, null, 'BATCH_NORMALIZED', `Normalized ${normalized} records, ${failed} failed`);

    return { success: true, normalized, failed };
  }

  attemptNormalization(payload) {
    const warnings = [];
    let confidence = 0;

    // Try to detect date
    let date = null;
    const dateFields = ['date', 'Date', 'DATE', 'voucher_date', 'transaction_date', 'txn_date'];
    for (const field of dateFields) {
      if (payload[field]) {
        date = this.parseDate(payload[field]);
        if (date) {
          confidence += 0.25;
          break;
        }
      }
    }
    if (!date) {
      warnings.push('Could not detect date');
    }

    // Try to detect amount
    let amount = null;
    const amountFields = ['amount', 'Amount', 'AMOUNT', 'value', 'total', 'debit', 'credit'];
    for (const field of amountFields) {
      if (payload[field] !== undefined) {
        amount = parseFloat(String(payload[field]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(amount)) {
          confidence += 0.25;
          break;
        }
      }
    }
    if (!amount) {
      warnings.push('Could not detect amount');
    }

    // Try to detect accounts
    let debitAccount = null;
    let creditAccount = null;
    const debitFields = ['debit_account', 'dr_account', 'from_account', 'paid_to', 'expense'];
    const creditFields = ['credit_account', 'cr_account', 'to_account', 'received_from', 'income'];

    for (const field of debitFields) {
      if (payload[field]) {
        debitAccount = String(payload[field]).trim();
        confidence += 0.125;
        break;
      }
    }

    for (const field of creditFields) {
      if (payload[field]) {
        creditAccount = String(payload[field]).trim();
        confidence += 0.125;
        break;
      }
    }

    // Try generic account field
    if (!debitAccount && !creditAccount) {
      const accountFields = ['account', 'Account', 'account_name', 'ledger'];
      for (const field of accountFields) {
        if (payload[field]) {
          debitAccount = String(payload[field]).trim();
          warnings.push('Only one account detected, manual mapping required');
          confidence += 0.1;
          break;
        }
      }
    }

    // Try to detect narration
    let narration = null;
    const narrationFields = ['narration', 'description', 'particulars', 'memo', 'notes', 'remarks'];
    for (const field of narrationFields) {
      if (payload[field]) {
        narration = String(payload[field]).trim();
        confidence += 0.125;
        break;
      }
    }

    // If no specific fields found, create narration from all fields
    if (!narration) {
      narration = Object.entries(payload)
        .filter(([k, v]) => v && typeof v === 'string')
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
    }

    return {
      date,
      amount,
      debit_account: debitAccount,
      credit_account: creditAccount,
      narration,
      confidence: Math.min(confidence, 1),
      warnings: warnings.length > 0 ? warnings : null
    };
  }

  parseDate(value) {
    if (!value) return null;
    
    const str = String(value).trim();
    
    // Handle M/D/YYYY format (common in legacy data)
    const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1]);
      const day = parseInt(mdyMatch[2]);
      const year = parseInt(mdyMatch[3]);
      
      // Validate date components
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/,  // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/,  // DD-MM-YYYY
      /^(\d{4})\/(\d{2})\/(\d{2})$/,  // YYYY/MM/DD
    ];

    for (const format of formats) {
      const match = str.match(format);
      if (match) {
        try {
          // For DD/MM/YYYY format, rearrange to YYYY-MM-DD
          if (format.source.includes('\\/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
              const testDate = new Date(parts[2], parts[1] - 1, parts[0]);
              if (!isNaN(testDate.getTime())) {
                return testDate.toISOString().split('T')[0];
              }
            }
          }
          
          const date = new Date(str);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
    }

    // Try native Date parsing as last resort
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}

    return null;
  }

  // Get mapping rules
  getMappingRules() {
    return this.db.getAll(`
      SELECT mr.*, a.account_name
      FROM legacy_mapping_rules mr
      JOIN accounts a ON mr.mapped_account_id = a.account_id
      ORDER BY mr.priority DESC
    `);
  }

  // Create mapping rule
  createMappingRule(data) {
    const result = this.db.run(`
      INSERT INTO legacy_mapping_rules (legacy_text_pattern, mapped_account_id, priority, auto_apply)
      VALUES (?, ?, ?, ?)
    `, [
      data.legacy_text_pattern,
      data.mapped_account_id,
      data.priority || 0,
      data.auto_apply !== false ? 1 : 0
    ]);
    return { success: true, rule_id: result.lastInsertRowid };
  }

  // Phase 3 & 4: Validate batch - Apply mappings and validate
  validateBatch(batchId) {
    const records = this.db.getAll(`
      SELECT * FROM legacy_raw_records 
      WHERE batch_id = ? AND status IN ('normalized', 'mapped')
    `, [batchId]);

    const accounts = this.db.getAll('SELECT * FROM accounts WHERE is_active = 1');
    const mappingRules = this.getMappingRules();
    
    // Setup fuzzy search for account matching
    const fuse = new Fuse(accounts, {
      keys: ['account_name', 'account_code'],
      threshold: 0.4
    });

    let validated = 0;
    let failed = 0;

    for (const record of records) {
      const errors = [];
      const warnings = record.warnings ? JSON.parse(record.warnings) : [];

      // Validate date
      if (!record.detected_date) {
        errors.push('Missing date');
      }

      // Validate amount
      if (!record.detected_amount || record.detected_amount <= 0) {
        errors.push('Invalid or missing amount');
      }

      // Try to map accounts
      let debitAccountId = null;
      let creditAccountId = null;

      if (record.detected_debit_account) {
        debitAccountId = this.findAccountMatch(record.detected_debit_account, accounts, mappingRules, fuse);
        if (!debitAccountId) {
          warnings.push(`Could not map debit account: ${record.detected_debit_account}`);
        }
      }

      if (record.detected_credit_account) {
        creditAccountId = this.findAccountMatch(record.detected_credit_account, accounts, mappingRules, fuse);
        if (!creditAccountId) {
          warnings.push(`Could not map credit account: ${record.detected_credit_account}`);
        }
      }

      // Check if we have both accounts for a valid voucher
      if (!debitAccountId && !creditAccountId) {
        errors.push('No accounts could be mapped');
      } else if (!debitAccountId || !creditAccountId) {
        warnings.push('Only one account mapped - manual intervention required');
      }

      const status = errors.length > 0 ? 'failed' : 'validated';
      if (status === 'validated') validated++;
      else failed++;

      this.db.run(`
        UPDATE legacy_raw_records SET
          status = ?,
          validation_errors = ?,
          warnings = ?
        WHERE raw_id = ?
      `, [
        status,
        errors.length > 0 ? JSON.stringify(errors) : null,
        warnings.length > 0 ? JSON.stringify(warnings) : null,
        record.raw_id
      ]);
    }

    this.db.run(`
      UPDATE legacy_import_batches SET
        status = 'validated',
        processed_records = ?,
        failed_records = ?
      WHERE batch_id = ?
    `, [validated, failed, batchId]);

    this.logAudit(batchId, null, 'BATCH_VALIDATED', `Validated ${validated} records, ${failed} failed`);

    return { success: true, validated, failed };
  }

  findAccountMatch(text, accounts, mappingRules, fuse) {
    if (!text) return null;

    // First check mapping rules
    for (const rule of mappingRules) {
      if (rule.auto_apply && text.toLowerCase().includes(rule.legacy_text_pattern.toLowerCase())) {
        return rule.mapped_account_id;
      }
    }

    // Try exact match
    const exactMatch = accounts.find(a => 
      a.account_name.toLowerCase() === text.toLowerCase() ||
      a.account_code === text
    );
    if (exactMatch) return exactMatch.account_id;

    // Try fuzzy match
    const fuzzyResults = fuse.search(text);
    if (fuzzyResults.length > 0 && fuzzyResults[0].score < 0.3) {
      return fuzzyResults[0].item.account_id;
    }

    return null;
  }

  // Phase 5: Post batch - Create actual vouchers
  postBatch(batchId) {
    const records = this.db.getAll(`
      SELECT * FROM legacy_raw_records 
      WHERE batch_id = ? AND status = 'validated'
    `, [batchId]);

    const accounts = this.db.getAll('SELECT * FROM accounts WHERE is_active = 1');
    const mappingRules = this.getMappingRules();
    const fuse = new Fuse(accounts, {
      keys: ['account_name', 'account_code'],
      threshold: 0.4
    });

    let posted = 0;
    let failed = 0;

    for (const record of records) {
      try {
        const debitAccountId = this.findAccountMatch(record.detected_debit_account, accounts, mappingRules, fuse);
        const creditAccountId = this.findAccountMatch(record.detected_credit_account, accounts, mappingRules, fuse);

        if (!debitAccountId || !creditAccountId) {
          throw new Error('Account mapping incomplete');
        }

        const result = this.db.transaction(() => {
          // Generate voucher number
          const year = new Date().getFullYear();
          const lastVoucher = this.db.getOne(`
            SELECT voucher_number FROM vouchers 
            WHERE voucher_number LIKE ?
            ORDER BY voucher_id DESC LIMIT 1
          `, [`LGC-${year}-%`]);
          
          let nextNum = 1;
          if (lastVoucher) {
            const parts = lastVoucher.voucher_number.split('-');
            nextNum = parseInt(parts[2]) + 1;
          }
          const voucherNumber = `LGC-${year}-${String(nextNum).padStart(5, '0')}`;

          // Create voucher
          const voucherResult = this.db.run(`
            INSERT INTO vouchers (
              voucher_number, voucher_type, voucher_date, narration, total_amount, legacy_raw_id
            ) VALUES (?, 'Journal', ?, ?, ?, ?)
          `, [
            voucherNumber,
            record.detected_date,
            record.detected_narration || 'Imported from legacy data',
            record.detected_amount,
            record.raw_id
          ]);
          
          const voucherId = voucherResult.lastInsertRowid;

          // Create entries
          this.db.run(`
            INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount)
            VALUES (?, ?, ?, ?)
          `, [voucherId, debitAccountId, record.detected_amount, 0]);
          
          this.db.run(`
            INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount)
            VALUES (?, ?, ?, ?)
          `, [voucherId, creditAccountId, 0, record.detected_amount]);

          return { voucher_id: voucherId, voucher_number: voucherNumber };
        });

        // Update record status
        this.db.run(`UPDATE legacy_raw_records SET status = 'posted' WHERE raw_id = ?`, [record.raw_id]);

        this.logAudit(batchId, record.raw_id, 'RECORD_POSTED', 
          `Created voucher ${result.voucher_number}`, null, result.voucher_id);

        posted++;
      } catch (error) {
        this.db.run(`
          UPDATE legacy_raw_records SET 
            status = 'failed',
            validation_errors = ?
          WHERE raw_id = ?
        `, [JSON.stringify([error.message]), record.raw_id]);

        this.logAudit(batchId, record.raw_id, 'RECORD_FAILED', error.message);
        failed++;
      }
    }

    this.db.run(`
      UPDATE legacy_import_batches SET
        status = 'posted',
        processed_records = ?,
        failed_records = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE batch_id = ?
    `, [posted, failed, batchId]);

    this.logAudit(batchId, null, 'BATCH_POSTED', `Posted ${posted} vouchers, ${failed} failed`);

    return { success: true, posted, failed };
  }

  getAuditLog(batchId) {
    return this.db.getAll(`
      SELECT * FROM migration_audit_log 
      WHERE batch_id = ?
      ORDER BY created_at DESC
    `, [batchId]);
  }

  logAudit(batchId, rawId, action, details, warnings = null, voucherId = null) {
    this.db.run(`
      INSERT INTO migration_audit_log (batch_id, raw_id, action_taken, details, warnings, final_voucher_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [batchId, rawId, action, details, warnings, voucherId]);
  }
}

module.exports = LegacyMigrationService;

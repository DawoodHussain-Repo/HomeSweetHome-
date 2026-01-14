/**
 * Account Service - Handles all account-related operations
 * Implements double-entry accounting principles
 */
class AccountService {
  constructor(db) {
    this.db = db;
  }

  getAllAccounts() {
    return this.db.getAll(`
      SELECT 
        a.*,
        p.account_name as parent_account_name,
        (SELECT COUNT(*) FROM voucher_entries ve WHERE ve.account_id = a.account_id) as transaction_count
      FROM accounts a
      LEFT JOIN accounts p ON a.parent_account_id = p.account_id
      ORDER BY a.account_code, a.account_name
    `);
  }

  getAccountById(id) {
    return this.db.getOne(`
      SELECT 
        a.*,
        p.account_name as parent_account_name
      FROM accounts a
      LEFT JOIN accounts p ON a.parent_account_id = p.account_id
      WHERE a.account_id = ?
    `, [id]);
  }

  getAccountsByType(type) {
    return this.db.getAll(`
      SELECT * FROM accounts 
      WHERE account_type = ? AND is_active = 1
      ORDER BY account_code, account_name
    `, [type]);
  }

  createAccount(data) {
    const result = this.db.run(`
      INSERT INTO accounts (
        account_code, account_name, account_type, parent_account_id,
        opening_balance, opening_balance_type, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.account_code || null,
      data.account_name,
      data.account_type,
      data.parent_account_id || null,
      data.opening_balance || 0,
      data.opening_balance_type || null,
      data.description || null
    ]);
    
    return { success: true, account_id: result.lastInsertRowid };
  }

  updateAccount(id, data) {
    this.db.run(`
      UPDATE accounts SET
        account_code = ?,
        account_name = ?,
        account_type = ?,
        parent_account_id = ?,
        opening_balance = ?,
        opening_balance_type = ?,
        description = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `, [
      data.account_code || null,
      data.account_name,
      data.account_type,
      data.parent_account_id || null,
      data.opening_balance || 0,
      data.opening_balance_type || null,
      data.description || null,
      data.is_active !== undefined ? data.is_active : 1,
      id
    ]);
    
    return { success: true };
  }

  deleteAccount(id) {
    // Check if account has transactions
    const transactionCount = this.db.getOne(`
      SELECT COUNT(*) as count FROM voucher_entries WHERE account_id = ?
    `, [id]);
    
    if (transactionCount && transactionCount.count > 0) {
      return { 
        success: false, 
        error: 'Cannot delete account with existing transactions. Deactivate it instead.' 
      };
    }
    
    // Check if account has child accounts
    const childCount = this.db.getOne(`
      SELECT COUNT(*) as count FROM accounts WHERE parent_account_id = ?
    `, [id]);
    
    if (childCount && childCount.count > 0) {
      return { 
        success: false, 
        error: 'Cannot delete account with child accounts.' 
      };
    }
    
    this.db.run('DELETE FROM accounts WHERE account_id = ?', [id]);
    return { success: true };
  }

  getAccountLedger(accountId, startDate, endDate) {
    const account = this.getAccountById(accountId);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Get opening balance
    let openingBalance = account.opening_balance || 0;
    let openingBalanceType = account.opening_balance_type || 'Debit';

    // Calculate balance before start date
    if (startDate) {
      const priorTransactions = this.db.getOne(`
        SELECT 
          COALESCE(SUM(ve.debit_amount), 0) as total_debit,
          COALESCE(SUM(ve.credit_amount), 0) as total_credit
        FROM voucher_entries ve
        JOIN vouchers v ON ve.voucher_id = v.voucher_id
        WHERE ve.account_id = ? AND v.voucher_date < ? AND v.is_posted = 1
      `, [accountId, startDate]);

      if (priorTransactions) {
        if (openingBalanceType === 'Debit') {
          openingBalance = openingBalance + priorTransactions.total_debit - priorTransactions.total_credit;
        } else {
          openingBalance = openingBalance + priorTransactions.total_credit - priorTransactions.total_debit;
        }
      }
    }

    // Build query for ledger entries
    let query = `
      SELECT 
        v.voucher_id,
        v.voucher_number,
        v.voucher_type,
        v.voucher_date,
        v.narration as voucher_narration,
        ve.debit_amount,
        ve.credit_amount,
        ve.narration as entry_narration
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.voucher_id
      WHERE ve.account_id = ? AND v.is_posted = 1
    `;
    
    const params = [accountId];
    
    if (startDate) {
      query += ' AND v.voucher_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND v.voucher_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY v.voucher_date, v.voucher_id';
    
    const entries = this.db.getAll(query, params);

    // Calculate running balance
    let runningBalance = openingBalance;
    const isDebitNormal = ['Asset', 'Expense'].includes(account.account_type);
    
    const ledgerEntries = entries.map(entry => {
      if (isDebitNormal) {
        runningBalance = runningBalance + entry.debit_amount - entry.credit_amount;
      } else {
        runningBalance = runningBalance + entry.credit_amount - entry.debit_amount;
      }
      
      return {
        ...entry,
        running_balance: runningBalance
      };
    });

    return {
      success: true,
      account,
      opening_balance: openingBalance,
      entries: ledgerEntries,
      closing_balance: runningBalance
    };
  }

  getAccountBalance(accountId) {
    const account = this.getAccountById(accountId);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    const totals = this.db.getOne(`
      SELECT 
        COALESCE(SUM(ve.debit_amount), 0) as total_debit,
        COALESCE(SUM(ve.credit_amount), 0) as total_credit
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.voucher_id
      WHERE ve.account_id = ? AND v.is_posted = 1
    `, [accountId]);

    let balance = account.opening_balance || 0;
    const isDebitNormal = ['Asset', 'Expense'].includes(account.account_type);
    
    if (totals) {
      if (account.opening_balance_type === 'Debit') {
        balance = balance + totals.total_debit - totals.total_credit;
      } else {
        balance = balance + totals.total_credit - totals.total_debit;
      }
    }

    // Adjust sign based on account type
    if (!isDebitNormal && account.opening_balance_type === 'Debit') {
      balance = -balance;
    } else if (isDebitNormal && account.opening_balance_type === 'Credit') {
      balance = -balance;
    }

    return {
      success: true,
      account_id: accountId,
      account_name: account.account_name,
      account_type: account.account_type,
      balance: Math.abs(balance),
      balance_type: balance >= 0 ? (isDebitNormal ? 'Debit' : 'Credit') : (isDebitNormal ? 'Credit' : 'Debit')
    };
  }
}

module.exports = AccountService;

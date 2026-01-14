/**
 * Report Service - Generates accounting reports
 * Trial Balance, Income Statement, Balance Sheet, Ledger Reports
 */
class ReportService {
  constructor(db) {
    this.db = db;
  }

  getDashboardSummary() {
    // Get cash balance
    const cashBalance = this.db.getOne(`
      SELECT 
        a.opening_balance,
        a.opening_balance_type,
        COALESCE(SUM(ve.debit_amount), 0) as total_debit,
        COALESCE(SUM(ve.credit_amount), 0) as total_credit
      FROM accounts a
      LEFT JOIN voucher_entries ve ON a.account_id = ve.account_id
      LEFT JOIN vouchers v ON ve.voucher_id = v.voucher_id AND v.is_posted = 1
      WHERE a.account_name = 'Cash' AND a.account_type = 'Asset'
      GROUP BY a.account_id
    `);

    // Get bank balance
    const bankBalance = this.db.getOne(`
      SELECT 
        a.opening_balance,
        a.opening_balance_type,
        COALESCE(SUM(ve.debit_amount), 0) as total_debit,
        COALESCE(SUM(ve.credit_amount), 0) as total_credit
      FROM accounts a
      LEFT JOIN voucher_entries ve ON a.account_id = ve.account_id
      LEFT JOIN vouchers v ON ve.voucher_id = v.voucher_id AND v.is_posted = 1
      WHERE a.account_name = 'Bank Account' AND a.account_type = 'Asset'
      GROUP BY a.account_id
    `);

    // Get total income (current month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const totalIncome = this.db.getOne(`
      SELECT COALESCE(SUM(ve.credit_amount), 0) as total
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.voucher_id
      JOIN accounts a ON ve.account_id = a.account_id
      WHERE a.account_type = 'Income' 
        AND v.is_posted = 1
        AND v.voucher_date LIKE ?
    `, [`${currentMonth}%`]);

    // Get total expenses (current month)
    const totalExpenses = this.db.getOne(`
      SELECT COALESCE(SUM(ve.debit_amount), 0) as total
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.voucher_id
      JOIN accounts a ON ve.account_id = a.account_id
      WHERE a.account_type = 'Expense' 
        AND v.is_posted = 1
        AND v.voucher_date LIKE ?
    `, [`${currentMonth}%`]);

    // Calculate balances
    const calcBalance = (data) => {
      if (!data) return 0;
      let balance = data.opening_balance || 0;
      if (data.opening_balance_type === 'Credit') {
        balance = -balance;
      }
      return balance + (data.total_debit || 0) - (data.total_credit || 0);
    };

    return {
      cash_balance: calcBalance(cashBalance),
      bank_balance: calcBalance(bankBalance),
      total_income: totalIncome?.total || 0,
      total_expenses: totalExpenses?.total || 0,
      net_profit: (totalIncome?.total || 0) - (totalExpenses?.total || 0)
    };
  }

  getTrialBalance(asOfDate) {
    const dateFilter = asOfDate ? `AND v.voucher_date <= '${asOfDate}'` : '';
    
    const accounts = this.db.getAll(`
      SELECT 
        a.account_id,
        a.account_code,
        a.account_name,
        a.account_type,
        a.opening_balance,
        a.opening_balance_type,
        COALESCE(SUM(ve.debit_amount), 0) as total_debit,
        COALESCE(SUM(ve.credit_amount), 0) as total_credit
      FROM accounts a
      LEFT JOIN voucher_entries ve ON a.account_id = ve.account_id
      LEFT JOIN vouchers v ON ve.voucher_id = v.voucher_id AND v.is_posted = 1 ${dateFilter}
      WHERE a.is_active = 1
      GROUP BY a.account_id
      ORDER BY a.account_code, a.account_name
    `);

    let totalDebit = 0;
    let totalCredit = 0;

    const trialBalanceData = accounts.map(account => {
      let openingBalance = account.opening_balance || 0;
      const isDebitNormal = ['Asset', 'Expense'].includes(account.account_type);
      
      // Calculate net movement
      const netDebit = account.total_debit;
      const netCredit = account.total_credit;
      
      // Calculate closing balance
      let closingBalance;
      if (account.opening_balance_type === 'Debit' || (!account.opening_balance_type && isDebitNormal)) {
        closingBalance = openingBalance + netDebit - netCredit;
      } else {
        closingBalance = -openingBalance + netDebit - netCredit;
      }

      // Determine debit/credit presentation
      let debitBalance = 0;
      let creditBalance = 0;
      
      if (isDebitNormal) {
        if (closingBalance >= 0) {
          debitBalance = closingBalance;
        } else {
          creditBalance = Math.abs(closingBalance);
        }
      } else {
        if (closingBalance <= 0) {
          creditBalance = Math.abs(closingBalance);
        } else {
          debitBalance = closingBalance;
        }
      }

      totalDebit += debitBalance;
      totalCredit += creditBalance;

      return {
        account_id: account.account_id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        debit_balance: debitBalance,
        credit_balance: creditBalance
      };
    }).filter(a => a.debit_balance !== 0 || a.credit_balance !== 0);

    return {
      as_of_date: asOfDate || new Date().toISOString().split('T')[0],
      accounts: trialBalanceData,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
    };
  }

  getIncomeStatement(startDate, endDate) {
    const dateFilter = startDate && endDate 
      ? `AND v.voucher_date BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    // Get income accounts
    const incomeAccounts = this.db.getAll(`
      SELECT 
        a.account_id,
        a.account_code,
        a.account_name,
        COALESCE(SUM(ve.credit_amount), 0) - COALESCE(SUM(ve.debit_amount), 0) as balance
      FROM accounts a
      LEFT JOIN voucher_entries ve ON a.account_id = ve.account_id
      LEFT JOIN vouchers v ON ve.voucher_id = v.voucher_id AND v.is_posted = 1 ${dateFilter}
      WHERE a.account_type = 'Income' AND a.is_active = 1
      GROUP BY a.account_id
      HAVING balance != 0
      ORDER BY a.account_code, a.account_name
    `);

    // Get expense accounts
    const expenseAccounts = this.db.getAll(`
      SELECT 
        a.account_id,
        a.account_code,
        a.account_name,
        COALESCE(SUM(ve.debit_amount), 0) - COALESCE(SUM(ve.credit_amount), 0) as balance
      FROM accounts a
      LEFT JOIN voucher_entries ve ON a.account_id = ve.account_id
      LEFT JOIN vouchers v ON ve.voucher_id = v.voucher_id AND v.is_posted = 1 ${dateFilter}
      WHERE a.account_type = 'Expense' AND a.is_active = 1
      GROUP BY a.account_id
      HAVING balance != 0
      ORDER BY a.account_code, a.account_name
    `);

    const totalIncome = incomeAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      start_date: startDate,
      end_date: endDate,
      income_accounts: incomeAccounts,
      expense_accounts: expenseAccounts,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_profit: netProfit
    };
  }

  getBalanceSheet(asOfDate) {
    const dateFilter = asOfDate ? `AND v.voucher_date <= '${asOfDate}'` : '';

    const getAccountBalances = (type, isDebitNormal) => {
      return this.db.getAll(`
        SELECT 
          a.account_id,
          a.account_code,
          a.account_name,
          a.opening_balance,
          a.opening_balance_type,
          COALESCE(SUM(ve.debit_amount), 0) as total_debit,
          COALESCE(SUM(ve.credit_amount), 0) as total_credit
        FROM accounts a
        LEFT JOIN voucher_entries ve ON a.account_id = ve.account_id
        LEFT JOIN vouchers v ON ve.voucher_id = v.voucher_id AND v.is_posted = 1 ${dateFilter}
        WHERE a.account_type = ? AND a.is_active = 1
        GROUP BY a.account_id
        ORDER BY a.account_code, a.account_name
      `, [type]).map(account => {
        let balance = account.opening_balance || 0;
        if (account.opening_balance_type === 'Credit') {
          balance = -balance;
        }
        balance = balance + account.total_debit - account.total_credit;
        
        if (!isDebitNormal) {
          balance = -balance;
        }
        
        return {
          account_id: account.account_id,
          account_code: account.account_code,
          account_name: account.account_name,
          balance: Math.abs(balance)
        };
      }).filter(a => a.balance !== 0);
    };

    // Get retained earnings (net of all income and expenses)
    const retainedEarnings = this.db.getOne(`
      SELECT 
        COALESCE(SUM(CASE WHEN a.account_type = 'Income' THEN ve.credit_amount - ve.debit_amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN a.account_type = 'Expense' THEN ve.debit_amount - ve.credit_amount ELSE 0 END), 0) as balance
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.voucher_id AND v.is_posted = 1 ${dateFilter}
      JOIN accounts a ON ve.account_id = a.account_id
      WHERE a.account_type IN ('Income', 'Expense')
    `);

    const assets = getAccountBalances('Asset', true);
    const liabilities = getAccountBalances('Liability', false);
    const equity = getAccountBalances('Equity', false);

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0) + (retainedEarnings?.balance || 0);

    return {
      as_of_date: asOfDate || new Date().toISOString().split('T')[0],
      assets,
      liabilities,
      equity,
      retained_earnings: retainedEarnings?.balance || 0,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      total_liabilities_and_equity: totalLiabilities + totalEquity,
      is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    };
  }

  getLedgerReport(accountId, startDate, endDate) {
    const account = this.db.getOne('SELECT * FROM accounts WHERE account_id = ?', [accountId]);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Get opening balance before start date
    let openingBalance = account.opening_balance || 0;
    const isDebitNormal = ['Asset', 'Expense'].includes(account.account_type);
    
    if (account.opening_balance_type === 'Credit') {
      openingBalance = -openingBalance;
    }

    if (startDate) {
      const priorTotals = this.db.getOne(`
        SELECT 
          COALESCE(SUM(ve.debit_amount), 0) as total_debit,
          COALESCE(SUM(ve.credit_amount), 0) as total_credit
        FROM voucher_entries ve
        JOIN vouchers v ON ve.voucher_id = v.voucher_id
        WHERE ve.account_id = ? AND v.voucher_date < ? AND v.is_posted = 1
      `, [accountId, startDate]);

      if (priorTotals) {
        openingBalance += priorTotals.total_debit - priorTotals.total_credit;
      }
    }

    // Get transactions in date range
    let query = `
      SELECT 
        v.voucher_id,
        v.voucher_number,
        v.voucher_type,
        v.voucher_date,
        v.narration,
        ve.debit_amount,
        ve.credit_amount
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
    
    const transactions = this.db.getAll(query, params);

    // Calculate running balance
    let runningBalance = openingBalance;
    const entries = transactions.map(t => {
      runningBalance += t.debit_amount - t.credit_amount;
      return {
        ...t,
        running_balance: runningBalance
      };
    });

    const totalDebit = transactions.reduce((sum, t) => sum + t.debit_amount, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit_amount, 0);

    return {
      success: true,
      account,
      start_date: startDate,
      end_date: endDate,
      opening_balance: openingBalance,
      entries,
      total_debit: totalDebit,
      total_credit: totalCredit,
      closing_balance: runningBalance
    };
  }
}

module.exports = ReportService;

/**
 * Voucher Service - Handles all voucher/transaction operations
 * Enforces double-entry accounting rules
 */
class VoucherService {
  constructor(db) {
    this.db = db;
  }

  getAllVouchers(filters = {}) {
    let query = `
      SELECT 
        v.*,
        GROUP_CONCAT(DISTINCT a.account_name) as accounts_involved
      FROM vouchers v
      LEFT JOIN voucher_entries ve ON v.voucher_id = ve.voucher_id
      LEFT JOIN accounts a ON ve.account_id = a.account_id
      WHERE 1=1
    `;

    const params = [];

    if (filters.voucher_type) {
      query += " AND v.voucher_type = ?";
      params.push(filters.voucher_type);
    }

    if (filters.start_date) {
      query += " AND v.voucher_date >= ?";
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += " AND v.voucher_date <= ?";
      params.push(filters.end_date);
    }

    if (filters.account_id) {
      query += " AND ve.account_id = ?";
      params.push(filters.account_id);
    }

    if (filters.search) {
      query += " AND (v.voucher_number LIKE ? OR v.narration LIKE ?)";
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query +=
      " GROUP BY v.voucher_id ORDER BY v.voucher_date DESC, v.voucher_id DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    return this.db.getAll(query, params);
  }

  getVoucherById(id) {
    const voucher = this.db.getOne(
      `SELECT * FROM vouchers WHERE voucher_id = ?`,
      [id]
    );

    if (!voucher) {
      return null;
    }

    const entries = this.db.getAll(
      `
      SELECT 
        ve.*,
        a.account_name,
        a.account_code,
        a.account_type
      FROM voucher_entries ve
      JOIN accounts a ON ve.account_id = a.account_id
      WHERE ve.voucher_id = ?
      ORDER BY ve.entry_id
    `,
      [id]
    );

    return { ...voucher, entries };
  }

  getRecentVouchers(limit = 10) {
    return this.db.getAll(
      `
      SELECT 
        v.*,
        GROUP_CONCAT(DISTINCT a.account_name) as accounts_involved
      FROM vouchers v
      LEFT JOIN voucher_entries ve ON v.voucher_id = ve.voucher_id
      LEFT JOIN accounts a ON ve.account_id = a.account_id
      GROUP BY v.voucher_id
      ORDER BY v.created_at DESC
      LIMIT ?
    `,
      [limit]
    );
  }

  generateVoucherNumber(type) {
    const prefix = type === "Debit" ? "DBV" : type === "Credit" ? "CRV" : "JRN";
    const year = new Date().getFullYear();

    const lastVoucher = this.db.getOne(
      `
      SELECT voucher_number FROM vouchers 
      WHERE voucher_number LIKE ?
      ORDER BY voucher_id DESC LIMIT 1
    `,
      [`${prefix}-${year}-%`]
    );

    let nextNum = 1;
    if (lastVoucher) {
      const parts = lastVoucher.voucher_number.split("-");
      nextNum = parseInt(parts[2]) + 1;
    }

    return `${prefix}-${year}-${String(nextNum).padStart(5, "0")}`;
  }

  validateVoucherEntries(entries) {
    if (!entries || entries.length < 2) {
      return { valid: false, error: "Voucher must have at least 2 entries" };
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (!entry.account_id) {
        return {
          valid: false,
          error: "All entries must have an account selected",
        };
      }

      const debit = parseFloat(entry.debit_amount) || 0;
      const credit = parseFloat(entry.credit_amount) || 0;

      if (debit < 0 || credit < 0) {
        return { valid: false, error: "Amounts cannot be negative" };
      }

      if (debit > 0 && credit > 0) {
        return {
          valid: false,
          error: "An entry cannot have both debit and credit amounts",
        };
      }

      if (debit === 0 && credit === 0) {
        return {
          valid: false,
          error: "Each entry must have either a debit or credit amount",
        };
      }

      totalDebit += debit;
      totalCredit += credit;
    }

    // Check if balanced (allowing for small floating point differences)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        valid: false,
        error: `Voucher is not balanced. Debit: ${totalDebit.toFixed(
          2
        )}, Credit: ${totalCredit.toFixed(2)}`,
      };
    }

    return { valid: true, totalAmount: totalDebit };
  }

  createVoucher(data) {
    // Validate entries
    const validation = this.validateVoucherEntries(data.entries);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const result = this.db.transaction(() => {
        // Generate voucher number if not provided
        const voucherNumber =
          data.voucher_number || this.generateVoucherNumber(data.voucher_type);

        // Insert voucher header
        const voucherResult = this.db.run(
          `
          INSERT INTO vouchers (
            voucher_number, voucher_type, voucher_date, narration, narration_urdu, total_amount, legacy_raw_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            voucherNumber,
            data.voucher_type,
            data.voucher_date,
            data.narration || null,
            data.narration_urdu || null,
            validation.totalAmount,
            data.legacy_raw_id || null,
          ]
        );

        const voucherId = voucherResult.lastInsertRowid;

        // Insert voucher entries
        for (const entry of data.entries) {
          this.db.run(
            `
            INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount, narration, narration_urdu)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
            [
              voucherId,
              entry.account_id,
              parseFloat(entry.debit_amount) || 0,
              parseFloat(entry.credit_amount) || 0,
              entry.narration || null,
              entry.narration_urdu || null,
            ]
          );
        }

        return { voucher_id: voucherId, voucher_number: voucherNumber };
      });

      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  updateVoucher(id, data) {
    // Validate entries
    const validation = this.validateVoucherEntries(data.entries);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      this.db.transaction(() => {
        // Update voucher header (don't update voucher_type)
        this.db.run(
          `
          UPDATE vouchers SET
            voucher_date = ?,
            narration = ?,
            narration_urdu = ?,
            total_amount = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE voucher_id = ?
        `,
          [
            data.voucher_date,
            data.narration || null,
            data.narration_urdu || null,
            validation.totalAmount,
            id,
          ]
        );

        // Delete existing entries
        this.db.run("DELETE FROM voucher_entries WHERE voucher_id = ?", [id]);

        // Insert new entries
        for (const entry of data.entries) {
          this.db.run(
            `
            INSERT INTO voucher_entries (voucher_id, account_id, debit_amount, credit_amount, narration, narration_urdu)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
            [
              id,
              entry.account_id,
              parseFloat(entry.debit_amount) || 0,
              parseFloat(entry.credit_amount) || 0,
              entry.narration || null,
              entry.narration_urdu || null,
            ]
          );
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  deleteVoucher(id) {
    try {
      // Check if voucher is linked to legacy data
      const voucher = this.db.getOne(
        "SELECT legacy_raw_id FROM vouchers WHERE voucher_id = ?",
        [id]
      );

      this.db.transaction(() => {
        // Delete entries first (CASCADE should handle this, but being explicit)
        this.db.run("DELETE FROM voucher_entries WHERE voucher_id = ?", [id]);
        this.db.run("DELETE FROM vouchers WHERE voucher_id = ?", [id]);

        // Update legacy record status if linked
        if (voucher && voucher.legacy_raw_id) {
          this.db.run(
            `
            UPDATE legacy_raw_records SET status = 'validated' WHERE raw_id = ?
          `,
            [voucher.legacy_raw_id]
          );
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = VoucherService;

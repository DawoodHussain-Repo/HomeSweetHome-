/**
 * Voucher Validator
 * Validation logic for voucher entries
 */

import { VALIDATION, VOUCHER_TYPE } from '../utils/constants.js';

export class VoucherValidator {
  /**
   * Validate voucher form data
   */
  static validate(formData) {
    const errors = [];

    // Validate voucher type (support both 'type' and 'voucher_type')
    const voucherType = formData.voucher_type || formData.type;
    if (!voucherType || !Object.values(VOUCHER_TYPE).includes(voucherType)) {
      errors.push('Invalid voucher type');
    }

    // Validate date (support both 'date' and 'voucher_date')
    const voucherDate = formData.voucher_date || formData.date;
    if (!voucherDate) {
      errors.push('Voucher date is required');
    }

    // Validate entries
    if (!formData.entries || formData.entries.length < VALIDATION.MIN_VOUCHER_ENTRIES) {
      errors.push(`At least ${VALIDATION.MIN_VOUCHER_ENTRIES} entries required`);
    }

    // Validate each entry
    formData.entries?.forEach((entry, index) => {
      if (!entry.account_id) {
        errors.push(`Entry ${index + 1}: Account is required`);
      }
      if (!entry.debit_amount && !entry.credit_amount) {
        errors.push(`Entry ${index + 1}: Amount is required`);
      }
      if (entry.debit_amount && entry.credit_amount) {
        errors.push(`Entry ${index + 1}: Cannot have both debit and credit`);
      }
      if (entry.debit_amount < 0 || entry.credit_amount < 0) {
        errors.push(`Entry ${index + 1}: Amount cannot be negative`);
      }
    });

    // Validate balance
    const totals = this.calculateTotals(formData.entries || []);
    if (Math.abs(totals.debit - totals.credit) > 0.01) {
      errors.push('Debits and credits must be equal');
    }

    // Validate narration length
    if (formData.narration && formData.narration.length > VALIDATION.MAX_NARRATION_LENGTH) {
      errors.push(`Narration too long (max ${VALIDATION.MAX_NARRATION_LENGTH} characters)`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate totals from entries
   */
  static calculateTotals(entries) {
    return entries.reduce((acc, entry) => ({
      debit: acc.debit + (parseFloat(entry.debit_amount) || 0),
      credit: acc.credit + (parseFloat(entry.credit_amount) || 0)
    }), { debit: 0, credit: 0 });
  }

  /**
   * Check if voucher is balanced
   */
  static isBalanced(entries) {
    const totals = this.calculateTotals(entries);
    return Math.abs(totals.debit - totals.credit) < 0.01;
  }

  /**
   * Validate single entry
   */
  static validateEntry(entry) {
    const errors = [];

    if (!entry.account_id) {
      errors.push('Account is required');
    }

    const debit = parseFloat(entry.debit_amount) || 0;
    const credit = parseFloat(entry.credit_amount) || 0;

    if (debit === 0 && credit === 0) {
      errors.push('Amount is required');
    }

    if (debit > 0 && credit > 0) {
      errors.push('Cannot have both debit and credit');
    }

    if (debit < 0 || credit < 0) {
      errors.push('Amount cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate voucher type specific rules
   */
  static validateVoucherType(type, entries) {
    const errors = [];

    if (type === VOUCHER_TYPE.DEBIT || type === VOUCHER_TYPE.CREDIT) {
      // Simple vouchers should have exactly 2 entries
      if (entries.length !== 2) {
        errors.push(`${type} voucher must have exactly 2 entries`);
      }

      // One debit and one credit
      const debits = entries.filter(e => parseFloat(e.debit_amount) > 0).length;
      const credits = entries.filter(e => parseFloat(e.credit_amount) > 0).length;

      if (debits !== 1 || credits !== 1) {
        errors.push(`${type} voucher must have one debit and one credit entry`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

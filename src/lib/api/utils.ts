/**
 * API Utilities
 * Provides standardized error handling and response formatting
 */

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Wrap async operations with standardized error handling
 */
export async function tryCatch<T>(
  operation: () => Promise<T>
): Promise<ApiResponse<T>> {
  try {
    const data = await operation();
    return { data, error: null, success: true };
  } catch (err) {
    const error: ApiError = {
      message: err instanceof Error ? err.message : "An unknown error occurred",
      details: err,
    };
    console.error("[API Error]", error);
    return { data: null, error, success: false };
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  options: {
    compact?: boolean;
    showSign?: boolean;
    locale?: string;
  } = {}
): string {
  const { compact = false, showSign = false, locale = "en-PK" } = options;
  const abs = Math.abs(amount);
  const sign = showSign && amount !== 0 ? (amount > 0 ? "+" : "-") : "";

  if (compact) {
    if (abs >= 10000000) return `${sign}Rs. ${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${sign}Rs. ${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}Rs. ${(abs / 1000).toFixed(0)}K`;
  }

  return `${sign}Rs. ${abs.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parse a numeric value safely
 */
export function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generate unique voucher number
 */
export function generateVoucherNumber(
  prefix: string,
  sequence: number
): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${prefix}-${year}${month}-${sequence.toString().padStart(4, "0")}`;
}

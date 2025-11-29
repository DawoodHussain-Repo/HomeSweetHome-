/**
 * Data Migration Script for Hisaab Kitaab
 *
 * This script migrates data from the exported CSV files (from the old Access database)
 * to Supabase. Run this script after setting up your Supabase project and creating
 * the database schema.
 *
 * Usage:
 * 1. Set your Supabase credentials below
 * 2. Run: npx ts-node scripts/migrate-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || "YOUR_SERVICE_ROLE_KEY"; // Use service role key for migration
const USER_ID = process.env.MIGRATION_USER_ID || "YOUR_USER_UUID"; // The user ID to assign data to
const CSV_DIR = path.join(__dirname, "../../exported_csv");

// ============================================
// Initialize Supabase Client
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================
// CSV Parser
// ============================================
function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    data.push(row);
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================
// Migration Functions
// ============================================

async function migrateCompanyInfo() {
  console.log("📋 Migrating Company Info...");

  const data = parseCSV(path.join(CSV_DIR, "Company_Info.csv"));
  if (data.length === 0) return;

  const row = data[0];

  const { error } = await supabase.from("company_info").upsert(
    {
      user_id: USER_ID,
      company_name: row.CompanyName || "Home Sweet Home",
      company_name_urdu: row.UCompanyName || "ہیارا گھر",
      address: row.Address || "",
      phone_numbers: row.PhoneNos || "",
      email: row.Emails || "",
      title_short: row.Title_Short || "HSH",
      fiscal_year_start: "2024-01-01",
      fiscal_year_end: "2024-12-31",
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("  ❌ Error:", error.message);
  } else {
    console.log("  ✅ Company info migrated");
  }
}

async function migrateVoucherTypes() {
  console.log("📋 Migrating Voucher Types...");

  const data = parseCSV(path.join(CSV_DIR, "VT.csv"));

  const voucherTypes = data.map((row) => ({
    user_id: USER_ID,
    code: parseInt(row.VTYPE) || 0,
    title: row.VTITLE || "Unknown",
    title_urdu: row.UVTITLE || null,
    voucher_category: mapVoucherCategory(parseInt(row.VTYPE)),
    affects_cash: row.Cash_Book === "1" || row.Cash_Book === "2",
    affects_inventory: row.Stock !== "0",
    is_active: true,
  }));

  const { error } = await supabase.from("voucher_types").upsert(voucherTypes, {
    onConflict: "user_id,code",
  });

  if (error) {
    console.error("  ❌ Error:", error.message);
  } else {
    console.log(`  ✅ ${voucherTypes.length} voucher types migrated`);
  }
}

function mapVoucherCategory(code: number): string {
  if (code === 100 || code === 300) return "opening";
  if (code === 101 || code === 204) return "receipt";
  if (code === 102 || code === 203) return "payment";
  if (code >= 201 && code <= 202) return "journal";
  if (code >= 301 && code <= 304) return "purchase";
  if (code >= 401 && code <= 404) return "sale";
  return "journal";
}

async function migrateAccounts() {
  console.log("📋 Migrating Chart of Accounts...");

  const data = parseCSV(path.join(CSV_DIR, "AC.csv"));

  // First pass: Create all accounts without parent references
  const accounts = data.map((row) => {
    const code = row.PRTCODE || "";
    const step1 = parseInt(row.Step1) || 0;

    return {
      user_id: USER_ID,
      account_code: code,
      account_name: row.AC_TITLE1 || "Unnamed Account",
      account_name_urdu: row.AC_TITLE2 || null,
      parent_id: null,
      account_type: mapAccountType(step1),
      account_level: countNonZeroSteps(row),
      is_header: !row.Step4 || row.Step4 === "0", // If step4 is empty or 0, it's a header
      is_active: true,
      opening_balance: 0,
      balance_type: step1 <= 2 ? "debit" : "credit",
    };
  });

  // Insert accounts
  const { data: inserted, error } = await supabase
    .from("accounts")
    .upsert(accounts, { onConflict: "user_id,account_code" })
    .select();

  if (error) {
    console.error("  ❌ Error:", error.message);
  } else {
    console.log(`  ✅ ${accounts.length} accounts migrated`);
  }

  // TODO: Second pass to set parent relationships based on account code hierarchy
}

function mapAccountType(step1: number): string {
  switch (step1) {
    case 1:
      return "asset";
    case 2:
      return "liability";
    case 3:
      return "expense";
    case 4:
      return "income";
    case 5:
      return "equity";
    default:
      return "asset";
  }
}

function countNonZeroSteps(row: Record<string, string>): number {
  let level = 0;
  if (row.Step1 && row.Step1 !== "0") level++;
  if (row.Step2 && row.Step2 !== "0") level++;
  if (row.Step3 && row.Step3 !== "0") level++;
  if (row.Step4 && row.Step4 !== "0") level++;
  if (row.Step && row.Step !== "0") level++;
  return level;
}

async function migrateDictionary() {
  console.log("📋 Migrating Dictionary...");

  const data = parseCSV(path.join(CSV_DIR, "DictEU.csv"));

  // Process in batches of 500
  const batchSize = 500;
  let migrated = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data
      .slice(i, i + batchSize)
      .map((row) => ({
        user_id: USER_ID,
        english_word: row.E || "",
        urdu_word: row.U || "",
      }))
      .filter((item) => item.english_word && item.urdu_word);

    const { error } = await supabase.from("dictionary").upsert(batch, {
      onConflict: "user_id,english_word",
    });

    if (error) {
      console.error(`  ❌ Batch error at ${i}:`, error.message);
    } else {
      migrated += batch.length;
    }
  }

  console.log(`  ✅ ${migrated} dictionary entries migrated`);
}

async function migratePriceLists() {
  console.log("📋 Migrating Price Lists...");

  const data = parseCSV(path.join(CSV_DIR, "PPLs.csv"));

  const priceLists = data.map((row) => ({
    user_id: USER_ID,
    effective_date:
      parseDate(row.PDate) || new Date().toISOString().split("T")[0],
    remarks: row.Remarks || null,
    aq: parseFloat(row.Aq) || null,
    ar: parseFloat(row.AR) || null,
    mq: parseFloat(row.MQ) || null,
    mr: parseFloat(row.MR) || null,
    bq: parseFloat(row.BQ) || null,
    br: parseFloat(row.BR) || null,
    sq: parseFloat(row.SQ) || null,
  }));

  // Insert in batches
  const batchSize = 100;
  let migrated = 0;

  for (let i = 0; i < priceLists.length; i += batchSize) {
    const batch = priceLists.slice(i, i + batchSize);
    const { error } = await supabase.from("price_lists").insert(batch);

    if (!error) {
      migrated += batch.length;
    }
  }

  console.log(`  ✅ ${migrated} price list entries migrated`);
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Handle format: "M/D/YYYY H:MM:SS AM/PM"
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

// ============================================
// Main Migration Runner
// ============================================

async function runMigration() {
  console.log("🚀 Starting Data Migration");
  console.log("=".repeat(50));
  console.log(`CSV Directory: ${CSV_DIR}`);
  console.log(`Target User ID: ${USER_ID}`);
  console.log("=".repeat(50));
  console.log("");

  // Check if CSV directory exists
  if (!fs.existsSync(CSV_DIR)) {
    console.error(
      "❌ CSV directory not found. Please run the export script first."
    );
    process.exit(1);
  }

  try {
    await migrateCompanyInfo();
    await migrateVoucherTypes();
    await migrateAccounts();
    await migrateDictionary();
    await migratePriceLists();

    console.log("");
    console.log("=".repeat(50));
    console.log("✅ Migration Complete!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Verify data in Supabase dashboard");
    console.log("2. Test the web application");
    console.log("3. Migrate transactions if needed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration();

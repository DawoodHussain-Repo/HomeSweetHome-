/**
 * Complete Data Migration Script for Hisaab Kitaab
 * Migrates all data from exported CSV files to Supabase
 *
 * Run: node scripts/complete-migration.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Supabase configuration
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://kvbkxuyvxswtczmmhtqg.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2Ymt4dXl2eHN3dGN6bW1odHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjI2NzAsImV4cCI6MjA3OTkzODY3MH0.khSF-iVL0QobNPXcX4-s0pPBSUyShRcUC8BDVLBwnyM";

const supabase = createClient(supabaseUrl, supabaseKey);

// Sajjad's user ID (owner of all data)
const USER_ID = "a0000000-0000-0000-0000-000000000001";

// CSV directory
const CSV_DIR = path.join(__dirname, "..", "..", "exported_csv");

// Parse CSV content
function parseCSV(content) {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

function readCSV(filename) {
  const filepath = path.join(CSV_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  File not found: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filepath, "utf-8");
  return parseCSV(content);
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === "") return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function parseNumber(str) {
  if (!str || str === "") return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseInt2(str) {
  if (!str || str === "") return null;
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

// Determine account type from PRTCODE
function getAccountType(prtcode) {
  if (!prtcode) return "asset";
  const first = prtcode.charAt(0);
  switch (first) {
    case "1":
      return "asset";
    case "2":
      return "liability";
    case "3":
      return "equity";
    case "4":
      return "income";
    case "5":
      return "expense";
    default:
      return "asset";
  }
}

// Get voucher category from VType code
function getVoucherCategory(code) {
  const codeNum = parseInt(code, 10);
  if (codeNum >= 100 && codeNum < 200)
    return codeNum % 2 === 1 ? "receipt" : "payment";
  if (codeNum >= 200 && codeNum < 300) return "journal";
  if (codeNum >= 300 && codeNum < 400) return "opening";
  if (codeNum >= 400 && codeNum < 500) return "sale";
  if (codeNum >= 500 && codeNum < 600) return "purchase";
  return "journal";
}

async function migrateVoucherTypes() {
  console.log("\n📋 Migrating Voucher Types...");

  const vtData = readCSV("VT.csv");
  if (vtData.length === 0) return;

  const voucherTypes = vtData
    .map((row) => ({
      user_id: USER_ID,
      code: parseInt(row.VCode || row.VCODE || "0", 10),
      title: row.VTitle || row.VTITLE || "Unknown",
      title_urdu: row.UVTitle || row.UVTITLE || "",
      voucher_category: getVoucherCategory(row.VCode || row.VCODE || "0"),
      affects_cash: ["101", "102"].includes(row.VCode || row.VCODE),
      affects_inventory: false,
      is_active: true,
    }))
    .filter((vt) => vt.code > 0);

  if (voucherTypes.length === 0) {
    console.log("  No voucher types found");
    return;
  }

  // Insert in batches
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < voucherTypes.length; i += batchSize) {
    const batch = voucherTypes.slice(i, i + batchSize);
    const { error } = await supabase
      .from("voucher_types")
      .upsert(batch, { onConflict: "user_id,code" });
    if (error) {
      console.log(`  Error inserting batch: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✓ Inserted ${inserted} voucher types`);
}

async function migrateAccounts() {
  console.log("\n📊 Migrating Accounts...");

  const acData = readCSV("AC.csv");
  if (acData.length === 0) return;

  const accounts = acData
    .map((row) => ({
      user_id: USER_ID,
      legacy_code: parseInt2(row.CA),
      account_code: row.PRTCODE || row.CA || "",
      account_name: row.AC_TITLE1 || "Unknown Account",
      account_name_urdu: row.UAC_Title || "",
      account_type: getAccountType(row.PRTCODE),
      account_level: parseInt(row.Step || "1", 10),
      is_header: parseInt(row.Step || "0", 10) === 0,
      is_active: true,
      opening_balance: 0,
    }))
    .filter((acc) => acc.account_code);

  if (accounts.length === 0) {
    console.log("  No accounts found");
    return;
  }

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < accounts.length; i += batchSize) {
    const batch = accounts.slice(i, i + batchSize);
    const { error } = await supabase
      .from("accounts")
      .upsert(batch, { onConflict: "user_id,account_code" });
    if (error) {
      console.log(`  Error inserting batch: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✓ Inserted ${inserted} accounts`);
}

async function migrateTransactions() {
  console.log("\n💰 Migrating Transactions (T1 + Inv1)...");

  // Read transaction headers from T1.csv
  const t1Data = readCSV("T1.csv");
  // Read transaction details from Inv1.csv
  const inv1Data = readCSV("Inv1.csv");

  if (t1Data.length === 0) {
    console.log("  No transaction headers found in T1.csv");
    return;
  }

  console.log(`  Found ${t1Data.length} transaction headers`);
  console.log(`  Found ${inv1Data.length} transaction details`);

  // Group Inv1 details by TR_No
  const detailsByTrNo = {};
  inv1Data.forEach((row) => {
    const trNo = row.TR_No;
    if (!detailsByTrNo[trNo]) {
      detailsByTrNo[trNo] = [];
    }
    detailsByTrNo[trNo].push(row);
  });

  // Process transactions in batches
  const batchSize = 100;
  let transactionsInserted = 0;
  let detailsInserted = 0;

  for (let i = 0; i < t1Data.length; i += batchSize) {
    const batch = t1Data.slice(i, i + batchSize);

    // Insert transaction headers
    const transactions = batch.map((row) => {
      const details = detailsByTrNo[row.TR_No] || [];
      const firstDetail = details[0] || {};
      const totalAmount = details.reduce(
        (sum, d) => sum + parseNumber(d.Amount),
        0
      );

      return {
        user_id: USER_ID,
        legacy_tr_no: parseInt2(row.TR_No),
        transaction_date:
          parseDate(row.TR_Date) || new Date().toISOString().split("T")[0],
        voucher_type_code: parseInt(firstDetail.VType || "101", 10),
        voucher_number: row.V_No || null,
        cheque_number: row.Cheque_No || row.ChequeNo || null,
        invoice_number: row.Invoice_No || null,
        invoice_date: parseDate(row.Invoice_Date),
        narration: firstDetail.Narration || row.Remarks || null,
        narration_urdu: firstDetail.UNarration || null,
        total_amount: totalAmount,
        is_posted: true,
      };
    });

    const { data: insertedTx, error: txError } = await supabase
      .from("transactions")
      .upsert(transactions, { onConflict: "legacy_tr_no" })
      .select("id, legacy_tr_no");

    if (txError) {
      console.log(`  Error inserting transactions batch: ${txError.message}`);
      continue;
    }

    transactionsInserted += insertedTx?.length || 0;

    // Create a map of legacy_tr_no to transaction id
    const trNoToId = {};
    (insertedTx || []).forEach((tx) => {
      trNoToId[tx.legacy_tr_no] = tx.id;
    });

    // Insert transaction details for this batch
    const allDetails = [];
    batch.forEach((row) => {
      const details = detailsByTrNo[row.TR_No] || [];
      const txId = trNoToId[parseInt2(row.TR_No)];

      if (!txId) return;

      details.forEach((d, idx) => {
        const amount = parseNumber(d.Amount);
        const vtype = parseInt(d.VType || "101", 10);
        const isDebit = vtype % 2 === 0; // Even = payment (debit), Odd = receipt (credit)

        allDetails.push({
          transaction_id: txId,
          legacy_account_code: parseInt2(d.Account_Party),
          description: d.Narration || null,
          description_urdu: d.UNarration || null,
          debit_amount: isDebit ? amount : 0,
          credit_amount: isDebit ? 0 : amount,
          quantity: parseNumber(d.Q),
          rate: parseNumber(d.R),
          weight: parseNumber(d.W),
          line_order: idx,
          control_code: parseInt2(d.Control_Code),
        });
      });
    });

    if (allDetails.length > 0) {
      // Insert details in smaller batches
      for (let j = 0; j < allDetails.length; j += 200) {
        const detailBatch = allDetails.slice(j, j + 200);
        const { error: detailError } = await supabase
          .from("transaction_details")
          .insert(detailBatch);

        if (detailError) {
          console.log(
            `  Error inserting details batch: ${detailError.message}`
          );
        } else {
          detailsInserted += detailBatch.length;
        }
      }
    }

    // Progress update
    if ((i + batchSize) % 500 === 0 || i + batchSize >= t1Data.length) {
      console.log(
        `  Progress: ${Math.min(i + batchSize, t1Data.length)}/${
          t1Data.length
        } transactions...`
      );
    }
  }

  console.log(`  ✓ Inserted ${transactionsInserted} transactions`);
  console.log(`  ✓ Inserted ${detailsInserted} transaction details`);
}

async function migrateDictionary() {
  console.log("\n📚 Migrating Dictionary...");

  const dictData = readCSV("DictEU.csv");
  if (dictData.length === 0) {
    console.log("  No dictionary data found");
    return;
  }

  const dictionary = dictData
    .map((row) => ({
      user_id: USER_ID,
      english_word: row.Eng || row.ENG || "",
      urdu_word: row.Urdu || row.URDU || "",
    }))
    .filter((d) => d.english_word && d.urdu_word);

  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < dictionary.length; i += batchSize) {
    const batch = dictionary.slice(i, i + batchSize);
    const { error } = await supabase
      .from("dictionary")
      .upsert(batch, { onConflict: "user_id,english_word" });
    if (!error) inserted += batch.length;
  }

  console.log(`  ✓ Inserted ${inserted} dictionary entries`);
}

async function migratePriceLists() {
  console.log("\n💵 Migrating Price Lists...");

  const plData = readCSV("PPLs.csv");
  if (plData.length === 0) {
    console.log("  No price list data found");
    return;
  }

  const priceLists = plData.map((row) => ({
    user_id: USER_ID,
    effective_date:
      parseDate(row.PPL_Date || row.Date) ||
      new Date().toISOString().split("T")[0],
    remarks: row.Remarks || null,
    aq: parseNumber(row.AQ),
    ar: parseNumber(row.AR),
    mq: parseNumber(row.MQ),
    mr: parseNumber(row.MR),
    bq: parseNumber(row.BQ),
    br: parseNumber(row.BR),
    sq: parseNumber(row.SQ),
  }));

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < priceLists.length; i += batchSize) {
    const batch = priceLists.slice(i, i + batchSize);
    const { error } = await supabase.from("price_lists").insert(batch);
    if (!error) inserted += batch.length;
  }

  console.log(`  ✓ Inserted ${inserted} price list entries`);
}

async function linkAccountsToDetails() {
  console.log("\n🔗 Linking transaction details to accounts...");

  // Get all accounts with legacy codes
  const { data: accounts, error: accError } = await supabase
    .from("accounts")
    .select("id, legacy_code")
    .eq("user_id", USER_ID)
    .not("legacy_code", "is", null);

  if (accError || !accounts) {
    console.log(`  Error fetching accounts: ${accError?.message}`);
    return;
  }

  // Create lookup map
  const codeToId = {};
  accounts.forEach((acc) => {
    codeToId[acc.legacy_code] = acc.id;
  });

  console.log(`  Found ${accounts.length} accounts with legacy codes`);

  // Update transaction details with account_id
  let updated = 0;
  for (const [legacyCode, accountId] of Object.entries(codeToId)) {
    const { error } = await supabase
      .from("transaction_details")
      .update({ account_id: accountId })
      .eq("legacy_account_code", parseInt(legacyCode, 10))
      .is("account_id", null);

    if (!error) updated++;
  }

  console.log(`  ✓ Linked ${updated} account codes to transaction details`);
}

async function runMigration() {
  console.log("🚀 Starting Complete Data Migration");
  console.log("=".repeat(50));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`CSV Directory: ${CSV_DIR}`);
  console.log(`User ID: ${USER_ID}`);

  // Check if user exists
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", USER_ID)
    .single();

  if (userError || !user) {
    console.log(
      "\n❌ User not found! Please run complete-schema.sql first in Supabase SQL Editor."
    );
    console.log("   User ID needed:", USER_ID);
    return;
  }

  console.log(`\n✓ Found user: ${user.email}`);

  try {
    await migrateVoucherTypes();
    await migrateAccounts();
    await migrateTransactions();
    await migrateDictionary();
    await migratePriceLists();
    await linkAccountsToDetails();

    console.log("\n" + "=".repeat(50));
    console.log("✅ Migration completed successfully!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
  }
}

runMigration();

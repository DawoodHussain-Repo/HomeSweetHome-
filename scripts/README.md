# Scripts

## Available Scripts

### `reimport-complete-data.js`
Main migration script for importing data from Access database CSV exports.
- Handles all VTypes (101, 102, 201, and others)
- Maps accounts using CA → PRTCODE
- Creates balanced vouchers with proper debit/credit entries

```bash
node scripts/reimport-complete-data.js
```

### `check-data-completeness.js`
Verification script to compare CSV data with database.
- Compares account counts
- Verifies transaction totals
- Shows sample data verification

```bash
node scripts/check-data-completeness.js
```

### `generate-logo-base64.js`
Converts Logo.png to base64 for embedding in print templates.

```bash
node scripts/generate-logo-base64.js
```

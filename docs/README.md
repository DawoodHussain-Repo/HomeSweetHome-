# HSH Accounting System

Professional offline-first desktop accounting application built with Electron.

## Features

- Double-entry bookkeeping
- Voucher management (Debit, Credit, Journal)
- Account management with hierarchical structure
- Financial reports (Trial Balance, Income Statement, Ledger)
- Print to HTML file with A4 formatting
- Data migration from Access database

## Design

- Boxy design with sharp corners
- Dark blue primary color (#1e3a8a)
- Black borders throughout
- Clean, professional typography

## Accounting Logic

### Voucher Types
- **Debit (DBV)**: Cash payments - debits expense/asset, credits cash
- **Credit (CRV)**: Cash receipts - debits cash, credits income/liability
- **Journal (JRN)**: General entries - manual debit/credit allocation

### Account Types
- **Asset**: Debit increases, Credit decreases
- **Liability**: Credit increases, Debit decreases
- **Income**: Credit increases, Debit decreases
- **Expense**: Debit increases, Credit decreases
- **Equity**: Credit increases, Debit decreases

### Balance Rules
- All vouchers must be balanced (Total Debit = Total Credit)
- Trial Balance: Sum of all debits must equal sum of all credits

## Data Migration

Original data imported from Access database (MDE file) via CSV exports.

### Migration Script
```bash
npm run migrate
```

### Verification
```bash
npm run verify
```

## Development

```bash
npm start      # Run in development
npm run build  # Build portable executable
```

## Tech Stack

- Electron 28
- sql.js (SQLite in browser)
- PapaParse (CSV parsing)
- Fuse.js (Fuzzy search)

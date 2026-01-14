# Architecture Documentation

## System Overview

HSH Accounting is an Electron-based desktop application using a client-server architecture within a single process.

## Technology Stack

### Core
- **Electron 28**: Desktop application framework
- **sql.js 1.10**: Pure JavaScript SQLite implementation (no native dependencies)
- **Node.js**: Backend runtime

### Frontend
- **Vanilla JavaScript**: No frameworks, modern ES6+
- **Custom CSS**: Light theme with purple+blue accents
- **Custom Title Bar**: Frameless window with Discord-style controls

### Data Processing
- **PapaParse**: CSV parsing for legacy data migration
- **Fuse.js**: Fuzzy search for account selection

## Application Structure

```
┌─────────────────────────────────────────────────────┐
│                  Electron Main Process              │
│  ┌──────────────────────────────────────────────┐  │
│  │  main.js (Window Management, IPC Handlers)   │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Database Layer (database.js)                │  │
│  │  - sql.js initialization                     │  │
│  │  - Query execution                           │  │
│  │  - Transaction management                    │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Services Layer                              │  │
│  │  - AccountService (CRUD operations)          │  │
│  │  - VoucherService (double-entry logic)       │  │
│  │  - ReportService (financial calculations)    │  │
│  │  - LegacyMigrationService (CSV import)       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↕ IPC
┌─────────────────────────────────────────────────────┐
│              Electron Renderer Process              │
│  ┌──────────────────────────────────────────────┐  │
│  │  UI Layer (index.html + CSS)                 │  │
│  │  - Custom title bar                          │  │
│  │  - Sidebar navigation                        │  │
│  │  - Page content area                         │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Page Controllers (JavaScript)               │  │
│  │  - VouchersPage (voucher entry)              │  │
│  │  - AccountsPage (account management)         │  │
│  │  - ReportsPage (report generation)           │  │
│  │  - SettingsPage (company info)               │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Utilities                                   │  │
│  │  - Modal (dialogs)                           │  │
│  │  - Toast (notifications)                     │  │
│  │  - Formatters (currency, dates)              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

**accounts**
- account_id (PRIMARY KEY)
- account_code (UNIQUE)
- account_name (UNIQUE)
- account_type (Asset, Liability, Income, Expense, Equity)
- parent_account_id (for hierarchy)
- opening_balance
- is_active

**vouchers**
- voucher_id (PRIMARY KEY)
- voucher_number (UNIQUE)
- voucher_type (Debit, Credit, Journal)
- voucher_date
- narration (English)
- narration_urdu (RTL support)
- created_at

**voucher_entries**
- entry_id (PRIMARY KEY)
- voucher_id (FOREIGN KEY)
- account_id (FOREIGN KEY)
- debit_amount
- credit_amount
- entry_order

**company_info**
- company_name
- company_name_urdu
- address
- phone
- email
- financial_year_start
- financial_year_end

## IPC Communication

### Main → Renderer
- Window control events (minimize, maximize, close)
- Database operation results
- Error notifications

### Renderer → Main
- `window.api.accounts.*` - Account operations
- `window.api.vouchers.*` - Voucher operations
- `window.api.reports.*` - Report generation
- `window.api.company.*` - Company info
- `window.api.window.*` - Window controls

## Data Flow

### Creating a Voucher
1. User fills form in VouchersPage
2. Frontend validates entries (debits = credits)
3. IPC call to `vouchers.create()`
4. VoucherService validates business rules
5. Database transaction:
   - Insert voucher record
   - Insert voucher_entries
   - Commit or rollback
6. Result returned to frontend
7. UI updates with success/error message

### Generating Reports
1. User selects report parameters (dates, accounts)
2. IPC call to `reports.{reportType}()`
3. ReportService executes SQL queries
4. Calculations performed (balances, totals)
5. Data returned to frontend
6. ReportsPage renders HTML table
7. Print button opens custom print window

## Legacy Data Migration

### Migration Pipeline
1. **Scan**: Read CSV files from exported_csv folder
2. **Parse**: Use PapaParse to convert CSV to JSON
3. **Normalize**: Map CSV columns to database schema
4. **Validate**: Check data integrity, account references
5. **Import**: Insert into database with transactions
6. **Verify**: Generate reports to confirm accuracy

### Supported CSV Files
- **AC.csv**: Chart of accounts (79 accounts)
- **Inv1.csv**: Transaction vouchers (7,072 entries)
- Preserves Urdu narrations with proper encoding

## Security Considerations

- **Context Isolation**: Enabled in Electron
- **Node Integration**: Disabled in renderer
- **Preload Script**: Controlled IPC exposure
- **CSP**: Content Security Policy in HTML
- **No Remote Code**: All code bundled locally

## Performance Optimizations

- **sql.js**: In-memory database for fast queries
- **Lazy Loading**: Pages load on demand
- **Debounced Search**: Account search with 300ms delay
- **Indexed Queries**: Database indexes on foreign keys
- **Minimal Dependencies**: Only essential npm packages

## File Storage

- **Database**: `app-data/database.db` (portable)
- **Logo**: `src/assets/Logo.png`
- **Legacy Data**: `exported_csv/*.csv`
- **Build Output**: `release/*.exe`

## Build Process

1. **Development**: `npm start` - Runs Electron with DevTools
2. **Production**: `npm run build` - Creates portable .exe
3. **electron-builder**: Packages app with dependencies
4. **ASAR**: Archives source code for distribution
5. **Portable**: Single .exe with embedded Node.js

## Future Enhancements

- Multi-currency support
- Backup/restore functionality
- PDF export for reports
- Account reconciliation
- Budget tracking
- Multi-user support with permissions

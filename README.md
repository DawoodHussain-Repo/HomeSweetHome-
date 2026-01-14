# HSH Accounting System

Professional offline-first desktop accounting application built with Electron.

## Quick Start

```bash
npm install    # Install dependencies
npm start      # Run application
npm run build  # Build portable executable
```

## Features

- Double-entry bookkeeping (Debit, Credit, Journal vouchers)
- Chart of accounts with hierarchical structure
- Financial reports (Trial Balance, Income Statement, Ledger)
- Print to HTML file (A4 format)
- Urdu language support (RTL)
- Data migration from Access database
- Portable - no installation required
- Offline-first - no internet needed

## Design

- Boxy design with sharp corners
- Dark blue primary color (#1e3a8a)
- Black borders throughout

## Documentation

See [docs/README.md](docs/README.md) for detailed documentation.

## Tech Stack

- Electron 28
- sql.js (SQLite in browser)
- Vanilla JavaScript
- Custom CSS

## Project Structure

```
├── app-data/          # SQLite database
├── docs/              # Documentation
├── scripts/           # Migration scripts
├── src/
│   ├── assets/        # Logo
│   ├── main/          # Electron main process
│   └── renderer/      # UI (HTML/CSS/JS)
└── package.json
```

## License

MIT

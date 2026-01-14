const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('./database/database');
const AccountService = require('./services/accountService');
const VoucherService = require('./services/voucherService');
const ReportService = require('./services/reportService');
const LegacyMigrationService = require('./services/legacyMigrationService');

let mainWindow;
let db;
let accountService;
let voucherService;
let reportService;
let legacyMigrationService;

// Get portable app data path (relative to app location)
function getAppDataPath() {
  const appPath = app.isPackaged 
    ? path.dirname(app.getPath('exe'))
    : path.join(__dirname, '..', '..');
  return path.join(appPath, 'app-data');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'assets', 'Logo.png'),
    show: false,
    backgroundColor: '#1e1b4b'
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

async function initializeApp() {
  const appDataPath = getAppDataPath();
  
  // Initialize database (async for sql.js)
  db = new Database(appDataPath);
  await db.initialize();
  
  // Initialize services
  accountService = new AccountService(db);
  voucherService = new VoucherService(db);
  reportService = new ReportService(db);
  legacyMigrationService = new LegacyMigrationService(db, appDataPath);
  
  // Register IPC handlers
  registerIPCHandlers();
}

function registerIPCHandlers() {
  // Account handlers
  ipcMain.handle('accounts:getAll', () => accountService.getAllAccounts());
  ipcMain.handle('accounts:getById', (_, id) => accountService.getAccountById(id));
  ipcMain.handle('accounts:getByType', (_, type) => accountService.getAccountsByType(type));
  ipcMain.handle('accounts:create', (_, data) => accountService.createAccount(data));
  ipcMain.handle('accounts:update', (_, id, data) => accountService.updateAccount(id, data));
  ipcMain.handle('accounts:delete', (_, id) => accountService.deleteAccount(id));
  ipcMain.handle('accounts:getLedger', (_, id, startDate, endDate) => 
    accountService.getAccountLedger(id, startDate, endDate));
  ipcMain.handle('accounts:getBalance', (_, id) => accountService.getAccountBalance(id));

  // Voucher handlers
  ipcMain.handle('vouchers:getAll', (_, filters) => voucherService.getAllVouchers(filters));
  ipcMain.handle('vouchers:getById', (_, id) => voucherService.getVoucherById(id));
  ipcMain.handle('vouchers:create', (_, data) => voucherService.createVoucher(data));
  ipcMain.handle('vouchers:update', (_, id, data) => voucherService.updateVoucher(id, data));
  ipcMain.handle('vouchers:delete', (_, id) => voucherService.deleteVoucher(id));
  ipcMain.handle('vouchers:getRecent', (_, limit) => voucherService.getRecentVouchers(limit));
  ipcMain.handle('vouchers:search', (_, filters) => {
    console.log('[IPC] vouchers:search called with filters:', filters);
    const result = voucherService.getAllVouchers({
      voucher_type: filters.type || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      search: filters.search || undefined,
      account_id: filters.account_id || undefined
    });
    console.log('[IPC] vouchers:search returned', result?.length || 0, 'vouchers');
    return result;
  });

  // Report handlers
  ipcMain.handle('reports:trialBalance', (_, date) => reportService.getTrialBalance(date));
  ipcMain.handle('reports:incomeStatement', (_, startDate, endDate) => 
    reportService.getIncomeStatement(startDate, endDate));
  ipcMain.handle('reports:balanceSheet', (_, date) => reportService.getBalanceSheet(date));
  ipcMain.handle('reports:ledgerReport', (_, accountId, startDate, endDate) => 
    reportService.getLedgerReport(accountId, startDate, endDate));

  // Dashboard handlers
  ipcMain.handle('dashboard:getSummary', () => reportService.getDashboardSummary());

  // Legacy migration handlers
  ipcMain.handle('legacy:scanFiles', () => legacyMigrationService.scanLegacyFiles());
  ipcMain.handle('legacy:importBatch', (_, filePath, sourceType) => 
    legacyMigrationService.importBatch(filePath, sourceType));
  ipcMain.handle('legacy:getBatches', () => legacyMigrationService.getBatches());
  ipcMain.handle('legacy:getRawRecords', (_, batchId) => 
    legacyMigrationService.getRawRecords(batchId));
  ipcMain.handle('legacy:normalizeRecords', (_, batchId) => 
    legacyMigrationService.normalizeRecords(batchId));
  ipcMain.handle('legacy:getMappingRules', () => legacyMigrationService.getMappingRules());
  ipcMain.handle('legacy:createMappingRule', (_, data) => 
    legacyMigrationService.createMappingRule(data));
  ipcMain.handle('legacy:validateBatch', (_, batchId) => 
    legacyMigrationService.validateBatch(batchId));
  ipcMain.handle('legacy:postBatch', (_, batchId) => 
    legacyMigrationService.postBatch(batchId));
  ipcMain.handle('legacy:getAuditLog', (_, batchId) => 
    legacyMigrationService.getAuditLog(batchId));

  // Company info handlers
  ipcMain.handle('company:getInfo', () => db.getCompanyInfo());
  ipcMain.handle('company:updateInfo', (_, data) => db.updateCompanyInfo(data));

  // Database handlers
  ipcMain.handle('database:backup', () => db.backup());
  ipcMain.handle('database:exportCSV', () => db.exportCSV());

  // File handlers
  ipcMain.handle('file:saveHTML', async (_, title, content) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Report',
        defaultPath: `${title}.html`,
        filters: [
          { name: 'HTML Files', extensions: ['html'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

app.whenReady().then(async () => {
  await initializeApp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Graceful shutdown - close database before quitting
app.on('window-all-closed', () => {
  try {
    if (db) {
      db.close();
      db = null;
    }
  } catch (e) {
    // Ignore errors during shutdown
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  try {
    if (db) {
      db.close();
      db = null;
    }
  } catch (e) {
    // Ignore errors during shutdown
  }
});

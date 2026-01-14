const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close')
  },

  // Account operations
  accounts: {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    getById: (id) => ipcRenderer.invoke('accounts:getById', id),
    getByType: (type) => ipcRenderer.invoke('accounts:getByType', type),
    create: (data) => ipcRenderer.invoke('accounts:create', data),
    update: (id, data) => ipcRenderer.invoke('accounts:update', id, data),
    delete: (id) => ipcRenderer.invoke('accounts:delete', id),
    getLedger: (id, startDate, endDate) => 
      ipcRenderer.invoke('accounts:getLedger', id, startDate, endDate),
    getBalance: (id) => ipcRenderer.invoke('accounts:getBalance', id)
  },

  // Voucher operations
  vouchers: {
    getAll: (filters) => ipcRenderer.invoke('vouchers:getAll', filters),
    getById: (id) => ipcRenderer.invoke('vouchers:getById', id),
    create: (data) => ipcRenderer.invoke('vouchers:create', data),
    update: (id, data) => ipcRenderer.invoke('vouchers:update', id, data),
    delete: (id) => ipcRenderer.invoke('vouchers:delete', id),
    getRecent: (limit) => ipcRenderer.invoke('vouchers:getRecent', limit),
    search: (filters) => ipcRenderer.invoke('vouchers:search', filters)
  },

  // Report operations
  reports: {
    trialBalance: (date) => ipcRenderer.invoke('reports:trialBalance', date),
    incomeStatement: (startDate, endDate) => 
      ipcRenderer.invoke('reports:incomeStatement', startDate, endDate),
    balanceSheet: (date) => ipcRenderer.invoke('reports:balanceSheet', date),
    ledgerReport: (accountId, startDate, endDate) => 
      ipcRenderer.invoke('reports:ledgerReport', accountId, startDate, endDate)
  },

  // Dashboard operations
  dashboard: {
    getSummary: () => ipcRenderer.invoke('dashboard:getSummary')
  },

  // Legacy migration operations
  legacy: {
    scanFiles: () => ipcRenderer.invoke('legacy:scanFiles'),
    importBatch: (filePath, sourceType) => 
      ipcRenderer.invoke('legacy:importBatch', filePath, sourceType),
    getBatches: () => ipcRenderer.invoke('legacy:getBatches'),
    getRawRecords: (batchId) => ipcRenderer.invoke('legacy:getRawRecords', batchId),
    normalizeRecords: (batchId) => ipcRenderer.invoke('legacy:normalizeRecords', batchId),
    getMappingRules: () => ipcRenderer.invoke('legacy:getMappingRules'),
    createMappingRule: (data) => ipcRenderer.invoke('legacy:createMappingRule', data),
    validateBatch: (batchId) => ipcRenderer.invoke('legacy:validateBatch', batchId),
    postBatch: (batchId) => ipcRenderer.invoke('legacy:postBatch', batchId),
    getAuditLog: (batchId) => ipcRenderer.invoke('legacy:getAuditLog', batchId)
  },

  // Company info operations
  company: {
    getInfo: () => ipcRenderer.invoke('company:getInfo'),
    updateInfo: (data) => ipcRenderer.invoke('company:updateInfo', data)
  },

  // Database operations
  database: {
    backup: () => ipcRenderer.invoke('database:backup'),
    exportCSV: () => ipcRenderer.invoke('database:exportCSV')
  },

  // File operations
  file: {
    saveHTML: (title, content) => ipcRenderer.invoke('file:saveHTML', title, content)
  }
});

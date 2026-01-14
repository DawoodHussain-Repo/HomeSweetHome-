/**
 * Migration Scanner - File Detection and Import
 */
export class MigrationScanner {
  constructor() {
    this.files = [];
  }

  async scanFiles() {
    try {
      this.files = await window.api.legacy.scanFiles();
      return this.files;
    } catch (error) {
      console.error('Error scanning files:', error);
      throw error;
    }
  }

  async importFile(filePath, sourceType) {
    try {
      const result = await window.api.legacy.importBatch(filePath, sourceType);
      return result;
    } catch (error) {
      console.error('Error importing file:', error);
      throw error;
    }
  }

  async getBatches() {
    try {
      return await window.api.legacy.getBatches();
    } catch (error) {
      console.error('Error loading batches:', error);
      throw error;
    }
  }

  async getBatchDetails(batchId) {
    try {
      const [records, auditLog] = await Promise.all([
        window.api.legacy.getRawRecords(batchId),
        window.api.legacy.getAuditLog(batchId)
      ]);
      return { records, auditLog };
    } catch (error) {
      console.error('Error loading batch details:', error);
      throw error;
    }
  }
}

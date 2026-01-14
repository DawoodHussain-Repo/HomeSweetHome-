/**
 * Migration Validator - Batch Processing and Validation
 */
export class MigrationValidator {
  async normalizeRecords(batchId) {
    try {
      return await window.api.legacy.normalizeRecords(batchId);
    } catch (error) {
      console.error('Error normalizing records:', error);
      throw error;
    }
  }

  async validateBatch(batchId) {
    try {
      return await window.api.legacy.validateBatch(batchId);
    } catch (error) {
      console.error('Error validating batch:', error);
      throw error;
    }
  }

  async postBatch(batchId) {
    try {
      return await window.api.legacy.postBatch(batchId);
    } catch (error) {
      console.error('Error posting batch:', error);
      throw error;
    }
  }

  async getMappingRules() {
    try {
      return await window.api.legacy.getMappingRules();
    } catch (error) {
      console.error('Error loading mapping rules:', error);
      throw error;
    }
  }

  async createMappingRule(data) {
    try {
      return await window.api.legacy.createMappingRule(data);
    } catch (error) {
      console.error('Error creating mapping rule:', error);
      throw error;
    }
  }
}

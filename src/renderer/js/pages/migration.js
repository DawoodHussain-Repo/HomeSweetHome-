/**
 * Legacy Data Migration Page - Refactored
 */
import { MigrationScanner } from '../migration/MigrationScanner.js';
import { MigrationValidator } from '../migration/MigrationValidator.js';
import { MigrationUI } from '../migration/MigrationUI.js';
import { MigrationBatchUI } from '../migration/MigrationBatchUI.js';

const MigrationPage = {
  scanner: new MigrationScanner(),
  validator: new MigrationValidator(),
  batches: [],
  accounts: [],
  
  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = MigrationUI.renderMainLayout();
    
    this.accounts = await window.api.accounts.getAll();
    this.bindEvents();
    await this.loadBatches();
    await this.loadMappingRules();
  },
  
  bindEvents() {
    document.getElementById('btn-scan-files').addEventListener('click', () => this.scanFiles());
    document.getElementById('btn-add-mapping').addEventListener('click', () => this.openMappingForm());
    
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  },
  
  async scanFiles() {
    try {
      showLoading();
      const files = await this.scanner.scanFiles();
      document.getElementById('files-list').innerHTML = MigrationUI.renderFilesList(files);
    } catch (error) {
      Toast.error('Failed to scan for files');
    } finally {
      hideLoading();
    }
  },
  
  async importFile(filePath, sourceType) {
    try {
      showLoading();
      const result = await this.scanner.importFile(filePath, sourceType);
      
      if (result.success) {
        Toast.success(`Imported ${result.records_imported} records`);
        await this.loadBatches();
        document.querySelector('[data-tab="batches"]').click();
      } else {
        Toast.error(result.error || 'Import failed');
      }
    } catch (error) {
      Toast.error('Failed to import file');
    } finally {
      hideLoading();
    }
  },
  
  async loadBatches() {
    try {
      this.batches = await this.scanner.getBatches();
      document.getElementById('batches-list').innerHTML = MigrationUI.renderBatchesList(this.batches);
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  },
  
  async viewBatch(batchId) {
    try {
      showLoading();
      const { records, auditLog } = await this.scanner.getBatchDetails(batchId);
      const content = MigrationBatchUI.renderBatchDetails(batchId, records, auditLog);
      Modal.open(`Batch #${batchId}`, content, { size: 'xl' });
    } catch (error) {
      Toast.error('Failed to load batch details');
    } finally {
      hideLoading();
    }
  },
  
  async processBatch(batchId, action) {
    try {
      showLoading();
      let result;
      
      switch (action) {
        case 'normalize':
          result = await this.validator.normalizeRecords(batchId);
          if (result.success) {
            Toast.success(`Normalized ${result.normalized} records (${result.failed} failed)`);
          }
          break;
        case 'validate':
          result = await this.validator.validateBatch(batchId);
          if (result.success) {
            Toast.success(`Validated ${result.validated} records (${result.failed} failed)`);
          }
          break;
        case 'post':
          Modal.confirm('Are you sure you want to post these records as vouchers? This will create actual accounting entries.', async () => {
            showLoading();
            result = await this.validator.postBatch(batchId);
            if (result.success) {
              Toast.success(`Posted ${result.posted} vouchers (${result.failed} failed)`);
            } else {
              Toast.error(result.error || 'Posting failed');
            }
            await this.loadBatches();
            hideLoading();
          });
          hideLoading();
          return;
      }
      
      if (result && !result.success) {
        Toast.error(result.error || 'Operation failed');
      }
      
      await this.loadBatches();
    } catch (error) {
      Toast.error('Operation failed');
    } finally {
      hideLoading();
    }
  },
  
  async loadMappingRules() {
    try {
      const rules = await this.validator.getMappingRules();
      document.getElementById('mapping-rules').innerHTML = MigrationUI.renderMappingRules(rules);
    } catch (error) {
      console.error('Error loading mapping rules:', error);
    }
  },
  
  openMappingForm() {
    const content = MigrationUI.renderMappingForm(this.accounts);
    
    Modal.open('New Mapping Rule', content, {
      onOpen: () => {
        document.getElementById('mapping-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.saveMappingRule();
        });
      }
    });
  },
  
  async saveMappingRule() {
    const data = {
      legacy_text_pattern: document.getElementById('mapping-pattern').value,
      mapped_account_id: parseInt(document.getElementById('mapping-account').value),
      priority: parseInt(document.getElementById('mapping-priority').value) || 0,
      auto_apply: document.getElementById('mapping-auto').value === '1'
    };
    
    try {
      const result = await this.validator.createMappingRule(data);
      if (result.success) {
        Toast.success('Mapping rule created');
        Modal.close();
        await this.loadMappingRules();
      } else {
        Toast.error(result.error || 'Failed to create rule');
      }
    } catch (error) {
      Toast.error('Failed to create rule');
    }
  }
};

export default MigrationPage;

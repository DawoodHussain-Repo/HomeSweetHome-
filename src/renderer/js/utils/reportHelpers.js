/**
 * Report Helper Functions
 */

export async function executeReport(fetchData, renderData, printData) {
  try {
    showLoading();
    const data = await fetchData();
    if (renderData) renderData(data);
    if (printData) printData(data);
  } catch (err) {
    Toast.error(err.message || "Failed to generate report");
  } finally {
    hideLoading();
  }
}

export function findAccount(accounts, accountName) {
  // Try to find by name first
  let account = accounts.find(a => a.account_name.toLowerCase() === accountName.toLowerCase());
  
  // If not found, try to find by account_id from dataset
  if (!account) {
    const ledgerInput = document.getElementById("ledger-account-input");
    const voucherInput = document.getElementById("v-account-input");
    
    if (ledgerInput && ledgerInput.dataset.accountId) {
      account = accounts.find(a => a.account_id == ledgerInput.dataset.accountId);
    } else if (voucherInput && voucherInput.dataset.accountId) {
      account = accounts.find(a => a.account_id == voucherInput.dataset.accountId);
    }
  }
  
  return account;
}

/**
 * Voucher Action Handlers for Reports page
 */

export function viewVoucher(voucherId) {
  // Navigate to manage voucher page and search
  window.App.navigate('manage-voucher');
  setTimeout(async () => {
    const voucher = await window.api.vouchers.getById(voucherId);
    if (voucher) {
      document.getElementById('manage-voucher-number').value = voucher.voucher_number;
      document.getElementById('btn-search-voucher').click();
    }
  }, 100);
}

export function editVoucher(voucherId) {
  viewVoucher(voucherId);
}

export async function deleteVoucher(voucherId, refreshCallback) {
  Modal.confirm('Are you sure you want to delete this voucher?', async () => {
    try {
      showLoading();
      const result = await window.api.vouchers.delete(voucherId);
      if (result.success) {
        Toast.success('Voucher deleted');
        if (refreshCallback) refreshCallback();
      } else {
        Toast.error(result.error || 'Failed to delete voucher');
      }
    } catch (err) {
      Toast.error('Failed to delete voucher');
      console.error(err);
    } finally {
      hideLoading();
    }
  });
}

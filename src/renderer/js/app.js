/**
 * Main Application Controller
 */
import VouchersPage from './pages/vouchers.js';
import AccountsPage from './pages/accounts.js';
import ReportsPage from './pages/reports.js';
import CalculatorPage from './pages/calculator.js';
import ManageVoucherPage from './pages/manageVoucher.js';

const App = {
  currentPage: "vouchers",

  pages: {
    vouchers: VouchersPage,
    accounts: AccountsPage,
    reports: ReportsPage,
    settings: SettingsPage,
    calculator: CalculatorPage,
    'manage-voucher': ManageVoucherPage,
  },

  init() {
    this.bindNavigation();
    this.navigate("vouchers");
  },

  bindNavigation() {
    document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigate(page);
      });
    });
  },

  async navigate(page) {
    if (!this.pages[page]) {
      console.error(`Page not found: ${page}`);
      return;
    }

    // Cleanup previous page if it has cleanup method
    const prevPage = this.pages[this.currentPage];
    if (prevPage && typeof prevPage.cleanup === 'function') {
      prevPage.cleanup();
    }

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    // Render page
    this.currentPage = page;
    try {
      await this.pages[page].render();
    } catch (error) {
      console.error(`Error rendering page ${page}:`, error);
      document.getElementById("page-content").innerHTML = `
        <div class="card">
          <div class="empty-state">
            <h3>Error loading page</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Reload App</button>
          </div>
        </div>
      `;
    }
  },
};

// Make App globally available
window.App = App;

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  try {
    App.init();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; padding: 20px;">
        <div style="text-align: center; max-width: 500px;">
          <h1 style="color: #dc2626; margin-bottom: 16px;">Failed to Start</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">${error.message}</p>
          <button onclick="location.reload()" style="padding: 12px 24px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">Reload Application</button>
        </div>
      </div>
    `;
  }
});

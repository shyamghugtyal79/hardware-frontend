// Global Configuration & State
const API_URL = ''; // Relative path, runs on same port

// Currency Formatter Utility
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Format Date Utility
function formatDate(dateString, includeTime = false) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  if (includeTime) {
    options.hour = '2-digit',
    options.minute = '2-digit'
  }
  return date.toLocaleDateString('en-IN', options);
}

// Navigation Controller
function navigateToSection(sectionId, filterParam = null) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  // Show target section
  const targetSection = document.getElementById(`section-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Deactivate all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Activate matching nav item
  const activeNav = document.getElementById(`nav-${sectionId}`);
  if (activeNav) {
    activeNav.classList.add('active');
  }

  // Update header text based on section
  const sectionTitles = {
    dashboard: { title: 'Dashboard', subtitle: 'Real-time store metrics and overview' },
    pos: { title: 'Billing Point of Sale', subtitle: 'Quick checkouts and printable invoices' },
    bills: { title: 'Bills Ledger', subtitle: 'Track historical sales and client credits' },
    notepad: { title: 'Notepad & Ledger', subtitle: 'Informal customer debts and scratch reminders' },
    inventory: { title: 'Inventory Database', subtitle: 'Manage hardware products, pricing, and stocks' }
  };

  const info = sectionTitles[sectionId] || { title: 'Shree Shyam Hardware', subtitle: '' };
  document.getElementById('current-section-title').textContent = info.title;
  document.getElementById('current-section-subtitle').textContent = info.subtitle;

  // Trigger reloading of specific sections
  if (sectionId === 'dashboard') {
    if (typeof loadDashboardReports === 'function') loadDashboardReports();
  } else if (sectionId === 'pos') {
    // Focus Item ID input
    const itemIdInput = document.getElementById('pos-item-id-input');
    if (itemIdInput) itemIdInput.focus();
  } else if (sectionId === 'bills') {
    if (typeof loadBillsLedger === 'function') loadBillsLedger(filterParam);
  } else if (sectionId === 'notepad') {
    if (typeof loadNotesAndLedgers === 'function') loadNotesAndLedgers();
  } else if (sectionId === 'inventory') {
    if (typeof loadInventoryTable === 'function') loadInventoryTable();
  }
}

// Update Header Live Clock
function updateClock() {
  const dtElement = document.getElementById('header-datetime');
  if (dtElement) {
    const now = new Date();
    dtElement.textContent = now.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup Live Clock
  updateClock();
  setInterval(updateClock, 1000);

  // 2. Setup Nav Event Listeners
  const sidebar = document.querySelector('.sidebar');
  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('href').substring(1);
      navigateToSection(sectionId);
      
      // Close sidebar drawer on mobile after nav tap
      if (sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });

  // Mobile Navigation Toggle Buttons
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
  }

  if (sidebarCloseBtn && sidebar) {
    sidebarCloseBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // 3. Theme Toggle Setup
  const themeBtn = document.getElementById('theme-toggle-btn');
  const htmlRoot = document.documentElement;

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  htmlRoot.setAttribute('data-theme', savedTheme);
  updateThemeButtonUI(savedTheme);

  themeBtn.addEventListener('click', () => {
    const currentTheme = htmlRoot.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlRoot.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButtonUI(newTheme);
    
    // Redraw charts if available to match colors
    if (typeof loadDashboardReports === 'function' && document.getElementById('section-dashboard').classList.contains('active')) {
      loadDashboardReports();
    }
  });

  function updateThemeButtonUI(theme) {
    if (theme === 'dark') {
      themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>Light Mode</span>';
    } else {
      themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>';
    }
  }

  // Load default section (Dashboard)
  navigateToSection('dashboard');
});

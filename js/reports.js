// Reports & Analytics State
let dashboardChart = null;

// DOM Elements
const metricRevenue = document.getElementById('metric-revenue');
const metricProfit = document.getElementById('metric-profit');
const profitPercentageSub = document.getElementById('profit-percentage-sub');
const metricUnpaid = document.getElementById('metric-unpaid');
const unpaidBillsCount = document.getElementById('unpaid-bills-count');
const metricStockValue = document.getElementById('metric-stock-value');
const lowStockCount = document.getElementById('low-stock-count');

const dashboardUnpaidList = document.getElementById('dashboard-unpaid-list');
const topProductsTbody = document.getElementById('top-products-tbody');

// ----------------------------------------------------
// Dashboard Loading Logic
// ----------------------------------------------------

async function loadDashboardReports() {
  try {
    // 1. Fetch sales reports summary
    const reportsRes = await fetch('/api/bills/reports');
    const data = await reportsRes.json();

    // 2. Fetch inventory status (for low stock counts and total inventory items)
    const inventoryRes = await fetch('/api/products');
    const products = await inventoryRes.json();

    // 3. Render Metric Cards
    renderMetricCards(data.summary, products);

    // 4. Render Chart.js
    renderPLChart(data.dailyReports);

    // 5. Render Recent Unpaid Bills Sidebar
    renderDashboardUnpaid(data.summary.totalUnpaid);

    // 6. Render Top Products Table
    renderTopProducts(data.topProducts);

  } catch (err) {
    console.error('Error loading dashboard analytics:', err);
  }
}

// 1. Update Metric Cards UI
function renderMetricCards(summary, products) {
  metricRevenue.textContent = formatCurrency(summary.totalSales);
  metricProfit.textContent = formatCurrency(summary.netProfit);

  // Profit Margin
  const marginPercent = summary.totalSales > 0 
    ? Math.round((summary.netProfit / summary.totalSales) * 100) 
    : 0;
  profitPercentageSub.textContent = `Net Margin: ${marginPercent}%`;

  // Outstanding Dues
  metricUnpaid.textContent = formatCurrency(summary.totalUnpaid);

  // Stock values
  let totalStockCount = 0;
  let lowStockItemCount = 0;
  products.forEach(p => {
    totalStockCount += p.stock;
    if (p.stock <= 5) {
      lowStockItemCount++;
    }
  });

  metricStockValue.textContent = Number(totalStockCount).toFixed(2);
  lowStockCount.textContent = `${lowStockItemCount} Low Stock Items`;
  
  // Color the stock subtext red if there are low stock items
  if (lowStockItemCount > 0) {
    lowStockCount.className = 'subtext text-danger';
    lowStockCount.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${lowStockItemCount} Low Stock Items`;
  } else {
    lowStockCount.className = 'subtext';
    lowStockCount.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Stock levels healthy`;
  }
}

// 2. Render Profit & Loss Chart.js Chart
function renderPLChart(dailyReports) {
  const ctx = document.getElementById('pl-chart').getContext('2d');
  
  // Destroy existing chart if it exists to avoid overlapping canvases
  if (dashboardChart) {
    dashboardChart.destroy();
  }

  // Get active theme variables
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#334155' : '#cbd5e1';
  const labelColor = isDark ? '#94a3b8' : '#475569';
  
  // Format labels & values
  const labels = dailyReports.map(day => formatDate(day.date));
  const salesData = dailyReports.map(day => day.sales);
  const profitData = dailyReports.map(day => day.profit);

  // Create Chart
  dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Revenue (₹)',
          data: salesData,
          backgroundColor: 'rgba(59, 130, 246, 0.45)', // soft transparent blue
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 4,
          order: 2
        },
        {
          label: 'Net Profit (₹)',
          data: profitData,
          type: 'line',
          backgroundColor: 'transparent',
          borderColor: '#10b981', // emerald green
          borderWidth: 3,
          pointBackgroundColor: '#10b981',
          pointHoverRadius: 7,
          tension: 0.35,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: labelColor,
            font: { family: 'Outfit', size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { 
            color: labelColor, 
            font: { family: 'Outfit' },
            callback: function(value) {
              return '₹' + value;
            }
          }
        }
      }
    }
  });
}

// 3. Render Unpaid Ledger Sidebar on Dashboard
async function renderDashboardUnpaid(totalUnpaid) {
  try {
    const res = await fetch('/api/bills?status=unpaid');
    const unpaidBills = await res.json();
    
    const resPartial = await fetch('/api/bills?status=partially_paid');
    const partialBills = await resPartial.json();
    
    // Combine and sort by date descending
    const pendingBills = [...unpaidBills, ...partialBills].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update count subtext card
    unpaidBillsCount.textContent = `${pendingBills.length} Pending Invoices`;

    if (pendingBills.length === 0) {
      dashboardUnpaidList.innerHTML = `
        <li class="loading-item" style="text-align: center; color: var(--text-muted); cursor: default;">
          <i class="fa-solid fa-thumbs-up text-success" style="font-size: 1.5rem; margin-bottom: 8px; display:block;"></i>
          All bills cleared! No pending dues.
        </li>
      `;
      return;
    }

    let html = '';
    // Show top 5 pending
    pendingBills.slice(0, 5).forEach(bill => {
      const due = bill.finalAmount - bill.paidAmount;
      html += `
        <li class="activity-item" onclick="navigateToSection('bills'); setTimeout(() => showBillDetails('${bill._id}'), 200)" style="cursor:pointer;">
          <div class="activity-info">
            <h4>${bill.billNumber} - ${bill.customerName}</h4>
            <span>Due Date: ${formatDate(bill.date)} | ${bill.paymentStatus.replace('_', ' ')}</span>
          </div>
          <span class="activity-amount">${formatCurrency(due)}</span>
        </li>
      `;
    });
    
    dashboardUnpaidList.innerHTML = html;
  } catch (err) {
    console.error('Error fetching dashboard unpaid list:', err);
    dashboardUnpaidList.innerHTML = '<li class="loading-item text-danger">Error fetching dues.</li>';
  }
}

// 4. Render Top Selling Products Table
function renderTopProducts(topProducts) {
  if (topProducts.length === 0) {
    topProductsTbody.innerHTML = '<tr><td colspan="4" class="text-center">No sales data recorded yet.</td></tr>';
    return;
  }

  let html = '';
  topProducts.forEach(prod => {
    html += `
      <tr>
        <td>
          <div style="font-weight: 600;">${prod.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Barcode: ${prod.barcode}</div>
        </td>
        <td class="text-right" style="font-weight: 600;">${Number(prod.quantitySold).toFixed(2)}</td>
        <td class="text-right">${formatCurrency(prod.revenue)}</td>
        <td class="text-right text-success" style="font-weight: 600;">${formatCurrency(prod.profit)}</td>
      </tr>
    `;
  });

  topProductsTbody.innerHTML = html;
}

// Bills Ledger State Management
let ledgerBills = [];
let activeBill = null;
let currentFilter = 'all';

// DOM Elements
const billsLedgerList = document.getElementById('bills-ledger-list');
const billSearch = document.getElementById('bill-search');
const billDetailsEmpty = document.getElementById('bill-details-empty');
const billDetailsActive = document.getElementById('bill-details-active');

// Invoice elements
const invCustName = document.getElementById('inv-cust-name');
const invCustPhone = document.getElementById('inv-cust-phone');
const invNumber = document.getElementById('inv-number');
const invDate = document.getElementById('inv-date');
const invPaymentBadge = document.getElementById('inv-payment-badge');
const invoiceItemsTbody = document.getElementById('invoice-items-tbody');
const invNotes = document.getElementById('inv-notes');
const invSubtotal = document.getElementById('inv-subtotal');
const invDiscount = document.getElementById('inv-discount');
const invGrandTotal = document.getElementById('inv-grand-total');
const invPaidAmount = document.getElementById('inv-paid-amount');
const invDueRow = document.getElementById('inv-due-row');
const invDueAmount = document.getElementById('inv-due-amount');

// Payment Modal Elements
const paymentModal = document.getElementById('payment-modal');
const paymentModalClose = document.getElementById('payment-modal-close');
const paymentCollectionForm = document.getElementById('payment-collection-form');
const paymentCollectCancel = document.getElementById('payment-collect-cancel');
const paymentBillId = document.getElementById('payment-bill-id');
const paymentModalBillNum = document.getElementById('payment-modal-bill-num');
const paymentModalCustomer = document.getElementById('payment-modal-customer');
const paymentModalDueVal = document.getElementById('payment-modal-due-val');
const paymentCollectAmount = document.getElementById('payment-collect-amount');
const btnCollectPayment = document.getElementById('btn-collect-payment');
const billPaymentActions = document.getElementById('bill-payment-actions');

// ----------------------------------------------------
// Bills Ledger Core
// ----------------------------------------------------

// Load & Filter Invoices
async function loadBillsLedger(filterStatus = null) {
  if (filterStatus) {
    currentFilter = filterStatus;
    // Highlight correct filter tab button
    document.querySelectorAll('.filter-buttons button[data-filter]').forEach(btn => {
      if (btn.getAttribute('data-filter') === filterStatus) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  const searchVal = billSearch.value.trim();
  let url = '/api/bills';
  
  const queryParams = [];
  if (currentFilter && currentFilter !== 'all') {
    queryParams.push(`status=${currentFilter}`);
  }
  if (searchVal) {
    queryParams.push(`customer=${encodeURIComponent(searchVal)}`);
  }
  
  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&');
  }

  try {
    billsLedgerList.innerHTML = `
      <li class="loading-item" style="cursor: default; text-align: center; padding: 40px 0;">
        <div class="spinner-container" style="padding: 0;">
          <div class="spinner"></div>
          <div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">Loading invoices... / बिल लोड हो रहे हैं...</div>
        </div>
      </li>
    `;
    
    const res = await fetch(url);
    ledgerBills = await res.json();

    if (ledgerBills.length === 0) {
      billsLedgerList.innerHTML = '<li class="loading-item" style="cursor: default; text-align: center;">No invoices found</li>';
      return;
    }

    let html = '';
    ledgerBills.forEach(bill => {
      let statusClass = 'badge-success';
      if (bill.paymentStatus === 'unpaid') statusClass = 'badge-danger';
      if (bill.paymentStatus === 'partially_paid') statusClass = 'badge-info';

      const itemText = bill.items.length === 1 ? '1 item' : `${bill.items.length} items`;
      
      html += `
        <li class="bill-list-item ${activeBill && activeBill._id === bill._id ? 'active' : ''}" 
            onclick="showBillDetails('${bill._id}')" id="bill-li-${bill._id}">
          <div class="bill-info">
            <h4>${bill.billNumber}</h4>
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); margin: 2px 0;">${bill.customerName}</div>
            <span>${formatDate(bill.date)} | ${itemText}</span>
          </div>
          <div class="bill-status-amount">
            <span class="amount">${formatCurrency(bill.finalAmount)}</span>
            <span class="badge ${statusClass}">${bill.paymentStatus.replace('_', ' ')}</span>
          </div>
        </li>
      `;
    });

    billsLedgerList.innerHTML = html;
  } catch (err) {
    console.error('Error fetching bills:', err);
    billsLedgerList.innerHTML = '<li class="loading-item text-danger">Error loading ledger.</li>';
  }
}

// Search and Filter Button triggers
billSearch.addEventListener('input', () => {
  clearTimeout(window.billSearchTimer);
  window.billSearchTimer = setTimeout(() => {
    loadBillsLedger();
  }, 300);
});

document.querySelectorAll('.filter-buttons button[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-buttons button[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadBillsLedger(btn.getAttribute('data-filter'));
  });
});

// Show Bill Details in Right Pane
window.showBillDetails = function(id) {
  // Highlight active item in list
  document.querySelectorAll('.bill-list-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeLi = document.getElementById(`bill-li-${id}`);
  if (activeLi) activeLi.classList.add('active');

  const bill = ledgerBills.find(b => b._id === id);
  if (!bill) return;

  activeBill = bill;

  // Fill details
  invCustName.textContent = bill.customerName;
  invCustPhone.textContent = bill.customerPhone ? `Phone: ${bill.customerPhone}` : 'Phone: N/A';
  invNumber.textContent = bill.billNumber;
  invDate.textContent = formatDate(bill.date, true);
  invNotes.textContent = bill.notes || 'No comments.';

  // Badge Status Styling (Safe fallback)
  if (invPaymentBadge) {
    invPaymentBadge.textContent = bill.paymentStatus.replace('_', ' ');
    invPaymentBadge.className = 'badge'; // reset
    if (bill.paymentStatus === 'paid') invPaymentBadge.classList.add('badge-success');
    else if (bill.paymentStatus === 'unpaid') invPaymentBadge.classList.add('badge-danger');
    else invPaymentBadge.classList.add('badge-info');
  }

  // Toggle Print Status Checkboxes
  const chkPaidIcon = document.getElementById('inv-chk-paid-icon');
  const chkUnpaidIcon = document.getElementById('inv-chk-unpaid-icon');
  if (chkPaidIcon && chkUnpaidIcon) {
    if (bill.paymentStatus === 'paid') {
      chkPaidIcon.className = 'fa-solid fa-square-check';
      chkUnpaidIcon.className = 'fa-regular fa-square';
    } else {
      chkPaidIcon.className = 'fa-regular fa-square';
      chkUnpaidIcon.className = 'fa-solid fa-square-check';
    }
  }

  // Load items (5 columns: S.No, Item Description, Quantity, Rate, Total)
  let itemsHtml = '';
  bill.items.forEach((item, idx) => {
    const nameDisplay = item.nameHindi ? `${item.name} / ${item.nameHindi}` : item.name;
    itemsHtml += `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>
          <div style="font-weight: 600;">${nameDisplay}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Item ID: ${item.itemId || 'N/A'}</div>
        </td>
        <td class="text-center">${Number(item.quantity).toFixed(2)} ${item.unit || 'pcs'}</td>
        <td class="text-right">${formatCurrency(item.sellingPrice)}</td>
        <td class="text-right" style="font-weight: 700;">${formatCurrency(item.subtotal)}</td>
      </tr>
    `;
  });
  invoiceItemsTbody.innerHTML = itemsHtml;

  // Maths
  invSubtotal.textContent = formatCurrency(bill.totalAmount);
  invDiscount.textContent = `- ${formatCurrency(bill.discount)}`;
  invGrandTotal.textContent = formatCurrency(bill.finalAmount);
  invPaidAmount.textContent = formatCurrency(bill.paidAmount);

  // Due details
  if (bill.unpaidAmount > 0) {
    invDueRow.style.display = 'flex';
    invDueAmount.textContent = formatCurrency(bill.unpaidAmount);
    
    // Show Collect Balance action
    billPaymentActions.style.display = 'block';
  } else {
    invDueRow.style.display = 'none';
    billPaymentActions.style.display = 'none';
  }

  // Switch panels
  billDetailsEmpty.style.display = 'none';
  billDetailsActive.style.display = 'flex';

  // Smooth scroll details card into view on mobile screens
  if (window.innerWidth <= 768) {
    const detailsCard = document.querySelector('.ledger-detail');
    if (detailsCard) {
      detailsCard.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

// Print Invoice
window.printActiveInvoice = function() {
  if (!activeBill) return;
  window.print();
};

// ----------------------------------------------------
// Collect Payment Modals
// ----------------------------------------------------

btnCollectPayment.addEventListener('click', () => {
  if (!activeBill) return;

  paymentBillId.value = activeBill._id;
  paymentModalBillNum.textContent = activeBill.billNumber;
  paymentModalCustomer.textContent = activeBill.customerName;
  paymentModalDueVal.textContent = formatCurrency(activeBill.unpaidAmount);
  paymentCollectAmount.value = activeBill.unpaidAmount; // default to full due amount
  paymentCollectAmount.max = activeBill.unpaidAmount;

  paymentModal.classList.add('active');
  setTimeout(() => paymentCollectAmount.focus(), 100);
});

paymentModalClose.addEventListener('click', () => {
  paymentModal.classList.remove('active');
});

paymentCollectCancel.addEventListener('click', () => {
  paymentModal.classList.remove('active');
});

// Close modal if clicked outside
window.addEventListener('click', (e) => {
  if (e.target === paymentModal) {
    paymentModal.classList.remove('active');
  }
});

// Submit payment
paymentCollectionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const billId = paymentBillId.value;
  const amount = Number(paymentCollectAmount.value) || 0;

  if (amount <= 0) {
    alert('Please enter a valid payment amount greater than zero.');
    return;
  }

  if (amount > activeBill.unpaidAmount) {
    alert(`Cannot collect more than the outstanding debt of ₹${activeBill.unpaidAmount}`);
    return;
  }

  try {
    const res = await fetch(`/api/bills/${billId}/payment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ addPaidAmount: amount })
    });

    const updatedBill = await res.json();
    if (!res.ok) {
      alert(`Payment failed: ${updatedBill.message}`);
      return;
    }

    paymentModal.classList.remove('active');
    alert('Outstanding balance collected successfully');
    
    // Reload active details and bills ledger list
    await loadBillsLedger();
    showBillDetails(updatedBill._id);
  } catch (err) {
    console.error('Error collecting payment:', err);
    alert('Server error occurred during payment processing.');
  }
});

// Edit selected bill in POS billing tab
window.editActiveBill = async function() {
  if (!activeBill) return;

  const confirmEdit = confirm(`Are you sure you want to edit Bill "${activeBill.billNumber}"? This will load the previous items and client details into the POS cart, and saving will update this invoice.`);
  if (!confirmEdit) return;

  try {
    const cartItems = [];
    for (let item of activeBill.items) {
      // Fetch fresh product info to get the actual stock
      const res = await fetch(`/api/products/${item.product}`);
      if (res.ok) {
        const product = await res.json();
        // Since saving reverts previous stock, allow editing up to (current stock + original quantity)
        cartItems.push({
          productId: product._id,
          name: product.name,
          nameHindi: product.nameHindi || '',
          itemId: product.itemId || '',
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          stock: product.stock + item.quantity,
          unit: product.unit || 'pcs',
          quantity: item.quantity
        });
      } else {
        // Fallback if product was deleted
        cartItems.push({
          productId: item.product,
          name: item.name,
          nameHindi: item.nameHindi || '',
          itemId: item.itemId || '',
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          stock: item.quantity,
          unit: 'pcs',
          quantity: item.quantity
        });
      }
    }

    if (typeof window.loadBillToPOS === 'function') {
      window.loadBillToPOS(activeBill, cartItems);
    } else {
      console.error('loadBillToPOS function not found on window');
      alert('Failed to load bill to POS.');
    }
  } catch (err) {
    console.error('Error loading bill to POS:', err);
    alert('Failed to load bill items for editing.');
  }
};

// Register print event listeners to set PDF output filenames dynamically
window.addEventListener('beforeprint', () => {
  let custName = 'Cash_Customer';
  let dateStr = '';
  
  if (window.activeBill) {
    custName = window.activeBill.customerName;
    const d = new Date(window.activeBill.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dateStr = `${dd}_${mm}_${yyyy}`;
  } else {
    const nameEl = document.getElementById('inv-cust-name');
    const dateEl = document.getElementById('inv-date');
    if (nameEl && nameEl.textContent) {
      custName = nameEl.textContent.trim();
    }
    if (dateEl && dateEl.textContent) {
      dateStr = dateEl.textContent.trim().replace(/\//g, '_');
    }
  }
  
  // Clean special characters and format spaces as underscores
  const cleanCustName = custName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
  const cleanDate = dateStr.replace(/[^a-zA-Z0-9_]/g, '');
  
  window.originalDocumentTitle = document.title;
  document.title = `${cleanCustName}_${cleanDate}`;
});

window.addEventListener('afterprint', () => {
  if (window.originalDocumentTitle) {
    document.title = window.originalDocumentTitle;
  }
});

// Delete selected bill and revert all stock/ledger details
window.deleteActiveBill = async function() {
  if (!activeBill) return;

  const confirmDelete = confirm(`Are you sure you want to permanently delete Bill "${activeBill.billNumber}"? This will delete the invoice, restore all product stock levels, and remove any associated customer debt logs.`);
  if (!confirmDelete) return;

  const btnDelete = document.getElementById('btn-delete-bill');
  const originalText = btnDelete ? btnDelete.innerHTML : 'Delete Bill';
  if (btnDelete) {
    btnDelete.disabled = true;
    btnDelete.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
  }

  try {
    const res = await fetch(`/api/bills/${activeBill._id}`, {
      method: 'DELETE'
    });

    const result = await res.json();
    if (!res.ok) {
      alert(`Delete failed: ${result.message}`);
      return;
    }

    alert('Bill deleted successfully. Inventory stock counts and ledger records have been reverted.');

    // Clear active detail selection and view placeholder
    activeBill = null;
    document.getElementById('bill-details-active').style.display = 'none';
    document.getElementById('bill-details-empty').style.display = 'block';

    // Reload list
    await loadBillsLedger();
  } catch (err) {
    console.error('Error deleting bill:', err);
    alert('Server error occurred during deletion.');
  } finally {
    if (btnDelete) {
      btnDelete.disabled = false;
      btnDelete.innerHTML = originalText;
    }
  }
};

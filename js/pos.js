// POS Page State Management
let posCart = [];
let editingBillId = null;

// DOM Elements
const posSearchInput = document.getElementById('pos-search-input');
const posSearchResults = document.getElementById('pos-search-results');
const posItemIdInput = document.getElementById('pos-item-id-input');
const posCartTbody = document.getElementById('pos-cart-tbody');

const posSubtotal = document.getElementById('pos-subtotal');
const posDiscountInput = document.getElementById('pos-discount-input');
const posGrandTotal = document.getElementById('pos-grand-total');
const posPaidAmount = document.getElementById('pos-paid-amount');
const posDuePreview = document.getElementById('pos-due-preview');
const posDueAmount = document.getElementById('pos-due-amount');

const posCustomerName = document.getElementById('pos-customer-name');
const posCustomerPhone = document.getElementById('pos-customer-phone');
const posBillNotes = document.getElementById('pos-bill-notes');

const posClearBtn = document.getElementById('pos-clear-btn');
const posCheckoutBtn = document.getElementById('pos-checkout-btn');

// ----------------------------------------------------
// POS Core Handlers
// ----------------------------------------------------

// Render Cart HTML
function renderPosCart() {
  if (posCart.length === 0) {
    posCartTbody.innerHTML = `
      <tr class="empty-cart-row">
        <td colspan="6" class="text-center">
          <div class="empty-cart-state">
            <i class="fa-solid fa-cart-shopping"></i>
            <p>Cart is empty. Select items from inventory, type ITEM-IDs, or search products to add them.</p>
          </div>
        </td>
      </tr>
    `;
    updatePricingSummary();
    return;
  }

  let html = '';
  posCart.forEach((item, index) => {
    const itemTotal = item.sellingPrice * item.quantity;
    const displayName = item.nameHindi ? `${item.name} / ${item.nameHindi}` : item.name;
    const unitLower = (item.unit || 'pcs').toLowerCase();

    let qtyControlHtml = `
      <div class="qty-counter" style="margin: 0 auto;">
        <button type="button" onclick="adjustItemQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
        <input type="number" value="${Number(item.quantity).toFixed(2)}" min="0.0001" step="any" onchange="setItemQty(${index}, this.value)" style="width: 70px;" id="pos-qty-main-${index}">
        <button type="button" onclick="adjustItemQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
      </div>
    `;

    // Show sub-unit helpers for kg (grams) and meter (cm)
    if (unitLower === 'kg') {
      const gramsValue = Math.round(item.quantity * 1000);
      qtyControlHtml += `
        <div style="margin-top: 6px; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <input type="number" value="${gramsValue}" min="1" step="1" oninput="setSubUnitQty(${index}, this.value, 'g')" style="width: 60px; padding: 2px 4px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.75rem; background: var(--bg-primary); color: var(--text-primary); text-align: center;" id="pos-qty-sub-${index}">
          <span style="color: var(--text-secondary);">g (ग्राम)</span>
        </div>
      `;
    } else if (unitLower === 'meter' || unitLower === 'm') {
      const cmValue = Math.round(item.quantity * 100);
      qtyControlHtml += `
        <div style="margin-top: 6px; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <input type="number" value="${cmValue}" min="1" step="1" oninput="setSubUnitQty(${index}, this.value, 'cm')" style="width: 60px; padding: 2px 4px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.75rem; background: var(--bg-primary); color: var(--text-primary); text-align: center;" id="pos-qty-sub-${index}">
          <span style="color: var(--text-secondary);">cm (सेमी)</span>
        </div>
      `;
    }

    let totalColHtml = '';
    if (unitLower === 'kg' || unitLower === 'meter' || unitLower === 'm') {
      totalColHtml = `
        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; width: 100%;">
          <span style="color: var(--text-secondary); font-size: 0.85rem;">₹</span>
          <input type="number" value="${itemTotal.toFixed(2)}" min="0.01" step="any" oninput="setRowPriceTarget(${index}, this.value)" style="width: 85px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.9rem; background: var(--bg-primary); color: var(--text-primary); text-align: right; font-weight: 700; font-family: inherit;" id="pos-row-price-${index}">
        </div>
      `;
    } else {
      totalColHtml = formatCurrency(itemTotal);
    }

    html += `
      <tr data-index="${index}">
        <td>
          <div style="font-weight: 600;">${displayName}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Item ID: ${item.itemId} | Stock: ${Number(item.stock).toFixed(2)}</div>
        </td>
        <td class="text-center"><span class="badge badge-info">${item.unit || 'pcs'}</span></td>
        <td class="text-right">${formatCurrency(item.sellingPrice)}</td>
        <td class="text-center">
          ${qtyControlHtml}
        </td>
        <td class="text-right" style="font-weight: 700; vertical-align: middle;">
          ${totalColHtml}
        </td>
        <td class="text-center">
          <button class="btn-note-action delete" onclick="removeFromCart(${index})" title="Remove item">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  posCartTbody.innerHTML = html;
  updatePricingSummary();
}

// Calculate Totals
function updatePricingSummary() {
  let subtotal = 0;
  posCart.forEach(item => {
    subtotal += item.sellingPrice * item.quantity;
  });

  const discount = Number(posDiscountInput.value) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const paid = Number(posPaidAmount.value) || 0;
  const due = Math.max(0, grandTotal - paid);

  posSubtotal.textContent = formatCurrency(subtotal);
  posGrandTotal.textContent = formatCurrency(grandTotal);

  if (paid < grandTotal && grandTotal > 0) {
    posDuePreview.style.display = 'flex';
    posDueAmount.textContent = formatCurrency(due);
  } else {
    posDuePreview.style.display = 'none';
  }
}

// Add product to cart
function addToCart(product) {
  // Check if product is already out of stock
  if (product.stock <= 0) {
    alert(`Cannot add. "${product.name}" is out of stock!`);
    return;
  }

  // Check if product already exists in cart
  const existingItemIndex = posCart.findIndex(item => item.productId === product._id);

  if (existingItemIndex > -1) {
    const newQty = posCart[existingItemIndex].quantity + 1;
    if (newQty > product.stock) {
      alert(`Only ${product.stock} units of "${product.name}" are available in stock. Cannot add more.`);
      return;
    }
    posCart[existingItemIndex].quantity = newQty;
  } else {
    posCart.push({
      productId: product._id,
      name: product.name,
      nameHindi: product.nameHindi || '',
      itemId: product.itemId || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      unit: product.unit,
      quantity: 1
    });
  }

  renderPosCart();
  
  // Clear inputs and refocus
  if (posItemIdInput) {
    posItemIdInput.value = '';
    posItemIdInput.focus();
  }
  posSearchInput.value = '';
  posSearchResults.style.display = 'none';
}

// Add multiple products to cart (from Inventory checkboxes selection)
window.addMultipleToCart = function(products) {
  let addedCount = 0;
  let skippedCount = 0;

  products.forEach(product => {
    if (product.stock <= 0) {
      skippedCount++;
      return;
    }

    const existingItemIndex = posCart.findIndex(item => item.productId === product._id);
    if (existingItemIndex > -1) {
      const newQty = posCart[existingItemIndex].quantity + 1;
      if (newQty <= product.stock) {
        posCart[existingItemIndex].quantity = newQty;
        addedCount++;
      } else {
        skippedCount++;
      }
    } else {
      posCart.push({
        productId: product._id,
        name: product.name,
        nameHindi: product.nameHindi || '',
        itemId: product.itemId || '',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        unit: product.unit,
        quantity: 1
      });
      addedCount++;
    }
  });

  renderPosCart();
  
  if (skippedCount > 0) {
    alert(`Added ${addedCount} items. Skipped ${skippedCount} items because they exceeded available stock limit.`);
  }
};

// Adjust quantity by increment/decrement
window.adjustItemQty = function(index, delta) {
  if (index < 0 || index >= posCart.length) return;
  const item = posCart[index];
  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(index);
  } else {
    if (newQty > item.stock) {
      alert(`Only ${item.stock} units of "${item.name}" are available in stock.`);
      return;
    }
    posCart[index].quantity = Math.round(newQty * 100) / 100; // avoid floating point inaccuracy
    renderPosCart();
  }
};

// Set manual quantity
window.setItemQty = function(index, value) {
  if (index < 0 || index >= posCart.length) return;
  const item = posCart[index];
  let qty = Number(value) || 1;
  if (qty <= 0) {
    removeFromCart(index);
  } else {
    if (qty > item.stock) {
      alert(`Only ${item.stock} units of "${item.name}" are available in stock. Capping quantity to maximum available.`);
      qty = item.stock;
    }
    posCart[index].quantity = qty;
    renderPosCart();
  }
};

// Convert and set sub-unit quantity (grams/cm) dynamically
window.setSubUnitQty = function(index, value, subUnit) {
  if (index < 0 || index >= posCart.length) return;
  const item = posCart[index];
  const numVal = Number(value) || 0;
  let newQty = 0;
  
  if (subUnit === 'g') {
    newQty = Math.round((numVal / 1000) * 10000) / 10000;
  } else if (subUnit === 'cm') {
    newQty = Math.round((numVal / 100) * 100) / 100;
  }
  
  // Stock limit check
  if (newQty > item.stock) {
    alert(`Only ${item.stock} ${item.unit} of "${item.name}" are available in stock. Capping to maximum available.`);
    newQty = item.stock;
    
    // Calculate corresponding capped sub-unit value to display
    const subInput = document.getElementById(`pos-qty-sub-${index}`);
    if (subInput) {
      if (subUnit === 'g') {
        subInput.value = Math.round(newQty * 1000);
      } else if (subUnit === 'cm') {
        subInput.value = Math.round(newQty * 100);
      }
    }
  }
  
  // Update memory
  posCart[index].quantity = newQty;
  
  // Update main quantity input value in DOM directly to keep focus
  const mainInput = document.getElementById(`pos-qty-main-${index}`);
  if (mainInput) {
    mainInput.value = newQty;
  }
  
  // Update item row subtotal input in DOM directly to keep focus
  const priceInput = document.getElementById(`pos-row-price-${index}`);
  if (priceInput) {
    priceInput.value = (item.sellingPrice * newQty).toFixed(2);
  } else {
    // Fallback for static text total cells
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (row) {
      const totalCell = row.querySelector('.text-right[style*="font-weight: 700"]');
      if (totalCell) {
        totalCell.textContent = formatCurrency(item.sellingPrice * newQty);
      }
    }
  }
  
  // Update footer pricing summary
  updatePricingSummary();
};

// Calculate and set weight/length according to target price
window.setRowPriceTarget = function(index, value) {
  if (index < 0 || index >= posCart.length) return;
  const item = posCart[index];
  let targetPrice = Number(value) || 0;
  
  if (targetPrice < 0) {
    targetPrice = 0;
  }
  
  let newQty = targetPrice / item.sellingPrice;
  
  // Stock limit check
  if (newQty > item.stock) {
    alert(`Only ${item.stock} ${item.unit} of "${item.name}" are available in stock. Capping price to ₹${(item.stock * item.sellingPrice).toFixed(2)}.`);
    newQty = item.stock;
    targetPrice = item.stock * item.sellingPrice;
    
    // Reset price input field value itself since it was capped
    const priceInput = document.getElementById(`pos-row-price-${index}`);
    if (priceInput) {
      priceInput.value = targetPrice.toFixed(2);
    }
  }
  
  // Update memory
  item.quantity = newQty;
  
  // Update main quantity input value in DOM directly
  const mainInput = document.getElementById(`pos-qty-main-${index}`);
  if (mainInput) {
    mainInput.value = Math.round(newQty * 10000) / 10000;
  }
  
  // Update sub-unit input value in DOM directly
  const subInput = document.getElementById(`pos-qty-sub-${index}`);
  if (subInput) {
    const unitLower = (item.unit || 'pcs').toLowerCase();
    if (unitLower === 'kg') {
      subInput.value = Math.round(newQty * 1000);
    } else if (unitLower === 'meter' || unitLower === 'm') {
      subInput.value = Math.round(newQty * 100);
    }
  }
  
  // Update footer pricing summary
  updatePricingSummary();
};

// Remove from cart
window.removeFromCart = function(index) {
  if (index < 0 || index >= posCart.length) return;
  posCart.splice(index, 1);
  renderPosCart();
};

// ----------------------------------------------------
// Search and Scanner Events
// ----------------------------------------------------

// Database search items dropdown
posSearchInput.addEventListener('input', async () => {
  const query = posSearchInput.value.trim();
  if (query.length < 1) {
    posSearchResults.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`);
    const products = await res.json();

    if (products.length === 0) {
      posSearchResults.innerHTML = '<div class="search-result-item" style="cursor: default;">No matching products found</div>';
      posSearchResults.style.display = 'block';
      return;
    }

    let html = '';
    products.forEach(prod => {
      const displayId = prod.itemId || 'N/A';
      html += `
        <div class="search-result-item" data-id="${prod._id}">
          <div class="item-details">
            <span class="item-name">${prod.name}</span>
            <span class="item-meta">Category: ${prod.category} | Item ID: ${displayId} | Stock: ${prod.stock}</span>
          </div>
          <span class="item-price">${formatCurrency(prod.sellingPrice)}</span>
        </div>
      `;
    });

    posSearchResults.innerHTML = html;
    posSearchResults.style.display = 'block';

    // Click handler for search items
    document.querySelectorAll('.search-result-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        const prodId = item.getAttribute('data-id');
        const selectedProd = products.find(p => p._id === prodId);
        if (selectedProd) {
          addToCart(selectedProd);
        }
      });
    });

  } catch (err) {
    console.error('Error searching products:', err);
  }
});

// Hide search dropdown if clicked outside
document.addEventListener('click', (e) => {
  if (!posSearchInput.contains(e.target) && !posSearchResults.contains(e.target)) {
    posSearchResults.style.display = 'none';
  }
});

// Item ID input Enter press (manual entry)
if (posItemIdInput) {
  posItemIdInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const itemId = posItemIdInput.value.trim();
      if (!itemId) return;

      try {
        const res = await fetch(`/api/products/itemid/${encodeURIComponent(itemId)}`);
        
        if (res.status === 404) {
          alert(`Product with Item ID "${itemId.toUpperCase()}" not found in database. Create it in the Inventory section first.`);
          posItemIdInput.value = '';
          return;
        }
        
        const product = await res.json();
        addToCart(product);
      } catch (err) {
        console.error('Error fetching by Item ID:', err);
      }
    }
  });
}

// ----------------------------------------------------
// Checkout Handlers
// ----------------------------------------------------

posDiscountInput.addEventListener('input', updatePricingSummary);
posPaidAmount.addEventListener('input', updatePricingSummary);

// Convert unpaid due to discount automatically
const posConvertDueBtn = document.getElementById('pos-convert-due-discount');
if (posConvertDueBtn) {
  posConvertDueBtn.addEventListener('click', () => {
    const subtotalText = posSubtotal.textContent.replace('₹', '').replace(',', '');
    const subtotal = Number(subtotalText) || 0;
    
    const paid = Number(posPaidAmount.value) || 0;
    const currentDiscount = Number(posDiscountInput.value) || 0;
    
    const unpaid = Math.max(0, (subtotal - currentDiscount) - paid);
    if (unpaid <= 0) return;
    
    // Convert to discount
    const newDiscount = currentDiscount + unpaid;
    posDiscountInput.value = newDiscount;
    
    // Recalculate totals
    updatePricingSummary();
  });
}

// Clear POS Cart State
posClearBtn.addEventListener('click', () => {
  if (posCart.length === 0) return;
  if (confirm('Are you sure you want to clear the current cart?')) {
    clearCart();
  }
});

function clearCart() {
  posCart = [];
  editingBillId = null;
  posCustomerName.value = 'Cash Customer';
  posCustomerPhone.value = '';
  posDiscountInput.value = '0';
  posPaidAmount.value = '0';
  posBillNotes.value = '';
  
  const sectionTitle = document.getElementById('current-section-title');
  if (sectionTitle) {
    sectionTitle.textContent = 'Billing POS';
  }
  
  renderPosCart();
}

// Submit transaction
posCheckoutBtn.addEventListener('click', async () => {
  if (posCart.length === 0) {
    alert('Cannot generate empty bill. Please select or add items first.');
    return;
  }

  const items = posCart.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  }));

  const customerName = posCustomerName.value.trim() || 'Cash Customer';
  const customerPhone = posCustomerPhone.value.trim();
  const discount = Number(posDiscountInput.value) || 0;
  const paidAmount = Number(posPaidAmount.value) || 0;
  const notes = posBillNotes.value.trim();

  // Validate paid amount isn't negative
  if (paidAmount < 0) {
    alert('Paid amount cannot be negative.');
    return;
  }

  const checkoutData = {
    customerName,
    customerPhone,
    items,
    discount,
    paidAmount,
    notes
  };

  try {
    const url = editingBillId ? `/api/bills/${editingBillId}` : '/api/bills';
    const method = editingBillId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });

    const result = await res.json();
    if (!res.ok) {
      alert(`Checkout failed: ${result.message}`);
      return;
    }

    // Checkout successful!
    const successMsg = editingBillId 
      ? `Bill Updated Successfully: ${result.billNumber}`
      : `Bill Generated Successfully: ${result.billNumber}`;
      
    alert(successMsg);

    // Clear POS cart
    clearCart();

    // Navigate to Bills Ledger, select the newly generated bill and print it!
    navigateToSection('bills');
    if (typeof showBillDetails === 'function') {
      // Trigger loader and select new invoice
      await loadBillsLedger();
      showBillDetails(result._id);
      
      // Auto-trigger invoice print dialog after a tiny delay to allow DOM render
      setTimeout(() => {
        if (typeof window.printActiveInvoice === 'function') {
          window.printActiveInvoice();
        } else {
          console.error('printActiveInvoice function not found on window');
        }
      }, 500);
    }

  } catch (err) {
    console.error('Error checking out:', err);
    alert('Server error occurred during checkout.');
  }
});

// Load existing bill to POS cart for editing
window.loadBillToPOS = function(bill, cartItems) {
  posCart = cartItems;
  editingBillId = bill._id;
  
  // Fill customer info
  posCustomerName.value = bill.customerName;
  posCustomerPhone.value = bill.customerPhone || '';
  posDiscountInput.value = bill.discount;
  posPaidAmount.value = bill.paidAmount;
  posBillNotes.value = bill.notes || '';
  
  // Show active bill indicator or title
  const sectionTitle = document.getElementById('current-section-title');
  if (sectionTitle) {
    sectionTitle.innerHTML = `Billing POS <span style="font-size: 0.9rem; color: var(--accent); font-weight: 700;">(Editing ${bill.billNumber})</span>`;
  }
  
  // Switch to POS tab
  const posNavLink = document.getElementById('nav-pos');
  if (posNavLink) {
    posNavLink.click();
  }
  
  renderPosCart();
};

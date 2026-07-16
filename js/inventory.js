// Inventory Section State Management
let inventoryProducts = [];
let selectedProductIds = new Set();
let isHindiEditedManually = false;

// DOM Elements
const inventorySearch = document.getElementById('inventory-search');
const inventoryTableTbody = document.getElementById('inventory-table-tbody');
const inventoryAddProductBtn = document.getElementById('inventory-add-product-btn');
const inventoryGoToPosBtn = document.getElementById('inventory-go-to-pos-btn');
const selectCountSpan = document.getElementById('select-count');
const selectAllCheckbox = document.getElementById('inventory-select-all');

// Form Modal Elements
const productModal = document.getElementById('product-modal');
const productModalTitle = document.getElementById('product-modal-title');
const productModalClose = document.getElementById('product-modal-close');
const productForm = document.getElementById('product-form');
const formCancelBtn = document.getElementById('form-cancel-btn');

const formProductId = document.getElementById('form-product-id');
const formProductName = document.getElementById('form-product-name');
const formProductNameHindi = document.getElementById('form-product-name-hindi');
const formProductCategory = document.getElementById('form-product-category');
const formProductUnit = document.getElementById('form-product-unit');
const formProductCostPrice = document.getElementById('form-product-cost-price');
const formProductSellingPrice = document.getElementById('form-product-selling-price');
const formProductStock = document.getElementById('form-product-stock');
const formProductDescription = document.getElementById('form-product-description');
const formProductItemId = document.getElementById('form-product-item-id');

// ----------------------------------------------------
// Inventory Core Operations
// ----------------------------------------------------

// Load & Render Inventory Table
async function loadInventoryTable() {
  const query = inventorySearch.value.trim();
  let url = '/api/products';
  if (query) {
    url += `?search=${encodeURIComponent(query)}`;
  }

  try {
    inventoryTableTbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center" style="padding: 40px 0;">
          <div class="spinner-container" style="padding: 0;">
            <div class="spinner"></div>
            <div style="margin-top: 8px; font-size: 0.9rem; color: var(--text-secondary);">Loading inventory database... / डेटा लोड हो रहा है...</div>
          </div>
        </td>
      </tr>
    `;
    
    const res = await fetch(url);
    inventoryProducts = await res.json();

    if (inventoryProducts.length === 0) {
      inventoryTableTbody.innerHTML = '<tr><td colspan="10" class="text-center">No products found in inventory.</td></tr>';
      updateSelectButtonUI();
      return;
    }

    let html = '';
    inventoryProducts.forEach(prod => {
      // Determine stock status
      let stockClass = 'in-stock';
      let stockText = 'In Stock';
      if (prod.stock <= 0) {
        stockClass = 'out-of-stock';
        stockText = 'Out of Stock';
      } else if (prod.stock <= 5) {
        stockClass = 'low-stock';
        stockText = 'Low Stock';
      }

      const isChecked = selectedProductIds.has(prod._id) ? 'checked' : '';
      const displayId = prod.itemId || 'N/A';

      html += `
        <tr>
          <td class="text-center">
            <input type="checkbox" class="product-select-chk" data-id="${prod._id}" ${isChecked}>
          </td>
          <td><code style="font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">${displayId}</code></td>
          <td style="font-weight: 600;">${prod.name} ${prod.nameHindi ? ' / ' + prod.nameHindi : ''}</td>
          <td>${prod.category || 'General'}</td>
          <td class="text-right">${formatCurrency(prod.costPrice)}</td>
          <td class="text-right">${formatCurrency(prod.sellingPrice)}</td>
          <td class="text-center" style="font-weight: 700;">${Number(prod.stock).toFixed(2)}</td>
          <td class="text-center">${prod.unit}</td>
          <td class="text-center"><span class="stock-badge ${stockClass}">${stockText}</span></td>
          <td class="text-center">
            <button class="btn btn-secondary btn-sm" onclick="openEditProductModal('${prod._id}')" title="Edit Product">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${prod._id}', '${prod.name}')" title="Delete Product">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    });

    inventoryTableTbody.innerHTML = html;
    
    // Check if all displayed products are selected to update the Select All header checkbox
    updateSelectAllCheckboxState();
    
    // Bind checkbox change listeners
    document.querySelectorAll('.product-select-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          selectedProductIds.add(id);
        } else {
          selectedProductIds.delete(id);
        }
        updateSelectButtonUI();
        updateSelectAllCheckboxState();
      });
    });

    updateSelectButtonUI();

  } catch (err) {
    console.error('Error loading products:', err);
    inventoryTableTbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Failed to load inventory.</td></tr>';
  }
}

// Update Select All checkbox checked state
function updateSelectAllCheckboxState() {
  if (!selectAllCheckbox) return;
  
  if (inventoryProducts.length === 0) {
    selectAllCheckbox.checked = false;
    return;
  }
  
  const allDisplayedChecked = inventoryProducts.every(prod => selectedProductIds.has(prod._id));
  selectAllCheckbox.checked = allDisplayedChecked;
}

// Update Go to POS button count & visibility
function updateSelectButtonUI() {
  if (!inventoryGoToPosBtn || !selectCountSpan) return;
  
  const count = selectedProductIds.size;
  selectCountSpan.textContent = count;
  
  if (count > 0) {
    inventoryGoToPosBtn.style.display = 'inline-flex';
  } else {
    inventoryGoToPosBtn.style.display = 'none';
  }
}

// Select All Checkbox Handler
if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener('change', (e) => {
    const checked = e.target.checked;
    inventoryProducts.forEach(prod => {
      if (checked) {
        selectedProductIds.add(prod._id);
      } else {
        selectedProductIds.delete(prod._id);
      }
    });
    
    // Update individual checkboxes visually
    document.querySelectorAll('.product-select-chk').forEach(chk => {
      chk.checked = checked;
    });
    
    updateSelectButtonUI();
  });
}

// Go to POS Click Handler (multi-checkout integration)
if (inventoryGoToPosBtn) {
  inventoryGoToPosBtn.addEventListener('click', () => {
    if (selectedProductIds.size === 0) return;
    
    // Find all product objects belonging to checked IDs
    const checkedProducts = [];
    selectedProductIds.forEach(id => {
      // Find inside current local inventory cache
      const prod = inventoryProducts.find(p => p._id === id);
      if (prod) {
        checkedProducts.push(prod);
      }
    });

    if (checkedProducts.length > 0) {
      // Add items to POS cart in bulk
      if (typeof window.addMultipleToCart === 'function') {
        window.addMultipleToCart(checkedProducts);
      }
      
      // Clear selected state
      selectedProductIds.clear();
      if (selectAllCheckbox) selectAllCheckbox.checked = false;
      updateSelectButtonUI();
      
      // Navigation & notification
      alert(`Sent ${checkedProducts.length} items to the POS. Directing to Checkout...`);
      navigateToSection('pos');
      
      // Reload inventory table to reset checkboxes
      loadInventoryTable();
    }
  });
}

// Instant search on every change
inventorySearch.addEventListener('input', () => {
  // Clear any existing timer
  clearTimeout(window.searchDebounceTimer);
  // Set a small 150ms debounce to feel instantaneous while typing without spamming network requests
  window.searchDebounceTimer = setTimeout(() => {
    loadInventoryTable();
  }, 150);
});

// Setup Modals
inventoryAddProductBtn.addEventListener('click', openAddProductModal);
productModalClose.addEventListener('click', () => productModal.classList.remove('active'));
formCancelBtn.addEventListener('click', () => productModal.classList.remove('active'));

// Close modal if clicked outside
window.addEventListener('click', (e) => {
  if (e.target === productModal) {
    productModal.classList.remove('active');
  }
});

function openAddProductModal() {
  productModalTitle.textContent = 'Add New Product';
  productForm.reset();
  formProductId.value = '';
  isHindiEditedManually = false; // Reset manually edited flag for new entry
  productModal.classList.add('active');
  setTimeout(() => formProductName.focus(), 100);
}

window.openEditProductModal = function(id) {
  const prod = inventoryProducts.find(p => p._id === id);
  if (!prod) return;

  productModalTitle.textContent = 'Edit Product Details';
  formProductId.value = prod._id;
  formProductName.value = prod.name;
  formProductNameHindi.value = prod.nameHindi || '';
  isHindiEditedManually = true; // Protect manual/existing entries on edit
  formProductCategory.value = prod.category || '';
  formProductItemId.value = prod.itemId || '';
  formProductUnit.value = prod.unit;
  formProductCostPrice.value = prod.costPrice;
  formProductSellingPrice.value = prod.sellingPrice;
  formProductStock.value = prod.stock;
  formProductDescription.value = prod.description || '';

  productModal.classList.add('active');
  setTimeout(() => formProductName.focus(), 100);
};

// Delete Product Operation
window.deleteProduct = async function(id, name) {
  if (confirm(`Are you sure you want to delete "${name}" from inventory? This action is irreversible.`)) {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      
      if (!res.ok) {
        alert(`Failed to delete product: ${result.message}`);
        return;
      }

      alert('Product deleted successfully');
      selectedProductIds.delete(id); // remove if selected
      loadInventoryTable();
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Server error occurred.');
    }
  }
};

// Form submit (create or update)
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = formProductId.value;
  const name = formProductName.value.trim();
  const nameHindi = formProductNameHindi.value.trim();
  const category = formProductCategory.value.trim();
  const itemId = formProductItemId.value.trim();
  const unit = formProductUnit.value;
  const costPrice = Number(formProductCostPrice.value) || 0;
  const sellingPrice = Number(formProductSellingPrice.value) || 0;
  const stock = Number(formProductStock.value) || 0;
  const description = formProductDescription.value.trim();

  // Validate Prices
  if (sellingPrice < costPrice) {
    if (!confirm(`Warning: Selling Price (₹${sellingPrice}) is lower than Cost Price (₹${costPrice}). This will result in a loss on sale. Do you want to proceed?`)) {
      return;
    }
  }

  const payload = {
    name,
    nameHindi,
    category,
    itemId: itemId || undefined, // Allow empty string to trigger auto-generation on server
    unit,
    costPrice,
    sellingPrice,
    stock,
    description
  };

  const isEdit = !!id;
  const url = isEdit ? `/api/products/${id}` : '/api/products';
  const method = isEdit ? 'PUT' : 'POST';

  const submitBtn = productForm.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Save Product';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving... / सहेज रहा है...';
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok) {
      alert(`Error saving product: ${result.message}`);
      return;
    }

    productModal.classList.remove('active');
    alert(isEdit ? 'Product updated successfully' : 'Product created successfully');
    loadInventoryTable();
  } catch (err) {
    console.error('Error saving product:', err);
    alert('Server error occurred while saving.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
});

// Auto-translate English text to Hindi
async function translateEnglishToHindi(englishText) {
  if (!englishText.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(englishText)}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = await res.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    return '';
  } catch (err) {
    console.error('Translation error:', err);
    return '';
  }
}

// Hindi Name manual edit tracker
if (formProductNameHindi) {
  formProductNameHindi.addEventListener('input', () => {
    isHindiEditedManually = true;
  });
}

// Debounced translation timer
let translationTimer = null;

// English Name input handler (auto-translate to Hindi)
if (formProductName) {
  formProductName.addEventListener('input', () => {
    if (isHindiEditedManually) return;
    
    clearTimeout(translationTimer);
    const text = formProductName.value.trim();
    if (!text) {
      formProductNameHindi.value = '';
      return;
    }

    translationTimer = setTimeout(async () => {
      // Fetch translation
      const translated = await translateEnglishToHindi(text);
      // Double check that user hasn't edited manually in the meantime
      if (!isHindiEditedManually) {
        formProductNameHindi.value = translated;
      }
    }, 600); // 600ms debounce
  });

  // Also translate immediately on blur to capture final edits
  formProductName.addEventListener('blur', async () => {
    if (isHindiEditedManually) return;
    clearTimeout(translationTimer);
    const text = formProductName.value.trim();
    if (!text) return;
    const translated = await translateEnglishToHindi(text);
    if (!isHindiEditedManually) {
      formProductNameHindi.value = translated;
    }
  });
}

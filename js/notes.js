// Notepad & Ledger State Management
let notesList = [];
let ledgerList = [];
let ledgerFilterPending = true;

// DOM Elements
const notesListContainer = document.getElementById('notes-list-container');
const ledgerListContainer = document.getElementById('ledger-list-container');
const btnAddNote = document.getElementById('btn-add-note');
const btnAddLedger = document.getElementById('btn-add-ledger');
const ledgerSearch = document.getElementById('ledger-search');
const btnLedgerFilterPending = document.getElementById('ledger-filter-pending');
const btnLedgerFilterResolved = document.getElementById('ledger-filter-resolved');

// Modal Form Elements
const noteModal = document.getElementById('note-modal');
const noteModalTitle = document.getElementById('note-modal-title');
const noteModalClose = document.getElementById('note-modal-close');
const noteForm = document.getElementById('note-form');
const noteCancelBtn = document.getElementById('note-cancel-btn');

const formNoteId = document.getElementById('form-note-id');
const formNoteType = document.getElementById('form-note-type');
const groupNoteTitle = document.getElementById('group-note-title');
const formNoteTitle = document.getElementById('form-note-title');
const ledgerFormFields = document.getElementById('ledger-form-fields');
const formLedgerCustomer = document.getElementById('form-ledger-customer');
const formLedgerAmount = document.getElementById('form-ledger-amount');
const formNoteContent = document.getElementById('form-note-content');

// ----------------------------------------------------
// Core Fetchers
// ----------------------------------------------------

async function loadNotesAndLedgers() {
  await Promise.all([loadStandardNotes(), loadLedgerLogs()]);
}

// 1. Fetch & Render Standard Notes
async function loadStandardNotes() {
  try {
    const res = await fetch('/api/notes?type=note');
    notesList = await res.json();

    if (notesList.length === 0) {
      notesListContainer.innerHTML = '<div class="no-data-state">No notes found. Create a new scratch note.</div>';
      return;
    }

    let html = '';
    notesList.forEach(note => {
      html += `
        <div class="note-card">
          <div class="note-actions">
            <button class="btn-note-action" onclick="openEditNoteModal('${note._id}', 'note')" title="Edit Note"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-note-action delete" onclick="deleteNote('${note._id}')" title="Delete Note"><i class="fa-solid fa-trash-can"></i></button>
          </div>
          <h4>${note.title}</h4>
          <p>${note.content}</p>
          <div class="note-footer">
            <span>Created: ${formatDate(note.createdAt, true)}</span>
          </div>
        </div>
      `;
    });
    notesListContainer.innerHTML = html;
  } catch (err) {
    console.error('Error loading notes:', err);
    notesListContainer.innerHTML = '<div class="no-data-state text-danger">Error loading notes.</div>';
  }
}

// 2. Fetch & Render Ledger Logs
async function loadLedgerLogs() {
  const search = ledgerSearch.value.trim();
  let url = `/api/notes?type=ledger&isResolved=${!ledgerFilterPending}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }

  try {
    const res = await fetch(url);
    ledgerList = await res.json();

    if (ledgerList.length === 0) {
      ledgerListContainer.innerHTML = '<div class="no-data-state">No ledger entries found.</div>';
      return;
    }

    let html = '';
    ledgerList.forEach(log => {
      const isDebt = log.amount < 0;
      const displayAmount = formatCurrency(Math.abs(log.amount));
      const amountClass = isDebt ? 'debt' : 'credit';
      const typeLabel = isDebt ? 'Owed to us' : 'Credit Balance';
      
      let actionsHtml = '';
      if (!log.isResolved) {
        actionsHtml = `
          <button class="btn btn-sm btn-accent" style="padding: 4px 8px; font-size:0.75rem;" onclick="resolveLedgerItem('${log._id}')">
            <i class="fa-solid fa-circle-check"></i> Clear Due
          </button>
        `;
      }

      html += `
        <div class="ledger-log-card ${log.isResolved ? 'resolved' : ''}">
          <div class="ledger-details">
            <span class="customer"><i class="fa-solid fa-user"></i> ${log.associatedCustomer}</span>
            <span class="description">${log.content}</span>
            <span class="date">${formatDate(log.createdAt, true)} | <span class="badge ${isDebt ? 'badge-danger' : 'badge-success'}">${typeLabel}</span></span>
          </div>
          <div class="amount-actions">
            <span class="amount ${amountClass}">${isDebt ? '-' : '+'}${displayAmount}</span>
            <div style="display:flex; gap:6px; margin-top:4px;">
              ${actionsHtml}
              <button class="btn-note-action delete" style="padding:2px;" onclick="deleteNote('${log._id}')" title="Delete Log">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    ledgerListContainer.innerHTML = html;
  } catch (err) {
    console.error('Error loading ledger logs:', err);
    ledgerListContainer.innerHTML = '<div class="no-data-state text-danger">Error loading ledger.</div>';
  }
}

// ----------------------------------------------------
// UI Events
// ----------------------------------------------------

ledgerSearch.addEventListener('input', () => {
  clearTimeout(window.ledgerSearchTimer);
  window.ledgerSearchTimer = setTimeout(() => {
    loadLedgerLogs();
  }, 300);
});

btnLedgerFilterPending.addEventListener('click', () => {
  ledgerFilterPending = true;
  btnLedgerFilterPending.classList.add('active');
  btnLedgerFilterResolved.classList.remove('active');
  loadLedgerLogs();
});

btnLedgerFilterResolved.addEventListener('click', () => {
  ledgerFilterPending = false;
  btnLedgerFilterResolved.classList.add('active');
  btnLedgerFilterPending.classList.remove('active');
  loadLedgerLogs();
});

// ----------------------------------------------------
// Add & Edit Modals
// ----------------------------------------------------

btnAddNote.addEventListener('click', () => {
  openNoteModal('note');
});

btnAddLedger.addEventListener('click', () => {
  openNoteModal('ledger');
});

noteModalClose.addEventListener('click', () => noteModal.classList.remove('active'));
noteCancelBtn.addEventListener('click', () => noteModal.classList.remove('active'));

window.addEventListener('click', (e) => {
  if (e.target === noteModal) {
    noteModal.classList.remove('active');
  }
});

function openNoteModal(type) {
  formNoteId.value = '';
  formNoteType.value = type;
  noteForm.reset();

  if (type === 'note') {
    noteModalTitle.textContent = 'Create Scratch Note';
    groupNoteTitle.style.display = 'flex';
    ledgerFormFields.style.display = 'none';
    formNoteTitle.required = true;
    formLedgerCustomer.required = false;
    formLedgerAmount.required = false;
  } else {
    noteModalTitle.textContent = 'Create Manual Ledger Entry';
    groupNoteTitle.style.display = 'none';
    ledgerFormFields.style.display = 'block';
    formNoteTitle.required = false;
    formLedgerCustomer.required = true;
    formLedgerAmount.required = true;
  }

  noteModal.classList.add('active');
  setTimeout(() => {
    if (type === 'note') formNoteTitle.focus();
    else formLedgerCustomer.focus();
  }, 100);
}

window.openEditNoteModal = function(id, type) {
  const note = notesList.find(n => n._id === id) || ledgerList.find(n => n._id === id);
  if (!note) return;

  formNoteId.value = note._id;
  formNoteType.value = note.type;
  formNoteContent.value = note.content;

  if (note.type === 'note') {
    noteModalTitle.textContent = 'Edit Scratch Note';
    groupNoteTitle.style.display = 'flex';
    ledgerFormFields.style.display = 'none';
    formNoteTitle.value = note.title;
    formNoteTitle.required = true;
    formLedgerCustomer.required = false;
    formLedgerAmount.required = false;
  } else {
    noteModalTitle.textContent = 'Edit Ledger Entry';
    groupNoteTitle.style.display = 'none';
    ledgerFormFields.style.display = 'block';
    formLedgerCustomer.value = note.associatedCustomer;
    formLedgerAmount.value = note.amount;
    formNoteTitle.required = false;
    formLedgerCustomer.required = true;
    formLedgerAmount.required = true;
  }

  noteModal.classList.add('active');
  setTimeout(() => formNoteContent.focus(), 100);
};

// Save entry
noteForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = formNoteId.value;
  const type = formNoteType.value;
  const content = formNoteContent.value.trim();
  
  let payload = {
    type,
    content
  };

  if (type === 'note') {
    payload.title = formNoteTitle.value.trim();
  } else {
    const amt = Number(formLedgerAmount.value) || 0;
    // Standardize: unpaid debt is stored as a negative number in our schema
    payload.associatedCustomer = formLedgerCustomer.value.trim();
    payload.amount = amt;
    payload.title = `Manual Debt: ${payload.associatedCustomer}`;
  }

  const isEdit = !!id;
  const url = isEdit ? `/api/notes/${id}` : '/api/notes';
  const method = isEdit ? 'PUT' : 'POST';

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
      alert(`Error saving entry: ${result.message}`);
      return;
    }

    noteModal.classList.remove('active');
    loadNotesAndLedgers();
  } catch (err) {
    console.error('Error saving note:', err);
    alert('Server error occurred.');
  }
});

// Resolve outstanding ledger item (Mark as cleared/paid)
window.resolveLedgerItem = async function(id) {
  if (confirm('Are you sure you want to mark this ledger debt as resolved/cleared?')) {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isResolved: true,
          amount: 0, // Cleared balance
          content: ledgerList.find(n => n._id === id).content + ' (Cleared)'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to resolve entry: ${err.message}`);
        return;
      }

      alert('Ledger debt resolved successfully');
      loadLedgerLogs();
    } catch (err) {
      console.error('Error resolving ledger item:', err);
    }
  }
};

// Delete entry (either note or ledger)
window.deleteNote = async function(id) {
  if (confirm('Are you sure you want to delete this entry? This action is irreversible.')) {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to delete: ${err.message}`);
        return;
      }

      alert('Entry deleted successfully');
      loadNotesAndLedgers();
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  }
};

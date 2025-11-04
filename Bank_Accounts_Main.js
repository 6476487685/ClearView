document.addEventListener("DOMContentLoaded", () => {
  // State Management
  let isEditMode = false;
  let editIndex = null;
  let passwordRevealTimers = {};
  let passwordClickCounts = {};
  let passwordRevealTimeouts = {};

  // DOM Elements
  const bankForm = document.getElementById('bankForm');
  const bankModal = document.getElementById('bankModal');
  const modalTitle = document.getElementById('modalTitle');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn = document.getElementById('saveBtn');
  const btnEditMode = document.getElementById('btnEditMode');
  const btnDisplayMode = document.getElementById('btnDisplayMode');
  const btnAddRecord = document.getElementById('btnAddRecord');
  const bankRecordsContainer = document.getElementById('bankRecordsContainer');
  const addRecordContainer = document.getElementById('addRecordContainer');
  const accountTagSelect = document.getElementById('accountTagSelect');
  const accountTagBar = document.getElementById('accountTagBar');
  const btnExportPDF = document.getElementById('btnExportPDF');
  const holderCountSelect = document.getElementById('Bank_Holder_Count');
  const holdersContainer = document.getElementById('holdersContainer');

  // Data Management
  const getData = () => JSON.parse(localStorage.getItem('bank_accounts') || '[]');
  const saveData = (data) => {
    localStorage.setItem('bank_accounts', JSON.stringify(data));
  };

  // Initialize
  loadAccountTags();
  renderRecords();
  populateInstitutionAndAcType();

  // Edit/Display Mode Toggle
  btnEditMode.addEventListener('click', () => {
    isEditMode = true;
    btnEditMode.style.display = 'none';
    btnDisplayMode.style.display = 'inline-flex';
    addRecordContainer.style.display = 'block';
    document.querySelectorAll('.bank-record-card').forEach(card => {
      card.classList.remove('read-only');
    });
  });

  btnDisplayMode.addEventListener('click', () => {
    isEditMode = false;
    btnEditMode.style.display = 'inline-flex';
    btnDisplayMode.style.display = 'none';
    addRecordContainer.style.display = 'none';
    document.querySelectorAll('.bank-record-card').forEach(card => {
      card.classList.add('read-only');
    });
    // Close modal if open
    bankModal.classList.remove('show');
  });

  // Account Tag Change
  accountTagSelect.addEventListener('change', () => {
    renderRecords();
  });

  // Holder Count Change
  holderCountSelect.addEventListener('change', () => {
    if (editIndex !== null) {
      const record = getData()[editIndex];
      const currentHolderCount = record.Bank_Holders ? record.Bank_Holders.length : 0;
      const newHolderCount = parseInt(holderCountSelect.value);
      
      if (newHolderCount < currentHolderCount) {
        if (!confirm(`Changing holder count from ${currentHolderCount} to ${newHolderCount} will remove data from holders ${newHolderCount + 1}-${currentHolderCount}. Continue?`)) {
          holderCountSelect.value = currentHolderCount;
          return;
        }
      }
    }
    renderHolders();
  });

  // Add Record
  btnAddRecord.addEventListener('click', () => {
    if (!isEditMode) return;
    editIndex = null;
    bankForm.reset();
    modalTitle.textContent = 'Add Bank Account';
    populateModalDropdowns();
    renderHolders();
    bankModal.classList.add('show');
    setupAccountTagCheck();
  });

  // Cancel
  cancelBtn.addEventListener('click', () => {
    bankModal.classList.remove('show');
    editIndex = null;
    bankForm.reset();
  });

  // Close modal on outside click
  window.addEventListener('click', (e) => {
    if (e.target === bankModal) {
      bankModal.classList.remove('show');
      editIndex = null;
      bankForm.reset();
    }
  });

  // Form Submit
  bankForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isEditMode) return;

    const holders = [];
    const holderCount = parseInt(holderCountSelect.value);
    for (let i = 1; i <= holderCount; i++) {
      holders.push({
        name: document.getElementById(`Bank_Holder_${i}_Name`).value || '',
        emailPhone: document.getElementById(`Bank_Holder_${i}_EmailPhone`).value || '',
        loginPassword: document.getElementById(`Bank_Holder_${i}_LoginPassword`).value || '',
        debitCard: document.getElementById(`Bank_Holder_${i}_DebitCard`).value || ''
      });
    }

    const record = {
      Bank_Institution: document.getElementById('Bank_Institution').value,
      Bank_Ac_Type: document.getElementById('Bank_Ac_Type').value,
      Bank_Ac_Tag: document.getElementById('Bank_Ac_Tag').value,
      Bank_Country: document.getElementById('Bank_Country').value,
      Bank_Holders: holders,
      Bank_Nominee_Name: document.getElementById('Bank_Nominee_Name').value || '',
      Bank_Nominee_Contact: document.getElementById('Bank_Nominee_Contact').value || '',
      Bank_Helpline_Phone1: document.getElementById('Bank_Helpline_Phone1').value || '',
      Bank_Helpline_Phone2: document.getElementById('Bank_Helpline_Phone2').value || '',
      Bank_Helpline_Phone3: document.getElementById('Bank_Helpline_Phone3').value || '',
      Bank_Helpline_Phone4: document.getElementById('Bank_Helpline_Phone4').value || '',
      Bank_Helpline_Email1: document.getElementById('Bank_Helpline_Email1').value || '',
      Bank_Helpline_Email2: document.getElementById('Bank_Helpline_Email2').value || '',
      Bank_Helpline_Email3: document.getElementById('Bank_Helpline_Email3').value || '',
      Bank_Helpline_Email4: document.getElementById('Bank_Helpline_Email4').value || '',
      Bank_Helpline_URL: document.getElementById('Bank_Helpline_URL').value || '',
      Bank_Notes: document.getElementById('Bank_Notes').value || '',
      id: editIndex !== null ? getData()[editIndex].id : Date.now() + Math.random()
    };

    const data = getData();
    if (editIndex !== null) {
      data[editIndex] = record;
    } else {
      data.push(record);
    }
    saveData(data);

    // Trigger Excel backup
    createExcelBackup();

    // Return to display mode
    isEditMode = false;
    btnEditMode.style.display = 'inline-flex';
    btnDisplayMode.style.display = 'none';
    addRecordContainer.style.display = 'none';

    bankModal.classList.remove('show');
    renderRecords();
    editIndex = null;
  });

  // Load Account Tags (from Income Ac_Tag)
  function loadAccountTags() {
    try {
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let incomeTags = [];
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        incomeTags = unifiedData.income?.Income_Ac_Tag || [];
      } else {
        const incomeMasterDataStr = localStorage.getItem('income_master_data');
        if (incomeMasterDataStr) {
          const incomeMasterData = JSON.parse(incomeMasterDataStr);
          incomeTags = incomeMasterData.Income_Ac_Tag || [];
        }
      }
      
      accountTagSelect.innerHTML = '<option value="">All Accounts</option>';
      incomeTags.forEach(tag => {
        if (tag && tag !== '') {
          accountTagSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        }
      });
    } catch (e) {
      console.error('Error loading account tags:', e);
    }
  }

  // Populate Institution and Ac_Type from Shared Attributes
  function populateInstitutionAndAcType() {
    try {
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let commonData = {};
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        commonData = unifiedData.common || {};
      }

      const institutionSelect = document.getElementById('Bank_Institution');
      const acTypeSelect = document.getElementById('Bank_Ac_Type');

      // Populate Institution
      const institutions = commonData.Institution || [];
      institutionSelect.innerHTML = '<option value="">Select Institution</option>';
      institutions.forEach(inst => {
        if (inst && inst !== '') {
          institutionSelect.innerHTML += `<option value="${inst}">${inst}</option>`;
        }
      });

      // Populate Ac_Type
      const acTypes = commonData.Ac_Type || [];
      acTypeSelect.innerHTML = '<option value="">Select Account Type</option>';
      acTypes.forEach(type => {
        if (type && type !== '') {
          acTypeSelect.innerHTML += `<option value="${type}">${type}</option>`;
        }
      });
    } catch (e) {
      console.error('Error populating Institution and Ac_Type:', e);
    }
  }

  // Populate Modal Dropdowns
  function populateModalDropdowns() {
    loadAccountTags();
    populateInstitutionAndAcType();

    // Populate Account Tag in modal
    const bankAcTagSelect = document.getElementById('Bank_Ac_Tag');
    try {
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let incomeTags = [];
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        incomeTags = unifiedData.income?.Income_Ac_Tag || [];
      }

      bankAcTagSelect.innerHTML = '<option value="">Select Account Tag</option>';
      incomeTags.forEach(tag => {
        if (tag && tag !== '') {
          bankAcTagSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        }
      });
    } catch (e) {
      console.error('Error populating account tag:', e);
    }
  }

  // Setup Account Tag validation
  function setupAccountTagCheck() {
    const bankAcTagSelect = document.getElementById('Bank_Ac_Tag');
    // Remove any existing listeners
    const newSelect = bankAcTagSelect.cloneNode(true);
    bankAcTagSelect.parentNode.replaceChild(newSelect, bankAcTagSelect);
    
    // Re-get the element after replacement
    const updatedSelect = document.getElementById('Bank_Ac_Tag');
    updatedSelect.addEventListener('change', function() {
      if (this.value) {
        const optionExists = Array.from(this.options).some(opt => opt.value === this.value && opt.value !== '');
        if (!optionExists) {
          if (!confirm('⚠️ Account Tag Not Found\n\nIf you have not created an account tag for this new account, please create one via Manage Master Data interface.\n\nDo you want to continue anyway?')) {
            this.value = '';
          }
        }
      }
    });
  }

  // Render Holders
  function renderHolders() {
    const holderCount = parseInt(holderCountSelect.value) || 1;
    holdersContainer.innerHTML = '';

    for (let i = 1; i <= holderCount; i++) {
      const holderSection = document.createElement('div');
      holderSection.className = 'holder-section';
      holderSection.innerHTML = `
        <h4>Holder ${i}</h4>
        <div class="holder-row">
          <div>
            <label>Name</label>
            <input type="text" id="Bank_Holder_${i}_Name" ${!isEditMode ? 'readonly' : ''}>
          </div>
          <div>
            <label>Email/Phone</label>
            <input type="text" id="Bank_Holder_${i}_EmailPhone" ${!isEditMode ? 'readonly' : ''}>
          </div>
        </div>
        <div class="holder-row">
          <div>
            <label>Login/Password</label>
            <div class="password-field">
              <input type="password" id="Bank_Holder_${i}_LoginPassword" class="password-input" data-holder="${i}" ${!isEditMode ? 'readonly' : ''}>
              <button type="button" class="password-toggle" data-holder="${i}" style="display:none;">👁️</button>
            </div>
          </div>
          <div>
            <label>Debit Card Info</label>
            <input type="text" id="Bank_Holder_${i}_DebitCard" ${!isEditMode ? 'readonly' : ''}>
          </div>
        </div>
      `;
      holdersContainer.appendChild(holderSection);

      // Setup password reveal for this holder
      setupPasswordReveal(i);
    }

    // Load existing holder data if editing
    if (editIndex !== null) {
      const record = getData()[editIndex];
      if (record.Bank_Holders) {
        record.Bank_Holders.forEach((holder, idx) => {
          const holderNum = idx + 1;
          if (holderNum <= holderCount) {
            const nameField = document.getElementById(`Bank_Holder_${holderNum}_Name`);
            const emailPhoneField = document.getElementById(`Bank_Holder_${holderNum}_EmailPhone`);
            const loginPasswordField = document.getElementById(`Bank_Holder_${holderNum}_LoginPassword`);
            const debitCardField = document.getElementById(`Bank_Holder_${holderNum}_DebitCard`);
            
            if (nameField) nameField.value = holder.name || '';
            if (emailPhoneField) emailPhoneField.value = holder.emailPhone || '';
            if (loginPasswordField) {
              loginPasswordField.value = holder.loginPassword || '';
              // Mask password initially
              loginPasswordField.type = 'password';
            }
            if (debitCardField) debitCardField.value = holder.debitCard || '';
          }
        });
      }
    }
  }

  // Password Reveal with 4 Rapid Clicks
  function setupPasswordReveal(holderNum) {
    const passwordInput = document.getElementById(`Bank_Holder_${holderNum}_LoginPassword`);
    const toggleBtn = document.querySelector(`.password-toggle[data-holder="${holderNum}"]`);
    
    if (!passwordInput || !toggleBtn) return;

    const holderId = `holder_${holderNum}`;
    passwordClickCounts[holderId] = 0;
    
    // Show toggle button on focus
    passwordInput.addEventListener('focus', () => {
      toggleBtn.style.display = 'block';
    });

    // Hide toggle button on blur (after timeout)
    passwordInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== passwordInput) {
          maskPassword(holderId, passwordInput, toggleBtn);
          toggleBtn.style.display = 'none';
        }
      }, 300);
    });

    // 4 rapid clicks to reveal
    passwordInput.addEventListener('click', (e) => {
      e.preventDefault();
      passwordClickCounts[holderId]++;
      
      // Reset counter after 2 seconds
      clearTimeout(passwordRevealTimeouts[holderId]);
      passwordRevealTimeouts[holderId] = setTimeout(() => {
        passwordClickCounts[holderId] = 0;
      }, 2000);

      if (passwordClickCounts[holderId] >= 4) {
        revealPassword(holderId, passwordInput, toggleBtn);
        passwordClickCounts[holderId] = 0;
      }
    });

    // Toggle button click
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (passwordInput.type === 'password') {
        revealPassword(holderId, passwordInput, toggleBtn);
      } else {
        maskPassword(holderId, passwordInput, toggleBtn);
      }
    });
  }

  function revealPassword(holderId, input, toggleBtn) {
    input.type = 'text';
    toggleBtn.textContent = '🙈';
    
    // Auto-mask after 30 seconds
    clearTimeout(passwordRevealTimers[holderId]);
    passwordRevealTimers[holderId] = setTimeout(() => {
      maskPassword(holderId, input, toggleBtn);
    }, 30000);
  }

  function maskPassword(holderId, input, toggleBtn) {
    input.type = 'password';
    toggleBtn.textContent = '👁️';
    clearTimeout(passwordRevealTimers[holderId]);
  }

  // Render Records
  function renderRecords() {
    const data = getData();
    const selectedTag = accountTagSelect.value;
    
    // Filter by account tag if selected
    let filteredData = data;
    if (selectedTag) {
      filteredData = data.filter(record => record.Bank_Ac_Tag === selectedTag);
    }

    bankRecordsContainer.innerHTML = '';

    if (filteredData.length === 0) {
      bankRecordsContainer.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No bank accounts found. Click "Add Bank Account" to create one.</div>';
      return;
    }

    filteredData.forEach((record, index) => {
      const actualIndex = data.findIndex(r => r.id === record.id);
      const card = createRecordCard(record, actualIndex);
      bankRecordsContainer.appendChild(card);
    });
  }

  // Create Record Card
  function createRecordCard(record, index) {
    const card = document.createElement('div');
    card.className = 'bank-record-card';
    if (!isEditMode) {
      card.classList.add('read-only');
    }

    const holdersHtml = record.Bank_Holders.map((holder, idx) => `
      <div class="holder-section">
        <h4>Holder ${idx + 1}</h4>
        <div class="holder-row">
          <div><strong>Name:</strong> ${holder.name || ''}</div>
          <div><strong>Email/Phone:</strong> ${holder.emailPhone || ''}</div>
        </div>
        <div class="holder-row">
          <div><strong>Login/Password:</strong> <span class="password-display" data-holder="${idx + 1}" data-password="${holder.loginPassword || ''}" style="cursor:pointer;user-select:none;">••••••••</span></div>
          <div><strong>Debit Card:</strong> ${holder.debitCard || ''}</div>
        </div>
      </div>
    `).join('');

    const helplinePhones = [
      record.Bank_Helpline_Phone1,
      record.Bank_Helpline_Phone2,
      record.Bank_Helpline_Phone3,
      record.Bank_Helpline_Phone4
    ].filter(p => p).join(', ');

    const helplineEmails = [
      record.Bank_Helpline_Email1,
      record.Bank_Helpline_Email2,
      record.Bank_Helpline_Email3,
      record.Bank_Helpline_Email4
    ].filter(e => e).join(', ');

    card.innerHTML = `
      <div class="bank-record-header">
        <div class="bank-record-title">
          ${record.Bank_Institution || ''} - ${record.Bank_Ac_Type || ''} (${record.Bank_Ac_Tag || ''})
        </div>
        <div class="bank-record-actions">
          ${isEditMode ? `<button class="btn-edit" data-index="${index}">✏️ Edit</button>` : ''}
          ${isEditMode ? `<button class="btn-delete" data-index="${index}">🗑️ Delete</button>` : ''}
          <button class="btn-print" data-index="${index}">🖨️ Print</button>
        </div>
      </div>

      <div class="row2">
        <div>
          <strong>Institution:</strong> ${record.Bank_Institution || ''}
        </div>
        <div>
          <strong>Account Type:</strong> ${record.Bank_Ac_Type || ''}
        </div>
      </div>

      <div class="row2">
        <div>
          <strong>Account Tag:</strong> ${record.Bank_Ac_Tag || ''}
        </div>
        <div>
          <strong>Country:</strong> ${record.Bank_Country || ''}
        </div>
      </div>

      <div class="section-divider">Holders</div>
      ${holdersHtml}

      <div class="section-divider">Nomination</div>
      <div class="row2">
        <div>
          <strong>Nominee Name:</strong> ${record.Bank_Nominee_Name || ''}
        </div>
        <div>
          <strong>Nominee Contact:</strong> ${record.Bank_Nominee_Contact || ''}
        </div>
      </div>

      <div class="section-divider">Helpline</div>
      <div class="row2">
        <div>
          <strong>Phones:</strong> ${helplinePhones || 'None'}
        </div>
        <div>
          <strong>Emails:</strong> ${helplineEmails || 'None'}
        </div>
      </div>
      ${record.Bank_Helpline_URL ? `<div class="row-full"><strong>URL:</strong> <a href="${record.Bank_Helpline_URL}" target="_blank">${record.Bank_Helpline_URL}</a></div>` : ''}

      <div class="section-divider">Notes</div>
      <div class="row-full">
        ${record.Bank_Notes || ''}
      </div>
    `;

    // Event Listeners
    const editBtn = card.querySelector('.btn-edit');
    const deleteBtn = card.querySelector('.btn-delete');
    const printBtn = card.querySelector('.btn-print');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (!isEditMode) return;
        editIndex = index;
        loadRecordIntoForm(record);
        modalTitle.textContent = 'Edit Bank Account';
        populateModalDropdowns();
        setupAccountTagCheck();
        bankModal.classList.add('show');
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!isEditMode) return;
        if (confirm('Are you sure you want to delete this bank account?')) {
          const data = getData();
          data.splice(index, 1);
          saveData(data);
          createExcelBackup();
          renderRecords();
        }
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        printRecord(record);
      });
    }

    // Setup password reveal for display cards
    card.querySelectorAll('.password-display').forEach(passwordSpan => {
      const holderId = `display_${passwordSpan.dataset.holder}`;
      let clickCount = 0;
      let clickTimeout;

      passwordSpan.addEventListener('click', () => {
        clickCount++;
        
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          clickCount = 0;
        }, 2000);

        if (clickCount >= 4) {
          const password = passwordSpan.dataset.password;
          if (password) {
            passwordSpan.textContent = password;
            passwordSpan.style.color = 'var(--accent)';
            
            // Auto-mask after 30 seconds
            setTimeout(() => {
              passwordSpan.textContent = '••••••••';
              passwordSpan.style.color = '';
            }, 30000);
          }
          clickCount = 0;
        }
      });
    });

    return card;
  }

  // Load Record into Form
  function loadRecordIntoForm(record) {
    document.getElementById('Bank_Institution').value = record.Bank_Institution || '';
    document.getElementById('Bank_Ac_Type').value = record.Bank_Ac_Type || '';
    document.getElementById('Bank_Ac_Tag').value = record.Bank_Ac_Tag || '';
    document.getElementById('Bank_Country').value = record.Bank_Country || '';
    document.getElementById('Bank_Nominee_Name').value = record.Bank_Nominee_Name || '';
    document.getElementById('Bank_Nominee_Contact').value = record.Bank_Nominee_Contact || '';
    document.getElementById('Bank_Helpline_Phone1').value = record.Bank_Helpline_Phone1 || '';
    document.getElementById('Bank_Helpline_Phone2').value = record.Bank_Helpline_Phone2 || '';
    document.getElementById('Bank_Helpline_Phone3').value = record.Bank_Helpline_Phone3 || '';
    document.getElementById('Bank_Helpline_Phone4').value = record.Bank_Helpline_Phone4 || '';
    document.getElementById('Bank_Helpline_Email1').value = record.Bank_Helpline_Email1 || '';
    document.getElementById('Bank_Helpline_Email2').value = record.Bank_Helpline_Email2 || '';
    document.getElementById('Bank_Helpline_Email3').value = record.Bank_Helpline_Email3 || '';
    document.getElementById('Bank_Helpline_Email4').value = record.Bank_Helpline_Email4 || '';
    document.getElementById('Bank_Helpline_URL').value = record.Bank_Helpline_URL || '';
    document.getElementById('Bank_Notes').value = record.Bank_Notes || '';

    // Set holder count
    const holderCount = record.Bank_Holders ? record.Bank_Holders.length : 1;
    holderCountSelect.value = holderCount;
    renderHolders();
  }

  // Create Excel Backup
  function createExcelBackup() {
    try {
      const wb = XLSX.utils.book_new();

      // Get all master and transactional data
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      const unifiedData = unifiedDataStr ? JSON.parse(unifiedDataStr) : {};

      // Add all master data sheets
      if (unifiedData.expense) {
        Object.entries(unifiedData.expense).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            const ws = XLSX.utils.aoa_to_sheet([[key], ...values.map(v => [v])]);
            XLSX.utils.book_append_sheet(wb, ws, key);
          }
        });
      }

      if (unifiedData.income) {
        Object.entries(unifiedData.income).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            const ws = XLSX.utils.aoa_to_sheet([[key], ...values.map(v => [v])]);
            XLSX.utils.book_append_sheet(wb, ws, key);
          }
        });
      }

      if (unifiedData.investment) {
        Object.entries(unifiedData.investment).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            const ws = XLSX.utils.aoa_to_sheet([[key], ...values.map(v => [v])]);
            XLSX.utils.book_append_sheet(wb, ws, key);
          }
        });
      }

      if (unifiedData.common) {
        Object.entries(unifiedData.common).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            const ws = XLSX.utils.aoa_to_sheet([[key], ...values.map(v => [v])]);
            XLSX.utils.book_append_sheet(wb, ws, key);
          }
        });
      }

      // Add transactional data
      const expenseRecords = JSON.parse(localStorage.getItem('expense_records') || '[]');
      if (expenseRecords.length > 0) {
        const headers = Object.keys(expenseRecords[0]);
        const data = [headers, ...expenseRecords.map(r => headers.map(h => r[h] || ''))];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Txn_Expense');
      }

      const incomeRecords = JSON.parse(localStorage.getItem('income_records') || '[]');
      if (incomeRecords.length > 0) {
        const headers = Object.keys(incomeRecords[0]);
        const data = [headers, ...incomeRecords.map(r => headers.map(h => r[h] || ''))];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Txn_Income');
      }

      const investmentRecords = JSON.parse(localStorage.getItem('investment_records') || '[]');
      if (investmentRecords.length > 0) {
        const headers = Object.keys(investmentRecords[0]);
        const data = [headers, ...investmentRecords.map(r => headers.map(h => r[h] || ''))];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Txn_Investment');
      }

      // Add Banks_Data sheet with max 2 entries per page
      const bankRecords = getData();
      if (bankRecords.length > 0) {
        const banksData = [];
        bankRecords.forEach((record, idx) => {
          // Add record header
          banksData.push(['Record ' + (idx + 1)]);
          banksData.push(['Institution', record.Bank_Institution || '']);
          banksData.push(['Account Type', record.Bank_Ac_Type || '']);
          banksData.push(['Account Tag', record.Bank_Ac_Tag || '']);
          banksData.push(['Country', record.Bank_Country || '']);
          
          // Add holders
          if (record.Bank_Holders) {
            record.Bank_Holders.forEach((holder, hIdx) => {
              banksData.push([`Holder ${hIdx + 1} Name`, holder.name || '']);
              banksData.push([`Holder ${hIdx + 1} Email/Phone`, holder.emailPhone || '']);
              banksData.push([`Holder ${hIdx + 1} Login/Password`, holder.loginPassword || '']);
              banksData.push([`Holder ${hIdx + 1} Debit Card`, holder.debitCard || '']);
            });
          }
          
          banksData.push(['Nominee Name', record.Bank_Nominee_Name || '']);
          banksData.push(['Nominee Contact', record.Bank_Nominee_Contact || '']);
          banksData.push(['Helpline Phone 1', record.Bank_Helpline_Phone1 || '']);
          banksData.push(['Helpline Phone 2', record.Bank_Helpline_Phone2 || '']);
          banksData.push(['Helpline Phone 3', record.Bank_Helpline_Phone3 || '']);
          banksData.push(['Helpline Phone 4', record.Bank_Helpline_Phone4 || '']);
          banksData.push(['Helpline Email 1', record.Bank_Helpline_Email1 || '']);
          banksData.push(['Helpline Email 2', record.Bank_Helpline_Email2 || '']);
          banksData.push(['Helpline Email 3', record.Bank_Helpline_Email3 || '']);
          banksData.push(['Helpline Email 4', record.Bank_Helpline_Email4 || '']);
          banksData.push(['Helpline URL', record.Bank_Helpline_URL || '']);
          banksData.push(['Notes', record.Bank_Notes || '']);
          
          // Add page break after every 2 records (empty row for spacing)
          if ((idx + 1) % 2 === 0 && idx < bankRecords.length - 1) {
            banksData.push([]);
          }
        });

        const ws = XLSX.utils.aoa_to_sheet(banksData);
        XLSX.utils.book_append_sheet(wb, ws, 'Banks_Data');
      }

      // Generate filename: ClearView_Backup_YYYY_MM_DD_@_HH_MM_SS.xlsx
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const filename = `ClearView_Backup_${year}_${month}_${day}_@_${hours}_${minutes}_${seconds}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
      console.log('Excel backup created:', filename);
    } catch (e) {
      console.error('Error creating Excel backup:', e);
      alert('Error creating backup. Please try again.');
    }
  }

  // Print Record (PDF)
  btnExportPDF.addEventListener('click', () => {
    generatePDF();
  });

  function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;

    const bankRecords = getData();
    const totalRecords = bankRecords.length;

    // Count by country and holder
    const countryCounts = { India: 0, Canada: 0, US: 0 };
    const holderCounts = {};

    bankRecords.forEach(record => {
      const country = record.Bank_Country || 'Unknown';
      if (countryCounts.hasOwnProperty(country)) {
        countryCounts[country]++;
      }

      if (record.Bank_Holders) {
        record.Bank_Holders.forEach(holder => {
          const holderName = holder.name || 'Unknown';
          holderCounts[holderName] = (holderCounts[holderName] || 0) + 1;
        });
      }
    });

    // Summary Page (First Page)
    doc.setFontSize(20);
    doc.text('ClearView Banks Summary', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(12);
    doc.text(`Total Records: ${totalRecords}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.text(`India Banks: ${countryCounts.India}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.text(`Canada Banks: ${countryCounts.Canada}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.text(`US Banks: ${countryCounts.US}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    Object.entries(holderCounts).forEach(([name, count]) => {
      doc.text(`Accounts for ${name}: ${count}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 7;
    });

    // Add new page for records
    let currentPage = 1;
    const totalPages = Math.ceil(bankRecords.length / 2) + 1; // +1 for summary page

    bankRecords.forEach((record, index) => {
      // Start new page every 2 records (except first record after summary)
      if (index > 0 && index % 2 === 0) {
        doc.addPage();
        currentPage++;
        yPos = margin;
      }

      // Add footer to current page
      addFooter(doc, totalRecords, currentPage, totalPages);

      // Record header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      yPos += 10;
      doc.text(`${record.Bank_Institution || ''} - ${record.Bank_Ac_Type || ''}`, margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Account Tag: ${record.Bank_Ac_Tag || ''}`, margin, yPos);
      yPos += 6;
      doc.text(`Country: ${record.Bank_Country || ''}`, margin, yPos);
      yPos += 8;

      // Holders
      if (record.Bank_Holders && record.Bank_Holders.length > 0) {
        record.Bank_Holders.forEach((holder, hIdx) => {
          doc.setFont(undefined, 'bold');
          doc.text(`Holder ${hIdx + 1}:`, margin, yPos);
          yPos += 6;
          doc.setFont(undefined, 'normal');
          doc.text(`  Name: ${holder.name || ''}`, margin, yPos);
          yPos += 5;
          doc.text(`  Email/Phone: ${holder.emailPhone || ''}`, margin, yPos);
          yPos += 5;
          doc.text(`  Login/Password: ${holder.loginPassword || ''}`, margin, yPos);
          yPos += 5;
          doc.text(`  Debit Card: ${holder.debitCard || ''}`, margin, yPos);
          yPos += 6;
        });
      }

      // Nomination
      doc.setFont(undefined, 'bold');
      doc.text('Nomination:', margin, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.text(`  Name: ${record.Bank_Nominee_Name || ''}`, margin, yPos);
      yPos += 5;
      doc.text(`  Contact: ${record.Bank_Nominee_Contact || ''}`, margin, yPos);
      yPos += 8;

      // Helpline
      doc.setFont(undefined, 'bold');
      doc.text('Helpline:', margin, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      const phones = [record.Bank_Helpline_Phone1, record.Bank_Helpline_Phone2, record.Bank_Helpline_Phone3, record.Bank_Helpline_Phone4].filter(p => p);
      if (phones.length > 0) {
        doc.text(`  Phones: ${phones.join(', ')}`, margin, yPos);
        yPos += 5;
      }
      const emails = [record.Bank_Helpline_Email1, record.Bank_Helpline_Email2, record.Bank_Helpline_Email3, record.Bank_Helpline_Email4].filter(e => e);
      if (emails.length > 0) {
        doc.text(`  Emails: ${emails.join(', ')}`, margin, yPos);
        yPos += 5;
      }
      if (record.Bank_Helpline_URL) {
        doc.text(`  URL: ${record.Bank_Helpline_URL}`, margin, yPos);
        yPos += 5;
      }
      yPos += 6;

      // Notes
      if (record.Bank_Notes) {
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', margin, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
        const notesLines = doc.splitTextToSize(record.Bank_Notes, pageWidth - 2 * margin);
        doc.text(notesLines, margin, yPos);
        yPos += notesLines.length * 5;
      }

      yPos += 10;

      // Check if we need a new page
      if (yPos > pageHeight - 30) {
        doc.addPage();
        currentPage++;
        yPos = margin;
      }
    });

    // Download PDF
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const filename = `ClearView_Banks_${year}_${month}_${day}.pdf`;
    doc.save(filename);
  }

  function addFooter(doc, totalRecords, currentPage, totalPages) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const footerText = `Clearview Banks Data | Total Records: (${totalRecords}) | Page ${currentPage}/${totalPages}`;
    doc.setFontSize(8);
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  function printRecord(record) {
    const printWindow = window.open('', '_blank');
    const holdersHtml = record.Bank_Holders.map((holder, idx) => `
      <div style="border:1px solid #ccc;padding:10px;margin-bottom:10px;">
        <h4>Holder ${idx + 1}</h4>
        <p><strong>Name:</strong> ${holder.name || ''}</p>
        <p><strong>Email/Phone:</strong> ${holder.emailPhone || ''}</p>
        <p><strong>Login/Password:</strong> ${holder.loginPassword || ''}</p>
        <p><strong>Debit Card:</strong> ${holder.debitCard || ''}</p>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Bank Account - ${record.Bank_Institution || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #b87333; }
            .section { margin: 20px 0; }
            @media print { @page { size: portrait; } }
          </style>
        </head>
        <body>
          <h1>${record.Bank_Institution || ''} - ${record.Bank_Ac_Type || ''}</h1>
          <div class="section">
            <p><strong>Account Tag:</strong> ${record.Bank_Ac_Tag || ''}</p>
            <p><strong>Country:</strong> ${record.Bank_Country || ''}</p>
          </div>
          <div class="section">
            <h3>Holders</h3>
            ${holdersHtml}
          </div>
          <div class="section">
            <h3>Nomination</h3>
            <p><strong>Name:</strong> ${record.Bank_Nominee_Name || ''}</p>
            <p><strong>Contact:</strong> ${record.Bank_Nominee_Contact || ''}</p>
          </div>
          <div class="section">
            <h3>Helpline</h3>
            <p><strong>Phones:</strong> ${[record.Bank_Helpline_Phone1, record.Bank_Helpline_Phone2, record.Bank_Helpline_Phone3, record.Bank_Helpline_Phone4].filter(p => p).join(', ') || 'None'}</p>
            <p><strong>Emails:</strong> ${[record.Bank_Helpline_Email1, record.Bank_Helpline_Email2, record.Bank_Helpline_Email3, record.Bank_Helpline_Email4].filter(e => e).join(', ') || 'None'}</p>
            ${record.Bank_Helpline_URL ? `<p><strong>URL:</strong> ${record.Bank_Helpline_URL}</p>` : ''}
          </div>
          <div class="section">
            <h3>Notes</h3>
            <p>${record.Bank_Notes || ''}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }
});


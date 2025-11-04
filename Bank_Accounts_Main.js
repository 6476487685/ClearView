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

  // Initialize - populate dropdowns after DOM is ready
  setTimeout(() => {
    loadAccountTags();
    renderRecords();
    // Don't call populateInstitutionAndAcType here - it will be called when modal opens
  }, 100);

  // Edit/Display Mode Toggle
  btnEditMode.addEventListener('click', () => {
    isEditMode = true;
    btnEditMode.style.display = 'none';
    btnDisplayMode.style.display = 'inline-flex';
    document.querySelectorAll('.bank-record-card').forEach(card => {
      card.classList.remove('read-only');
    });
  });

  btnDisplayMode.addEventListener('click', () => {
    isEditMode = false;
    btnEditMode.style.display = 'inline-flex';
    btnDisplayMode.style.display = 'none';
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

  // Add Record - always visible, auto-switches to Edit Mode if needed
  btnAddRecord.addEventListener('click', () => {
    // If not in Edit Mode, switch to Edit Mode first
    if (!isEditMode) {
      isEditMode = true;
      btnEditMode.style.display = 'none';
      btnDisplayMode.style.display = 'inline-flex';
      document.querySelectorAll('.bank-record-card').forEach(card => {
        card.classList.remove('read-only');
      });
    }
    
    editIndex = null;
    bankForm.reset();
    formHasChanges = false;
    originalFormData = null;
    modalTitle.textContent = 'Add Bank Account';
    populateModalDropdowns();
    populateNomineeDropdown();
    renderHolders();
    bankModal.classList.add('show');
    setupAccountTagCheck();
  });

  // Track if form has changes
  let formHasChanges = false;
  let originalFormData = null;

  // Track form changes
  bankForm.addEventListener('input', () => {
    formHasChanges = true;
  });

  bankForm.addEventListener('change', () => {
    formHasChanges = true;
  });

  // Cancel with confirmation if changes exist
  cancelBtn.addEventListener('click', () => {
    if (formHasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }
    closeModal();
  });

  // Close modal function
  function closeModal() {
    bankModal.classList.remove('show');
    editIndex = null;
    bankForm.reset();
    formHasChanges = false;
    originalFormData = null;
  }

  // Prevent closing modal on outside click - require explicit cancel
  window.addEventListener('click', (e) => {
    if (e.target === bankModal) {
      // Don't close on outside click - user must use Cancel button
      // This prevents accidental closing
      return;
    }
  });

  // Prevent ESC key from closing modal unless form is empty
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bankModal.classList.contains('show')) {
      if (formHasChanges) {
        if (!confirm('You have unsaved changes. Press Cancel button to discard changes.')) {
          e.preventDefault();
          return;
        }
      }
      closeModal();
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
        holder: document.getElementById(`Bank_Holder_${i}_Holder`).value || '',
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
      Bank_Nominee_Name_Text: document.getElementById('Bank_Nominee_Name_Text').value || '',
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

    // Reset form change tracking
    formHasChanges = false;
    originalFormData = null;

    // Return to display mode
    isEditMode = false;
    btnEditMode.style.display = 'inline-flex';
    btnDisplayMode.style.display = 'none';

    closeModal();
    renderRecords();
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

      if (!institutionSelect || !acTypeSelect) {
        console.warn('Institution or Ac_Type select elements not found');
        return;
      }

      // Populate Institution
      const institutions = commonData.Institution || [];
      institutionSelect.innerHTML = '<option value="">Select Institution</option>';
      if (institutions.length > 0) {
        institutions.forEach(inst => {
          if (inst && inst !== '') {
            institutionSelect.innerHTML += `<option value="${inst}">${inst}</option>`;
          }
        });
      } else {
        console.log('No institutions found in master data');
      }

      // Populate Ac_Type
      const acTypes = commonData.Ac_Type || [];
      acTypeSelect.innerHTML = '<option value="">Select Account Type</option>';
      if (acTypes.length > 0) {
        acTypes.forEach(type => {
          if (type && type !== '') {
            acTypeSelect.innerHTML += `<option value="${type}">${type}</option>`;
          }
        });
      } else {
        console.log('No Ac_Type found in master data');
      }
    } catch (e) {
      console.error('Error populating Institution and Ac_Type:', e);
    }
  }

  // Populate Ac_Holder dropdown
  function populateAcHolderDropdown(selectElement) {
    try {
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let commonData = {};
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        commonData = unifiedData.common || {};
      }

      const holders = commonData.Ac_Holder || [];
      selectElement.innerHTML = '<option value="">Select Holder</option>';
      if (holders.length > 0) {
        holders.forEach(holder => {
          if (holder && holder !== '') {
            selectElement.innerHTML += `<option value="${holder}">${holder}</option>`;
          }
        });
      }
    } catch (e) {
      console.error('Error populating Ac_Holder:', e);
    }
  }

  // Populate Nominee dropdown from Ac_Holder
  function populateNomineeDropdown() {
    try {
      const nomineeSelect = document.getElementById('Bank_Nominee_Name');
      if (!nomineeSelect) return;

      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let commonData = {};
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        commonData = unifiedData.common || {};
      }

      const holders = commonData.Ac_Holder || [];
      
      // Remove any existing event listeners by cloning
      const newSelect = nomineeSelect.cloneNode(true);
      nomineeSelect.parentNode.replaceChild(newSelect, nomineeSelect);
      
      // Populate the cloned select
      newSelect.innerHTML = '<option value="">Select Nominee</option>';
      if (holders.length > 0) {
        holders.forEach(holder => {
          if (holder && holder !== '') {
            newSelect.innerHTML += `<option value="${holder}">${holder}</option>`;
          }
        });
      }
      
      // Auto-fill name field when nominee is selected
      newSelect.addEventListener('change', () => {
        const nomineeNameField = document.getElementById('Bank_Nominee_Name_Text');
        if (nomineeNameField) {
          nomineeNameField.value = newSelect.value || '';
        }
      });
    } catch (e) {
      console.error('Error populating Nominee dropdown:', e);
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
            <label>Holder (Ac_Holder)</label>
            <select id="Bank_Holder_${i}_Holder" ${!isEditMode ? 'disabled' : ''}></select>
          </div>
          <div>
            <label>Name</label>
            <input type="text" id="Bank_Holder_${i}_Name" ${!isEditMode ? 'readonly' : ''}>
          </div>
        </div>
        <div class="holder-row">
          <div>
            <label>Email/Phone</label>
            <input type="text" id="Bank_Holder_${i}_EmailPhone" ${!isEditMode ? 'readonly' : ''} placeholder="email@example.com | +91 647-647-1234">
            <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px;">Format: email | +country_code phone</small>
          </div>
          <div>
            <label>Login/Password</label>
            <div class="password-field">
              <input type="password" id="Bank_Holder_${i}_LoginPassword" class="password-input" data-holder="${i}" ${!isEditMode ? 'readonly' : ''}>
              <button type="button" class="password-toggle" data-holder="${i}" style="display:none;">👁️</button>
            </div>
          </div>
        </div>
        <div class="holder-row">
          <div>
            <label>Debit Card Info</label>
            <input type="text" id="Bank_Holder_${i}_DebitCard" ${!isEditMode ? 'readonly' : ''} placeholder="1234-5678-0908-1456 | 05-25 To 05-28 | 123 | Master Card | 2345">
            <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px;">Format: Card Number | Valid From To | CVV | Card Type | PIN</small>
          </div>
          <div></div>
        </div>
      `;
      holdersContainer.appendChild(holderSection);

      // Populate Holder dropdown for this holder
      const holderSelect = document.getElementById(`Bank_Holder_${i}_Holder`);
      if (holderSelect) {
        populateAcHolderDropdown(holderSelect);
      }

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
            const holderField = document.getElementById(`Bank_Holder_${holderNum}_Holder`);
            const nameField = document.getElementById(`Bank_Holder_${holderNum}_Name`);
            const emailPhoneField = document.getElementById(`Bank_Holder_${holderNum}_EmailPhone`);
            const loginPasswordField = document.getElementById(`Bank_Holder_${holderNum}_LoginPassword`);
            const debitCardField = document.getElementById(`Bank_Holder_${holderNum}_DebitCard`);
            
            if (holderField) holderField.value = holder.holder || '';
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

    // Create beautiful card-style holders block
    const holdersHtml = record.Bank_Holders.map((holder, idx) => `
      <div class="info-card holder-card">
        <div class="info-card-header">
          <h4>👤 Holder ${idx + 1}</h4>
        </div>
        <div class="info-card-body">
          <div class="info-row">
            <span class="info-label">Holder:</span>
            <span class="info-value">${holder.holder || ''}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${holder.name || ''}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email/Phone:</span>
            <span class="info-value">${holder.emailPhone || ''}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Login/Password:</span>
            <span class="info-value password-display" data-holder="${idx + 1}" data-password="${holder.loginPassword || ''}" style="cursor:pointer;user-select:none;">••••••••</span>
          </div>
          <div class="info-row">
            <span class="info-label">Debit Card:</span>
            <span class="info-value">${holder.debitCard || ''}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Create beautiful helpline block
    const helplinePhones = [
      record.Bank_Helpline_Phone1,
      record.Bank_Helpline_Phone2,
      record.Bank_Helpline_Phone3,
      record.Bank_Helpline_Phone4
    ].filter(p => p);

    const helplineEmails = [
      record.Bank_Helpline_Email1,
      record.Bank_Helpline_Email2,
      record.Bank_Helpline_Email3,
      record.Bank_Helpline_Email4
    ].filter(e => e);

    const helplineHtml = `
      <div class="info-card helpline-card">
        <div class="info-card-header">
          <h4>📞 Helpline Information</h4>
        </div>
        <div class="info-card-body">
          ${helplinePhones.length > 0 ? `
            <div class="info-row">
              <span class="info-label">Phones:</span>
              <div class="info-value-list">
                ${helplinePhones.map(phone => `<span class="info-badge">${phone}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          ${helplineEmails.length > 0 ? `
            <div class="info-row">
              <span class="info-label">Emails:</span>
              <div class="info-value-list">
                ${helplineEmails.map(email => `<span class="info-badge">${email}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          ${record.Bank_Helpline_URL ? `
            <div class="info-row">
              <span class="info-label">URL:</span>
              <span class="info-value"><a href="${record.Bank_Helpline_URL}" target="_blank" class="info-link">${record.Bank_Helpline_URL}</a></span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Create nominee card
    const nomineeHtml = `
      <div class="info-card nominee-card">
        <div class="info-card-header">
          <h4>👥 Nomination</h4>
        </div>
        <div class="info-card-body">
          <div class="info-row">
            <span class="info-label">Nominee:</span>
            <span class="info-value">${record.Bank_Nominee_Name || ''}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nominee Name:</span>
            <span class="info-value">${record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || ''}</span>
          </div>
          ${record.Bank_Nominee_Contact ? `
            <div class="info-row">
              <span class="info-label">Contact:</span>
              <span class="info-value">${record.Bank_Nominee_Contact}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    card.innerHTML = `
      <div class="bank-record-header">
        <div class="bank-record-title">
          <span class="bank-icon">🏦</span>
          <div>
            <div class="bank-main-title">${record.Bank_Institution || ''} - ${record.Bank_Ac_Type || ''}</div>
            <div class="bank-subtitle">${record.Bank_Ac_Tag || ''} • ${record.Bank_Country || ''}</div>
          </div>
        </div>
        <div class="bank-record-actions">
          ${isEditMode ? `<button class="btn-edit" data-index="${index}">✏️ Edit</button>` : ''}
          ${isEditMode ? `<button class="btn-delete" data-index="${index}">🗑️ Delete</button>` : ''}
          <button class="btn-print" data-index="${index}">🖨️ Print</button>
        </div>
      </div>

      <div class="bank-info-grid">
        <div class="info-card basic-info-card">
          <div class="info-card-header">
            <h4>📋 Account Information</h4>
          </div>
          <div class="info-card-body">
            <div class="info-row">
              <span class="info-label">Institution:</span>
              <span class="info-value">${record.Bank_Institution || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Account Type:</span>
              <span class="info-value">${record.Bank_Ac_Type || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Account Tag:</span>
              <span class="info-value">${record.Bank_Ac_Tag || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Country:</span>
              <span class="info-value">${record.Bank_Country || ''}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="holders-container-display">
        ${holdersHtml}
      </div>

      <div class="nominee-container-display">
        ${nomineeHtml}
      </div>

      ${helplineHtml}

      ${record.Bank_Notes ? `
        <div class="info-card notes-card">
          <div class="info-card-header">
            <h4>📝 Notes</h4>
          </div>
          <div class="info-card-body">
            <div class="notes-content">${record.Bank_Notes}</div>
          </div>
        </div>
      ` : ''}
    `;

    // Event Listeners
    const editBtn = card.querySelector('.btn-edit');
    const deleteBtn = card.querySelector('.btn-delete');
    const printBtn = card.querySelector('.btn-print');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (!isEditMode) return;
        editIndex = index;
        formHasChanges = false;
        originalFormData = JSON.stringify(record);
        loadRecordIntoForm(record);
        modalTitle.textContent = 'Edit Bank Account';
        populateModalDropdowns();
        populateNomineeDropdown();
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
    
    // Load Nominee - it's now a dropdown from Ac_Holder
    const nomineeSelect = document.getElementById('Bank_Nominee_Name');
    const nomineeNameField = document.getElementById('Bank_Nominee_Name_Text');
    if (nomineeSelect) {
      nomineeSelect.value = record.Bank_Nominee_Name || '';
    }
    if (nomineeNameField) {
      nomineeNameField.value = record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || '';
    }
    
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

      // Add consolidated master data using global function
      if (typeof addConsolidatedMasterDataToWorkbook === 'function') {
        addConsolidatedMasterDataToWorkbook(wb);
      } else {
        console.warn('Global master data export function not available, using fallback');
        // Fallback to individual sheets if global function not loaded
        const unifiedDataStr = localStorage.getItem('unified_master_data');
        const unifiedData = unifiedDataStr ? JSON.parse(unifiedDataStr) : {};
        
        if (unifiedData.common) {
          Object.entries(unifiedData.common).forEach(([key, values]) => {
            if (Array.isArray(values) && values.length > 0 && key !== 'Ac_Classification') {
              const ws = XLSX.utils.aoa_to_sheet([[key], ...values.map(v => [v])]);
              XLSX.utils.book_append_sheet(wb, ws, key);
            }
          });
        }
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
              banksData.push([`Holder ${hIdx + 1} (Ac_Holder)`, holder.holder || '']);
              banksData.push([`Holder ${hIdx + 1} Name`, holder.name || '']);
              banksData.push([`Holder ${hIdx + 1} Email/Phone`, holder.emailPhone || '']);
              banksData.push([`Holder ${hIdx + 1} Login/Password`, holder.loginPassword || '']);
              banksData.push([`Holder ${hIdx + 1} Debit Card`, holder.debitCard || '']);
            });
          }
          
          banksData.push(['Nominee (Ac_Holder)', record.Bank_Nominee_Name || '']);
          banksData.push(['Nominee Name', record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || '']);
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

      // Account Information Box
      doc.setDrawColor(66, 133, 244);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 25);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(66, 133, 244);
      doc.text('Account Information', margin + 5, yPos + 8);
      yPos += 10;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Institution: ${record.Bank_Institution || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Account Type: ${record.Bank_Ac_Type || ''} | Tag: ${record.Bank_Ac_Tag || ''} | Country: ${record.Bank_Country || ''}`, margin + 5, yPos);
      yPos += 10;

      // Holders - Card Style
      if (record.Bank_Holders && record.Bank_Holders.length > 0) {
        record.Bank_Holders.forEach((holder, hIdx) => {
          // Holder Card Box
          doc.setDrawColor(66, 133, 244);
          doc.rect(margin, yPos, pageWidth - 2 * margin, 30);
          doc.setFillColor(66, 133, 244, 10);
          doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
          
          doc.setFont(undefined, 'bold');
          doc.setTextColor(66, 133, 244);
          doc.text(`👤 Holder ${hIdx + 1}`, margin + 5, yPos + 6);
          yPos += 10;
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Holder: ${holder.holder || ''} | Name: ${holder.name || ''}`, margin + 5, yPos);
          yPos += 5;
          doc.text(`Email/Phone: ${holder.emailPhone || ''}`, margin + 5, yPos);
          yPos += 5;
          doc.text(`Login/Password: ${holder.loginPassword || ''} | Debit Card: ${holder.debitCard || ''}`, margin + 5, yPos);
          yPos += 8;
        });
      }

      // Nomination - Card Style
      doc.setDrawColor(52, 168, 83);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 25);
      doc.setFillColor(52, 168, 83, 10);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(52, 168, 83);
      doc.text('👥 Nomination', margin + 5, yPos + 6);
      yPos += 10;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Nominee: ${record.Bank_Nominee_Name || ''} | Name: ${record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || ''}`, margin + 5, yPos);
      yPos += 5;
      if (record.Bank_Nominee_Contact) {
        doc.text(`Contact: ${record.Bank_Nominee_Contact}`, margin + 5, yPos);
        yPos += 5;
      }
      yPos += 8;

      // Helpline - Card Style
      doc.setDrawColor(251, 188, 4);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 35);
      doc.setFillColor(251, 188, 4, 10);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(251, 188, 4);
      doc.text('📞 Helpline Information', margin + 5, yPos + 6);
      yPos += 10;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      const phones = [record.Bank_Helpline_Phone1, record.Bank_Helpline_Phone2, record.Bank_Helpline_Phone3, record.Bank_Helpline_Phone4].filter(p => p);
      if (phones.length > 0) {
        doc.text(`Phones: ${phones.join(' | ')}`, margin + 5, yPos);
        yPos += 5;
      }
      const emails = [record.Bank_Helpline_Email1, record.Bank_Helpline_Email2, record.Bank_Helpline_Email3, record.Bank_Helpline_Email4].filter(e => e);
      if (emails.length > 0) {
        doc.text(`Emails: ${emails.join(' | ')}`, margin + 5, yPos);
        yPos += 5;
      }
      if (record.Bank_Helpline_URL) {
        doc.text(`URL: ${record.Bank_Helpline_URL}`, margin + 5, yPos);
        yPos += 5;
      }
      yPos += 8;

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
        <p><strong>Holder (Ac_Holder):</strong> ${holder.holder || ''}</p>
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


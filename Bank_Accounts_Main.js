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
        clientID: document.getElementById(`Bank_Holder_${i}_ClientID`).value || '',
        userID: document.getElementById(`Bank_Holder_${i}_UserID`).value || '',
        emailPhone: document.getElementById(`Bank_Holder_${i}_EmailPhone`).value || '',
        loginPassword: document.getElementById(`Bank_Holder_${i}_LoginPassword`).value || '',
        debitCard: document.getElementById(`Bank_Holder_${i}_DebitCard`).value || '',
        pins: document.getElementById(`Bank_Holder_${i}_Pins`).value || 'XXXXXX | XXXXXX | XXXXXX'
      });
    }

    const record = {
      Bank_Institution: document.getElementById('Bank_Institution').value,
      Bank_Ac_Type: document.getElementById('Bank_Ac_Type').value,
      Bank_Ac_Tag: document.getElementById('Bank_Ac_Tag').value,
      Bank_Country: document.getElementById('Bank_Country').value,
      Bank_Account_Number: document.getElementById('Bank_Account_Number').value || '',
      Bank_Transit_IFSC: document.getElementById('Bank_Transit_IFSC').value || '',
      Bank_Institution_MICR: document.getElementById('Bank_Institution_MICR').value || '',
      Bank_Account_Status: document.getElementById('Bank_Account_Status').value || '',
      Bank_Min_Balance: document.getElementById('Bank_Min_Balance').value || '',
      Bank_Branch_Address: document.getElementById('Bank_Branch_Address').value || '',
      Bank_Holders: holders,
      Bank_Nominee_Name: document.getElementById('Bank_Nominee_Name').value || '',
      Bank_Nominee_Name_Text: document.getElementById('Bank_Nominee_Name_Text').value || '',
      Bank_Nominee_Email: document.getElementById('Bank_Nominee_Email').value || '',
      Bank_Nominee_Phone: document.getElementById('Bank_Nominee_Phone').value || '',
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

  // Populate Account Status dropdown from Ac_Status master data
  function populateAccountStatusDropdown() {
    try {
      const accountStatusSelect = document.getElementById('Bank_Account_Status');
      if (!accountStatusSelect) return;

      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let commonData = {};
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        commonData = unifiedData.common || {};
      }

      const accountStatuses = commonData.Ac_Status || [];
      accountStatusSelect.innerHTML = '<option value="">Select Account Status</option>';
      if (accountStatuses.length > 0) {
        accountStatuses.forEach(status => {
          if (status && status !== '') {
            accountStatusSelect.innerHTML += `<option value="${status}">${status}</option>`;
          }
        });
      }
    } catch (e) {
      console.error('Error populating Account Status dropdown:', e);
    }
  }

  // Populate Modal Dropdowns
  function populateModalDropdowns() {
    loadAccountTags();
    populateInstitutionAndAcType();
    populateAccountStatusDropdown();

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
            <label>Client_ID_or_Customer_ID</label>
            <input type="text" id="Bank_Holder_${i}_ClientID" ${!isEditMode ? 'readonly' : ''} placeholder="Client or Customer ID">
          </div>
          <div></div>
        </div>
        <div class="holder-row">
          <div>
            <label>UserID_or_LoginID</label>
            <input type="text" id="Bank_Holder_${i}_UserID" ${!isEditMode ? 'readonly' : ''} placeholder="UserID or LoginID">
          </div>
          <div>
            <label>Login_Password</label>
            <div class="password-field">
              <input type="password" id="Bank_Holder_${i}_LoginPassword" class="password-input" data-holder="${i}" ${!isEditMode ? 'readonly' : ''}>
              <button type="button" class="password-toggle" data-holder="${i}" style="display:none;">👁️</button>
            </div>
          </div>
        </div>
        <div class="holder-row">
          <div>
            <label>Email/Phone</label>
            <input type="text" id="Bank_Holder_${i}_EmailPhone" ${!isEditMode ? 'readonly' : ''} placeholder="email@example.com | +91 123-456-7890">
            <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px;">Format: email | +CountryCode Phone (e.g., +91 123-456-7890)</small>
          </div>
          <div></div>
        </div>
        <div class="holder-row">
          <div style="flex: 2.5;">
            <label>Debit Card Info</label>
            <input type="text" id="Bank_Holder_${i}_DebitCard" ${!isEditMode ? 'readonly' : ''} placeholder="Card Number | Valid From To | CVV | Card Type | Extra Digits | DCPIN">
            <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px;">Format: Card Number | Valid From To | CVV | Card Type | Extra Digits | DCPIN</small>
          </div>
          <div style="flex: 1;">
            <label>PIN | TPIN | MPIN</label>
            <input type="text" id="Bank_Holder_${i}_Pins" class="pins-input" ${!isEditMode ? 'readonly' : ''} value="XXXXXX | XXXXXX | XXXXXX" placeholder="XXXXXX | XXXXXX | XXXXXX" style="font-family:'Courier New',monospace;letter-spacing:2px;color:var(--text-secondary);">
            <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px;">Default: XXXXXX | XXXXXX | XXXXXX (always masked)</small>
          </div>
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
            const clientIDField = document.getElementById(`Bank_Holder_${holderNum}_ClientID`);
            const userIDField = document.getElementById(`Bank_Holder_${holderNum}_UserID`);
            const emailPhoneField = document.getElementById(`Bank_Holder_${holderNum}_EmailPhone`);
            const loginPasswordField = document.getElementById(`Bank_Holder_${holderNum}_LoginPassword`);
            const debitCardField = document.getElementById(`Bank_Holder_${holderNum}_DebitCard`);
            const pinsField = document.getElementById(`Bank_Holder_${holderNum}_Pins`);
            
            if (holderField) holderField.value = holder.holder || '';
            if (nameField) nameField.value = holder.name || '';
            if (clientIDField) clientIDField.value = holder.clientID || '';
            if (userIDField) userIDField.value = holder.userID || '';
            if (emailPhoneField) emailPhoneField.value = holder.emailPhone || '';
            if (loginPasswordField) {
              loginPasswordField.value = holder.loginPassword || '';
              // Mask password initially
              loginPasswordField.type = 'password';
            }
            if (debitCardField) debitCardField.value = holder.debitCard || '';
            if (pinsField) pinsField.value = holder.pins || 'XXXXXX | XXXXXX | XXXXXX';
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

    // Create holders display - 2x2 grid for up to 4 holders
    const holderCount = record.Bank_Holders ? record.Bank_Holders.length : 0;
    const isSingleHolder = holderCount === 1;
    
    // If single holder, use Notes style; otherwise use grid cards
    let holdersHtml = '';
    if (isSingleHolder) {
      // Single holder - use Notes style
      const holder = record.Bank_Holders[0];
      const holderType = 'Sole Holder';
      holdersHtml = `
        <div class="notes-card-minimal">
          <div class="section-heading-minimal"><strong>Holders & Contacts (1)</strong></div>
          <div class="notes-content-minimal">
            <div><strong>Holder 1: ${holder.name || ''}</strong> <span class="holder-type-badge-inline">${holderType}</span></div>
            ${holder.clientID ? `<div>Client_ID_or_Customer_ID: ${holder.clientID}</div>` : ''}
            ${holder.userID ? `<div>UserID_or_LoginID: ${holder.userID} / Login_Password: <span class="password-display" data-holder="1" data-password="${holder.loginPassword || ''}" style="cursor:pointer;user-select:none;">••••••••</span></div>` : ''}
            ${holder.emailPhone ? `<div class="section-heading-minimal"><strong>Email or Phone</strong></div><div>${holder.emailPhone}</div>` : ''}
            ${holder.debitCard ? `<div class="section-heading-minimal"><strong>Debit Card Information</strong></div><div>${holder.debitCard}</div>` : ''}
            ${holder.pins && holder.pins !== 'XXXXXX | XXXXXX | XXXXXX' ? `<div>PIN | TPIN | MPIN: ${holder.pins}</div>` : ''}
          </div>
        </div>
      `;
    } else {
      // Multiple holders - use 2x2 grid
      holdersHtml = record.Bank_Holders.map((holder, idx) => {
        const holderType = idx === 0 ? 'Sole Holder' : 'Joint Holder';
        return `
          <div class="holder-card-minimal">
            <div class="holder-card-header-minimal">
              <strong>Holder ${idx + 1}: ${holder.name || ''}</strong>
              <span class="holder-type-badge">${holderType}</span>
            </div>
            <div class="holder-card-content">
              <div class="holder-personal-details">
                ${holder.clientID ? `<div>Client_ID_or_Customer_ID: ${holder.clientID}</div>` : ''}
                ${holder.userID ? `<div>UserID_or_LoginID: ${holder.userID} / Login_Password: <span class="password-display" data-holder="${idx + 1}" data-password="${holder.loginPassword || ''}" style="cursor:pointer;user-select:none;">••••••••</span></div>` : ''}
                ${holder.emailPhone ? `<div class="section-heading-minimal"><strong>Email or Phone</strong></div><div>${holder.emailPhone}</div>` : ''}
              </div>
              ${holder.debitCard ? `<div class="holder-card-separator"></div><div class="holder-debit-card"><div class="section-heading-minimal"><strong>Debit Card Information</strong></div>${holder.debitCard}</div>` : ''}
              ${holder.pins && holder.pins !== 'XXXXXX | XXXXXX | XXXXXX' ? `<div class="holder-card-separator"></div><div class="holder-pins">PIN | TPIN | MPIN: ${holder.pins}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

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
          ${record.Bank_Nominee_Email || record.Bank_Nominee_Phone ? `
            <div class="info-row">
              <span class="info-label">Email or Phone:</span>
              <span class="info-value">${[record.Bank_Nominee_Email, record.Bank_Nominee_Phone].filter(v => v).join(' | ') || ''}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    card.innerHTML = `
      <div class="account-tag-bar-minimal">
        <div class="account-tag-content-minimal">
          ${record.Bank_Ac_Tag || 'No Account Tag'}
        </div>
      </div>

      <div class="bank-record-header-minimal">
        <div class="bank-record-actions">
          ${isEditMode ? `<button class="btn-edit" data-index="${index}">✏️ Edit</button>` : ''}
          ${isEditMode ? `<button class="btn-delete" data-index="${index}">🗑️ Delete</button>` : ''}
          <button class="btn-print" data-index="${index}">🖨️ Print</button>
        </div>
      </div>

      <div class="two-column-layout">
        <div class="column-left">
          <div class="fields-card-minimal">
            <div class="section-heading-minimal"><strong>Account Information</strong></div>
            <div class="fields-content-minimal">
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Bank Name:</strong></span>
                <span class="field-value-minimal">${record.Bank_Institution || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Country:</strong></span>
                <span class="field-value-minimal">${record.Bank_Country || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Branch Address:</strong></span>
                <span class="field-value-minimal">${record.Bank_Branch_Address || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Account Type:</strong></span>
                <span class="field-value-minimal">${record.Bank_Ac_Type || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Account Number:</strong></span>
                <span class="field-value-minimal">${record.Bank_Account_Number || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Transit / IFSC:</strong></span>
                <span class="field-value-minimal">${record.Bank_Transit_IFSC || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Institution / MICR:</strong></span>
                <span class="field-value-minimal">${record.Bank_Institution_MICR || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Account Status:</strong></span>
                <span class="field-value-minimal">${record.Bank_Account_Status || ''}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Minimum Balance Required:</strong></span>
                <span class="field-value-minimal">${record.Bank_Min_Balance || ''}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="column-right">
          <div class="helpline-card-minimal">
            <div class="section-heading-minimal"><strong>Helpline</strong></div>
            <div class="helpline-content-minimal">
              ${helplinePhones.length > 0 ? `<div><strong>Phone:</strong> ${helplinePhones.join(' / ')}</div>` : ''}
              ${helplineEmails.length > 0 ? `<div><strong>Email:</strong> ${helplineEmails.join(' / ')}</div>` : ''}
              ${record.Bank_Helpline_URL ? `<div>${record.Bank_Helpline_URL}</div>` : ''}
            </div>
          </div>
        </div>
      </div>

      ${isSingleHolder ? `
        <div class="holders-full-width">
          ${holdersHtml}
        </div>
      ` : `
        <div class="holders-full-width">
          <div class="holders-section-minimal">
            <div class="section-heading-minimal"><strong>Holders & Contacts (${record.Bank_Holders ? record.Bank_Holders.length : 0})</strong></div>
            <div class="holders-container-minimal">
              ${holdersHtml}
            </div>
          </div>
        </div>
      `}

      <div class="nomination-full-width">
          <div class="notes-card-minimal">
          <div class="section-heading-minimal"><strong>Nomination</strong></div>
          <div class="notes-content-minimal">
            <div>${record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || ''}</div>
            ${record.Bank_Nominee_Email || record.Bank_Nominee_Phone ? `<div class="section-heading-minimal"><strong>Email or Phone</strong></div><div>${[record.Bank_Nominee_Email, record.Bank_Nominee_Phone].filter(v => v).join(' | ') || ''}</div>` : ''}
          </div>
        </div>
      </div>

      ${record.Bank_Notes ? `
        <div class="notes-card-minimal full-width">
          <div class="section-heading-minimal"><strong>Notes</strong></div>
          <div class="notes-content-minimal">
            ${record.Bank_Notes.split('\n').map(line => `<div>${line}</div>`).join('')}
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
    document.getElementById('Bank_Account_Number').value = record.Bank_Account_Number || '';
    document.getElementById('Bank_Transit_IFSC').value = record.Bank_Transit_IFSC || '';
    document.getElementById('Bank_Institution_MICR').value = record.Bank_Institution_MICR || '';
    document.getElementById('Bank_Account_Status').value = record.Bank_Account_Status || '';
    document.getElementById('Bank_Min_Balance').value = record.Bank_Min_Balance || '';
    document.getElementById('Bank_Branch_Address').value = record.Bank_Branch_Address || '';
    
    // Load Nominee - it's now a dropdown from Ac_Holder
    const nomineeSelect = document.getElementById('Bank_Nominee_Name');
    const nomineeNameField = document.getElementById('Bank_Nominee_Name_Text');
    if (nomineeSelect) {
      nomineeSelect.value = record.Bank_Nominee_Name || '';
    }
    if (nomineeNameField) {
      nomineeNameField.value = record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || '';
    }
    
    document.getElementById('Bank_Nominee_Email').value = record.Bank_Nominee_Email || '';
    document.getElementById('Bank_Nominee_Phone').value = record.Bank_Nominee_Phone || '';
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
          banksData.push(['Account Number', record.Bank_Account_Number || '']);
          banksData.push(['Transit / IFSC', record.Bank_Transit_IFSC || '']);
          banksData.push(['Institution / MICR', record.Bank_Institution_MICR || '']);
          banksData.push(['Account Status', record.Bank_Account_Status || '']);
          banksData.push(['Minimum Balance Required', record.Bank_Min_Balance || '']);
          banksData.push(['Branch Address', record.Bank_Branch_Address || '']);
          
          // Add holders
          if (record.Bank_Holders) {
            record.Bank_Holders.forEach((holder, hIdx) => {
              banksData.push([`Holder ${hIdx + 1} (Ac_Holder)`, holder.holder || '']);
              banksData.push([`Holder ${hIdx + 1} Name`, holder.name || '']);
              banksData.push([`Holder ${hIdx + 1} Client_ID_or_Customer_ID`, holder.clientID || '']);
              banksData.push([`Holder ${hIdx + 1} UserID_or_LoginID`, holder.userID || '']);
              banksData.push([`Holder ${hIdx + 1} Email/Phone`, holder.emailPhone || '']);
              banksData.push([`Holder ${hIdx + 1} Login_Password`, holder.loginPassword || '']);
              banksData.push([`Holder ${hIdx + 1} Debit Card`, holder.debitCard || '']);
              banksData.push([`Holder ${hIdx + 1} PIN | TPIN | MPIN`, holder.pins || '']);
            });
          }
          
          banksData.push(['Nominee (Ac_Holder)', record.Bank_Nominee_Name || '']);
          banksData.push(['Nominee Name', record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || '']);
          banksData.push(['Nominee_Email', record.Bank_Nominee_Email || '']);
          banksData.push(['Nominee_Phone', record.Bank_Nominee_Phone || '']);
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

      // Account Tag Bar (light blue background)
      doc.setFillColor(227, 242, 253); // #e3f2fd
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(25, 118, 210); // #1976d2
      doc.text(`${record.Bank_Ac_Tag || 'No Account Tag'}`, margin + 5, yPos + 7);
      yPos += 15;

      // Fields Card
      doc.setDrawColor(211, 211, 211); // #d3d3d3
      doc.setLineWidth(0.5);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Account Information', margin, yPos);
      yPos += 8;
      
      const fieldsHeight = 55;
      doc.rect(margin, yPos - fieldsHeight + 5, pageWidth - 2 * margin, fieldsHeight);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Bank Name: ${record.Bank_Institution || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Country: ${record.Bank_Country || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Branch Address: ${record.Bank_Branch_Address || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Account Type: ${record.Bank_Ac_Type || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Account Number: ${record.Bank_Account_Number || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Transit / IFSC: ${record.Bank_Transit_IFSC || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Institution / MICR: ${record.Bank_Institution_MICR || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Account Status: ${record.Bank_Account_Status || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Minimum Balance Required: ${record.Bank_Min_Balance || ''}`, margin + 5, yPos);
      yPos += 5;
      doc.text(`Account Tag: ${record.Bank_Ac_Tag || ''}`, margin + 5, yPos);
      yPos += 10;

      // Holders - Minimal Card Style (First is Sole, rest are Joint)
      if (record.Bank_Holders && record.Bank_Holders.length > 0) {
        record.Bank_Holders.forEach((holder, hIdx) => {
          const holderType = hIdx === 0 ? 'Sole Holder' : 'Joint Holder';
          // Holder Card Box with gray border
          doc.setDrawColor(211, 211, 211); // #d3d3d3
          doc.setLineWidth(0.5);
          const cardHeight = 35;
          doc.rect(margin, yPos, pageWidth - 2 * margin, cardHeight);
          
          doc.setFont(undefined, 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(`Holder ${hIdx + 1}: ${holder.name || ''}`, margin + 5, yPos + 6);
          doc.setFontSize(9);
          doc.setTextColor(25, 118, 210); // #1976d2
          doc.text(`(${holderType})`, pageWidth - margin - 35, yPos + 6);
          doc.setFontSize(10);
          yPos += 8;
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          if (holder.clientID) {
            doc.text(`Client_ID_or_Customer_ID: ${holder.clientID}`, margin + 5, yPos);
            yPos += 5;
          }
          if (holder.userID) {
            doc.text(`UserID_or_LoginID: ${holder.userID}`, margin + 5, yPos);
            yPos += 5;
            doc.text(`Login_Password: ${holder.loginPassword || ''}`, margin + 5, yPos);
            yPos += 5;
          }
          if (holder.emailPhone) {
            doc.text(`Email or Phone: ${holder.emailPhone}`, margin + 5, yPos);
            yPos += 5;
          }
          if (holder.debitCard) {
            doc.text(`Debit Card Information: ${holder.debitCard}`, margin + 5, yPos);
            yPos += 5;
          }
          if (holder.pins && holder.pins !== 'XXXXXX | XXXXXX | XXXXXX') {
            doc.text(`PIN | TPIN | MPIN: ${holder.pins}`, margin + 5, yPos);
            yPos += 5;
          }
          yPos += 8;
        });
      }

      // Nomination - Minimal Card Style
      doc.setDrawColor(211, 211, 211);
      doc.setLineWidth(0.5);
      const nomineeHeight = (record.Bank_Nominee_Email || record.Bank_Nominee_Phone) ? 30 : 25;
      doc.rect(margin, yPos, pageWidth - 2 * margin, nomineeHeight);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Nomination', margin + 5, yPos + 6);
      yPos += 10;
      doc.setFont(undefined, 'normal');
      doc.text(`${record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || ''}`, margin + 5, yPos);
      yPos += 5;
      if (record.Bank_Nominee_Email || record.Bank_Nominee_Phone) {
        const emailPhone = [record.Bank_Nominee_Email, record.Bank_Nominee_Phone].filter(v => v).join(' | ');
        doc.text(`Email or Phone: ${emailPhone}`, margin + 5, yPos);
        yPos += 5;
      }
      yPos += 8;

      // Helpline - Minimal Card Style
      const phones = [record.Bank_Helpline_Phone1, record.Bank_Helpline_Phone2, record.Bank_Helpline_Phone3, record.Bank_Helpline_Phone4].filter(p => p);
      const emails = [record.Bank_Helpline_Email1, record.Bank_Helpline_Email2, record.Bank_Helpline_Email3, record.Bank_Helpline_Email4].filter(e => e);
      const helplineHeight = 30 + (phones.length > 0 ? 5 : 0) + (emails.length > 0 ? 5 : 0) + (record.Bank_Helpline_URL ? 5 : 0);
      
      doc.setDrawColor(211, 211, 211);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, pageWidth - 2 * margin, helplineHeight);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Helpline', margin + 5, yPos + 6);
      yPos += 10;
      doc.setFont(undefined, 'normal');
      if (phones.length > 0) {
        doc.text(`${phones.join(' / ')}`, margin + 5, yPos);
        yPos += 5;
      }
      if (emails.length > 0) {
        doc.text(`${emails.join(' / ')}`, margin + 5, yPos);
        yPos += 5;
      }
      if (record.Bank_Helpline_URL) {
        doc.text(`${record.Bank_Helpline_URL}`, margin + 5, yPos);
        yPos += 5;
      }
      yPos += 8;

      // Notes - Minimal Card Style
      if (record.Bank_Notes) {
        const notesLines = record.Bank_Notes.split('\n').filter(l => l.trim());
        const notesHeight = 20 + (notesLines.length * 5);
        doc.setDrawColor(211, 211, 211);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, pageWidth - 2 * margin, notesHeight);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Notes', margin + 5, yPos + 6);
        yPos += 10;
        doc.setFont(undefined, 'normal');
        notesLines.forEach(line => {
          doc.text(line.trim(), margin + 5, yPos);
          yPos += 5;
        });
        yPos += 5;
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
        <p><strong>Client_ID_or_Customer_ID:</strong> ${holder.clientID || ''}</p>
        <p><strong>UserID_or_LoginID:</strong> ${holder.userID || ''}</p>
        <p><strong>Login_Password:</strong> ${holder.loginPassword || ''}</p>
        <p><strong>Email or Phone:</strong> ${holder.emailPhone || ''}</p>
        <p><strong>Debit Card Information:</strong> ${holder.debitCard || ''}</p>
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
            <p><strong>Email or Phone:</strong> ${[record.Bank_Nominee_Email, record.Bank_Nominee_Phone].filter(v => v).join(' | ') || ''}</p>
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


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
      const email = document.getElementById(`Bank_Holder_${i}_Email`).value || '';
      const phone = document.getElementById(`Bank_Holder_${i}_Phone`).value || '';
      const emailPhone = email && phone ? `${email} | ${phone}` : email || phone || '';
      
      holders.push({
        holder: document.getElementById(`Bank_Holder_${i}_Holder`).value || '',
        name: document.getElementById(`Bank_Holder_${i}_Name`).value || '',
        clientID: document.getElementById(`Bank_Holder_${i}_ClientID`).value || '',
        userID: document.getElementById(`Bank_Holder_${i}_UserID`).value || '',
        email: email,
        phone: phone,
        emailPhone: emailPhone, // Keep for backward compatibility
        loginPassword: document.getElementById(`Bank_Holder_${i}_LoginPassword`).value || '',
        debitCard: document.getElementById(`Bank_Holder_${i}_DebitCard`).value || '',
        pins: document.getElementById(`Bank_Holder_${i}_Pins`).value || 'XXXXXX | XXXXXX | XXXXXX',
        interaccEmailOrUPIID: document.getElementById(`Bank_Holder_${i}_Interacc_Email_or_UPI_ID`).value || ''
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
          <div>
            <label>Client_ID_or_Customer_ID</label>
            <input type="text" id="Bank_Holder_${i}_ClientID" ${!isEditMode ? 'readonly' : ''} placeholder="Client or Customer ID">
          </div>
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
          <div>
            <label>Email</label>
            <input type="email" id="Bank_Holder_${i}_Email" ${!isEditMode ? 'readonly' : ''} placeholder="email@example.com">
          </div>
          <div>
            <label>Phone</label>
            <input type="tel" id="Bank_Holder_${i}_Phone" ${!isEditMode ? 'readonly' : ''} placeholder="+91 123-456-7890" title="Format: +country_code phone (e.g., +91 647-647-1234)">
          </div>
        </div>
        <div class="holder-row">
          <div style="flex: 2.5;">
            <label>Debit Card Info <span style="font-size: 10px; color: #4285f4;">[Format: Card Number | Valid From To | CVV | Card Type | Extra Digits | DCPIN]</span></label>
            <input type="text" id="Bank_Holder_${i}_DebitCard" ${!isEditMode ? 'readonly' : ''} placeholder="Card Number | Valid From To | CVV | Card Type | Extra Digits | DCPIN">
          </div>
          <div style="flex: 1.4;">
            <label>PIN | TPIN | MPIN</label>
            <input type="text" id="Bank_Holder_${i}_Pins" class="pins-input" ${!isEditMode ? 'readonly' : ''} value="XXXXXX | XXXXXX | XXXXXX" placeholder="XXXXXX | XXXXXX | XXXXXX" style="font-family:'Courier New',monospace;letter-spacing:2px;color:var(--text-secondary);">
          </div>
          <div style="flex: 1.1;">
            <label>Interacc_Email_or_UPI_ID</label>
            <input type="text" id="Bank_Holder_${i}_Interacc_Email_or_UPI_ID" ${!isEditMode ? 'readonly' : ''} placeholder="Email or UPI ID">
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
            const emailField = document.getElementById(`Bank_Holder_${holderNum}_Email`);
            const phoneField = document.getElementById(`Bank_Holder_${holderNum}_Phone`);
            const loginPasswordField = document.getElementById(`Bank_Holder_${holderNum}_LoginPassword`);
            const debitCardField = document.getElementById(`Bank_Holder_${holderNum}_DebitCard`);
            const pinsField = document.getElementById(`Bank_Holder_${holderNum}_Pins`);
            const interaccEmailOrUPIIDField = document.getElementById(`Bank_Holder_${holderNum}_Interacc_Email_or_UPI_ID`);
            
            if (holderField) holderField.value = holder.holder || '';
            if (nameField) nameField.value = holder.name || '';
            if (clientIDField) clientIDField.value = holder.clientID || '';
            if (userIDField) userIDField.value = holder.userID || '';
            
            // Load email and phone separately, or parse from emailPhone for backward compatibility
            if (emailField) {
              if (holder.email) {
                emailField.value = holder.email;
              } else if (holder.emailPhone) {
                // Parse old format: "email | phone"
                const parts = holder.emailPhone.split(' | ');
                emailField.value = parts[0] || '';
              }
            }
            if (phoneField) {
              if (holder.phone) {
                phoneField.value = holder.phone;
              } else if (holder.emailPhone) {
                // Parse old format: "email | phone"
                const parts = holder.emailPhone.split(' | ');
                phoneField.value = parts.length > 1 ? parts[1] : '';
              }
            }
            
            if (loginPasswordField) {
              loginPasswordField.value = holder.loginPassword || '';
              // Mask password initially
              loginPasswordField.type = 'password';
            }
            if (debitCardField) debitCardField.value = holder.debitCard || '';
            if (pinsField) pinsField.value = holder.pins || 'XXXXXX | XXXXXX | XXXXXX';
            if (interaccEmailOrUPIIDField) interaccEmailOrUPIIDField.value = holder.interaccEmailOrUPIID || '';
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
    // Helper function to create compact table format for holder
    const createHolderTable = (holder, holderNum, holderType) => {
      return `
        <div class="holder-table-container">
          <table class="holder-info-table">
            <thead>
              <tr>
                <th>Client ID or Customer ID:</th>
                <th>Debit Card Information</th>
                <th>Email | Phone</th>
                <th>Interacc Email | UPI ID</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${holder.clientID || ''}</td>
                <td>${holder.debitCard || ''}</td>
                <td>${holder.emailPhone || ''}</td>
                <td>${holder.interaccEmailOrUPIID || ''}</td>
              </tr>
            </tbody>
          </table>
          ${holder.userID ? `
          <div class="holder-additional-info">
            <div><strong>UserID_or_LoginID:</strong> ${holder.userID} / <strong>Login_Password:</strong> <span class="password-display" data-holder="${holderNum}" data-password="${holder.loginPassword || ''}" style="cursor:pointer;user-select:none;">••••••••</span></div>
          </div>
          ` : ''}
          ${holder.pins && holder.pins !== 'XXXXXX | XXXXXX | XXXXXX' ? `
          <div class="holder-additional-info">
            <div><strong>PIN | TPIN | MPIN:</strong> ${holder.pins}</div>
          </div>
          ` : ''}
        </div>
      `;
    };

    if (isSingleHolder) {
      // Single holder - use compact table format
      const holder = record.Bank_Holders[0];
      const holderType = 'Sole Holder';
      holdersHtml = `
        <div class="notes-card-minimal">
          <div class="section-heading-minimal"><strong>Holders & Contacts (1)</strong></div>
          ${createHolderTable(holder, 1, holderType)}
        </div>
      `;
    } else {
      // Multiple holders - use accordion tabs with table format
      holdersHtml = record.Bank_Holders.map((holder, idx) => {
        const holderType = idx === 0 ? 'Sole Holder' : 'Joint Holder';
        const holderId = `holder-${index}-${idx}`;
        const isFirst = idx === 0;
        return `
          <div class="holder-accordion-item">
            <div class="holder-accordion-header ${isFirst ? 'active' : ''}" data-holder-id="${holderId}">
              <div class="holder-accordion-title">
                <strong>Holder ${idx + 1}: ${holder.name || ''}</strong>
                <span class="holder-type-badge">${holderType}</span>
              </div>
              <span class="holder-accordion-icon">${isFirst ? '▼' : '▶'}</span>
            </div>
            <div class="holder-accordion-content" id="${holderId}" style="display: ${isFirst ? 'block' : 'none'};">
              ${createHolderTable(holder, idx + 1, holderType)}
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
              <span class="info-label">Email | Phone:</span>
              <span class="info-value">${[record.Bank_Nominee_Email, record.Bank_Nominee_Phone].filter(v => v).join(' | ') || ''}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    card.innerHTML = `
      <div class="account-tag-bar-minimal">
        <div class="account-tag-content-minimal">
          <span>${record.Bank_Ac_Tag || 'No Account Tag'}</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn-edit" data-index="${index}">✏️ Edit</button>
            <button class="btn-print" data-index="${index}">🖨️ Print</button>
          </div>
        </div>
      </div>

      ${isEditMode ? `
      <div class="bank-record-header-minimal">
        <div class="bank-record-actions">
          <button class="btn-delete" data-index="${index}">🗑️ Delete</button>
        </div>
      </div>
      ` : ''}

      <div class="two-column-layout">
        <div class="column-left">
          <div class="fields-card-minimal">
            <div class="section-heading-minimal"><strong>Bank Information</strong></div>
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
              <div class="field-row-minimal" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #d3d3d3;">
                <span class="field-label-minimal"><strong>Helpline</strong></span>
                <span class="field-value-minimal"></span>
              </div>
              ${helplinePhones.length > 0 ? `
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Phone:</strong></span>
                <span class="field-value-minimal">${helplinePhones.join(' / ')}</span>
              </div>
              ` : ''}
              ${helplineEmails.length > 0 ? `
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Email:</strong></span>
                <span class="field-value-minimal">${helplineEmails.join(' / ')}</span>
              </div>
              ` : ''}
              ${record.Bank_Helpline_URL ? `
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>URL:</strong></span>
                <span class="field-value-minimal"><a href="${record.Bank_Helpline_URL}" target="_blank" style="color: var(--accent); text-decoration: none;">${record.Bank_Helpline_URL}</a></span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="column-right">
          <div class="fields-card-minimal">
            <div class="section-heading-minimal"><strong>Account Information</strong></div>
            <div class="fields-content-minimal">
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
              <div class="field-row-minimal" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #d3d3d3;">
                <span class="field-label-minimal"><strong>Notes:</strong></span>
                <span class="field-value-minimal notes-field-scrollable" style="white-space: pre-line; display: block; word-wrap: break-word;">${record.Bank_Notes || ''}</span>
              </div>
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
            <div class="holders-accordion-container">
              ${holdersHtml}
            </div>
          </div>
        </div>
      `}

      <div class="nomination-full-width">
          <div class="notes-card-minimal">
          <div class="section-heading-minimal"><strong>Nomination</strong></div>
          <div class="notes-content-minimal">
            <div><strong>Name:</strong> ${record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || ''} | <strong>Email:</strong> ${record.Bank_Nominee_Email || ''} | <strong>Phone:</strong> ${record.Bank_Nominee_Phone || ''}</div>
          </div>
        </div>
      </div>
    `;

    // Event Listeners
    const editBtn = card.querySelector('.btn-edit');
    const deleteBtn = card.querySelector('.btn-delete');
    const printBtn = card.querySelector('.btn-print');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        // Auto-switch to Edit Mode if not already in Edit Mode
        if (!isEditMode) {
          isEditMode = true;
          btnEditMode.style.display = 'none';
          btnDisplayMode.style.display = 'inline-flex';
          document.querySelectorAll('.bank-record-card').forEach(card => {
            card.classList.remove('read-only');
          });
        }
        
        // Get actual index from full data array
        const data = getData();
        const actualIndex = data.findIndex(r => r.id === record.id);
        editIndex = actualIndex !== -1 ? actualIndex : index;
        
        formHasChanges = false;
        originalFormData = JSON.stringify(record);
        
        // Reset form first
        bankForm.reset();
        
        // Populate dropdowns first
        populateModalDropdowns();
        populateNomineeDropdown();
        
        // Then load the record data
        loadRecordIntoForm(record);
        
        modalTitle.textContent = 'Edit Bank Account';
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
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          printRecord(record);
        } catch (error) {
          console.error('Print error:', error);
          alert('Unable to print. Please check if popups are blocked.');
        }
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

    // Setup accordion expand/collapse for holder tabs
    if (!isSingleHolder) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        const accordionHeaders = card.querySelectorAll('.holder-accordion-header');
        accordionHeaders.forEach(header => {
          header.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const holderId = this.getAttribute('data-holder-id');
            if (!holderId) return;
            
            const content = document.getElementById(holderId);
            const icon = this.querySelector('.holder-accordion-icon');
            
            if (!content || !icon) return;
            
            // Check if currently expanded - check inline style first, then computed style
            let isExpanded = false;
            if (content.style.display) {
              isExpanded = content.style.display !== 'none';
            } else {
              isExpanded = window.getComputedStyle(content).display !== 'none';
            }
            
            if (isExpanded) {
              // Collapse
              content.style.display = 'none';
              this.classList.remove('active');
              icon.textContent = '▶';
            } else {
              // Expand
              content.style.display = 'block';
              this.classList.add('active');
              icon.textContent = '▼';
            }
          });
        });
      }, 50);
    }

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
              banksData.push([`Holder ${hIdx + 1} Interacc_Email_or_UPI_ID`, holder.interaccEmailOrUPIID || '']);
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
    // Total pages will be calculated dynamically as we add pages
    let totalPages = 1; // Start with summary page

    bankRecords.forEach((record, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        currentPage++;
        totalPages = currentPage;
        yPos = margin;
      }

      // Add footer to current page (will update totalPages dynamically)
      addFooter(doc, totalRecords, currentPage, totalPages);

      // Account Tag Bar (light blue background) - Compact
      doc.setFillColor(227, 242, 253); // #e3f2fd
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(25, 118, 210); // #1976d2
      doc.text(`${record.Bank_Ac_Tag || 'No Account Tag'}`, margin + 3, yPos + 6);
      yPos += 12;

      // Two Column Layout: Bank Information (Left) and Account Information (Right)
      const colWidth = (pageWidth - 2 * margin - 8) / 2;
      const leftX = margin;
      const rightX = margin + colWidth + 8;
      const startY = yPos;

      // Bank Information Card (Left Column) - Compact
      doc.setDrawColor(211, 211, 211);
      doc.setLineWidth(0.3);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Bank Information', leftX + 2, yPos);
      yPos += 6;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Bank: ${record.Bank_Institution || ''}`, leftX + 2, yPos, { maxWidth: colWidth - 4 });
      yPos += 4;
      doc.text(`Country: ${record.Bank_Country || ''}`, leftX + 2, yPos);
      yPos += 4;
      const branchText = doc.splitTextToSize(`Branch: ${record.Bank_Branch_Address || ''}`, colWidth - 4);
      branchText.forEach(line => {
        doc.text(line, leftX + 2, yPos);
        yPos += 4;
      });
      
      // Helpline section
      const phones = [record.Bank_Helpline_Phone1, record.Bank_Helpline_Phone2, record.Bank_Helpline_Phone3, record.Bank_Helpline_Phone4].filter(p => p);
      const emails = [record.Bank_Helpline_Email1, record.Bank_Helpline_Email2, record.Bank_Helpline_Email3, record.Bank_Helpline_Email4].filter(e => e);
      if (phones.length > 0 || emails.length > 0 || record.Bank_Helpline_URL) {
        yPos += 2;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text('Helpline', leftX + 2, yPos);
        yPos += 4;
        doc.setFont(undefined, 'normal');
        if (phones.length > 0) {
          const phoneText = doc.splitTextToSize(`Ph: ${phones.join(' / ')}`, colWidth - 4);
          phoneText.forEach(line => {
            doc.text(line, leftX + 2, yPos);
            yPos += 4;
          });
        }
        if (emails.length > 0) {
          const emailText = doc.splitTextToSize(`Em: ${emails.join(' / ')}`, colWidth - 4);
          emailText.forEach(line => {
            doc.text(line, leftX + 2, yPos);
            yPos += 4;
          });
        }
        if (record.Bank_Helpline_URL) {
          const urlText = doc.splitTextToSize(`URL: ${record.Bank_Helpline_URL}`, colWidth - 4);
          urlText.forEach(line => {
            doc.text(line, leftX + 2, yPos);
            yPos += 4;
          });
        }
      }
      const bankInfoHeight = yPos - startY + 3;
      doc.rect(leftX, startY - 2, colWidth, bankInfoHeight);

      // Account Information Card (Right Column) - Compact
      yPos = startY;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Account Information', rightX + 2, yPos);
      yPos += 6;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Type: ${record.Bank_Ac_Type || ''}`, rightX + 2, yPos);
      yPos += 4;
      doc.text(`Number: ${record.Bank_Account_Number || ''}`, rightX + 2, yPos);
      yPos += 4;
      const transitText = doc.splitTextToSize(`Transit/IFSC: ${record.Bank_Transit_IFSC || ''}`, colWidth - 4);
      transitText.forEach(line => {
        doc.text(line, rightX + 2, yPos);
        yPos += 4;
      });
      const instText = doc.splitTextToSize(`Inst/MICR: ${record.Bank_Institution_MICR || ''}`, colWidth - 4);
      instText.forEach(line => {
        doc.text(line, rightX + 2, yPos);
        yPos += 4;
      });
      doc.text(`Status: ${record.Bank_Account_Status || ''}`, rightX + 2, yPos);
      yPos += 4;
      doc.text(`Min Balance: ${record.Bank_Min_Balance || ''}`, rightX + 2, yPos);
      yPos += 4;
      
      // Notes in Account Information
      if (record.Bank_Notes) {
        yPos += 2;
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', rightX + 2, yPos);
        yPos += 4;
        doc.setFont(undefined, 'normal');
        const notesLines = record.Bank_Notes.split('\n').filter(l => l.trim());
        notesLines.forEach(line => {
          const noteText = doc.splitTextToSize(line.trim(), colWidth - 4);
          noteText.forEach(noteLine => {
            doc.text(noteLine, rightX + 2, yPos);
            yPos += 3.5;
          });
        });
      }
      
      const accountInfoHeight = Math.max(bankInfoHeight, yPos - startY + 3);
      doc.rect(rightX, startY - 2, colWidth, accountInfoHeight);
      yPos = startY + accountInfoHeight + 5;

      // Holders - Compact Table Format
      if (record.Bank_Holders && record.Bank_Holders.length > 0) {
        record.Bank_Holders.forEach((holder, hIdx) => {
          // Check if we need a new page for holders
          if (yPos > pageHeight - 50) {
            doc.addPage();
            currentPage++;
            totalPages = currentPage;
            yPos = margin;
            addFooter(doc, totalRecords, currentPage, totalPages);
          }

          const holderType = hIdx === 0 ? 'Sole Holder' : 'Joint Holder';
          const holderStartY = yPos;
          
          // Holder Header with gradient background
          doc.setFillColor(227, 242, 253); // Light blue
          doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(`Holder ${hIdx + 1}: ${holder.name || ''}`, margin + 2, yPos + 5);
          doc.setFontSize(7);
          doc.setTextColor(25, 118, 210);
          doc.text(holderType, pageWidth - margin - 25, yPos + 5);
          yPos += 9;

          // Table Header (Orange background)
          doc.setFillColor(255, 152, 0); // Orange #ff9800
          doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
          doc.setFontSize(7);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(0, 0, 0);
          const col1Width = 35;
          const col2Width = 60;
          const col3Width = 50;
          const col4Width = pageWidth - 2 * margin - col1Width - col2Width - col3Width - 6;
          doc.text('Client ID or Customer ID:', margin + 1, yPos + 4.5);
          doc.text('Debit Card Information', margin + col1Width + 1, yPos + 4.5);
          doc.text('Email | Phone', margin + col1Width + col2Width + 1, yPos + 4.5);
          doc.text('Interacc Email | UPI ID', margin + col1Width + col2Width + col3Width + 1, yPos + 4.5);
          yPos += 7;

          // Table Data Row
          doc.setFontSize(7);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          const clientIDText = doc.splitTextToSize(holder.clientID || '', col1Width - 2);
          const debitCardText = doc.splitTextToSize(holder.debitCard || '', col2Width - 2);
          const emailPhoneText = doc.splitTextToSize(holder.emailPhone || '', col3Width - 2);
          const interaccText = doc.splitTextToSize(holder.interaccEmailOrUPIID || '', col4Width - 2);
          const maxRows = Math.max(clientIDText.length, debitCardText.length, emailPhoneText.length, interaccText.length, 1);
          const rowHeight = 4;
          
          for (let i = 0; i < maxRows; i++) {
            if (i < clientIDText.length) {
              doc.text(clientIDText[i], margin + 1, yPos);
            }
            if (i < debitCardText.length) {
              doc.text(debitCardText[i], margin + col1Width + 1, yPos);
            }
            if (i < emailPhoneText.length) {
              doc.text(emailPhoneText[i], margin + col1Width + col2Width + 1, yPos);
            }
            if (i < interaccText.length) {
              doc.text(interaccText[i], margin + col1Width + col2Width + col3Width + 1, yPos);
            }
            yPos += rowHeight;
          }

          // Draw table borders
          doc.setDrawColor(211, 211, 211);
          doc.setLineWidth(0.3);
          const tableHeight = 6 + (maxRows * rowHeight);
          doc.rect(margin, holderStartY + 9, pageWidth - 2 * margin, tableHeight);

          // Additional info below table (UserID, PIN)
          if (holder.userID || (holder.pins && holder.pins !== 'XXXXXX | XXXXXX | XXXXXX')) {
            yPos += 2;
            doc.setFontSize(7);
            if (holder.userID) {
              doc.text(`UserID: ${holder.userID} / Pass: ${holder.loginPassword || ''}`, margin + 2, yPos);
              yPos += 3.5;
            }
            if (holder.pins && holder.pins !== 'XXXXXX | XXXXXX | XXXXXX') {
              doc.text(`PIN | TPIN | MPIN: ${holder.pins}`, margin + 2, yPos);
              yPos += 3.5;
            }
          }
          yPos += 4;
        });
      }

      // Nomination - Compact
      if (yPos > pageHeight - 30) {
        doc.addPage();
        currentPage++;
        totalPages = currentPage;
        yPos = margin;
        addFooter(doc, totalRecords, currentPage, totalPages);
      }
      const nomineeStartY = yPos;
      doc.setDrawColor(211, 211, 211);
      doc.setLineWidth(0.3);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Nomination', margin + 2, yPos + 4);
      yPos += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`${record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || ''}`, margin + 2, yPos);
      yPos += 4;
      if (record.Bank_Nominee_Email || record.Bank_Nominee_Phone) {
        const emailPhone = [record.Bank_Nominee_Email, record.Bank_Nominee_Phone].filter(v => v).join(' | ');
        doc.text(`Email | Phone: ${emailPhone}`, margin + 2, yPos);
        yPos += 4;
      }
      const nomineeHeight = yPos - nomineeStartY + 2;
      doc.rect(margin, nomineeStartY, pageWidth - 2 * margin, nomineeHeight);
      yPos += 6;

      yPos += 5; // Space between records
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
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Please allow popups to print this record.');
        return;
      }
      
      const holdersHtml = (record.Bank_Holders || []).map((holder, idx) => `
        <div style="border:1px solid #ccc;padding:10px;margin-bottom:10px;">
          <h4>Holder ${idx + 1}</h4>
          <p><strong>Holder (Ac_Holder):</strong> ${holder.holder || ''}</p>
          <p><strong>Name:</strong> ${holder.name || ''}</p>
          <p><strong>Client ID or Customer ID:</strong> ${holder.clientID || ''}</p>
          ${holder.userID ? `<p><strong>UserID_or_LoginID:</strong> ${holder.userID}</p>` : ''}
          ${holder.userID ? `<p><strong>Login_Password:</strong> ${holder.loginPassword || ''}</p>` : ''}
          ${holder.emailPhone ? `<p><strong>Email | Phone:</strong> ${holder.emailPhone}</p>` : ''}
          ${holder.debitCard ? `<p><strong>Debit Card Information:</strong> ${holder.debitCard}</p>` : ''}
          ${holder.pins && holder.pins !== 'XXXXXX | XXXXXX | XXXXXX' ? `<p><strong>PIN | TPIN | MPIN:</strong> ${holder.pins}</p>` : ''}
          ${holder.interaccEmailOrUPIID ? `<p><strong>Interacc_Email_or_UPI_ID:</strong> ${holder.interaccEmailOrUPIID}</p>` : ''}
        </div>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bank Account - ${record.Bank_Institution || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #b87333; }
              .section { margin: 20px 0; }
              @media print { 
                @page { size: portrait; margin: 1cm; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>${record.Bank_Institution || ''} - ${record.Bank_Ac_Type || ''}</h1>
            <div class="section">
              <p><strong>Account Tag:</strong> ${record.Bank_Ac_Tag || ''}</p>
              <p><strong>Country:</strong> ${record.Bank_Country || ''}</p>
              <p><strong>Account Number:</strong> ${record.Bank_Account_Number || ''}</p>
              <p><strong>Branch Address:</strong> ${record.Bank_Branch_Address || ''}</p>
              <p><strong>Account Status:</strong> ${record.Bank_Account_Status || ''}</p>
              <p><strong>Minimum Balance Required:</strong> ${record.Bank_Min_Balance || ''}</p>
            </div>
            ${holdersHtml ? `<div class="section"><h3>Holders</h3>${holdersHtml}</div>` : ''}
            <div class="section">
              <h3>Nomination</h3>
              <p><strong>Name:</strong> ${record.Bank_Nominee_Name_Text || record.Bank_Nominee_Name || ''}</p>
              ${record.Bank_Nominee_Email ? `<p><strong>Email:</strong> ${record.Bank_Nominee_Email}</p>` : ''}
              ${record.Bank_Nominee_Phone ? `<p><strong>Phone:</strong> ${record.Bank_Nominee_Phone}</p>` : ''}
            </div>
            <div class="section">
              <h3>Helpline</h3>
              <p><strong>Phones:</strong> ${[record.Bank_Helpline_Phone1, record.Bank_Helpline_Phone2, record.Bank_Helpline_Phone3, record.Bank_Helpline_Phone4].filter(p => p).join(' / ') || 'None'}</p>
              <p><strong>Emails:</strong> ${[record.Bank_Helpline_Email1, record.Bank_Helpline_Email2, record.Bank_Helpline_Email3, record.Bank_Helpline_Email4].filter(e => e).join(' / ') || 'None'}</p>
              ${record.Bank_Helpline_URL ? `<p><strong>URL:</strong> ${record.Bank_Helpline_URL}</p>` : ''}
            </div>
            ${record.Bank_Notes ? `<div class="section"><h3>Notes</h3><p>${record.Bank_Notes}</p></div>` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
        }
      }, 1000);
    } catch (error) {
      console.error('Print error:', error);
      alert('Error printing record. Please try again.');
    }
  }
});


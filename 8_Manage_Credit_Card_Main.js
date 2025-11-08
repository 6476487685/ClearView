document.addEventListener('DOMContentLoaded', () => {
  /* -------------------- State -------------------- */
  let editIndex = null;
  let formHasChanges = false;
  let originalFormData = null;
  let autoBackupEnabled = true;
  let masterEmails = [];
  let masterPhoneOptions = [];
  let masterSqaOptions = [];
  let masterSqaMap = new Map();
  const MAX_SECURITY_QUESTIONS = 6;

  const storedAutoBackup = localStorage.getItem('auto_backup_enabled');
  if (storedAutoBackup !== null) {
    autoBackupEnabled = storedAutoBackup === 'true';
  } else {
    localStorage.setItem('auto_backup_enabled', 'true');
  }

  /* -------------------- DOM References -------------------- */
  const creditForm = document.getElementById('creditCardForm');
  const creditModal = document.getElementById('creditCardModal');
  const btnAddRecord = document.getElementById('btnAddRecord');
  const btnManualBackup = document.getElementById('btnManualBackup');
  const btnExportPDF = document.getElementById('btnExportPDF');
  const btnCancel = document.getElementById('cancelBtn');
  const btnSave = document.getElementById('saveBtn');
  const addOnEnableCheckbox = document.getElementById('Credit_AddOn_Enable');
  const addOnContainer = document.getElementById('addOnCardsContainer');
  const addOnList = document.getElementById('addOnCardsList');
  const btnAddAddOnCard = document.getElementById('btnAddAddOnCard');
  const filterSelect = document.getElementById('Credit_Filter_Tag');
  const recordsContainer = document.getElementById('creditCardRecordsContainer');
  const autoBackupToggle = document.getElementById('autoBackupToggle');
  const autoBackupStatus = document.getElementById('autoBackupStatusText');
  window.toastContainer = document.getElementById('toastContainer');

  if (autoBackupToggle) {
    autoBackupToggle.checked = autoBackupEnabled;
  }

  if (!creditForm || !creditModal) {
    console.error('Credit card form or modal missing in DOM.');
    return;
  }

  /* -------------------- Utility Functions -------------------- */
  const showToast = (message, type = 'success') => {
    if (!window.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    window.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  };

  const getData = () => JSON.parse(localStorage.getItem('credit_cards') || '[]');
  const saveData = (data) => localStorage.setItem('credit_cards', JSON.stringify(data));

  const cleanPhone = (phoneString) => {
    const str = String(phoneString || '').trim();
    if (!str) return '';
    const plusIndex = str.lastIndexOf('+');
    const segment = plusIndex !== -1 ? str.slice(plusIndex) : str;
    const normalized = segment
      .replace(/[()]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/[^+\d-]/g, '')
      .replace(/--+/g, '-')
      .replace(/-+$/, '');
    return normalized || '';
  };

  const formatEmailPhone = (holder = {}) => {
    if (!holder) return '';
    const email = holder.email || '';
    const phone = cleanPhone(holder.phone || '');
    if (email || phone) {
      return [email, phone].filter(Boolean).join(' | ');
    }
    if (holder.emailPhone) {
      const parts = holder.emailPhone.split('|').map(part => part.trim());
      const legacyEmail = parts[0] || '';
      const legacyPhone = parts.length > 1 ? cleanPhone(parts[1]) : '';
      return [legacyEmail, legacyPhone].filter(Boolean).join(' | ');
    }
    return '';
  };

  const getValueSafe = (id) => {
    const el = document.getElementById(id);
    return el ? el.value || '' : '';
  };

  const parseSqaValue = (rawValue) => {
    const text = String(rawValue || '').trim();
    if (!text) return { question: '', answer: '' };
    const separatorIndex = text.indexOf('—');
    if (separatorIndex === -1) {
      return { question: text, answer: '' };
    }
    const question = text.slice(0, separatorIndex).trim();
    const answer = text.slice(separatorIndex + 1).replace(/^[\s—-]+/, '').trim();
    return { question, answer };
  };

  const loadSqaOptions = (forceRefresh = false) => {
    if (!forceRefresh && masterSqaOptions.length) return;
    masterSqaOptions = [];
    masterSqaMap = new Map();
    try {
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      if (!unifiedDataStr) return;
      const unifiedData = JSON.parse(unifiedDataStr) || {};
      let entries = unifiedData.common?.SQA || [];
      if (!Array.isArray(entries)) {
        entries = Object.values(entries || {});
      }
      const unique = new Map();
      entries.forEach(entry => {
        const { question, answer } = parseSqaValue(entry);
        if (!question) return;
        if (!unique.has(question)) {
          unique.set(question, answer || '');
        }
      });
      masterSqaMap = unique;
      masterSqaOptions = Array.from(unique.keys()).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('Error loading SQA master data:', error);
    }
  };

  const updateSqaAnswerInput = (index, questionValue, presetAnswer = '') => {
    const answerInput = document.getElementById(`Credit_Security_A${index}`);
    if (!answerInput) return;
    const answerFromMaster = masterSqaMap.get(questionValue) || '';
    const finalAnswer = answerFromMaster || presetAnswer;
    answerInput.value = finalAnswer || '';
    answerInput.readOnly = true;
  };

  const setupSqaDropdown = (index, selectedQuestion = '', selectedAnswer = '') => {
    const questionSelect = document.getElementById(`Credit_Security_Q${index}`);
    if (!questionSelect) return;
    const currentQuestion = selectedQuestion || questionSelect.value || '';
    const newQuestionSelect = questionSelect.cloneNode(false);
    newQuestionSelect.id = questionSelect.id;
    newQuestionSelect.className = questionSelect.className;
    newQuestionSelect.innerHTML = '<option value="">Select Question</option>';
    masterSqaOptions.forEach(question => {
      newQuestionSelect.innerHTML += `<option value="${escapeHtml(question)}">${escapeHtml(question)}</option>`;
    });
    if (currentQuestion && !masterSqaMap.has(currentQuestion)) {
      newQuestionSelect.innerHTML += `<option value="${escapeHtml(currentQuestion)}">${escapeHtml(currentQuestion)}</option>`;
    }
    newQuestionSelect.value = currentQuestion || '';
    questionSelect.parentNode.replaceChild(newQuestionSelect, questionSelect);

    updateSqaAnswerInput(index, currentQuestion, selectedAnswer);

    newQuestionSelect.addEventListener('change', (event) => {
      updateSqaAnswerInput(index, event.target.value);
    });
  };

  const populateSecurityDropdowns = (selectedSecurityQa = []) => {
    loadSqaOptions(true);
    for (let i = 1; i <= MAX_SECURITY_QUESTIONS; i++) {
      const qa = selectedSecurityQa[i - 1] || {};
      setupSqaDropdown(i, qa.question || '', qa.answer || '');
    }
  };

  const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const slugifyKey = (value = '') => {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'table';
  };

  const updateAutoBackupStatusText = (logChange = false) => {
    if (autoBackupStatus) {
      autoBackupStatus.textContent = autoBackupEnabled ? 'Auto Backup: On' : 'Auto Backup: Paused';
      autoBackupStatus.classList.toggle('paused', !autoBackupEnabled);
      autoBackupStatus.title = autoBackupEnabled
        ? 'Automatic backups are enabled. Each change will download the latest Excel backup.'
        : 'Automatic backups are paused. Use "Backup Now" or re-enable when ready to resume downloads.';
    }

    if (logChange) {
      const message = autoBackupEnabled
        ? 'Automatic backups re-enabled. Future changes will download a fresh Excel backup.'
        : 'Automatic backups paused. Use "Backup Now" or toggle back on when ready.';
      console.info(message);
    }
  };

  const toggleModal = (show) => {
    if (!creditModal) return;
    creditModal.classList.toggle('show', show);
    document.body.style.overflow = show ? 'hidden' : '';
  };

  const resetForm = () => {
    creditForm.reset();
    addOnList.innerHTML = '';
    addOnContainer.style.display = 'none';
    addOnEnableCheckbox.checked = false;
    populateSecurityDropdowns();
  };

  const addAddOnCardRow = (data = {}) => {
    const addOnWrapper = document.createElement('div');
    addOnWrapper.className = 'holder-section';
    addOnWrapper.innerHTML = `
      <div class="holder-row">
        <div>
          <label>Add-On Holder</label>
          <select class="add-on-holder"></select>
        </div>
        <div>
          <label>Card Number</label>
          <input type="text" class="add-on-card-number" placeholder="XXXX XXXX XXXX XXXX">
        </div>
        <div>
          <label>Valid From (MMYY)</label>
          <input type="text" class="add-on-valid-from" placeholder="MMYY">
        </div>
        <div>
          <label>Valid To (MMYY)</label>
          <input type="text" class="add-on-valid-to" placeholder="MMYY">
        </div>
      </div>
      <div class="holder-row">
        <div>
          <label>CVV</label>
          <input type="text" class="add-on-cvv" placeholder="123">
        </div>
        <div>
          <label>AmEx 4-Digit Code</label>
          <input type="text" class="add-on-amex" placeholder="Optional">
        </div>
        <div>
          <label>Extra Digits</label>
          <input type="text" class="add-on-extra" placeholder="Optional">
        </div>
        <div>
          <label>Txn PIN</label>
          <input type="text" class="add-on-txn-pin" placeholder="XXXX">
        </div>
        <div>
          <label>Tele PIN</label>
          <input type="text" class="add-on-tele-pin" placeholder="XXXX">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button type="button" class="btn-delete" style="width:100%;">Remove</button>
        </div>
      </div>
    `;

    const holderSelect = addOnWrapper.querySelector('.add-on-holder');
    populateHolderSelect(holderSelect, data.holder || '');
    addOnWrapper.querySelector('.add-on-card-number').value = data.cardNumber || '';
    addOnWrapper.querySelector('.add-on-valid-from').value = data.validFrom || '';
    addOnWrapper.querySelector('.add-on-valid-to').value = data.validTo || '';
    addOnWrapper.querySelector('.add-on-cvv').value = data.cvv || '';
    addOnWrapper.querySelector('.add-on-amex').value = data.amexCode || '';
    addOnWrapper.querySelector('.add-on-extra').value = data.extraDigits || '';
    addOnWrapper.querySelector('.add-on-txn-pin').value = data.txnPin || '';
    addOnWrapper.querySelector('.add-on-tele-pin').value = data.telePin || '';

    addOnWrapper.querySelector('.btn-delete').addEventListener('click', () => {
      addOnWrapper.remove();
    });

    addOnList.appendChild(addOnWrapper);
  };

  const gatherAddOnCards = () => {
    const cards = [];
    const rows = addOnList.querySelectorAll('.holder-section');
    rows.forEach(row => {
      const holder = row.querySelector('.add-on-holder')?.value || '';
      const cardNumber = row.querySelector('.add-on-card-number')?.value || '';
      const validFrom = row.querySelector('.add-on-valid-from')?.value || '';
      const validTo = row.querySelector('.add-on-valid-to')?.value || '';
      const cvv = row.querySelector('.add-on-cvv')?.value || '';
      const amexCode = row.querySelector('.add-on-amex')?.value || '';
      const extraDigits = row.querySelector('.add-on-extra')?.value || '';
      const txnPin = row.querySelector('.add-on-txn-pin')?.value || '';
      const telePin = row.querySelector('.add-on-tele-pin')?.value || '';
      if (holder || cardNumber || validFrom || validTo || cvv || amexCode || extraDigits || txnPin || telePin) {
        cards.push({ holder, cardNumber, validFrom, validTo, cvv, amexCode, extraDigits, txnPin, telePin });
      }
    });
    return cards;
  };

  const populateAddOnCards = (cards = []) => {
    addOnList.innerHTML = '';
    if (!cards.length) {
      addOnContainer.style.display = 'none';
      addOnEnableCheckbox.checked = false;
      return;
    }
    addOnEnableCheckbox.checked = true;
    addOnContainer.style.display = 'block';
    cards.forEach(card => addAddOnCardRow({
      holder: card.holder || '',
      cardNumber: card.cardNumber || '',
      validFrom: card.validFrom || '',
      validTo: card.validTo || '',
      cvv: card.cvv || '',
      amexCode: card.amexCode || '',
      extraDigits: card.extraDigits || '',
      txnPin: card.txnPin || '',
      telePin: card.telePin || ''
    }));
  };

  const loadContactOptions = (forceRefresh = false) => {
    if (!forceRefresh && masterEmails.length && masterPhoneOptions.length) return;
    try {
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let commonData = {};
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        commonData = unifiedData.common || {};
      }
      masterEmails = Array.from(new Set((commonData.Email || []).filter(email => email && email.trim() !== '')));
      const phoneSet = new Map();
      (commonData.Phone || []).forEach(entry => {
        const label = (entry || '').trim();
        if (!label) return;
        const value = cleanPhone(label);
        if (!value) return;
        if (!phoneSet.has(value)) {
          phoneSet.set(value, label);
        }
      });
      masterPhoneOptions = Array.from(phoneSet.entries()).map(([value, label]) => ({ value, label }));
    } catch (e) {
      console.error('Error loading shared email/phone options:', e);
    }
  };

  const populateEmailSelect = (select, selectedValue = '') => {
    if (!select) return;
    loadContactOptions();
    const options = new Set(masterEmails.map(email => email.trim()).filter(Boolean));
    if (selectedValue) options.add(selectedValue);
    select.innerHTML = '<option value="">Select Email</option>';
    Array.from(options).sort().forEach(email => {
      select.innerHTML += `<option value="${escapeHtml(email)}">${escapeHtml(email)}</option>`;
    });
    select.value = selectedValue || '';
  };

  const populatePhoneSelect = (select, selectedValue = '') => {
    if (!select) return;
    loadContactOptions();
    const cleanSelected = cleanPhone(selectedValue);
    select.innerHTML = '<option value="">Select Phone</option>';
    masterPhoneOptions.forEach(opt => {
      const isSelected = cleanSelected && opt.value === cleanSelected;
      select.innerHTML += `<option value="${escapeHtml(opt.value)}"${isSelected ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`;
    });
    if (cleanSelected && !masterPhoneOptions.some(opt => opt.value === cleanSelected)) {
      select.innerHTML += `<option value="${escapeHtml(cleanSelected)}" selected>${escapeHtml(cleanSelected)}</option>`;
    }
    select.value = cleanSelected || '';
  };

  const populateInstitutionSelect = () => {
    try {
      const institutionSelect = document.getElementById('Credit_Institution');
      if (!institutionSelect) return;
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let institutions = [];
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        institutions = unifiedData.common?.Institution || [];
      }
      institutionSelect.innerHTML = '<option value="">Select Institution</option>';
      institutions.forEach(inst => {
        if (inst && inst !== '') {
          institutionSelect.innerHTML += `<option value="${escapeHtml(inst)}">${escapeHtml(inst)}</option>`;
        }
      });
    } catch (e) {
      console.error('Error populating institutions:', e);
    }
  };

  const populateAccountTagSelect = () => {
    try {
      const accountTagSelect = document.getElementById('Credit_Ac_Tag');
      if (!accountTagSelect) return;
      const unifiedDataStr = localStorage.getItem('unified_master_data');
      let tags = [];
      if (unifiedDataStr) {
        const unifiedData = JSON.parse(unifiedDataStr);
        tags = unifiedData.income?.Income_Ac_Tag || [];
      }
      accountTagSelect.innerHTML = '<option value="">Select Account Tag</option>';
      tags.forEach(tag => {
        if (tag && tag !== '') {
          accountTagSelect.innerHTML += `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`;
        }
      });
    } catch (e) {
      console.error('Error populating account tags:', e);
    }
  };

  const populateHolderSelect = (selectElement, selectedValue = '') => {
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
            selectElement.innerHTML += `<option value="${escapeHtml(holder)}">${escapeHtml(holder)}</option>`;
          }
        });
      }
      selectElement.value = selectedValue || '';
    } catch (e) {
      console.error('Error populating holder dropdown:', e);
    }
  };

  const populatePrimaryHolderDropdown = () => {
    const select = document.getElementById('Credit_Primary_Holder');
    if (select) populateHolderSelect(select);
  };

  const populateFilterOptions = () => {
    if (!filterSelect) return;
    const data = getData();
    const tags = new Set();
    data.forEach(record => {
      if (record.Credit_Ac_Tag) tags.add(record.Credit_Ac_Tag);
    });
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Account Tags</option>';
    Array.from(tags).sort().forEach(tag => {
      filterSelect.innerHTML += `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`;
    });
    if (currentFilter && tags.has(currentFilter)) {
      filterSelect.value = currentFilter;
    } else {
      filterSelect.value = '';
    }
  };

  const closeModal = () => {
    toggleModal(false);
    editIndex = null;
    formHasChanges = false;
    originalFormData = null;
    creditForm.reset();
    populateSecurityDropdowns();
    addOnList.innerHTML = '';
    addOnContainer.style.display = 'none';
    addOnEnableCheckbox.checked = false;
  };

  const attachPasswordToggle = () => {
    const passwordInput = document.getElementById('Credit_Login_Password');
    const toggleBtn = document.querySelector('.password-toggle[data-cc="primary"]');
    if (!passwordInput || !toggleBtn) return;

    passwordInput.addEventListener('focus', () => {
      toggleBtn.style.display = 'block';
    });

    passwordInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== passwordInput && document.activeElement !== toggleBtn) {
          passwordInput.type = 'password';
          toggleBtn.textContent = '👁️';
          toggleBtn.style.display = 'none';
        }
      }, 200);
    });

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
      } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
      }
    });
  };

  /* -------------------- Rendering -------------------- */
  const renderRecords = () => {
    const data = getData();
    const currentFilter = filterSelect ? filterSelect.value : '';
    populateFilterOptions();
    const selectedTag = filterSelect ? filterSelect.value || currentFilter : '';
    let filteredData = data;
    if (selectedTag) {
      filteredData = data.filter(record => record.Credit_Ac_Tag === selectedTag);
    }

    recordsContainer.innerHTML = '';
    if (filteredData.length === 0) {
      recordsContainer.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No credit cards found. Click "Add Credit Card" to create one.</div>';
      return;
    }

    filteredData.forEach((record, index) => {
      const card = createRecordCard(record, index);
      recordsContainer.appendChild(card);
    });

    initializeResizableTables(recordsContainer);
  };

  const createRecordCard = (record, index) => {
    const card = document.createElement('div');
    card.className = 'bank-record-card';

    const recordNumber = index + 1;
    const displayTag = record.Credit_Ac_Tag || 'No Account Tag';
    const recordLabel = `Record #${recordNumber}: ${displayTag}`;

    const helplinePhoneList = [record.Credit_Helpline_Phone1, record.Credit_Helpline_Phone2, record.Credit_Helpline_Phone3]
      .map(cleanPhone)
      .filter(Boolean);
    const helplineEmailList = [record.Credit_Helpline_Email1, record.Credit_Helpline_Email2, record.Credit_Helpline_Email3]
      .filter(value => value && value.trim() !== '');

    const extraCodes = [record.Credit_Amex_Code, record.Credit_Extra_Digits].filter(Boolean).join(' | ');

    const contactCells = [
      { label: 'Institution', value: record.Credit_Institution || '—' },
      {
        label: 'Portal',
        value: record.Credit_URL
          ? `<a href="${escapeHtml(record.Credit_URL)}" target="_blank" class="info-link">${escapeHtml(record.Credit_URL)}</a>`
          : '—',
        html: true
      }
    ];
    const formatListAsLines = (list) => list.map(item => escapeHtml(item)).join('<br>');
    contactCells.push({
      label: 'Helpline Phone',
      value: helplinePhoneList.length ? formatListAsLines(helplinePhoneList) : '—',
      html: helplinePhoneList.length > 0
    });
    contactCells.push({
      label: 'Helpline Email',
      value: helplineEmailList.length ? formatListAsLines(helplineEmailList) : '—',
      html: helplineEmailList.length > 0
    });

    const contactGridHtml = buildAccountDetailsGrid(contactCells, 'credit-contact-details');

    const accountRows = [
      { label: 'Account #', value: record.Credit_Account_Number || '—' },
      { label: 'Billing Cycle', value: record.Credit_Billing_Cycle || '—' },
      { label: 'Statement Date', value: record.Credit_Statement_Day || '—' },
      { label: 'Payment Due By', value: record.Credit_Payment_Due_Day || '—' },
      { label: 'Login', value: record.Credit_Login_ID || '—' },
      { label: 'Password', value: record.Credit_Login_Password ? '••••••••' : '—' }
    ];

    const primaryRow = [{
      holder: record.Credit_Primary_Holder || '—',
      cardNumber: record.Credit_Card_Number || '—',
      validFrom: record.Credit_Valid_From || '—',
      validTo: record.Credit_Valid_To || '—',
      cvv: record.Credit_CVV || '—',
      extraCodes: extraCodes || '—',
      txnPin: record.Credit_Transaction_Pin || '—',
      telePin: record.Credit_Tele_Pin || '—'
    }];

    const addOnTables = (record.AddOnCards || []).map((cardData, idx) => {
      const row = [{
        holder: cardData.holder || '—',
        cardNumber: cardData.cardNumber || '—',
        validFrom: cardData.validFrom || '—',
        validTo: cardData.validTo || '—',
        cvv: cardData.cvv || '—',
        extraCodes: [cardData.amexCode, cardData.extraDigits].filter(Boolean).join(' | ') || '—',
        txnPin: cardData.txnPin || '—',
        telePin: cardData.telePin || '—'
      }];
      return buildHolderTable(`Add-On Card #${idx + 1}`, row, 'credit-holder-addon');
    }).join('');

    card.innerHTML = `
      <div class="account-tag-bar-minimal">
        <div class="account-tag-content-minimal">
          <span>${recordLabel}</span>
          <div class="bank-record-actions">
            <button class="btn-edit" data-index="${index}">✏️ Edit</button>
            <button class="btn-print" data-index="${index}">🖨️ Print</button>
            <button class="btn-delete" data-index="${index}">🗑️ Delete</button>
          </div>
        </div>
      </div>

      <div class="two-column-layout">
        <div class="column-left">
          <div class="fields-card-minimal">
            <div class="section-heading-minimal"><strong>Contact & Institution</strong></div>
            ${contactGridHtml}
          </div>
        </div>
        <div class="column-right">
          <div class="fields-card-minimal">
            <div class="section-heading-minimal"><strong>Account Details</strong></div>
            ${buildAccountDetailsGrid(accountRows, 'credit-account-details')}
          </div>
        </div>
      </div>

      ${buildHolderTable('Primary Card Details', primaryRow, 'credit-holder-primary')}
      ${addOnTables}
      ${renderSecuritySummary(record.Credit_Security_QA || [])}
    `;

    const editBtn = card.querySelector('.btn-edit');
    const deleteBtn = card.querySelector('.btn-delete');
    const printBtn = card.querySelector('.btn-print');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const data = getData();
        const actualIndex = data.findIndex(r => r.id === record.id);
        editIndex = actualIndex !== -1 ? actualIndex : index;

        formHasChanges = false;
        originalFormData = JSON.stringify(record);

        creditForm.reset();
        populateInstitutionSelect();
        populateAccountTagSelect();
        populatePrimaryHolderDropdown();
        populateEmailSelect(document.getElementById('Credit_Helpline_Email1'), record.Credit_Helpline_Email1 || '');
        populateEmailSelect(document.getElementById('Credit_Helpline_Email2'), record.Credit_Helpline_Email2 || '');
        populateEmailSelect(document.getElementById('Credit_Helpline_Email3'), record.Credit_Helpline_Email3 || '');
        populatePhoneSelect(document.getElementById('Credit_Helpline_Phone1'), record.Credit_Helpline_Phone1 || '');
        populatePhoneSelect(document.getElementById('Credit_Helpline_Phone2'), record.Credit_Helpline_Phone2 || '');
        populatePhoneSelect(document.getElementById('Credit_Helpline_Phone3'), record.Credit_Helpline_Phone3 || '');
        loadRecordIntoForm(record);
        toggleModal(true);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete this credit card?')) return;
        const data = getData();
        const actualIndex = data.findIndex(r => r.id === record.id);
        const deleteIndex = actualIndex !== -1 ? actualIndex : index;
        data.splice(deleteIndex, 1);
        saveData(data);
        if (autoBackupEnabled) {
          createExcelBackup();
        }
        renderRecords();
        populateFilterOptions();
        showToast('🗑️ Credit card deleted.', 'success');
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const data = getData();
        const actualIndex = data.findIndex(r => r.id === record.id);
        const recordToPrint = actualIndex !== -1 ? data[actualIndex] : record;
        const recordNum = (actualIndex !== -1 ? actualIndex : index) + 1;
        printRecord(recordToPrint, recordNum);
      });
    }

    return card;
  };

  const renderSecuritySummary = (securityQA = []) => {
    if (!securityQA.length) return '';
    const lines = securityQA.map((qa, idx) => `
      <div class="security-qa-line"><span class="security-question">Q${idx + 1}:</span> ${escapeHtml(qa.question || '—')} <span class="security-answer">A:</span> ${escapeHtml(qa.answer || '—')}</div>
    `).join('');
    return `
      <div class="security-full-width">
        <div class="security-card-minimal">
          <div class="section-heading-minimal"><strong>Password Recovery (SQA)</strong></div>
          <div class="security-qa-block">${lines}</div>
        </div>
      </div>
    `;
  };

  /* -------------------- Load Record into Form -------------------- */
  const loadRecordIntoForm = (record) => {
    document.getElementById('Credit_Institution').value = record.Credit_Institution || '';
    document.getElementById('Credit_Ac_Tag').value = record.Credit_Ac_Tag || '';
    document.getElementById('Credit_Primary_Holder').value = record.Credit_Primary_Holder || '';
    document.getElementById('Credit_Card_Number').value = record.Credit_Card_Number || '';
    document.getElementById('Credit_Valid_From').value = record.Credit_Valid_From || '';
    document.getElementById('Credit_Valid_To').value = record.Credit_Valid_To || '';
    document.getElementById('Credit_CVV').value = record.Credit_CVV || '';
    document.getElementById('Credit_Amex_Code').value = record.Credit_Amex_Code || '';
    document.getElementById('Credit_Extra_Digits').value = record.Credit_Extra_Digits || '';
    document.getElementById('Credit_Transaction_Pin').value = record.Credit_Transaction_Pin || '';
    document.getElementById('Credit_Tele_Pin').value = record.Credit_Tele_Pin || '';
    document.getElementById('Credit_Billing_Cycle').value = record.Credit_Billing_Cycle || '';
    document.getElementById('Credit_Statement_Day').value = record.Credit_Statement_Day || '';
    document.getElementById('Credit_Payment_Due_Day').value = record.Credit_Payment_Due_Day || '';
    document.getElementById('Credit_Login_ID').value = record.Credit_Login_ID || '';
    document.getElementById('Credit_Login_Password').value = record.Credit_Login_Password || '';
    document.getElementById('Credit_Account_Number').value = record.Credit_Account_Number || '';
    document.getElementById('Credit_URL').value = record.Credit_URL || '';
    populatePhoneSelect(document.getElementById('Credit_Helpline_Phone1'), record.Credit_Helpline_Phone1 || '');
    populatePhoneSelect(document.getElementById('Credit_Helpline_Phone2'), record.Credit_Helpline_Phone2 || '');
    populatePhoneSelect(document.getElementById('Credit_Helpline_Phone3'), record.Credit_Helpline_Phone3 || '');
    populateEmailSelect(document.getElementById('Credit_Helpline_Email1'), record.Credit_Helpline_Email1 || '');
    populateEmailSelect(document.getElementById('Credit_Helpline_Email2'), record.Credit_Helpline_Email2 || '');
    populateEmailSelect(document.getElementById('Credit_Helpline_Email3'), record.Credit_Helpline_Email3 || '');

    populateSecurityDropdowns(record.Credit_Security_QA || []);
    populateAddOnCards(record.AddOnCards || []);
  };

  /* -------------------- Save Handler -------------------- */
  creditForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const record = {
      Credit_Institution: getValueSafe('Credit_Institution'),
      Credit_Ac_Tag: getValueSafe('Credit_Ac_Tag'),
      Credit_Primary_Holder: getValueSafe('Credit_Primary_Holder'),
      Credit_Card_Number: getValueSafe('Credit_Card_Number'),
      Credit_Valid_From: getValueSafe('Credit_Valid_From'),
      Credit_Valid_To: getValueSafe('Credit_Valid_To'),
      Credit_CVV: getValueSafe('Credit_CVV'),
      Credit_Amex_Code: getValueSafe('Credit_Amex_Code'),
      Credit_Extra_Digits: getValueSafe('Credit_Extra_Digits'),
      Credit_Transaction_Pin: getValueSafe('Credit_Transaction_Pin'),
      Credit_Tele_Pin: getValueSafe('Credit_Tele_Pin'),
      Credit_Billing_Cycle: getValueSafe('Credit_Billing_Cycle'),
      Credit_Statement_Day: getValueSafe('Credit_Statement_Day'),
      Credit_Payment_Due_Day: getValueSafe('Credit_Payment_Due_Day'),
      Credit_Login_ID: getValueSafe('Credit_Login_ID'),
      Credit_Login_Password: getValueSafe('Credit_Login_Password'),
      Credit_Account_Number: getValueSafe('Credit_Account_Number'),
      Credit_URL: getValueSafe('Credit_URL'),
      Credit_Helpline_Phone1: cleanPhone(getValueSafe('Credit_Helpline_Phone1')),
      Credit_Helpline_Phone2: cleanPhone(getValueSafe('Credit_Helpline_Phone2')),
      Credit_Helpline_Phone3: cleanPhone(getValueSafe('Credit_Helpline_Phone3')),
      Credit_Helpline_Email1: getValueSafe('Credit_Helpline_Email1'),
      Credit_Helpline_Email2: getValueSafe('Credit_Helpline_Email2'),
      Credit_Helpline_Email3: getValueSafe('Credit_Helpline_Email3'),
      AddOnCards: addOnEnableCheckbox.checked ? gatherAddOnCards() : [],
      Credit_Security_QA: (() => {
        const qa = [];
        for (let i = 1; i <= MAX_SECURITY_QUESTIONS; i++) {
          const question = getValueSafe(`Credit_Security_Q${i}`).trim();
          const answer = getValueSafe(`Credit_Security_A${i}`).trim();
          if (question || answer) {
            qa.push({ question, answer });
          }
        }
        return qa;
      })(),
      id: editIndex !== null ? getData()[editIndex].id : Date.now() + Math.random()
    };

    if (!record.Credit_Institution || !record.Credit_Ac_Tag || !record.Credit_Primary_Holder || !record.Credit_Card_Number) {
      alert('Please fill in the required fields: Institution, Account Tag, Primary Holder, and Card Number.');
      return;
    }

    const data = getData();
    if (editIndex !== null) {
      data[editIndex] = record;
    } else {
      data.push(record);
    }
    saveData(data);

    if (autoBackupEnabled) {
      createExcelBackup();
    }

    showToast('💳 Credit card saved successfully.', 'success');
    formHasChanges = false;
    originalFormData = null;
    closeModal();
    populateFilterOptions();
    renderRecords();
  });

  /* -------------------- Event Handlers -------------------- */
  btnAddRecord.addEventListener('click', () => {
    editIndex = null;
    resetForm();
    populateInstitutionSelect();
    populateAccountTagSelect();
    populatePrimaryHolderDropdown();
    populateEmailSelect(document.getElementById('Credit_Helpline_Email1'));
    populateEmailSelect(document.getElementById('Credit_Helpline_Email2'));
    populateEmailSelect(document.getElementById('Credit_Helpline_Email3'));
    populatePhoneSelect(document.getElementById('Credit_Helpline_Phone1'));
    populatePhoneSelect(document.getElementById('Credit_Helpline_Phone2'));
    populatePhoneSelect(document.getElementById('Credit_Helpline_Phone3'));
    document.getElementById('modalTitle').textContent = 'Add Credit Card';
    toggleModal(true);
  });

  btnCancel.addEventListener('click', closeModal);

  btnManualBackup.addEventListener('click', () => {
    createExcelBackup();
    showToast('✅ Manual backup started. Check your downloads.', 'success');
  });

  btnExportPDF.addEventListener('click', () => {
    generatePDF();
  });

  if (filterSelect) {
    filterSelect.addEventListener('change', renderRecords);
  }
  addOnEnableCheckbox.addEventListener('change', () => {
    addOnContainer.style.display = addOnEnableCheckbox.checked ? 'block' : 'none';
    if (!addOnEnableCheckbox.checked) {
      addOnList.innerHTML = '';
    } else if (!addOnList.children.length) {
      addAddOnCardRow();
    }
  });

  btnAddAddOnCard.addEventListener('click', () => {
    addAddOnCardRow();
  });

  creditForm.addEventListener('input', () => { formHasChanges = true; });
  creditForm.addEventListener('change', () => { formHasChanges = true; });

  autoBackupToggle.addEventListener('change', () => {
    autoBackupEnabled = autoBackupToggle.checked;
    localStorage.setItem('auto_backup_enabled', autoBackupEnabled ? 'true' : 'false');
    updateAutoBackupStatusText(true);
  });

  window.addEventListener('click', (e) => {
    if (e.target === creditModal) {
      closeModal();
    }
  });

  attachPasswordToggle();

  /* -------------------- Excel Backup -------------------- */
  function createExcelBackup() {
    try {
      const wb = XLSX.utils.book_new();

      if (typeof addConsolidatedMasterDataToWorkbook === 'function') {
        addConsolidatedMasterDataToWorkbook(wb);
      }

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

      const bankRecords = JSON.parse(localStorage.getItem('bank_accounts') || '[]');
      if (bankRecords.length > 0) {
        const banksData = [];
        const recordSections = [];
        bankRecords.forEach((record, idx) => {
          const recordStart = banksData.length;
          const recordNumber = idx + 1;
          const recordLabel = record.Bank_Ac_Tag ? `Record #${recordNumber}: ${record.Bank_Ac_Tag}` : `Record #${recordNumber}`;
          banksData.push([recordLabel, ' ']);
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

          if (record.Bank_Holders) {
            record.Bank_Holders.forEach((holder, hIdx) => {
              banksData.push([`Holder ${hIdx + 1} (Ac_Holder)`, holder.holder || '']);
              banksData.push([`Holder ${hIdx + 1} Name`, holder.name || '']);
              banksData.push([`Holder ${hIdx + 1} Client_ID_or_Customer_ID`, holder.clientID || '']);
              banksData.push([`Holder ${hIdx + 1} UserID_or_LoginID`, holder.userID || '']);
              banksData.push([`Holder ${hIdx + 1} Email/Phone`, formatEmailPhone(holder)]);
              banksData.push([`Holder ${hIdx + 1} Login_Password`, holder.loginPassword || '']);
              banksData.push([`Holder ${hIdx + 1} Transaction_Password`, holder.txnPassword || '']);
              banksData.push([`Holder ${hIdx + 1} Debit Card`, holder.debitCard || '']);
              banksData.push([`Holder ${hIdx + 1} DCPIN`, holder.dcPin || '']);
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
          if (record.Bank_Security_QA && record.Bank_Security_QA.length > 0) {
            record.Bank_Security_QA.forEach((qa, sIdx) => {
              banksData.push([`Security Question ${sIdx + 1}`, qa?.question || '']);
              banksData.push([`Security Answer ${sIdx + 1}`, qa?.answer || '']);
            });
          }

          const recordEnd = banksData.length - 1;
          recordSections.push({ start: recordStart, end: recordEnd });
          banksData.push(['', '']);
        });

        if (banksData.length && banksData[banksData.length - 1].every(val => val === '' || val === ' ')) {
          banksData.pop();
        }

        const ws = XLSX.utils.aoa_to_sheet(banksData);
        ws['!cols'] = [{ wch: 32 }, { wch: 70 }];

        const setCellStyle = (worksheet, row, col, style) => {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: 's', v: '' };
          }
          worksheet[cellAddress].s = Object.assign({}, worksheet[cellAddress].s || {}, style);
        };

        const headerOdd = 'FBC02D';
        const headerEven = '64B5F6';
        const bodyOdd = 'FFF8E1';
        const bodyEven = 'E3F2FD';

        recordSections.forEach((section, idx) => {
          const headerColor = idx % 2 === 0 ? headerOdd : headerEven;
          const bodyColor = idx % 2 === 0 ? bodyOdd : bodyEven;
          const headerStyle = {
            fill: { patternType: 'solid', fgColor: { rgb: headerColor } },
            font: { bold: true, color: { rgb: '1A237E' } },
            border: {
              top: { style: 'thin', color: { rgb: 'A1887F' } },
              bottom: { style: 'thin', color: { rgb: 'A1887F' } },
              left: { style: 'thin', color: { rgb: 'A1887F' } },
              right: { style: 'thin', color: { rgb: 'A1887F' } }
            }
          };
          const bodyStyle = {
            fill: { patternType: 'solid', fgColor: { rgb: bodyColor } },
            border: {
              top: { style: 'thin', color: { rgb: 'B0BEC5' } },
              bottom: { style: 'thin', color: { rgb: 'B0BEC5' } },
              left: { style: 'thin', color: { rgb: 'B0BEC5' } },
              right: { style: 'thin', color: { rgb: 'B0BEC5' } }
            }
          };

          for (let col = 0; col <= 1; col++) {
            setCellStyle(ws, section.start, col, headerStyle);
          }

          for (let row = section.start + 1; row <= section.end; row++) {
            for (let col = 0; col <= 1; col++) {
              setCellStyle(ws, row, col, bodyStyle);
            }
          }
        });

        XLSX.utils.book_append_sheet(wb, ws, 'Banks_Data');
      }

      const creditRecords = getData();
      if (creditRecords.length > 0) {
        const ccData = [];
        const ccSections = [];
        creditRecords.forEach((record, idx) => {
          const recordStart = ccData.length;
          const recordNumber = idx + 1;
          const recordLabel = record.Credit_Ac_Tag ? `Record #${recordNumber}: ${record.Credit_Ac_Tag}` : `Record #${recordNumber}`;
          ccData.push([recordLabel, ' ']);
          ccData.push(['Institution', record.Credit_Institution || '']);
          ccData.push(['Primary Holder', record.Credit_Primary_Holder || '']);
          ccData.push(['Card Number', record.Credit_Card_Number || '']);
          ccData.push(['Valid From', record.Credit_Valid_From || '']);
          ccData.push(['Valid To', record.Credit_Valid_To || '']);
          ccData.push(['CVV', record.Credit_CVV || '']);
          ccData.push(['AmEx Code', record.Credit_Amex_Code || '']);
          ccData.push(['Extra Digits', record.Credit_Extra_Digits || '']);
          ccData.push(['Transaction PIN', record.Credit_Transaction_Pin || '']);
          ccData.push(['Tele-Banking PIN', record.Credit_Tele_Pin || '']);
          ccData.push(['Billing Cycle', record.Credit_Billing_Cycle || '']);
          ccData.push(['Statement Day', record.Credit_Statement_Day || '']);
          ccData.push(['Payment Due Day', record.Credit_Payment_Due_Day || '']);
          ccData.push(['Login ID', record.Credit_Login_ID || '']);
          ccData.push(['Login Password', record.Credit_Login_Password ? '******' : '']);
          ccData.push(['Account Number', record.Credit_Account_Number || '']);
          ccData.push(['Portal URL', record.Credit_URL || '']);
          ccData.push(['Helpline Phone 1', record.Credit_Helpline_Phone1 || '']);
          ccData.push(['Helpline Phone 2', record.Credit_Helpline_Phone2 || '']);
          ccData.push(['Helpline Phone 3', record.Credit_Helpline_Phone3 || '']);
          ccData.push(['Helpline Email 1', record.Credit_Helpline_Email1 || '']);
          ccData.push(['Helpline Email 2', record.Credit_Helpline_Email2 || '']);
          ccData.push(['Helpline Email 3', record.Credit_Helpline_Email3 || '']);

          (record.AddOnCards || []).forEach((card, addIdx) => {
            ccData.push([`Add-On Card #${addIdx + 1} Holder`, card.holder || '']);
            ccData.push([`Add-On Card #${addIdx + 1} Number`, card.cardNumber || '']);
            ccData.push([`Add-On Card #${addIdx + 1} Valid From`, card.validFrom || '']);
            ccData.push([`Add-On Card #${addIdx + 1} Valid To`, card.validTo || '']);
            ccData.push([`Add-On Card #${addIdx + 1} CVV`, card.cvv || '']);
            ccData.push([`Add-On Card #${addIdx + 1} Codes`, [card.amexCode, card.extraDigits].filter(Boolean).join(' | ') || '']);
          });

          (record.Credit_Security_QA || []).forEach((qa, sIdx) => {
            ccData.push([`Security Question ${sIdx + 1}`, qa?.question || '']);
            ccData.push([`Security Answer ${sIdx + 1}`, qa?.answer || '']);
          });

          const recordEnd = ccData.length - 1;
          ccSections.push({ start: recordStart, end: recordEnd });
          ccData.push(['', '']);
        });

        if (ccData.length && ccData[ccData.length - 1].every(val => val === '' || val === ' ')) {
          ccData.pop();
        }

        const wsCC = XLSX.utils.aoa_to_sheet(ccData);
        wsCC['!cols'] = [{ wch: 32 }, { wch: 70 }];

        const setCellStyle = (worksheet, row, col, style) => {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: 's', v: '' };
          }
          worksheet[cellAddress].s = Object.assign({}, worksheet[cellAddress].s || {}, style);
        };

        const headerOdd = '90CAF9';
        const headerEven = 'FFE082';
        const bodyOdd = 'E3F2FD';
        const bodyEven = 'FFF8E1';

        ccSections.forEach((section, idx) => {
          const headerColor = idx % 2 === 0 ? headerOdd : headerEven;
          const bodyColor = idx % 2 === 0 ? bodyOdd : bodyEven;
          const headerStyle = {
            fill: { patternType: 'solid', fgColor: { rgb: headerColor } },
            font: { bold: true, color: { rgb: '1A237E' } },
            border: {
              top: { style: 'thin', color: { rgb: 'A1887F' } },
              bottom: { style: 'thin', color: { rgb: 'A1887F' } },
              left: { style: 'thin', color: { rgb: 'A1887F' } },
              right: { style: 'thin', color: { rgb: 'A1887F' } }
            }
          };
          const bodyStyle = {
            fill: { patternType: 'solid', fgColor: { rgb: bodyColor } },
            border: {
              top: { style: 'thin', color: { rgb: 'B0BEC5' } },
              bottom: { style: 'thin', color: { rgb: 'B0BEC5' } },
              left: { style: 'thin', color: { rgb: 'B0BEC5' } },
              right: { style: 'thin', color: { rgb: 'B0BEC5' } }
            }
          };

          for (let col = 0; col <= 1; col++) {
            setCellStyle(wsCC, section.start, col, headerStyle);
          }

          for (let row = section.start + 1; row <= section.end; row++) {
            for (let col = 0; col <= 1; col++) {
              setCellStyle(wsCC, row, col, bodyStyle);
            }
          }
        });

        XLSX.utils.book_append_sheet(wb, wsCC, 'Credit_Cards');
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const filename = `ClearView_Backup_${year}_${month}_${day}_@_${hours}_${minutes}_${seconds}.xlsx`;

      XLSX.writeFile(wb, filename);
      console.log('Excel backup created:', filename);
    } catch (e) {
      console.error('Error creating Excel backup:', e);
      alert('Error creating backup. Please try again.');
    }
  }

  /* -------------------- PDF Export -------------------- */
  const generatePDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const marginLeft = 18;
    const marginTop = 18;
    const marginRight = 18;
    const marginBottom = 18;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = marginTop;
    const lineHeight = 4.5;

    const data = getData();
    if (!data.length) {
      alert('No credit card records available to export.');
      return;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Credit Card Records', marginLeft, yPos);
    yPos += 10;

    const renderInfoColumns = (leftEntries, rightEntries) => {
      const gap = 8;
      const columnWidth = (contentWidth - gap) / 2;
      let colYLeft = yPos;
      let colYRight = yPos;

      const drawColumn = (entries, startX, currentY) => {
        entries.forEach(entry => {
          const label = entry.label;
          const value = String(entry.value || '—');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`${label}:`, startX, currentY);
          const valueLines = doc.splitTextToSize(value, columnWidth - 32);
          doc.setFont('helvetica', 'normal');
          doc.text(valueLines, startX + 32, currentY);
          const height = Math.max(lineHeight, valueLines.length * lineHeight);
          currentY += height + 1.5;
        });
        return currentY;
      };

      colYLeft = drawColumn(leftEntries, marginLeft, colYLeft);
      colYRight = drawColumn(rightEntries, marginLeft + columnWidth + gap, colYRight);
      yPos = Math.max(colYLeft, colYRight) + 6;
    };

    const tableColumnPercents = [0.17, 0.17, 0.09, 0.09, 0.09, 0.16, 0.11, 0.12];
    const tableColumnWidths = tableColumnPercents.map(p => contentWidth * p);

    const drawTable = (headers, rows) => {
      const headerHeight = 7;
      let tableY = yPos;

      if (tableY + headerHeight + rows.length * 7 > pageHeight - marginBottom) {
        doc.addPage();
        yPos = marginTop;
        tableY = yPos;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(13, 71, 161);
      doc.setTextColor(255, 255, 255);

      let x = marginLeft;
      headers.forEach((header, idx) => {
        const width = tableColumnWidths[idx];
        doc.rect(x, tableY, width, headerHeight, 'F');
        doc.text(header, x + 1.5, tableY + 4.5);
        x += width;
      });

      tableY += headerHeight;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      rows.forEach((row, rowIdx) => {
        let rowHeight = 6.5;
        const cellLines = row.map((value, idx) => {
          const text = String(value || '—');
          const lines = doc.splitTextToSize(text, tableColumnWidths[idx] - 2.5);
          rowHeight = Math.max(rowHeight, lines.length * lineHeight + 2);
          return lines;
        });

        if (tableY + rowHeight > pageHeight - marginBottom) {
          doc.addPage();
          yPos = marginTop;
          tableY = yPos;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setFillColor(13, 71, 161);
          doc.setTextColor(255, 255, 255);
          let resetX = marginLeft;
          headers.forEach((header, idx) => {
            const width = tableColumnWidths[idx];
            doc.rect(resetX, tableY, width, headerHeight, 'F');
            doc.text(header, resetX + 1.5, tableY + 4.5);
            resetX += width;
          });
          tableY += headerHeight;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        }

        let cellX = marginLeft;
        cellLines.forEach((lines, idx) => {
          const width = tableColumnWidths[idx];
          doc.rect(cellX, tableY, width, rowHeight);
          doc.text(lines, cellX + 1, tableY + 4);
          cellX += width;
        });
        tableY += rowHeight;
      });

      yPos = tableY + 6;
    };

    data.forEach((record, idx) => {
      if (idx > 0 && yPos > pageHeight - marginBottom - 20) {
        doc.addPage();
        yPos = marginTop;
      }

      const recordNumber = idx + 1;
      const displayTag = record.Credit_Ac_Tag || 'Untitled';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(13, 71, 161);
      doc.text(`Record #${recordNumber}: ${displayTag}`, marginLeft, yPos);
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, yPos + 1.5, marginLeft + contentWidth, yPos + 1.5);
      yPos += 7;
      doc.setTextColor(0, 0, 0);

      const helplinePhones = [record.Credit_Helpline_Phone1, record.Credit_Helpline_Phone2, record.Credit_Helpline_Phone3]
        .map(cleanPhone)
        .filter(Boolean)
        .join(' / ');
      const helplineEmails = [record.Credit_Helpline_Email1, record.Credit_Helpline_Email2, record.Credit_Helpline_Email3]
        .filter(Boolean)
        .join(' / ');

      const leftEntries = [
        { label: 'Institution', value: record.Credit_Institution || '—' },
        { label: 'Helpline Phone', value: helplinePhones || '—' },
        { label: 'Helpline Email', value: helplineEmails || '—' },
        { label: 'Portal', value: record.Credit_URL || '—' }
      ];

      renderInfoColumns(leftEntries, [
        { label: 'Account #', value: record.Credit_Account_Number || '—' },
        { label: 'Billing Cycle', value: record.Credit_Billing_Cycle || '—' },
        { label: 'Statement Date', value: record.Credit_Statement_Day || '—' },
        { label: 'Payment Due By', value: record.Credit_Payment_Due_Day || '—' },
        { label: 'Login', value: record.Credit_Login_ID || '—' },
        { label: 'Password', value: record.Credit_Login_Password ? '••••••••' : '—' }
      ]);

      const extraCodes = [record.Credit_Amex_Code, record.Credit_Extra_Digits].filter(Boolean).join(' | ');
      const primaryRow = [
        record.Credit_Primary_Holder || '—',
        record.Credit_Card_Number || '—',
        record.Credit_Valid_From || '—',
        record.Credit_Valid_To || '—',
        record.Credit_CVV || '—',
        extraCodes || '—',
        record.Credit_Transaction_Pin || '—',
        record.Credit_Tele_Pin || '—'
      ];

      drawTable(
        ['Holder', 'Card Number', 'Valid From', 'Valid To', 'CVV', 'Extra Codes', 'Txn_PIN', 'Tele_PIN'],
        [primaryRow]
      );

      (record.AddOnCards || []).forEach((card, addIdx) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Add-On Card #${addIdx + 1}`, marginLeft, yPos);
        yPos += 5;
        const addOnRow = [
          card.holder || '—',
          card.cardNumber || '—',
          card.validFrom || '—',
          card.validTo || '—',
          [card.amexCode, card.extraDigits].filter(Boolean).join(' | ') || '—',
          card.txnPin || '—',
          card.telePin || '—'
        ];
        drawTable(
          ['Holder', 'Card Number', 'Valid From', 'Valid To', 'CVV', 'Extra Codes', 'Txn_PIN', 'Tele_PIN'],
          [addOnRow]
        );
      });

      if (record.Credit_Security_QA && record.Credit_Security_QA.length) {
        if (yPos > pageHeight - marginBottom - 40) {
          doc.addPage();
          yPos = marginTop;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Security Questions (Password Recovery)', marginLeft, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        record.Credit_Security_QA.forEach((qa, qaIdx) => {
          const text = `Q${qaIdx + 1}: ${qa.question || '—'} | A: ${qa.answer || '—'}`;
          const lines = doc.splitTextToSize(text, contentWidth);
          lines.forEach(line => {
            doc.text(line, marginLeft + 4, yPos);
            yPos += lineHeight;
          });
        });
        yPos += 4;
      }

      if (yPos > pageHeight - marginBottom - 20) {
        doc.addPage();
        yPos = marginTop;
      }
    });

    doc.save(`Credit_Cards_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const printRecord = (record, recordNum) => {
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (!printWindow) {
        alert('Please allow popups to print this record.');
        return;
      }

      const helplinePhoneList = [record.Credit_Helpline_Phone1, record.Credit_Helpline_Phone2, record.Credit_Helpline_Phone3]
        .map(cleanPhone)
        .filter(Boolean);
      const helplineEmailList = [record.Credit_Helpline_Email1, record.Credit_Helpline_Email2, record.Credit_Helpline_Email3]
        .filter(value => value && value.trim() !== '');
      const formatListForPrint = (list) => list.length
        ? list.map(item => escapeHtml(item)).join('<br>')
        : '—';
      const extraCodes = [record.Credit_Amex_Code, record.Credit_Extra_Digits].filter(Boolean).join(' | ');

      const contactCells = [
        { label: 'Institution', value: record.Credit_Institution || '—' },
        {
          label: 'Portal',
          value: record.Credit_URL
            ? `<a href="${escapeHtml(record.Credit_URL)}" target="_blank" class="info-link">${escapeHtml(record.Credit_URL)}</a>`
            : '—',
          html: true
        },
        {
          label: 'Helpline Phone',
          value: formatListForPrint(helplinePhoneList),
          html: helplinePhoneList.length > 0
        },
        {
          label: 'Helpline Email',
          value: formatListForPrint(helplineEmailList),
          html: helplineEmailList.length > 0
        }
      ];
      const contactGridHtml = buildAccountDetailsGrid(contactCells, 'print-contact-details');

      const accountRows = [
        { label: 'Account #', value: record.Credit_Account_Number || '—' },
        { label: 'Billing Cycle', value: record.Credit_Billing_Cycle || '—' },
        { label: 'Statement Date', value: record.Credit_Statement_Day || '—' },
        { label: 'Payment Due By', value: record.Credit_Payment_Due_Day || '—' },
        { label: 'Login', value: record.Credit_Login_ID || '—' },
        { label: 'Password', value: record.Credit_Login_Password ? '••••••••' : '—' }
      ];
      const accountGridHtml = buildAccountDetailsGrid(accountRows, 'print-account-details');

      const primaryRow = [{
        holder: record.Credit_Primary_Holder || '—',
        cardNumber: record.Credit_Card_Number || '—',
        validFrom: record.Credit_Valid_From || '—',
        validTo: record.Credit_Valid_To || '—',
        cvv: record.Credit_CVV || '—',
        extraCodes: extraCodes || '—',
        txnPin: record.Credit_Transaction_Pin || '—',
        telePin: record.Credit_Tele_Pin || '—'
      }];

      const primaryTable = buildHolderTable('Primary Card Details', primaryRow, 'print-primary-card');

      const addOnTables = (record.AddOnCards || []).map((card, idx) => {
        const row = [{
          holder: card.holder || '—',
          cardNumber: card.cardNumber || '—',
          validFrom: card.validFrom || '—',
          validTo: card.validTo || '—',
          cvv: card.cvv || '—',
          extraCodes: [card.amexCode, card.extraDigits].filter(Boolean).join(' | ') || '—',
          txnPin: card.txnPin || '—',
          telePin: card.telePin || '—'
        }];
        return buildHolderTable(`Add-On Card #${idx + 1}`, row, `print-addon-card-${idx + 1}`);
      }).join('');

      const securityHtml = renderSecuritySummary(record.Credit_Security_QA || []);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Credit Card Record</title>
          <link rel="stylesheet" href="8_Manage_Credit_Card_Style.css">
          <style>
            @page {
              size: A4 landscape;
              margin: 0.5in;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                padding: 0;
              }
              .print-container {
                width: calc(100% / 0.9);
                max-width: none;
                transform: scale(0.9);
                transform-origin: top center;
              }
            }
            body{padding:8px;font-family:'Segoe UI',sans-serif;background:#fff;color:#222;}
            .print-container{max-width:940px;margin:0 auto;}
            .record-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
            .record-header h2{margin:0;font-size:22px;color:#1a237e;}
            .info-split{display:flex;gap:14px;margin-bottom:16px;}
            .info-card{flex:1;background:#f9fafb;border:1px solid #e0e0e0;border-radius:8px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}            
            .info-card h3{margin:0 0 10px 0;font-size:13.5px;color:#c62828;text-transform:uppercase;letter-spacing:0.5px;}
            .holder-info-table{width:100%;border-collapse:separate;border-spacing:0;border-radius:10px;overflow:hidden;border:1px solid #1a4fb0;box-shadow:0 2px 6px rgba(26,79,176,0.18);}
            .holder-info-table thead th{background:#0d47a1;color:#fff;font-weight:700;padding:9px 12px;text-align:center;font-size:12px;border-right:1px solid rgba(255,255,255,0.25);}
            .holder-info-table thead th:last-child{border-right:none;}
            .holder-info-table tbody td{padding:9px 12px;font-size:12px;border:1px solid rgba(13,71,161,0.2);text-align:center;}
            .holder-info-table tbody tr:last-child td:first-child{border-bottom-left-radius:10px;}
            .holder-info-table tbody tr:last-child td:last-child{border-bottom-right-radius:10px;}
            .credit-info-table tbody td:first-child{font-weight:700;color:#1a237e;}
            .section-heading{margin:16px 0 8px 0;font-size:13px;font-weight:700;color:#c62828;text-transform:uppercase;letter-spacing:0.5px;}
            a{color:#1a0dab;text-decoration:none;}
            a:hover{text-decoration:underline;}
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="record-header">
              <h2>Record #${recordNum}: ${escapeHtml(record.Credit_Ac_Tag || 'Untitled')}</h2>
              <div style="font-weight:600;color:#37474f;">${escapeHtml(record.Credit_Institution || '')}</div>
            </div>

            <div class="info-split">
              <div class="info-card">
                <h3>Contact & Institution</h3>
              ${contactGridHtml}
              </div>
              <div class="info-card">
                <h3>Account Details</h3>
                ${accountGridHtml}
              </div>
            </div>

            ${primaryTable}
            ${addOnTables}
            ${securityHtml}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 400);
      };
    } catch (error) {
      console.error('Print error:', error);
      alert('Error printing record. Please try again.');
    }
  };

  const buildInfoTable = (rows) => `
    <table class="holder-info-table holder-info-table-modern credit-info-table">
      <tbody>
        ${rows.map(row => {
          const value = row.html ? row.value : escapeHtml(row.value || '—');
          return `<tr><td>${escapeHtml(row.label)}</td><td>${value || '—'}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  const buildInfoCard = (title, rows) => `
    <div class="fields-card-minimal info-card">
      <div class="section-heading-minimal info-card-header"><strong>${title}</strong></div>
      <div class="fields-content-minimal info-card-body">
        ${rows.map(row => `
          <div class="field-row-minimal info-row">
            <span class="field-label-minimal info-label">${row.label}:</span>
            <span class="field-value-minimal info-value">${row.html ? row.value : escapeHtml(row.value)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const buildHolderTable = (title, rowData, resizeKey = '') => {
    const display = (value) => escapeHtml(value && value.trim() !== '' ? value : '—');
    const tableKey = slugifyKey(resizeKey || title || 'holder');
    const normalizeRow = (row) => {
      if (!row) {
        return {
          holder: '—',
          cardNumber: '—',
          validFrom: '—',
          validTo: '—',
          cvv: '—',
          extraCodes: '—',
          txnPin: '—',
          telePin: '—'
        };
      }
      if (Array.isArray(row)) {
        const [holder, cardNumber, validFrom, validTo, cvv, extraCodes, txnPin, telePin] = row;
        return {
          holder: holder || '—',
          cardNumber: cardNumber || '—',
          validFrom: validFrom || '—',
          validTo: validTo || '—',
          cvv: cvv || '—',
          extraCodes: extraCodes || '—',
          txnPin: txnPin || '—',
          telePin: telePin || '—'
        };
      }
      return {
        holder: row.holder || '—',
        cardNumber: row.cardNumber || '—',
        validFrom: row.validFrom || '—',
        validTo: row.validTo || '—',
        cvv: row.cvv || '—',
        extraCodes: row.extraCodes || '—',
        txnPin: row.txnPin || '—',
        telePin: row.telePin || '—'
      };
    };

    const rowsArray = Array.isArray(rowData)
      ? (rowData.length > 0 && !Array.isArray(rowData[0]) && typeof rowData[0] === 'object'
          ? rowData
          : [normalizeRow(rowData)])
      : [normalizeRow(rowData)];

    return `
      <div class="holder-table-container">
        <div class="holder-table-header">
          <h3 class="section-heading">${title}</h3>
        </div>
        <table class="holder-info-table holder-info-table-modern resizable-table" data-resize-key="${tableKey}">
          <colgroup>
            <col data-col-index="0" style="width: 16%;">
            <col data-col-index="1" style="width: 18%;">
            <col data-col-index="2" style="width: 12%;">
            <col data-col-index="3" style="width: 12%;">
            <col data-col-index="4" style="width: 10%;">
            <col data-col-index="5" style="width: 12%;">
            <col data-col-index="6" style="width: 10%;">
            <col data-col-index="7" style="width: 10%;">
          </colgroup>
          <thead>
            <tr>
              <th>Holder</th>
              <th>Card Number</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th>CVV</th>
              <th>Extra Codes</th>
              <th>Txn_PIN</th>
              <th>Tele_PIN</th>
            </tr>
          </thead>
          <tbody>
            ${rowsArray.map(row => `
              <tr class="holder-secondary-row">
                <td>${display(row.holder)}</td>
                <td>${display(row.cardNumber)}</td>
                <td>${display(row.validFrom)}</td>
                <td>${display(row.validTo)}</td>
                <td>${display(row.cvv)}</td>
                <td>${display(row.extraCodes)}</td>
                <td>${display(row.txnPin)}</td>
                <td>${display(row.telePin)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const buildAccountDetailsGrid = (rows = [], resizeKey = '') => {
    const tableKey = slugifyKey(resizeKey || 'account-grid');
    const pairs = [];
    for (let i = 0; i < rows.length; i += 2) {
      const left = rows[i] || { label: '', value: '' };
      const right = rows[i + 1] || { label: '', value: '' };
      pairs.push({ left, right });
    }
 
    return `
      <table class="holder-info-table holder-info-table-modern credit-info-table resizable-table" data-resize-key="${tableKey}">
        <colgroup>
          <col data-col-index="0" style="width: 22%;">
          <col data-col-index="1" style="width: 28%;">
          <col data-col-index="2" style="width: 22%;">
          <col data-col-index="3" style="width: 28%;">
        </colgroup>
        <tbody>
          ${pairs.map(pair => `
            <tr>
              <td>${escapeHtml(pair.left.label || '')}</td>
              <td>${pair.left.html ? pair.left.value || '—' : escapeHtml(pair.left.value || '—')}</td>
              <td>${escapeHtml(pair.right.label || '')}</td>
              <td>${pair.right.html ? pair.right.value || '—' : escapeHtml(pair.right.value || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  /* -------------------- Initialization -------------------- */
  populateInstitutionSelect();
  populateAccountTagSelect();
  populatePrimaryHolderDropdown();
  populateFilterOptions();
  populateSecurityDropdowns();
  renderRecords();
  updateAutoBackupStatusText();
  attachPasswordToggle();

  function initializeResizableTables(scope) {
    const target = scope instanceof Element ? scope : document;
    const tables = target.querySelectorAll('.resizable-table');
 
    tables.forEach(table => {
      if (table.dataset.resizableApplied === 'true') return;
      table.dataset.resizableApplied = 'true';
 
      const cols = Array.from(table.querySelectorAll('colgroup col'));
      if (!cols.length) return;
 
      const storageKey = table.dataset.resizeKey ? `tableResize:${table.dataset.resizeKey}` : null;
      let storedWidths = [];
      if (storageKey) {
        try {
          storedWidths = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch (error) {
          console.warn('Unable to parse stored column widths', error);
          storedWidths = [];
        }
      }
 
      const applyWidthToColumn = (index, width) => {
        if (!width || typeof width !== 'number') return;
        const columnCells = Array.from(table.querySelectorAll(`tr > *:nth-child(${index + 1})`));
        const colElement = cols[index];
        if (colElement) {
          colElement.style.width = `${width}px`;
        }
        columnCells.forEach(colCell => {
          colCell.style.width = `${width}px`;
          colCell.style.minWidth = `${width}px`;
        });
      };
 
      const saveWidths = () => {
        if (!storageKey) return;
        try {
          const currentWidths = cols.map((_, idx) => {
            const cell = table.querySelector(`tr > *:nth-child(${idx + 1})`);
            if (!cell) return null;
            const rect = cell.getBoundingClientRect();
            return rect.width ? Math.round(rect.width) : null;
          });
          localStorage.setItem(storageKey, JSON.stringify(currentWidths));
        } catch (error) {
          console.warn('Unable to persist column widths', error);
        }
      };
 
      const firstRow = table.querySelector('tr');
      if (!firstRow) return;
      const cells = Array.from(firstRow.children);
      cells.forEach((cell, index) => {
        if (index === cells.length - 1) return;

        const existingHandle = cell.querySelector('.column-resizer');
        if (existingHandle) return;

        const handle = document.createElement('div');
        handle.className = 'column-resizer';
        handle.dataset.resizerIndex = index;

        const columnCells = Array.from(table.querySelectorAll(`tr > *:nth-child(${index + 1})`));
        const colElement = cols[index];
 
        let startX = 0;
        let startWidth = columnCells[0] ? columnCells[0].getBoundingClientRect().width : 0;
        if (storedWidths && typeof storedWidths[index] === 'number') {
          applyWidthToColumn(index, storedWidths[index]);
        }
 
        const onMouseMove = (event) => {
          const delta = event.pageX - startX;
          const newWidth = Math.max(80, startWidth + delta);
          applyWidthToColumn(index, newWidth);
        };
 
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          document.body.classList.remove('table-resizing');
          saveWidths();
        };
 
        handle.addEventListener('mousedown', (event) => {
          event.preventDefault();
          startX = event.pageX;
          startWidth = columnCells[0] ? columnCells[0].getBoundingClientRect().width : 0;
          document.body.classList.add('table-resizing');
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
 
        cell.style.position = 'relative';
        cell.appendChild(handle);
      });

      if (!storedWidths.length) {
        saveWidths();
      }
    });
  }

  populateModalDropdowns();
  renderRecords();
  initializeResizableTables(document);
});

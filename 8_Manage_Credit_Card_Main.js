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
  const accountTagFilter = document.getElementById('Credit_Account_Tag');
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
      if (holder || cardNumber || validFrom || validTo || cvv || amexCode || extraDigits) {
        cards.push({ holder, cardNumber, validFrom, validTo, cvv, amexCode, extraDigits });
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
    cards.forEach(card => addAddOnCardRow(card));
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
    if (!accountTagFilter) return;
    const data = getData();
    const tags = new Set();
    data.forEach(record => {
      if (record.Credit_Ac_Tag) tags.add(record.Credit_Ac_Tag);
    });
    accountTagFilter.innerHTML = '<option value="">All Account Tags</option>';
    Array.from(tags).sort().forEach(tag => {
      accountTagFilter.innerHTML += `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`;
    });
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
    const selectedTag = accountTagFilter ? accountTagFilter.value : '';
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
  };

  const createRecordCard = (record, index) => {
    const card = document.createElement('div');
    card.className = 'bank-record-card';

    const recordNumber = index + 1;
    const displayTag = record.Credit_Ac_Tag || 'No Account Tag';
    const recordLabel = `Record #${recordNumber}: ${displayTag}`;

    const cardNumberDisplay = record.Credit_Card_Number ? record.Credit_Card_Number.replace(/\s+/g, '') : '';
    const helplinePhones = [record.Credit_Helpline_Phone1, record.Credit_Helpline_Phone2, record.Credit_Helpline_Phone3].filter(p => p);
    const helplineEmails = [record.Credit_Helpline_Email1, record.Credit_Helpline_Email2, record.Credit_Helpline_Email3].filter(e => e);

    const addOnHtml = (record.AddOnCards || []).map((card, idx) => `
      <div class="holder-table-container">
        <table class="holder-info-table holder-info-table-modern">
          <thead>
            <tr>
              <th colspan="6">Add-On Card #${idx + 1}</th>
            </tr>
            <tr>
              <th>Holder</th>
              <th>Card Number</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th>CVV</th>
              <th>Extra Codes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(card.holder || '—')}</td>
              <td>${escapeHtml(card.cardNumber || '—')}</td>
              <td>${escapeHtml(card.validFrom || '—')}</td>
              <td>${escapeHtml(card.validTo || '—')}</td>
              <td>${escapeHtml(card.cvv || '—')}</td>
              <td>${escapeHtml([card.amexCode, card.extraDigits].filter(Boolean).join(' | ') || '—')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `).join('');

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
            <div class="section-heading-minimal"><strong>Primary Card Details</strong></div>
            <div class="fields-content-minimal">
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Institution:</strong></span>
                <span class="field-value-minimal">${escapeHtml(record.Credit_Institution || '')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Primary Holder:</strong></span>
                <span class="field-value-minimal">${escapeHtml(record.Credit_Primary_Holder || '')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Card Number:</strong></span>
                <span class="field-value-minimal">${escapeHtml(cardNumberDisplay || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Validity:</strong></span>
                <span class="field-value-minimal">${escapeHtml([record.Credit_Valid_From, record.Credit_Valid_To].filter(Boolean).join(' ➝ ') || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>CVV / Extra:</strong></span>
                <span class="field-value-minimal">${escapeHtml([record.Credit_CVV, record.Credit_Amex_Code, record.Credit_Extra_Digits].filter(Boolean).join(' | ') || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>PINs:</strong></span>
                <span class="field-value-minimal">Txn: ${escapeHtml(record.Credit_Transaction_Pin || '—')} | Tele: ${escapeHtml(record.Credit_Tele_Pin || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Billing Cycle:</strong></span>
                <span class="field-value-minimal">${escapeHtml(record.Credit_Billing_Cycle || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Dates:</strong></span>
                <span class="field-value-minimal">Statement: ${escapeHtml(record.Credit_Statement_Day || '—')} | Due: ${escapeHtml(record.Credit_Payment_Due_Day || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Login:</strong></span>
                <span class="field-value-minimal">${escapeHtml(record.Credit_Login_ID || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Password:</strong></span>
                <span class="field-value-minimal">${record.Credit_Login_Password ? '••••••••' : '—'}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Account #:</strong></span>
                <span class="field-value-minimal">${escapeHtml(record.Credit_Account_Number || '—')}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Portal:</strong></span>
                <span class="field-value-minimal">${record.Credit_URL ? `<a href="${record.Credit_URL}" target="_blank" class="info-link">${record.Credit_URL}</a>` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="column-right">
          <div class="fields-card-minimal">
            <div class="section-heading-minimal"><strong>Helpline &amp; Contacts</strong></div>
            <div class="fields-content-minimal">
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Phones:</strong></span>
                <span class="field-value-minimal">${helplinePhones.map(cleanPhone).filter(Boolean).join(' / ') || '—'}</span>
              </div>
              <div class="field-row-minimal">
                <span class="field-label-minimal"><strong>Emails:</strong></span>
                <span class="field-value-minimal">${helplineEmails.join(' / ') || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${addOnHtml ? `<div class="holders-full-width">${addOnHtml}</div>` : ''}

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

  accountTagFilter.addEventListener('change', renderRecords);
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
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const marginLeft = 18;
    const marginTop = 18;
    const marginRight = 18;
    const contentWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;
    let yPos = marginTop;

    const data = getData();
    if (!data.length) {
      alert('No credit card records available to export.');
      return;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Credit Card Records', marginLeft, yPos);
    yPos += 8;

    const lineGap = 5;
    const drawField = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${label}:`, marginLeft, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value || '—'), marginLeft + 30, yPos);
      yPos += lineGap;
    };

    data.forEach((record, idx) => {
      const recordNumber = idx + 1;
      const displayTag = record.Credit_Ac_Tag || 'Untitled';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(13, 71, 161);
      doc.text(`Record #${recordNumber}: ${displayTag}`, marginLeft, yPos);
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, yPos + 1.5, marginLeft + contentWidth, yPos + 1.5);
      yPos += 6;
      doc.setTextColor(0, 0, 0);

      drawField('Institution', record.Credit_Institution);
      drawField('Primary Holder', record.Credit_Primary_Holder);
      drawField('Card Number', record.Credit_Card_Number);
      drawField('Valid From', record.Credit_Valid_From);
      drawField('Valid To', record.Credit_Valid_To);
      drawField('CVV', record.Credit_CVV);
      drawField('AmEx Code', record.Credit_Amex_Code);
      drawField('Extra Digits', record.Credit_Extra_Digits);
      drawField('Transaction PIN', record.Credit_Transaction_Pin);
      drawField('Tele PIN', record.Credit_Tele_Pin);
      drawField('Billing Cycle', record.Credit_Billing_Cycle);
      drawField('Statement Day', record.Credit_Statement_Day);
      drawField('Payment Due Day', record.Credit_Payment_Due_Day);
      drawField('Login ID', record.Credit_Login_ID);
      drawField('Account Number', record.Credit_Account_Number);
      drawField('Portal URL', record.Credit_URL);
      drawField('Helpline Phones', [record.Credit_Helpline_Phone1, record.Credit_Helpline_Phone2, record.Credit_Helpline_Phone3].filter(Boolean).join(' / '));
      drawField('Helpline Emails', [record.Credit_Helpline_Email1, record.Credit_Helpline_Email2, record.Credit_Helpline_Email3].filter(Boolean).join(' / '));

      if (record.AddOnCards && record.AddOnCards.length) {
        doc.setFont('helvetica', 'bold');
        doc.text('Add-On Cards:', marginLeft, yPos);
        yPos += lineGap;
        record.AddOnCards.forEach((card, addIdx) => {
          doc.setFont('helvetica', 'bold');
          doc.text(`• Card #${addIdx + 1}`, marginLeft, yPos);
          yPos += lineGap;
          doc.setFont('helvetica', 'normal');
          doc.text(`Holder: ${card.holder || '—'}`, marginLeft + 4, yPos);
          yPos += lineGap;
          doc.text(`Number: ${card.cardNumber || '—'}`, marginLeft + 4, yPos);
          yPos += lineGap;
          doc.text(`Validity: ${[card.validFrom, card.validTo].filter(Boolean).join(' ➝ ') || '—'}`, marginLeft + 4, yPos);
          yPos += lineGap;
          doc.text(`CVV: ${card.cvv || '—'} | Codes: ${[card.amexCode, card.extraDigits].filter(Boolean).join(' | ') || '—'}`, marginLeft + 4, yPos);
          yPos += lineGap;
        });
      }

      if (record.Credit_Security_QA && record.Credit_Security_QA.length) {
        doc.setFont('helvetica', 'bold');
        doc.text('Security Questions:', marginLeft, yPos);
        yPos += lineGap;
        doc.setFont('helvetica', 'normal');
        record.Credit_Security_QA.forEach((qa, qaIdx) => {
          const text = `Q${qaIdx + 1}: ${qa.question || '—'} | A: ${qa.answer || '—'}`;
          const lines = doc.splitTextToSize(text, contentWidth);
          lines.forEach(line => {
            doc.text(line, marginLeft + 4, yPos);
            yPos += lineGap;
          });
        });
      }

      yPos += lineGap;
      if (yPos > doc.internal.pageSize.getHeight() - marginTop) {
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

      const securityHtml = renderSecuritySummary(record.Credit_Security_QA || []);
      const addOnHtml = (record.AddOnCards || []).map((card, idx) => `
        <div class="holder-table-container">
          <table class="holder-info-table holder-info-table-modern">
            <thead>
              <tr>
                <th colspan="6">Add-On Card #${idx + 1}</th>
              </tr>
              <tr>
                <th>Holder</th>
                <th>Card Number</th>
                <th>Valid From</th>
                <th>Valid To</th>
                <th>CVV</th>
                <th>Extra Codes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(card.holder || '—')}</td>
                <td>${escapeHtml(card.cardNumber || '—')}</td>
                <td>${escapeHtml(card.validFrom || '—')}</td>
                <td>${escapeHtml(card.validTo || '—')}</td>
                <td>${escapeHtml(card.cvv || '—')}</td>
                <td>${escapeHtml([card.amexCode, card.extraDigits].filter(Boolean).join(' | ') || '—')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Credit Card Record</title>
          <link rel="stylesheet" href="8_Manage_Credit_Card_Style.css">
          <style>
            body{padding:24px;background:#fff;font-family:'Segoe UI',sans-serif;color:#222;}
            .print-container{max-width:900px;margin:0 auto;}
            .record-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
            .record-header h2{margin:0;font-size:20px;color:#1a237e;}
            .field-set{border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:16px;}
            .field{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;}
            .field:last-child{border-bottom:none;}
            .field label{font-weight:600;color:#424242;}
            .field span{flex:1;text-align:right;color:#212121;}
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="record-header">
              <h2>Record #${recordNum}: ${escapeHtml(record.Credit_Ac_Tag || 'Untitled')}</h2>
              <div>${escapeHtml(record.Credit_Institution || '')}</div>
            </div>

            <div class="field-set">
              <div class="field"><label>Primary Holder</label><span>${escapeHtml(record.Credit_Primary_Holder || '—')}</span></div>
              <div class="field"><label>Card Number</label><span>${escapeHtml(record.Credit_Card_Number || '—')}</span></div>
              <div class="field"><label>Validity</label><span>${escapeHtml([record.Credit_Valid_From, record.Credit_Valid_To].filter(Boolean).join(' ➝ ') || '—')}</span></div>
              <div class="field"><label>CVV / Codes</label><span>${escapeHtml([record.Credit_CVV, record.Credit_Amex_Code, record.Credit_Extra_Digits].filter(Boolean).join(' | ') || '—')}</span></div>
              <div class="field"><label>PINs</label><span>Txn: ${escapeHtml(record.Credit_Transaction_Pin || '—')} | Tele: ${escapeHtml(record.Credit_Tele_Pin || '—')}</span></div>
              <div class="field"><label>Billing</label><span>${escapeHtml(record.Credit_Billing_Cycle || '—')}</span></div>
              <div class="field"><label>Statement Day</label><span>${escapeHtml(record.Credit_Statement_Day || '—')}</span></div>
              <div class="field"><label>Payment Due</label><span>${escapeHtml(record.Credit_Payment_Due_Day || '—')}</span></div>
              <div class="field"><label>Login ID</label><span>${escapeHtml(record.Credit_Login_ID || '—')}</span></div>
              <div class="field"><label>Account #</label><span>${escapeHtml(record.Credit_Account_Number || '—')}</span></div>
              <div class="field"><label>Portal</label><span>${escapeHtml(record.Credit_URL || '—')}</span></div>
            </div>

            <div class="field-set">
              <div class="field"><label>Helpline Phones</label><span>${escapeHtml([record.Credit_Helpline_Phone1, record.Credit_Helpline_Phone2, record.Credit_Helpline_Phone3].filter(Boolean).join(' / ') || '—')}</span></div>
              <div class="field"><label>Helpline Emails</label><span>${escapeHtml([record.Credit_Helpline_Email1, record.Credit_Helpline_Email2, record.Credit_Helpline_Email3].filter(Boolean).join(' / ') || '—')}</span></div>
            </div>

            ${addOnHtml}
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

  /* -------------------- Initialization -------------------- */
  populateInstitutionSelect();
  populateAccountTagSelect();
  populatePrimaryHolderDropdown();
  populateFilterOptions();
  populateSecurityDropdowns();
  renderRecords();
  updateAutoBackupStatusText();
  attachPasswordToggle();
});

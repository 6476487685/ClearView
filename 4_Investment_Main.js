document.addEventListener("DOMContentLoaded",()=>{
 const table=document.getElementById('investmentTable');
 const horizontalScrollbar = document.getElementById('horizontalScrollbar');
 const tableDataWrapper = document.querySelector('.table-data-wrapper');
 let scrollDummy = null;
 const tbody=document.getElementById('investmentBody');
 const form=document.getElementById('investmentForm');
 const modal=document.getElementById('investmentModal');
 const addBtn=document.getElementById('btnAdd');
 const cancelBtn=document.getElementById('cancelBtn');
 const title=document.getElementById('modalTitle');
 const btnPDF=document.getElementById('btnPDF');
 const btnExcel=document.getElementById('btnExcel');
 const filters=document.querySelectorAll('#fCategory,#fTag,#fHolder,#fStatus,#fFrom,#fTo,#globalSearch');
 const fCategory=document.getElementById('fCategory');
 const fTag=document.getElementById('fTag');
 const fHolder=document.getElementById('fHolder');
 const fStatus=document.getElementById('fStatus');
 const fFrom=document.getElementById('fFrom');
 const fTo=document.getElementById('fTo');
 const globalSearch=document.getElementById('globalSearch');
 const clearBtn=document.getElementById('btnClear');
 const btnClearData=document.getElementById('btnClearData');
 let editIndex=null;

// Don't load sample data - start with empty array

// Helper function to convert Excel serial dates to YYYY-MM-DD format
function convertExcelDateToYYYYMMDD(value){
  if(!value || value==='')return '';
  // If already a date string in YYYY-MM-DD format, return as is
  if(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  // If it's a valid date string (other formats), parse it
  const dateStr=String(value).trim();
  if(dateStr.match(/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/)){
    const parts=dateStr.split(/[-\/]/);
    const year=parts[0];
    const month=String(parts[1]).padStart(2,'0');
    const day=String(parts[2]).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }
  // If it's a number (Excel serial date), convert it
  const num=Number(value);
  if(!isNaN(num) && num>0){
    const excelEpoch=new Date(1899,11,30);
    const jsDate=new Date(excelEpoch.getTime()+num*86400000);
    if(!isNaN(jsDate.getTime())){
      const year=jsDate.getFullYear();
      const month=String(jsDate.getMonth()+1).padStart(2,'0');
      const day=String(jsDate.getDate()).padStart(2,'0');
      return `${year}-${month}-${day}`;
    }
  }
  // Try parsing as a regular date string (e.g., "2025-01-15" or "01/15/2025")
  try {
    const parsedDate = new Date(value);
    if(!isNaN(parsedDate.getTime())){
      const year=parsedDate.getFullYear();
      const month=String(parsedDate.getMonth()+1).padStart(2,'0');
      const day=String(parsedDate.getDate()).padStart(2,'0');
      return `${year}-${month}-${day}`;
    }
  } catch(e) {
    // Ignore parsing errors
  }
  return value;
}

// Function to fix existing dates in investment records
function fixExistingInvestmentDates(){
  const records = JSON.parse(localStorage.getItem('investment_records') || '[]');
  if(records.length === 0) return;
  
  let needsFix = false;
  const fixedRecords = records.map(r => {
    const investDate = convertExcelDateToYYYYMMDD(r.investdate || '');
    const maturityDate = convertExcelDateToYYYYMMDD(r.maturitydate || '');
    
    if(r.investdate && investDate !== r.investdate) needsFix = true;
    if(r.maturitydate && maturityDate !== r.maturitydate) needsFix = true;
    
    return {
      ...r,
      investdate: investDate || r.investdate || '',
      maturitydate: maturityDate || r.maturitydate || ''
    };
  });
  
  if(needsFix){
    localStorage.setItem('investment_records', JSON.stringify(fixedRecords));
    console.log('✓ Fixed date formats in investment records');
  }
}

 const getData=()=>{
   // Fix dates on first load
   fixExistingInvestmentDates();
   return JSON.parse(localStorage.getItem('investment_records'))||[];
 };
 const saveData=d=>localStorage.setItem('investment_records',JSON.stringify(d));

 function renderTable(d){
  tbody.innerHTML='';
  d.forEach((r,i)=>{
   const tr=document.createElement('tr');
   // Ac_Status: checkbox (checked = Active, unchecked = Paid & Account Closed)
   const acstatusValue = r.acstatus || '';
   const isActive = acstatusValue === 'Active' || acstatusValue === true || acstatusValue === 'true' || acstatusValue === 1;
   const acstatusDisplay = isActive ? '<input type="checkbox" checked disabled style="cursor: default;"> Active' : '<input type="checkbox" disabled style="cursor: default;"> Paid & Account Closed';
   // Format dates for display
   const investDate = convertExcelDateToYYYYMMDD(r.investdate || '');
   const maturityDate = convertExcelDateToYYYYMMDD(r.maturitydate || '');
   tr.innerHTML=`<td>${i+1}</td><td>${r.desc}</td><td>${r.cat}</td><td>${r.tag}</td>
   <td>${r.cur}</td>
   <td>${Number(r.investedamount||0).toFixed(2)}</td><td>${Number(r.expectedamount||0).toFixed(2)}</td>
   <td>${r.mode}</td><td>${r.holder}</td>
   <td>${investDate}</td><td>${r.paidfrom||''}</td><td>${maturityDate}</td><td>${r.freq}</td><td>${acstatusDisplay}</td><td>${r.txnstatus}</td>
   <td><span class='del' title='Delete'>🗑️</span></td>`;
   tbody.appendChild(tr);
  });
  
  // Update record count
  const recordCount = document.getElementById('recordCount');
  if(recordCount)recordCount.textContent=d.length;
 }
 renderTable(getData());

// Excel Import functionality (Txn_Investment)
const btnImportExcel=document.getElementById('btnImportExcel');
const excelFileInput=document.getElementById('excelFileInput');
if(btnImportExcel && excelFileInput){
  excelFileInput.addEventListener('change',(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=function(ev){
      try{
        const data=new Uint8Array(ev.target.result);
        const workbook=XLSX.read(data,{type:'array'});
        if(!workbook.SheetNames.includes('Txn_Investment')){
          alert('Txn_Investment sheet not found in the Excel file.');
          return;
        }
        const sheet=workbook.Sheets['Txn_Investment'];
        const jsonData=XLSX.utils.sheet_to_json(sheet);
        if(jsonData[0]){
          localStorage.setItem('last_import_headers_Txn_Investment', JSON.stringify(Object.keys(jsonData[0])));
        }
        if(jsonData.length===0){
          alert('No data found in Txn_Investment sheet.');
          return;
        }
        const investments=jsonData.map(row=>{
          const getValue=(...keys)=>{
            for(const k of keys){
              if(row[k]!==undefined && row[k]!==null && row[k]!=='')return row[k];
              const trimmed=k.trim();
              if(trimmed!==k && row[trimmed]!==undefined && row[trimmed]!==null && row[trimmed]!=='')return row[trimmed];
            }
            return '';
          };
          const investedAmount=getValue('Invested_Amount','InvestedAmount');
          const expectedAmount=getValue('Expected_Amount','ExpectedAmount');
          // Convert Ac_Status: "Active" = true/checked, "Paid & Account Closed" or anything else = false/unchecked
          const acstatusRaw=getValue('Ac_Status','Account_Status','AcStatus');
          let acstatusValue='Active'; // Default to Active
          if(acstatusRaw){
            const acstatusLower=String(acstatusRaw).toLowerCase().trim();
            if(acstatusLower==='active' || acstatusLower==='true' || acstatusLower==='1' || acstatusLower==='yes'){
              acstatusValue='Active';
            }else if(acstatusLower==='paid & account closed' || acstatusLower==='paid and account closed' || acstatusLower==='inactive' || acstatusLower==='false' || acstatusLower==='0' || acstatusLower==='no'){
              acstatusValue='Paid & Account Closed';
            }
          }
          return {
            desc:getValue('Investment_Description','Description','Desc'),
            cat:getValue('Investment_Category','Category','Cat'),
            tag:getValue('Investment_Ac_Tag','Account_Tag','Tag'),
            cur:getValue('Currency','Cur'),
            investedamount:investedAmount!==''?investedAmount:0,
            expectedamount:expectedAmount!==''?expectedAmount:0,
            mode:getValue('Mode_Txn','Txn_Mode','Mode','Payment_Mode'),
            holder:getValue('Ac_Holder','Holder'),
            investdate:convertExcelDateToYYYYMMDD(getValue('Invest_Date','Investment_Date','Date')),
            paidfrom:getValue('Paid_From','PaidFrom',''),
            maturitydate:convertExcelDateToYYYYMMDD(getValue('Maturity_Date','Due_Date','Maturity')),
            freq:getValue('Frequency','Freq'),
            acstatus:acstatusValue,
            txnstatus:getValue('Status_Txn','Txn_Status','Status')
          };
        });
        localStorage.setItem('investment_records',JSON.stringify(investments));
        alert(`Successfully loaded ${investments.length} investment records from Excel! Reloading page...`);
        setTimeout(()=>window.location.reload(),800);
      }catch(err){
        console.error('Error reading Investment Excel:',err);
        alert('Error reading Excel: '+err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

 // Event delegation
 tbody.addEventListener('click',e=>{
  if(e.target.classList.contains('del')){
   const i=[...tbody.children].indexOf(e.target.closest('tr'));
   if(confirm('Delete this record?')){const d=getData();d.splice(i,1);saveData(d);renderTable(d);}
  }
 });
 tbody.addEventListener('dblclick',e=>{
  const row=e.target.closest('tr');if(!row)return;
  editIndex=[...tbody.children].indexOf(row);
  const d=getData()[editIndex];
  Object.keys(d).forEach(k=>{
    if(k==='paidfrom' && form.paidfrom) form.paidfrom.value=d.paidfrom||'';
    else if(k==='acstatus'){
      // Handle checkbox: checked if Active, unchecked if Paid & Account Closed
      const acstatusValue = d[k] || '';
      const isActive = acstatusValue === 'Active' || acstatusValue === true || acstatusValue === 'true' || acstatusValue === 1;
      if(form.acstatus){
        form.acstatus.checked = isActive;
        updateAcStatusLabel();
      }
    }
    else if(form[k]) form[k].value=d[k]||'';
  });
  title.textContent="Edit Investment";
  modal.style.display='flex';
 });

 // Update Ac_Status label based on checkbox state
 function updateAcStatusLabel(){
  const checkbox = document.getElementById('acstatus');
  const label = document.getElementById('acstatusLabel');
  if(checkbox && label){
    label.textContent = checkbox.checked ? 'Active' : 'Paid & Account Closed';
  }
 }

 // Add event listener for checkbox change
 const acstatusCheckbox = document.getElementById('acstatus');
 if(acstatusCheckbox){
   acstatusCheckbox.addEventListener('change', updateAcStatusLabel);
 }

 // Add
 addBtn.onclick=()=>{
  editIndex=null;
  form.reset();
  // Set checkbox to checked by default (Active)
  if(form.acstatus){
    form.acstatus.checked = true;
    updateAcStatusLabel();
  }
  populateModalDropdowns(); // Refresh dropdowns with latest master data
  title.textContent="Add Investment";
  modal.style.display='flex';
 };
 cancelBtn.onclick=()=>modal.style.display='none';
 window.onclick=e=>{if(e.target===modal)modal.style.display='none';};

 // Save
 form.onsubmit=e=>{
  e.preventDefault();
  e.stopPropagation(); // Prevent HTML5 validation popup
  
  // Validate decimal amounts - allow numbers with up to 2 decimal places
  const validateDecimal = (value, fieldName) => {
    if(!value || value.trim()==='')return true; // Empty is OK, will default to 0
    // Remove any commas or whitespace
    const cleanValue = String(value).trim().replace(/,/g, '');
    const numValue = parseFloat(cleanValue);
    if(isNaN(numValue))return false;
    // Check if it has more than 2 decimal places
    const parts = String(cleanValue).split('.');
    if(parts.length > 1 && parts[1].length > 2)return false;
    return true;
  };
  
  const investedAmountValue = form.investedamount.value.trim();
  const expectedAmountValue = form.expectedamount.value.trim();
  
  if(!validateDecimal(investedAmountValue, 'Invested_Amount')){
    alert('Please enter a valid Invested_Amount with up to 2 decimal places (e.g., 497925.75)');
    form.investedamount.focus();
    form.investedamount.select();
    return false;
  }
  
  if(!validateDecimal(expectedAmountValue, 'Expected_Amount')){
    alert('Please enter a valid Expected_Amount with up to 2 decimal places (e.g., 535018.75)');
    form.expectedamount.focus();
    form.expectedamount.select();
    return false;
  }
  
  // Convert checkbox to status: checked = "Active", unchecked = "Paid & Account Closed"
  const acstatusValue = form.acstatus.checked ? 'Active' : 'Paid & Account Closed';
  
  // Clean and parse amounts, removing commas if any
  const investedAmount = parseFloat(String(investedAmountValue).replace(/,/g, '') || 0);
  const expectedAmount = parseFloat(String(expectedAmountValue).replace(/,/g, '') || 0);
  
  const rec={
    desc:form.desc.value,
    cat:form.cat.value,
    tag:form.tag.value,
    cur:form.cur.value,
    investedamount:investedAmount.toFixed(2),
    expectedamount:expectedAmount.toFixed(2),
    mode:form.mode.value,
    holder:form.holder.value,
    investdate:form.investdate.value,
    paidfrom:form.paidfrom.value||'',
    maturitydate:form.maturitydate.value,
    freq:form.freq.value,
    acstatus:acstatusValue,
    txnstatus:form.txnstatus.value
  };
  const d=getData();
  if(editIndex!==null)d[editIndex]=rec;else d.push(rec);
  saveData(d);renderTable(d);modal.style.display='none';
  return false;
 };

 // Clear Data button with safety mechanism (4 clicks to enable, then double confirmation)
 let clearDataClickCount=0;
 if(btnClearData){
 const setArmedUI=(armed)=>{
   if(armed){
     btnClearData.style.opacity='1';
     btnClearData.style.cursor='pointer';
   }else{
     btnClearData.style.opacity='0.6';
     btnClearData.style.cursor='not-allowed';
   }
 };
 setArmedUI(false);
 btnClearData.title='Click 4 times to enable, then click to clear all data';
 btnClearData.addEventListener('click',()=>{
   clearDataClickCount++;
   if(clearDataClickCount<4){
    btnClearData.title=`Click ${4-clearDataClickCount} more time(s) to enable`;
    return;
   }
   if(clearDataClickCount===4){
   setArmedUI(true);
   btnClearData.title='⚠️ Enabled! Click again to clear all data';
    return;
   }
   // 5th+ click - double confirmation
   const firstConfirm=confirm('⚠️ WARNING: This will delete ALL investment records!\n\nAre you sure you want to proceed?');
   if(!firstConfirm){clearDataClickCount=4;return;}
   const secondConfirm=confirm('⚠️ FINAL WARNING: This action cannot be undone!\n\nAll investment records will be permanently deleted.\n\nClick OK to confirm deletion.');
   if(!secondConfirm){clearDataClickCount=4;return;}
  try{ awaitBackupAndDownload(); }catch(_){ }
   // Clear data
   localStorage.removeItem('investment_records');
   renderTable([]);
   clearDataClickCount=0;
  setArmedUI(false);
  btnClearData.title='Click 4 times to enable, then click to clear all data';
   alert('✅ All investment records have been cleared successfully.');
  });
 }

 // Filters
 function applyFilters(){
  let d=getData();
  const cat=fCategory.value,tag=fTag.value,hol=fHolder.value,st=fStatus.value,from=fFrom.value,to=fTo.value,txt=globalSearch.value.toLowerCase();
  if(cat)d=d.filter(x=>x.cat===cat);
  if(tag)d=d.filter(x=>x.tag===tag);
  if(hol)d=d.filter(x=>x.holder===hol);
  if(st)d=d.filter(x=>x.txnstatus===st);
  if(from)d=d.filter(x=>{
  const invest=x.investdate;
  const maturity=x.maturitydate;
  return (!invest || invest>=from) || (!!maturity && maturity>=from);
 });
 if(to)d=d.filter(x=>{
  const invest=x.investdate;
  const maturity=x.maturitydate;
  return (!invest || invest<=to) || (!!maturity && maturity<=to);
 });
 if(txt)d=d.filter(x=>Object.values(x).join(' ').toLowerCase().includes(txt));
  renderTable(d);
 }
 filters.forEach(el=>el.oninput=applyFilters);
 clearBtn.onclick=()=>{filters.forEach(el=>el.value='');renderTable(getData());};

 // Function to populate modal dropdowns from Excel master data
function populateModalDropdowns(){
 const all=getData();
 try{
  // Load unified master data from localStorage
  const unifiedDataStr=localStorage.getItem('unified_master_data');
  let masterData={};
   if(unifiedDataStr){
    const unifiedData=JSON.parse(unifiedDataStr);
    masterData=unifiedData.investment||{};
   }else{
    // Fallback to legacy format
    const masterDataStr=localStorage.getItem('investment_master_data');
    masterData=masterDataStr?JSON.parse(masterDataStr):{};
   }
   
   // Also load common master data
   const unifiedDataFull=unifiedDataStr?JSON.parse(unifiedDataStr):{};
   const commonData=unifiedDataFull.common||{};
   
   // Mapping: form field ID -> master data sheet name -> fallback field names
   const fieldMapping={
    'cat':{sheets:['Investment_Category'],fallback:['cat']},
    'tag':{sheets:['Investment_Ac_Tag'],fallback:['tag']},
    'cur':{sheets:['Currency'],fallback:['cur']}, // Also checks common.Currency
    'mode':{sheets:['Mode'],fallback:['mode']}, // Check common.Mode
    'holder':{sheets:['Ac_Holder','Investment_Holder'],fallback:['holder']},
    'paidfrom':{sheets:['Income_Ac_Tag'],fallback:['paidfrom']}, // Paid From uses Income tags
    'freq':{sheets:['Frequency'],fallback:['freq']}, // Also checks common.Frequency
    'acstatus':{sheets:['Ac_Status'],fallback:['acstatus']}, // Check common.Ac_Status
    'txnstatus':{sheets:['Status_Txn'],fallback:['txnstatus']} // Check common.Status_Txn
   };
   
   // Populate filter dropdowns from master data (only Investment-specific data)
   // Category filter - only Investment categories
   if(fCategory){
    fCategory.innerHTML='<option value="">All</option>';
    const categories=masterData['Investment_Category']||[];
    categories.forEach(v=>{
     if(v&&v!=='')fCategory.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Tag filter - only Investment tags (Investment_Ac_Tag)
   if(fTag){
    fTag.innerHTML='<option value="">All</option>';
    let tags=masterData['Investment_Ac_Tag']||[];
    
    // Debug: log what we're getting from master data
    console.log('📊 Investment Account Tag Filter Debug:');
    console.log('   Master Data Keys:', Object.keys(masterData));
    console.log('   Investment_Ac_Tag from master:', tags);
    console.log('   Investment_Ac_Tag length:', tags.length);
    
    // Fallback: extract from existing records if master data is empty
    if(tags.length===0){
     console.log('   ⚠️ Master data empty, extracting from existing records...');
     const tagSet=new Set();
     all.forEach(x=>{
      const val=x.tag;
      if(val&&val!=='')tagSet.add(val);
     });
     tags=[...tagSet].sort();
     console.log('   Extracted tags from records:', tags);
    }
    
    tags.forEach(v=>{
     if(v&&v!=='')fTag.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Holder filter - from common Ac_Holder
   if(fHolder){
    fHolder.innerHTML='<option value="">All</option>';
    const holders=commonData['Ac_Holder']||[];
    holders.forEach(v=>{
     if(v&&v!=='')fHolder.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Status filter - from common Status_Txn
   if(fStatus){
    fStatus.innerHTML='<option value="">All</option>';
    const statuses=commonData['Status_Txn']||[];
    statuses.forEach(v=>{
     if(v&&v!=='')fStatus.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Populate modal form dropdowns from master data
   Object.entries(fieldMapping).forEach(([formId,config])=>{
    const select=form[formId];
    if(!select)return;
    
    // Clear existing options
    select.innerHTML='';
    
    // Try to load from master data (check common first for common fields, then module-specific)
    let values=[];
    const commonFieldNames=['Mode','Currency','Frequency','Ac_Status','Status_Txn','Ac_Holder'];
    for(const sheetName of config.sheets){
     // For common fields, check commonData first
     if(commonFieldNames.includes(sheetName)){
      if(commonData[sheetName]&&Array.isArray(commonData[sheetName])){
       values=commonData[sheetName].filter(v=>v&&v!=='');
       break;
      }
     }
     // Then check module-specific master data
     if(masterData[sheetName]&&Array.isArray(masterData[sheetName])){
      values=masterData[sheetName].filter(v=>v&&v!=='');
      break;
     }
     // Also check common fields as fallback
     if(commonData[sheetName]&&Array.isArray(commonData[sheetName])){
      values=commonData[sheetName].filter(v=>v&&v!=='');
      break;
     }
    }
    
    // Fallback: extract from existing records
    if(values.length===0){
     const valueSet=new Set();
     all.forEach(x=>{
      config.fallback.forEach(fn=>{
       const val=x[fn];
       if(val&&val!=='')valueSet.add(val);
      });
     });
     values=[...valueSet].sort();
    }
    
    // Populate dropdown
    const placeholder=document.createElement('option');
    placeholder.value='';
    placeholder.textContent='Select';
    placeholder.disabled=true;
    placeholder.selected=true;
    placeholder.hidden=true;
    select.appendChild(placeholder);
    values.forEach(v=>{
     if(v==='')return;
     const option=document.createElement('option');
     option.value=v;
     option.textContent=v;
     select.appendChild(option);
   });
  });
  
  // Log master data counts for verification
  console.log('📊 Investment Dashboard Master Data Loaded:');
  console.log(`   Investment_Category: ${(masterData['Investment_Category']||[]).length} records`);
  console.log(`   Investment_Ac_Tag: ${(masterData['Investment_Ac_Tag']||[]).length} records`);
  console.log(`   Currency: ${(commonData['Currency']||[]).length} records`);
  console.log(`   Mode: ${(commonData['Mode']||[]).length} records`);
  console.log(`   Ac_Holder: ${(commonData['Ac_Holder']||[]).length} records`);
  console.log(`   Frequency: ${(commonData['Frequency']||[]).length} records`);
  console.log(`   Ac_Status: ${(commonData['Ac_Status']||[]).length} records`);
  console.log(`   Status_Txn: ${(commonData['Status_Txn']||[]).length} records`);
 }catch(e){
  console.error('Error populating modal dropdowns:',e);
  // Fallback to original behavior
   const uniq=k=>[...new Set(all.map(x=>x[k]))];
 ['cat','tag','cur','mode','holder','paidfrom','freq','acstatus','txnstatus'].forEach(k=>{
   const s=form[k];
   if(s){
    s.innerHTML='';
   const values=uniq(k).filter(v=>v&&v!=='');
   if(values.length>0){
    const placeholder=document.createElement('option');
    placeholder.value='';
    placeholder.textContent='Select';
    placeholder.disabled=true;
    placeholder.selected=true;
    placeholder.hidden=true;
    s.appendChild(placeholder);
   }
   values.forEach(v=>{
    const option=document.createElement('option');
    option.value=v;
    option.textContent=v;
    s.appendChild(option);
   });
   }
  });
 }
}
 
 // Populate dropdowns on page load
 populateModalDropdowns();

// Column resize functionality
const COLUMN_STORAGE_KEY = 'investment_column_widths';
const RESIZER_STYLE_ID = 'investment-column-resizer-style';
const resizeState = {
  active: false,
  startX: 0,
  startWidth: 0,
  columnIndex: -1,
  headerCell: null
};

const ensureResizerStyles = () => {
  if (document.getElementById(RESIZER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = RESIZER_STYLE_ID;
  style.textContent = `
    th.resizable::after { display: none !important; }
    .column-resizer {
      position: absolute;
      top: 0;
      right: 0;
      width: 12px;
      height: 100%;
      cursor: col-resize;
      user-select: none;
      touch-action: none;
      z-index: 5;
    }
    .column-resizer::after {
      content: '';
      position: absolute;
      right: 4px;
      top: 20%;
      bottom: 20%;
      width: 3px;
      border-radius: 6px;
      background: rgba(26, 79, 176, 0.45);
      transition: background 0.15s ease, transform 0.15s ease;
    }
    body.table-resizing {
      cursor: col-resize !important;
      user-select: none !important;
    }
    .column-resizer:hover::after,
    .column-resizer:active::after {
      background: rgba(26, 79, 176, 0.85);
      transform: scaleX(1.2);
    }
  `;
  document.head.appendChild(style);
};

const parseWidth = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const getColumnCells = (index) => {
  if (!table) return [];
  return Array.from(table.querySelectorAll(`tbody tr td:nth-child(${index + 1})`));
};

const updateTableWidth = () => {
  if (!table) return;
  const headerCells = table.querySelectorAll('thead tr th');
  const total = Array.from(headerCells).reduce((sum, cell) => {
    const explicit = parseWidth(cell.style.width);
    return sum + (explicit || cell.offsetWidth || 0);
  }, 0);
  if (total > 0) {
    table.style.width = `${total}px`;
    table.style.minWidth = `${total}px`;
  }
};

const syncHorizontalScrollbarWidth = () => {
  if (!table || !horizontalScrollbar || !scrollDummy) return;
  const tableWidth = table.scrollWidth || table.offsetWidth;
  scrollDummy.style.width = `${Math.max(tableWidth, horizontalScrollbar.offsetWidth + 1)}px`;
};

const applyColumnWidth = (index, width) => {
  if (!table) return;
  const normalizedWidth = Math.max(60, parseInt(width, 10) || 0);
  const headerCells = table.querySelectorAll('thead tr th');
  const targetHeader = headerCells[index];
  if (!targetHeader) return;

  const widthPx = `${normalizedWidth}px`;
  targetHeader.style.width = widthPx;
  targetHeader.style.minWidth = widthPx;

  getColumnCells(index).forEach((cell) => {
    cell.style.width = widthPx;
    cell.style.minWidth = widthPx;
  });
  updateTableWidth();
  syncHorizontalScrollbarWidth();
};

const saveColumnWidths = () => {
  if (!table) return;
  const widths = Array.from(table.querySelectorAll('thead tr th')).map((th) => {
    const applied = parseWidth(th.style.width);
    return `${applied || th.offsetWidth}px`;
  });
  localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(widths));
};

const loadColumnWidths = () => {
  if (!table) return;
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
  if (!saved) return;
  try {
    const widths = JSON.parse(saved);
    widths.forEach((width, index) => {
      if (width) {
        applyColumnWidth(index, width);
      }
    });
  } catch (err) {
    console.warn('Unable to restore saved column widths:', err);
  }
};

const handlePointerMove = (event) => {
  if (!resizeState.active || !table) return;
  event.preventDefault();
  const delta = event.pageX - resizeState.startX;
  const newWidth = resizeState.startWidth + delta;
  applyColumnWidth(resizeState.columnIndex, newWidth);
};

const stopResizing = () => {
  if (!resizeState.active) return;
  document.removeEventListener('mousemove', handlePointerMove, true);
  document.removeEventListener('mouseup', stopResizing, true);
  document.body.classList.remove('table-resizing');
  resizeState.active = false;
  resizeState.headerCell = null;
  resizeState.columnIndex = -1;
  saveColumnWidths();
};

const startResizing = (event, headerCell, index) => {
  if (!table || !headerCell) return;
  event.preventDefault();
  resizeState.active = true;
  resizeState.startX = event.pageX;
  resizeState.startWidth = headerCell.offsetWidth;
  resizeState.columnIndex = index;
  resizeState.headerCell = headerCell;
  document.body.classList.add('table-resizing');
  document.addEventListener('mousemove', handlePointerMove, true);
  document.addEventListener('mouseup', stopResizing, true);
};

if (table) {
  ensureResizerStyles();
  const headerCells = table.querySelectorAll('thead tr th');
  headerCells.forEach((th, index) => {
    if (!th.classList.contains('resizable')) return;
    if (th.querySelector('.column-resizer')) return;
    const resizer = document.createElement('div');
    resizer.className = 'column-resizer';
    resizer.title = 'Drag to resize column';
    resizer.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      startResizing(event, th, index);
    });
    th.appendChild(resizer);
  });
  loadColumnWidths();
  updateTableWidth();
  syncHorizontalScrollbarWidth();
}

if (horizontalScrollbar && tableDataWrapper) {
  scrollDummy = document.createElement('div');
  scrollDummy.style.height = '17px';
  scrollDummy.style.display = 'block';
  scrollDummy.style.minWidth = '1200px';
  scrollDummy.style.position = 'absolute';
  scrollDummy.style.left = '0';
  scrollDummy.style.top = '0';
  horizontalScrollbar.appendChild(scrollDummy);

  const ensureScrollbarWidth = () => {
    const wrapperWidth = horizontalScrollbar.offsetWidth;
    if (scrollDummy.offsetWidth <= wrapperWidth) {
      scrollDummy.style.width = `${wrapperWidth + 1}px`;
    }
  };

  ensureScrollbarWidth();
  setTimeout(() => {
    ensureScrollbarWidth();
    syncHorizontalScrollbarWidth();
  }, 200);

  horizontalScrollbar.style.overflowX = 'scroll';
  horizontalScrollbar.style.overflowY = 'hidden';
  horizontalScrollbar.style.display = 'block';
  horizontalScrollbar.style.visibility = 'visible';

  horizontalScrollbar.addEventListener('scroll', () => {
    tableDataWrapper.scrollLeft = horizontalScrollbar.scrollLeft;
  });

  tableDataWrapper.addEventListener('scroll', () => {
    if (horizontalScrollbar.scrollLeft !== tableDataWrapper.scrollLeft) {
      horizontalScrollbar.scrollLeft = tableDataWrapper.scrollLeft;
    }
  });

  const observer = new MutationObserver(() => {
    horizontalScrollbar.scrollLeft = tableDataWrapper.scrollLeft;
  });
  observer.observe(tableDataWrapper, { childList: true, subtree: true });

  setTimeout(() => {
    horizontalScrollbar.scrollLeft = tableDataWrapper.scrollLeft;
    syncHorizontalScrollbarWidth();
  }, 100);
}

// Helper function to generate filename
function generateFilename(extension) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `Investment_Filter_Report_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
}

function createExcelFile(data) {
  // Prepare worksheet data
  const headers = ['#', 'Description', 'Category', 'Account Tag', 'Currency', 'Invested_Amount', 'Expected_Amount', 'Mode', 'Holder', 'Invest Date', 'Paid From', 'Maturity Date', 'Frequency', 'Ac Status', 'Txn Status'];
  const worksheetData = [headers];
  
  data.forEach((row, index) => {
    const rowData = [
      index + 1,
      row.description || '',
      row.category || '',
      row.tag || '',
      row.currency || '',
      row.investedAmount || '',
      row.expectedAmount || '',
      row.mode || '',
      row.holder || '',
      row.investDate || '',
      row.paidFrom || '',
      row.maturityDate || '',
      row.frequency || '',
      row.accountStatus || '',
      row.txnStatus || ''
    ];
    worksheetData.push(rowData);
  });
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 30 },  // Description
    { wch: 18 },  // Category
    { wch: 20 },  // Account Tag
    { wch: 10 },  // Currency
    { wch: 16 },  // Invested_Amount
    { wch: 16 },  // Expected_Amount
    { wch: 15 },  // Mode
    { wch: 15 },  // Holder
    { wch: 14 },  // Invest Date
    { wch: 18 },  // Paid From
    { wch: 16 },  // Maturity Date
    { wch: 14 },  // Frequency
    { wch: 14 },  // Ac Status
    { wch: 14 }   // Txn Status
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Investment Report");
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Helper function to get configured path and show message
function showPathReminder(fileType) {
  const downloadsPath = localStorage.getItem('project_downloads_path') || '';
  const backupPath = localStorage.getItem('project_backup_path') || '';
  
  if (downloadsPath || backupPath) {
    let message = `File downloaded to your default Downloads folder.\n\n`;
    if (downloadsPath) {
      message += `📁 Recommended: Move to: ${downloadsPath}\n`;
    }
    if (backupPath && fileType === 'excel') {
      message += `💾 Backup: Copy to: ${backupPath}\n`;
    }
    message += `\n(Note: Browser security prevents automatic saving to custom paths)`;
    setTimeout(() => alert(message), 500);
  }
}

function awaitBackupAndDownload(){
  try{
    const wb=XLSX.utils.book_new();
    const addTxnSheet=(sheetName,records,defaultHeaders,mapRow)=>{
      if(!Array.isArray(records))records=[];
      let headers=defaultHeaders;
      const savedHeaders=localStorage.getItem('last_import_headers_'+sheetName);
      if(savedHeaders){ try{ const parsed=JSON.parse(savedHeaders); if(Array.isArray(parsed)&&parsed.length>0){ headers=parsed; } }catch(_){ } }
      const aoa=[headers];
      records.forEach(r=>aoa.push(mapRow(r,headers)));
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),sheetName);
    };
    addTxnSheet('Txn_Expense',JSON.parse(localStorage.getItem('expense_records')||'[]'),['Expanse_Description','Expanse_Category','Expanse_Ac_Tag','Currency','Amount','Paid_From','Amount_Paid','Mode_Txn','Ac_Holder','Due_Date','Paid_Date','Frequency','Ac_Status','Txn_Status'],(r,h)=>h.map(k=>({
      'Expanse_Description':r.Expense_Description||r.desc||'',
      'Expanse_Category':r.Expense_Category||r.cat||'',
      'Expanse_Ac_Tag':r.Expense_Tag||r.tag||'',
      'Currency':r.Expense_Currency||r.cur||'',
      'Amount':r.Expense_Amount||r.Expense_Amount_Due||r.amt||'',
      'Paid_From':r.Expense_Paid_From||'',
      'Amount_Paid':r.Expense_Amount_Paid||'',
      'Mode_Txn':r.Expense_Mode||r.mode||'',
      'Ac_Holder':r.Expense_Holder||r.holder||'',
      'Due_Date':r.Expense_Due_Date||r.due||'',
      'Paid_Date':r.Expense_Paid_Date||r.paid||'',
      'Frequency':r.Expense_Frequency||r.freq||'',
      'Ac_Status':r.Expense_Account_Status||r.acstatus||'',
      'Txn_Status':r.Expense_Txn_Status||r.txnstatus||''
    }[k]??'')));
    addTxnSheet('Txn_Income',JSON.parse(localStorage.getItem('income_records')||'[]'),['Income_Description','Income_Category','Income_Ac_Tag','Currency','Amount','Mode_Txn','Ac_Holder','Income_Date','Frequency','Ac_Status','Status_Txn'],(r,h)=>h.map(k=>({
      'Income_Description':r.desc||'',
      'Income_Category':r.cat||'',
      'Income_Ac_Tag':r.tag||'',
      'Currency':r.cur||'',
      'Amount':r.amt||'',
      'Mode_Txn':r.mode||'',
      'Ac_Holder':r.holder||'',
      'Income_Date':r.paid||'',
      'Frequency':r.freq||'',
      'Ac_Status':r.acstatus||'',
      'Status_Txn':r.txnstatus||''
    }[k]??'')));
    addTxnSheet('Txn_Investment',JSON.parse(localStorage.getItem('investment_records')||'[]'),['Investment_Description','Investment_Category','Investment_Ac_Tag','Currency','Invested_Amount','Expected_Amount','Mode_Txn','Ac_Holder','Invest_Date','Paid_From','Maturity_Date','Frequency','Ac_Status','Status_Txn'],(r,h)=>h.map(k=>({
      'Investment_Description':r.desc||'',
      'Investment_Category':r.cat||'',
      'Investment_Ac_Tag':r.tag||'',
      'Currency':r.cur||'',
      'Invested_Amount':r.investedamount||'',
      'Expected_Amount':r.expectedamount||'',
      'Mode_Txn':r.mode||'',
      'Ac_Holder':r.holder||'',
      'Invest_Date':r.investdate||'',
      'Paid_From':r.paidfrom||'',
      'Maturity_Date':r.maturitydate||'',
      'Frequency':r.freq||'',
      'Ac_Status':r.acstatus||'',
      'Status_Txn':r.txnstatus||''
    }[k]??'')));
    addTxnSheet('Txn_Task',JSON.parse(localStorage.getItem('task_records')||'[]'),['Task_Description','Category_Task','Task_Tag','Task_Status','Task_Assignee','Task_Priority','Due_Date','Completed_On','Task_Adhoc'],(r,h)=>h.map(k=>({
      'Task_Description':r.Task_Description||'',
      'Category_Task':r.Category_Task||'',
      'Task_Tag':r.Task_Tag||'',
      'Task_Status':r.Task_Status||'',
      'Task_Assignee':r.Task_Assignee||'',
      'Task_Priority':r.Task_Priority||'',
      'Due_Date':r.Due_Date||'',
      'Completed_On':r.Completed_On||'',
      'Task_Adhoc':r.Task_Adhoc||''
    }[k]??'')));
    // Reconstruct consolidated master sheets
    const unifiedStr=localStorage.getItem('unified_master_data');
    let unified={};
    if(unifiedStr){
      unified=JSON.parse(unifiedStr);
    }else{
      unified={
        task:JSON.parse(localStorage.getItem('task_master_data')||'{}'),
        expense:JSON.parse(localStorage.getItem('expense_master_data')||'{}'),
        income:JSON.parse(localStorage.getItem('income_master_data')||'{}'),
        investment:JSON.parse(localStorage.getItem('investment_master_data')||'{}'),
        common:JSON.parse(localStorage.getItem('common_master_data')||'{}')
      };
    }
    
    // Add consolidated master data using global function
    if (typeof addConsolidatedMasterDataToWorkbook === 'function') {
      addConsolidatedMasterDataToWorkbook(wb);
    } else {
      console.warn('Global master data export function not available, using fallback');
      // Fallback to old method if global function not loaded
      const acCategoryData=[['Ac_Category','Ac_Classification']];
      const addToAcCategory=(values,classification)=>{
        if(Array.isArray(values)) values.forEach(v=>{ if(v && v!=='') acCategoryData.push([v,classification]); });
      };
      addToAcCategory(unified.income?.Income_Category||[],'Income');
      addToAcCategory(unified.investment?.Investment_Category||[],'Investment');
      addToAcCategory(unified.expense?.Expanse_Category||[],'Expanse');
      if(acCategoryData.length>1){
        const ws=XLSX.utils.aoa_to_sheet(acCategoryData);
        XLSX.utils.book_append_sheet(wb,ws,'Ac_Category');
      }
      
      const acTagData=[['Ac_Tag','Ac_Classification']];
      const addToAcTag=(values,classification)=>{
        if(Array.isArray(values)) values.forEach(v=>{ if(v && v!=='') acTagData.push([v,classification]); });
      };
      addToAcTag(unified.income?.Income_Ac_Tag||[],'Income');
      addToAcTag(unified.investment?.Investment_Ac_Tag||[],'Investment');
      addToAcTag(unified.expense?.Expanse_Ac_Tag||[],'Expanse');
      if(acTagData.length>1){
        const ws=XLSX.utils.aoa_to_sheet(acTagData);
        XLSX.utils.book_append_sheet(wb,ws,'Ac_Tag');
      }
      
      const acClassification=unified.common?.Ac_Classification||[];
      if(Array.isArray(acClassification) && acClassification.length>0){
        const ws=XLSX.utils.aoa_to_sheet([['Ac_Classification'],...acClassification.map(v=>[v])]);
        XLSX.utils.book_append_sheet(wb,ws,'Ac_Classification');
      }
      
      const addMasterSheet=(sheetName,values)=>{
        if(Array.isArray(values) && values.length>0){
          const ws=XLSX.utils.aoa_to_sheet([[sheetName],...values.map(v=>[v])]);
          XLSX.utils.book_append_sheet(wb,ws,sheetName);
        }
      };
      if(unified.common){
        addMasterSheet('Currency',unified.common.Currency);
        addMasterSheet('Mode',unified.common.Mode);
        addMasterSheet('Status_Txn',unified.common.Status_Txn);
        addMasterSheet('Ac_Holder',unified.common.Ac_Holder);
        addMasterSheet('Frequency',unified.common.Frequency);
        addMasterSheet('Ac_Status',unified.common.Ac_Status);
        addMasterSheet('Country',unified.common.Country);
      }
    }
    if(unified.task){
      Object.entries(unified.task).forEach(([name,arr])=>{
        if(Array.isArray(arr) && arr.length>0 && !['Task_Category','Task_Ac_Tag'].includes(name)){
          addMasterSheet(name,arr);
        }
      });
    }
    
    // Paths sheet
    const pathsData=[['Path Type','Path']];
    const pathKeys={
      'Master Data File':'project_master_data_file',
      'Backup Path':'project_backup_path',
      'Documents Path':'project_documents_path',
      'Downloads Path':'project_downloads_path'
    };
    Object.entries(pathKeys).forEach(([type,key])=>{
      const path=localStorage.getItem(key);
      if(path && path.trim()!==''){
        pathsData.push([type,path]);
      }
    });
    if(pathsData.length>1){
      const ws=XLSX.utils.aoa_to_sheet(pathsData);
      XLSX.utils.book_append_sheet(wb,ws,'Paths');
    }
    const now=new Date(); const pad=n=>String(n).padStart(2,'0'); const filename=`ClearView_Backup_${now.getFullYear()}_${pad(now.getMonth()+1)}_${pad(now.getDate())}_@_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}.xlsx`;
    const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'}); const blob=new Blob([wbout],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
    const backupPath=localStorage.getItem('project_backup_path')||''; const msg=`Due to browser limitations we have backed up your data before clearing in your browser's default Downloads folder.\n\nPlease move this file to your project backup folder manually.${backupPath?`\nPath: ${backupPath}`:''}`; setTimeout(()=>alert(msg),500);
  }catch(err){ console.error('Backup generation failed:',err); }
}

// Helper function to format dates for display (shared for Excel and PDF exports)
function formatDate(dateStr) {
  if (!dateStr) return '';
  // If already in YYYY-MM-DD format, convert to YYYY/MM/DD
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.replace(/-/g, '/');
  }
  // Try to parse as date
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    // If not a valid date, return as string
    return String(dateStr || '');
  }
  // Format as YYYY/MM/DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// Exports
btnExcel.onclick=()=>{
const data = getVisibleTableData();
console.log('Export - Data rows found:', data.length, data);
if(!data.length){alert('No investment data to export.');return;}
const blob = createExcelFile(data);
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = generateFilename('xlsx');
a.click();
URL.revokeObjectURL(a.href);
showPathReminder('excel');
};
 btnPDF.onclick=()=>{
 try {
  const data = getVisibleTableData();
  console.log('PDF Export - Data rows found:', data.length, data);
  if(!data.length){alert('No investment data to export.');return;}
 
  // Check if jsPDF is loaded
  if (!window.jspdf) {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
  }
  
 // Create PDF using jsPDF
 const { jsPDF } = window.jspdf;
 const doc = new jsPDF('l', 'mm', 'a4'); // landscape, millimeters, A4
 const pageWidth = doc.internal.pageSize.width; // Define pageWidth early

 // Helper function to get current filter criteria as array of objects
 function getFilterCriteria() {
   const criteria = [];
   if (fCategory.value) criteria.push({ label: 'Category', value: fCategory.value, color: [112, 173, 71] }); // Green
   if (fTag.value) criteria.push({ label: 'Account Tag', value: fTag.value, color: [255, 192, 0] }); // Yellow/Orange
   if (fHolder.value) criteria.push({ label: 'Holder', value: fHolder.value, color: [68, 114, 196] }); // Blue
   if (fStatus.value) criteria.push({ label: 'Status', value: fStatus.value, color: [237, 125, 49] }); // Orange
   if (fFrom.value) criteria.push({ label: 'Date From', value: formatDate(fFrom.value), color: [146, 208, 80] }); // Light Green
   if (fTo.value) criteria.push({ label: 'Date To', value: formatDate(fTo.value), color: [112, 48, 160] }); // Purple
   return criteria;
 }

 // Set font
 doc.setFont('helvetica');

 // Title - Font Size 16, bold
 doc.setFontSize(16);
 doc.setFont('helvetica', 'bold');
 doc.text('Investment Filtered Report', pageWidth / 2, 20, { align: 'center' });

 // Draw Filter Criteria as colored blocks
 const filterCriteria = getFilterCriteria();
 let filterY = 32;
 if (filterCriteria.length > 0) {
   const cardHeight = 7;
   const cardSpacing = 3;
   const cardsPerRow = 3; // Show 3 cards per row
   let cardX = 10; // Start from left margin
   let currentRow = 0;
   
   filterCriteria.forEach((filter, index) => {
     // Calculate card width (distribute available width across 3 cards)
     const availableWidth = pageWidth - 20; // 10mm margin on each side
     const cardWidth = (availableWidth - (cardSpacing * (cardsPerRow - 1))) / cardsPerRow;
     
     // Move to next row if needed
     if (index > 0 && index % cardsPerRow === 0) {
       currentRow++;
       cardX = 10;
       filterY = 32 + (currentRow * (cardHeight + cardSpacing));
     }
     
     // Draw colored background rectangle
     doc.setFillColor(filter.color[0], filter.color[1], filter.color[2]);
     doc.rect(cardX, filterY, cardWidth, cardHeight, 'F');
     
     // Draw text (white text for dark colors, black for light colors)
     const isDark = filter.color[0] < 150 && filter.color[1] < 150; // Check if dark color
     doc.setTextColor(isDark ? 255 : 0, isDark ? 255 : 0, isDark ? 255 : 0);
     doc.setFontSize(9);
     doc.setFont('helvetica', 'bold');
     
     const filterText = `${filter.label}: ${filter.value}`;
     const textX = cardX + cardWidth / 2;
     doc.text(filterText, textX, filterY + 4.5, { align: 'center', maxWidth: cardWidth - 4 });
     
     // Reset text color
     doc.setTextColor(0, 0, 0);
     
     // Move to next card position
     cardX += cardWidth + cardSpacing;
   });
   
   // Adjust startY based on number of filter rows
   const filterRows = Math.ceil(filterCriteria.length / cardsPerRow);
   const filterTotalHeight = filterRows * (cardHeight + cardSpacing) - cardSpacing;
   filterY = 32 + filterTotalHeight + 5; // Add 5mm spacing after filters
 } else {
   // No filters - show default message
   doc.setFontSize(10);
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(128, 128, 128);
   doc.text('No filters applied', pageWidth / 2, filterY, { align: 'center' });
   doc.setTextColor(0, 0, 0);
   filterY = filterY + 8;
 }
 
 // Calculate optimal column widths based on longest data string
 function calculateOptimalColumnWidths(dataArray, headersArray, pdfDoc, formatDateFunc) {
   // Use existing jsPDF doc to measure text width accurately
   pdfDoc.setFont('helvetica', 'normal');
   pdfDoc.setFontSize(7); // Font size for data rows
   
   const charWidth = 0.2; // mm per character for font size 7 (more accurate)
   const padding = 12; // mm padding for each cell (generous to prevent truncation)
   const minWidth = 12; // minimum width in mm
   const inchToMm = 25.4; // 1 inch = 25.4mm
   
   // Helper to format dates (local function)
   const formatDateLocal = (dateStr) => {
     if (!dateStr) return '';
     const date = new Date(dateStr);
     if (Number.isNaN(date.getTime())) return String(dateStr || '');
     return date.toISOString().split('T')[0].replace(/-/g, '/');
   };
   
   // Use provided formatDate function or local one
   const fmtDate = formatDateFunc || formatDateLocal;
   
   // Find longest string in each column (including headers)
   const maxLengths = headersArray.map(h => h.length);
   
   // Track longest description for reporting
   let longestDesc = '';
   let longestDescLength = 0;
   
   // Find longest string in data
   dataArray.forEach(row => {
     const desc = String(row.description || '');
     const cat = String(row.category || '');
     const tag = String(row.tag || '');
     const cur = String(row.currency || '');
     const invAmt = String(row.investedAmount || '');
     const expAmt = String(row.expectedAmount || '');
     const holder = String(row.holder || '');
     const invDate = String(fmtDate(row.investDate) || '');
     const matDate = String(fmtDate(row.maturityDate) || '');
     
     if (desc.length > maxLengths[1]) {
       maxLengths[1] = desc.length;
       if (desc.length > longestDescLength) {
         longestDescLength = desc.length;
         longestDesc = desc;
       }
     }
     if (cat.length > maxLengths[2]) maxLengths[2] = cat.length;
     if (tag.length > maxLengths[3]) maxLengths[3] = tag.length;
     if (cur.length > maxLengths[4]) maxLengths[4] = cur.length;
     if (invAmt.length > maxLengths[5]) maxLengths[5] = invAmt.length;
     if (expAmt.length > maxLengths[6]) maxLengths[6] = expAmt.length;
     if (holder.length > maxLengths[7]) maxLengths[7] = holder.length;
     if (invDate.length > maxLengths[8]) maxLengths[8] = invDate.length;
     if (matDate.length > maxLengths[9]) maxLengths[9] = matDate.length;
   });
   
   // Calculate widths based on content (using actual text width measurement)
   const widths = [];
   pdfDoc.setFontSize(7); // Data font size for accurate measurement
   pdfDoc.setFont('helvetica', 'normal');
   
   try {
     // Measure actual text widths for all columns
     widths[0] = Math.max(minWidth, pdfDoc.getTextWidth(headersArray[0]) + padding); // #
     
     // For Description: Measure actual width of longest description string
     const descHeaderWidth = pdfDoc.getTextWidth(headersArray[1]);
     let descDataWidth = 0;
     // Find the actual measured width of the longest description
     dataArray.forEach(row => {
       const desc = String(row.description || '');
       if (desc) {
         const measuredWidth = pdfDoc.getTextWidth(desc);
         if (measuredWidth > descDataWidth) {
           descDataWidth = measuredWidth;
         }
       }
     });
     widths[1] = Math.max(50, Math.max(descHeaderWidth, descDataWidth) + padding); // Description
     
     // For Category: Measure actual width
     const catHeaderWidth = pdfDoc.getTextWidth(headersArray[2]);
     let catDataWidth = 0;
     dataArray.forEach(row => {
       const cat = String(row.category || '');
       if (cat) {
         const measuredWidth = pdfDoc.getTextWidth(cat);
         if (measuredWidth > catDataWidth) {
           catDataWidth = measuredWidth;
         }
       }
     });
     widths[2] = Math.max(28, Math.max(catHeaderWidth, catDataWidth) + padding); // Category
     
     // For Tag: Measure actual width
     const tagHeaderWidth = pdfDoc.getTextWidth(headersArray[3]);
     let tagDataWidth = 0;
     dataArray.forEach(row => {
       const tag = String(row.tag || '');
       if (tag) {
         const measuredWidth = pdfDoc.getTextWidth(tag);
         if (measuredWidth > tagDataWidth) {
           tagDataWidth = measuredWidth;
         }
       }
     });
     widths[3] = Math.max(32, Math.max(tagHeaderWidth, tagDataWidth) + padding); // Tag
     
     // For Currency: Measure actual width
     const curHeaderWidth = pdfDoc.getTextWidth(headersArray[4]);
     let curDataWidth = 0;
     dataArray.forEach(row => {
       const cur = String(row.currency || '');
       if (cur) {
         const measuredWidth = pdfDoc.getTextWidth(cur);
         if (measuredWidth > curDataWidth) {
           curDataWidth = measuredWidth;
         }
       }
     });
     widths[4] = Math.max(minWidth, Math.max(curHeaderWidth, curDataWidth) + padding); // Currency
     
     widths[5] = inchToMm; // Invested_Amount - exactly 1 inch
     widths[6] = inchToMm; // Expected_Amount - exactly 1 inch
     
     // For Holder: Measure actual width
     const holderHeaderWidth = pdfDoc.getTextWidth(headersArray[7]);
     let holderDataWidth = 0;
     dataArray.forEach(row => {
       const holder = String(row.holder || '');
       if (holder) {
         const measuredWidth = pdfDoc.getTextWidth(holder);
         if (measuredWidth > holderDataWidth) {
           holderDataWidth = measuredWidth;
         }
       }
     });
     widths[7] = Math.max(minWidth, Math.max(holderHeaderWidth, holderDataWidth) + padding); // Holder
     
     widths[8] = inchToMm; // Invest Date - exactly 1 inch
     widths[9] = inchToMm; // Maturity Date - exactly 1 inch
   } catch (e) {
     console.error('Error measuring text widths, using fallback:', e);
     // Fallback to character-based calculation (less accurate)
     widths[0] = Math.max(minWidth, maxLengths[0] * charWidth + padding);
     widths[1] = Math.max(50, maxLengths[1] * charWidth + padding);
     widths[2] = Math.max(28, maxLengths[2] * charWidth + padding);
     widths[3] = Math.max(32, maxLengths[3] * charWidth + padding);
     widths[4] = Math.max(minWidth, maxLengths[4] * charWidth + padding);
     widths[5] = inchToMm;
     widths[6] = inchToMm;
     widths[7] = Math.max(minWidth, maxLengths[7] * charWidth + padding);
     widths[8] = inchToMm;
     widths[9] = inchToMm;
   }
   
   // Ensure total width fits on page (landscape A4 = 297mm, leave 20mm margins = 277mm available)
   const totalWidth = widths.reduce((sum, w) => sum + w, 0);
   const maxAvailableWidth = 277; // 297mm - 20mm margins
   
   // Calculate Description column width for reporting (after initial calculation, before scaling)
   // Use the measured widths from the calculation above - they're already stored in descDataWidth
   // Re-measure to ensure we have the values for reporting
   pdfDoc.setFontSize(7);
   pdfDoc.setFont('helvetica', 'normal');
   const descHeaderWidth = pdfDoc.getTextWidth(headersArray[1]);
   let descDataWidth = 0;
   // Measure actual width of longest description
   dataArray.forEach(row => {
     const desc = String(row.description || '');
     if (desc) {
       const measuredWidth = pdfDoc.getTextWidth(desc);
       if (measuredWidth > descDataWidth) {
         descDataWidth = measuredWidth;
       }
     }
   });
   // The initial width was already calculated in the try block above, but recalculate for reporting
   const descInitialWidth = Math.max(50, Math.max(descHeaderWidth, descDataWidth) + padding);
   
   if (totalWidth > maxAvailableWidth) {
     // Scale down only the variable width columns (Description, Category, Tag)
     // Keep fixed width columns (dates and amounts) at 1 inch
     const fixedColumns = widths[0] + widths[4] + widths[5] + widths[6] + widths[7] + widths[8] + widths[9];
     const variableColumns = widths[1] + widths[2] + widths[3];
     const remainingWidth = maxAvailableWidth - fixedColumns;
     
     if (remainingWidth > 0 && variableColumns > 0) {
       const scaleFactor = remainingWidth / variableColumns;
       widths[1] = Math.max(50, widths[1] * scaleFactor); // Description (ensure minimum)
       widths[2] = Math.max(28, widths[2] * scaleFactor); // Category (ensure minimum)
       widths[3] = Math.max(32, widths[3] * scaleFactor); // Tag (ensure minimum)
     }
   }
   
   // Report Description column analysis (after scaling)
   const descFinalWidth = widths[1];
   // Re-measure for accurate reporting (use the same measurement as in the try block)
   pdfDoc.setFontSize(7);
   pdfDoc.setFont('helvetica', 'normal');
   const reportDescHeaderWidth = pdfDoc.getTextWidth(headersArray[1]);
   let reportDescDataWidth = 0;
   dataArray.forEach(row => {
     const desc = String(row.description || '');
     if (desc) {
       const measuredWidth = pdfDoc.getTextWidth(desc);
       if (measuredWidth > reportDescDataWidth) {
         reportDescDataWidth = measuredWidth;
       }
     }
   });
   const reportDescInitialWidth = Math.max(50, Math.max(reportDescHeaderWidth, reportDescDataWidth) + padding);
   
   console.log('=== Investment_Description Column Analysis ===');
   console.log('Longest Description String:', longestDesc || '(no data)');
   console.log('Longest Description Length:', longestDescLength, 'characters');
   console.log('Description Header Width (mm):', reportDescHeaderWidth.toFixed(2), '(measured actual text width)');
   console.log('Description Data Width (mm):', reportDescDataWidth.toFixed(2), '(measured actual text width of longest description)');
   console.log('Description Initial Calculated Width (mm):', reportDescInitialWidth.toFixed(2));
   console.log('Description Final Allocated Width (mm):', descFinalWidth.toFixed(2));
   console.log('Description Width in inches:', (descFinalWidth / 25.4).toFixed(2));
   console.log('Available Text Width in cell (mm):', (descFinalWidth - 4).toFixed(2), '(column width minus 4mm padding)');
   console.log('Width Calculation Formula: Math.max(50, Math.max(measuredHeaderWidth, measuredDataWidth) + 12mm padding)');
   if (totalWidth > maxAvailableWidth) {
     console.log('Note: Width was scaled down to fit page width (277mm available)');
   }
   console.log('============================================');
   
   console.log('Calculated column widths (mm):', widths);
   const finalTotalWidth = widths.reduce((sum, w) => sum + w, 0);
   console.log('Total width:', finalTotalWidth.toFixed(2), 'mm');
   return widths;
 }

// Compact table layout for 20+ records per page
// Removed: Mode, Frequency, Ac Status, Txn Status, Paid From
const headers = ['#', 'Description', 'Category', 'Tag', 'Currency', 'Invested_Amount', 'Expected_Amount', 'Holder', 'Invest Date', 'Maturity Date'];
// Calculate optimal widths based on data (pass doc instance and formatDate function for text measurement)
const colWidths = calculateOptimalColumnWidths(data, headers, doc, formatDate);
// Row height is now dynamic based on text wrapping, but use average for page break calculation
const avgRowHeight = 7; // Average row height (will be adjusted dynamically per row)
// Calculate startY dynamically based on filter criteria
const filterCriteriaCount = getFilterCriteria().length;
const filterRows = filterCriteriaCount > 0 ? Math.ceil(filterCriteriaCount / 3) : 0;
const filterTotalHeight = filterRows > 0 ? (filterRows * 10) : 8; // 10mm per row or 8mm for "No filters"
const startY = 32 + filterTotalHeight + 15; // Start below filters with 15mm spacing
let currentY = startY;
let currentPage = 1;
// Track total pages - will be updated dynamically as pages are added
let totalPagesEstimate = 1;
 
 // Calculate total table width and center it
 const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
 const tableStartX = (pageWidth - totalTableWidth) / 2; // Center the table
 
 // Helper function to add footer
 function addFooter() {
   const pageY = doc.internal.pageSize.height - 10;
   doc.setFontSize(8);
   // Page format: current page / total pages (e.g., "Page 2/8")
   doc.text(`Page ${currentPage}/${totalPagesEstimate}`, 20, pageY);
   doc.text(`Total Records: ${data.length}`, pageWidth / 2, pageY, { align: 'center' });
   doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, pageY, { align: 'right' });
 }
 
 // Helper function to add new page
 function addNewPage() {
   doc.addPage();
   currentPage++;
   totalPagesEstimate = Math.max(totalPagesEstimate, currentPage); // Update estimate
   // On new pages, start right after the title (no filters on subsequent pages)
   // Title takes ~20mm, so start at 30mm (just below title, before header)
   currentY = 30; // Start position for subsequent pages (below title, before header)
   addFooter();
   // Redraw headers on new page
   drawHeaders();
   // drawHeaders() already sets currentY correctly (headerY + headerHeight + 1)
   doc.setFont('helvetica', 'normal');
 }
 
 // Helper function to draw table headers with Excel-style formatting
 function drawHeaders() {
   const headerHeight = 8; // Increased header height for better visibility
   const headerY = currentY;
   
   // Draw header background rectangle
   doc.setFillColor(68, 114, 196); // Excel blue header color #4472C4
   doc.rect(tableStartX, headerY, totalTableWidth, headerHeight, 'F');
   
   // Draw header borders for each cell
   doc.setDrawColor(255, 255, 255); // White borders between header cells
   doc.setLineWidth(0.2);
   let x = tableStartX;
   headers.forEach((header, i) => {
     const cellWidth = colWidths[i];
     if (i > 0) {
       // Draw vertical border between cells
       doc.line(x, headerY, x, headerY + headerHeight);
     }
     x += cellWidth;
   });
   
   // Draw header text with proper spacing
   doc.setFontSize(9); // Slightly larger font for better readability
   doc.setFont('helvetica', 'bold');
   doc.setTextColor(255, 255, 255); // White text
   
   x = tableStartX;
   headers.forEach((header, i) => {
     const cellWidth = colWidths[i];
     // Left-align text in cell with padding
     const textX = x + 2; // 2mm padding from left
     const textY = headerY + 5; // Vertically center text in larger header
     const maxTextWidth = cellWidth - 4; // Available width for text
     
     try {
       // Split header text to fit within column width
       const lines = doc.splitTextToSize(header, maxTextWidth);
       doc.text(lines[0] || header, textX, textY, { maxWidth: maxTextWidth });
     } catch (e) {
       doc.text(header, textX, textY, { maxWidth: maxTextWidth });
     }
     x += cellWidth;
   });
   
   // Reset text color for data rows
   doc.setTextColor(0, 0, 0);
   
   // Draw outer border around entire header
   doc.setDrawColor(0, 0, 0);
   doc.setLineWidth(0.2);
   doc.rect(tableStartX, headerY, totalTableWidth, headerHeight, 'S');
   
 // Move Y position below header (small spacing after header)
  currentY = headerY + headerHeight + 1; // 1mm spacing after header
 }
 
 // Draw initial headers
 drawHeaders();
 
 // Data rows with Excel-style formatting
 doc.setFontSize(7); // Smaller font for compact layout
 doc.setFont('helvetica', 'normal');
 
 // Use shared PDF utility functions for dynamic row heights
 // Check if PDFUtils is available (loaded from pdf_utils.js)
 if (typeof window.PDFUtils !== 'undefined' && window.PDFUtils.renderTableRowWithDynamicHeight) {
   // Use shared utility function for rendering rows with dynamic heights
   data.forEach((row, index) => {
     const rowData = [
       (index + 1).toString(),
       row.description || '',
       row.category || '',
       row.tag || '',
       row.currency || '',
       row.investedAmount || '',
       row.expectedAmount || '',
       row.holder || '',
       formatDate(row.investDate),
       formatDate(row.maturityDate)
     ];
     
     // Check for page break before rendering - ensure we use current currentY
     const pageHeight = doc.internal.pageSize.height;
     const checkPageBreak = (y, height) => {
       // Check if row will fit on current page (leave 25mm for footer)
       if (y + height > pageHeight - 25) {
         // Add new page - this updates currentY automatically
         addNewPage();
         // Return the updated currentY after page break
         return currentY;
       }
       // No page break needed, return same Y
       return y;
     };
     
     // Check if we need a page break BEFORE calculating row height
     // This prevents creating empty pages
     const rowHeightInfo = window.PDFUtils.calculateDynamicRowHeight(doc, rowData, colWidths, {
       baseHeight: 5,
       lineSpacing: 4,
       padding: 4
     });
     
     // Check page break with actual calculated height
     const checkedY = checkPageBreak(currentY, rowHeightInfo.cellHeight);
     if (checkedY !== currentY) {
       // Page break occurred, currentY is already updated by addNewPage()
       currentY = checkedY;
     }
     
     // Use shared utility function to render row with dynamic height
     // Increased baseHeight to 5mm and lineSpacing to 4mm for better spacing
     currentY = window.PDFUtils.renderTableRowWithDynamicHeight(doc, {
       rowY: currentY,
       currentY: currentY,
       rowData: rowData,
       colWidths: colWidths,
       tableStartX: tableStartX,
       totalTableWidth: totalTableWidth,
       rowIndex: index,
       checkPageBreak: null // Already checked above, don't check again
     }, {
       baseHeight: 5,      // Increased from 4mm for better spacing
       lineSpacing: 4,     // Increased from 3mm for better spacing between wrapped lines
       padding: 4,
       fontSize: 7,
       fontFamily: 'helvetica',
       fontStyle: 'normal'
     });
   });
 } else {
   // Fallback to original implementation if utility not available
   console.warn('PDFUtils not available, using fallback implementation');
   data.forEach((row, index) => {
     const rowData = [
       (index + 1).toString(),
       row.description || '',
       row.category || '',
       row.tag || '',
       row.currency || '',
       row.investedAmount || '',
       row.expectedAmount || '',
       row.holder || '',
       formatDate(row.investDate),
       formatDate(row.maturityDate)
     ];
     
     // Calculate maximum number of lines needed for this row
     let maxLines = 1;
     const lineHeights = [];
     rowData.forEach((cell, i) => {
       const cellWidth = colWidths[i];
       const cellText = String(cell || '');
       const maxTextWidth = cellWidth - 4; // Available width for text
       try {
         const lines = doc.splitTextToSize(cellText, maxTextWidth);
         lineHeights[i] = lines.length;
         if (lines.length > maxLines) {
           maxLines = lines.length;
         }
       } catch (e) {
         lineHeights[i] = 1;
       }
     });
     
     // Calculate dynamic cell height based on number of lines
     // Base height: 5mm for single line (increased from 4mm), +4mm for each additional line (increased from 3mm)
     const baseHeight = 5;  // Increased for better spacing
     const lineSpacing = 4; // Increased for better spacing between wrapped lines
     const cellHeight = baseHeight + ((maxLines - 1) * lineSpacing);
     
     // Check if we need a new page (leaving space for footer - 25mm)
     const pageHeight = doc.internal.pageSize.height;
     if (currentY + cellHeight > pageHeight - 25) {
       addNewPage();
     }
     
     const rowY = currentY;
     
     // Alternating row colors (Excel-style)
     if (index % 2 === 1) {
       doc.setFillColor(242, 242, 242); // Light gray #F2F2F2
       doc.rect(tableStartX, rowY, totalTableWidth, cellHeight, 'F');
     } else {
       doc.setFillColor(255, 255, 255); // White
       doc.rect(tableStartX, rowY, totalTableWidth, cellHeight, 'F');
     }
     
     // Draw cell borders and text
     doc.setFontSize(7);
     doc.setFont('helvetica', 'normal');
     doc.setTextColor(0, 0, 0);
     
     let x = tableStartX;
     rowData.forEach((cell, i) => {
       const cellWidth = colWidths[i];
       const raw = cell === undefined || cell === null ? '' : cell;
       const cellText = raw.toString();
       
       // Draw cell border
       doc.setDrawColor(200, 200, 200); // Light gray border
       doc.setLineWidth(0.1);
       doc.rect(x, rowY, cellWidth, cellHeight, 'S');
       
       // Draw text with padding
       const textX = x + 2; // 2mm padding from left
       const maxTextWidth = cellWidth - 4; // Available width for text
       
       try {
         // Split text to fit within column width
         const lines = doc.splitTextToSize(cellText, maxTextWidth);
         const numLines = lines.length;
         
         // Calculate starting Y position to vertically center text in cell
         const totalTextHeight = baseHeight + ((numLines - 1) * lineSpacing);
         const startTextY = rowY + 2 + (baseHeight / 2); // Start 2mm from top, then center
         
         // Draw all lines of text
         lines.forEach((line, lineIdx) => {
           const lineY = startTextY + (lineIdx * lineSpacing);
           doc.text(line, textX, lineY, { maxWidth: maxTextWidth });
         });
       } catch (e) {
         // Fallback if splitTextToSize fails
         const fallbackY = rowY + 2 + (baseHeight / 2);
         doc.text(cellText, textX, fallbackY, { maxWidth: maxTextWidth });
       }
       
       x += cellWidth; // Move to next cell
     });
     
   // Move Y position below row with increased spacing for better readability
   // Increased spacing from 0.5mm to 1mm between rows
   currentY = rowY + cellHeight + 1;
   });
 }
 
 // Calculate actual total pages after all rendering is done
 const actualTotalPages = doc.internal.getNumberOfPages();
 
 // Update all footers with correct page numbers (current page / total pages)
 for (let i = 1; i <= actualTotalPages; i++) {
   doc.setPage(i);
   const pageY = doc.internal.pageSize.height - 10;
   doc.setFontSize(8);
   // Correct format: current page / total pages (e.g., "Page 2/8", not "Page 8/2")
   doc.text(`Page ${i}/${actualTotalPages}`, 20, pageY);
   doc.text(`Total Records: ${data.length}`, pageWidth / 2, pageY, { align: 'center' });
   doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, pageY, { align: 'right' });
 }
 
// Download the PDF with proper filename
doc.save(generateFilename('pdf'));
showPathReminder('pdf');
 
 } catch (error) {
   console.error('PDF generation error:', error);
   alert('Error generating PDF: ' + error.message + '. Please try again.');
 }
};

// Theme functionality removed - using global theme from index.html
// Apply saved theme from index.html
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
  document.body.classList.add('dark');
}
});

function getVisibleTableData() {
  // Get all rows from the table body
  const allRows = document.querySelectorAll('#investmentBody tr');
  const data = [];
  
  allRows.forEach((row) => {
    // Check if row is visible (not hidden by CSS)
    const style = window.getComputedStyle(row);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return; // Skip hidden rows
    }
    
    const cells = row.querySelectorAll('td');
    // Current structure: #(0), desc(1), cat(2), tag(3), cur(4), investedamount(5), expectedamount(6), mode(7), holder(8), investdate(9), paidfrom(10), maturitydate(11), freq(12), acstatus(13), txnstatus(14), Actions(15)
    // Total: 16 cells (0-15)
    if (cells.length >= 16) {
      const safe = (index) => (cells[index]?.textContent || '').trim();
      // Extract account status from checkbox text (index 13)
      const acstatusText = safe(13);
      const accountStatus = acstatusText.includes('Active') ? 'Active' : 'Paid & Account Closed';
      data.push({
        description: safe(1),        // Description
        category: safe(2),           // Category
        tag: safe(3),                // Account Tag
        currency: safe(4),           // Currency
        investedAmount: safe(5),     // Invested_Amount
        expectedAmount: safe(6),     // Expected_Amount
        mode: safe(7),               // Mode
        holder: safe(8),             // Holder
        investDate: safe(9),         // Invest Date
        paidFrom: safe(10),          // Paid From
        maturityDate: safe(11),      // Maturity Date
        frequency: safe(12),         // Frequency
        accountStatus: accountStatus, // Ac Status
        txnStatus: safe(14)          // Txn Status
      });
    } else if (cells.length > 0) {
      // Debug: log rows that don't have enough cells
      console.warn('Row has insufficient cells:', cells.length, 'expected 16');
    }
  });
  
  // If no visible rows found, try getting data directly from localStorage
  if (data.length === 0) {
    console.warn('No visible table rows found, trying to get data from localStorage');
    const allData = getData();
    const filteredData = allData; // Apply same filters as display if needed
    if (filteredData && filteredData.length > 0) {
      filteredData.forEach((r) => {
        const acstatusValue = r.acstatus || '';
        const isActive = acstatusValue === 'Active' || acstatusValue === true || acstatusValue === 'true' || acstatusValue === 1;
        data.push({
          description: r.desc || '',
          category: r.cat || '',
          tag: r.tag || '',
          currency: r.cur || '',
          investedAmount: Number(r.investedamount || 0).toFixed(2),
          expectedAmount: Number(r.expectedamount || 0).toFixed(2),
          mode: r.mode || '',
          holder: r.holder || '',
          investDate: r.investdate || '',
          paidFrom: r.paidfrom || '',
          maturityDate: r.maturitydate || '',
          frequency: r.freq || '',
          accountStatus: isActive ? 'Active' : 'Paid & Account Closed',
          txnStatus: r.txnstatus || ''
        });
      });
    }
  }
  
  return data;
}

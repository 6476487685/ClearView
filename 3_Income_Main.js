document.addEventListener("DOMContentLoaded",()=>{
 const table=document.getElementById('incomeTable');
 const horizontalScrollbar = document.getElementById('horizontalScrollbar');
 const tableDataWrapper = document.querySelector('.table-data-wrapper');
 let scrollDummy = null;
 const tbody=document.getElementById('incomeBody');
 const form=document.getElementById('incomeForm');
 const modal=document.getElementById('incomeModal');
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
 const getData=()=>JSON.parse(localStorage.getItem('income_records'))||[];
 const saveData=d=>localStorage.setItem('income_records',JSON.stringify(d));

 function renderTable(d){
  tbody.innerHTML='';
  d.forEach((r,i)=>{
   const tr=document.createElement('tr');
   tr.innerHTML=`<td>${i+1}</td><td>${r.desc}</td><td>${r.cat}</td><td>${r.tag}</td>
   <td>${r.cur}</td><td>${Number(r.amt).toFixed(2)}</td><td>${r.mode}</td><td>${r.holder}</td>
   <td>${r.paid}</td><td>${r.freq}</td><td>${r.acstatus}</td><td>${r.txnstatus}</td>
   <td><span class='del' title='Delete'>🗑️</span></td>`;
   tbody.appendChild(tr);
  });
  
  // Update record count
  const recordCount = document.getElementById('recordCount');
  if(recordCount)recordCount.textContent=d.length;
 }
 renderTable(getData());

// Excel Import functionality (Txn_Income)
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
        if(!workbook.SheetNames.includes('Txn_Income')){
          alert('Txn_Income sheet not found in the Excel file.');
          return;
        }
        const sheet=workbook.Sheets['Txn_Income'];
        const jsonData=XLSX.utils.sheet_to_json(sheet);
        if(jsonData[0]){
          localStorage.setItem('last_import_headers_Txn_Income', JSON.stringify(Object.keys(jsonData[0])));
        }
        if(jsonData.length===0){
          alert('No data found in Txn_Income sheet.');
          return;
        }
        const incomes=jsonData.map(row=>{
          const getValue=(...keys)=>{
            for(const k of keys){
              if(row[k]!==undefined && row[k]!==null && row[k]!=='')return row[k];
              const trimmed=k.trim();
              if(trimmed!==k && row[trimmed]!==undefined && row[trimmed]!==null && row[trimmed]!=='')return row[trimmed];
            }
            return '';
          };
          const amt=getValue('Amount','Income_Amount','Amt');
          return {
            desc:getValue('Income_Description','Description','Desc'),
            cat:getValue('Income_Category','Category','Cat'),
            tag:getValue('Income_Ac_Tag','Account_Tag','Tag'),
            cur:getValue('Currency','Cur'),
            amt:amt!==''?amt:0,
            mode:getValue('Mode_Txn','Txn_Mode','Mode','Payment_Mode'),
            holder:getValue('Ac_Holder','Holder'),
            paid:getValue('Income_Date','Paid_Date','Date','Paid'),
            freq:getValue('Frequency','Freq'),
            acstatus:getValue('Ac_Status','Account_Status','AcStatus'),
            txnstatus:getValue('Status_Txn','Txn_Status','Status')
          };
        });
        localStorage.setItem('income_records',JSON.stringify(incomes));
        alert(`Successfully loaded ${incomes.length} income records from Excel! Reloading page...`);
        setTimeout(()=>window.location.reload(),800);
      }catch(err){
        console.error('Error reading Income Excel:',err);
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
  Object.keys(d).forEach(k=>{if(form[k])form[k].value=d[k];});
  title.textContent="Edit Income";
  modal.style.display='flex';
 });

 // Add
 addBtn.onclick=()=>{
  editIndex=null;
  form.reset();
  populateModalDropdowns(); // Refresh dropdowns with latest master data
  title.textContent="Add Income";
  modal.style.display='flex';
 };
 cancelBtn.onclick=()=>modal.style.display='none';
 window.onclick=e=>{if(e.target===modal)modal.style.display='none';};

 // Save
 form.onsubmit=e=>{
  e.preventDefault();
  const rec={desc:form.desc.value,cat:form.cat.value,tag:form.tag.value,cur:form.cur.value,amt:parseFloat(form.amt.value||0).toFixed(2),
   mode:form.mode.value,holder:form.holder.value,paid:form.paid.value,freq:form.freq.value,acstatus:form.acstatus.value,txnstatus:form.txnstatus.value};
  const d=getData();
  if(editIndex!==null)d[editIndex]=rec;else d.push(rec);
  saveData(d);renderTable(d);modal.style.display='none';
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
   const firstConfirm=confirm('⚠️ WARNING: This will delete ALL income records!\n\nAre you sure you want to proceed?');
   if(!firstConfirm){clearDataClickCount=4;return;}
   const secondConfirm=confirm('⚠️ FINAL WARNING: This action cannot be undone!\n\nAll income records will be permanently deleted.\n\nClick OK to confirm deletion.');
   if(!secondConfirm){clearDataClickCount=4;return;}
  try{ awaitBackupAndDownload(); }catch(_){ }
   // Clear data
   localStorage.removeItem('income_records');
   renderTable([]);
   clearDataClickCount=0;
  setArmedUI(false);
  btnClearData.title='Click 4 times to enable, then click to clear all data';
   alert('✅ All income records have been cleared successfully.');
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
  if(from)d=d.filter(x=>(!x.paid||x.paid>=from));
  if(to)d=d.filter(x=>(!x.paid||x.paid<=to));
  if(txt)d=d.filter(x=>Object.values(x).join(' ').toLowerCase().includes(txt));
  renderTable(d);
 }
 filters.forEach(el=>el.oninput=applyFilters);
 clearBtn.onclick=()=>{filters.forEach(el=>el.value='');renderTable(getData());};

 // Function to populate modal dropdowns from Excel master data
 function populateModalDropdowns(){
  try{
   // Load unified master data from localStorage
   const unifiedDataStr=localStorage.getItem('unified_master_data');
   let masterData={};
   if(unifiedDataStr){
    const unifiedData=JSON.parse(unifiedDataStr);
    masterData=unifiedData.income||{};
   }else{
    // Fallback to legacy format
    const masterDataStr=localStorage.getItem('income_master_data');
    masterData=masterDataStr?JSON.parse(masterDataStr):{};
   }
   
   // Also load common master data
   const unifiedDataFull=unifiedDataStr?JSON.parse(unifiedDataStr):{};
   const commonData=unifiedDataFull.common||{};
   
   // Mapping: form field ID -> master data sheet name -> fallback field names
   const fieldMapping={
    'cat':{sheets:['Income_Category'],fallback:['cat']},
    'tag':{sheets:['Income_Ac_Tag'],fallback:['tag']},
    'cur':{sheets:['Currency'],fallback:['cur']}, // Also checks common.Currency
    'mode':{sheets:['Mode'],fallback:['mode']}, // Check common.Mode
    'holder':{sheets:['Ac_Holder','Income_Holder'],fallback:['holder']},
    'freq':{sheets:['Frequency'],fallback:['freq']}, // Also checks common.Frequency
    'acstatus':{sheets:['Ac_Status'],fallback:['acstatus']}, // Check common.Ac_Status
    'txnstatus':{sheets:['Status_Txn'],fallback:['txnstatus']} // Check common.Status_Txn
   };
   
   // Populate filter dropdowns from master data (only Income-specific data)
   // Category filter - only Income categories
   if(fCategory){
    fCategory.innerHTML='<option value="">All</option>';
    const categories=masterData['Income_Category']||[];
    categories.forEach(v=>{
     if(v&&v!=='')fCategory.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Tag filter - only Income tags (Income_Ac_Tag)
   if(fTag){
    fTag.innerHTML='<option value="">All</option>';
    const tags=masterData['Income_Ac_Tag']||[];
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
    values.forEach(v=>{
     const option=document.createElement('option');
     option.value=v;
     option.textContent=v;
     select.appendChild(option);
   });
  });
  
  // Log master data counts for verification
  console.log('📊 Income Dashboard Master Data Loaded:');
  console.log(`   Income_Category: ${(masterData['Income_Category']||[]).length} records`);
  console.log(`   Income_Ac_Tag: ${(masterData['Income_Ac_Tag']||[]).length} records`);
  console.log(`   Currency: ${(commonData['Currency']||[]).length} records`);
  console.log(`   Mode: ${(commonData['Mode']||[]).length} records`);
  console.log(`   Ac_Holder: ${(commonData['Ac_Holder']||[]).length} records`);
  console.log(`   Frequency: ${(commonData['Frequency']||[]).length} records`);
  console.log(`   Ac_Status: ${(commonData['Ac_Status']||[]).length} records`);
  console.log(`   Status_Txn: ${(commonData['Status_Txn']||[]).length} records`);
 }catch(e){
  console.error('Error populating modal dropdowns:',e);
  // Fallback to original behavior
  const all=getData();
  const uniq=k=>[...new Set(all.map(x=>x[k]))];
  ['cat','tag','cur','mode','holder','freq'].forEach(k=>{
   const s=form[k];
   if(s){
    s.innerHTML='';
    uniq(k).forEach(v=>s.innerHTML+=`<option>${v}</option>`);
   }
  });
 }
}
 
 // Populate dropdowns on page load
 populateModalDropdowns();

// Column resize functionality
const COLUMN_STORAGE_KEY = 'income_column_widths';
const RESIZER_STYLE_ID = 'income-column-resizer-style';
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
    th.resizable::after {
      display: none !important;
    }
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
}

// Sync horizontal scrollbar with table scroll
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
  return `Income_Filter_Report_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
}

// Helper function to create Excel file using SheetJS
function createExcelFile(data) {
  // Prepare worksheet data
  const headers = ['#', 'Description', 'Category', 'Account Tag', 'Currency', 'Amount', 'Mode', 'Holder', 'Income Date', 'Frequency', 'Ac Status', 'Txn Status'];
  const worksheetData = [headers];
  
  data.forEach((row, index) => {
    const rowData = [
      index + 1,
      row.description || '',
      row.category || '',
      row.tag || '',
      row.currency || '',
      row.amount || '',
      row.mode || '',
      row.holder || '',
      row.incomeDate || '',
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
    { wch: 25 },  // Description
    { wch: 15 },  // Category
    { wch: 20 },  // Account Tag
    { wch: 10 },  // Currency
    { wch: 12 },  // Amount
    { wch: 15 },  // Mode
    { wch: 12 },  // Holder
    { wch: 12 },  // Income Date
    { wch: 12 },  // Frequency
    { wch: 12 },  // Ac Status
    { wch: 12 }   // Txn Status
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Income Report");
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function getVisibleTableData() {
  const rows = document.querySelectorAll('#incomeBody tr:not([style*="display: none"])');
  const data = [];
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 12) {
      const safe = (index) => (cells[index]?.textContent || '').trim();
      data.push({
        description: safe(1),
        category: safe(2),
        tag: safe(3),
        currency: safe(4),
        amount: safe(5),
        mode: safe(6),
        holder: safe(7),
        incomeDate: safe(8),
        frequency: safe(9),
        accountStatus: safe(10),
        txnStatus: safe(11)
      });
    }
  });
  return data;
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
      if(savedHeaders){
        try{ const parsed=JSON.parse(savedHeaders); if(Array.isArray(parsed)&&parsed.length>0){ headers=parsed; } }catch(_){ }
      }
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
    addTxnSheet('Txn_Investment',JSON.parse(localStorage.getItem('investment_records')||'[]'),['Investment_Description','Investment_Category','Investment_Ac_Tag','Currency','Amount','Mode_Txn','Ac_Holder','Invest_Date','Paid_From','Maturity_Date','Frequency','Ac_Status','Status_Txn'],(r,h)=>h.map(k=>({
      'Investment_Description':r.desc||'',
      'Investment_Category':r.cat||'',
      'Investment_Ac_Tag':r.tag||'',
      'Currency':r.cur||'',
      'Amount':r.amt||'',
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
    const now=new Date(); const pad=n=>String(n).padStart(2,'0');
    const filename=`ClearView_Backup_${now.getFullYear()}_${pad(now.getMonth()+1)}_${pad(now.getDate())}_@_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}.xlsx`;
    const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const blob=new Blob([wbout],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
    const backupPath=localStorage.getItem('project_backup_path')||'';
    const msg=`Due to browser limitations we have backed up your data before clearing in your browser's default Downloads folder.\n\nPlease move this file to your project backup folder manually.${backupPath?`\nPath: ${backupPath}`:''}`;
    setTimeout(()=>alert(msg),500);
  }catch(err){ console.error('Backup generation failed:',err); }
}

// Exports
btnExcel.onclick=()=>{
const data = getVisibleTableData();
if(!data.length){alert('No income data to export.');return;}
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
 if(!data.length){alert('No income data to export.');return;}
  
  // Check if jsPDF is loaded
  if (!window.jspdf) {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
  }
  
 // Create PDF using jsPDF
 const { jsPDF } = window.jspdf;
 const doc = new jsPDF('l', 'mm', 'a4'); // landscape, millimeters, A4
 const pageWidth = doc.internal.pageSize.width; // Define pageWidth early
 
 // Helper function to format dates to YYYY/MM/DD
 function formatDate(dateStr) {
   if (!dateStr) return '';
   const date = new Date(dateStr);
   return date.toISOString().split('T')[0].replace(/-/g, '/');
 }
 
 // Helper function to get current filter criteria
 function getFilterCriteria() {
   const criteria = [];
   if (fCategory.value) criteria.push(`Category = ${fCategory.value}`);
   if (fTag.value) criteria.push(`Account Tag = ${fTag.value}`);
   if (fHolder.value) criteria.push(`Holder = ${fHolder.value}`);
   if (fStatus.value) criteria.push(`Status = ${fStatus.value}`);
   if (fFrom.value) criteria.push(`Date From: ${formatDate(fFrom.value)}`);
   if (fTo.value) criteria.push(`Date To: ${formatDate(fTo.value)}`);
   return criteria.length > 0 ? criteria.join(', ') : 'No filters applied';
 }
 
 // Set font
 doc.setFont('helvetica');
 
 // Title - Font Size 16, bold
 doc.setFontSize(16);
 doc.setFont('helvetica', 'bold');
 doc.text('Income Filtered Report', pageWidth / 2, 20, { align: 'center' });
 
 // Filter Criteria - Font Size 12
 doc.setFontSize(12);
 doc.setFont('helvetica', 'normal');
 const criteriaText = getFilterCriteria();
 doc.text(criteriaText, pageWidth / 2, 35, { align: 'center' });
 
 // Compact table layout for 20+ records per page
 const headers = ['#', 'Description', 'Category', 'Tag', 'Currency', 'Amount', 'Mode', 'Holder', 'Income Date', 'Frequency', 'Ac Status', 'Txn Status'];
 const colWidths = [10, 40, 22, 28, 15, 20, 20, 18, 20, 18, 18, 18];
 const rowHeight = 5; // Compact row height
 const startY = 45;
 let currentY = startY;
 let currentPage = 1;
const totalPages = Math.max(1, Math.ceil(data.length / 22)); // ~22 records per page with compact layout
 
 // Calculate total table width and center it
 const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
 const tableStartX = (pageWidth - totalTableWidth) / 2; // Center the table
 
 // Helper function to add footer
 function addFooter() {
   const pageY = doc.internal.pageSize.height - 10;
   doc.setFontSize(8);
   doc.text(`Page ${currentPage}/${totalPages}`, 20, pageY);
   doc.text(`Total Records: ${data.length}`, pageWidth / 2, pageY, { align: 'center' });
   doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, pageY, { align: 'right' });
 }
 
 // Helper function to add new page
 function addNewPage() {
   doc.addPage();
   currentPage++;
   currentY = startY;
   addFooter();
   // Redraw headers on new page
   drawHeaders();
   currentY += 4;
   doc.setFont('helvetica', 'normal');
 }
 
 // Helper function to draw table headers
 function drawHeaders() {
   doc.setFontSize(8);
   doc.setFont('helvetica', 'bold');
   let x = tableStartX;
   headers.forEach((header, i) => {
     doc.text(header, x, currentY);
     x += colWidths[i];
   });
   
   // Header line
   currentY += 1;
   doc.line(tableStartX, currentY, x, currentY);
   currentY += 2;
 }
 
 // Draw initial headers
 drawHeaders();
 
 // Data rows with compact layout
 doc.setFontSize(7); // Smaller font for compact layout
 doc.setFont('helvetica', 'normal');
 currentY += 2;
 
 data.forEach((row, index) => {
   // Check if we need a new page (leaving space for footer)
   if (currentY > 180) {
     addNewPage();
   }
   
  const rowData = [
    (index + 1).toString(),
    row.description || '',
    row.category || '',
    row.tag || '',
    row.currency || '',
    row.amount || '',
    row.mode || '',
    row.holder || '',
    formatDate(row.incomeDate),
    row.frequency || '',
    row.accountStatus || '',
    row.txnStatus || ''
  ];
   
   let x = tableStartX;
   rowData.forEach((cell, i) => {
     // Truncate long text to fit columns
    const raw = cell === undefined || cell === null ? '' : cell;
    let cellText = raw.toString();
     // Define max lengths based on column widths
     const maxLengths = [3, 25, 15, 20, 10, 15, 15, 12, 15, 12, 12, 12];
     const maxLength = maxLengths[i];
     if (cellText.length > maxLength) {
       cellText = cellText.substring(0, maxLength - 3) + '...';
     }
     doc.text(cellText, x, currentY);
     x += colWidths[i];
   });
   
   currentY += rowHeight;
 });
 
 // Add final footer
 addFooter();
 
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

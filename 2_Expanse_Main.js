document.addEventListener("DOMContentLoaded",()=>{
 const table=document.getElementById('expenseTable');
 const tbody=document.getElementById('expenseBody');
 const form=document.getElementById('expenseForm');
 const modal=document.getElementById('expenseModal');
 const addBtn=document.getElementById('btnAdd');
 const cancelBtn=document.getElementById('cancelBtn');
 const title=document.getElementById('modalTitle');
 const btnPDF=document.getElementById('btnPDF');
 const btnExcel=document.getElementById('btnExcel');
 const fCategory=document.getElementById('fCategory');
 const fTag=document.getElementById('fTag');
 const fHolder=document.getElementById('fHolder');
 const fStatus=document.getElementById('fStatus');
 const fFrom=document.getElementById('fFrom');
 const fTo=document.getElementById('fTo');
 const globalSearch=document.getElementById('globalSearch');
 const filters=document.querySelectorAll('#fCategory,#fTag,#fHolder,#fStatus,#fFrom,#fTo,#globalSearch');
 const clearBtn=document.getElementById('btnClear');
 const btnClearData=document.getElementById('btnClearData');
 const btnImportExcel=document.getElementById('btnImportExcel');
 const excelFileInput=document.getElementById('excelFileInput');
 let editIndex=null;

 const sample=[
  {Expense_Description:'Office Rent',Expense_Category:'Rent',Expense_Tag:'CAD-Brightlight',Expense_Currency:'CAD',Expense_Amount:1200,Expense_Mode:'Bank',Expense_Holder:'Amit',Expense_Due_Date:'2025-02-01',Expense_Paid_Date:'2025-02-01',Expense_Frequency:'Monthly',Expense_Account_Status:'Active',Expense_Txn_Status:'Paid'},
  {Expense_Description:'Team Lunch',Expense_Category:'Meals',Expense_Tag:'INR-Personal',Expense_Currency:'INR',Expense_Amount:2000,Expense_Mode:'Cash',Expense_Holder:'Rashmi',Expense_Due_Date:'2025-05-05',Expense_Paid_Date:'',Expense_Frequency:'One-Time',Expense_Account_Status:'Active',Expense_Txn_Status:'Unpaid'},
  {Expense_Description:'Software Subscription',Expense_Category:'Software',Expense_Tag:'USD-Business',Expense_Currency:'USD',Expense_Amount:49,Expense_Mode:'Credit Card',Expense_Holder:'Amit',Expense_Due_Date:'2025-01-10',Expense_Paid_Date:'2025-01-09',Expense_Frequency:'Yearly',Expense_Account_Status:'Active',Expense_Txn_Status:'Paid'}
 ];
 // Don't load dummy data - start with empty array
 // User will load their own data via Excel import
 const getData=()=>JSON.parse(localStorage.getItem('expense_records'))||[];
 const saveData=d=>localStorage.setItem('expense_records',JSON.stringify(d));

 function renderTable(d){
  tbody.innerHTML='';
  // Update record count
  const recordCountEl=document.getElementById('recordCount');
  if(recordCountEl)recordCountEl.textContent=d.length;
  d.forEach((r,i)=>{
   const tr=document.createElement('tr');
   tr.innerHTML=`<td>${i+1}</td><td>${r.Expense_Description||r.desc||''}</td><td>${r.Expense_Category||r.cat||''}</td><td>${r.Expense_Tag||r.tag||''}</td>
   <td>${r.Expense_Currency||r.cur||''}</td><td>${Number(r.Expense_Amount_Due||r.Expense_Amount||r.amt||0).toFixed(2)}</td><td>${r.Expense_Due_Date||r.due||''}</td><td>${r.Expense_Paid_From||''}</td>
   <td>${Number(r.Expense_Amount_Paid||0).toFixed(2)}</td><td>${r.Expense_Paid_Date||r.paid||''}</td><td>${r.Expense_Mode||r.mode||''}</td><td>${r.Expense_Txn_Status||r.txnstatus||''}</td>
   <td>${r.Expense_Holder||r.holder||''}</td><td>${r.Expense_Frequency||r.freq||''}</td><td>${r.Expense_Account_Status||r.acstatus||''}</td>
   <td><span class='del' title='Delete'>🗑️</span></td>`;
   tbody.appendChild(tr);
  });
 }
 renderTable(getData());

// moved earlier in file

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
  // Map data fields to form fields
  const fieldMapping={
   Expense_Description:'Expense_Description',
   Expense_Category:'Expense_Category',
   Expense_Tag:'Expense_Tag',
   Expense_Currency:'Expense_Currency',
   Expense_Amount_Due:'Expense_Amount_Due',
   Expense_Amount_Paid:'Expense_Amount_Paid',
   Expense_Mode:'Expense_Mode',
   Expense_Holder:'Expense_Holder',
   Expense_Paid_From:'Expense_Paid_From',
   Expense_Due_Date:'Expense_Due_Date',
   Expense_Paid_Date:'Expense_Paid_Date',
   Expense_Frequency:'Expense_Frequency',
   Expense_Account_Status:'Expense_Account_Status',
   Expense_Txn_Status:'Expense_Txn_Status'
  };
  Object.entries(fieldMapping).forEach(([dataKey,formKey])=>{
   if(form[formKey] && d[dataKey]!==undefined && d[dataKey]!==null){
    form[formKey].value=d[dataKey];
   }
  });
  title.textContent="Edit Expense";
  modal.style.display='flex';
 });

 // Add
 addBtn.onclick=()=>{
  editIndex=null;
  form.reset();
  populateModalDropdowns(); // Refresh dropdowns with latest master data
  // Set default values
  form['Expense_Mode'].value='Bill-Payment-Bank';
  form['Expense_Txn_Status'].value='Unpaid';
  form['Expense_Holder'].value='Amit';
  form['Expense_Frequency'].value='Monthly';
  form['Expense_Account_Status'].value='Active';
  title.textContent="Add Expense";
  modal.style.display='flex';
 };
 cancelBtn.onclick=()=>modal.style.display='none';
 window.onclick=e=>{if(e.target===modal)modal.style.display='none';};

 // Migrate old data to new field names
 function migrateData(data){
  if(!data || data.length===0)return data;
  // Check if data uses old field names
  const needsMigration=data.some(r=>r.desc!==undefined);
  if(!needsMigration)return data;
  console.log('Migrating Expense data to new field names...');
  return data.map(r=>({
   Expense_Description:r.Expense_Description||r.desc||'',
   Expense_Category:r.Expense_Category||r.cat||'',
   Expense_Tag:r.Expense_Tag||r.tag||'',
   Expense_Currency:r.Expense_Currency||r.cur||'',
   Expense_Amount:r.Expense_Amount||r.amt||0,
   Expense_Mode:r.Expense_Mode||r.mode||'',
   Expense_Holder:r.Expense_Holder||r.holder||'',
   Expense_Due_Date:r.Expense_Due_Date||r.due||'',
   Expense_Paid_Date:r.Expense_Paid_Date||r.paid||'',
   Expense_Frequency:r.Expense_Frequency||r.freq||'',
   Expense_Account_Status:r.Expense_Account_Status||r.acstatus||'',
   Expense_Txn_Status:r.Expense_Txn_Status||r.txnstatus||''
  }));
 }

 // Save
 form.onsubmit=e=>{
  e.preventDefault();
  const rec={
   Expense_Description:form['Expense_Description'].value,
   Expense_Category:form['Expense_Category'].value,
   Expense_Tag:form['Expense_Tag'].value,
   Expense_Currency:form['Expense_Currency'].value,
   Expense_Amount_Due:parseFloat(form['Expense_Amount_Due'].value||0).toFixed(2),
   Expense_Amount_Paid:parseFloat(form['Expense_Amount_Paid'].value||0).toFixed(2),
   Expense_Mode:form['Expense_Mode'].value,
   Expense_Holder:form['Expense_Holder'].value,
   Expense_Paid_From:form['Expense_Paid_From'].value,
   Expense_Due_Date:form['Expense_Due_Date'].value,
   Expense_Paid_Date:form['Expense_Paid_Date'].value,
   Expense_Frequency:form['Expense_Frequency'].value,
   Expense_Account_Status:form['Expense_Account_Status'].value,
   Expense_Txn_Status:form['Expense_Txn_Status'].value
  };
  const d=getData();
  if(editIndex!==null)d[editIndex]=rec;else d.push(rec);
  saveData(d);renderTable(d);modal.style.display='none';
 };

 // Filters
 function applyFilters(){
  let d=getData();
  const cat=fCategory.value,tag=fTag.value,hol=fHolder.value,st=fStatus.value,from=fFrom.value,to=fTo.value,txt=globalSearch.value.toLowerCase();
  if(cat)d=d.filter(x=>(x.Expense_Category||x.cat)===cat);
  if(tag)d=d.filter(x=>(x.Expense_Tag||x.tag)===tag);
  if(hol)d=d.filter(x=>(x.Expense_Holder||x.holder)===hol);
  if(st)d=d.filter(x=>(x.Expense_Txn_Status||x.txnstatus)===st);
  if(from)d=d.filter(x=>{
   const paid=x.Expense_Paid_Date||x.paid;
   const due=x.Expense_Due_Date||x.due;
   return !paid || paid>=from || due>=from;
  });
  if(to)d=d.filter(x=>{
   const paid=x.Expense_Paid_Date||x.paid;
   const due=x.Expense_Due_Date||x.due;
   return !paid || paid<=to || due<=to;
  });
  if(txt)d=d.filter(x=>Object.values(x).join(' ').toLowerCase().includes(txt));
  renderTable(d);
 }
 filters.forEach(el=>el.oninput=applyFilters);
 clearBtn.onclick=()=>{filters.forEach(el=>el.value='');renderTable(getData());};

 // Function to populate filter dropdowns from master data
 function populateFilterDropdowns(){
  try{
   // Load unified master data from localStorage
   const unifiedDataStr=localStorage.getItem('unified_master_data');
   let masterData={};
   let commonData={};
   if(unifiedDataStr){
    const unifiedData=JSON.parse(unifiedDataStr);
    masterData=unifiedData.expense||{};
    commonData=unifiedData.common||{};
   }else{
    const masterDataStr=localStorage.getItem('expense_master_data');
    masterData=masterDataStr?JSON.parse(masterDataStr):{};
   }
   
   // Populate Category filter - only Expense categories
   if(fCategory){
    fCategory.innerHTML='<option value="">All</option>';
    const categories=masterData['Expanse_Category']||[];
    categories.forEach(v=>{
     if(v&&v!=='')fCategory.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Populate Tag filter - only Expense tags (Expanse_Ac_Tag)
   if(fTag){
    fTag.innerHTML='<option value="">All</option>';
    const tags=masterData['Expanse_Ac_Tag']||[];
    tags.forEach(v=>{
     if(v&&v!=='')fTag.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Populate Holder filter - from common Ac_Holder
   if(fHolder){
    fHolder.innerHTML='<option value="">All</option>';
    const holders=commonData['Ac_Holder']||[];
    holders.forEach(v=>{
     if(v&&v!=='')fHolder.innerHTML+=`<option>${v}</option>`;
    });
   }
   
   // Populate Status filter - from common Status_Txn
   if(fStatus){
    fStatus.innerHTML='<option value="">All</option>';
    const statuses=commonData['Status_Txn']||[];
    statuses.forEach(v=>{
     if(v&&v!=='')fStatus.innerHTML+=`<option>${v}</option>`;
    });
   }
  }catch(e){
   console.error('Error populating filter dropdowns:',e);
   // Fallback to existing records
   const all=getData();
   const uniq=k=>{
    const oldField=k==='cat'?'Expense_Category':k==='tag'?'Expense_Tag':k==='holder'?'Expense_Holder':k==='cur'?'Expense_Currency':k==='mode'?'Expense_Mode':k==='freq'?'Expense_Frequency':k;
    const values=new Set();
    all.forEach(x=>{
     const val=x[oldField]||x[k];
     if(val && val!=='')values.add(val);
    });
    return [...values];
   };
   if(fCategory)fCategory.innerHTML='<option value="">All</option>';
   uniq('cat').forEach(v=>fCategory.innerHTML+=`<option>${v}</option>`);
   if(fTag)fTag.innerHTML='<option value="">All</option>';
   uniq('tag').forEach(v=>fTag.innerHTML+=`<option>${v}</option>`);
   if(fHolder)fHolder.innerHTML='<option value="">All</option>';
   uniq('holder').forEach(v=>fHolder.innerHTML+=`<option>${v}</option>`);
  }
 }
 
 // Populate filter dropdowns on page load
 populateFilterDropdowns();
 
 // Function to populate modal dropdowns from Excel master data
 function populateModalDropdowns(){
  try{
   // Load unified master data from localStorage
   const unifiedDataStr=localStorage.getItem('unified_master_data');
   let masterData={};
   if(unifiedDataStr){
    const unifiedData=JSON.parse(unifiedDataStr);
    masterData=unifiedData.expense||{};
   }else{
    // Fallback to legacy format
    const masterDataStr=localStorage.getItem('expense_master_data');
    masterData=masterDataStr?JSON.parse(masterDataStr):{};
   }
   
   // Also load common master data
   const unifiedDataFull=unifiedDataStr?JSON.parse(unifiedDataStr):{};
   const commonData=unifiedDataFull.common||{};
   
   // Mapping: form field ID -> master data sheet name (checks both module-specific and common)
   const fieldMapping={
    'Expense_Category':['Expanse_Category','Expense_Category'],
    'Expense_Tag':['Expanse_Ac_Tag','Expense_Tag'],
    'Expense_Currency':['Currency','Expense_Currency'], // Also checks common.Currency
   'Expense_Mode':['Mode'], // Check common.Mode
   'Expense_Holder':['Ac_Holder','Expense_Holder'],
   'Expense_Frequency':['Frequency','Expense_Frequency'], // Also checks common.Frequency
   'Expense_Account_Status':['Ac_Status','Expense_Account_Status'],
   'Expense_Txn_Status':['Status_Txn','Txn_Status','Expense_Txn_Status']
   };
   
   // Populate each dropdown
   Object.entries(fieldMapping).forEach(([formId,sheetNames])=>{
    const select=form[formId];
    if(!select)return;
    
    // Clear existing options
    select.innerHTML='';
    
    // Try to load from master data (check common first for common fields, then module-specific)
    let values=[];
    const commonFieldNames=['Mode','Currency','Frequency','Ac_Status','Status_Txn','Ac_Holder'];
    for(const sheetName of sheetNames){
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
     const fallbackFields={
      'Expense_Category':['Expense_Category','cat'],
      'Expense_Tag':['Expense_Tag','tag'],
      'Expense_Currency':['Expense_Currency','cur','Currency'],
      'Expense_Mode':['Expense_Mode','mode','Mode_Txn','Txn_Mode'],
      'Expense_Holder':['Expense_Holder','holder','Ac_Holder'],
      'Expense_Frequency':['Expense_Frequency','freq','Frequency'],
      'Expense_Account_Status':['Expense_Account_Status','acstatus'],
      'Expense_Txn_Status':['Expense_Txn_Status','txnstatus','Status_Txn','Txn_Status']
     };
    const fields=fallbackFields[formId]||[];
    const valueSet=new Set();
    const all=getData();
    all.forEach(x=>{
      fields.forEach(fn=>{
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
   
   // Populate Paid_From dropdown from Income master data
   const paidFromSelect=form['Expense_Paid_From'];
   if(paidFromSelect){
    paidFromSelect.innerHTML='';
    const unifiedDataStr=localStorage.getItem('unified_master_data');
    let incomeMasterData={};
    if(unifiedDataStr){
     const unifiedData=JSON.parse(unifiedDataStr);
     incomeMasterData=unifiedData.income||{};
    }else{
     const incomeMasterDataStr=localStorage.getItem('income_master_data');
     incomeMasterData=incomeMasterDataStr?JSON.parse(incomeMasterDataStr):{};
    }
    let incomeTags=[];
    
    // Try master data first - check multiple possible keys
    const incomeTagKeys=['Income_Ac_Tag','Income_Tag'];
    let foundTags=false;
    for(const key of incomeTagKeys){
     if(incomeMasterData[key]&&Array.isArray(incomeMasterData[key])){
      incomeTags=incomeMasterData[key].filter(v=>v&&v!=='');
      foundTags=true;
      break;
     }
    }
    if(!foundTags){
     // Fallback to income records
     const incomeData=JSON.parse(localStorage.getItem('income_records')||'[]');
     const tagSet=new Set();
     incomeData.forEach(x=>{
      const tag=x.Income_Ac_Tag||x.tag;
      if(tag&&tag!=='')tagSet.add(tag);
     });
     incomeTags=[...tagSet].sort();
    }
    
    incomeTags.forEach(v=>{
     const option=document.createElement('option');
     option.value=v;
     option.textContent=v;
     paidFromSelect.appendChild(option);
    });
   }
   
  // Log master data counts for verification
 const unifiedDataStrLog=localStorage.getItem('unified_master_data');
 const unifiedDataFullLog=unifiedDataStrLog?JSON.parse(unifiedDataStrLog):{};
  const masterDataExpense=unifiedDataFullLog.expense||{};
  const commonDataExpense=unifiedDataFullLog.common||{};
   console.log('📊 Expense Dashboard Master Data Loaded:');
   console.log(`   Expanse_Category: ${(masterDataExpense['Expanse_Category']||[]).length} records`);
   console.log(`   Expanse_Ac_Tag: ${(masterDataExpense['Expanse_Ac_Tag']||[]).length} records`);
   console.log(`   Currency: ${(commonDataExpense['Currency']||[]).length} records`);
   console.log(`   Mode: ${(commonDataExpense['Mode']||[]).length} records`);
   console.log(`   Ac_Holder: ${(commonDataExpense['Ac_Holder']||[]).length} records`);
   console.log(`   Frequency: ${(commonDataExpense['Frequency']||[]).length} records`);
   console.log(`   Ac_Status: ${(commonDataExpense['Ac_Status']||[]).length} records`);
   console.log(`   Status_Txn: ${(commonDataExpense['Status_Txn']||[]).length} records`);
  }catch(e){
   console.error('Error populating modal dropdowns:',e);
  }
 }
 
 // Populate dropdowns on page load
 populateModalDropdowns();

 // Column resize with persistent storage
 let startX,startW,th;
 const STORAGE_KEY = 'expense_column_widths';
 
 // Load saved column widths
 function loadColumnWidths() {
   const savedWidths = localStorage.getItem(STORAGE_KEY);
   if (savedWidths) {
     try {
       const widths = JSON.parse(savedWidths);
       table.querySelectorAll('th.resizable').forEach((h, index) => {
         if (widths[index]) {
           h.style.width = widths[index];
         }
       });
     } catch (e) {
       console.log('Error loading column widths:', e);
     }
   }
 }
 
 // Save column widths
 function saveColumnWidths() {
   const widths = [];
   table.querySelectorAll('th.resizable').forEach(h => {
     widths.push(h.style.width || h.offsetWidth + 'px');
   });
   localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
 }
 
 // Initialize column widths
 loadColumnWidths();
 
 table.querySelectorAll('th.resizable').forEach(h=>{
  h.addEventListener('mousedown',e=>{
   if(e.offsetX>h.offsetWidth-6){
    startX=e.pageX;startW=h.offsetWidth;th=h;document.body.style.userSelect='none';
    document.addEventListener('mousemove',resize);document.addEventListener('mouseup',stop);
   }
  });
 });
 function resize(e){if(!th)return;const diff=e.pageX-startX;th.style.width=(startW+diff)+'px';}
 function stop(){
   document.removeEventListener('mousemove',resize);
   document.removeEventListener('mouseup',stop);
   document.body.style.userSelect='auto';
   saveColumnWidths(); // Save widths after resize
   th=null;
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
  return `Expanse_Filter_Report_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
}

// Helper function to create Excel file using SheetJS
function createExcelFile(data) {
  // Prepare worksheet data
  const headers = ['#', 'Description', 'Category', 'Account Tag', 'Currency', 'Amount', 'Mode', 'Holder', 'Due Date', 'Paid Date', 'Frequency', 'Ac Status', 'Txn Status'];
  const worksheetData = [headers];
  
  data.forEach((row, index) => {
    const rowData = [
      index + 1,
      row.desc,
      row.cat,
      row.tag,
      row.cur,
      Number(row.amt).toFixed(2),
      row.mode,
      row.holder,
      row.due,
      row.paid,
      row.freq,
      row.acstatus,
      row.txnstatus
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
    { wch: 12 },  // Due Date
    { wch: 12 },  // Paid Date
    { wch: 12 },  // Frequency
    { wch: 12 },  // Ac Status
    { wch: 12 }   // Txn Status
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Expense Report");
  
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

// Create and download a full backup workbook (masters + all transactions)
function awaitBackupAndDownload(){
  try{
    const wb=XLSX.utils.book_new();
    // Add transactional sheets with best-guess headers or last-import headers
    const addTxnSheet=(sheetName,records,defaultHeaders,mapRow)=>{
      if(!Array.isArray(records))records=[];
      let headers=defaultHeaders;
      const savedHeaders=localStorage.getItem('last_import_headers_'+sheetName);
      if(savedHeaders){
        try{ const parsed=JSON.parse(savedHeaders); if(Array.isArray(parsed)&&parsed.length>0){ headers=parsed; } }catch(_){ }
      }
      const aoa=[headers];
      records.forEach(r=>aoa.push(mapRow(r,headers)));
      const ws=XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb,ws,sheetName);
    };

    // Expense
    addTxnSheet('Txn_Expense',JSON.parse(localStorage.getItem('expense_records')||'[]'),
      ['Expanse_Description','Expanse_Category','Expanse_Ac_Tag','Currency','Amount','Paid_From','Amount_Paid','Txn_Mode','Ac_Holder','Due_Date','Paid_Date','Frequency','Ac_Status','Txn_Status'],
      (r,headers)=>headers.map(h=>{
        const map={
          'Expanse_Description': r.Expense_Description||r.desc||'',
          'Expanse_Category': r.Expense_Category||r.cat||'',
          'Expanse_Ac_Tag': r.Expense_Tag||r.tag||'',
          'Currency': r.Expense_Currency||r.cur||'',
          'Amount': r.Expense_Amount||r.Expense_Amount_Due||r.amt||'',
          'Paid_From': r.Expense_Paid_From||'',
          'Amount_Paid': r.Expense_Amount_Paid||'',
          'Txn_Mode': r.Expense_Mode||r.mode||'',
          'Ac_Holder': r.Expense_Holder||r.holder||'',
          'Due_Date': r.Expense_Due_Date||r.due||'',
          'Paid_Date': r.Expense_Paid_Date||r.paid||'',
          'Frequency': r.Expense_Frequency||r.freq||'',
          'Ac_Status': r.Expense_Account_Status||r.acstatus||'',
          'Txn_Status': r.Expense_Txn_Status||r.txnstatus||''
        };
        return map[h]!==undefined?map[h]:'';
      })
    );

    // Income
    addTxnSheet('Txn_Income',JSON.parse(localStorage.getItem('income_records')||'[]'),
      ['Income_Description','Income_Category','Income_Ac_Tag','Currency','Amount','Mode_Txn','Ac_Holder','Income_Date','Frequency','Ac_Status','Status_Txn'],
      (r,headers)=>headers.map(h=>{
        const map={
          'Income_Description': r.desc||r.Income_Description||'',
          'Income_Category': r.cat||r.Income_Category||'',
          'Income_Ac_Tag': r.tag||r.Income_Ac_Tag||'',
          'Currency': r.cur||r.Currency||'',
          'Amount': r.amt||r.Amount||'',
          'Mode_Txn': r.mode||r.Mode_Txn||r.Txn_Mode||'',
          'Ac_Holder': r.holder||r.Ac_Holder||'',
          'Income_Date': r.paid||r.Income_Date||'',
          'Frequency': r.freq||r.Frequency||'',
          'Ac_Status': r.acstatus||r.Ac_Status||'',
          'Status_Txn': r.txnstatus||r.Status_Txn||''
        };
        return map[h]!==undefined?map[h]:'';
      })
    );

    // Investment
    addTxnSheet('Txn_Investment',JSON.parse(localStorage.getItem('investment_records')||'[]'),
      ['Investment_Description','Investment_Category','Investment_Ac_Tag','Currency','Amount','Txn_Mode','Ac_Holder','Invest_Date','Maturity_Date','Frequency','Ac_Status','Status_Txn'],
      (r,headers)=>headers.map(h=>{
        const map={
          'Investment_Description': r.desc||'',
          'Investment_Category': r.cat||'',
          'Investment_Ac_Tag': r.tag||'',
          'Currency': r.cur||'',
          'Amount': r.amt||'',
          'Txn_Mode': r.mode||'',
          'Ac_Holder': r.holder||'',
          'Invest_Date': r.investdate||'',
          'Maturity_Date': r.maturitydate||'',
          'Frequency': r.freq||'',
          'Ac_Status': r.acstatus||'',
          'Status_Txn': r.txnstatus||''
        };
        return map[h]!==undefined?map[h]:'';
      })
    );

    // Task
    addTxnSheet('Txn_Task',JSON.parse(localStorage.getItem('task_records')||'[]'),
      ['Task_Description','Category_Task','Task_Tag','Task_Status','Task_Assignee','Task_Priority','Due_Date','Completed_On','Task_Adhoc'],
      (r,headers)=>headers.map(h=>{
        const map={
          'Task_Description': r.Task_Description||r.desc||'',
          'Category_Task': r.Category_Task||r.cat||'',
          'Task_Tag': r.Task_Tag||r.tag||'',
          'Task_Status': r.Task_Status||r.status||'',
          'Task_Assignee': r.Task_Assignee||r.assignee||'',
          'Task_Priority': r.Task_Priority||r.priority||'',
          'Due_Date': r.Due_Date||r.due||'',
          'Completed_On': r.Completed_On||r.completed||'',
          'Task_Adhoc': r.Task_Adhoc||''
        };
        return map[h]!==undefined?map[h]:'';
      })
    );

    // Reconstruct consolidated master sheets (Ac_Category, Ac_Tag, Ac_Classification)
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
    
    // Ac_Category consolidated sheet (with Ac_Classification)
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
    
    // Ac_Tag consolidated sheet (with Ac_Classification)
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
    
    // Ac_Classification standalone sheet
    const acClassification=unified.common?.Ac_Classification||[];
    if(Array.isArray(acClassification) && acClassification.length>0){
      const ws=XLSX.utils.aoa_to_sheet([['Ac_Classification'],...acClassification.map(v=>[v])]);
      XLSX.utils.book_append_sheet(wb,ws,'Ac_Classification');
    }
    
    // Add other common/master sheets (Currency, Mode, Status_Txn, Ac_Holder, Frequency, Ac_Status, Country, etc.)
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
    
    // Add task-specific sheets
    if(unified.task){
      Object.entries(unified.task).forEach(([name,arr])=>{
        if(Array.isArray(arr) && arr.length>0 && !['Task_Category','Task_Ac_Tag'].includes(name)){
          addMasterSheet(name,arr);
        }
      });
    }

    // Add Paths sheet
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

    const now=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const filename=`ClearView_Backup_${now.getFullYear()}_${pad(now.getMonth()+1)}_${pad(now.getDate())}_@_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}.xlsx`;
    const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const blob=new Blob([wbout],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    a.click();
    URL.revokeObjectURL(a.href);

    const backupPath=localStorage.getItem('project_backup_path')||'';
    const msg=`Due to browser limitations we have backed up your data before clearing in your browser's default Downloads folder.\n\nPlease move this file to your project backup folder manually.${backupPath?`\nPath: ${backupPath}`:''}`;
    setTimeout(()=>alert(msg),500);
  }catch(err){
    console.error('Backup generation failed:',err);
  }
}

// Exports
btnExcel.onclick=()=>{
const data = getData();
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
  const data = getData();
  
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
 doc.text('Expanse Filtered Report', pageWidth / 2, 20, { align: 'center' });
 
 // Filter Criteria - Font Size 12
 doc.setFontSize(12);
 doc.setFont('helvetica', 'normal');
 const criteriaText = getFilterCriteria();
 doc.text(criteriaText, pageWidth / 2, 35, { align: 'center' });
 
 // Compact table layout for 20+ records per page
 const headers = ['#', 'Description', 'Category', 'Tag', 'Currency', 'Amount', 'Mode', 'Holder', 'Due Date', 'Paid Date', 'Frequency', 'Ac Status', 'Txn Status'];
 const colWidths = [10, 40, 22, 28, 15, 20, 20, 18, 20, 20, 18, 18, 18];
 const rowHeight = 5; // Compact row height
 const startY = 45;
 let currentY = startY;
 let currentPage = 1;
 const totalPages = Math.ceil(data.length / 22); // ~22 records per page with compact layout
 
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
     row.desc,
     row.cat,
     row.tag,
     row.cur,
     Number(row.amt).toFixed(2),
     row.mode,
     row.holder,
     formatDate(row.due),
     formatDate(row.paid),
     row.freq,
     row.acstatus,
     row.txnstatus
   ];
   
   let x = tableStartX;
   rowData.forEach((cell, i) => {
     // Truncate long text to fit columns
     let cellText = cell.toString();
     // Define max lengths based on column widths
     const maxLengths = [3, 25, 15, 20, 10, 15, 15, 12, 15, 15, 12, 12, 12];
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

// Excel Import and Clear Data functionality
if (excelFileInput) {
  excelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('Available sheets:', workbook.SheetNames);

        // Load Txn_Expense sheet
        if (workbook.SheetNames.includes('Txn_Expense')) {
          const sheet = workbook.Sheets['Txn_Expense'];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          if(jsonData[0]){
            localStorage.setItem('last_import_headers_Txn_Expense', JSON.stringify(Object.keys(jsonData[0])));
          }
          
          if (jsonData.length === 0) {
            alert('No data found in Txn_Expense sheet.');
            return;
          }

          // Log actual Excel column names for debugging
          console.log('Excel column names:', Object.keys(jsonData[0] || {}));
          console.log('First row data:', jsonData[0]);
          // Specifically check Currency column
          if (jsonData[0]) {
            console.log('Currency value in Excel:', jsonData[0]['Currency']);
            console.log('Currency value in Excel (with space):', jsonData[0]['Currency ']);
            // Log all keys that might be related to Currency
            Object.keys(jsonData[0]).forEach(key => {
              if (key.toLowerCase().includes('currency') || key.toLowerCase().includes('cur')) {
                console.log(`Found currency-related key: "${key}" = "${jsonData[0][key]}"`);
              }
            });
          }

          // Map Excel columns to Expense structure - handle actual Excel column names
          const expenses = jsonData.map(row => {
            const getValue = (...possibleNames) => {
              for (let name of possibleNames) {
                const val = row[name];
                // Check for the value itself
                if (val !== undefined && val !== null && val !== '') {
                  return val;
                }
                // Try with trimmed key (in case of whitespace in column name)
                const trimmedKey = name.trim();
                if (trimmedKey !== name && row[trimmedKey] !== undefined && row[trimmedKey] !== null && row[trimmedKey] !== '') {
                  return row[trimmedKey];
                }
              }
              return '';
            };

            return {
              Expense_Description: getValue('Expanse_Description', 'Expense_Description', 'Description'),
              Expense_Category: getValue('Expanse_Category', 'Expense_Category', 'Category'),
              Expense_Tag: getValue('Expanse_Ac_Tag', 'Expense_Tag', 'Tag'),
              Expense_Currency: getValue('Currency', 'Expense_Currency'),
              Expense_Amount_Due: getValue('Amount', 'Expense_Amount_Due', 'Amount_Due'),
              Expense_Paid_From: getValue('Paid_From', 'Expense_Paid_From', ''),
              Expense_Amount_Paid: getValue('Amount_Paid', 'Amount-Paid', '0'),
              Expense_Mode: getValue('Txn_Mode', 'Expense_Mode', 'Payment_Mode', 'Mode'),
              Expense_Holder: getValue('Ac_Holder', 'Expense_Holder', 'Holder'),
              Expense_Due_Date: getValue('Due_Date', 'Expense_Due_Date'),
              Expense_Paid_Date: getValue('Paid_Date', 'Expense_Paid_Date'),
              Expense_Frequency: getValue('Frequency', 'Expense_Frequency'),
              Expense_Account_Status: getValue('Ac_Status', 'Expense_Account_Status', 'Account Status'),
              Expense_Txn_Status: getValue('Txn_Status', 'Expense_Txn_Status', 'Transaction Status')
            };
          });

          console.log('Loaded expenses:', expenses.length);
          console.log('First expense:', expenses[0]);

          // Save to localStorage
          localStorage.setItem('expense_records', JSON.stringify(expenses));
          
          // Reload page to refresh UI
          alert(`Successfully loaded ${expenses.length} expenses from Excel file! Reloading page...`);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          alert('Txn_Expense sheet not found in the Excel file.');
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Error reading Excel file: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

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
   const firstConfirm=confirm('⚠️ WARNING: This will delete ALL expense records!\n\nAre you sure you want to proceed?');
   if(!firstConfirm){clearDataClickCount=4;return;}
   const secondConfirm=confirm('⚠️ FINAL WARNING: This action cannot be undone!\n\nAll expense records will be permanently deleted.\n\nClick OK to confirm deletion.');
   if(!secondConfirm){clearDataClickCount=4;return;}
   // Backup all master + transactional data before clearing
   try{ awaitBackupAndDownload(); }catch(_){}
   // Clear data
   localStorage.removeItem('expense_records');
   renderTable([]);
   clearDataClickCount=0;
   setArmedUI(false);
   btnClearData.title='Click 4 times to enable, then click to clear all data';
   alert('✅ All expense records have been cleared successfully.');
  });
 }

// Theme functionality removed - using global theme from index.html
// Apply saved theme from index.html
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
  document.body.classList.add('dark');
}
});

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
 if(!localStorage.getItem('expense_records')) localStorage.setItem('expense_records',JSON.stringify(sample));
 const getData=()=>JSON.parse(localStorage.getItem('expense_records'))||[];
 const saveData=d=>localStorage.setItem('expense_records',JSON.stringify(d));

 function renderTable(d){
  tbody.innerHTML='';
  d.forEach((r,i)=>{
   const tr=document.createElement('tr');
   tr.innerHTML=`<td>${i+1}</td><td>${r.Expense_Description||r.desc||''}</td><td>${r.Expense_Category||r.cat||''}</td><td>${r.Expense_Tag||r.tag||''}</td>
   <td>${r.Expense_Currency||r.cur||''}</td><td>${Number(r.Expense_Amount||r.amt||0).toFixed(2)}</td><td>${r.Expense_Mode||r.mode||''}</td><td>${r.Expense_Holder||r.holder||''}</td>
   <td>${r.Expense_Paid_From||''}</td><td>${r.Expense_Due_Date||r.due||''}</td><td>${r.Expense_Paid_Date||r.paid||''}</td><td>${r.Expense_Frequency||r.freq||''}</td><td>${r.Expense_Account_Status||r.acstatus||''}</td><td>${r.Expense_Txn_Status||r.txnstatus||''}</td>
   <td><span class='del' title='Delete'>🗑️</span></td>`;
   tbody.appendChild(tr);
  });
 }
 renderTable(getData());

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
  title.textContent="Edit Expense";
  modal.style.display='flex';
 });

 // Add
 addBtn.onclick=()=>{editIndex=null;form.reset();title.textContent="Add Expense";modal.style.display='flex';};
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
   Expense_Amount:parseFloat(form['Expense_Amount'].value||0).toFixed(2),
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

 // Dropdown populate - handle both old and new field names
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
 uniq('cat').forEach(v=>fCategory.innerHTML+=`<option>${v}</option>`);
 uniq('tag').forEach(v=>fTag.innerHTML+=`<option>${v}</option>`);
 uniq('holder').forEach(v=>fHolder.innerHTML+=`<option>${v}</option>`);
 
 // Populate form dropdowns with standardized field names
 const formDropdownMap={
  'Expense_Category':['Expense_Category','cat'],
  'Expense_Tag':['Expense_Tag','tag'],
  'Expense_Currency':['Expense_Currency','cur','Currency'],
  'Expense_Mode':['Expense_Mode','mode','Txn_Mode'],
  'Expense_Holder':['Expense_Holder','holder','Ac_Holder'],
  'Expense_Frequency':['Expense_Frequency','freq','Frequency']
 };
 
 Object.entries(formDropdownMap).forEach(([formId,fieldNames])=>{
  const select=form[formId];
  if(select){
   const values=new Set();
   all.forEach(x=>{
    fieldNames.forEach(fn=>{
     if(x[fn] && x[fn]!=='')values.add(x[fn]);
    });
   });
   [...values].sort().forEach(v=>select.innerHTML+=`<option>${v}</option>`);
  }
 });
 
 // Populate Paid_From dropdown from Income_Ac_Tag
 // This is a cross-reference field that links to Income module
 const paidFromSelect=form['Expense_Paid_From'];
 if(paidFromSelect){
  const incomeData=JSON.parse(localStorage.getItem('income_records')||'[]');
  const incomeTags=new Set();
  incomeData.forEach(x=>{
   const tag=x.Income_Ac_Tag||x['Income_Ac_Tag']||x.tag;
   if(tag && tag!=='')incomeTags.add(tag);
  });
  [...incomeTags].sort().forEach(v=>paidFromSelect.innerHTML+=`<option>${v}</option>`);
 }

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

 // Exports
 btnExcel.onclick=()=>{
 const data = getData();
 const blob = createExcelFile(data);
 const a = document.createElement('a');
 a.href = URL.createObjectURL(blob);
 a.download = generateFilename('xlsx');
 a.click();
 URL.revokeObjectURL(a.href);
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
              Expense_Paid_From: getValue('Paid_From', 'Expense_Paid_From', ''),
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

// Clear Data functionality
if (btnClearData) {
  btnClearData.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all expense data? This action cannot be undone.')) {
      localStorage.removeItem('expense_records');
      
      // Clear table
      if (tbody) tbody.innerHTML = '';
      
      // Clear filter dropdowns
      if (fCategory) fCategory.innerHTML = '<option value="">All</option>';
      if (fTag) fTag.innerHTML = '<option value="">All</option>';
      if (fHolder) fHolder.innerHTML = '<option value="">All</option>';
      if (fStatus) fStatus.value = '';
      if (fFrom) fFrom.value = '';
      if (fTo) fTo.value = '';
      if (globalSearch) globalSearch.value = '';
      
      alert('All expense data has been cleared.');
    }
  });
}

// Theme functionality
const themeSwitch = document.getElementById('themeSwitch');
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
  document.body.classList.add('dark');
  themeSwitch.checked = true;
}
themeSwitch.addEventListener('change', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', themeSwitch.checked ? 'dark' : 'light');
});
});

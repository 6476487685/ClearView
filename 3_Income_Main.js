document.addEventListener("DOMContentLoaded",()=>{
 const table=document.getElementById('incomeTable');
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
 let editIndex=null;

 const sample=[
  {desc:'Salary Payment',cat:'Salary',tag:'CAD-Brightlight',cur:'CAD',amt:5000,mode:'Bank',holder:'Amit',paid:'2025-02-01',freq:'Monthly',acstatus:'Active',txnstatus:'Paid'},
  {desc:'Freelance Work',cat:'Freelance',tag:'INR-Personal',cur:'INR',amt:15000,mode:'UPI',holder:'Rashmi',paid:'2025-05-05',freq:'One-Time',acstatus:'Active',txnstatus:'Paid'},
  {desc:'Investment Returns',cat:'Investment',tag:'USD-Business',cur:'USD',amt:500,mode:'Bank Transfer',holder:'Amit',paid:'2025-01-10',freq:'Quarterly',acstatus:'Active',txnstatus:'Paid'}
 ];
 if(!localStorage.getItem('income_records')) localStorage.setItem('income_records',JSON.stringify(sample));
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
   // Load income master data from localStorage
   const masterDataStr=localStorage.getItem('income_master_data');
   const masterData=masterDataStr?JSON.parse(masterDataStr):{};
   
   // Mapping: form field ID -> master data sheet name -> fallback field names
   const fieldMapping={
    'cat':{sheets:['Income_Category'],fallback:['cat']},
    'tag':{sheets:['Income_Ac_Tag'],fallback:['tag']},
    'cur':{sheets:['Currency'],fallback:['cur']},
    'mode':{sheets:['Income_Mode'],fallback:['mode']},
    'holder':{sheets:['Income_Holder'],fallback:['holder']},
    'freq':{sheets:['Frequency'],fallback:['freq']}
   };
   
   // Populate filter dropdowns from existing records (for backwards compatibility)
   const all=getData();
   const uniq=k=>[...new Set(all.map(x=>x[k]))];
   uniq('cat').forEach(v=>fCategory.innerHTML+=`<option>${v}</option>`);
   uniq('tag').forEach(v=>fTag.innerHTML+=`<option>${v}</option>`);
   uniq('holder').forEach(v=>fHolder.innerHTML+=`<option>${v}</option>`);
   
   // Populate modal form dropdowns from master data
   Object.entries(fieldMapping).forEach(([formId,config])=>{
    const select=form[formId];
    if(!select)return;
    
    // Clear existing options
    select.innerHTML='';
    
    // Try to load from master data
    let values=[];
    for(const sheetName of config.sheets){
     if(masterData[sheetName]&&Array.isArray(masterData[sheetName])){
      values=masterData[sheetName].filter(v=>v&&v!=='');
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

 // Column resize with persistent storage
 let startX,startW,th;
 const STORAGE_KEY = 'income_column_widths';
 
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
      row.desc,
      row.cat,
      row.tag,
      row.cur,
      Number(row.amt).toFixed(2),
      row.mode,
      row.holder,
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
 
 } catch (error) {
   console.error('PDF generation error:', error);
   alert('Error generating PDF: ' + error.message + '. Please try again.');
 }
};

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

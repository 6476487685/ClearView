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
 const filters=document.querySelectorAll('#fCategory,#fTag,#fHolder,#fStatus,#fFrom,#fTo,#globalSearch');
 const clearBtn=document.getElementById('btnClear');
 let editIndex=null;

 const sample=[
  {desc:'Office Rent',cat:'Rent',tag:'CAD-Brightlight',cur:'CAD',amt:1200,mode:'Bank',holder:'Amit',due:'2025-02-01',paid:'2025-02-01',freq:'Monthly',acstatus:'Active',txnstatus:'Paid'},
  {desc:'Team Lunch',cat:'Meals',tag:'INR-Personal',cur:'INR',amt:2000,mode:'Cash',holder:'Rashmi',due:'2025-05-05',paid:'',freq:'One-Time',acstatus:'Active',txnstatus:'Unpaid'},
  {desc:'Software Subscription',cat:'Software',tag:'USD-Business',cur:'USD',amt:49,mode:'Credit Card',holder:'Amit',due:'2025-01-10',paid:'2025-01-09',freq:'Yearly',acstatus:'Active',txnstatus:'Paid'}
 ];
 if(!localStorage.getItem('expense_records')) localStorage.setItem('expense_records',JSON.stringify(sample));
 const getData=()=>JSON.parse(localStorage.getItem('expense_records'))||[];
 const saveData=d=>localStorage.setItem('expense_records',JSON.stringify(d));

 function renderTable(d){
  tbody.innerHTML='';
  d.forEach((r,i)=>{
   const tr=document.createElement('tr');
   tr.innerHTML=`<td>${i+1}</td><td>${r.desc}</td><td>${r.cat}</td><td>${r.tag}</td>
   <td>${r.cur}</td><td>${Number(r.amt).toFixed(2)}</td><td>${r.mode}</td><td>${r.holder}</td>
   <td>${r.due}</td><td>${r.paid}</td><td>${r.freq}</td><td>${r.acstatus}</td><td>${r.txnstatus}</td>
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

 // Save
 form.onsubmit=e=>{
  e.preventDefault();
  const rec={desc:form.desc.value,cat:form.cat.value,tag:form.tag.value,cur:form.cur.value,amt:parseFloat(form.amt.value||0).toFixed(2),
   mode:form.mode.value,holder:form.holder.value,due:form.due.value,paid:form.paid.value,freq:form.freq.value,acstatus:form.acstatus.value,txnstatus:form.txnstatus.value};
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
  if(from)d=d.filter(x=>(!x.paid||x.paid>=from||x.due>=from));
  if(to)d=d.filter(x=>(!x.paid||x.paid<=to||x.due<=to));
  if(txt)d=d.filter(x=>Object.values(x).join(' ').toLowerCase().includes(txt));
  renderTable(d);
 }
 filters.forEach(el=>el.oninput=applyFilters);
 clearBtn.onclick=()=>{filters.forEach(el=>el.value='');renderTable(getData());};

 // Dropdown populate
 const all=getData();
 const uniq=k=>[...new Set(all.map(x=>x[k]))];
 uniq('cat').forEach(v=>fCategory.innerHTML+=`<option>${v}</option>`);
 uniq('tag').forEach(v=>fTag.innerHTML+=`<option>${v}</option>`);
 uniq('holder').forEach(v=>fHolder.innerHTML+=`<option>${v}</option>`);
 ['cat','tag','cur','mode','holder','freq'].forEach(k=>{
  const s=form[k];uniq(k).forEach(v=>s.innerHTML+=`<option>${v}</option>`);
 });

 // Column resize
 let startX,startW,th;
 table.querySelectorAll('th.resizable').forEach(h=>{
  h.addEventListener('mousedown',e=>{
   if(e.offsetX>h.offsetWidth-6){
    startX=e.pageX;startW=h.offsetWidth;th=h;document.body.style.userSelect='none';
    document.addEventListener('mousemove',resize);document.addEventListener('mouseup',stop);
   }
  });
 });
 function resize(e){if(!th)return;const diff=e.pageX-startX;th.style.width=(startW+diff)+'px';}
 function stop(){document.removeEventListener('mousemove',resize);document.removeEventListener('mouseup',stop);document.body.style.userSelect='auto';th=null;}

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
 const data = getData();
 
 // Create PDF using jsPDF
 const { jsPDF } = window.jspdf;
 const doc = new jsPDF('l', 'mm', 'a4'); // landscape, millimeters, A4
 
 // Set font
 doc.setFont('helvetica');
 
 // Title
 doc.setFontSize(16);
 doc.setFont('helvetica', 'bold');
 doc.text('Expense Filtered Report', 105, 20, { align: 'center' });
 
 // Date and total records
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 35);
 doc.text(`Total Records: ${data.length}`, 20, 42);
 
 // Table headers
 const headers = ['#', 'Description', 'Category', 'Tag', 'Cur', 'Amount', 'Mode', 'Holder', 'Due Date', 'Paid Date', 'Freq', 'Ac Status', 'Txn Status'];
 const colWidths = [8, 25, 18, 20, 8, 12, 15, 12, 15, 15, 12, 12, 12];
 const startY = 55;
 let currentY = startY;
 
 // Header row
 doc.setFontSize(8);
 doc.setFont('helvetica', 'bold');
 let x = 20;
 headers.forEach((header, i) => {
   doc.text(header, x, currentY);
   x += colWidths[i];
 });
 
 // Header line
 currentY += 3;
 doc.line(20, currentY, x, currentY);
 
 // Data rows
 doc.setFont('helvetica', 'normal');
 currentY += 7;
 
 data.forEach((row, index) => {
   // Check if we need a new page
   if (currentY > 280) {
     doc.addPage();
     currentY = 20;
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
     row.due,
     row.paid,
     row.freq,
     row.acstatus,
     row.txnstatus
   ];
   
   x = 20;
   rowData.forEach((cell, i) => {
     // Truncate long text
     let cellText = cell.toString();
     if (cellText.length > 15 && i !== 0) { // Don't truncate description
       cellText = cellText.substring(0, 12) + '...';
     }
     doc.text(cellText, x, currentY);
     x += colWidths[i];
   });
   
   currentY += 6;
 });
 
 // Download the PDF
 doc.save(generateFilename('pdf'));
};
});

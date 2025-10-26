document.addEventListener("DOMContentLoaded",()=>{
 const table=document.getElementById('taskTable');
 const tbody=document.getElementById('taskBody');
 const form=document.getElementById('taskForm');
 const modal=document.getElementById('taskModal');
 const addBtn=document.getElementById('btnAdd');
 const cancelBtn=document.getElementById('cancelBtn');
 const title=document.getElementById('modalTitle');
 const btnPDF=document.getElementById('btnPDF');
 const btnExcel=document.getElementById('btnExcel');
 const filters=document.querySelectorAll('#fCategory,#fTag,#fAssignee,#fStatus,#fPriority,#fFrom,#fTo,#globalSearch');
 const clearBtn=document.getElementById('btnClear');
 let editIndex=null;

 const sample=[
  {desc:'Complete Project Documentation',cat:'Development',tag:'PROJ-001',assignee:'John Doe',priority:'High',due:'2025-02-15',completed:'',status:'In Progress'},
  {desc:'Review Code Changes',cat:'Development',tag:'CODE-002',assignee:'Jane Smith',priority:'Medium',due:'2025-02-10',completed:'2025-02-08',status:'Completed'},
  {desc:'Update User Manual',cat:'Documentation',tag:'DOC-003',assignee:'Mike Johnson',priority:'Low',due:'2025-02-20',completed:'',status:'Pending'},
  {desc:'Fix Critical Bug in Login System',cat:'Development',tag:'BUG-004',assignee:'Sarah Wilson',priority:'Critical',due:'2025-02-05',completed:'2025-02-03',status:'Completed'},
  {desc:'Design New Dashboard UI',cat:'Design',tag:'UI-005',assignee:'Alex Chen',priority:'High',due:'2025-02-18',completed:'',status:'In Progress'},
  {desc:'Write Unit Tests for API',cat:'Testing',tag:'TEST-006',assignee:'David Brown',priority:'Medium',due:'2025-02-25',completed:'',status:'Pending'},
  {desc:'Deploy Application to Production',cat:'DevOps',tag:'DEPLOY-007',assignee:'Lisa Garcia',priority:'High',due:'2025-02-12',completed:'',status:'Pending'},
  {desc:'Create Database Schema',cat:'Database',tag:'DB-008',assignee:'Robert Taylor',priority:'Medium',due:'2025-02-08',completed:'2025-02-06',status:'Completed'},
  {desc:'Setup CI/CD Pipeline',cat:'DevOps',tag:'CI-009',assignee:'Lisa Garcia',priority:'High',due:'2025-02-14',completed:'',status:'In Progress'},
  {desc:'Conduct Security Audit',cat:'Security',tag:'SEC-010',assignee:'Emma Davis',priority:'Critical',due:'2025-02-22',completed:'',status:'Pending'},
  {desc:'Optimize Database Performance',cat:'Database',tag:'DB-011',assignee:'Robert Taylor',priority:'Medium',due:'2025-02-28',completed:'',status:'Pending'},
  {desc:'Create User Training Materials',cat:'Documentation',tag:'TRAIN-012',assignee:'Mike Johnson',priority:'Low',due:'2025-03-05',completed:'',status:'Pending'},
  {desc:'Implement Payment Gateway',cat:'Development',tag:'PAY-013',assignee:'John Doe',priority:'High',due:'2025-02-16',completed:'',status:'In Progress'},
  {desc:'Setup Monitoring Dashboard',cat:'DevOps',tag:'MON-014',assignee:'Lisa Garcia',priority:'Medium',due:'2025-02-19',completed:'',status:'Pending'},
  {desc:'Refactor Legacy Code',cat:'Development',tag:'REF-015',assignee:'Jane Smith',priority:'Low',due:'2025-03-01',completed:'',status:'Cancelled'},
  {desc:'Create API Documentation',cat:'Documentation',tag:'API-016',assignee:'Mike Johnson',priority:'Medium',due:'2025-02-21',completed:'2025-02-19',status:'Completed'},
  {desc:'Implement Two-Factor Authentication',cat:'Security',tag:'2FA-017',assignee:'Emma Davis',priority:'High',due:'2025-02-17',completed:'',status:'In Progress'},
  {desc:'Setup Automated Testing',cat:'Testing',tag:'AUTO-018',assignee:'David Brown',priority:'Medium',due:'2025-02-26',completed:'',status:'Pending'},
  {desc:'Create Backup Strategy',cat:'DevOps',tag:'BACKUP-019',assignee:'Lisa Garcia',priority:'High',due:'2025-02-13',completed:'2025-02-11',status:'Completed'},
  {desc:'Design Mobile App Interface',cat:'Design',tag:'MOBILE-020',assignee:'Alex Chen',priority:'Medium',due:'2025-02-24',completed:'',status:'Pending'}
 ];
 if(!localStorage.getItem('task_records')) localStorage.setItem('task_records',JSON.stringify(sample));
 const getData=()=>JSON.parse(localStorage.getItem('task_records'))||[];
 const saveData=d=>localStorage.setItem('task_records',JSON.stringify(d));

 function renderTable(d){
  tbody.innerHTML='';
  d.forEach((r,i)=>{
   const tr=document.createElement('tr');
   tr.innerHTML=`<td>${i+1}</td><td>${r.desc}</td><td>${r.cat}</td><td>${r.tag}</td>
   <td>${r.status}</td><td>${r.assignee}</td><td>${r.priority}</td><td>${r.due}</td><td>${r.completed}</td>
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
  title.textContent="Edit Task";
  modal.style.display='flex';
 });

 addBtn.addEventListener('click',()=>{
  editIndex=null;form.reset();title.textContent="Add Task";modal.style.display='flex';
 });
 cancelBtn.addEventListener('click',()=>{modal.style.display='none';form.reset();editIndex=null;});

 form.addEventListener('submit',e=>{
  e.preventDefault();
  const d=getData();
  const newRecord={
   desc:form.desc.value,
   cat:form.cat.value,
   tag:form.tag.value,
   assignee:form.assignee.value,
   priority:form.priority.value,
   due:form.due.value,
   completed:form.completed.value,
   status:form.status.value
  };
  if(editIndex!==null){d[editIndex]=newRecord;}else{d.push(newRecord);}
  saveData(d);renderTable(d);modal.style.display='none';form.reset();editIndex=null;
 });

 // Populate dropdowns
 const fCategory=document.getElementById('fCategory');
 const fTag=document.getElementById('fTag');
 const fAssignee=document.getElementById('fAssignee');
 const fStatus=document.getElementById('fStatus');
 const fPriority=document.getElementById('fPriority');
 const all=getData();
 const uniq=k=>[...new Set(all.map(x=>x[k]))];
 uniq('cat').forEach(v=>fCategory.innerHTML+=`<option>${v}</option>`);
 uniq('tag').forEach(v=>fTag.innerHTML+=`<option>${v}</option>`);
 uniq('assignee').forEach(v=>fAssignee.innerHTML+=`<option>${v}</option>`);
 ['cat','tag','assignee','priority'].forEach(k=>{
  const s=form[k];uniq(k).forEach(v=>s.innerHTML+=`<option>${v}</option>`);
 });

 // Column resize with persistent storage
 let startX,startW,th;
 const STORAGE_KEY = 'task_column_widths';
 
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
  return `Task_Filter_Report_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
}

// Filter functionality
function applyFilters(){
 const data=getData();
 const filtered=data.filter(r=>{
  const categoryMatch=!fCategory.value||r.cat===fCategory.value;
  const tagMatch=!fTag.value||r.tag===fTag.value;
  const assigneeMatch=!fAssignee.value||r.assignee===fAssignee.value;
  const statusMatch=!fStatus.value||r.status===fStatus.value;
  const priorityMatch=!fPriority.value||r.priority===fPriority.value;
  const fromMatch=!fFrom.value||r.due>=fFrom.value;
  const toMatch=!fTo.value||r.due<=fTo.value;
  const searchMatch=!globalSearch.value||Object.values(r).some(v=>String(v).toLowerCase().includes(globalSearch.value.toLowerCase()));
  return categoryMatch&&tagMatch&&assigneeMatch&&statusMatch&&priorityMatch&&fromMatch&&toMatch&&searchMatch;
 });
 renderTable(filtered);
}

filters.forEach(f=>f.addEventListener('input',applyFilters));
clearBtn.addEventListener('click',()=>{
 filters.forEach(f=>f.value='');
 renderTable(getData());
});

// Excel Export
btnExcel.addEventListener('click',()=>{
 const data=getData();
 const ws=XLSX.utils.json_to_sheet(data.map((r,i)=>({
  '#':i+1,
  'Task Description':r.desc,
  'Category Task':r.cat,
  'Task Tag':r.tag,
  'Task Status':r.status,
  'Task Assignee':r.assignee,
  'Task Priority':r.priority,
  'Due Date':r.due,
  'Completed On':r.completed
 })));
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,'Tasks');
 XLSX.writeFile(wb,generateFilename('xlsx'));
});

// PDF Export
btnPDF.addEventListener('click',()=>{
 try {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Task Management Report', 14, 22);
  
  // Add generation date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Prepare data
  const data = getData();
  const headers = ['#', 'Task Description', 'Category', 'Tag', 'Status', 'Assignee', 'Priority', 'Due Date', 'Completed'];
  
  // Create table data
  const tableData = data.map((row, index) => [
    index + 1,
    row.desc,
    row.cat,
    row.tag,
    row.status,
    row.assignee,
    row.priority,
    row.due,
    row.completed
  ]);
  
  // Add table
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 133, 244] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
      8: { cellWidth: 20 }
    }
  });
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }
  
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

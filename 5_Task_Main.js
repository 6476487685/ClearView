// Test if JavaScript is loading
alert('Task Manager JavaScript is loading...');

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
  {Task_Description:'Complete Project Documentation',Category_Task:'Development',Task_Tag:'PROJ-001',Task_Assignee:'John Doe',Task_Priority:'High',Due_Date:'2025-02-15',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
  {Task_Description:'Review Code Changes',Category_Task:'Development',Task_Tag:'CODE-002',Task_Assignee:'Jane Smith',Task_Priority:'Medium',Due_Date:'2025-02-10',Completed_On:'2025-02-08',Task_Status:'Completed',Task_Adhoc:'No'},
  {Task_Description:'Update User Manual',Category_Task:'Documentation',Task_Tag:'DOC-003',Task_Assignee:'Mike Johnson',Task_Priority:'Low',Due_Date:'2025-02-20',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Fix Critical Bug in Login System',Category_Task:'Development',Task_Tag:'BUG-004',Task_Assignee:'Sarah Wilson',Task_Priority:'Critical',Due_Date:'2025-02-05',Completed_On:'2025-02-03',Task_Status:'Completed',Task_Adhoc:'No'},
  {Task_Description:'Design New Dashboard UI',Category_Task:'Design',Task_Tag:'UI-005',Task_Assignee:'Alex Chen',Task_Priority:'High',Due_Date:'2025-02-18',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
  {Task_Description:'Write Unit Tests for API',Category_Task:'Testing',Task_Tag:'TEST-006',Task_Assignee:'David Brown',Task_Priority:'Medium',Due_Date:'2025-02-25',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Deploy Application to Production',Category_Task:'DevOps',Task_Tag:'DEPLOY-007',Task_Assignee:'Lisa Garcia',Task_Priority:'High',Due_Date:'2025-02-12',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Create Database Schema',Category_Task:'Database',Task_Tag:'DB-008',Task_Assignee:'Robert Taylor',Task_Priority:'Medium',Due_Date:'2025-02-08',Completed_On:'2025-02-06',Task_Status:'Completed',Task_Adhoc:'No'},
  {Task_Description:'Setup CI/CD Pipeline',Category_Task:'DevOps',Task_Tag:'CI-009',Task_Assignee:'Lisa Garcia',Task_Priority:'High',Due_Date:'2025-02-14',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
  {Task_Description:'Conduct Security Audit',Category_Task:'Security',Task_Tag:'SEC-010',Task_Assignee:'Emma Davis',Task_Priority:'Critical',Due_Date:'2025-02-22',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Optimize Database Performance',Category_Task:'Database',Task_Tag:'DB-011',Task_Assignee:'Robert Taylor',Task_Priority:'Medium',Due_Date:'2025-02-28',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Create User Training Materials',Category_Task:'Documentation',Task_Tag:'TRAIN-012',Task_Assignee:'Mike Johnson',Task_Priority:'Low',Due_Date:'2025-03-05',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Implement Payment Gateway',Category_Task:'Development',Task_Tag:'PAY-013',Task_Assignee:'John Doe',Task_Priority:'High',Due_Date:'2025-02-16',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
  {Task_Description:'Setup Monitoring Dashboard',Category_Task:'DevOps',Task_Tag:'MON-014',Task_Assignee:'Lisa Garcia',Task_Priority:'Medium',Due_Date:'2025-02-19',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Refactor Legacy Code',Category_Task:'Development',Task_Tag:'REF-015',Task_Assignee:'Jane Smith',Task_Priority:'Low',Due_Date:'2025-03-01',Completed_On:'',Task_Status:'Cancelled',Task_Adhoc:'No'},
  {Task_Description:'Create API Documentation',Category_Task:'Documentation',Task_Tag:'API-016',Task_Assignee:'Mike Johnson',Task_Priority:'Medium',Due_Date:'2025-02-21',Completed_On:'2025-02-19',Task_Status:'Completed',Task_Adhoc:'No'},
  {Task_Description:'Implement Two-Factor Authentication',Category_Task:'Security',Task_Tag:'2FA-017',Task_Assignee:'Emma Davis',Task_Priority:'High',Due_Date:'2025-02-17',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
  {Task_Description:'Setup Automated Testing',Category_Task:'Testing',Task_Tag:'AUTO-018',Task_Assignee:'David Brown',Task_Priority:'Medium',Due_Date:'2025-02-26',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
  {Task_Description:'Create Backup Strategy',Category_Task:'DevOps',Task_Tag:'BACKUP-019',Task_Assignee:'Lisa Garcia',Task_Priority:'High',Due_Date:'2025-02-13',Completed_On:'2025-02-11',Task_Status:'Completed',Task_Adhoc:'No'},
  {Task_Description:'Design Mobile App Interface',Category_Task:'Design',Task_Tag:'MOBILE-020',Task_Assignee:'Alex Chen',Task_Priority:'Medium',Due_Date:'2025-02-24',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'}
 ];
 
 // Set sample data
 localStorage.setItem('task_records', JSON.stringify(sample));
 
 const getData=()=>JSON.parse(localStorage.getItem('task_records'))||[];
 const saveData=d=>localStorage.setItem('task_records',JSON.stringify(d));

 // Migration function to convert old field names to new ones
 function migrateData(data){
  if(!data||data.length===0)return[];
  // Check if data needs migration
  const needsMigration=data.some(r=>r.desc!==undefined);
  if(!needsMigration)return data;
  return data.map(r=>({
   Task_Description:r.desc||r.Task_Description||'',
   Category_Task:r.cat||r.Category_Task||'',
   Task_Tag:r.tag||r.Task_Tag||'',
   Task_Assignee:r.assignee||r.Task_Assignee||'',
   Task_Priority:r.priority||r.Task_Priority||'',
   Due_Date:r.due||r.Due_Date||'',
   Completed_On:r.completed||r.Completed_On||'',
   Task_Status:r.status||r.Task_Status||'',
   Task_Adhoc:r.Task_Adhoc||'No'
  }));
 }

 function renderTable(d){
  if (!tbody) {
    console.error('tbody element not found!');
    return;
  }
  
  tbody.innerHTML='';
  d.forEach((r,i)=>{
   const tr=document.createElement('tr');
   tr.innerHTML=`<td>${i+1}</td><td>${r.Task_Description}</td><td>${r.Category_Task}</td><td>${r.Task_Tag}</td>
   <td>${r.Task_Status}</td><td>${r.Task_Assignee}</td><td>${r.Task_Priority}</td><td>${r.Due_Date}</td><td>${r.Completed_On}</td>
   <td><span class='del' title='Delete'>🗑️</span></td>`;
   tbody.appendChild(tr);
  });
 }
 
 const rawData=getData();
 const migratedData=migrateData(rawData);
 if(migratedData!==rawData){
  saveData(migratedData);
 }
 renderTable(migratedData);
 
 // Debug: Check if data is loaded
 const data = migratedData;
 if (data.length === 0) {
   alert('No data found! Check console for errors.');
 } else {
   console.log('Data loaded successfully:', data.length, 'tasks');
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
  title.textContent="Edit Task";
  modal.style.display='flex';
 });

 addBtn.addEventListener('click',()=>{
  editIndex=null;
  form.reset();
  populateModalDropdowns(); // Refresh dropdowns with latest master data
  title.textContent="Add Task";
  modal.style.display='flex';
 });
 cancelBtn.addEventListener('click',()=>{modal.style.display='none';form.reset();editIndex=null;});

 form.addEventListener('submit',e=>{
  e.preventDefault();
  const d=getData();
  const newRecord={
   Task_Description:form.desc.value,
   Category_Task:form.cat.value,
   Task_Tag:form.tag.value,
   Task_Assignee:form.assignee.value,
   Task_Priority:form.priority.value,
   Due_Date:form.due.value,
   Completed_On:form.completed.value,
   Task_Status:form.status.value,
   Task_Adhoc:form.adhoc&&form.adhoc.value||'No'
  };
  if(editIndex!==null){d[editIndex]=newRecord;}else{d.push(newRecord);}
  saveData(d);renderTable(d);modal.style.display='none';form.reset();editIndex=null;
 });

// Function to populate modal dropdowns from Excel master data
function populateModalDropdowns(){
 try{
  // Load unified master data from localStorage
  const unifiedDataStr=localStorage.getItem('unified_master_data');
  let masterData={};
  if(unifiedDataStr){
   const unifiedData=JSON.parse(unifiedDataStr);
   masterData=unifiedData.task||{};
  }else{
   // Fallback to legacy format
   const masterDataStr=localStorage.getItem('task_master_data');
   masterData=masterDataStr?JSON.parse(masterDataStr):{};
  }
  
  // Mapping: form field ID -> master data sheet name -> database field name
  const fieldMapping={
   'cat':{sheets:['Task_Category','Category_Task'],dbField:'Category_Task'},
   'tag':{sheets:['Task_Tag'],dbField:'Task_Tag'},
   'assignee':{sheets:['Task_Assignee'],dbField:'Task_Assignee'},
   'priority':{sheets:['Task_Priority'],dbField:'Task_Priority'},
   'status':{sheets:['Task_Status'],dbField:'Task_Status'}
  };
  
  // Populate filter dropdowns from existing records (for backwards compatibility)
  const all=getData();
  const uniq=k=>[...new Set(all.map(x=>x[k]))];
  if(fCategory)fCategory.innerHTML='<option value="">All</option>';
  if(fTag)fTag.innerHTML='<option value="">All</option>';
  if(fAssignee)fAssignee.innerHTML='<option value="">All</option>';
  if(fStatus)fStatus.innerHTML='<option value="">All</option>';
  if(fPriority)fPriority.innerHTML='<option value="">All</option>';
  uniq('Category_Task').forEach(v=>{
   if(fCategory)fCategory.innerHTML+=`<option>${v}</option>`;
  });
  uniq('Task_Tag').forEach(v=>{
   if(fTag)fTag.innerHTML+=`<option>${v}</option>`;
  });
  uniq('Task_Assignee').forEach(v=>{
   if(fAssignee)fAssignee.innerHTML+=`<option>${v}</option>`;
  });
  uniq('Task_Status').forEach(v=>{
   if(fStatus)fStatus.innerHTML+=`<option>${v}</option>`;
  });
  uniq('Task_Priority').forEach(v=>{
   if(fPriority)fPriority.innerHTML+=`<option>${v}</option>`;
  });
  
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
    const dbField=config.dbField;
    const valueSet=new Set();
    all.forEach(x=>{
     const val=x[dbField];
     if(val&&val!=='')valueSet.add(val);
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
  ['cat','tag','assignee','priority'].forEach(k=>{
   const s=form[k];
   if(s){
    s.innerHTML='';
    const map={cat:'Category_Task',tag:'Task_Tag',assignee:'Task_Assignee',priority:'Task_Priority'};
    const field=map[k]||k;
    uniq(field).forEach(v=>s.innerHTML+=`<option>${v}</option>`);
   }
  });
 }
}

// Get filter elements
const fCategory=document.getElementById('fCategory');
const fTag=document.getElementById('fTag');
const fAssignee=document.getElementById('fAssignee');
const fStatus=document.getElementById('fStatus');
const fPriority=document.getElementById('fPriority');

// Populate dropdowns on page load
populateModalDropdowns();

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
 const rawData=getData();
 const data=migrateData(rawData);
 const filtered=data.filter(r=>{
  const categoryMatch=!fCategory.value||r.Category_Task===fCategory.value;
  const tagMatch=!fTag.value||r.Task_Tag===fTag.value;
  const assigneeMatch=!fAssignee.value||r.Task_Assignee===fAssignee.value;
  const statusMatch=!fStatus.value||r.Task_Status===fStatus.value;
  const priorityMatch=!fPriority.value||r.Task_Priority===fPriority.value;
  const fromMatch=!fFrom.value||r.Due_Date>=fFrom.value;
  const toMatch=!fTo.value||r.Due_Date<=fTo.value;
  const searchMatch=!globalSearch.value||Object.values(r).some(v=>String(v).toLowerCase().includes(globalSearch.value.toLowerCase()));
  return categoryMatch&&tagMatch&&assigneeMatch&&statusMatch&&priorityMatch&&fromMatch&&toMatch&&searchMatch;
 });
 renderTable(filtered);
}

filters.forEach(f=>f.addEventListener('input',applyFilters));
clearBtn.addEventListener('click',()=>{
 filters.forEach(f=>f.value='');
 const rawData=getData();
 const migratedData=migrateData(rawData);
 renderTable(migratedData);
});

// Excel Export
btnExcel.addEventListener('click',()=>{
 const rawData=getData();
 const data=migrateData(rawData);
 const ws=XLSX.utils.json_to_sheet(data.map((r,i)=>({
  '#':i+1,
  'Task Description':r.Task_Description,
  'Category Task':r.Category_Task,
  'Task Tag':r.Task_Tag,
  'Task Status':r.Task_Status,
  'Task Assignee':r.Task_Assignee,
  'Task Priority':r.Task_Priority,
  'Due Date':r.Due_Date,
  'Completed On':r.Completed_On
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
  const rawData = getData();
  const data = migrateData(rawData);
  const headers = ['#', 'Task Description', 'Category', 'Tag', 'Status', 'Assignee', 'Priority', 'Due Date', 'Completed'];
  
  // Create table data
  const tableData = data.map((row, index) => [
    index + 1,
    row.Task_Description,
    row.Category_Task,
    row.Task_Tag,
    row.Task_Status,
    row.Task_Assignee,
    row.Task_Priority,
    row.Due_Date,
    row.Completed_On
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

// Global function to load sample data (outside DOMContentLoaded)
window.loadSampleData = function() {
  const sample = [
    {Task_Description:'Complete Project Documentation',Category_Task:'Development',Task_Tag:'PROJ-001',Task_Assignee:'John Doe',Task_Priority:'High',Due_Date:'2025-02-15',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
    {Task_Description:'Review Code Changes',Category_Task:'Development',Task_Tag:'CODE-002',Task_Assignee:'Jane Smith',Task_Priority:'Medium',Due_Date:'2025-02-10',Completed_On:'2025-02-08',Task_Status:'Completed',Task_Adhoc:'No'},
    {Task_Description:'Update User Manual',Category_Task:'Documentation',Task_Tag:'DOC-003',Task_Assignee:'Mike Johnson',Task_Priority:'Low',Due_Date:'2025-02-20',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Fix Critical Bug in Login System',Category_Task:'Development',Task_Tag:'BUG-004',Task_Assignee:'Sarah Wilson',Task_Priority:'Critical',Due_Date:'2025-02-05',Completed_On:'2025-02-03',Task_Status:'Completed',Task_Adhoc:'No'},
    {Task_Description:'Design New Dashboard UI',Category_Task:'Design',Task_Tag:'UI-005',Task_Assignee:'Alex Chen',Task_Priority:'High',Due_Date:'2025-02-18',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
    {Task_Description:'Write Unit Tests for API',Category_Task:'Testing',Task_Tag:'TEST-006',Task_Assignee:'David Brown',Task_Priority:'Medium',Due_Date:'2025-02-25',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Deploy Application to Production',Category_Task:'DevOps',Task_Tag:'DEPLOY-007',Task_Assignee:'Lisa Garcia',Task_Priority:'High',Due_Date:'2025-02-12',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Create Database Schema',Category_Task:'Database',Task_Tag:'DB-008',Task_Assignee:'Robert Taylor',Task_Priority:'Medium',Due_Date:'2025-02-08',Completed_On:'2025-02-06',Task_Status:'Completed',Task_Adhoc:'No'},
    {Task_Description:'Setup CI/CD Pipeline',Category_Task:'DevOps',Task_Tag:'CI-009',Task_Assignee:'Lisa Garcia',Task_Priority:'High',Due_Date:'2025-02-14',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
    {Task_Description:'Conduct Security Audit',Category_Task:'Security',Task_Tag:'SEC-010',Task_Assignee:'Emma Davis',Task_Priority:'Critical',Due_Date:'2025-02-22',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Optimize Database Performance',Category_Task:'Database',Task_Tag:'DB-011',Task_Assignee:'Robert Taylor',Task_Priority:'Medium',Due_Date:'2025-02-28',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Create User Training Materials',Category_Task:'Documentation',Task_Tag:'TRAIN-012',Task_Assignee:'Mike Johnson',Task_Priority:'Low',Due_Date:'2025-03-05',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Implement Payment Gateway',Category_Task:'Development',Task_Tag:'PAY-013',Task_Assignee:'John Doe',Task_Priority:'High',Due_Date:'2025-02-16',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
    {Task_Description:'Setup Monitoring Dashboard',Category_Task:'DevOps',Task_Tag:'MON-014',Task_Assignee:'Lisa Garcia',Task_Priority:'Medium',Due_Date:'2025-02-19',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Refactor Legacy Code',Category_Task:'Development',Task_Tag:'REF-015',Task_Assignee:'Jane Smith',Task_Priority:'Low',Due_Date:'2025-03-01',Completed_On:'',Task_Status:'Cancelled',Task_Adhoc:'No'},
    {Task_Description:'Create API Documentation',Category_Task:'Documentation',Task_Tag:'API-016',Task_Assignee:'Mike Johnson',Task_Priority:'Medium',Due_Date:'2025-02-21',Completed_On:'2025-02-19',Task_Status:'Completed',Task_Adhoc:'No'},
    {Task_Description:'Implement Two-Factor Authentication',Category_Task:'Security',Task_Tag:'2FA-017',Task_Assignee:'Emma Davis',Task_Priority:'High',Due_Date:'2025-02-17',Completed_On:'',Task_Status:'In Progress',Task_Adhoc:'No'},
    {Task_Description:'Setup Automated Testing',Category_Task:'Testing',Task_Tag:'AUTO-018',Task_Assignee:'David Brown',Task_Priority:'Medium',Due_Date:'2025-02-26',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'},
    {Task_Description:'Create Backup Strategy',Category_Task:'DevOps',Task_Tag:'BACKUP-019',Task_Assignee:'Lisa Garcia',Task_Priority:'High',Due_Date:'2025-02-13',Completed_On:'2025-02-11',Task_Status:'Completed',Task_Adhoc:'No'},
    {Task_Description:'Design Mobile App Interface',Category_Task:'Design',Task_Tag:'MOBILE-020',Task_Assignee:'Alex Chen',Task_Priority:'Medium',Due_Date:'2025-02-24',Completed_On:'',Task_Status:'Pending',Task_Adhoc:'No'}
  ];
  
  localStorage.setItem('task_records', JSON.stringify(sample));
  
  // Get the tbody element and render the data
  const tbody = document.getElementById('taskBody');
  if (tbody) {
    tbody.innerHTML = '';
    sample.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${r.Task_Description}</td><td>${r.Category_Task}</td><td>${r.Task_Tag}</td>
      <td>${r.Task_Status}</td><td>${r.Task_Assignee}</td><td>${r.Task_Priority}</td><td>${r.Due_Date}</td><td>${r.Completed_On}</td>
      <td><span class='del' title='Delete'>🗑️</span></td>`;
      tbody.appendChild(tr);
    });
    alert('Sample data loaded! You should see 20 tasks now.');
  } else {
    alert('Error: Could not find table body element');
  }
};

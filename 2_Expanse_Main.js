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

 // Exports
 btnExcel.onclick=()=>{
  const blob=new Blob([JSON.stringify(getData(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`TaskMgr_Filter_Report_${new Date().toISOString().replace(/[:.]/g,'-')}.xlsx`;a.click();
 };
 btnPDF.onclick=()=>{
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>Expense Filtered Report</title></head><body style='font-family:Arial;font-size:10pt;'>`);
  win.document.write(`<h2 style='text-align:center;font-weight:bold;'>Expense Filtered Report</h2>`);
  win.document.write(`<table border='1' cellspacing='0' cellpadding='4' width='100%'>${document.querySelector('#expenseTable').innerHTML}</table>`);
  win.document.write(`<div style='margin-top:10px;display:flex;justify-content:space-between;font-size:10pt;'>
  <span>Page 1 of 1</span><span>${new Date().toLocaleString()}</span></div></body></html>`);
  win.document.close();win.print();win.close();
 };
});

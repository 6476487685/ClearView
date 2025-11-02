document.addEventListener("DOMContentLoaded", function() {
  // Toast notification function
  function showToast(message){
    // Remove any existing toast
    const existingToast=document.querySelector('.toast-notification');
    if(existingToast){
      existingToast.remove();
    }
    
    const toast=document.createElement('div');
    toast.className='toast-notification';
    toast.style.cssText=`
      position:fixed;top:20px;right:20px;background:var(--success);color:#fff;
      padding:12px 20px;border-radius:6px;box-shadow:var(--shadow);
      z-index:10000;font-weight:600;font-size:14px;opacity:0;
      transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);transform:translateX(100%);
      border:1px solid rgba(255,255,255,0.2);
      backdrop-filter:blur(10px);
    `;
    toast.innerHTML=message;
    document.body.appendChild(toast);
    
    // Force reflow to ensure initial styles are applied
    toast.offsetHeight;
    
    // Show toast
    setTimeout(()=>{
      toast.style.opacity='1';
      toast.style.transform='translateX(0)';
    },100);
    
    // Hide toast after 3 seconds
    setTimeout(()=>{
      toast.style.opacity='0';
      toast.style.transform='translateX(100%)';
      setTimeout(()=>{
        if(document.body.contains(toast)){
          document.body.removeChild(toast);
        }
      },300);
    },3000);
  }

  const docUpload=document.getElementById('docUpload');
  const docsTbody=document.getElementById('docsTbody');
  const uploadArea=document.getElementById('uploadArea');
  const uploadBtn=document.getElementById('uploadBtn');
  const docStats=document.getElementById('docStats');
  let docs=JSON.parse(localStorage.getItem('docsList')||'[]');
  let isFilePickerOpen = false;

  // Initialize
  renderDocs();
  updateStats();

  // Change Documents folder button and Download All button
  const changeDocsFolderBtn = document.getElementById('changeDocsFolderBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  
  if(changeDocsFolderBtn) {
    changeDocsFolderBtn.addEventListener('click', function() {
      showDocumentsFolderSetup();
    });
  }
  
  if(downloadAllBtn) {
    downloadAllBtn.addEventListener('click', function() {
      downloadAllDocuments();
    });
  }

  // Upload button click - ONLY way to open file picker
  if(uploadBtn.onclick){
    uploadBtn.onclick = null;
  }
  uploadBtn.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    
    if(isFilePickerOpen){
      console.log('File picker already open - ignoring click');
      return;
    }
    
    console.log('Upload button clicked - opening file picker ONCE');
    isFilePickerOpen = true;
    docUpload.click();
    
    // Reset flag after a short delay
    setTimeout(() => {
      isFilePickerOpen = false;
    }, 1000);
  };

  // File input change
  docUpload.addEventListener('change',handleFileUpload);

  // Drag and drop functionality
  uploadArea.addEventListener('dragover',e=>{
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave',()=>{
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop',e=>{
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files=e.dataTransfer.files;
    handleFiles(files);
  });

  function handleFileUpload(e){
    const files=e.target.files;
    isFilePickerOpen = false; // Reset flag when files are selected
    
    console.log('File upload triggered, files selected:', files.length);
    
    if(files && files.length > 0){
      handleFiles(files);
    }
    
    // Clear the input AFTER processing to allow re-uploading same files
    setTimeout(() => {
      e.target.value = '';
    }, 100);
  }

  function handleFiles(files){
    let addedCount = 0;
    let skippedCount = 0;
    
    console.log('Processing files:', Array.from(files).map(f => f.name));
    
    Array.from(files).forEach(file=>{
      console.log('Processing file:', file.name);
      
      if(isValidFileType(file)){
        // Add file directly without duplicate checking
        console.log('Adding file:', file.name);
        const entry=createDocumentEntry(file);
        docs.push(entry);
        addedCount++;
      }else{
        console.log('Invalid file type:', file.name);
        alert(`File type not supported: ${file.name}`);
        skippedCount++;
      }
    });
    
    console.log('Final counts - Added:', addedCount, 'Skipped:', skippedCount);
    
    // Save and update UI
    if(addedCount > 0){
      localStorage.setItem('docsList',JSON.stringify(docs));
      renderDocs();
      updateStats();
      
      const folderPath = localStorage.getItem('docsFolderPath') || 'Documents';
      if(addedCount === 1){
        showToast(`<i class="fas fa-upload"></i> File uploaded successfully to ${folderPath}`);
      }else{
        showToast(`<i class="fas fa-upload"></i> ${addedCount} files uploaded successfully to ${folderPath}`);
      }
    }
    
    if(skippedCount > 0){
      setTimeout(() => {
        showToast(`<i class="fas fa-exclamation-triangle"></i> ${skippedCount} file(s) skipped due to unsupported format`);
      }, 1500);
    }
  }

  function isValidFileType(file){
    const validTypes=['.pdf','.doc','.docx','.xls','.xlsx','.txt','.jpg','.jpeg','.png','.gif'];
    return validTypes.some(type=>file.name.toLowerCase().endsWith(type));
  }

  function createDocumentEntry(file){
    const docsFolderPath = localStorage.getItem('docsFolderPath') || 'Documents';
    return {
      name:file.name,
      type:getFileType(file.name),
      size:formatFileSize(file.size),
      date:new Date().toLocaleString(),
      folderPath: docsFolderPath,
      id:Date.now()+Math.random()
    };
  }

  function getFileType(filename){
    const ext=filename.split('.').pop().toLowerCase();
    const typeMap={
      'pdf':'PDF Document',
      'doc':'Word Document',
      'docx':'Word Document',
      'xls':'Excel Spreadsheet',
      'xlsx':'Excel Spreadsheet',
      'txt':'Text File',
      'jpg':'JPEG Image',
      'jpeg':'JPEG Image',
      'png':'PNG Image',
      'gif':'GIF Image'
    };
    return typeMap[ext]||'Unknown';
  }

  function formatFileSize(bytes){
    if(bytes===0)return'0 B';
    const k=1024;
    const sizes=['B','KB','MB','GB'];
    const i=Math.floor(Math.log(bytes)/Math.log(k));
    return parseFloat((bytes/Math.pow(k,i)).toFixed(1))+' '+sizes[i];
  }

  function updateStats(){
    const count=docs.length;
    console.log('Updating stats - document count:', count);
    if(docStats){
      docStats.textContent=`${count} document${count!==1?'s':''}`;
      console.log('Stats updated to:', docStats.textContent);
    }else{
      console.error('docStats element not found');
    }
  }

  function renderDocs(){
    docsTbody.innerHTML='';
    if(docs.length===0){
      docsTbody.innerHTML=`<tr class="empty-state">
        <td colspan="5" class="empty-message">
          <div class="empty-icon"><i class="fas fa-folder-open"></i></div>
          <p>No documents yet. Upload your first document above!</p>
        </td>
      </tr>`;
      return;
    }
    
    docs.forEach((d,i)=>{
      const r=document.createElement('tr');
      r.draggable = true;
      r.dataset.index = i;
      r.innerHTML=`<td>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="file-icon">${getFileIcon(d.type)}</span>
          <span class="file-name-display" data-i="${i}" style="font-weight:500;cursor:pointer;" title="Click or double-click to rename">${d.name}</span>
        </div>
      </td>
      <td><span class="file-type">${d.type}</span></td>
      <td><span class="file-size">${d.size}</span></td>
      <td><span class="file-date">${d.date}</span></td>
      <td>
        <div class="doc-actions">
          <button class="doc-btn download" data-i="${i}" title="Download">
            <i class="fas fa-download"></i>
          </button>
          <button class="doc-btn move-up" data-i="${i}" title="Move Up" ${i === 0 ? 'disabled' : ''}>
            <i class="fas fa-arrow-up"></i>
          </button>
          <button class="doc-btn move-down" data-i="${i}" title="Move Down" ${i === docs.length - 1 ? 'disabled' : ''}>
            <i class="fas fa-arrow-down"></i>
          </button>
          <button class="doc-btn delete" data-i="${i}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>`;
      docsTbody.appendChild(r);
    });
    
    // Event listeners for action buttons
    docsTbody.querySelectorAll('.doc-btn').forEach(btn=>{
      btn.addEventListener('click',e=>{
        const i=parseInt(e.target.closest('.doc-btn').dataset.i);
        if(e.target.closest('.doc-btn').classList.contains('download')){
          downloadDocument(i);
        }else if(e.target.closest('.doc-btn').classList.contains('move-up')){
          moveFileUp(i);
        }else if(e.target.closest('.doc-btn').classList.contains('move-down')){
          moveFileDown(i);
        }else{
          deleteDocument(i);
        }
      });
    });
    
    // Event listeners for file name clicks and double-clicks
    docsTbody.querySelectorAll('.file-name-display').forEach(span=>{
      span.addEventListener('click',e=>{
        const i=parseInt(e.target.dataset.i);
        renameDocument(i);
      });
      
      // Add double-click event for direct editing
      span.addEventListener('dblclick',e=>{
        e.preventDefault();
        e.stopPropagation();
        const i=parseInt(e.target.dataset.i);
        renameDocument(i);
      });
    });
    
    // Drag and drop event listeners
    docsTbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('dragstart', handleDragStart);
      row.addEventListener('dragover', handleDragOver);
      row.addEventListener('drop', handleDrop);
      row.addEventListener('dragend', handleDragEnd);
    });
  }

  function getFileIcon(type){
    const iconMap={
      'PDF Document':'<i class="fas fa-file-pdf"></i>',
      'Word Document':'<i class="fas fa-file-word"></i>',
      'Excel Spreadsheet':'<i class="fas fa-file-excel"></i>',
      'Text File':'<i class="fas fa-file-alt"></i>',
      'JPEG Image':'<i class="fas fa-file-image"></i>',
      'PNG Image':'<i class="fas fa-file-image"></i>',
      'GIF Image':'<i class="fas fa-file-image"></i>'
    };
    return iconMap[type]||'<i class="fas fa-file"></i>';
  }

  async function downloadDocument(index){
    const doc=docs[index];
    const folderPath = doc.folderPath || 'Documents';
    const docsFolderPath = localStorage.getItem('docsFolderPath');
    const lastDocsFolder = localStorage.getItem('lastDocsFolder');
    
    showToast(`<i class="fas fa-download"></i> Downloading "${doc.name}" from ${folderPath}...`);
    
    try {
      // Create a blob with the file content
      const content = `This is a demo file: ${doc.name}\nType: ${doc.type}\nSize: ${doc.size}\nDate: ${doc.date}\nSource Folder: ${folderPath}\nDocuments Folder: ${docsFolderPath || 'Not set'}\n\nThis is a placeholder download. In a real application, this would contain the actual file content.`;
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Always download to default location without folder picker
      downloadToDefaultLocation(blob, doc.name, docsFolderPath);
      
    } catch (error) {
      console.error('Download error:', error);
      showToast(`<i class="fas fa-exclamation-triangle"></i> Download failed: "${doc.name}"`);
    }
  }

  function downloadToDefaultLocation(blob, fileName, docsFolderPath) {
    // Create filename with Documents folder path for easy identification
    const finalFileName = docsFolderPath ? `[${docsFolderPath}]_${fileName}` : fileName;
    
    // Silent download to default location
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show success message
    setTimeout(() => {
      const message = docsFolderPath 
        ? `<i class="fas fa-download"></i> Download completed: "${fileName}"<br><small>Please move to Documents folder: ${docsFolderPath}</small>`
        : `<i class="fas fa-download"></i> Download completed: "${fileName}"<br><small>Set Documents folder to auto-save downloads</small>`;
      showToast(message);
    }, 500);
  }

  async function downloadAllDocuments() {
    const docsFolderPath = localStorage.getItem('docsFolderPath');
    
    if(docs.length === 0) {
      showToast(`<i class="fas fa-exclamation-triangle"></i> No documents to download`);
      return;
    }
    
    showToast(`<i class="fas fa-download"></i> Downloading ${docs.length} documents...`);
    
    try {
      // Download all documents to default location
      downloadAllToDefaultLocation(docsFolderPath);
    } catch (error) {
      console.error('Error downloading all documents:', error);
      showToast(`<i class="fas fa-exclamation-triangle"></i> Download failed: ${error.message}`);
    }
  }

  function downloadAllToDefaultLocation(docsFolderPath) {
    let successCount = 0;
    let errorCount = 0;
    
    // Download each document with Documents folder path in the filename
    docs.forEach((doc, index) => {
      setTimeout(() => {
        try {
          // Create file content with Documents folder information
          const content = `This is a demo file: ${doc.name}\nType: ${doc.type}\nSize: ${doc.size}\nDate: ${doc.date}\nSource Folder: ${doc.folderPath || 'Documents'}\nDocuments Folder: ${docsFolderPath}\n\nThis is a placeholder download. In a real application, this would contain the actual file content.`;
          const blob = new Blob([content], { type: 'text/plain' });
          
          // Create filename with Documents folder path for easy identification
          const fileName = `[${docsFolderPath}]_${doc.name}`;
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          successCount++;
          
          // Update progress
          if(index % 3 === 0 || index === docs.length - 1) {
            showToast(`<i class="fas fa-download"></i> Downloaded ${index + 1}/${docs.length} documents...`);
          }
          
        } catch (error) {
          console.error(`Error downloading ${doc.name}:`, error);
          errorCount++;
        }
      }, index * 300); // Stagger downloads by 300ms
    });
    
    // Show final result after all downloads complete
    setTimeout(() => {
      if(errorCount === 0) {
        showToast(`<i class="fas fa-check-circle"></i> Downloaded all ${successCount} documents!<br><small>Please move to Documents folder: ${docsFolderPath}</small>`);
      } else {
        showToast(`<i class="fas fa-exclamation-triangle"></i> Downloaded ${successCount} documents, ${errorCount} failed<br><small>Please move to Documents folder: ${docsFolderPath}</small>`);
      }
    }, docs.length * 300 + 1000);
  }

  function renameDocument(index){
    const doc=docs[index];
    const span=document.querySelector(`.file-name-display[data-i="${index}"]`);
    if(!span) return;
    
    // Create input field
    const input=document.createElement('input');
    input.type='text';
    input.className='file-name-edit';
    input.value=doc.name;
    input.style.width='100%';
    
    // Replace span with input
    span.style.display='none';
    span.parentNode.insertBefore(input,span.nextSibling);
    input.focus();
    input.select();
    
    // Save on Enter or blur
    function saveRename(){
      const newName=input.value.trim();
      if(newName && newName!==doc.name){
        const oldName = doc.name;
        doc.name=newName;
        localStorage.setItem('docsList',JSON.stringify(docs));
        renderDocs();
        updateStats();
        showToast(`<i class="fas fa-edit"></i> File renamed from "${oldName}" to "${newName}"`);
      }else{
        span.style.display='inline';
        input.remove();
      }
    }
    
    // Cancel on Escape
    function cancelRename(){
      span.style.display='inline';
      input.remove();
    }
    
    input.addEventListener('blur',saveRename);
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        saveRename();
      }else if(e.key==='Escape'){
        e.preventDefault();
        cancelRename();
      }
    });
  }

  function moveFileUp(index){
    if(index > 0){
      // Swap with the file above
      const temp = docs[index];
      docs[index] = docs[index - 1];
      docs[index - 1] = temp;
      
      localStorage.setItem('docsList', JSON.stringify(docs));
      renderDocs();
      showToast(`<i class="fas fa-arrow-up"></i> File "${temp.name}" moved up`);
    }
  }

  function moveFileDown(index){
    if(index < docs.length - 1){
      // Swap with the file below
      const temp = docs[index];
      docs[index] = docs[index + 1];
      docs[index + 1] = temp;
      
      localStorage.setItem('docsList', JSON.stringify(docs));
      renderDocs();
      showToast(`<i class="fas fa-arrow-down"></i> File "${temp.name}" moved down`);
    }
  }

  // Drag and drop functions
  let draggedRow = null;

  function handleDragStart(e) {
    draggedRow = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
  }

  function handleDrop(e) {
    e.preventDefault();
    if (draggedRow !== this) {
      const fromIndex = parseInt(draggedRow.dataset.index);
      const toIndex = parseInt(this.dataset.index);
      
      // Move the item in the docs array
      const item = docs.splice(fromIndex, 1)[0];
      docs.splice(toIndex, 0, item);
      
      // Save and re-render
      localStorage.setItem('docsList', JSON.stringify(docs));
      renderDocs();
      showToast(`<i class="fas fa-exchange-alt"></i> File "${item.name}" moved to position ${toIndex + 1}`);
    }
    this.style.backgroundColor = '';
  }

  function handleDragEnd(e) {
    this.style.opacity = '';
    this.style.backgroundColor = '';
    draggedRow = null;
  }

  function deleteDocument(index){
    const fileName = docs[index].name;
    if(confirm(`Are you sure you want to delete "${fileName}"?`)){
      docs.splice(index,1);
      localStorage.setItem('docsList',JSON.stringify(docs));
      renderDocs();
      updateStats();
      showToast(`<i class="fas fa-trash"></i> File "${fileName}" deleted successfully`);
    }
  }

  function showDocumentsFolderSetup(){
    const overlay=document.createElement('div');
    overlay.style.cssText=`
      position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);
      display:flex;justify-content:center;align-items:center;z-index:10001;
      backdrop-filter:blur(8px);
    `;
    
    const modal=document.createElement('div');
    modal.style.cssText=`
      background:var(--surface);padding:32px;border-radius:20px;
      box-shadow:0 32px 64px rgba(0,0,0,0.2);max-width:420px;width:90%;
      border:1px solid var(--border);backdrop-filter:blur(15px);
      position:relative;
    `;
    
    modal.innerHTML=`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:56px;margin-bottom:12px;"><i class="fas fa-folder-open"></i></div>
        <h3 style="margin:0 0 8px 0;color:var(--text-primary);font-size:20px;font-weight:700;">Choose Documents Folder</h3>
        <p style="margin:0;color:var(--text-secondary);font-size:14px;line-height:1.5;">Select a folder where your documents will be saved</p>
      </div>
      
      <div style="margin-bottom:24px;">
        <label style="display:block;margin-bottom:12px;color:var(--text-primary);font-weight:600;font-size:15px;">Folder Name:</label>
        <input type="text" id="docsFolderNameInput" placeholder="Enter folder name (e.g., ClearView_Documents)" 
               style="width:calc(100% - 36px);padding:16px 18px;border:2px solid var(--border);border-radius:12px;
               font-size:15px;background:var(--surface);color:var(--text-primary);
               transition:all 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.08);
               margin-bottom:20px;outline:none;" />
        
        <button id="pasteDocsPathBtn" style="
          width:100%;padding:14px 18px;background:var(--accent);color:#fff;border:none;
          border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.3s ease;
          box-shadow:0 4px 12px rgba(66,133,244,0.3);font-size:15px;
          display:flex;align-items:center;justify-content:center;gap:10px;
          text-align:center;margin-bottom:16px;
        ">
          <i class="fas fa-clipboard" style="font-size:20px;"></i>
          <span>Paste Custom Path</span>
        </button>
        
        <div style="font-size:12px;color:var(--text-secondary);text-align:center;line-height:1.4;padding:12px;background:var(--bg);border-radius:8px;">
          <i class="fas fa-lightbulb"></i> <strong>Copy your Custom Folder Path using File Explorer and hit Paste Button</strong>
        </div>
      </div>
      
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="cancelDocsBtn" style="
          padding:14px 24px;background:var(--text-secondary);color:#fff;border:none;
          border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.3s ease;
          box-shadow:0 4px 12px rgba(107,114,128,0.2);font-size:15px;
          min-width:100px;
        ">Cancel</button>
        <button id="saveDocsBtn" style="
          padding:14px 24px;background:var(--success);color:#ffffff;border:none;
          border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.3s ease;
          box-shadow:0 4px 12px rgba(52,168,83,0.2);font-size:15px;
          min-width:100px;
        ">Save</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const folderInput=modal.querySelector('#docsFolderNameInput');
    const pasteBtn=modal.querySelector('#pasteDocsPathBtn');
    const cancelBtn=modal.querySelector('#cancelDocsBtn');
    const saveBtn=modal.querySelector('#saveDocsBtn');
    
    // Paste custom path
    pasteBtn.addEventListener('click',async ()=>{
      try{
        const text=await navigator.clipboard.readText();
        if(text.trim()){
          folderInput.value=text.trim();
          console.log('Pasted custom docs path:', text.trim());
          showToast('<i class="fas fa-clipboard"></i> Custom path pasted from clipboard');
        }else{
          alert('<i class="fas fa-clipboard"></i> CLIPBOARD EMPTY\n\nYour clipboard is empty.\n\nCopy a folder path and try again, or type a folder name manually.');
        }
      }catch(error){
        console.error('Error reading clipboard:', error);
        alert('<i class="fas fa-clipboard"></i> CLIPBOARD ACCESS DENIED\n\nUnable to access clipboard.\n\nPlease type the folder name or path manually.');
      }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click',()=>{
      document.body.removeChild(overlay);
    });
    
    // Save button
    saveBtn.addEventListener('click',()=>{
      const folderPath=folderInput.value.trim();
      console.log('Save docs button clicked, folder path:', folderPath);
      
      if(folderPath){
        localStorage.setItem('docsFolderPath',folderPath);
        console.log('Docs folder saved to localStorage:', folderPath);
        showToast('<i class="fas fa-folder-open"></i> Documents folder set successfully!');
        document.body.removeChild(overlay);
      }else{
        alert('Please enter a folder name.\n\nYou can:\n• Type a custom folder name\n• Use "Paste Custom Path" to paste a folder path from clipboard');
        folderInput.focus();
      }
    });
    
    // Close on overlay click
    overlay.addEventListener('click',(e)=>{
      if(e.target===overlay){
        document.body.removeChild(overlay);
      }
    });
    
    // Focus on input
    setTimeout(()=>folderInput.focus(),100);
  }

  // Theme functionality removed - using global theme from index.html
  // Apply saved theme from index.html
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
});


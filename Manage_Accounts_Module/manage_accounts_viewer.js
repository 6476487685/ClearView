let backend=null;
window.onload=function(){
  new QWebChannel(qt.webChannelTransport,ch=>{
    backend=ch.objects.backend;
    backend.updateFolders.connect(loadCategories);
    backend.updateFiles.connect(loadFiles);
    backend.showMessage.connect(alert);
    if(backend.get_root_path) backend.get_root_path(p=>window.root=p);
  });
};

function addFile(){
  const f=document.querySelector(".category.active")?.textContent;
  if(!f)return alert("Select folder first");
  backend.add_file(f);
}
function refreshFiles(){
  const f=document.querySelector(".category.active")?.textContent;
  if(f)backend.list_files(f);
}
function loadCategories(list){
  const c=document.getElementById("categories"); c.innerHTML="";
  list.forEach(n=>{
    const d=document.createElement("div"); d.className="category"; d.textContent=n;
    d.onclick=()=>{document.querySelectorAll(".category").forEach(x=>x.classList.remove("active"));
      d.classList.add("active"); backend.list_files(n);}
    c.appendChild(d);
  });
}
function loadFiles(files){
  const tb=document.querySelector("#fileTable tbody"); tb.innerHTML="";
  files.forEach(([n,t])=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${n}</td><td>${t}</td>
    <td><button onclick="preview('${n}','${t}')">Preview</button>
    <button onclick="renameFile('${n}')">Rename</button>
    <button onclick="deleteFile('${n}')">Delete</button></td>`;
    tb.appendChild(tr);
  });
  document.getElementById("previewContent").innerHTML="";
}

function preview(name,type){
  const folder=document.querySelector(".category.active")?.textContent;
  if(!folder)return;
  const fullPath=[window.root,folder,name].join("\\");
  const c=document.getElementById("previewContent");
  document.getElementById("previewTitle").innerText="Preview: "+name;
  c.innerHTML="Loading...";
  backend.read_file_binary(fullPath,async b64=>{
    if(!b64){c.innerHTML="Cannot load file.";return;}
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const blob=new Blob([bytes]);
    const url=URL.createObjectURL(blob);

    document.getElementById("btnOpen").onclick=()=>backend.open_file(fullPath);
    document.getElementById("btnDownload").onclick=()=>{
      const a=document.createElement("a"); a.href=url; a.download=name; a.click();
    };
    document.getElementById("btnPrint").onclick=()=>{
      const i=document.createElement("iframe");
      i.style.display="none"; i.src=url;
      document.body.appendChild(i);
      i.onload=()=>{i.contentWindow.print();document.body.removeChild(i);}
    };

    if(["PDF"].includes(type)){c.innerHTML=`<iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>`;return;}
    if(["JPG","JPEG","PNG","GIF"].includes(type)){c.innerHTML=`<img src="${url}" style="max-width:95%;">`;return;}
    if(["TXT","MD","JSON","CSV"].includes(type)){
      const t=new TextDecoder("utf-8").decode(bytes);
      c.innerHTML=`<pre style="text-align:left;white-space:pre-wrap">${t}</pre>`;return;
    }
    if(["DOCX"].includes(type)){
      try{
        const zip=await JSZip.loadAsync(blob);
        const xml=await zip.file("word/document.xml").async("text");
        const t=xml.replace(/<[^>]+>/g," ").replace(/\s+/g," ");
        c.innerHTML=`<pre style="text-align:left">${t.substring(0,3000)}${t.length>3000?"...":""}</pre>`;
        return;
      }catch{c.innerHTML="Cannot preview Word file.";}
    }
    if(["XLSX"].includes(type)){
      try{
        const zip=await JSZip.loadAsync(blob);
        const s=zip.file(/xl\/worksheets\/sheet1\.xml/)[0];
        if(!s)throw "";
        const x=await s.async("text");
        const rows=[...x.matchAll(/<row[^>]*>(.*?)<\/row>/g)].slice(0,10);
        let html="<table border='1' style='border-collapse:collapse;margin:auto'>";
        for(const r of rows){
          const cs=[...r[1].matchAll(/<v[^>]*>(.*?)<\/v>/g)].map(v=>v[1]);
          html+="<tr>"+cs.map(v=>`<td>${v}</td>`).join("")+"</tr>";
        }
        html+="</table>"; c.innerHTML=html;
        return;
      }catch{c.innerHTML="Cannot preview Excel file.";}
    }
    c.innerHTML="Preview not supported.";
  });
}
function renameFile(n){
  const f=document.querySelector(".category.active")?.textContent;
  const nn=prompt("Rename to:",n);
  if(nn)backend.rename_file(f,n,nn);
}
function deleteFile(n){
  const f=document.querySelector(".category.active")?.textContent;
  if(confirm("Delete "+n+"?"))backend.delete_file(f,n);
}

/* 10-ui-core.js – Khung giao diện: toast, modal, form, bộ lọc, bảng, biểu đồ, in/PDF/Excel */
'use strict';
(self.__mods=self.__mods||[]).push('10-ui-core');

/* =====================================================================
   KHUNG GIAO DIỆN
   ===================================================================== */
const ui={key:'',f:{},open:{},charts:[],cur:null};
const PAGES={},ACT={},SUB={};
let PAGE=null,S=null,T=null,IMP=null;
const F=()=>(ui.f[ui.key]??={});
const badge=(t,x)=>`<span class="bd ${t}">${esc(x)}</span>`;
const logoBlock=()=>typeof LOGO_DATA!=='undefined'?`<img class="lm-img" src="${LOGO_DATA}" alt="TTD Computer">`:'<div class="lm">📦</div>';
const PAL=['#e4570e','#0f1e33','#3b7dd8','#3f9a6b','#c9a227','#8a5bd1','#d6447a','#5f7387','#17a2b8','#9aa84a'];

const MENU=[
 {g:'dash',icon:'📊',label:'Dashboard',items:[['overview','Tổng quan'],['stock','Tồn kho'],['monthly','Nhập / Xuất theo tháng'],['alerts','Cảnh báo']]},
 {g:'wh',icon:'📦',label:'Kho',items:[['items','Danh sách hàng hóa'],['stock','Tồn kho'],['in','Nhập kho'],['out','Xuất kho'],['stocktake','Kiểm kê']]},
 {g:'it',icon:'💻',label:'IT Asset',items:[]},
 {g:'in',icon:'📥',label:'Nhập kho',items:[['receipts','Phiếu nhập'],['suppliers','Nhà cung cấp'],['history','Lịch sử nhập']]},
 {g:'out',icon:'📤',label:'Xuất kho',items:[['issues','Phiếu xuất'],['retail','Cấp phát cho khách lẻ'],['project','Cấp phát cho khách hàng/dự án'],['history','Lịch sử xuất']]},
 {g:'slip',icon:'📄',label:'Phiếu kho',items:[['in','Phiếu nhập kho'],['out','Phiếu xuất kho'],['pdf','Export PDF']]},
 {g:'rpt',icon:'📅',label:'Báo cáo',items:[['monthly','Theo tháng'],['project','Theo khách hàng/dự án'],['retail','Theo khách lẻ'],['category','Theo loại thiết bị'],['inout','Nhập / Xuất'],['stock','Tồn kho']]},
 {g:'info',icon:'🗂️',label:'Thông tin',items:[['retail','Khách lẻ'],['project','Khách hàng/dự án'],['supplier','Supplier'],['warehouse','Warehouse'],['category','Category']]},
 {g:'set',icon:'⚙️',label:'Settings',items:[['users','User / Permission'],['system','Sao lưu & Hệ thống']]}
];
const itItems=()=>[...db.categories.filter(c=>c.isIT).map(c=>[c.slug||c.id,c.name]),['history','Asset History']];

/* ---------- toast / modal ---------- */
function toast(msg,type='ok'){const r=$('#toast-root');if(!r)return;const d=document.createElement('div');d.className='toast '+type;d.textContent=msg;r.appendChild(d);setTimeout(()=>d.classList.add('out'),3400);setTimeout(()=>d.remove(),3800)}
function modal(title,body,{footer='',size=''}={}){
  $('#modal-root').innerHTML=`<div class="ov"><div class="md ${size}" role="dialog" aria-modal="true"><div class="mh"><h3>${esc(title)}</h3><button class="x" data-act="close" aria-label="Đóng">✕</button></div><div class="mb">${body}</div>${footer?`<div class="mf">${footer}</div>`:''}</div></div>`;
  document.body.classList.add('noscroll');
  setTimeout(()=>$('#modal-root .mb input:not([type=checkbox]):not([type=hidden]):not([readonly]),#modal-root .mb select')?.focus(),40);
}
function closeModal(){const r=$('#modal-root');if(r)r.innerHTML='';document.body.classList.remove('noscroll');S=null;T=null;IMP=null}
const done=msg=>{closeModal();rerender();toast(msg||'Đã lưu')};
const cancelBtn=`<button class="btn" data-act="close">Hủy</button>`;

/* ---------- form helpers ---------- */
const inp=(n,l,v,o={})=>`<label class="f ${o.full?'full':''}"><span>${l}${o.req?' <i>*</i>':''}</span><input class="in" name="${n}" type="${o.type||'text'}" value="${esc(v??'')}" ${o.req?'required':''} ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.step?`step="${o.step}"`:''} ${o.min!==undefined?`min="${o.min}"`:''} ${o.attrs||''}></label>`;
const sel=(n,l,opts,v,o={})=>`<label class="f ${o.full?'full':''}"><span>${l}${o.req?' <i>*</i>':''}</span><select class="in" name="${n}" ${o.req?'required':''} ${o.attrs||''}>${o.blank!==undefined?`<option value="">${esc(o.blank)}</option>`:''}${opts.map(([val,lab])=>`<option value="${esc(val)}" ${val===v?'selected':''}>${esc(lab)}</option>`).join('')}</select></label>`;
const txa=(n,l,v,o={})=>`<label class="f ${o.full?'full':''}"><span>${l}</span><textarea class="in" name="${n}" rows="${o.rows||2}">${esc(v??'')}</textarea></label>`;
const chk=(n,l,v)=>`<label class="chk full"><input type="checkbox" name="${n}" ${v?'checked':''}> ${l}</label>`;
const fd=form=>Object.fromEntries(new FormData(form));

/* ---------- bộ lọc ---------- */
const fSearch=(ph='Tìm kiếm…')=>`<input class="in srch" type="search" placeholder="${esc(ph)}" value="${esc(F().q||'')}" data-f="q" aria-label="${esc(ph)}">`;
const fSel=(name,label,opts)=>`<select class="in" data-f="${name}" title="${esc(label)}" aria-label="${esc(label)}">${opts.map(([v,l])=>`<option value="${esc(v)}" ${(F()[name]||'')===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
const fDate=(name,label,def='')=>`<label class="fl">${label}<input class="in" type="date" data-f="${name}" value="${F()[name]??def}"></label>`;
const fMonth=(name,label,def='')=>`<label class="fl">${label}<input class="in" type="month" data-f="${name}" value="${F()[name]??def}"></label>`;
const whOpts=(all='Tất cả kho')=>[['',all],...db.warehouses.map(w=>[w.id,w.name])];
const stockWhOpts=()=>[['','Kho nội bộ (tồn thực tế)'],[W_INV,'Kho hóa đơn']];
const whBadges=r=>slipWhs(r).map(w=>badge(w===W_INV?'info':'ok',w===W_INV?'Hóa đơn':'Nội bộ')).join(' ');
const catOpts=(all='Tất cả danh mục')=>[['',all],...db.categories.map(c=>[c.id,c.name])];
function onFilter(e){
  const el=e.target.closest&&e.target.closest('[data-f]');if(!el)return;
  const f=F(),v=el.value;if((f[el.dataset.f]??'')===v)return;
  f[el.dataset.f]=v;refreshTbl();
}
document.addEventListener('input',onFilter);document.addEventListener('change',onFilter);
function refreshTbl(){destroyCharts();const t=$('#tbl');if(PAGE&&PAGE.tbl&&t){t.innerHTML=PAGE.tbl();PAGE.tm&&PAGE.tm()}else rerender()}

/* ---------- bảng ---------- */
const nc=(h,fn,fmt=fmtNum)=>({h,c:'num',f:r=>fmt(fn(r)),x:fn});
function table(cols,rows,{empty='Chưa có dữ liệu.',limit=1000,foot=''}={}){
  ui.cur={cols,rows};
  if(!rows.length)return `<div class="empty">${empty}</div>`;
  const shown=rows.slice(0,limit);
  return `<div class="meta">${fmtNum(rows.length)} dòng</div><div class="tw"><table class="t"><thead><tr>${cols.map(c=>`<th class="${c.c||''}">${c.h}</th>`).join('')}</tr></thead><tbody>${shown.map(r=>`<tr>${cols.map(c=>`<td class="${c.c||''}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody>${foot?`<tfoot>${foot}</tfoot>`:''}</table></div>${rows.length>limit?`<div class="note">Đang hiển thị ${limit}/${fmtNum(rows.length)} dòng đầu. Dùng bộ lọc để thu hẹp hoặc xuất Excel để lấy đầy đủ.</div>`:''}`;
}
const actCol=fn=>({h:'',c:'act',noexp:1,f:fn});
function xlsxSave(aoa,name,sheet='Data'){
  if(!window.XLSX)return toast('Chưa tải được thư viện Excel (SheetJS). Kiểm tra kết nối mạng.','error');
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=aoa[0].map((_,i)=>({wch:Math.min(42,Math.max(10,...aoa.slice(0,60).map(r=>String(r[i]??'').length+2)))}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,sheet);XLSX.writeFile(wb,`${name}_${todayStr()}.xlsx`);
}
function exportCurrent(name){
  const t=ui.cur;if(!t||!t.rows.length)return toast('Không có dữ liệu để xuất.','warn');
  const cols=t.cols.filter(c=>!c.noexp);
  xlsxSave([cols.map(c=>strip(c.h)),...t.rows.map(r=>cols.map(c=>c.x?c.x(r):strip(c.f(r))))],name);
}

/* ---------- biểu đồ ---------- */
function chart(id,cfg){
  const c=document.getElementById(id);if(!c)return;
  if(!window.Chart){c.parentElement.innerHTML='<div class="empty">Chưa tải được thư viện biểu đồ (Chart.js).</div>';return}
  Chart.defaults.font.family="'Be Vietnam Pro',system-ui,sans-serif";
  ui.charts.push(new Chart(c,cfg));
}
function destroyCharts(){ui.charts.forEach(c=>{try{c.destroy()}catch(e){}});ui.charts=[]}
const baseOpt=(extra={})=>({responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},...extra});

/* ---------- in / PDF ---------- */
function offscreen(html,width=794){const d=document.createElement('div');d.style.cssText=`position:fixed;left:-99999px;top:0;width:${width}px;background:#fff;z-index:-1`;d.innerHTML=html;document.body.appendChild(d);return d}
function printHTML(html){$('#print-area').innerHTML=html;document.body.classList.add('printing');setTimeout(()=>window.print(),60)}
window.addEventListener('afterprint',()=>{document.body.classList.remove('printing');const p=$('#print-area');if(p)p.innerHTML=''});
async function pdfFromEls(els,filename,{landscape=false}={}){
  if(!window.html2canvas||!window.jspdf)return toast('Chưa tải được thư viện PDF (html2canvas / jsPDF). Kiểm tra kết nối mạng.','error');
  try{
    const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:landscape?'l':'p',unit:'pt',format:'a4'});
    const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();let first=true;
    for(const el of els){
      const cv=await html2canvas(el,{scale:2,backgroundColor:'#ffffff',useCORS:true});
      const img=cv.toDataURL('image/jpeg',0.92),ih=cv.height*pw/cv.width;
      if(!first)pdf.addPage();first=false;
      let left=ih,pos=0;pdf.addImage(img,'JPEG',0,pos,pw,ih);left-=ph;
      while(left>1){pos-=ph;pdf.addPage();pdf.addImage(img,'JPEG',0,pos,pw,ih);left-=ph}
    }
    pdf.save(filename);
  }catch(e){toast('Xuất PDF thất bại: '+e.message,'error')}
}
function reportHTML(){
  const c=db.company||{},t=$('#tbl'),clone=t.cloneNode(true);
  const src=$$('canvas',t),dst=$$('canvas',clone);
  dst.forEach((cv,i)=>{try{const img=new Image();img.src=src[i].toDataURL('image/png');img.style.cssText='max-width:100%;height:auto';cv.replaceWith(img)}catch(e){cv.remove()}});
  return `<div class="rpt-doc"><div class="rpt-hd"><div class="co">${typeof LOGO_DATA!=='undefined'?`<img class="slip-logo" src="${LOGO_DATA}" alt="Logo">`:''}<div><b>${esc(c.name||'')}</b><div>${esc(c.address||'')}</div></div></div><div>Ngày in: ${fmtDate(todayStr())}</div></div><h2>${esc(PAGE.t)}</h2>${PAGE.sub?`<div class="sub">${PAGE.sub()}</div>`:''}${clone.innerHTML}</div>`;
}

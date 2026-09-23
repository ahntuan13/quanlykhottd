/* 40-combobox.js – Ô chọn/gõ tên có danh sách gợi ý (không phân biệt dấu) */
'use strict';
(self.__mods=self.__mods||[]).push('40-combobox');

/* =====================================================================
   COMBOBOX: bấm là sổ danh sách, gõ để lọc (không phân biệt dấu)
   ===================================================================== */
let cbState=null;
function cbPop(){let p=document.getElementById('cb-pop');if(!p){p=document.createElement('div');p.id='cb-pop';p.className='cbp';p.hidden=true;document.body.appendChild(p)}return p}
function cbOptions(kind){
  if(kind==='retail')return db.retail.map(c=>({id:c.id,label:c.name,sub:[c.dept,c.phone].filter(Boolean).join(' · '),key:norm(c.name+' '+(c.dept||''))}));
  if(kind==='project')return db.projects.map(p=>({id:p.id,label:`${p.code} – ${p.name}`,sub:[p.taxId?'MST '+p.taxId:'',p.address].filter(Boolean).join(' · '),key:norm(p.code+' '+p.name+' '+(p.taxId||''))}));
  if(kind==='supplier')return db.suppliers.map(s=>({id:s.id,label:s.name,sub:[s.code,s.phone,s.address].filter(Boolean).join(' · '),key:norm((s.code||'')+' '+s.name)}));
  if(kind==='item'){const m=stockMap();return db.items.map(i=>({id:i.id,label:itemLabel(i),sub:`Tồn ${fmtNum(totalOf(m,i.id))} ${i.unit}`,key:norm(i.sku+' '+i.name)}))}
  return[];
}
function cbOpen(el){
  const kind=el.dataset.cb,all=cbOptions(kind);
  cbState={el,kind,all,list:[],idx:0,showAll:all.some(o=>o.label===el.value)};
  cbFilter();
}
function cbFilter(){
  const s=cbState;if(!s)return;
  const toks=s.showAll?[]:norm(s.el.value).split(' ').filter(Boolean);
  s.list=s.all.filter(o=>toks.every(t=>o.key.includes(t))).slice(0,80);
  s.idx=s.list.length?0:-1;cbRender();
}
function cbRender(){
  const s=cbState,p=cbPop();if(!s)return;
  p.innerHTML=s.list.length?s.list.map((o,i)=>`<div class="cbo ${i===s.idx?'on':''}" data-cbi="${i}"><b>${esc(o.label)}</b>${o.sub?`<small>${esc(o.sub)}</small>`:''}</div>`).join(''):`<div class="cbe">Không có kết quả${s.kind==='retail'&&s.el.value.trim()?` – sẽ thêm “${esc(s.el.value.trim())}” làm khách lẻ mới khi lưu phiếu`:s.kind==='project'?'. Thêm mới ở Thông tin → Khách hàng/dự án':s.kind==='supplier'?'. Để trống nếu không có nhà cung cấp / tồn đầu kỳ, hoặc thêm mới ở Thông tin → Supplier':''}</div>`;
  const r=s.el.getBoundingClientRect(),below=window.innerHeight-r.bottom-10,up=below<170&&r.top>below;
  p.style.left=Math.max(6,Math.min(r.left,window.innerWidth-Math.max(r.width,320)-6))+'px';p.style.width=Math.max(r.width,320)+'px';
  if(up){p.style.top='auto';p.style.bottom=(window.innerHeight-r.top+2)+'px';p.style.maxHeight=Math.min(300,r.top-12)+'px'}
  else{p.style.bottom='auto';p.style.top=(r.bottom+2)+'px';p.style.maxHeight=Math.min(300,below)+'px'}
  p.hidden=false;
  const on=p.querySelector('.cbo.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest'});
}
function cbClose(){cbState=null;const p=document.getElementById('cb-pop');if(p)p.hidden=true}
function cbPick(i){
  const s=cbState;if(!s)return;const o=s.list[i];if(!o)return;const el=s.el;
  el.value=o.label;cbClose();
  if(s.kind==='item'){const it=itemOf(o.id);if(it&&S)pickItem(+el.dataset.idx,it)}
  else if(s.kind==='supplier'){if(S){S.supplierText=o.label;S.supplierId=o.id}}
  else if(S){
    S.targetText=o.label;S.targetId=o.id;
    if(s.kind==='project'&&!S.deliveryAddress){
      const p=by(db.projects,o.id);
      if(p&&p.address){S.deliveryAddress=p.address;const da=document.querySelector('[data-slip=deliveryAddress]');if(da)da.value=p.address}
    }
  }
}
document.addEventListener('focusin',e=>{const el=e.target;if(el.dataset&&el.dataset.cb&&!(cbState&&cbState.el===el))cbOpen(el)});
document.addEventListener('click',e=>{const el=e.target;if(el.dataset&&el.dataset.cb&&!cbState)cbOpen(el)});
document.addEventListener('input',e=>{if(cbState&&e.target===cbState.el){cbState.showAll=false;cbFilter()}});
document.addEventListener('keydown',e=>{
  const s=cbState;if(!s)return;
  if(e.key==='ArrowDown'){e.preventDefault();if(s.list.length){s.idx=(s.idx+1)%s.list.length;cbRender()}}
  else if(e.key==='ArrowUp'){e.preventDefault();if(s.list.length){s.idx=(s.idx-1+s.list.length)%s.list.length;cbRender()}}
  else if(e.key==='Enter'){if(s.idx>=0){e.preventDefault();cbPick(s.idx)}}
  else if(e.key==='Escape'){e.preventDefault();cbClose()}
  else if(e.key==='Tab'){cbClose()}
});
document.addEventListener('mousedown',e=>{
  const o=e.target.closest&&e.target.closest('.cbo');
  if(o){e.preventDefault();cbPick(+o.dataset.cbi);return}
  if(cbState&&e.target!==cbState.el&&!(e.target.closest&&e.target.closest('#cb-pop')))cbClose();
});
document.addEventListener('scroll',e=>{if(cbState&&!(e.target.closest&&e.target.closest('#cb-pop')))cbClose()},true);
window.addEventListener('resize',cbClose);

/* Tìm dự án từ chữ đã gõ: nhãn đầy đủ / mã / tên (duy nhất) */
function resolveProject(t){
  const n=norm(t);if(!n)return null;
  const x=db.projects.find(p=>norm(`${p.code} – ${p.name}`)===n||norm(p.code)===n);if(x)return x;
  const c=db.projects.filter(p=>norm(p.name)===n);return c.length===1?c[0]:null;
}
/* Tìm nhà cung cấp từ chữ đã gõ: mã hoặc tên (duy nhất) */
function resolveSupplier(t){
  const n=norm(t);if(!n)return null;
  const x=db.suppliers.find(s=>s.code&&norm(s.code)===n);if(x)return x;
  const c=db.suppliers.filter(s=>norm(s.name)===n);return c.length===1?c[0]:null;
}

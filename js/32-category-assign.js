/* 32-category-assign.js – Gán hàng hóa vào danh mục (người dùng tự phân loại) */
'use strict';
(self.__mods=self.__mods||[]).push('32-category-assign');

/* =====================================================================
   GÁN HÀNG HÓA VÀO DANH MỤC (người dùng tự phân loại)
   ===================================================================== */
let CA=null;
function uncategorized(){let c=db.categories.find(x=>norm(x.name)==='chua phan loai');if(!c){c={id:uid('c'),name:'Chưa phân loại',isIT:false};db.categories.push(c)}return c}
ACT['cat-assign']=el=>{
  const cat=by(db.categories,el.dataset.id);if(!cat)return;
  if(!db.items.length)return toast('Chưa có hàng hóa. Hãy thêm hoặc upload hàng hóa trước.','warn');
  CA={id:cat.id,q:'',show:'all',sel:new Set(db.items.filter(i=>i.categoryId===cat.id).map(i=>i.id)),init:new Set(db.items.filter(i=>i.categoryId===cat.id).map(i=>i.id))};
  modal(`Chọn hàng hóa thuộc nhóm: ${cat.name}`,`<p class="note">Tick những mặt hàng thuộc nhóm <b>${esc(cat.name)}</b> rồi bấm <b>Lưu</b>. Mặt hàng đang ở nhóm khác sẽ được chuyển sang nhóm này. Mặt hàng bị bỏ tick sẽ chuyển về <b>Chưa phân loại</b>.</p>
    <div class="bar"><input class="in srch" type="search" data-ca="q" placeholder="Tìm mã / tên hàng (không cần gõ dấu)…" autocomplete="off"><select class="in" data-ca="show"><option value="all">Tất cả hàng hóa</option><option value="in">Đang thuộc nhóm này</option><option value="other">Đang ở nhóm khác</option><option value="checked">Đã tick</option></select><button type="button" class="btn sm" data-act="ca-all">Tick tất cả đang hiển thị</button><button type="button" class="btn sm" data-act="ca-none">Bỏ tick đang hiển thị</button><span id="ca-count" class="muted"></span></div>
    <div id="ca-list"></div>`,{size:'wide',footer:cancelBtn+'<button class="btn primary" data-act="ca-save">💾 Lưu phân loại</button>'});
  renderCA();
};
function caRows(){
  const toks=norm(CA.q).split(' ').filter(Boolean);
  return db.items.filter(i=>{
    if(toks.length){const k=norm(i.sku+' '+i.name);if(!toks.every(t=>k.includes(t)))return false}
    if(CA.show==='in')return i.categoryId===CA.id;
    if(CA.show==='other')return i.categoryId!==CA.id;
    if(CA.show==='checked')return CA.sel.has(i.id);
    return true;
  }).sort((a,b)=>a.sku.localeCompare(b.sku));
}
function renderCA(){
  const rows=caRows(),m=stockMap(),lim=600;
  $('#ca-list').innerHTML=`<div class="tw" style="max-height:52vh"><table class="t"><thead><tr><th style="width:36px"></th><th>Mã hàng</th><th>Tên hàng hóa</th><th>Nhóm hiện tại</th><th class="num">Tồn</th></tr></thead><tbody>${rows.slice(0,lim).map(i=>`<tr><td><input type="checkbox" data-cai="${i.id}" ${CA.sel.has(i.id)?'checked':''}></td><td><b>${esc(i.sku)}</b></td><td>${esc(i.name)}</td><td>${i.categoryId===CA.id?badge('ok','Nhóm này'):badge('mute',nm(db.categories,i.categoryId))}</td><td class="num">${fmtNum(totalOf(m,i.id))}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Không có mặt hàng phù hợp.</td></tr>'}</tbody></table></div>${rows.length>lim?`<div class="note">Hiển thị ${lim}/${fmtNum(rows.length)} dòng đầu, hãy lọc hoặc tìm kiếm để thu hẹp.</div>`:''}`;
  caCount();
}
const caCount=()=>{const c=$('#ca-count');if(c)c.textContent=`Đã tick: ${fmtNum(CA.sel.size)} / ${fmtNum(db.items.length)}`};
document.addEventListener('input',e=>{const el=e.target;if(CA&&el.dataset&&el.dataset.ca==='q'){CA.q=el.value;renderCA()}});
document.addEventListener('change',e=>{
  const el=e.target;if(!CA||!el.dataset)return;
  if(el.dataset.ca==='show'){CA.show=el.value;renderCA()}
  if(el.dataset.cai){el.checked?CA.sel.add(el.dataset.cai):CA.sel.delete(el.dataset.cai);caCount()}
});
ACT['ca-all']=()=>{caRows().forEach(i=>CA.sel.add(i.id));renderCA()};
ACT['ca-none']=()=>{caRows().forEach(i=>CA.sel.delete(i.id));renderCA()};
ACT['ca-save']=()=>{
  if(!CA)return;const cat=by(db.categories,CA.id);
  /* Mỗi mặt hàng chỉ thuộc MỘT danh mục: chuyển sang nhóm này thì tự gỡ khỏi danh mục cũ */
  const from={},released=[];
  db.items.forEach(i=>{
    if(CA.sel.has(i.id)&&i.categoryId!==CA.id){const n=nm(db.categories,i.categoryId);from[n]=(from[n]||0)+1}
    else if(!CA.sel.has(i.id)&&i.categoryId===CA.id)released.push(i.id);
  });
  const moved=Object.values(from).reduce((a,b)=>a+b,0);
  if(!moved&&!released.length)return toast('Không có thay đổi nào để lưu.','warn');
  const fromTxt=Object.entries(from).map(([n,c])=>`${n} (${c})`).join(', ');
  const msg=[`Lưu phân loại cho nhóm "${cat.name}":`,moved?`• ${fmtNum(moved)} mặt hàng được chuyển vào nhóm này và GỠ KHỎI danh mục cũ: ${fromTxt}.`:'',released.length?`• ${fmtNum(released.length)} mặt hàng bỏ tick được đưa về "Chưa phân loại".`:'','Tiếp tục?'].filter(Boolean).join('\n');
  if(!confirm(msg))return;
  const ok=transact(()=>{
    const un=released.length?uncategorized():null;
    db.items.forEach(i=>{
      if(CA.sel.has(i.id)&&i.categoryId!==CA.id)i.categoryId=CA.id;
      else if(!CA.sel.has(i.id)&&i.categoryId===CA.id)i.categoryId=un.id;
    });
  });
  if(ok){CA=null;done(`Đã lưu nhóm ${cat.name}: chuyển vào ${fmtNum(moved)} mặt hàng${moved?` (đã gỡ khỏi: ${fromTxt})`:''}${released.length?`, đưa ${fmtNum(released.length)} mặt hàng về Chưa phân loại`:''}`)}
};

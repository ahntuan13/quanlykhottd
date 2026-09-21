/* 30-it-assets.js – IT Asset (thiết bị theo Serial) và Asset History */
'use strict';
(self.__mods=self.__mods||[]).push('30-it-assets');

/* =====================================================================
   IT ASSET
   ===================================================================== */
const ST={in_stock:['ok','Trong kho'],assigned:['info','Đã cấp phát'],repair:['warn','Sửa chữa'],retired:['mute','Thanh lý']};
const holderLabel=a=>a.holder?targetLabel(a.holder.type,a.holder.id):'';
function warrCell(a){
  if(!a.warrantyEnd)return'<span class="muted">—</span>';
  const t=todayStr();if(a.status==='retired')return fmtDate(a.warrantyEnd);
  if(a.warrantyEnd<t)return `<span class="tag-bad">${fmtDate(a.warrantyEnd)} (hết BH)</span>`;
  if(a.warrantyEnd<=addDays(t,60))return `<span class="tag-warn">${fmtDate(a.warrantyEnd)}</span>`;
  return fmtDate(a.warrantyEnd);
}
function assetPage(cat){
  const list=()=>db.assets.filter(a=>itemOf(a.itemId)?.categoryId===cat.id);
  return{t:cat.name,
    head(){
      const L=list(),c=s=>L.filter(a=>a.status===s).length;
      return `<div class="kpis sm">${kpi('Tổng thiết bị',L.length)}${kpi('Trong kho',c('in_stock'),'','ok')}${kpi('Đã cấp phát',c('assigned'),'','info')}${kpi('Sửa chữa',c('repair'),'','warn')}${kpi('Thanh lý',c('retired'))}</div>
      <div class="bar">${fSearch('Tìm mã TS / serial / thiết bị / người dùng…')}${fSel('st','Trạng thái',[['','Mọi trạng thái'],...Object.entries(ST).map(([k,v])=>[k,v[1]])])}<div class="sp"></div><button class="btn" data-act="export" data-name="it-${slug(cat.name)}">⬇ Excel</button>${can('write')?`<button class="btn" data-act="cat-assign" data-id="${cat.id}" title="Chọn những mặt hàng trong danh sách hàng hóa thuộc nhóm này">🏷 Chọn hàng hóa thuộc nhóm này</button><button class="btn acc" data-act="asset-new" data-cat="${cat.id}">＋ Thêm tài sản</button>`:''}</div>`;
    },
    tbl(){
      const f=F(),q=(f.q||'').toLowerCase(),w=can('write');
      const rows=list().filter(a=>(!f.st||a.status===f.st)&&(!q||[a.tag,a.serial,a.spec,nm(db.items,a.itemId),holderLabel(a)].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.tag.localeCompare(b.tag));
      return table([{h:'Mã TS',f:a=>`<b>${esc(a.tag)}</b>`,x:a=>a.tag},{h:'Thiết bị',f:a=>`${esc(nm(db.items,a.itemId))}${a.spec?`<small>${esc(a.spec)}</small>`:''}`,x:a=>nm(db.items,a.itemId)+(a.spec?' – '+a.spec:'')},{h:'Serial',f:a=>esc(a.serial||'—'),x:a=>a.serial||''},{h:'Trạng thái',f:a=>badge(...ST[a.status]),x:a=>ST[a.status][1]},
        {h:'Vị trí / Người dùng',f:a=>a.status==='assigned'?esc(holderLabel(a)):esc(whName(a.warehouseId)),x:a=>a.status==='assigned'?holderLabel(a):whName(a.warehouseId)},{h:'Ngày mua',f:a=>fmtDate(a.purchaseDate),x:a=>a.purchaseDate||''},{h:'Hết bảo hành',f:warrCell,x:a=>a.warrantyEnd||''},
        actCol(a=>`<button class="btn sm" data-act="asset-hist" data-id="${a.id}">Lịch sử</button>${w?` <button class="btn sm" data-act="asset-act" data-id="${a.id}">Thao tác</button> <button class="btn sm" data-act="asset-edit" data-id="${a.id}" data-cat="${cat.id}">Sửa</button>`:''}`)],rows,{empty:'Chưa có thiết bị. Thiết bị được tạo tự động khi nhập kho kèm Serial, hoặc bấm “Thêm tài sản”.'});
    }};
}
const holderSelect=v=>`<label class="f full"><span>Người dùng / dự án đang giữ (nếu trạng thái là Đã cấp phát)</span><select class="in" name="holder"><option value="">— chọn —</option><optgroup label="Khách lẻ">${db.retail.map(c=>`<option value="retail:${c.id}" ${v==='retail:'+c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup><optgroup label="Khách hàng / Dự án">${db.projects.map(p=>`<option value="project:${p.id}" ${v==='project:'+p.id?'selected':''}>${esc(p.code+' – '+p.name)}</option>`).join('')}</optgroup></select></label>`;
function assetForm(catId,id){
  const a=id?by(db.assets,id):null,items=db.items.filter(i=>i.categoryId===catId);
  if(!a&&!items.length)return toast('Chưa có hàng hóa thuộc danh mục này. Hãy thêm ở “Danh sách hàng hóa” trước.','warn');
  modal(a?`Sửa tài sản ${a.tag}`:'Thêm tài sản',`<form id="mf" data-submit="asset-save" data-id="${id||''}"><div class="fg">
    ${sel('itemId','Hàng hóa / Model',(a?db.items.filter(i=>i.id===a.itemId):items).map(i=>[i.id,itemLabel(i)]),a?.itemId,{req:1,full:1,attrs:a?'disabled':''})}
    ${inp('serial','Serial / Service Tag',a?.serial||'')}${inp('spec','Cấu hình / Mô tả',a?.spec||'',{ph:'VD: i7 / 16GB / 512GB'})}
    ${a?'':sel('status','Trạng thái ban đầu',[['in_stock','Trong kho'],['assigned','Đã cấp phát']],'in_stock')}
    ${inp('purchaseDate','Ngày mua',a?.purchaseDate||'',{type:'date'})}${inp('warrantyEnd','Hết bảo hành',a?.warrantyEnd||'',{type:'date'})}
    ${a?'':holderSelect('')}
    ${txa('note','Ghi chú',a?.note||'',{full:1})}
    ${a?'':chk('addStock','Cộng 1 vào tồn kho (dùng cho tồn đầu kỳ; bỏ chọn nếu thiết bị đã được tính qua phiếu nhập)',true)}
  </div></form>`,{footer:cancelBtn+`<button class="btn primary" form="mf">Lưu tài sản</button>`});
}
ACT['asset-new']=el=>assetForm(el.dataset.cat);ACT['asset-edit']=el=>assetForm(el.dataset.cat,el.dataset.id);
SUB['asset-save']=form=>{
  const d=fd(form),id=form.dataset.id;
  const ok=transact(()=>{
    if(id){const a=by(db.assets,id);
      if(d.serial.trim()&&db.assets.some(x=>x.id!==id&&x.itemId===a.itemId&&(x.serial||'').toLowerCase()===d.serial.trim().toLowerCase()))throw new Error('Serial đã tồn tại.');
      Object.assign(a,{serial:d.serial.trim(),spec:d.spec||'',purchaseDate:d.purchaseDate||'',warrantyEnd:d.warrantyEnd||'',note:d.note||''});addHist(a,'Cập nhật','Chỉnh sửa thông tin');return}
    const serial=d.serial.trim();
    if(serial&&db.assets.some(x=>x.itemId===d.itemId&&(x.serial||'').toLowerCase()===serial.toLowerCase()))throw new Error('Serial đã tồn tại.');
    const a={id:uid('a'),tag:nextTag(),itemId:d.itemId,serial,spec:d.spec||'',status:'in_stock',counted:true,warehouseId:W_INT,holder:null,issueId:null,receiptId:null,purchaseDate:d.purchaseDate||'',warrantyEnd:d.warrantyEnd||'',note:d.note||'',history:[]};
    if(d.status==='assigned'){
      if(!d.holder)throw new Error('Chọn người dùng / dự án đang giữ thiết bị.');
      const [type,hid]=d.holder.split(':');a.status='assigned';a.counted=false;a.holder={type,id:hid};addHist(a,'Thêm thủ công',`Đang cấp phát cho ${targetLabel(type,hid)}`);
    }else{addHist(a,'Thêm thủ công','Ghi nhận vào kho');if(d.addStock)pushAdj(a.itemId,a.warehouseId,1,`Tồn đầu kỳ – tài sản ${a.tag}`)}
    db.assets.push(a);
  });
  if(ok)done();
};
ACT['asset-hist']=el=>{
  const a=by(db.assets,el.dataset.id);if(!a)return;
  modal(`Lịch sử ${a.tag}`,`<p class="note">${esc(nm(db.items,a.itemId))} · Serial: ${esc(a.serial||'—')} · ${badge(...ST[a.status])}</p>`+miniTable(['Ngày','Thao tác','Chi tiết','Người thực hiện'],[...(a.history||[])].reverse().map(h=>`<tr><td>${fmtDate(h.date)}</td><td>${esc(h.action)}</td><td>${esc(h.detail||'')}</td><td>${esc(h.by||'')}</td></tr>`),'Chưa có lịch sử.'),{size:'mid',footer:'<button class="btn" data-act="close">Đóng</button>'});
};
ACT['asset-act']=el=>{
  const a=by(db.assets,el.dataset.id);if(!a)return;
  const acts={in_stock:[['repair','Gửi sửa chữa'],['retire','Thanh lý / loại bỏ']],assigned:[['return','Thu hồi về kho'],['repair','Gửi sửa chữa'],['retire','Thanh lý / loại bỏ']],repair:[['fixed','Sửa xong – nhập lại kho'],['retire','Thanh lý / loại bỏ']],retired:[]}[a.status];
  if(!acts.length)return toast('Thiết bị đã thanh lý, không còn thao tác nào.','warn');
  modal(`Thao tác – ${a.tag}`,`<form id="mf" data-submit="asset-act" data-id="${a.id}"><p class="note">${esc(nm(db.items,a.itemId))} · ${badge(...ST[a.status])}${a.status==='assigned'?' · '+esc(holderLabel(a)):''}<br>Thiết bị IT được quản lý ở <b>Kho nội bộ</b> (hàng thực tế). Muốn cấp phát thiết bị đang trong kho, hãy tạo <b>Phiếu xuất</b> (ghi nhận vào Kho nội bộ) và chọn Serial.</p><div class="fg">${sel('act','Thao tác',acts,acts[0][0],{full:1})}${inp('date','Ngày',todayStr(),{type:'date'})}${txa('note','Ghi chú','',{full:1})}</div></form>`,{footer:cancelBtn+`<button class="btn primary" form="mf">Xác nhận</button>`});
};
SUB['asset-act']=form=>{
  const d=fd(form);
  const ok=transact(()=>{
    const a=by(db.assets,form.dataset.id),w=W_INT,date=d.date||todayStr(),n=d.note?` – ${d.note}`:'';
    if(d.act==='return'){if(!a.counted){pushAdj(a.itemId,w,1,`Thu hồi ${a.tag}`,date);a.counted=true}a.status='in_stock';a.holder=null;a.issueId=null;a.warehouseId=w;addHist(a,'Thu hồi',`Về ${whName(w)}${n}`,date)}
    else if(d.act==='repair'){a.status='repair';addHist(a,'Sửa chữa',`Gửi sửa chữa${n}`,date)}
    else if(d.act==='fixed'){if(!a.counted){pushAdj(a.itemId,w,1,`Sửa xong ${a.tag}`,date);a.counted=true}a.status='in_stock';a.holder=null;a.issueId=null;a.warehouseId=w;addHist(a,'Hoàn tất sửa chữa',`Nhập lại ${whName(w)}${n}`,date)}
    else if(d.act==='retire'){if(a.counted){pushAdj(a.itemId,a.warehouseId,-1,`Thanh lý ${a.tag}`,date);a.counted=false}a.status='retired';a.holder=null;addHist(a,'Thanh lý',`Loại bỏ thiết bị${n}`,date)}
  });
  if(ok)done('Đã cập nhật thiết bị');
};
PAGES['it/history']={t:'Asset History',
  head(){return `<div class="bar">${fSearch('Tìm mã TS / serial / thiết bị / chi tiết…')}${fSel('act','Thao tác',[['','Mọi thao tác'],...['Nhập kho','Cấp phát','Thu hồi','Sửa chữa','Hoàn tất sửa chữa','Thanh lý','Thêm thủ công','Cập nhật'].map(x=>[x,x])])}${fDate('from','Từ')}${fDate('to','Đến')}<div class="sp"></div><button class="btn" data-act="export" data-name="asset-history">⬇ Excel</button></div>`},
  tbl(){
    const f=F(),q=(f.q||'').toLowerCase();
    const rows=db.assets.flatMap(a=>(a.history||[]).map(h=>({a,h}))).filter(({a,h})=>(!f.act||h.action===f.act)&&(!f.from||h.date>=f.from)&&(!f.to||h.date<=f.to)&&(!q||[a.tag,a.serial,nm(db.items,a.itemId),h.detail].join(' ').toLowerCase().includes(q))).sort((x,y)=>y.h.ts.localeCompare(x.h.ts));
    return table([{h:'Ngày',f:r=>fmtDate(r.h.date),x:r=>r.h.date},{h:'Mã TS',f:r=>`<b>${esc(r.a.tag)}</b>`,x:r=>r.a.tag},{h:'Thiết bị',f:r=>esc(nm(db.items,r.a.itemId))},{h:'Serial',f:r=>esc(r.a.serial||'—')},{h:'Thao tác',f:r=>esc(r.h.action)},{h:'Chi tiết',f:r=>esc(r.h.detail||'')},{h:'Người thực hiện',f:r=>esc(r.h.by||'')},{h:'Ghi lúc',f:r=>fmtDT(r.h.ts)}],rows,{empty:'Chưa có lịch sử tài sản.'});
  }};

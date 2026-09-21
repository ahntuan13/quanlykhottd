/* 21-items-stock.js – Hàng hóa, Tồn kho (kèm chuyển sang Kho hóa đơn), Kiểm kê */
'use strict';
(self.__mods=self.__mods||[]).push('21-items-stock');

/* =====================================================================
   KHO: HÀNG HÓA, TỒN KHO, KIỂM KÊ
   ===================================================================== */
const itemUsed=id=>db.receipts.some(r=>r.lines.some(l=>l.itemId===id))||db.issues.some(r=>r.lines.some(l=>l.itemId===id))||db.adjustments.some(a=>a.itemId===id)||db.stocktakes.some(s=>s.lines.some(l=>l.itemId===id))||db.assets.some(a=>a.itemId===id);
PAGES['wh/items']={t:'Danh sách hàng hóa',
  head(){const w=can('write');return `<div class="bar">${fSearch('Tìm mã / tên hàng…')}${fSel('cat','Danh mục',catOpts())}<div class="sp"></div>${w?'<button class="btn" data-act="tpl-items">Mẫu Excel</button><button class="btn" data-act="imp-items">⬆ Nhập từ Excel</button>':''}<button class="btn" data-act="export" data-name="hang-hoa">⬇ Excel</button>${w?'<button class="btn acc" data-act="item-new">＋ Thêm hàng hóa</button>':''}</div>`},
  tbl(){
    const f=F(),q=(f.q||'').toLowerCase(),m=stockMap(),w=can('write');
    const rows=db.items.filter(i=>(!f.cat||i.categoryId===f.cat)&&(!q||(i.sku+' '+i.name).toLowerCase().includes(q))).sort((a,b)=>a.sku.localeCompare(b.sku));
    return table([
      {h:'Mã hàng',f:r=>`<b>${esc(r.sku)}</b>`,x:r=>r.sku},
      {h:'Tên hàng hóa',f:r=>`${esc(r.name)}${catOf(r.categoryId)?.isIT?' '+badge('info','IT'):''}`,x:r=>r.name},
      {h:'Danh mục',f:r=>esc(nm(db.categories,r.categoryId))},{h:'ĐVT',f:r=>esc(r.unit)},
      nc('Tồn',r=>totalOf(m,r.id)),nc('Tối thiểu',r=>r.minStock||0),nc('Đơn giá (VND)',r=>r.price||0,fmtMoney),
      {h:'Trạng thái',f:r=>badge(...itemStatus(r,totalOf(m,r.id))),x:r=>itemStatus(r,totalOf(m,r.id))[1]},
      actCol(r=>w?`<button class="btn sm" data-act="item-edit" data-id="${r.id}">Sửa</button> <button class="btn sm danger" data-act="item-del" data-id="${r.id}">Xoá</button>`:'')
    ],rows,{empty:'Chưa có hàng hóa. Bấm “Thêm hàng hóa” hoặc nhập từ Excel.'});
  }};
function itemForm(id){
  const it=id?itemOf(id):{sku:'',name:'',categoryId:db.categories[0]?.id,unit:'Cái',minStock:0,price:0,note:''};
  modal(id?'Sửa hàng hóa':'Thêm hàng hóa',`<form id="mf" data-submit="item-save" data-id="${id||''}"><div class="fg">${inp('sku','Mã hàng (SKU)',it.sku,{ph:'Để trống để tự sinh'})}${inp('name','Tên hàng hóa',it.name,{req:1})}${sel('categoryId','Danh mục',db.categories.map(c=>[c.id,c.name+(c.isIT?' (IT – quản lý theo Serial)':'')]),it.categoryId)}${inp('unit','Đơn vị tính',it.unit,{req:1})}${inp('minStock','Tồn tối thiểu (cảnh báo)',it.minStock,{type:'number',step:'1',min:0})}${inp('price','Đơn giá tham chiếu (VND)',it.price,{type:'number',step:'any',min:0})}${txa('note','Ghi chú',it.note,{full:1})}</div></form>`,{footer:cancelBtn+`<button class="btn primary" form="mf">Lưu hàng hóa</button>`});
}
ACT['item-new']=()=>itemForm();ACT['item-edit']=el=>itemForm(el.dataset.id);
ACT['item-del']=el=>{const id=el.dataset.id;if(itemUsed(id))return toast('Hàng hóa đã phát sinh giao dịch, không thể xoá.','error');if(confirm('Xoá hàng hóa này?'))transact(()=>{db.items=db.items.filter(i=>i.id!==id)})&&done('Đã xoá')};
SUB['item-save']=form=>{
  const d=fd(form),id=form.dataset.id,sku=(d.sku||'').trim();
  if(sku&&db.items.some(x=>x.sku.toLowerCase()===sku.toLowerCase()&&x.id!==id))return toast('Mã hàng đã tồn tại.','error');
  if(transact(()=>{let it=id?itemOf(id):null;if(!it){it={id:uid('it')};it.sku=sku||autoSku();db.items.push(it)}else if(sku)it.sku=sku;
    Object.assign(it,{name:d.name.trim(),categoryId:d.categoryId,unit:d.unit.trim(),minStock:Math.round(num(d.minStock)),price:num(d.price),note:d.note||''})}))done();
};
ACT['tpl-items']=()=>xlsxSave([['SKU','Tên hàng','Danh mục','ĐVT','Tồn tối thiểu','Đơn giá','Ghi chú'],['LT-001','Laptop Dell Latitude 5440','Laptop / PC','Cái',2,22500000,''],['VPP-001','Giấy A4 Double A','Văn phòng phẩm','Ream',10,75000,'']],'mau-nhap-hang-hoa','HangHoa');
ACT['imp-items']=()=>{const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls,.csv';i.onchange=()=>i.files[0]&&importItems(i.files[0]);i.click()};
function importItems(file){
  if(!window.XLSX)return toast('Chưa tải được thư viện Excel.','error');
  const rd=new FileReader();
  rd.onload=()=>{try{
    const wb=XLSX.read(rd.result,{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    const pick=(r,keys)=>{const k=Object.keys(r).find(x=>keys.includes(x.trim().toLowerCase()));return k===undefined?'':r[k]};
    let add=0,upd=0;
    const ok=transact(()=>{rows.forEach(r=>{
      const name=String(pick(r,['tên hàng','tên','name','tên hàng hóa'])).trim();if(!name)return;
      const sku=String(pick(r,['sku','mã','mã hàng'])).trim(),cn=String(pick(r,['danh mục','category','nhóm'])).trim();
      let cat=cn?db.categories.find(c=>c.name.toLowerCase()===cn.toLowerCase()):null;
      if(cn&&!cat){cat={id:uid('c'),name:cn,isIT:false};db.categories.push(cat)}
      const data={name,unit:String(pick(r,['đvt','đơn vị','unit'])).trim()||'Cái',minStock:num(pick(r,['tồn tối thiểu','min','tối thiểu'])),price:num(pick(r,['đơn giá','price','giá'])),note:String(pick(r,['ghi chú','note'])).trim()};
      const it=sku?db.items.find(x=>x.sku.toLowerCase()===sku.toLowerCase()):null;
      if(it){Object.assign(it,data);if(cat)it.categoryId=cat.id;upd++}
      else{db.items.push({id:uid('it'),sku:sku||autoSku(),categoryId:(cat||db.categories.find(c=>!c.isIT)||db.categories[0]).id,...data});add++}
    })});
    if(ok)done(`Đã nhập ${add} mới, cập nhật ${upd} hàng hóa`);
  }catch(e){toast('Không đọc được file: '+e.message,'error')}};
  rd.readAsArrayBuffer(file);
}

function stockRows(){
  const f=F(),q=(f.q||'').toLowerCase(),m=stockMap(),map={bad:'out',warn:'low',ok:'ok'};
  const pi=i=>m[i.id]?.[W_INT]||0,vi=i=>m[i.id]?.[W_INV]||0;
  const rows=db.items.filter(i=>(!f.cat||i.categoryId===f.cat)&&(!q||(i.sku+' '+i.name).toLowerCase().includes(q))&&(!f.st||(f.st==='diff'?pi(i)!==vi(i):map[itemStatus(i,pi(i))[0]]===f.st))).sort((a,b)=>a.sku.localeCompare(b.sku));
  return{rows,pi,vi};
}
PAGES['wh/stock']={t:'Tồn kho',
  head(){const w=can('write');return `<div class="bar">${fSearch('Tìm mã / tên hàng…')}${fSel('cat','Danh mục',catOpts())}${fSel('st','Trạng thái',[['','Mọi trạng thái'],['out','Hết hàng'],['low','Sắp hết'],['ok','Còn hàng'],['diff','Hóa đơn ≠ thực tế']])}<div class="sp"></div>${w?'<button class="btn" data-act="xfer-all" title="Chuyển tồn từ Kho nội bộ sang Kho hóa đơn cho tất cả mặt hàng đang lọc">→ Chuyển tất cả sang Kho hóa đơn</button><button class="btn" data-act="up-stock">⬆ Upload file Tồn kho</button>':''}<button class="btn" data-act="export" data-name="ton-kho">⬇ Excel</button></div><p class="note"><b>Kho nội bộ</b> là tồn hàng thực tế (dùng để cảnh báo hết hàng, tính giá trị tồn). <b>Kho hóa đơn</b> là số lượng theo hóa đơn nhập / xuất. Chênh lệch = thực tế − hóa đơn. Bấm <b>→ HĐ</b> ở từng dòng để chuyển sang Kho hóa đơn.</p>`},
  tbl(){
    const {rows,pi,vi}=stockRows(),w=can('write');
    const cols=[{h:'Mã hàng',f:r=>`<b>${esc(r.sku)}</b>`,x:r=>r.sku},{h:'Tên hàng hóa',f:r=>esc(r.name),x:r=>r.name},{h:'Danh mục',f:r=>esc(nm(db.categories,r.categoryId))},{h:'ĐVT',f:r=>esc(r.unit)},
      nc('Kho nội bộ (thực tế)',pi),nc('Kho hóa đơn',vi),
      {h:'Chênh lệch',c:'num',f:r=>{const d=pi(r)-vi(r);return d===0?'<span class="muted">0</span>':`<span class="${d>0?'pos':'neg'}">${d>0?'+':''}${fmtNum(d)}</span>`},x:r=>pi(r)-vi(r)},
      nc('Tối thiểu',r=>r.minStock||0),nc('Giá trị thực tế (VND)',r=>pi(r)*(r.price||0),fmtMoney),
      {h:'Trạng thái',f:r=>badge(...itemStatus(r,pi(r))),x:r=>itemStatus(r,pi(r))[1]},
      actCol(r=>w&&pi(r)>0?`<button class="btn sm" data-act="xfer-one" data-id="${r.id}" title="Chuyển từ Kho nội bộ sang Kho hóa đơn">→ HĐ</button>`:'')];
    const tv=rows.reduce((a,r)=>a+pi(r)*(r.price||0),0),tp=rows.reduce((a,r)=>a+pi(r),0),ti=rows.reduce((a,r)=>a+vi(r),0);
    return table(cols,rows,{foot:`<tr><td colspan="4">Tổng</td><td class="num">${fmtNum(tp)}</td><td class="num">${fmtNum(ti)}</td><td class="num">${fmtNum(tp-ti)}</td><td></td><td class="num">${fmtMoney(tv)}</td><td colspan="2"></td></tr>`});
  }};

/* ---- chuyển tồn từ Kho nội bộ sang Kho hóa đơn ---- */
function pushXfer(lines,wh,note){db.stocktakes.push({id:uid('kk'),code:nextCode('KK'),date:todayStr(),warehouseId:wh,note,lines,createdBy:session?.name||'system',createdAt:Date.now()})}
ACT['xfer-one']=el=>{
  const it=itemOf(el.dataset.id);if(!it)return;const m=stockMap(),X=m[it.id]?.[W_INT]||0,Y=m[it.id]?.[W_INV]||0,def=Math.max(0,X-Y);
  modal('Chuyển sang Kho hóa đơn',`<form id="mf" data-submit="xfer-one" data-id="${it.id}"><p class="note"><b>${esc(itemLabel(it))}</b></p>
    <div class="kpis sm" style="margin-bottom:12px">${kpi('Kho nội bộ (thực tế)',fmtNum(X),'','info')}${kpi('Kho hóa đơn',fmtNum(Y),'','acc')}${kpi('Sau khi chuyển: Kho hóa đơn',`<span id="xf-res">${fmtNum(Y+def)}</span>`,'','ok')}</div>
    <div class="fg">${inp('qty','Số lượng chuyển sang Kho hóa đơn',def,{type:'number',step:'1',min:1,req:1,attrs:'data-xq'})}
    <label class="f"><span>Kho nội bộ sau khi chuyển</span><select class="in" name="deduct"><option value="">Giữ nguyên (hàng thực tế vẫn còn)</option><option value="1">Trừ đi số lượng chuyển</option></select></label></div></form>`,{footer:cancelBtn+'<button class="btn primary" form="mf">Chuyển</button>'});
  T={xfY:Y};
};
document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.xq!==undefined&&T&&T.xfY!==undefined){const r=$('#xf-res');if(r)r.textContent=fmtNum(T.xfY+Math.round(num(el.value)))}});
SUB['xfer-one']=form=>{
  const d=fd(form),it=itemOf(form.dataset.id),qty=num(d.qty),m=stockMap(),X=m[it.id]?.[W_INT]||0,Y=m[it.id]?.[W_INV]||0;
  if(qty<=0||qty!==Math.round(qty))return toast('Số lượng chuyển phải là số nguyên lớn hơn 0.','error');
  if(d.deduct&&qty>X)return toast('Số lượng chuyển lớn hơn tồn Kho nội bộ.','error');
  if(transact(()=>{
    pushXfer([{itemId:it.id,system:Y,actual:Y+qty}],W_INV,`Chuyển từ Kho nội bộ sang Kho hóa đơn: ${it.sku} (+${qty})`);
    if(d.deduct)pushXfer([{itemId:it.id,system:X,actual:X-qty}],W_INT,`Chuyển từ Kho nội bộ sang Kho hóa đơn: ${it.sku} (−${qty})`);
  }))done('Đã chuyển sang Kho hóa đơn');
};
ACT['xfer-all']=()=>{
  const {rows,pi,vi}=stockRows(),up=rows.filter(r=>pi(r)>vi(r)),any=rows.filter(r=>pi(r)!==vi(r));
  if(!any.length)return toast('Các mặt hàng đang lọc đã khớp giữa hai kho.','warn');
  modal('Chuyển tất cả sang Kho hóa đơn',`<form id="mf" data-submit="xfer-all"><p class="note">Áp dụng cho <b>${fmtNum(rows.length)}</b> mặt hàng đang lọc. <b>Kho nội bộ được giữ nguyên</b>, chỉ Kho hóa đơn thay đổi.</p>
    <div class="fg">${sel('mode','Cách chuyển',[['raise',`Nâng Kho hóa đơn lên bằng Kho nội bộ – chỉ ${fmtNum(up.length)} mặt hàng đang thiếu hóa đơn`],['set',`Đặt Kho hóa đơn đúng bằng Kho nội bộ – ${fmtNum(any.length)} mặt hàng (kể cả giảm khi hóa đơn nhiều hơn thực tế)`]],'raise',{full:1})}</div></form>`,{footer:cancelBtn+'<button class="btn primary" form="mf">Chuyển</button>'});
};
SUB['xfer-all']=form=>{
  const d=fd(form),{rows,pi,vi}=stockRows(),lines=[];
  rows.forEach(r=>{const X=pi(r),Y=vi(r);if(X===Y)return;if(d.mode==='raise'&&X<Y)return;lines.push({itemId:r.id,system:Y,actual:X})});
  if(!lines.length)return toast('Không có mặt hàng nào cần chuyển.','warn');
  if(transact(()=>{pushXfer(lines,W_INV,`Chuyển từ Kho nội bộ sang Kho hóa đơn (${lines.length} mặt hàng)`)}))done(`Đã chuyển ${lines.length} mặt hàng sang Kho hóa đơn`);
};

/* ---- kiểm kê ---- */
const diffHtml=(a,sys)=>{if(a===undefined||a==='')return'<span class="muted">—</span>';const d=Math.round((num(a)-sys)*1000)/1000;return `<span class="${d>0?'pos':d<0?'neg':''}">${d>0?'+':''}${fmtNum(d)}</span>`};
PAGES['wh/stocktake']={t:'Kiểm kê',
  head(){return `<div class="bar">${fSel('wh','Kho',whOpts())}<div class="sp"></div><button class="btn" data-act="export" data-name="kiem-ke">⬇ Excel</button>${can('write')?'<button class="btn acc" data-act="take-new">＋ Tạo phiếu kiểm kê</button>':''}</div>`},
  tbl(){
    const f=F(),rows=db.stocktakes.filter(s=>!f.wh||s.warehouseId===f.wh).sort(byDateDesc);
    const dsum=(s,sg)=>s.lines.reduce((a,l)=>{const d=l.actual-l.system;return a+(sg>0?Math.max(d,0):Math.min(d,0))},0);
    return table([{h:'Số phiếu',f:r=>`<button class="lnk" data-act="take-view" data-id="${r.id}">${esc(r.code)}</button>`,x:r=>r.code},{h:'Ngày',f:r=>fmtDate(r.date),x:r=>r.date},{h:'Ghi nhận kho',f:whBadges,x:whsLabel},nc('Số mặt hàng',r=>r.lines.length),nc('Thừa',r=>dsum(r,1)),nc('Thiếu',r=>dsum(r,-1)),{h:'Người lập',f:r=>esc(r.createdBy||'')},{h:'Ghi chú',f:r=>esc(r.note||'')},actCol(r=>`<button class="btn sm" data-act="take-view" data-id="${r.id}">Xem</button>`)],rows,{empty:'Chưa có phiếu kiểm kê.'});
  }};
function takeBody(){
  return `<div class="fg3"><label class="f"><span>Kho kiểm kê (nội bộ = đếm thực tế; hóa đơn = đối chiếu sổ hóa đơn)</span><select class="in" data-tk="warehouseId">${db.warehouses.map(w=>`<option value="${w.id}" ${w.id===T.warehouseId?'selected':''}>${esc(w.name)}</option>`).join('')}</select></label><label class="f"><span>Ngày kiểm kê</span><input class="in" type="date" data-tk="date" value="${T.date}"></label><label class="f"><span>Danh mục</span><select class="in" data-tk="cat">${catOpts('Tất cả danh mục').map(([v,l])=>`<option value="${v}" ${v===T.cat?'selected':''}>${esc(l)}</option>`).join('')}</select></label><label class="f full"><span>Ghi chú</span><input class="in" data-tk="note" value="${esc(T.note)}"></label></div><p class="note">Nhập số lượng đếm thực tế. Dòng để trống sẽ không được kiểm kê. Chênh lệch sẽ được ghi nhận thành điều chỉnh tồn kho.</p><div id="take"></div>`;
}
function renderTake(){
  const m=stockMap(T.date),its=db.items.filter(i=>!T.cat||i.categoryId===T.cat).sort((a,b)=>a.sku.localeCompare(b.sku));
  $('#take').innerHTML=its.length?`<div class="tw" style="max-height:50vh"><table class="t"><thead><tr><th>Mã</th><th>Tên hàng</th><th>ĐVT</th><th class="num">Hệ thống</th><th class="num">Thực tế</th><th class="num">Chênh lệch</th></tr></thead><tbody>${its.map(i=>{const sys=m[i.id]?.[T.warehouseId]||0,a=T.actual[i.id];return `<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td>${esc(i.unit)}</td><td class="num">${fmtNum(sys)}</td><td class="num"><input class="in take-in" type="number" step="1" min="0" data-t="${i.id}" data-sys="${sys}" value="${a??''}"></td><td class="num" id="df-${i.id}">${diffHtml(a,sys)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Không có hàng hóa.</div>';
}
ACT['take-new']=()=>{T={warehouseId:W_INT,date:todayStr(),cat:'',note:'',actual:{}};modal('Tạo phiếu kiểm kê',takeBody(),{size:'wide',footer:cancelBtn+'<button class="btn primary" data-act="take-save">💾 Lưu kiểm kê</button>'});renderTake()};
ACT['take-save']=()=>{
  const m=stockMap(T.date),lines=[];
  db.items.forEach(i=>{const a=T.actual[i.id];if(a===undefined||a==='')return;if(!T.cat||i.categoryId===T.cat)lines.push({itemId:i.id,system:m[i.id]?.[T.warehouseId]||0,actual:num(a)})});
  if(!lines.length)return toast('Chưa nhập số lượng thực tế nào.','error');
  if(lines.some(l=>l.actual!==Math.round(l.actual)))return toast('Số lượng kiểm kê phải là số nguyên.','error');
  if(transact(()=>{db.stocktakes.push({id:uid('kk'),code:nextCode('KK'),date:T.date,warehouseId:T.warehouseId,note:T.note,lines,createdBy:session.name,createdAt:Date.now()})}))done('Đã ghi nhận kiểm kê và điều chỉnh tồn kho');
};
ACT['take-view']=el=>{
  const s=by(db.stocktakes,el.dataset.id);if(!s)return;
  modal(`Kiểm kê ${s.code}`,`<p class="note">Ngày ${fmtDate(s.date)} · Kho ${esc(whName(s.warehouseId))} · Người lập: ${esc(s.createdBy||'')}${s.note?' · '+esc(s.note):''}</p>`+miniTable(['Mã','Tên hàng','Hệ thống','Thực tế','Chênh lệch'],s.lines.map(l=>{const it=itemOf(l.itemId),d=Math.round((l.actual-l.system)*1000)/1000;return `<tr><td>${esc(it?.sku||'?')}</td><td>${esc(it?.name||'(đã xoá)')}</td><td class="num">${fmtNum(l.system)}</td><td class="num">${fmtNum(l.actual)}</td><td class="num"><span class="${d>0?'pos':d<0?'neg':''}">${d>0?'+':''}${fmtNum(d)}</span></td></tr>`})),{footer:`${can('write')?`<button class="btn danger" data-act="take-del" data-id="${s.id}">Xoá phiếu</button>`:''}<div class="sp"></div><button class="btn" data-act="take-xls" data-id="${s.id}">⬇ Excel</button><button class="btn" data-act="close">Đóng</button>`,size:'mid'});
};
ACT['take-xls']=el=>{const s=by(db.stocktakes,el.dataset.id);xlsxSave([['Mã','Tên hàng','Hệ thống','Thực tế','Chênh lệch'],...s.lines.map(l=>[itemOf(l.itemId)?.sku,itemOf(l.itemId)?.name,l.system,l.actual,l.actual-l.system])],`kiem-ke-${s.code}`)};
ACT['take-del']=el=>{const s=by(db.stocktakes,el.dataset.id);if(confirm(`Xoá phiếu kiểm kê ${s.code}? Điều chỉnh tồn kho sẽ bị hoàn lại.`))transact(()=>{db.stocktakes=db.stocktakes.filter(x=>x.id!==s.id)})&&done('Đã xoá')};

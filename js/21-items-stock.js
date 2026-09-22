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
let ITEM_LAST={categoryId:'',unit:'Cái'};
function itemForm(id){
  const it=id?itemOf(id):{sku:'',name:'',categoryId:ITEM_LAST.categoryId&&by(db.categories,ITEM_LAST.categoryId)?ITEM_LAST.categoryId:db.categories[0]?.id,unit:ITEM_LAST.unit||'Cái',minStock:0,price:0,note:''};
  modal(id?'Sửa hàng hóa':'Thêm hàng hóa',`<form id="mf" data-submit="item-save" data-id="${id||''}"><div class="fg">${inp('sku','Mã hàng (SKU)',it.sku,{ph:'Để trống để tự sinh'})}${inp('name','Tên hàng hóa',it.name,{req:1})}${sel('categoryId','Danh mục',db.categories.map(c=>[c.id,c.name+(c.isIT?' (IT – quản lý theo Serial)':'')]),it.categoryId)}${inp('unit','Đơn vị tính',it.unit,{req:1})}${inp('minStock','Tồn tối thiểu (cảnh báo)',it.minStock,{type:'text',attrs:'inputmode="numeric" data-num="int"'})}${inp('price','Đơn giá tham chiếu (VND)',fmtPrice(it.price),{type:'text',attrs:'inputmode="decimal" data-num="money"'})}${txa('note','Ghi chú',it.note,{full:1})}</div></form>`,
    {footer:cancelBtn+(id?'':'<button type="button" class="btn" data-act="item-save-again">💾 Lưu &amp; Thêm</button>')+`<button class="btn primary" form="mf">${id?'Lưu hàng hóa':'Lưu &amp; Thoát'}</button>`});
}
ACT['item-new']=()=>itemForm();ACT['item-edit']=el=>itemForm(el.dataset.id);
ACT['item-del']=el=>{const id=el.dataset.id;if(itemUsed(id))return toast('Hàng hóa đã phát sinh giao dịch, không thể xoá.','error');if(confirm('Xoá hàng hóa này?'))transact(()=>{db.items=db.items.filter(i=>i.id!==id)})&&done('Đã xoá')};
function saveItemCore(form){
  const d=fd(form),id=form.dataset.id,sku=(d.sku||'').trim();
  if(sku&&db.items.some(x=>x.sku.toLowerCase()===sku.toLowerCase()&&x.id!==id)){toast('Mã hàng đã tồn tại.','error');return null}
  const oldCat=id?itemOf(id)?.categoryId:null;
  const ok=transact(()=>{let it=id?itemOf(id):null;if(!it){it={id:uid('it')};it.sku=sku||autoSku();db.items.push(it)}else if(sku)it.sku=sku;
    Object.assign(it,{name:d.name.trim(),categoryId:d.categoryId,unit:d.unit.trim(),minStock:Math.round(num(d.minStock)),price:r2(num(d.price)),note:d.note||''})});
  if(!ok)return null;
  ITEM_LAST={categoryId:d.categoryId,unit:d.unit.trim()||'Cái'};
  return{oldCat,newCat:d.categoryId};
}
SUB['item-save']=form=>{
  const r=saveItemCore(form);if(!r)return;
  done(r.oldCat&&r.oldCat!==r.newCat?`Đã chuyển sang danh mục "${nm(db.categories,r.newCat)}" và gỡ khỏi "${nm(db.categories,r.oldCat)}"`:undefined);
};
ACT['item-save-again']=()=>{
  const form=document.getElementById('mf'),r=saveItemCore(form);if(!r)return;
  rerender();toast('Đã lưu. Tiếp tục thêm hàng hóa mới…');
  itemForm();
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
  head(){const w=can('write');return `<div class="bar">${fSearch('Tìm mã / tên hàng…')}${fSel('cat','Danh mục',catOpts())}${fSel('st','Trạng thái',[['','Mọi trạng thái'],['out','Hết hàng'],['low','Sắp hết'],['ok','Còn hàng'],['diff','Hóa đơn ≠ thực tế']])}${fSel('view','Xem theo kho',[['both','Cả hai kho'],['int','Kho nội bộ (thực tế)'],['inv','Kho hóa đơn']])}<div class="sp"></div>${w?'<button class="btn" data-act="xfer-sel" title="Chuyển kho các mặt hàng đã tick">⇄ Chuyển kho các mục đã chọn</button><button class="btn" data-act="xfer-all" title="Chuyển kho tất cả mặt hàng đang lọc">⇄ Chuyển tất cả (đang lọc)</button><button class="btn" data-act="up-stock">⬆ Upload file Tồn kho</button>':''}<button class="btn" data-act="xfer-hist">🕘 Lịch sử chuyển kho</button><button class="btn" data-act="export" data-name="ton-kho">⬇ Excel</button></div><p class="note"><b>Kho nội bộ</b> là tồn hàng thực tế (dùng để cảnh báo hết hàng, tính giá trị tồn). <b>Kho hóa đơn</b> là số lượng theo hóa đơn nhập / xuất. Dùng bộ lọc <b>Xem theo kho</b> để chỉ xem một kho. Nhập nhầm kho? Bấm <b>⇄ Chuyển kho</b> ở từng dòng (hoặc tick nhiều dòng) để chuyển sang đúng kho; chuyển nhầm thì hoàn tác trong <b>Lịch sử chuyển kho</b>.</p>`},
  tbl(){
    const {rows,pi,vi}=stockRows(),w=can('write'),view=F().view||'both';
    const whCols=view==='int'?[nc('Kho nội bộ (thực tế)',pi)]:view==='inv'?[nc('Kho hóa đơn',vi)]:[nc('Kho nội bộ (thực tế)',pi),nc('Kho hóa đơn',vi)];
    const cols=[...(w?[{h:'<input type="checkbox" data-act="xf-pickall" aria-label="Chọn tất cả">',noexp:1,f:r=>`<input type="checkbox" class="xfpick" value="${r.id}">`}]:[]),{h:'Mã hàng',f:r=>`<b>${esc(r.sku)}</b>`,x:r=>r.sku},{h:'Tên hàng hóa',f:r=>esc(r.name),x:r=>r.name},{h:'Danh mục',f:r=>esc(nm(db.categories,r.categoryId))},{h:'ĐVT',f:r=>esc(r.unit)},
      ...whCols,
      nc('Tối thiểu',r=>r.minStock||0),nc('Giá trị thực tế (VND)',r=>amt(pi(r),r.price),fmtMoney),
      {h:'Trạng thái',f:r=>badge(...itemStatus(r,pi(r))),x:r=>itemStatus(r,pi(r))[1]},
      actCol(r=>w&&(pi(r)>0||vi(r)>0)?`<button class="btn sm" data-act="xfer-one" data-id="${r.id}" title="Chuyển sang kho khác">⇄ Chuyển kho</button>`:'')];
    const tv=rows.reduce((a,r)=>a+amt(pi(r),r.price),0),lead=(w?1:0)+4;
    const whFoot=view==='int'?`<td class="num">${fmtNum(rows.reduce((a,r)=>a+pi(r),0))}</td>`:view==='inv'?`<td class="num">${fmtNum(rows.reduce((a,r)=>a+vi(r),0))}</td>`:`<td class="num">${fmtNum(rows.reduce((a,r)=>a+pi(r),0))}</td><td class="num">${fmtNum(rows.reduce((a,r)=>a+vi(r),0))}</td>`;
    return table(cols,rows,{foot:`<tr><td colspan="${lead}">Tổng</td>${whFoot}<td></td><td class="num">${fmtMoney(tv)}</td><td colspan="2"></td></tr>`});
  }};

/* ---- CHUYỂN KHO: sửa trường hợp nhập nhầm kho (Kho nội bộ ⇄ Kho hóa đơn) ----
   Trừ ở kho nguồn, cộng ở kho đích. Lưu thành 2 dòng điều chỉnh cùng mã nhóm để xem lại / hoàn tác. */
const XF_DIRS=[[W_INT+'>'+W_INV,'Kho nội bộ → Kho hóa đơn'],[W_INV+'>'+W_INT,'Kho hóa đơn → Kho nội bộ']];
function pushTransfer(itemId,from,to,qty,grp,note){
  const base={date:todayStr(),itemId,createdBy:session?.name||'system',kind:'transfer',grp,from,to,note:note||'',reason:`Chuyển kho: ${whName(from)} → ${whName(to)}`};
  db.adjustments.push({id:uid('adj'),...base,warehouseId:from,qty:-qty});
  db.adjustments.push({id:uid('adj'),...base,warehouseId:to,qty:qty});
}
const xfStock=(m,id,w)=>m[id]?.[w]||0;
ACT['xf-pickall']=el=>$$('.xfpick').forEach(c=>c.checked=el.checked);
ACT['xfer-one']=el=>{
  const it=itemOf(el.dataset.id);if(!it)return;const m=stockMap(),X=xfStock(m,it.id,W_INT),Y=xfStock(m,it.id,W_INV);
  T={xf:{X,Y}};
  modal('Chuyển kho',`<form id="mf" data-submit="xfer-one" data-id="${it.id}"><p class="note"><b>${esc(itemLabel(it))}</b></p>
    <div class="kpis sm" style="margin-bottom:12px">${kpi('Kho nội bộ (thực tế)',`<span id="xf-a">${fmtNum(X)}</span>`,'','info')}${kpi('Kho hóa đơn',`<span id="xf-b">${fmtNum(Y)}</span>`,'','acc')}</div>
    <div class="fg">${sel('dir','Chuyển từ → đến',XF_DIRS,X>0||Y<=0?XF_DIRS[0][0]:XF_DIRS[1][0],{full:1,attrs:'data-xf'})}
    ${inp('qty','Số lượng chuyển (tối đa: tồn của kho nguồn)',X>0||Y<=0?X:Y,{type:'text',req:1,attrs:'data-xf data-num="int" inputmode="numeric"'})}
    ${inp('note','Ghi chú (không bắt buộc)','',{ph:'VD: nhập nhầm kho'})}</div></form>`,{footer:cancelBtn+'<button class="btn primary" form="mf">Chuyển kho</button>'});
  xfUpdate();
};
function xfUpdate(){
  const f=$('form[data-submit=xfer-one]');if(!f||!T||!T.xf)return;
  const [from,to]=f.elements.dir.value.split('>'),q=Math.round(num(f.elements.qty.value)),{X,Y}=T.xf,A=from===W_INT?X:Y;
  const a=from===W_INT?X-q:X+q,b=from===W_INT?Y+q:Y-q;
  $('#xf-a').textContent=fmtNum(a);$('#xf-b').textContent=fmtNum(b);
  $('#xf-a').style.color=a<0?'var(--bad)':'';$('#xf-b').style.color=b<0?'var(--bad)':'';
  f.elements.qty.max=A;
}
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.xf!==undefined)xfUpdate()});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.xf!==undefined){const f=e.target.form;if(e.target.name==='dir'&&T&&T.xf){const [from]=e.target.value.split('>');f.elements.qty.value=from===W_INT?T.xf.X:T.xf.Y}xfUpdate()}});
SUB['xfer-one']=form=>{
  const d=fd(form),it=itemOf(form.dataset.id),[from,to]=d.dir.split('>'),qty=num(d.qty);
  if(qty<=0||qty!==Math.round(qty))return toast('Số lượng chuyển phải là số nguyên lớn hơn 0.','error');
  if(qty>xfStock(stockMap(),it.id,from))return toast(`Số lượng chuyển lớn hơn tồn của ${whName(from)}.`,'error');
  if(transact(()=>{pushTransfer(it.id,from,to,qty,uid('tf'),d.note)}))done(`Đã chuyển ${fmtNum(qty)} ${it.unit} từ ${whName(from)} sang ${whName(to)}`);
};
/* chuyển nhiều mặt hàng: toàn bộ tồn của kho nguồn */
function xfBulk(ids,label){
  if(!ids.length)return toast('Chưa có mặt hàng nào để chuyển.','warn');
  T={xfIds:ids};
  modal('Chuyển kho nhiều mặt hàng',`<form id="mf" data-submit="xfer-bulk"><p class="note">${label}: <b>${fmtNum(ids.length)}</b> mặt hàng. Mỗi mặt hàng được chuyển <b>toàn bộ số lượng đang có ở kho nguồn</b> sang kho đích.</p>
    <div class="fg">${sel('dir','Chuyển từ → đến',XF_DIRS,XF_DIRS[0][0],{full:1,attrs:'data-xfb'})}${inp('note','Ghi chú (không bắt buộc)','',{ph:'VD: nhập nhầm kho',full:1})}</div><p class="note" id="xfb-info"></p></form>`,{footer:cancelBtn+'<button class="btn primary" form="mf">Chuyển kho</button>'});
  xfbUpdate();
}
function xfbUpdate(){
  const f=$('form[data-submit=xfer-bulk]');if(!f||!T||!T.xfIds)return;
  const [from]=f.elements.dir.value.split('>'),m=stockMap(),list=T.xfIds.filter(id=>xfStock(m,id,from)>0),tot=list.reduce((a,id)=>a+xfStock(m,id,from),0);
  $('#xfb-info').innerHTML=`Sẽ chuyển <b>${fmtNum(list.length)}</b> mặt hàng có tồn ở ${esc(whName(from))}, tổng <b>${fmtNum(tot)}</b> số lượng.`;
}
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.xfb!==undefined)xfbUpdate()});
ACT['xfer-sel']=()=>{const ids=$$('.xfpick:checked').map(c=>c.value);if(!ids.length)return toast('Hãy tick các mặt hàng cần chuyển ở cột đầu bảng.','warn');xfBulk(ids,'Các mặt hàng đã tick')};
ACT['xfer-all']=()=>xfBulk(stockRows().rows.map(r=>r.id),'Tất cả mặt hàng đang lọc');
SUB['xfer-bulk']=form=>{
  const d=fd(form),[from,to]=d.dir.split('>'),m=stockMap(),list=T.xfIds.filter(id=>xfStock(m,id,from)>0);
  if(!list.length)return toast(`Không có mặt hàng nào còn tồn ở ${whName(from)}.`,'warn');
  const grp=uid('tf');
  if(transact(()=>{list.forEach(id=>pushTransfer(id,from,to,xfStock(m,id,from),grp,d.note))}))done(`Đã chuyển ${list.length} mặt hàng từ ${whName(from)} sang ${whName(to)}`);
};
/* lịch sử + hoàn tác */
ACT['xfer-hist']=()=>{
  const g={};db.adjustments.filter(a=>a.kind==='transfer'&&a.qty>0).forEach(a=>{(g[a.grp]??=[]).push(a)});
  const rows=Object.entries(g).map(([grp,ls])=>({grp,ls,date:ls[0].date,from:ls[0].from,to:ls[0].to,by:ls[0].createdBy,note:ls[0].note})).sort((a,b)=>b.date.localeCompare(a.date));
  const w=can('write');
  modal('Lịch sử chuyển kho',rows.length?`<div class="tw" style="max-height:60vh"><table class="t"><thead><tr><th>Ngày</th><th>Chuyển</th><th>Mặt hàng</th><th class="num">SL</th><th>Người thực hiện</th><th>Ghi chú</th><th></th></tr></thead><tbody>${rows.slice(0,200).map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${esc(whName(r.from))} → ${esc(whName(r.to))}</td><td>${r.ls.length===1?esc(itemLabel(itemOf(r.ls[0].itemId)||{sku:'?',name:'(đã xoá)'})):`${r.ls.length} mặt hàng`}</td><td class="num">${fmtNum(r.ls.reduce((a,x)=>a+x.qty,0))}</td><td>${esc(r.by||'')}</td><td>${esc(r.note||'')}</td><td class="act">${w?`<button class="btn sm danger" data-act="xfer-undo" data-grp="${r.grp}">Hoàn tác</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Chưa có lần chuyển kho nào.</div>',{size:'wide',footer:'<button class="btn" data-act="close">Đóng</button>'});
};
ACT['xfer-undo']=el=>{
  const grp=el.dataset.grp;if(!confirm('Hoàn tác lần chuyển kho này? Số lượng sẽ trả về kho ban đầu.'))return;
  if(transact(()=>{db.adjustments=db.adjustments.filter(a=>a.grp!==grp)}))done('Đã hoàn tác chuyển kho');
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
  $('#take').innerHTML=its.length?`<div class="tw" style="max-height:50vh"><table class="t"><thead><tr><th>Mã</th><th>Tên hàng</th><th>ĐVT</th><th class="num">Hệ thống</th><th class="num">Thực tế</th><th class="num">Chênh lệch</th></tr></thead><tbody>${its.map(i=>{const sys=m[i.id]?.[T.warehouseId]||0,a=T.actual[i.id];return `<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td>${esc(i.unit)}</td><td class="num">${fmtNum(sys)}</td><td class="num"><input class="in take-in" type="text" inputmode="numeric" data-num="int" data-t="${i.id}" data-sys="${sys}" value="${a??''}"></td><td class="num" id="df-${i.id}">${diffHtml(a,sys)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Không có hàng hóa.</div>';
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

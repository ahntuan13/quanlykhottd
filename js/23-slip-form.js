/* 23-slip-form.js – Form lập phiếu nhập/xuất, xem/in/PDF/xoá phiếu, trang Export PDF */
'use strict';
(self.__mods=self.__mods||[]).push('23-slip-form');

/* =====================================================================
   FORM PHIẾU NHẬP / XUẤT
   ===================================================================== */
const newLine=()=>({itemId:'',itemText:'',qty:1,price:0,serialsText:'',warranty:'',assetIds:[]});
const serialsOf=l=>(l.serialsText||'').split(/\n|,|;/).map(s=>s.trim()).filter(Boolean);
function itemByText(t,exact){
  t=(t||'').trim();if(!t)return null;
  let x=db.items.find(i=>itemLabel(i)===t);if(x||exact)return x||null;
  x=db.items.find(i=>i.sku.toLowerCase()===t.toLowerCase());if(x)return x;
  const c=db.items.filter(i=>i.name.toLowerCase()===t.toLowerCase());return c.length===1?c[0]:null;
}
function slipOpen(kind,id,preset){
  const rec=id?(kind==='receipt'?by(db.receipts,id):by(db.issues,id)):null;
  if(!db.items.length)return toast('Chưa có hàng hóa. Hãy thêm hàng hóa trước.','warn');
  const mode=rec?modeOf(slipWhs(rec)):(kind==='issue'&&preset==='retail'?'int':'both');
  const dv=db.company.defaultVatRate||0;
  if(kind==='receipt')S={kind,id:id||null,date:rec?.date||todayStr(),mode,supplierId:rec?.supplierId||'',ref:rec?.ref||'',invoiceDate:rec?.invoiceDate||'',
    vatRate:rec?(rec.vatRate??0):dv,paymentMethod:rec?(rec.paymentMethod||'TM/CK'):'TM/CK',deliveryAddress:rec?(rec.deliveryAddress||''):(db.company.address||''),note:rec?.note||'',
    lines:rec?rec.lines.map(l=>({itemId:l.itemId,itemText:'',qty:l.qty,price:l.price||0,serialsText:(l.serials||[]).join('\n'),warranty:l.warranty||'',assetIds:[]})):[newLine()]};
  else{const orig={};if(rec)rec.lines.forEach(l=>{orig[l.itemId]=(orig[l.itemId]||0)+(+l.qty||0)});
    S={kind,id:id||null,date:rec?.date||todayStr(),mode,origWhs:rec?slipWhs(rec):[],orig,targetType:rec?.targetType||preset||'retail',targetId:rec?.targetId||'',targetText:rec?targetLabel(rec.targetType,rec.targetId):'',receiver:rec?.receiver||'',ref:rec?.ref||'',invoiceDate:rec?.invoiceDate||'',
    vatRate:rec?(rec.vatRate??0):dv,paymentMethod:rec?(rec.paymentMethod||'TM/CK'):'TM/CK',deliveryAddress:rec?(rec.deliveryAddress||''):'',note:rec?.note||'',
    lines:rec?rec.lines.map(l=>({itemId:l.itemId,itemText:'',qty:l.qty,price:l.price||0,serialsText:'',warranty:'',assetIds:[...(l.assetIds||[])]})):[newLine()]}}
  modal(`${id?'Sửa':'Tạo'} ${kind==='receipt'?'phiếu nhập kho':'phiếu xuất kho'}${rec?' – '+rec.code:''}`,slipBody(),{size:'wide',footer:cancelBtn+'<button class="btn primary" data-act="slip-save">💾 Lưu phiếu</button>'});
  renderLines();
}
const sWhs=()=>modeWhs(S.mode),sInt=()=>sWhs().includes(W_INT);
function targetField(){
  const p=S.targetType==='project';
  return `<label class="f"><span>${p?'Khách hàng / Dự án':'Khách lẻ'} <small class="muted">– bấm để chọn hoặc gõ tên</small></span><input class="in" data-slip="targetText" data-cb="${S.targetType}" autocomplete="off" value="${esc(S.targetText)}" placeholder="${p?'Gõ mã / tên khách hàng để tìm…':'Gõ tên khách lẻ (chưa có sẽ tự thêm)'}"></label>`;
}
function slipBody(){
  const isR=S.kind==='receipt';
  const desc=isR
    ?[['both','Cả hai kho','Hàng có hóa đơn đầu vào: tăng cả tồn hóa đơn và tồn thực tế'],['int','Chỉ Kho nội bộ','Hàng nhập thực tế, không có hóa đơn'],['inv','Chỉ Kho hóa đơn','Chỉ ghi nhận hóa đơn đầu vào, hàng chưa về / không nhập kho thực tế']]
    :[['both','Cả hai kho','Xuất hàng kèm hóa đơn đầu ra: giảm cả tồn hóa đơn và tồn thực tế'],['int','Chỉ Kho nội bộ','Xuất hàng thực tế, không xuất hóa đơn'],['inv','Chỉ Kho hóa đơn','Chỉ xuất hóa đơn, không đổi tồn hàng thực tế']];
  const modes=`<div class="f full"><span>Ghi nhận vào kho</span><div class="modes">${desc.map(([v,l,d])=>`<label class="mode ${S.mode===v?'on':''}"><span><input type="radio" name="whmode" value="${v}" data-slip="mode" ${S.mode===v?'checked':''}> <b>${l}</b></span><small>${d}</small></label>`).join('')}</div></div>`;
  const inv=`<label class="f"><span>Số hóa đơn (nếu có)</span><input class="in" data-slip="ref" value="${esc(S.ref)}" placeholder="VD: 0001234"></label><label class="f"><span>Ngày hóa đơn</span><input class="in" type="date" data-slip="invoiceDate" value="${esc(S.invoiceDate)}"></label>
    <label class="f"><span>Thuế suất GTGT (%)</span><input class="in" type="text" inputmode="decimal" data-num="money" data-slip="vatRate" value="${fmtPrice(S.vatRate||0)}" placeholder="0"></label>
    <label class="f"><span>Hình thức thanh toán</span><select class="in" data-slip="paymentMethod"><option value="TM/CK" ${S.paymentMethod==='TM/CK'?'selected':''}>TM/CK</option><option value="Tiền mặt" ${S.paymentMethod==='Tiền mặt'?'selected':''}>Tiền mặt</option><option value="Chuyển khoản" ${S.paymentMethod==='Chuyển khoản'?'selected':''}>Chuyển khoản</option></select></label>
    <label class="f full"><span>Địa chỉ giao hàng (in trên phiếu)</span><input class="in" data-slip="deliveryAddress" value="${esc(S.deliveryAddress)}" placeholder="${isR?'Mặc định lấy địa chỉ công ty':'Tự lấy theo địa chỉ khách hàng/dự án khi chọn'}"></label>`;
  const date=`<label class="f"><span>Ngày ${isR?'nhập':'xuất'}</span><input class="in" type="date" data-slip="date" value="${S.date}"></label>`;
  const head=isR
    ?`${date}<label class="f"><span>Nhà cung cấp</span><select class="in" data-slip="supplierId"><option value="">— Không có / tồn đầu kỳ —</option>${db.suppliers.map(s=>`<option value="${s.id}" ${s.id===S.supplierId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>${inv}`
    :`${date}<label class="f"><span>Đối tượng nhận</span><select class="in" data-slip="targetType"><option value="retail" ${S.targetType==='retail'?'selected':''}>Khách lẻ</option><option value="project" ${S.targetType==='project'?'selected':''}>Khách hàng / Dự án</option></select></label><div id="tgt" class="contents">${targetField()}</div><label class="f"><span>Người nhận hàng</span><input class="in" data-slip="receiver" value="${esc(S.receiver)}"></label>${inv}`;
  return `<div class="fg3">${head}${modes}<label class="f full"><span>${isR?'Ghi chú':'Mục đích / Ghi chú'}</span><input class="in" data-slip="note" value="${esc(S.note)}"></label></div>
  <div class="lh"><b>Danh sách hàng hóa</b><button type="button" class="btn sm" data-act="ln-add">＋ Thêm dòng</button></div><div id="lines"></div><div class="tot" id="tot"></div>`;
}
const availIn=(it,w,m)=>{let a=(m||stockMap())[it.id]?.[w]||0;if(S.id&&S.kind==='issue'&&S.origWhs.includes(w))a+=S.orig[it.id]||0;return a};
function availOf(l){const it=itemOf(l.itemId);if(!it)return 0;const m=stockMap();return Math.min(...sWhs().map(w=>availIn(it,w,m)))}
function renderLines(){
  const isR=S.kind==='receipt',m=stockMap();
  const head=isR
    ?'<div class="ln-head isr"><span>Hàng hóa</span><span>ĐVT</span><span>Số lượng</span><span>Đơn giá (VND)</span><span class="r">Thành tiền (VND)</span><span></span></div>'
    :'<div class="ln-head isx"><span>Hàng hóa</span><span>ĐVT</span><span>Tồn kho</span><span>Số lượng</span><span>Đơn giá (VND)</span><span class="r">Thành tiền (VND)</span><span></span></div>';
  $('#lines').innerHTML=head+S.lines.map((l,i)=>{
    const it=itemOf(l.itemId),isIT=!!(it&&catOf(it.categoryId)?.isIT),tracked=isR?serialsOf(l).length>0:l.assetIds.length>0;
    let avail=0,stkTxt='';if(it&&!isR){const per=sWhs().map(w=>[w,availIn(it,w,m)]);avail=Math.min(...per.map(x=>x[1]));stkTxt=per.map(([w,a])=>`${w===W_INV?'HĐ':'NB'}: ${fmtNum(a)}`).join(' · ')}
    const item=`<input class="in itm" data-cb="item" data-idx="${i}" autocomplete="off" placeholder="Bấm để chọn hoặc gõ mã / tên hàng…" value="${esc(it?itemLabel(it):l.itemText||'')}" data-l="${i}:itemText" aria-label="Hàng hóa">`;
    const qty=`<input class="in" type="text" inputmode="numeric" data-num="int" value="${l.qty}" data-l="${i}:qty" ${tracked?'readonly':''} aria-label="Số lượng">`;
    const del=`<button type="button" class="btn sm danger" data-act="ln-del" data-i="${i}" aria-label="Xoá dòng">✕</button>`;
    const priceIn=`<input class="in" type="text" inputmode="decimal" data-num="money" value="${fmtPrice(l.price)}" data-l="${i}:price" placeholder="Đơn giá (VND)" title="Lấy 2 số lẻ. Có thể gõ phép tính, ví dụ 500000/1.08" aria-label="Đơn giá (VND)">`;
    const amtIn=`<input class="in amt" type="text" inputmode="decimal" data-num="money" value="${fmtPrice(amt(l.qty,l.price))}" data-l="${i}:amt" placeholder="Thành tiền (VND)" title="Gõ thành tiền để tự chia ngược ra đơn giá" aria-label="Thành tiền (VND)">`;
    const main=isR
      ?`<div class="ln-main isr">${item}<span class="unit">${esc(it?.unit||'')}</span>${qty}${priceIn}${amtIn}${del}</div>`
      :`<div class="ln-main isx">${item}<span class="unit">${esc(it?.unit||'')}</span>${it?`<span class="stk ${l.qty>avail?'bad':''}">${stkTxt}</span>`:'<span></span>'}${qty}${priceIn}${amtIn}${del}</div>`;
    let extra='';
    if(it&&isIT&&isR&&sInt())extra=`<div class="ser"><textarea class="in" placeholder="Serial / Service Tag – mỗi dòng một thiết bị (bỏ trống nếu không quản lý theo Serial)" data-l="${i}:serialsText">${esc(l.serialsText)}</textarea><label class="f"><span>Bảo hành (tháng)</span><input class="in" type="number" min="0" value="${esc(l.warranty)}" data-l="${i}:warranty"></label></div>`;
    if(it&&isIT&&!isR&&sInt()){
      const av=db.assets.filter(a=>a.itemId===it.id&&((a.status==='in_stock'&&a.warehouseId===W_INT)||(S.id&&a.issueId===S.id)));
      extra=`<details ${l.assetIds.length?'open':''}><summary>Chọn thiết bị theo Serial (${av.length} khả dụng) · <span class="asum">đã chọn ${l.assetIds.length}</span></summary><div class="alist">${av.map(a=>`<label class="chk"><input type="checkbox" data-as="${i}:${a.id}" ${l.assetIds.includes(a.id)?'checked':''}> ${esc(a.tag)} · ${esc(a.serial||'—')}</label>`).join('')||'<em class="muted">Không có thiết bị khả dụng trong Kho nội bộ.</em>'}</div></details>`;
    }
    return `<div class="ln" data-i="${i}">${main}${extra}</div>`;
  }).join('');
  renderTotals();
}
function renderTotals(){
  const q=S.lines.reduce((a,l)=>a+(+l.qty||0),0),v=S.lines.reduce((a,l)=>a+amt(l.qty,l.price),0);
  const vat=r2(numVN(S.vatRate)||0),grand=vat>0?r2(v+r2(v*vat/100)):v;
  const t=$('#tot');if(t)t.innerHTML=`<span>Tổng số lượng: ${fmtNum(q)}</span><span>Tiền hàng: ${fmtMoney(v)} VND</span>${vat>0?`<span>Sau thuế (${fmtPrice(vat)}%): ${fmtMoney(grand)} VND</span>`:''}`;
}
function syncLineUI(i){
  const l=S.lines[i],row=$(`.ln[data-i="${i}"]`);
  if(row){
    const tracked=S.kind==='receipt'?serialsOf(l).length>0:l.assetIds.length>0,q=$('[data-l$=":qty"]',row);
    if(q){if(tracked||document.activeElement!==q)q.value=l.qty;q.readOnly=tracked}
    const pIn=$('[data-l$=":price"]',row);if(pIn&&document.activeElement!==pIn)pIn.value=fmtPrice(l.price);
    const aIn=$('[data-l$=":amt"]',row);if(aIn&&document.activeElement!==aIn)aIn.value=fmtPrice(amt(l.qty,l.price));
    const sm=$('.asum',row);if(sm)sm.textContent=`đã chọn ${l.assetIds.length}`;
    const st=$('.stk',row);if(st)st.classList.toggle('bad',l.qty>availOf(l));
  }
  renderTotals();
}
function pickItem(i,it){const l=S.lines[i];l.itemId=it.id;l.itemText='';l.assetIds=[];l.serialsText='';if(!l.price)l.price=it.price||0;renderLines()}
function lineInput(el){
  const [is,k]=el.dataset.l.split(':'),i=+is,l=S.lines[i];if(!l)return;
  if(k==='itemText'){l.itemText=el.value;const it=itemByText(el.value,true);if(it&&it.id!==l.itemId)pickItem(i,it);return}
  if(k==='qty')l.qty=num(el.value);
  else if(k==='price')l.price=r2(num(el.value));
  else if(k==='amt'){const av=r2(num(el.value));l.price=(+l.qty>0)?r2(av/(+l.qty)):0}
  else l[k]=el.value;
  if(k==='serialsText'){const n=serialsOf(l).length;if(n>0)l.qty=n}
  syncLineUI(i);
}
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.t&&T){T.actual[el.dataset.t]=el.value;const c=document.getElementById('df-'+el.dataset.t);if(c)c.innerHTML=diffHtml(el.value,+el.dataset.sys);return}
  if(!S||!el.dataset)return;
  if(el.dataset.slip){S[el.dataset.slip]=el.value;return}
  if(el.dataset.l)lineInput(el);
});
document.addEventListener('change',e=>{
  const el=e.target;if(!el.dataset)return;
  if(T&&el.dataset.tk){T[el.dataset.tk]=el.value;if(el.dataset.tk!=='note')renderTake();return}
  if(!S)return;
  if(el.dataset.slip){
    const k=el.dataset.slip;S[k]=el.value;
    if(k==='mode'){if(!sInt())S.lines.forEach(l=>{l.assetIds=[];l.serialsText=''});$$('.mode').forEach(x=>x.classList.toggle('on',x.querySelector('input').checked));renderLines()}
    if(k==='targetType'){S.targetId='';S.targetText='';$('#tgt').innerHTML=targetField()}
    return;
  }
  if(el.dataset.l&&el.dataset.l.endsWith(':itemText')){
    const i=+el.dataset.l.split(':')[0],l=S.lines[i],it=itemByText(el.value);
    if(it){if(it.id!==l.itemId)pickItem(i,it);el.classList.remove('bad')}
    else if(!el.value.trim()){l.itemId='';l.itemText='';l.assetIds=[];renderLines()}
    else{l.itemId='';l.itemText=el.value;el.classList.add('bad')}
    return;
  }
  if(el.dataset.as){
    const [is,aid]=el.dataset.as.split(':'),l=S.lines[+is],set=new Set(l.assetIds);
    el.checked?set.add(aid):set.delete(aid);l.assetIds=[...set];if(l.assetIds.length)l.qty=l.assetIds.length;syncLineUI(+is);
  }
});
ACT['ln-add']=()=>{S.lines.push(newLine());renderLines()};
ACT['ln-del']=el=>{S.lines.splice(+el.dataset.i,1);if(!S.lines.length)S.lines.push(newLine());renderLines()};
ACT['receipt-new']=()=>slipOpen('receipt');
ACT['issue-new']=el=>slipOpen('issue',null,el.dataset.preset);
ACT['slip-edit']=el=>slipOpen(el.dataset.k,el.dataset.id);
ACT['slip-save']=()=>S.kind==='receipt'?saveReceipt():saveIssue();

function collectLines(){
  const out=[];
  for(let i=0;i<S.lines.length;i++){
    const l=S.lines[i];if(!l.itemId&&!(l.itemText||'').trim())continue;
    if(!l.itemId){toast(`Dòng ${i+1}: hãy chọn đúng hàng hóa từ danh sách gợi ý.`,'error');return null}
    if(S.kind==='receipt'){
      const serials=sInt()?serialsOf(l):[],qty=serials.length||num(l.qty);
      if(qty!==Math.round(qty)){toast(`Dòng ${i+1}: số lượng phải là số nguyên.`,'error');return null}
      if(qty<=0){toast(`Dòng ${i+1}: số lượng phải lớn hơn 0.`,'error');return null}
      if(new Set(serials.map(s=>s.toLowerCase())).size!==serials.length){toast(`Dòng ${i+1}: Serial bị trùng nhau.`,'error');return null}
      out.push({itemId:l.itemId,qty,price:num(l.price),serials,warranty:num(l.warranty)});
    }else{
      const ids=sInt()?l.assetIds:[],qty=ids.length||num(l.qty);
      if(qty!==Math.round(qty)){toast(`Dòng ${i+1}: số lượng phải là số nguyên.`,'error');return null}
      if(qty<=0){toast(`Dòng ${i+1}: số lượng phải lớn hơn 0.`,'error');return null}
      out.push({itemId:l.itemId,qty,price:r2(num(l.price))||itemOf(l.itemId)?.price||0,assetIds:[...ids]});
    }
  }
  if(!out.length){toast('Phiếu chưa có hàng hóa.','error');return null}
  return out;
}
function saveReceipt(){
  if(!S.date)return toast('Chọn ngày nhập.','error');
  const lines=collectLines();if(!lines)return;
  const data={date:S.date,whs:sWhs(),supplierId:S.supplierId,ref:(S.ref||'').trim(),invoiceDate:S.invoiceDate||'',vatRate:r2(numVN(S.vatRate))||0,paymentMethod:(S.paymentMethod||'').trim(),deliveryAddress:(S.deliveryAddress||'').trim(),note:S.note,lines};
  if(transact(()=>{
    const r=S.id?by(db.receipts,S.id):null;
    if(r){Object.assign(r,data);delete r.warehouseId;syncReceiptAssets(r)}else _newReceipt(data);
    lines.forEach(l=>{if(l.price>0)itemOf(l.itemId).price=l.price});
  }))done('Đã lưu phiếu nhập');
}
function saveIssue(){
  if(!S.date)return toast('Chọn ngày xuất.','error');
  const tText=(S.targetText||'').trim();
  if(!tText)return toast(S.targetType==='project'?'Chọn khách hàng / dự án.':'Nhập tên khách lẻ.','error');
  let proj=null;
  if(S.targetType==='project'){proj=resolveProject(tText);if(!proj)return toast('Không tìm thấy khách hàng / dự án này trong danh mục. Hãy chọn từ danh sách gợi ý, hoặc thêm mới ở Thông tin → Khách hàng/dự án.','error')}
  const lines=collectLines();if(!lines)return;
  if(transact(()=>{
    let tid=proj?proj.id:'';
    if(S.targetType==='retail'){let c=db.retail.find(x=>norm(x.name)===norm(tText));if(!c){c={id:uid('rt'),name:tText,phone:'',dept:'',note:''};db.retail.push(c)}tid=c.id}
    const data={date:S.date,whs:sWhs(),targetType:S.targetType,targetId:tid,receiver:S.receiver,ref:(S.ref||'').trim(),invoiceDate:S.invoiceDate||'',vatRate:r2(numVN(S.vatRate))||0,paymentMethod:(S.paymentMethod||'').trim(),deliveryAddress:(S.deliveryAddress||'').trim(),note:S.note,lines};
    const r=S.id?by(db.issues,S.id):null;
    if(r){revertIssueAssets(r);Object.assign(r,data);delete r.warehouseId;applyIssueAssets(r)}else _newIssue(data);
  }))done('Đã lưu phiếu xuất');
}

/* ---- đổi kho ghi nhận của một phiếu (khi chọn nhầm kho) ---- */
ACT['slip-wh']=el=>{
  const k=el.dataset.k,r=slipRec(k,el.dataset.id);if(!r)return;const cur=modeOf(slipWhs(r)),isR=k==='receipt';
  const opts=[['both','Cả hai kho','Kho hóa đơn + Kho nội bộ'],['int','Chỉ Kho nội bộ',isR?'Hàng nhập thực tế, không hóa đơn':'Xuất hàng thực tế, không hóa đơn'],['inv','Chỉ Kho hóa đơn','Chỉ ghi sổ hóa đơn, không đổi tồn thực tế']];
  modal(`Đổi kho ghi nhận – ${r.code}`,`<form id="mf" data-submit="slip-wh" data-k="${k}" data-id="${r.id}"><p class="note">Hiện tại phiếu ghi nhận vào: <b>${esc(whsLabel(r))}</b>. Chọn kho đúng rồi bấm Lưu, tồn kho của hai kho sẽ được tính lại.</p>
    <div class="modes">${opts.map(([v,l,d])=>`<label class="mode ${v===cur?'on':''}"><span><input type="radio" name="whmode" value="${v}" ${v===cur?'checked':''}> <b>${l}</b></span><small>${d}</small></label>`).join('')}</div></form>`,{size:'mid',footer:cancelBtn+'<button class="btn primary" form="mf">Lưu</button>'});
};
SUB['slip-wh']=form=>{
  const k=form.dataset.k,d=fd(form);
  if(transact(()=>{
    const r=slipRec(k,form.dataset.id);
    if(k==='issue')revertIssueAssets(r);
    r.whs=modeWhs(d.whmode);delete r.warehouseId;
    if(k==='issue')applyIssueAssets(r);else syncReceiptAssets(r);
  }))done('Đã đổi kho ghi nhận của phiếu');
};
document.addEventListener('change',e=>{if(e.target.name==='whmode'&&e.target.closest('form[data-submit=slip-wh]'))$$('.mode').forEach(x=>x.classList.toggle('on',x.querySelector('input').checked))});

/* ---- xem / in / PDF / xoá phiếu ---- */
const slipRec=(k,id)=>k==='receipt'?by(db.receipts,id):by(db.issues,id);
const slipKind=k=>k==='receipt'?'in':'out';
ACT['slip-view']=el=>{
  const k=el.dataset.k,r=slipRec(k,el.dataset.id);if(!r)return;const w=can('write'),a=`data-k="${k}" data-id="${r.id}"`;
  modal(r.code,slipHTML(slipKind(k),r),{size:'mid',footer:`${w?`<button class="btn danger" data-act="slip-del" ${a}>Xoá</button><button class="btn" data-act="slip-wh" ${a}>Đổi kho</button><button class="btn" data-act="slip-edit" ${a}>Sửa</button>`:''}<div class="sp"></div><button class="btn" data-act="slip-print" ${a}>🖨 In</button><button class="btn acc" data-act="slip-pdf" ${a}>Xuất PDF</button>`});
};
ACT['slip-print']=el=>{const r=slipRec(el.dataset.k,el.dataset.id);if(r)printHTML(slipHTML(slipKind(el.dataset.k),r))};
ACT['slip-pdf']=async el=>{const r=slipRec(el.dataset.k,el.dataset.id);if(!r)return;const box=offscreen(slipHTML(slipKind(el.dataset.k),r));await pdfFromEls([box],`${r.code}.pdf`);box.remove()};
ACT['slip-del']=el=>{
  const k=el.dataset.k,r=slipRec(k,el.dataset.id);if(!r||!confirm(`Xoá phiếu ${r.code}? Tồn kho và tài sản liên quan sẽ được hoàn lại.`))return;
  const ok=transact(()=>{
    if(k==='receipt'){
      db.assets.filter(a=>a.receiptId===r.id).forEach(a=>{if(a.status!=='in_stock'||!a.counted)throw new Error(`Thiết bị ${a.tag} đã được cấp phát/xử lý nên không thể xoá phiếu nhập.`)});
      db.assets=db.assets.filter(a=>a.receiptId!==r.id);db.receipts=db.receipts.filter(x=>x!==r);
    }else{revertIssueAssets(r);db.issues=db.issues.filter(x=>x!==r)}
  });
  if(ok)done('Đã xoá phiếu');
};

/* ---- trang Export PDF ---- */
PAGES['slip/pdf']={t:'Export PDF',
  head(){return `<div class="bar">${fSel('k','Loại phiếu',[['receipt','Phiếu nhập kho'],['issue','Phiếu xuất kho']])}${fDate('from','Từ',dAgo(30))}${fDate('to','Đến',todayStr())}<div class="sp"></div><button class="btn" data-act="print-sel">🖨 In các phiếu đã chọn</button><button class="btn acc" data-act="pdf-sel">Xuất PDF các phiếu đã chọn</button></div><p class="note">Mỗi phiếu là một trang A4 trong cùng một file PDF.</p>`},
  tbl(){
    const f=F(),k=f.k||'receipt',from=f.from??dAgo(30),to=f.to??todayStr();
    const rows=(k==='receipt'?db.receipts:db.issues).filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)).sort(byDateDesc);
    return table([{h:'<input type="checkbox" data-act="pick-all" checked aria-label="Chọn tất cả">',noexp:1,f:r=>`<input type="checkbox" class="pick" value="${r.id}" checked>`},{h:'Số phiếu',f:r=>slipLink(k,r)},{h:'Ngày',f:r=>fmtDate(r.date)},{h:k==='receipt'?'Nhà cung cấp':'Đối tượng',f:r=>esc(k==='receipt'?(r.supplierId?nm(db.suppliers,r.supplierId):'—'):targetLabel(r.targetType,r.targetId))},{h:'Ghi nhận kho',f:whBadges,x:whsLabel},nc('Tổng SL',r=>slipTotals(r).q)],rows,{empty:'Không có phiếu trong khoảng thời gian này.'});
  }};
ACT['pick-all']=el=>$$('.pick').forEach(c=>c.checked=el.checked);
const pickedSlips=()=>{const k=F().k||'receipt';return{k,list:$$('.pick:checked').map(c=>slipRec(k,c.value)).filter(Boolean)}};
ACT['pdf-sel']=async()=>{const {k,list}=pickedSlips();if(!list.length)return toast('Chưa chọn phiếu nào.','warn');const boxes=list.map(r=>offscreen(slipHTML(slipKind(k),r)));await pdfFromEls(boxes,`${k==='receipt'?'phieu-nhap':'phieu-xuat'}_${todayStr()}.pdf`);boxes.forEach(b=>b.remove())};
ACT['print-sel']=()=>{const {k,list}=pickedSlips();if(!list.length)return toast('Chưa chọn phiếu nào.','warn');printHTML(list.map(r=>`<div class="pb">${slipHTML(slipKind(k),r)}</div>`).join(''))};

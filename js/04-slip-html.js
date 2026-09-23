/* 04-slip-html.js – Mẫu phiếu nhập/xuất kho (dùng cho xem, in, PDF) */
'use strict';
(self.__mods=self.__mods||[]).push('04-slip-html');

/* ---------- phiếu in / PDF ---------- */
/* Mẫu song ngữ kiểu hóa đơn, có VAT.
   Phiếu NHẬP: phần "đơn vị" ở đầu phiếu lấy theo NHÀ CUNG CẤP (như trên hóa đơn họ xuất cho mình).
   Phiếu XUẤT: phần "đơn vị" lấy theo CHÍNH CÔNG TY (vì mình là bên xuất/bán hàng). */
function slipParty(kind,r){
  const c=db.company||{};
  if(kind==='in'){
    const s=r.supplierId?by(db.suppliers,r.supplierId):null;
    return s?{name:s.name,taxId:s.taxId,address:s.address,bank:s.bankAccount}:{name:c.name,taxId:c.taxId,address:c.address,bank:c.bankAccount};
  }
  return{name:c.name,taxId:c.taxId,address:c.address,bank:c.bankAccount};
}
function slipDelivery(kind,r){
  if(r.deliveryAddress)return r.deliveryAddress;
  if(kind==='in')return(db.company||{}).address||'';
  if(r.targetType==='project')return by(db.projects,r.targetId)?.address||'';
  return'';
}
function slipHTML(kind,r){
  const isIn=kind==='in',head=slipParty(kind,r),party=isIn?(r.supplierId?nm(db.suppliers,r.supplierId):'—'):targetLabel(r.targetType,r.targetId);
  let total=0,qtyT=0;
  const rows=r.lines.map((l,i)=>{
    const it=itemOf(l.itemId)||{sku:'?',name:'(hàng đã xoá)',unit:''};
    const am=amt(l.qty,l.price);total=r2(total+am);qtyT+=+l.qty||0;
    const sn=isIn?(l.serials||[]):(l.assetIds||[]).map(id=>{const a=by(db.assets,id);return a?(a.serial||a.tag):''}).filter(Boolean);
    const whTag=isIn?'':`<div class="sn">Kho: ${esc(lineWhs(l).includes(W_INV)?'Hóa đơn':'Nội bộ')}</div>`;
    return `<tr><td class="c">${i+1}</td><td>${esc(it.name)}${sn.length?`<div class="sn">S/N: ${esc(sn.join(', '))}</div>`:''}<div class="sn">${esc(it.sku)}</div>${whTag}</td><td class="c">${esc(it.unit)}</td><td class="r">${fmtNum(l.qty)}</td><td class="r">${fmtMoney(l.price)}</td><td class="r">${fmtMoney(am)}</td></tr>`;
  }).join('');
  const foot=`<tr><td colspan="3" class="r"><b>Cộng</b></td><td class="r"><b>${fmtNum(qtyT)}</b></td><td></td><td class="r"><b>${fmtMoney(total)}</b></td></tr>`;
  const vat=r2(+r.vatRate||0),vatAmt=r2(total*vat/100),grand=vat>0?Math.round((total+vatAmt)/1000)*1000:total;
  const sign=isIn
    ?['Người lập phiếu','Người giao hàng','Thủ kho','Kế toán / Duyệt']
    :['Người lập phiếu','Người nhận hàng','Thủ kho','Trưởng bộ phận / Duyệt'];
  return `<div class="slip">
    <div class="sh">
      ${typeof LOGO_DATA!=='undefined'?`<img class="slip-logo-corner" src="${LOGO_DATA}" alt="Logo">`:''}
      <div class="co">
        <div><i>Tên đơn vị (Company's name):</i> <b>${esc(head.name||'')}</b></div>
        ${head.taxId?`<div><i>Mã số thuế (Tax code):</i> ${esc(head.taxId)}</div>`:''}
        <div><i>Địa chỉ (Address):</i> ${esc(head.address||'')}</div>
        <div><i>Địa chỉ giao hàng (Delivery address):</i> ${esc(slipDelivery(kind,r))}</div>
        <div><i>Hình thức thanh toán (Payment method):</i> ${esc(r.paymentMethod||'—')}&emsp;<i>Số tài khoản (Bank account):</i> ${esc(head.bank||'—')}</div>
      </div>
    </div>
    <h2>${isIn?'PHIẾU NHẬP KHO':'PHIẾU XUẤT KHO'}</h2>
    <div class="sub">${isIn?'Goods Receipt Note':'Goods Issue Note'}</div>
    <div class="mt">
      <div>Số: <b>${esc(r.code)}</b></div><div>Ngày: <b>${fmtDate(r.date)}</b></div>
      <div>${isIn?'Nhà cung cấp':(r.targetType==='project'?'Khách hàng / Dự án':'Khách lẻ')}: <b>${esc(party)}</b></div><div>Kho ghi nhận: <b>${esc(whsLabel(r))}</b></div>
      <div>Số hóa đơn: ${esc(r.ref||'—')}</div><div>Ngày hóa đơn: ${r.invoiceDate?fmtDate(r.invoiceDate):'—'}</div>
      ${isIn?`<div>Người lập: ${esc(r.createdBy||'')}</div><div></div>`:`<div>Người nhận: ${esc(r.receiver||'—')}</div><div>Người lập: ${esc(r.createdBy||'')}</div>`}
      <div style="grid-column:1/-1">Ghi chú: ${esc(r.note||'')}</div>
    </div>
    <table><thead><tr><th style="width:34px">STT<br><i>(No)</i></th><th>Tên hàng hóa, dịch vụ<br><i>(Name of goods and services)</i></th><th style="width:56px">ĐVT<br><i>(Unit)</i></th><th style="width:62px">Số lượng<br><i>(Quantity)</i></th><th style="width:95px">Đơn giá<br><i>(Unit price)</i></th><th style="width:105px">Thành tiền<br><i>(Amount)</i></th></tr></thead><tbody>${rows}${foot}</tbody></table>
    <table class="totals-tbl"><tr class="first"><td colspan="2" class="r">Cộng tiền hàng <i>(Total amount excl. VAT)</i>:</td><td class="r"><b>${fmtMoney(total)}</b></td></tr>
      ${vat>0?`<tr><td>Thuế suất GTGT <i>(VAT rate)</i>: ${fmtPrice(vat)}%</td><td class="r">Tiền thuế GTGT <i>(VAT amount)</i>:</td><td class="r"><b>${fmtMoney(vatAmt)}</b></td></tr>
      <tr><td colspan="2" class="r">Tổng tiền thanh toán <i>(Total amount)</i>:</td><td class="r"><b>${fmtMoney(grand)}</b></td></tr>`:''}</table>
    ${grand>0?`<p class="itw"><i>Số tiền viết bằng chữ (Total amount in words):</i> <b>${esc(readVN(grand))}.</b></p>`:''}
    <div class="sign">${sign.map(s=>`<div><b>${s}</b><br><small>(Ký, họ tên)</small></div>`).join('')}</div>
  </div>`;
}

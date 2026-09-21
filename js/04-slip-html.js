/* 04-slip-html.js – Mẫu phiếu nhập/xuất kho (dùng cho xem, in, PDF) */
'use strict';
(self.__mods=self.__mods||[]).push('04-slip-html');

/* ---------- phiếu in / PDF ---------- */
function slipHTML(kind,r){
  const c=db.company||{},isIn=kind==='in';
  const party=isIn?(r.supplierId?nm(db.suppliers,r.supplierId):'—'):targetLabel(r.targetType,r.targetId);
  const partyLabel=isIn?'Nhà cung cấp':(r.targetType==='project'?'Khách hàng / Dự án':'Khách lẻ');
  let total=0,qtyT=0;
  const rows=r.lines.map((l,i)=>{
    const it=itemOf(l.itemId)||{sku:'?',name:'(hàng đã xoá)',unit:''};
    const am=amt(l.qty,l.price);total=r2(total+am);qtyT+=+l.qty||0;
    const sn=isIn?(l.serials||[]):(l.assetIds||[]).map(id=>{const a=by(db.assets,id);return a?(a.serial||a.tag):''}).filter(Boolean);
    return `<tr><td class="c">${i+1}</td><td>${esc(it.sku)}</td><td>${esc(it.name)}${sn.length?`<div class="sn">S/N: ${esc(sn.join(', '))}</div>`:''}</td><td class="c">${esc(it.unit)}</td><td class="r">${fmtNum(l.qty)}</td>${isIn?`<td class="r">${fmtMoney(l.price)}</td><td class="r">${fmtMoney(am)}</td>`:''}</tr>`;
  }).join('');
  const foot=`<tr><td colspan="4" class="r"><b>Cộng</b></td><td class="r"><b>${fmtNum(qtyT)}</b></td>${isIn?`<td></td><td class="r"><b>${fmtMoney(total)}</b></td>`:''}</tr>`;
  const sign=isIn
    ?['Người lập phiếu','Người giao hàng','Thủ kho','Kế toán / Duyệt']
    :['Người lập phiếu','Người nhận hàng','Thủ kho','Trưởng bộ phận / Duyệt'];
  return `<div class="slip">
    <div class="sh"><div class="co">${typeof LOGO_DATA!=='undefined'?`<img class="slip-logo" src="${LOGO_DATA}" alt="Logo">`:''}<div><b>${esc(c.name||'')}</b><div>${esc(c.address||'')}</div><div>${c.phone?'ĐT: '+esc(c.phone):''}</div></div></div>
      <div class="r">Số: <b>${esc(r.code)}</b><br>Ngày: ${fmtDate(r.date)}</div></div>
    <h2>${isIn?'PHIẾU NHẬP KHO':'PHIẾU XUẤT KHO'}</h2>
    <div class="sub">${isIn?'Goods Receipt Note':'Goods Issue Note'}</div>
    <div class="mt"><div>${partyLabel}: <b>${esc(party)}</b></div><div>Ghi nhận kho: <b>${esc(whsLabel(r))}</b></div>
      <div>Số hóa đơn / chứng từ: <b>${esc(r.ref||'—')}</b></div><div>Ngày hóa đơn: ${r.invoiceDate?fmtDate(r.invoiceDate):'—'}</div>
      ${isIn?`<div>Người lập: ${esc(r.createdBy||'')}</div><div></div>`:`<div>Người nhận: ${esc(r.receiver||'—')}</div><div>Người lập: ${esc(r.createdBy||'')}</div>`}
      <div style="grid-column:1/-1">Ghi chú: ${esc(r.note||'')}</div></div>
    <table><thead><tr><th style="width:34px">STT</th><th style="width:90px">Mã hàng</th><th>Tên hàng hóa</th><th style="width:50px">ĐVT</th><th style="width:60px">SL</th>${isIn?'<th style="width:95px">Đơn giá (VND)</th><th style="width:105px">Thành tiền (VND)</th>':''}</tr></thead><tbody>${rows}${foot}</tbody></table>
    ${isIn&&total>0?`<p style="margin-top:8px"><i>Bằng chữ: ${esc(readVN(total))}.</i></p>`:''}
    <div class="sign">${sign.map(s=>`<div><b>${s}</b><br><small>(Ký, họ tên)</small></div>`).join('')}</div>
  </div>`;
}

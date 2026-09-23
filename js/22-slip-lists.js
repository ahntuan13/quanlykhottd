/* 22-slip-lists.js – Danh sách phiếu nhập/xuất, lịch sử nhập/xuất */
'use strict';
(self.__mods=self.__mods||[]).push('22-slip-lists');

/* =====================================================================
   PHIẾU NHẬP / XUẤT – DANH SÁCH
   ===================================================================== */
function receiptsPage(title,mode){
  return{t:title,
    head(){const w=can('write')&&mode==='list';return `<div class="bar">${fSearch('Tìm số phiếu / NCC / ghi chú…')}${fSel('wh','Kho',whOpts())}${fDate('from','Từ')}${fDate('to','Đến')}<div class="sp"></div><button class="btn" data-act="export" data-name="phieu-nhap">⬇ Excel</button>${w?'<button class="btn acc" data-act="receipt-new">＋ Tạo phiếu nhập</button>':''}</div>`},
    tbl(){
      const f=F(),q=(f.q||'').toLowerCase(),w=can('write');
      const rows=db.receipts.filter(r=>(!f.wh||inWh(r,f.wh))&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!q||(r.code+' '+nm(db.suppliers,r.supplierId)+' '+(r.note||'')+' '+(r.ref||'')).toLowerCase().includes(q))).sort(byDateDesc);
      return table([{h:'Số phiếu',f:r=>slipLink('receipt',r),x:r=>r.code},{h:'Ngày',f:r=>fmtDate(r.date),x:r=>r.date},{h:'Số hóa đơn',f:r=>esc(r.ref||''),x:r=>r.ref||''},{h:'Nhà cung cấp',f:r=>esc(r.supplierId?nm(db.suppliers,r.supplierId):'—')},{h:'Ghi nhận kho',f:whBadges,x:whsLabel},nc('Số dòng',r=>r.lines.length),nc('Tổng SL',r=>slipTotals(r).q),nc('Tổng tiền (VND)',r=>slipTotals(r).v,fmtMoney),{h:'Người lập',f:r=>esc(r.createdBy||'')},
        actCol(r=>mode==='slip'?`<button class="btn sm" data-act="slip-view" data-k="receipt" data-id="${r.id}">Xem</button> <button class="btn sm" data-act="slip-print" data-k="receipt" data-id="${r.id}">In</button> <button class="btn sm" data-act="slip-pdf" data-k="receipt" data-id="${r.id}">PDF</button>`:`<button class="btn sm" data-act="slip-view" data-k="receipt" data-id="${r.id}">Xem</button>${w?` <button class="btn sm" data-act="slip-wh" data-k="receipt" data-id="${r.id}" title="Đổi kho ghi nhận của phiếu">Đổi kho</button> <button class="btn sm" data-act="slip-edit" data-k="receipt" data-id="${r.id}">Sửa</button> <button class="btn sm danger" data-act="slip-del" data-k="receipt" data-id="${r.id}">Xoá</button>`:''}`)],rows,{empty:'Chưa có phiếu nhập.'});
    }};
}
function issuesPage(type,title,mode){
  return{t:title,
    head(){const w=can('write')&&mode==='list';return `<div class="bar">${fSearch('Tìm số phiếu / đối tượng / người nhận…')}${fSel('wh','Kho',whOpts())}${fDate('from','Từ')}${fDate('to','Đến')}<div class="sp"></div><button class="btn" data-act="export" data-name="phieu-xuat">⬇ Excel</button>${w?`<button class="btn acc" data-act="issue-new" data-preset="${type||'retail'}">＋ Tạo phiếu xuất${type==='retail'?' (khách lẻ)':type==='project'?' (dự án)':''}</button>`:''}</div>`},
    tbl(){
      const f=F(),q=(f.q||'').toLowerCase(),w=can('write');
      const rows=db.issues.filter(r=>(!type||r.targetType===type)&&(!f.wh||inWh(r,f.wh))&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!q||(r.code+' '+targetLabel(r.targetType,r.targetId)+' '+(r.receiver||'')+' '+(r.note||'')+' '+(r.ref||'')).toLowerCase().includes(q))).sort(byDateDesc);
      return table([{h:'Số phiếu',f:r=>slipLink('issue',r),x:r=>r.code},{h:'Ngày',f:r=>fmtDate(r.date),x:r=>r.date},{h:'Loại',f:r=>r.targetType==='project'?badge('info','Dự án'):badge('mute','Khách lẻ'),x:r=>r.targetType==='project'?'Dự án':'Khách lẻ'},{h:'Đối tượng',f:r=>esc(targetLabel(r.targetType,r.targetId))},{h:'Số hóa đơn',f:r=>esc(r.ref||''),x:r=>r.ref||''},{h:'Người nhận',f:r=>esc(r.receiver||'')},{h:'Ghi nhận kho',f:whBadges,x:whsLabel},nc('Tổng SL',r=>slipTotals(r).q),{h:'Người lập',f:r=>esc(r.createdBy||'')},
        actCol(r=>mode==='slip'?`<button class="btn sm" data-act="slip-view" data-k="issue" data-id="${r.id}">Xem</button> <button class="btn sm" data-act="slip-print" data-k="issue" data-id="${r.id}">In</button> <button class="btn sm" data-act="slip-pdf" data-k="issue" data-id="${r.id}">PDF</button>`:`<button class="btn sm" data-act="slip-view" data-k="issue" data-id="${r.id}">Xem</button>${w?` <button class="btn sm" data-act="slip-edit" data-k="issue" data-id="${r.id}" title="Sửa từng dòng, kể cả kho quản lý">Sửa</button> <button class="btn sm danger" data-act="slip-del" data-k="issue" data-id="${r.id}">Xoá</button>`:''}`)],rows,{empty:'Chưa có phiếu xuất.'});
    }};
}
function ledgerPage(kind,title){
  const isIn=kind==='receipts';
  return{t:title,
    head(){return `<div class="bar">${fSearch('Tìm mặt hàng / số phiếu / đối tượng…')}${fSel('wh','Kho',whOpts())}${fDate('from','Từ')}${fDate('to','Đến')}<div class="sp"></div><button class="btn" data-act="export" data-name="${isIn?'lich-su-nhap':'lich-su-xuat'}">⬇ Excel</button></div>`},
    tbl(){
      const f=F(),q=(f.q||'').toLowerCase();
      const party=r=>isIn?(r.supplierId?nm(db.suppliers,r.supplierId):'—'):targetLabel(r.targetType,r.targetId);
      const rows=db[kind].filter(r=>(!f.wh||inWh(r,f.wh))&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)).flatMap(r=>r.lines.map(l=>({r,l,it:itemOf(l.itemId)||{sku:'?',name:'(đã xoá)',unit:''}}))).filter(x=>!q||(x.it.sku+' '+x.it.name+' '+x.r.code+' '+party(x.r)).toLowerCase().includes(q)).sort((a,b)=>byDateDesc(a.r,b.r));
      return table([{h:'Ngày',f:x=>fmtDate(x.r.date),x:x=>x.r.date},{h:'Số phiếu',f:x=>slipLink(isIn?'receipt':'issue',x.r),x:x=>x.r.code},{h:'Mã hàng',f:x=>esc(x.it.sku)},{h:'Tên hàng hóa',f:x=>esc(x.it.name)},nc('Số lượng',x=>+x.l.qty||0),{h:'ĐVT',f:x=>esc(x.it.unit)},nc('Đơn giá (VND)',x=>+x.l.price||0,fmtMoney),nc('Thành tiền (VND)',x=>amt(x.l.qty,x.l.price),fmtMoney),{h:isIn?'Nhà cung cấp':'Đối tượng',f:x=>esc(party(x.r))},{h:'Ghi nhận kho',f:x=>whBadges(x.r),x:x=>whsLabel(x.r)}],rows,{empty:isIn?'Chưa có lịch sử nhập.':'Chưa có lịch sử xuất.'});
    }};
}
PAGES['in/receipts']=receiptsPage('Phiếu nhập','list');PAGES['wh/in']=receiptsPage('Nhập kho','list');PAGES['slip/in']=receiptsPage('Phiếu nhập kho','slip');
PAGES['out/issues']=issuesPage('','Phiếu xuất','list');PAGES['wh/out']=issuesPage('','Xuất kho','list');PAGES['slip/out']=issuesPage('','Phiếu xuất kho','slip');
PAGES['out/retail']=issuesPage('retail','Cấp phát cho khách lẻ','list');PAGES['out/project']=issuesPage('project','Cấp phát cho khách hàng/dự án','list');
PAGES['in/history']=ledgerPage('receipts','Lịch sử nhập');PAGES['out/history']=ledgerPage('issues','Lịch sử xuất');

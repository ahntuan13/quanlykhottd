/* 03-stock-logic.js – Tính tồn kho, cảnh báo, giao dịch có hoàn tác, sinh mã, logic tài sản theo Serial */
'use strict';
(self.__mods=self.__mods||[]).push('03-stock-logic');

/* ---------- tồn kho ---------- */
/* asOf: tính đến ngày (gồm); exclusive=true: chỉ tính trước ngày đó */
function stockMap(asOf,exclusive){
  const m={};const add=(i,w,q)=>{const o=(m[i]??={});o[w]=(o[w]||0)+q};
  const ok=d=>!asOf||(exclusive?d<asOf:d<=asOf);
  db.receipts.forEach(r=>{if(ok(r.date))slipWhs(r).forEach(w=>r.lines.forEach(l=>add(l.itemId,w,+l.qty||0)))});
  db.issues.forEach(r=>{if(ok(r.date))slipWhs(r).forEach(w=>r.lines.forEach(l=>add(l.itemId,w,-(+l.qty||0))))});
  db.adjustments.forEach(a=>{if(ok(a.date))add(a.itemId,a.warehouseId,+a.qty||0)});
  db.stocktakes.forEach(s=>{if(ok(s.date))s.lines.forEach(l=>add(l.itemId,s.warehouseId,(+l.actual||0)-(+l.system||0)))});
  for(const i in m)for(const w in m[i])m[i][w]=Math.round(m[i][w]*1000)/1000;
  return m;
}
/* Tồn "tổng" = tồn thực tế (Kho nội bộ). Kho hóa đơn là sổ theo hóa đơn nên không cộng gộp. */
const totalOf=(m,id)=>m[id]?.[W_INT]||0;
const qtyIn=(m,id,wh)=>m[id]?.[wh||W_INT]||0;
function findNegative(){const m=stockMap();for(const i in m)for(const w in m[i])if(m[i][w]<-1e-9)return `${nm(db.items,i)} tại ${whName(w)} (${fmtNum(m[i][w])})${w===W_INV?'. Kho hóa đơn chưa đủ số lượng theo hóa đơn nhập: hãy nhập hóa đơn đầu vào trước, hoặc chọn “Chỉ Kho nội bộ” cho phiếu này':''}`;return null}
function flow(kind,from,to,wh){
  wh=wh||W_INT;const o={};
  db[kind].forEach(r=>{
    if((from&&r.date<from)||(to&&r.date>to)||!inWh(r,wh))return;
    r.lines.forEach(l=>{const x=(o[l.itemId]??={qty:0,val:0});const q=+l.qty||0;x.qty+=q;x.val=r2(x.val+amt(q,+l.price||itemOf(l.itemId)?.price||0))});
  });
  return o;
}
function itemStatus(it,t){if(t<=0)return['bad','Hết hàng'];if(it.minStock>0&&t<=it.minStock)return['warn','Sắp hết'];return['ok','Còn hàng']}
function alertsData(){
  const m=stockMap(),moved=new Set();db.receipts.forEach(r=>r.lines.forEach(l=>moved.add(l.itemId)));
  const low=[],out=[];
  db.items.forEach(it=>{const t=totalOf(m,it.id);
    if(t<=0){if(moved.has(it.id)||it.minStock>0)out.push({it,t})}
    else if(it.minStock>0&&t<=it.minStock)low.push({it,t});
  });
  const lim=addDays(todayStr(),60);
  const warr=db.assets.filter(a=>a.warrantyEnd&&a.status!=='retired'&&a.warrantyEnd<=lim).sort((a,b)=>a.warrantyEnd.localeCompare(b.warrantyEnd));
  const repair=db.assets.filter(a=>a.status==='repair');
  return{low,out,warr,repair};
}
const alertCount=()=>{const a=alertsData();return a.low.length+a.out.length+a.warr.length+a.repair.length};

/* ---------- giao dịch có hoàn tác ---------- */
function transact(fn){
  const snap=JSON.stringify(db);
  try{
    fn();
    const neg=findNegative();
    if(neg)throw new Error('Tồn kho sẽ bị âm: '+neg);
    save();return true;
  }catch(e){db=JSON.parse(snap);toast(e.message,'error');return false}
}

/* ---------- mã phiếu, tài sản ---------- */
function maxNum(list,re){let m=0;list.forEach(s=>{const x=re.exec(s||'');if(x)m=Math.max(m,+x[1])});return m}
function nextCode(kind){const y=String(new Date().getFullYear()).slice(2),src={PN:db.receipts,PX:db.issues,KK:db.stocktakes}[kind]||[];db.seq[kind]=Math.max(db.seq[kind]||0,maxNum(src.map(r=>r.code),new RegExp('^'+kind+'\\d{2}-(\\d+)$')))+1;return `${kind}${y}-${String(db.seq[kind]).padStart(4,'0')}`}
function nextTag(){db.seq.TS=Math.max(db.seq.TS||0,maxNum(db.assets.map(a=>a.tag),/^TS-(\d+)$/))+1;return 'TS-'+String(db.seq.TS).padStart(5,'0')}
function autoSku(){let s;do{db.seq.HH=Math.max(db.seq.HH||0,maxNum(db.items.map(i=>i.sku),/^HH-(\d+)$/))+1;s='HH-'+String(db.seq.HH).padStart(4,'0')}while(db.items.some(x=>x.sku===s));return s}
function addHist(a,action,detail,date){(a.history??=[]).push({id:uid('h'),ts:new Date().toISOString(),date:date||todayStr(),action,detail,by:session?.name||'system'})}
function pushAdj(itemId,warehouseId,qty,reason,date){db.adjustments.push({id:uid('adj'),date:date||todayStr(),warehouseId,itemId,qty,reason,createdBy:session?.name||'system'})}

/* Phiếu nhập → tạo/đồng bộ tài sản theo Serial */
function syncReceiptAssets(r){
  const want=[];if(inWh(r,W_INT))r.lines.forEach(l=>(l.serials||[]).forEach(s=>want.push({itemId:l.itemId,serial:s,warranty:l.warranty})));
  const key=(i,s)=>i+'|'+String(s||'').toLowerCase();
  const have=db.assets.filter(a=>a.receiptId===r.id);
  const wantKeys=new Set(want.map(w=>key(w.itemId,w.serial)));
  for(const a of have){
    if(!wantKeys.has(key(a.itemId,a.serial))){
      if(a.status!=='in_stock'||!a.counted)throw new Error(`Không thể bỏ Serial ${a.serial}: thiết bị đã được cấp phát/xử lý`);
      db.assets=db.assets.filter(x=>x!==a);
    }else{
      const w=want.find(x=>key(x.itemId,x.serial)===key(a.itemId,a.serial));
      a.purchaseDate=r.date;a.warrantyEnd=w.warranty?addMonths(r.date,+w.warranty):'';
      if(a.status==='in_stock')a.warehouseId=W_INT;
    }
  }
  const haveKeys=new Set(have.filter(a=>db.assets.includes(a)).map(a=>key(a.itemId,a.serial)));
  for(const w of want){
    if(haveKeys.has(key(w.itemId,w.serial)))continue;
    if(db.assets.some(a=>key(a.itemId,a.serial)===key(w.itemId,w.serial)))throw new Error(`Serial ${w.serial} đã tồn tại trong danh sách tài sản`);
    const a={id:uid('a'),tag:nextTag(),itemId:w.itemId,serial:w.serial,spec:'',status:'in_stock',counted:true,warehouseId:W_INT,holder:null,issueId:null,receiptId:r.id,purchaseDate:r.date,warrantyEnd:w.warranty?addMonths(r.date,+w.warranty):'',note:'',history:[]};
    addHist(a,'Nhập kho',`Phiếu nhập ${r.code}`,r.date);db.assets.push(a);
  }
}
function _newReceipt(o){const r={id:uid('r'),code:nextCode('PN'),createdBy:session?.name||'system',createdAt:Date.now(),...o};db.receipts.push(r);syncReceiptAssets(r);return r}

/* Phiếu xuất → gán/thu hồi tài sản */
function applyIssueAssets(r){
  if(r.lines.some(l=>(l.assetIds||[]).length)&&!inWh(r,W_INT))throw new Error('Chọn thiết bị theo Serial chỉ áp dụng khi phiếu ghi nhận vào Kho nội bộ (hàng thực tế).');
  const seen=new Set();
  r.lines.forEach(l=>(l.assetIds||[]).forEach(id=>{
    const a=by(db.assets,id);if(!a)throw new Error('Thiết bị đã chọn không còn tồn tại');
    if(seen.has(id))throw new Error(`Thiết bị ${a.tag} bị chọn trùng`);seen.add(id);
    if(a.status!=='in_stock'||a.itemId!==l.itemId||a.warehouseId!==W_INT)throw new Error(`Thiết bị ${a.tag} không khả dụng để xuất (không ở trạng thái Trong kho hoặc khác kho)`);
    a.status='assigned';a.counted=false;a.holder={type:r.targetType,id:r.targetId};a.issueId=r.id;
    addHist(a,'Cấp phát',`${r.code} → ${targetLabel(r.targetType,r.targetId)}`,r.date);
  }));
}
function revertIssueAssets(r){
  r.lines.forEach(l=>(l.assetIds||[]).forEach(id=>{
    const a=by(db.assets,id);if(!a)return;
    if(a.issueId!==r.id)throw new Error(`Thiết bị ${a.tag} đã thay đổi trạng thái sau khi cấp phát nên không thể sửa/huỷ phiếu ${r.code}`);
    a.status='in_stock';a.counted=true;a.holder=null;a.issueId=null;a.warehouseId=W_INT;
    addHist(a,'Thu hồi',`Huỷ/sửa phiếu xuất ${r.code}`);
  }));
}
function _newIssue(o){const r={id:uid('i'),code:nextCode('PX'),createdBy:session?.name||'system',createdAt:Date.now(),...o};db.issues.push(r);applyIssueAssets(r);return r}

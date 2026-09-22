/* 02-data-model.js – Mô hình dữ liệu, tải/lưu, 2 kho cố định (Kho nội bộ + Kho hóa đơn), migrate dữ liệu cũ */
'use strict';
(self.__mods=self.__mods||[]).push('02-data-model');

/* ---------- dữ liệu ---------- */
const ROLES={admin:'Quản trị viên',keeper:'Thủ kho',viewer:'Chỉ xem'};
function defaultDB(){return{
  version:1,
  seq:{PN:0,PX:0,KK:0,TS:0,HH:0},
  company:{name:'TTD Computer',taxId:'',bankAccount:'',defaultVatRate:0,address:'',phone:''},
  users:[{id:'u_admin',username:'admin',name:'Quản trị',role:'admin',pass:pw('admin123'),active:true}],
  warehouses:WH_DEF(),
  categories:[
    {id:'c_laptop',name:'Laptop / PC',isIT:true,slug:'laptop'},
    {id:'c_monitor',name:'Monitor',isIT:true,slug:'monitor'},
    {id:'c_printer',name:'Printer',isIT:true,slug:'printer'},
    {id:'c_network',name:'Network',isIT:true,slug:'network'},
    {id:'c_ups',name:'UPS',isIT:true,slug:'ups'},
    {id:'c_acc',name:'Accessories',isIT:true,slug:'accessories'},
    {id:'c_office',name:'Văn phòng phẩm',isIT:false},
    {id:'c_material',name:'Vật tư khác',isIT:false}
  ],
  suppliers:[],retail:[],projects:[],items:[],receipts:[],issues:[],stocktakes:[],adjustments:[],assets:[]
}}
function emptyCloudDB(){const d=defaultDB();d.users=[];d.categories=[];d.warehouses=[];return d}
let db=null, session=null;
function migrate(){const d=defaultDB();for(const k in d){if(db[k]===undefined)db[k]=d[k]}for(const k in d.seq){if(db.seq[k]===undefined)db.seq[k]=0}}
function load(){if(CLOUD){db=emptyCloudDB();migrate();return}try{const raw=localStorage.getItem(LS_KEY);db=raw?JSON.parse(raw):defaultDB()}catch(e){db=defaultDB()}migrate();if(migrateAll())save()}
function save(){if(CLOUD){cloudPush();return}try{localStorage.setItem(LS_KEY,JSON.stringify(db))}catch(e){toast('Không lưu được dữ liệu (bộ nhớ trình duyệt đầy?). Hãy xuất sao lưu ngay.','error')}}

/* ---------- truy vấn nhanh ---------- */
const by=(a,id)=>a.find(x=>x.id===id);
const itemOf=id=>by(db.items,id), catOf=id=>by(db.categories,id);
const nm=(arr,id,f='name')=>{const o=by(arr,id);return o?(o[f]??''):'—'};
const whName=id=>nm(db.warehouses,id);
/* ---- 2 kho cố định: Kho nội bộ (tồn thực tế) + Kho hóa đơn (theo hóa đơn đầu vào/đầu ra) ---- */
const W_INT='w_int',W_INV='w_inv';
const WH_DEF=()=>[{id:W_INT,name:'Kho nội bộ',location:'Tồn kho thực tế (hàng đang có)',keeper:''},{id:W_INV,name:'Kho hóa đơn',location:'Số lượng theo hóa đơn đầu vào / đầu ra',keeper:''}];
const slipWhs=r=>Array.isArray(r.whs)&&r.whs.length?r.whs:(r.warehouseId?[r.warehouseId]:[]);
const inWh=(r,w)=>slipWhs(r).includes(w);
const whsLabel=r=>slipWhs(r).map(w=>whName(w)).join(' + ')||'—';
const modeOf=whs=>whs.includes(W_INT)&&whs.includes(W_INV)?'both':whs.includes(W_INV)?'inv':'int';
const modeWhs=m=>m==='both'?[W_INT,W_INV]:m==='inv'?[W_INV]:[W_INT];
/* Gộp mọi kho cũ về 2 kho hệ thống. Chạy an toàn nhiều lần (idempotent). Trả về true nếu có thay đổi. */
/* Làm tròn mọi số lượng về số nguyên; đổi tên công ty mặc định cũ. Idempotent. */
function migrateIntQty(){
  let ch=false;const fix=(o,k)=>{const v=+o[k];if(isFinite(v)&&v!==Math.round(v)){o[k]=Math.round(v);ch=true}};
  db.receipts.forEach(r=>r.lines.forEach(l=>fix(l,'qty')));db.issues.forEach(r=>r.lines.forEach(l=>fix(l,'qty')));
  db.adjustments.forEach(a=>fix(a,'qty'));
  const px=o=>{if(o&&o.price!==undefined&&o.price!==null){const v=r2(o.price);if(v!==o.price){o.price=v;ch=true}}};
  db.items.forEach(px);db.receipts.forEach(r=>r.lines.forEach(px));db.issues.forEach(r=>r.lines.forEach(px));db.stocktakes.forEach(s=>s.lines.forEach(l=>{fix(l,'actual');fix(l,'system')}));db.items.forEach(i=>fix(i,'minStock'));
  return ch;
}
function migrateCompany(){
  let ch=false;
  if(db.company&&db.company.name==='Taikisha Vietnam Engineering Inc. (TVE-HCM)'){db.company.name='TTD Computer';ch=true}
  if(db.company){for(const k of['taxId','bankAccount'])if(db.company[k]===undefined){db.company[k]='';ch=true}
    if(db.company.defaultVatRate===undefined){db.company.defaultVatRate=0;ch=true}}
  return ch;
}
function migrateAll(){let ch=migrateWarehouses();if(migrateIntQty())ch=true;if(migrateCompany())ch=true;return ch}
function migrateWarehouses(){
  if(!db)return false;
  const ids=db.warehouses.map(w=>w.id),ok2=[W_INT,W_INV];
  const clean=ids.length===2&&ids.includes(W_INT)&&ids.includes(W_INV)
    &&db.receipts.every(r=>Array.isArray(r.whs)&&!('warehouseId' in r))&&db.issues.every(r=>Array.isArray(r.whs)&&!('warehouseId' in r))
    &&db.stocktakes.every(s=>ok2.includes(s.warehouseId))&&db.adjustments.every(a=>ok2.includes(a.warehouseId))&&db.assets.every(a=>a.warehouseId===W_INT);
  if(clean)return false;
  const old=db.warehouses,map={};
  old.forEach(w=>{const n=norm(w.name);map[w.id]=(w.id===W_INV||(w.id!==W_INT&&/hoa don/.test(n)))?W_INV:W_INT});
  const re=id=>id===W_INV?W_INV:(map[id]||W_INT);
  db.warehouses=WH_DEF().map(d=>{const src=old.find(w=>w.id===d.id)||old.find(w=>map[w.id]===d.id&&norm(w.name)===norm(d.name));return src?{...d,location:src.location||d.location,keeper:src.keeper||''}:d});
  const fix=r=>{r.whs=[...new Set((Array.isArray(r.whs)&&r.whs.length?r.whs:[r.warehouseId]).map(re))];delete r.warehouseId};
  db.receipts.forEach(fix);db.issues.forEach(fix);
  db.stocktakes.forEach(s=>{s.warehouseId=re(s.warehouseId)});db.adjustments.forEach(a=>{a.warehouseId=re(a.warehouseId)});
  db.assets.forEach(a=>{a.warehouseId=W_INT});
  return true;
}
const itemLabel=i=>`${i.sku} · ${i.name}`;
function targetLabel(type,id){
  if(type==='project'){const p=by(db.projects,id);return p?`${p.code} – ${p.name}`:'—'}
  const c=by(db.retail,id);return c?c.name:'—';
}
const can=a=>{const r=session?.role;return a==='admin'?r==='admin':(r==='admin'||r==='keeper')};

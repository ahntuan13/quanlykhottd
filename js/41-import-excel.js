/* 41-import-excel.js – Upload Excel: nhà cung cấp, khách hàng, tồn kho */
'use strict';
(self.__mods=self.__mods||[]).push('41-import-excel');

/* =====================================================================
   NHẬP DỮ LIỆU TỪ EXCEL (NCC / Khách hàng / Tồn kho)
   Quy tắc: trùng khoá (mã / SKU, hoặc tên nếu không có mã) → GHI ĐÈ bản ghi cũ
   (giữ nguyên id nên các phiếu, thiết bị đã liên kết không bị mất liên kết).
   ===================================================================== */
const SPECS={
  ncc:{title:'Upload file nhà cung cấp',need:{name:'Tên NCC'},fields:{code:['ma ncc','ma nha cung cap','ma'],name:['ten ncc','ten nha cung cap','ten'],address:['dia chi'],phone:['dien thoai','sdt','so dien thoai'],email:['email'],contact:['nguoi lien he','lien he']},apply:applySuppliers},
  kh:{title:'Upload file khách hàng',need:{name:'Tên KH'},fields:{code:['ma kh','ma khach hang','ma'],name:['ten kh','ten khach hang','ten'],tax:['mst','ma so thue'],address:['dia chi'],phone:['dien thoai','sdt'],contact:['nguoi lien he','lien he']},apply:applyCustomers},
  stock:{title:'Upload file số lượng tồn kho',need:{sku:'SKU',name:'Tên hàng'},warehouse:true,fields:{sku:['sku','ma hang','ma'],name:['ten hang','ten hang hoa','ten'],cat:['danh muc','nhom','loai'],unit:['dvt','don vi','don vi tinh'],qty:['ton kho','so luong','ton','sl'],price:['don gia','gia']},apply:applyStock}
};
function readSheet(file){
  return new Promise((res,rej)=>{
    if(!window.XLSX)return rej(new Error('Chưa tải được thư viện Excel (SheetJS). Kiểm tra kết nối mạng.'));
    const rd=new FileReader();
    rd.onload=()=>{try{const wb=XLSX.read(new Uint8Array(rd.result),{type:'array'});let rows=[];for(const n of wb.SheetNames){const r=XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:'',raw:true});if(r.length){rows=r;break}}res(rows)}catch(e){rej(e)}};
    rd.onerror=()=>rej(new Error('Không đọc được file.'));rd.readAsArrayBuffer(file);
  });
}
function mapRows(raw,spec){
  if(!raw.length)return{error:'File không có dữ liệu.'};
  const keys=Object.keys(raw[0]),col={};
  for(const f in spec.fields){const k=keys.find(k=>spec.fields[f].includes(norm(k)));if(k!==undefined)col[f]=k}
  const miss=Object.keys(spec.need).filter(f=>!col[f]);
  if(miss.length)return{error:`Thiếu cột: ${miss.map(f=>spec.need[f]).join(', ')}. Các cột tìm thấy trong file: ${keys.slice(0,8).join(', ')}`};
  return{rows:raw.map(r=>{const o={};for(const f in col)o[f]=r[col[f]];return o})};
}
function dryRun(fn){const snap=JSON.stringify(db);try{return fn()}finally{db=JSON.parse(snap)}}
const pickFile=cb=>{const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls,.csv';i.onchange=()=>{if(i.files[0])cb(i.files[0])};i.click()};
async function startImport(kind,file){
  const spec=SPECS[kind];
  try{
    const m=mapRows(await readSheet(file),spec);if(m.error)return toast(m.error,'error');
    IMP={kind,file:file.name,rows:m.rows,wh:W_INT,spec};
    modal(spec.title,`<p class="note">File: <b>${esc(file.name)}</b> · ${fmtNum(m.rows.length)} dòng dữ liệu</p><div id="imp"></div>`,{size:'mid',footer:cancelBtn+'<button class="btn acc" data-act="imp-ok">Xác nhận nhập</button>'});
    renderImp();
  }catch(e){toast('Không đọc được file: '+e.message,'error')}
}
function renderImp(){
  if(!IMP)return;
  const box=$('#imp');if(!box)return;
  let rep;
  try{rep=dryRun(()=>IMP.spec.apply(IMP.rows,IMP.wh,IMP.file))}
  catch(e){box.innerHTML=`<div class="empty">${esc(e.message)}</div>`;IMP.err=true;return}
  IMP.err=false;
  const map=Object.values(rep.map||{});
  box.innerHTML=`${IMP.spec.warehouse?`<div class="fg" style="margin-bottom:12px"><label class="f"><span>Cập nhật tồn cho kho</span><select class="in" data-impwh>${[[W_INT,'Kho nội bộ (tồn thực tế)'],[W_INV,'Kho hóa đơn'],['both','Cả hai kho (đặt bằng số trong file)']].map(([v,l])=>`<option value="${v}" ${v===IMP.wh?'selected':''}>${l}</option>`).join('')}</select></label></div>`:''}
  <div class="kpis sm">${kpi('Thêm mới',fmtNum(rep.add),'','ok')}${kpi('Ghi đè (có thay đổi)',fmtNum(rep.upd),'','warn')}${kpi('Giống hệt, không đổi',fmtNum(rep.same))}${(rep.extra||[]).map(([l,v])=>kpi(l,fmtNum(v),'','info')).join('')}</div>
  <p class="note">Bản ghi trùng ${IMP.kind==='stock'?'SKU':'mã (hoặc tên nếu không có mã)'} với dữ liệu đang có sẽ được <b>ghi đè</b>; bản ghi chưa có sẽ được thêm mới. Dữ liệu có sẵn mà không nằm trong file được giữ nguyên.${IMP.kind==='stock'?' Tồn kho của từng mặt hàng ở kho đã chọn sẽ được đặt bằng số lượng trong file (ghi thành một phiếu kiểm kê để truy vết).':''}</p>
  ${map.length?`<details><summary class="note">Danh mục được gộp vào danh mục có sẵn (${map.length})</summary><ul class="imp-notes">${map.map(x=>`<li>${esc(x.from)} → <b>${esc(x.to)}</b> (${x.n} mã)</li>`).join('')}</ul></details>`:''}
  ${rep.notes.length?`<details open><summary class="note"><b>Cần lưu ý (${rep.notes.length})</b></summary><ul class="imp-notes">${rep.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`:''}`;
}
document.addEventListener('change',e=>{if(IMP&&e.target.dataset&&e.target.dataset.impwh!==undefined){IMP.wh=e.target.value;renderImp()}});
ACT['imp-ok']=()=>{
  if(!IMP||IMP.err)return;let rep;
  const ok=transact(()=>{rep=IMP.spec.apply(IMP.rows,IMP.wh,IMP.file)});
  if(ok)done(`Đã nhập ${IMP.file}: thêm ${rep.add}, ghi đè ${rep.upd}, không đổi ${rep.same}`);
};
ACT['up-ncc']=()=>pickFile(f=>startImport('ncc',f));
ACT['up-kh']=()=>pickFile(f=>startImport('kh',f));
ACT['up-stock']=()=>{if(!db.warehouses.length)return toast('Chưa có kho. Hãy thêm kho ở Thông tin → Warehouse.','warn');pickFile(f=>startImport('stock',f))};

/* Mã trùng trong cùng file: cùng tên → dòng sau ghi đè; khác tên → tách thành bản ghi riêng (đổi hậu tố -2, -3…) */
function dedupCode(code,nn,seen,row,rep){
  let key=norm(code);if(!key)return code;
  const prev=seen.get(key);
  if(prev&&prev.nn!==nn){
    let k=2,c2;do{c2=`${code}-${k++}`}while(seen.has(norm(c2)));
    rep.notes.push(`Dòng ${row}: mã "${code}" bị trùng với một đơn vị KHÁC (dòng ${prev.row}) → giữ cả hai, đổi mã dòng này thành "${c2}"`);
    code=c2;key=norm(c2);
  }else if(prev){rep.notes.push(`Dòng ${row}: mã "${code}" lặp lại cùng tên với dòng ${prev.row} → dòng sau ghi đè dòng trước`)}
  seen.set(key,{nn,row});return code;
}
function assignFields(ex,data){const before=JSON.stringify(ex);for(const k in data){if(data[k]!==''&&data[k]!==undefined)ex[k]=data[k]}return JSON.stringify(ex)!==before}

function applySuppliers(rows){
  const rep={add:0,upd:0,same:0,notes:[],extra:[]},seen=new Map();
  rows.forEach((r,ix)=>{
    const row=ix+2,name=cell(r.name);
    if(!name){if(cell(r.code)||cell(r.address))rep.notes.push(`Dòng ${row}: thiếu tên NCC → bỏ qua`);return}
    const nn=norm(name),code=dedupCode(cell(r.code),nn,seen,row,rep),key=norm(code);
    const ex=(key&&db.suppliers.find(s=>norm(s.code)===key))||db.suppliers.find(s=>norm(s.name)===nn);
    const data={code,name,address:cell(r.address),phone:cell(r.phone),email:cell(r.email),contact:cell(r.contact)};
    if(ex){assignFields(ex,data)?rep.upd++:rep.same++}
    else{db.suppliers.push({id:uid('s'),code:'',contact:'',phone:'',email:'',address:'',...data});rep.add++}
  });
  return rep;
}
function applyCustomers(rows){
  const rep={add:0,upd:0,same:0,notes:[],extra:[]},seen=new Map();let fixedTax=0;
  const nextCode=()=>{let n=db.projects.length+1,c;do{c='KH-'+String(n++).padStart(4,'0')}while(db.projects.some(p=>norm(p.code)===norm(c)));return c};
  rows.forEach((r,ix)=>{
    const row=ix+2,name=cell(r.name);
    if(!name){if(cell(r.code)||cell(r.address))rep.notes.push(`Dòng ${row}: thiếu tên khách hàng → bỏ qua`);return}
    const nn=norm(name);let code=cell(r.code);
    code=code?dedupCode(code,nn,seen,row,rep):nextCode();
    const key=norm(code);
    let tax=r.tax;
    if(typeof tax==='number'){tax=String(Math.round(tax));if(tax.length===9){tax='0'+tax;fixedTax++}}else tax=cell(tax);
    const ex=db.projects.find(p=>norm(p.code)===key)||db.projects.find(p=>norm(p.name)===nn);
    const data={code,name,taxId:tax,address:cell(r.address),contact:cell(r.contact)};
    if(ex){assignFields(ex,data)?rep.upd++:rep.same++}
    else{db.projects.push({id:uid('p'),customer:'',contact:'',note:'',taxId:'',address:'',...data});rep.add++}
  });
  if(fixedTax)rep.notes.push(`${fixedTax} mã số thuế trong file chỉ có 9 chữ số (Excel làm mất số 0 đầu) → đã tự thêm số 0 ở đầu thành 10 số. Hãy đối chiếu lại nếu cần.`);
  return rep;
}
const CAT_ALIAS={'laptop':'c_laptop','lcd':'c_monitor','may in':'c_printer','ups':'c_ups','switch':'c_network','wifi':'c_network','chuot':'c_acc','phim':'c_acc','usb':'c_acc'};
function resolveCat(name,rep){
  let n=cell(name);if(!n)n='Chưa phân loại';
  const nn=norm(n);let c=db.categories.find(x=>norm(x.name)===nn);if(c)return c;
  const aid=CAT_ALIAS[nn];
  if(aid){c=by(db.categories,aid);if(c){const e=(rep.map[nn]??={from:n,to:c.name,n:0});e.n++;return c}}
  c={id:uid('c'),name:n,isIT:false};db.categories.push(c);rep.newCats.add(n);return c;
}
function applyStock(rows,wh,file){
  const list=wh==='both'?[W_INT,W_INV]:[wh];
  if(!wh||list.some(w=>!by(db.warehouses,w)))throw new Error('Chưa chọn kho.');
  const rep={add:0,upd:0,same:0,notes:[],extra:[],newCats:new Set(),map:{}},m=stockMap(),linesBy={},seen=new Map(),state=new Map();
  list.forEach(w=>{linesBy[w]=new Map()});
  rows.forEach((r,ix)=>{
    const row=ix+2,sku=cell(r.sku),name=cell(r.name);
    if(!sku||!name){if(sku||name)rep.notes.push(`Dòng ${row}: thiếu ${!sku?'SKU':'tên hàng'} → bỏ qua`);return}
    const key=sku.toLowerCase();
    if(seen.has(key))rep.notes.push(`Dòng ${row}: SKU "${sku}" đã có ở dòng ${seen.get(key)} → dòng sau ghi đè dòng trước`);
    seen.set(key,row);
    let unit=cell(r.unit);
    if(!unit||norm(unit)==='dvt'){rep.notes.push(`Dòng ${row} (${sku} – ${name}): ĐVT ${unit?`ghi "${unit}"`:'để trống'} → đặt tạm "Cái", nên kiểm tra lại mặt hàng này`);unit='Cái'}
    unit=unit.charAt(0).toLocaleUpperCase('vi')+unit.slice(1);
    let qty=numVN(r.qty);if(qty<0){rep.notes.push(`Dòng ${row} (${sku}): tồn âm (${qty}) → đặt 0`);qty=0}
    if(qty!==Math.round(qty)){rep.notes.push(`Dòng ${row} (${sku} – ${name}): số lượng ${String(qty).replace('.',',')} không phải số nguyên → làm tròn thành ${Math.round(qty)}`);qty=Math.round(qty)}
    const price=r2(numVN(r.price)),cat=resolveCat(r.cat,rep);
    let it=db.items.find(x=>x.sku.toLowerCase()===key),isNew=false,changed=false;
    if(it){const before=JSON.stringify(it);it.name=name;it.categoryId=cat.id;it.unit=unit;if(price>0)it.price=price;changed=JSON.stringify(it)!==before}
    else{it={id:uid('it'),sku,name,categoryId:cat.id,unit,minStock:0,price,note:''};db.items.push(it);isNew=true}
    let diff=false;
    list.forEach(w=>{const cur=m[it.id]?.[w]||0,d=Math.abs(cur-qty)>1e-9;if(d){diff=true;linesBy[w].set(it.id,{itemId:it.id,system:cur,actual:qty})}else linesBy[w].delete(it.id)});
    const s=state.get(it.id)||{isNew:false,changed:false};s.isNew=s.isNew||isNew;s.changed=s.changed||changed||diff;state.set(it.id,s);
  });
  state.forEach(s=>{if(s.isNew)rep.add++;else if(s.changed)rep.upd++;else rep.same++});
  let nLines=0;
  list.forEach(w=>{const ls=linesBy[w];if(!ls.size)return;nLines+=ls.size;db.stocktakes.push({id:uid('kk'),code:nextCode('KK'),date:todayStr(),warehouseId:w,note:`Cập nhật tồn ${whName(w)} từ file Excel: ${file}`,lines:[...ls.values()],createdBy:session?.name||'system',createdAt:Date.now()})});
  rep.extra=[['Dòng điều chỉnh tồn',nLines],['Danh mục mới',rep.newCats.size]];
  if(rep.newCats.size)rep.notes.unshift(`Sẽ tạo ${rep.newCats.size} danh mục mới từ file: ${[...rep.newCats].join(', ')}`);
  return rep;
}

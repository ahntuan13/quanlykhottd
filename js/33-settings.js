/* 33-settings.js – Thông tin (NCC, khách, dự án, kho, danh mục), User/Permission, Sao lưu & Hệ thống */
'use strict';
(self.__mods=self.__mods||[]).push('33-settings');

/* =====================================================================
   SETTINGS
   ===================================================================== */
const nIss=(type,id)=>db.issues.filter(i=>i.targetType===type&&i.targetId===id);
const CRUD={
  supplier:{col:'suppliers',pre:'s',t:'Nhà cung cấp',fields:[['code','Mã NCC'],['name','Tên nhà cung cấp',1],['contact','Người liên hệ'],['phone','Điện thoại'],['email','Email'],['address','Địa chỉ']],unique:'code',upload:['up-ncc','Upload file NCC'],
    extra:()=>[nc('Số phiếu nhập',r=>db.receipts.filter(x=>x.supplierId===r.id).length)],
    used:id=>db.receipts.some(r=>r.supplierId===id)},
  retail:{col:'retail',pre:'rt',t:'Khách lẻ',fields:[['name','Tên khách lẻ',1],['phone','Điện thoại'],['dept','Phòng ban / đơn vị'],['note','Ghi chú']],
    extra:()=>[nc('Số phiếu xuất',r=>nIss('retail',r.id).length),nc('Thiết bị đang giữ',r=>db.assets.filter(a=>a.status==='assigned'&&a.holder&&a.holder.type==='retail'&&a.holder.id===r.id).length)],
    used:id=>db.issues.some(i=>i.targetType==='retail'&&i.targetId===id)||db.assets.some(a=>a.holder&&a.holder.type==='retail'&&a.holder.id===id)},
  project:{col:'projects',pre:'p',t:'Khách hàng / Dự án',fields:[['code','Mã KH / dự án',1],['name','Tên khách hàng / dự án',1],['taxId','Mã số thuế'],['address','Địa chỉ'],['customer','Khách hàng'],['contact','Người liên hệ'],['note','Ghi chú']],unique:'code',upload:['up-kh','Upload file Khách hàng'],
    extra:()=>[nc('Số phiếu xuất',r=>nIss('project',r.id).length),nc('Thiết bị đang giữ',r=>db.assets.filter(a=>a.status==='assigned'&&a.holder&&a.holder.type==='project'&&a.holder.id===r.id).length)],
    used:id=>db.issues.some(i=>i.targetType==='project'&&i.targetId===id)||db.assets.some(a=>a.holder&&a.holder.type==='project'&&a.holder.id===id)},
  warehouse:{col:'warehouses',pre:'w',t:'Kho',admin:1,noAdd:true,noDel:true,note:'Hệ thống dùng <b>2 kho cố định</b>: <b>Kho nội bộ</b> = tồn hàng thực tế (dùng cho cảnh báo hết hàng, cấp phát thiết bị IT, kiểm kê); <b>Kho hóa đơn</b> = số lượng theo hóa đơn đầu vào / đầu ra. Mỗi phiếu nhập / xuất chọn ghi nhận vào cả hai kho hoặc chỉ một kho.',fields:[['name','Tên kho',1],['location','Vị trí / địa chỉ'],['keeper','Thủ kho']],
    extra:()=>{const m=stockMap();return[nc('Số mã có tồn',r=>db.items.filter(i=>(m[i.id]?.[r.id]||0)>0).length),nc('Phiếu nhập',r=>db.receipts.filter(x=>inWh(x,r.id)).length),nc('Phiếu xuất',r=>db.issues.filter(x=>inWh(x,r.id)).length)]},
    used:id=>db.receipts.some(r=>inWh(r,id))||db.issues.some(r=>inWh(r,id))||db.stocktakes.some(r=>r.warehouseId===id)||db.adjustments.some(r=>r.warehouseId===id)||db.assets.some(a=>a.warehouseId===id)},
  category:{col:'categories',pre:'c',t:'Danh mục',admin:1,note:'Bấm <b>🏷 Gán hàng hóa</b> ở từng danh mục để tự chọn những mặt hàng / linh kiện thuộc nhóm đó (lấy từ Danh sách hàng hóa). Đánh dấu “IT Asset” để danh mục hiện thành một mục riêng trong menu IT Asset.',fields:[['name','Tên danh mục',1]],flags:[['isIT','Thuộc nhóm IT Asset (quản lý theo Serial, có mục riêng trên menu)']],
    extra:()=>[nc('Số mã hàng',r=>db.items.filter(i=>i.categoryId===r.id).length)],
    used:id=>db.items.some(i=>i.categoryId===id)}
};
function crudPage(key){
  const C=CRUD[key],canEdit=()=>C.admin?can('admin'):can('write');
  return{t:C.t,
    head(){return `${C.note?`<p class="note">${C.note}</p>`:''}<div class="bar">${fSearch('Tìm kiếm…')}<div class="sp"></div>${C.upload&&canEdit()?`<button class="btn" data-act="${C.upload[0]}">⬆ ${C.upload[1]}</button>`:''}<button class="btn" data-act="export" data-name="${slug(C.t)}">⬇ Excel</button>${canEdit()&&!C.noAdd?`<button class="btn acc" data-act="crud-new" data-key="${key}">＋ Thêm ${C.t.toLowerCase()}</button>`:''}</div>`},
    tbl(){
      const q=(F().q||'').toLowerCase(),rows=db[C.col].filter(r=>!q||Object.values(r).join(' ').toLowerCase().includes(q));
      return table([...C.fields.map(([k,l])=>({h:l,c:k==='address'?'addr':'',f:r=>esc(r[k]||'')})),...(C.extra?C.extra():[]),...(C.flags||[]).map(([k])=>({h:'Nhóm IT',f:r=>r[k]?badge('info','IT Asset'):'<span class="muted">—</span>',x:r=>r[k]?'IT':''})),actCol(r=>canEdit()?`${key==='category'?`<button class="btn sm" data-act="cat-assign" data-id="${r.id}">🏷 Gán hàng hóa</button> `:''}<button class="btn sm" data-act="crud-edit" data-key="${key}" data-id="${r.id}">Sửa</button> ${C.noDel?'':` <button class="btn sm danger" data-act="crud-del" data-key="${key}" data-id="${r.id}">Xoá</button>`}`:'')],rows,{empty:'Chưa có dữ liệu.'});
    }};
}
Object.keys(CRUD).forEach(k=>{PAGES['info/'+k]=crudPage(k)});PAGES['in/suppliers']=crudPage('supplier');
function crudForm(key,id){
  const C=CRUD[key],o=id?by(db[C.col],id):{};
  modal((id?'Sửa ':'Thêm ')+C.t.toLowerCase(),`<form id="mf" data-submit="crud-save" data-key="${key}" data-id="${id||''}"><div class="fg">${C.fields.map(([k,l,req])=>inp(k,l,o[k]||'',{req,full:['address','note'].includes(k)})).join('')}${(C.flags||[]).map(([k,l])=>chk(k,l,o[k])).join('')}</div></form>`,{footer:cancelBtn+`<button class="btn primary" form="mf">Lưu</button>`});
}
ACT['crud-new']=el=>crudForm(el.dataset.key);ACT['crud-edit']=el=>crudForm(el.dataset.key,el.dataset.id);
SUB['crud-save']=form=>{
  const key=form.dataset.key,C=CRUD[key],id=form.dataset.id,d=fd(form),rec={};
  C.fields.forEach(([k])=>rec[k]=(d[k]||'').trim());(C.flags||[]).forEach(([k])=>rec[k]=!!d[k]);
  if(C.unique&&rec[C.unique]&&db[C.col].some(x=>x.id!==id&&String(x[C.unique]||'').toLowerCase()===rec[C.unique].toLowerCase()))return toast(`${C.fields.find(f=>f[0]===C.unique)[1]} đã tồn tại.`,'error');
  if(transact(()=>{let o=id?by(db[C.col],id):null;if(!o){o={id:uid(C.pre)};db[C.col].push(o)}Object.assign(o,rec);if(key==='category'){if(o.isIT&&!o.slug)o.slug=o.id}}))done();
};
ACT['crud-del']=el=>{
  const key=el.dataset.key,C=CRUD[key],id=el.dataset.id;
  if(C.used(id))return toast('Mục này đang được sử dụng trong dữ liệu, không thể xoá.','error');
  if(C.noDel)return toast('Đây là kho hệ thống, không thể xoá.','error');
  if(confirm('Xoá mục này?'))transact(()=>{db[C.col]=db[C.col].filter(x=>x.id!==id)})&&done('Đã xoá');
};

/* ---- người dùng / phân quyền ---- */
PAGES['set/users']={t:'User / Permission',
  r(){
    const adm=can('admin');
    return `<div class="bar"><div class="sp"></div>${adm?'<button class="btn acc" data-act="user-new">＋ Thêm người dùng</button>':''}</div>`+
    table([{h:CLOUD?'Email':'Tên đăng nhập',f:u=>`<b>${esc(u.username)}</b>`},{h:'Họ tên',f:u=>esc(u.name)},{h:'Vai trò',f:u=>badge(u.role==='admin'?'bad':u.role==='keeper'?'info':'mute',ROLES[u.role])},{h:'Trạng thái',f:u=>u.active?badge('ok','Đang hoạt động'):badge('mute','Đã khoá')},actCol(u=>adm?`<button class="btn sm" data-act="user-edit" data-id="${u.id}">Sửa</button>${CLOUD?` <button class="btn sm" data-act="user-reset" data-id="${u.id}" title="Gửi email đặt lại mật khẩu">Đặt lại MK</button>`:(u.id!==session.id?` <button class="btn sm danger" data-act="user-del" data-id="${u.id}">Xoá</button>`:'')}`:'')],db.users)+
    card('Phân quyền theo vai trò',miniTable(['Chức năng','Quản trị viên','Thủ kho','Chỉ xem'],[['Xem dashboard, báo cáo, phiếu','✔','✔','✔'],['Tạo / sửa phiếu nhập, xuất, kiểm kê','✔','✔','—'],['Quản lý hàng hóa, tài sản IT','✔','✔','—'],['Nhà cung cấp, khách lẻ, dự án','✔','✔','—'],['Kho, danh mục, người dùng, sao lưu / khôi phục','✔','—','—']].map(r=>`<tr><td>${r[0]}</td><td class="c">${r[1]}</td><td class="c">${r[2]}</td><td class="c">${r[3]}</td></tr>`))+`<p class="note">Lưu ý: ứng dụng chạy hoàn toàn trên trình duyệt nên phân quyền chỉ giúp hạn chế thao tác nhầm, không phải lớp bảo mật thực sự.</p>`);
  }};
function userForm(id){
  const u=id?by(db.users,id):{username:'',name:'',role:'keeper',active:true};
  modal(id?'Sửa người dùng':'Thêm người dùng',`<form id="mf" data-submit="user-save" data-id="${id||''}"><div class="fg">${CLOUD?inp('username','Email đăng nhập',u.username,{req:1,type:'email',attrs:id?'readonly':''}):inp('username','Tên đăng nhập',u.username,{req:1})}${inp('name','Họ tên',u.name,{req:1})}${sel('role','Vai trò',Object.entries(ROLES),u.role)}${CLOUD?(id?'':inp('password','Mật khẩu ban đầu (tối thiểu 6 ký tự)','',{type:'password',req:1,attrs:'minlength="6" autocomplete="new-password"'})):inp('password',id?'Mật khẩu mới (để trống nếu không đổi)':'Mật khẩu (tối thiểu 6 ký tự)','',{type:'password',req:!id,attrs:'minlength="6" autocomplete="new-password"'})}${chk('active','Cho phép đăng nhập',u.active)}</div></form>`,{footer:cancelBtn+`<button class="btn primary" form="mf">Lưu</button>`});
}
ACT['user-new']=()=>userForm();ACT['user-edit']=el=>userForm(el.dataset.id);
SUB['user-save']=form=>{
  if(CLOUD)return cloudUserSave(form);
  const d=fd(form),id=form.dataset.id,un=d.username.trim();
  if(db.users.some(x=>x.id!==id&&x.username.toLowerCase()===un.toLowerCase()))return toast('Tên đăng nhập đã tồn tại.','error');
  const ok=transact(()=>{
    let u=id?by(db.users,id):null;if(!u){u={id:uid('u')};db.users.push(u)}
    Object.assign(u,{username:un,name:d.name.trim(),role:d.role,active:!!d.active});if(d.password)u.pass=pw(d.password);
    if(!db.users.some(x=>x.role==='admin'&&x.active))throw new Error('Phải còn ít nhất một quản trị viên đang hoạt động.');
    if(u.id===session.id){if(!u.active)throw new Error('Không thể tự khoá tài khoản đang đăng nhập.');session.role=u.role;session.name=u.name}
  });
  if(ok){closeModal();shell();render(true);toast('Đã lưu')}
};
ACT['user-del']=el=>{const id=el.dataset.id;if(id===session.id)return;if(confirm('Xoá người dùng này?'))transact(()=>{db.users=db.users.filter(u=>u.id!==id);if(!db.users.some(x=>x.role==='admin'&&x.active))throw new Error('Phải còn ít nhất một quản trị viên đang hoạt động.')})&&done('Đã xoá')};

/* ---- hệ thống / sao lưu ---- */
/* ---- Kiểm tra đơn giá bất thường (thường do gõ/dán số kiểu 1.305.555,5 vào ô số bị hiểu thành 1,3055555) ---- */
const PRICE_SUS=1000;
function priceAudit(){
  const items=db.items.filter(i=>i.price>0&&i.price<PRICE_SUS);
  const lines=[];
  [...db.receipts].sort(byDateDesc).forEach(r=>r.lines.forEach((l,idx)=>{if(l.price>0&&l.price<PRICE_SUS)lines.push({r,l,idx})}));
  return{items,lines};
}
function auditCard(){
  const {items,lines}=priceAudit(),w=can('write');
  const fix=(kind,id,idx,cur)=>w?`<button class="btn sm" data-act="price-fix" data-kind="${kind}" data-id="${id}" data-idx="${idx}" data-mult="1000" title="Nhân 1.000 → ${fmtPrice(cur*1000)} VND">×1.000</button> <button class="btn sm" data-act="price-fix" data-kind="${kind}" data-id="${id}" data-idx="${idx}" data-mult="1000000" title="Nhân 1.000.000 → ${fmtPrice(cur*1000000)} VND">×1.000.000</button>`:'';
  const body=(!items.length&&!lines.length)?'<p class="note">Không có đơn giá nào dưới 1.000 VND. Mọi đơn giá đều hợp lý.</p>':`<p class="note">Các đơn giá dưới <b>${fmtNum(PRICE_SUS)} VND</b> thường là do nhập sai dấu chấm / phẩy (ví dụ 1.305.555,5 bị hiểu thành 1,3055555). Nút <b>×1.000</b> / <b>×1.000.000</b> sửa nhanh; hàng thật sự rẻ (ví dụ cáp tính theo mét) thì bỏ qua.</p>
    ${items.length?`<h4 style="margin:8px 0 6px;font-size:13.5px">Đơn giá tham chiếu của hàng hóa (${items.length})</h4>`+miniTable(['Mã','Tên hàng','Đơn giá hiện tại (VND)',''],items.slice(0,100).map(i=>`<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td class="num">${fmtPrice(i.price)}</td><td class="act">${fix('item',i.id,0,i.price)} <button class="btn sm" data-act="item-edit" data-id="${i.id}">Sửa</button></td></tr>`)):''}
    ${lines.length?`<h4 style="margin:12px 0 6px;font-size:13.5px">Dòng trong phiếu nhập (${lines.length})</h4>`+miniTable(['Phiếu','Ngày','Mặt hàng','SL','Đơn giá (VND)','Thành tiền (VND)',''],lines.slice(0,100).map(({r,l,idx})=>`<tr><td>${slipLink('receipt',r)}</td><td>${fmtDate(r.date)}</td><td>${esc(itemLabel(itemOf(l.itemId)||{sku:'?',name:'(đã xoá)'}))}</td><td class="num">${fmtNum(l.qty)}</td><td class="num">${fmtPrice(l.price)}</td><td class="num">${fmtMoney(amt(l.qty,l.price))}</td><td class="act">${fix('line',r.id,idx,l.price)}</td></tr>`)):''}`;
  return card(`Kiểm tra đơn giá bất thường (${items.length+lines.length})`,body);
}
ACT['price-fix']=el=>{
  const mult=+el.dataset.mult,kind=el.dataset.kind,id=el.dataset.id,idx=+el.dataset.idx;
  const r2=v=>Math.round(v*mult*100)/100;
  if(transact(()=>{
    if(kind==='item'){const it=itemOf(id);it.price=r2(it.price)}
    else{const r=by(db.receipts,id),l=r.lines[idx],it=itemOf(l.itemId);l.price=r2(l.price);if(it&&it.price>0&&it.price<PRICE_SUS)it.price=l.price}
  }))done('Đã sửa đơn giá');
};
PAGES['set/system']={t:'Sao lưu & Hệ thống',
  r(){
    const adm=can('admin'),kb=Math.round(JSON.stringify(db).length/1024);
    const mode=CLOUD?card('Dữ liệu dùng chung (Firebase)',`<p class="note">Đang đồng bộ theo thời gian thực với dự án <b>${esc(FBCFG.projectId)}</b>. Đăng nhập bằng: <b>${esc(session.username)}</b>. Mọi thay đổi được lưu lên Firestore và hiện ngay cho những người đang mở app.</p>${FIREBASE_CONFIG?'':'<div class="bar"><button class="btn" data-act="fb-disconnect">Ngắt kết nối Firebase (về chế độ cục bộ)</button></div>'}`):card('Dữ liệu dùng chung',`<p class="note">Hiện dữ liệu chỉ lưu trong trình duyệt này. Kết nối Firebase để nhiều người cùng dùng một dữ liệu.</p><div class="bar"><button class="btn acc" data-act="fb-config">Kết nối Firebase</button></div>`);
    return mode+`<div class="grid g2">
    ${card('Thông tin công ty (hiển thị trên phiếu)',`<form data-submit="company"><div class="fg">${inp('name','Tên công ty',db.company.name,{full:1,req:1})}${inp('address','Địa chỉ',db.company.address,{full:1})}${inp('phone','Điện thoại',db.company.phone)}<div class="f" style="justify-content:flex-end"><button class="btn primary" ${adm?'':'disabled'}>Lưu thông tin</button></div></div></form>`)}
    ${card('Sao lưu & khôi phục',`<p class="note">${CLOUD?`Dữ liệu nằm trên Firebase (~${kb} KB đang tải về máy). Vẫn nên <b>xuất file sao lưu định kỳ</b>. Khôi phục từ file sẽ thay thế dữ liệu của <b>tất cả mọi người</b>.`:`Dữ liệu được lưu trong trình duyệt này (~${kb} KB). Mỗi trình duyệt / máy có dữ liệu riêng, nên hãy <b>xuất file sao lưu định kỳ</b> và dùng file này để chuyển dữ liệu sang máy khác.`}</p><div class="bar"><button class="btn primary" data-act="backup">⬇ Xuất sao lưu (JSON)</button><button class="btn" data-act="restore" ${adm?'':'disabled'}>⬆ Khôi phục từ file</button></div>`)}
    </div>
    ${card('Dữ liệu mẫu & làm mới',`<p class="note">“Nạp dữ liệu mẫu” thay toàn bộ dữ liệu kho hiện tại bằng bộ dữ liệu demo (giữ nguyên tài khoản người dùng). “Xoá toàn bộ” đưa hệ thống về trạng thái trống.</p><div class="bar"><button class="btn" data-act="sample" ${adm?'':'disabled'}>Nạp dữ liệu mẫu</button><button class="btn danger" data-act="wipe" ${adm?'':'disabled'}>Xoá toàn bộ dữ liệu kho</button></div>`)}
    ${auditCard()}
    ${card('Tổng số bản ghi',miniTable(['Nhóm','Số lượng'],[['Hàng hóa',db.items.length],['Phiếu nhập',db.receipts.length],['Phiếu xuất',db.issues.length],['Phiếu kiểm kê',db.stocktakes.length],['Tài sản IT',db.assets.length],['Nhà cung cấp',db.suppliers.length],['Khách lẻ',db.retail.length],['Dự án',db.projects.length]].map(([a,b])=>`<tr><td>${a}</td><td class="num">${b}</td></tr>`)))}`;
  }};
SUB.company=form=>{if(!can('admin'))return toast('Chỉ quản trị viên được sửa.','error');const d=fd(form);db.company={name:d.name.trim(),address:d.address.trim(),phone:d.phone.trim()};save();render(true);toast('Đã lưu')};
ACT.backup=()=>{const b=new Blob([JSON.stringify(db,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`sao-luu-kho_${todayStr()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
ACT.restore=()=>{
  const i=document.createElement('input');i.type='file';i.accept='.json,application/json';
  i.onchange=()=>{const f=i.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{
    const p=JSON.parse(rd.result);if(!Array.isArray(p.items)||!Array.isArray(p.receipts)||!Array.isArray(p.users))throw new Error('File không đúng định dạng sao lưu của ứng dụng.');
    if(!confirm('Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại. Tiếp tục?'))return;
    if(CLOUD)p.users=db.users;db=p;migrate();migrateAll();save();if(!db.users.some(u=>u.id===session.id&&u.active)){ACT.logout();toast('Đã khôi phục. Vui lòng đăng nhập lại.');return}
    shell();render(false);toast('Đã khôi phục dữ liệu');
  }catch(e){toast(e.message,'error')}};rd.readAsText(f)};i.click();
};
ACT.wipe=()=>{if(!confirm('Xoá TOÀN BỘ dữ liệu kho (hàng hóa, phiếu, tài sản, danh mục…)?'+(CLOUD?' Việc này ảnh hưởng tới TẤT CẢ người dùng.':'')+' Không thể hoàn tác. Hãy xuất sao lưu trước.'))return;const u=db.users,c=db.company;db=defaultDB();db.users=u;db.company=c;save();render(true);toast('Đã xoá dữ liệu')};
ACT.sample=()=>{if(db.items.length&&!confirm('Dữ liệu kho hiện tại sẽ bị thay thế bằng dữ liệu mẫu'+(CLOUD?' (cho TẤT CẢ người dùng)':'')+'. Tiếp tục?'))return;loadSample();render(true)};

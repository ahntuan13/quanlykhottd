/* 31-reports.js – Các báo cáo */
'use strict';
(self.__mods=self.__mods||[]).push('31-reports');

/* =====================================================================
   BÁO CÁO
   ===================================================================== */
const firstOfYear=()=>`${new Date().getFullYear()}-01-01`;
const periodSub=(from,to)=>`Kỳ: ${from?fmtDate(from):'…'} – ${to?fmtDate(to):'…'}`;
PAGES['rpt/monthly']={t:'Báo cáo Nhập – Xuất – Tồn theo tháng',
  sub(){const f=F();return `Tháng ${(f.month||todayStr().slice(0,7)).split('-').reverse().join('/')} · ${whName(f.wh||W_INT)}`},
  head(){return `<div class="bar">${fMonth('month','Tháng',todayStr().slice(0,7))}${fSel('wh','Kho',stockWhOpts())}${fSel('cat','Danh mục',catOpts())}<div class="sp"></div>${rptBtns('nxt-thang')}</div>`},
  tbl(){
    const f=F(),mk=f.month||todayStr().slice(0,7),from=mk+'-01',to=addDays(addMonths(from,1),-1),wh=f.wh||W_INT;
    const op=stockMap(from,true),cl=stockMap(to),fi=flow('receipts',from,to,wh),fo=flow('issues',from,to,wh);
    const rows=db.items.filter(i=>!f.cat||i.categoryId===f.cat).map(i=>{const o=qtyIn(op,i.id,wh),c=qtyIn(cl,i.id,wh),a=fi[i.id]?.qty||0,b=fo[i.id]?.qty||0;return{i,o,a,b,adj:Math.round((c-o-a+b)*1000)/1000,c}}).filter(r=>r.o||r.a||r.b||r.adj||r.c);
    const sum=k=>rows.reduce((s,r)=>s+r[k],0);
    const vi=Object.values(fi).reduce((s,x)=>s+x.val,0),vo=Object.values(fo).reduce((s,x)=>s+x.val,0);
    return `<div class="kpis">${kpi('Tồn đầu kỳ',fmtNum(sum('o')))}${kpi('Nhập trong tháng',fmtNum(sum('a')),fmtMoney(vi)+' VND','ok')}${kpi('Xuất trong tháng',fmtNum(sum('b')),fmtMoney(vo)+' VND','warn')}${kpi('Tồn cuối kỳ',fmtNum(sum('c')),'','info')}</div>`+
    table([{h:'Mã hàng',f:r=>`<b>${esc(r.i.sku)}</b>`,x:r=>r.i.sku},{h:'Tên hàng hóa',f:r=>esc(r.i.name),x:r=>r.i.name},{h:'ĐVT',f:r=>esc(r.i.unit)},nc('Tồn đầu',r=>r.o),nc('Nhập',r=>r.a),nc('Xuất',r=>r.b),nc('Điều chỉnh',r=>r.adj),nc('Tồn cuối',r=>r.c),nc('Giá trị tồn cuối (VND)',r=>amt(r.c,r.i.price),fmtMoney)],rows,{empty:'Không có phát sinh trong tháng này.',foot:`<tr><td colspan="3">Tổng</td><td class="num">${fmtNum(sum('o'))}</td><td class="num">${fmtNum(sum('a'))}</td><td class="num">${fmtNum(sum('b'))}</td><td class="num">${fmtNum(sum('adj'))}</td><td class="num">${fmtNum(sum('c'))}</td><td class="num">${fmtMoney(rows.reduce((s,r)=>s+amt(r.c,r.i.price),0))}</td></tr>`});
  }};
function issueReport(type,title){
  const targets=()=>type==='project'?db.projects.map(p=>[p.id,`${p.code} – ${p.name}`]):db.retail.map(c=>[c.id,c.name]);
  return{t:title,
    sub(){const f=F();return `${f.target?targetLabel(type,f.target):'Tất cả'} · ${periodSub(f.from??firstOfYear(),f.to??todayStr())}`},
    head(){return `<div class="bar">${fSel('target',type==='project'?'Dự án':'Khách lẻ',[['',type==='project'?'Tất cả dự án':'Tất cả khách lẻ'],...targets()])}${fSel('wh','Ghi nhận kho',whOpts('Tất cả (hóa đơn + nội bộ)'))}${fDate('from','Từ',firstOfYear())}${fDate('to','Đến',todayStr())}<div class="sp"></div>${rptBtns(type==='project'?'bao-cao-du-an':'bao-cao-khach-le')}</div>`},
    tbl(){
      const f=F(),from=f.from??firstOfYear(),to=f.to??todayStr(),agg={};
      db.issues.forEach(r=>{if(r.targetType!==type||(f.target&&r.targetId!==f.target)||(f.wh&&!inWh(r,f.wh))||(from&&r.date<from)||(to&&r.date>to))return;
        r.lines.forEach(l=>{const k=r.targetId+'|'+l.itemId,x=(agg[k]??={tid:r.targetId,iid:l.itemId,qty:0,val:0,slips:new Set()});x.qty+=+l.qty||0;x.val=r2(x.val+amt(l.qty,l.price));x.slips.add(r.id)})});
      const rows=Object.values(agg).sort((a,b)=>targetLabel(type,a.tid).localeCompare(targetLabel(type,b.tid))||(itemOf(a.iid)?.sku||'').localeCompare(itemOf(b.iid)?.sku||''));
      const tot=rows.reduce((s,r)=>({q:s.q+r.qty,v:s.v+r.val}),{q:0,v:0}),nT=new Set(rows.map(r=>r.tid)).size;
      return `<div class="kpis">${kpi(type==='project'?'Số dự án':'Số khách lẻ',nT)}${kpi('Tổng số lượng xuất',fmtNum(tot.q),'','warn')}${kpi('Tổng giá trị (VND)',fmtMoney(tot.v),'','acc')}</div><div class="card"><h4>Giá trị xuất theo ${type==='project'?'dự án':'khách lẻ'} (top 10)</h4><div class="ch"><canvas id="c1"></canvas></div></div>`+
      table([{h:type==='project'?'Khách hàng / Dự án':'Khách lẻ',f:r=>esc(targetLabel(type,r.tid)),x:r=>targetLabel(type,r.tid)},{h:'Mã hàng',f:r=>esc(itemOf(r.iid)?.sku||'?')},{h:'Tên hàng hóa',f:r=>esc(itemOf(r.iid)?.name||'(đã xoá)')},{h:'ĐVT',f:r=>esc(itemOf(r.iid)?.unit||'')},nc('Số lượng',r=>r.qty),nc('Giá trị (VND)',r=>r.val,fmtMoney),nc('Số phiếu',r=>r.slips.size)],rows,{empty:'Không có phát sinh trong khoảng thời gian này.',foot:`<tr><td colspan="4">Tổng</td><td class="num">${fmtNum(tot.q)}</td><td class="num">${fmtMoney(tot.v)}</td><td></td></tr>`});
    },
    tm(){
      const f=F(),from=f.from??firstOfYear(),to=f.to??todayStr(),agg={};
      db.issues.forEach(r=>{if(r.targetType!==type||(f.target&&r.targetId!==f.target)||(f.wh&&!inWh(r,f.wh))||(from&&r.date<from)||(to&&r.date>to))return;r.lines.forEach(l=>{agg[r.targetId]=r2((agg[r.targetId]||0)+amt(l.qty,l.price))})});
      const top=Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,10);
      chart('c1',{type:'bar',data:{labels:top.map(([id])=>targetLabel(type,id)),datasets:[{label:'Giá trị (VND)',data:top.map(x=>x[1]),backgroundColor:PAL[0]}]},options:baseOpt({plugins:{legend:{display:false}}})});
    }};
}
PAGES['rpt/project']=issueReport('project','Báo cáo theo khách hàng / dự án');
PAGES['rpt/retail']=issueReport('retail','Báo cáo theo khách lẻ');
PAGES['rpt/category']={t:'Báo cáo theo loại thiết bị',
  sub(){const f=F();return `${whName(f.wh||W_INT)} · ${periodSub(f.from??firstOfYear(),f.to??todayStr())}`},
  head(){return `<div class="bar">${fSel('wh','Kho',stockWhOpts())}${fDate('from','Từ',firstOfYear())}${fDate('to','Đến',todayStr())}<div class="sp"></div>${rptBtns('bao-cao-loai-thiet-bi')}</div>`},
  data(){
    const f=F(),from=f.from??firstOfYear(),to=f.to??todayStr(),m=stockMap(),fi=flow('receipts',from,to,f.wh),fo=flow('issues',from,to,f.wh);
    return db.categories.map(c=>{const its=db.items.filter(i=>i.categoryId===c.id),as=db.assets.filter(a=>itemOf(a.itemId)?.categoryId===c.id);
      return{c,codes:its.length,q:its.reduce((s,i)=>s+qtyIn(m,i.id,f.wh),0),v:its.reduce((s,i)=>s+amt(qtyIn(m,i.id,f.wh),i.price),0),a:its.reduce((s,i)=>s+(fi[i.id]?.qty||0),0),b:its.reduce((s,i)=>s+(fo[i.id]?.qty||0),0),ak:as.filter(x=>x.status==='in_stock').length,ac:as.filter(x=>x.status==='assigned').length,ar:as.filter(x=>x.status==='repair').length,at:as.length}}).filter(r=>r.codes);
  },
  tbl(){
    const rows=this.data();
    return `<div class="grid g2"><div class="card"><h4>Tồn – Nhập – Xuất theo danh mục</h4><div class="ch"><canvas id="c1"></canvas></div></div><div class="card"><h4>Giá trị tồn theo danh mục</h4><div class="ch"><canvas id="c2"></canvas></div></div></div>`+
    table([{h:'Danh mục',f:r=>esc(r.c.name)+(r.c.isIT?' '+badge('info','IT'):''),x:r=>r.c.name},nc('Số mã',r=>r.codes),nc('Tồn hiện tại',r=>r.q),nc('Giá trị tồn (VND)',r=>r.v,fmtMoney),nc('Nhập trong kỳ',r=>r.a),nc('Xuất trong kỳ',r=>r.b),nc('TS trong kho',r=>r.ak),nc('TS đã cấp phát',r=>r.ac),nc('TS sửa chữa',r=>r.ar),nc('Tổng TS',r=>r.at)],rows,{empty:'Chưa có dữ liệu.'});
  },
  tm(){
    const rows=PAGES['rpt/category'].data();
    chart('c1',{type:'bar',data:{labels:rows.map(r=>r.c.name),datasets:[{label:'Tồn',data:rows.map(r=>r.q),backgroundColor:PAL[1]},{label:'Nhập',data:rows.map(r=>r.a),backgroundColor:PAL[3]},{label:'Xuất',data:rows.map(r=>r.b),backgroundColor:PAL[0]}]},options:baseOpt({scales:{y:{beginAtZero:true}}})});
    const v=rows.filter(r=>r.v>0);chart('c2',{type:'doughnut',data:{labels:v.map(r=>r.c.name),datasets:[{data:v.map(r=>r.v),backgroundColor:PAL}]},options:baseOpt()});
  }};
PAGES['rpt/inout']={t:'Báo cáo Nhập / Xuất',
  sub(){const f=F(),m=addMonths(todayStr().slice(0,8)+'01',-5);return `${(f.g||'month')==='month'?'Theo tháng':'Theo ngày'} · ${whName(f.wh||W_INT)} · ${periodSub(f.from??m,f.to??todayStr())}`},
  head(){const m=addMonths(todayStr().slice(0,8)+'01',-5);return `<div class="bar">${fSel('g','Nhóm theo',[['month','Theo tháng'],['day','Theo ngày']])}${fSel('wh','Kho',stockWhOpts())}${fDate('from','Từ',m)}${fDate('to','Đến',todayStr())}<div class="sp"></div>${rptBtns('bao-cao-nhap-xuat')}</div>`},
  data(){
    const f=F(),m=addMonths(todayStr().slice(0,8)+'01',-5),from=f.from??m,to=f.to??todayStr(),len=(f.g||'month')==='month'?7:10,agg={};
    const put=(kind,r)=>{if((from&&r.date<from)||(to&&r.date>to)||!inWh(r,f.wh||W_INT))return;const k=r.date.slice(0,len),x=(agg[k]??={k,iq:0,iv:0,oq:0,ov:0});r.lines.forEach(l=>{const q=+l.qty||0,v=amt(q,l.price);if(kind==='in'){x.iq+=q;x.iv+=v}else{x.oq+=q;x.ov+=v}})};
    db.receipts.forEach(r=>put('in',r));db.issues.forEach(r=>put('out',r));
    return Object.values(agg).sort((a,b)=>a.k.localeCompare(b.k));
  },
  tbl(){
    const rows=this.data(),fmtK=k=>k.length===7?k.split('-').reverse().join('/'):fmtDate(k);
    return `<div class="card"><h4>Số lượng nhập / xuất</h4><div class="ch"><canvas id="c1"></canvas></div></div>`+table([{h:'Kỳ',f:r=>fmtK(r.k),x:r=>r.k},nc('SL nhập',r=>r.iq),nc('Giá trị nhập (VND)',r=>r.iv,fmtMoney),nc('SL xuất',r=>r.oq),nc('Giá trị xuất (VND)',r=>r.ov,fmtMoney),nc('Chênh lệch SL',r=>r.iq-r.oq)],rows,{empty:'Không có phát sinh trong khoảng thời gian này.',foot:`<tr><td>Tổng</td><td class="num">${fmtNum(rows.reduce((s,r)=>s+r.iq,0))}</td><td class="num">${fmtMoney(rows.reduce((s,r)=>s+r.iv,0))}</td><td class="num">${fmtNum(rows.reduce((s,r)=>s+r.oq,0))}</td><td class="num">${fmtMoney(rows.reduce((s,r)=>s+r.ov,0))}</td><td class="num">${fmtNum(rows.reduce((s,r)=>s+r.iq-r.oq,0))}</td></tr>`});
  },
  tm(){const rows=PAGES['rpt/inout'].data();chart('c1',{type:'bar',data:{labels:rows.map(r=>r.k.length===7?mLabel(r.k):fmtDate(r.k).slice(0,5)),datasets:[{label:'Nhập',data:rows.map(r=>r.iq),backgroundColor:PAL[3]},{label:'Xuất',data:rows.map(r=>r.oq),backgroundColor:PAL[0]}]},options:baseOpt({scales:{y:{beginAtZero:true}}})})}};
const firstOfMonth=()=>todayStr().slice(0,8)+'01';
function rangeOf(p){
  const d=new Date(),y=d.getFullYear(),m=d.getMonth();
  if(p==='today')return[todayStr(),todayStr()];
  if(p==='month')return[dstr(new Date(y,m,1)),dstr(new Date(y,m+1,0))];
  if(p==='lastmonth')return[dstr(new Date(y,m-1,1)),dstr(new Date(y,m,0))];
  if(p==='quarter'){const q=Math.floor(m/3)*3;return[dstr(new Date(y,q,1)),dstr(new Date(y,q+3,0))]}
  if(p==='year')return[`${y}-01-01`,`${y}-12-31`];
  if(p==='lastyear')return[`${y-1}-01-01`,`${y-1}-12-31`];
  return[firstOfMonth(),todayStr()];
}
ACT.rng=el=>{const [a,b]=rangeOf(el.dataset.p);const f=F();f.from=a;f.to=b;rerender()};
PAGES['rpt/stock']={t:'Báo cáo tồn kho',
  sub(){const f=F();return `Từ ${fmtDate(f.from??firstOfMonth())} đến ${fmtDate(f.to??todayStr())} · ${whName(f.wh||W_INT)}`},
  head(){return `<div class="bar">${fDate('from','Từ ngày',firstOfMonth())}${fDate('to','Đến ngày',todayStr())}${fSel('wh','Kho',stockWhOpts())}${fSel('cat','Danh mục',catOpts())}${fSel('st','Hiển thị',[['','Mặt hàng có tồn hoặc phát sinh'],['move','Chỉ mặt hàng có phát sinh trong kỳ']])}<div class="sp"></div>${rptBtns('bao-cao-ton-kho')}</div>
    <div class="bar" style="margin-top:-6px"><span class="muted" style="font-size:12.5px">Chọn nhanh:</span>${[['today','Hôm nay'],['month','Tháng này'],['lastmonth','Tháng trước'],['quarter','Quý này'],['year','Năm nay'],['lastyear','Năm trước']].map(([p,l])=>`<button class="btn sm" data-act="rng" data-p="${p}">${l}</button>`).join('')}</div>`},
  tbl(){
    const f=F(),from=f.from??firstOfMonth(),to=f.to??todayStr(),wh=f.wh||W_INT;
    if(from&&to&&from>to)return '<div class="empty">Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</div>';
    const op=stockMap(from,true),cl=stockMap(to),fi=flow('receipts',from,to,wh),fo=flow('issues',from,to,wh);
    const rows=db.items.filter(i=>!f.cat||i.categoryId===f.cat).map(i=>{const o=qtyIn(op,i.id,wh),c=qtyIn(cl,i.id,wh),a=fi[i.id]?.qty||0,b=fo[i.id]?.qty||0;return{i,o,a,b,adj:c-o-a+b,c}}).filter(r=>(r.o||r.a||r.b||r.adj||r.c)&&(f.st!=='move'||r.a||r.b||r.adj)).sort((x,y)=>x.i.sku.localeCompare(y.i.sku));
    const sum=k=>rows.reduce((s,r)=>s+r[k],0),val=rows.reduce((s,r)=>s+amt(r.c,r.i.price),0);
    return `<div class="kpis">${kpi('Tồn đầu kỳ',fmtNum(sum('o')))}${kpi('Nhập trong kỳ',fmtNum(sum('a')),'','ok')}${kpi('Xuất trong kỳ',fmtNum(sum('b')),'','warn')}${kpi('Tồn cuối kỳ',fmtNum(sum('c')),`${fmtMoney(val)} VND`,'info')}</div>`+
    table([{h:'Mã hàng',f:r=>`<b>${esc(r.i.sku)}</b>`,x:r=>r.i.sku},{h:'Tên hàng hóa',f:r=>esc(r.i.name),x:r=>r.i.name},{h:'Danh mục',f:r=>esc(nm(db.categories,r.i.categoryId))},{h:'ĐVT',f:r=>esc(r.i.unit)},nc('Tồn đầu kỳ',r=>r.o),nc('Nhập',r=>r.a),nc('Xuất',r=>r.b),nc('Điều chỉnh',r=>r.adj),nc('Tồn cuối kỳ',r=>r.c),nc('Đơn giá (VND)',r=>r.i.price||0,fmtMoney),nc('Giá trị cuối kỳ (VND)',r=>amt(r.c,r.i.price),fmtMoney)],rows,{empty:'Không có dữ liệu trong khoảng thời gian này.',foot:`<tr><td colspan="4">Tổng</td><td class="num">${fmtNum(sum('o'))}</td><td class="num">${fmtNum(sum('a'))}</td><td class="num">${fmtNum(sum('b'))}</td><td class="num">${fmtNum(sum('adj'))}</td><td class="num">${fmtNum(sum('c'))}</td><td></td><td class="num">${fmtMoney(val)}</td></tr>`});
  }};

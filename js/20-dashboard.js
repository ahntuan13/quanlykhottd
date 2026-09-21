/* 20-dashboard.js – Các trang Dashboard */
'use strict';
(self.__mods=self.__mods||[]).push('20-dashboard');

/* =====================================================================
   DASHBOARD
   ===================================================================== */
const kpi=(l,v,s='',tone='')=>`<div class="kpi ${tone}"><div class="kl">${l}</div><div class="kv">${v}</div>${s?`<div class="ks">${s}</div>`:''}</div>`;
const card=(title,body,cls='')=>`<section class="card ${cls}">${title?`<h4>${title}</h4>`:''}${body}</section>`;
const miniTable=(heads,rows,empty='Không có dữ liệu.')=>rows.length?`<div class="tw"><table class="t"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="note">${empty}</div>`;
function stockStats(){const m=stockMap();let qty=0,val=0;db.items.forEach(it=>{const t=totalOf(m,it.id);qty+=t;val+=t*(it.price||0)});return{m,qty,val}}
function monthlyFlow(months,wh=W_INT){
  return months.map(mk=>{
    let iq=0,iv=0,oq=0,ov=0,ic=0,oc=0;
    db.receipts.forEach(r=>{if(r.date.slice(0,7)!==mk||!inWh(r,wh))return;ic++;r.lines.forEach(l=>{iq+=+l.qty||0;iv+=(+l.qty||0)*(+l.price||0)})});
    db.issues.forEach(r=>{if(r.date.slice(0,7)!==mk||!inWh(r,wh))return;oc++;r.lines.forEach(l=>{oq+=+l.qty||0;ov+=(+l.qty||0)*(+l.price||0)})});
    return{mk,iq,iv,oq,ov,ic,oc};
  });
}
const byDateDesc=(a,b)=>b.date.localeCompare(a.date)||((b.createdAt||0)-(a.createdAt||0));
const slipTotals=r=>({q:r.lines.reduce((a,l)=>a+(+l.qty||0),0),v:r.lines.reduce((a,l)=>a+(+l.qty||0)*(+l.price||0),0)});
const slipLink=(k,r)=>`<button class="lnk" data-act="slip-view" data-k="${k}" data-id="${r.id}">${esc(r.code)}</button>`;

PAGES['dash/overview']={t:'Tổng quan',
  r(){
    const {m:sm,qty,val}=stockStats(),invQty=db.items.reduce((a,i)=>a+(sm[i.id]?.[W_INV]||0),0),cur=monthlyFlow([todayStr().slice(0,7)])[0],A=alertsData(),cnt=s=>db.assets.filter(a=>a.status===s).length;
    const recent=[...db.receipts.map(r=>({k:'receipt',r})),...db.issues.map(r=>({k:'issue',r}))].sort((a,b)=>byDateDesc(a.r,b.r)).slice(0,8);
    const na=A.low.length+A.out.length;
    return `<div class="kpis">${kpi('Mã hàng',fmtNum(db.items.length),'trong danh mục')}${kpi('Tồn thực tế (Kho nội bộ)',fmtNum(qty),'số lượng hàng đang có','info')}${kpi('Tồn theo hóa đơn',fmtNum(invQty),`chênh lệch so với thực tế: ${invQty-qty>0?'+':''}${fmtNum(invQty-qty)}`,'acc')}${kpi('Giá trị tồn (tham chiếu)',fmtMoney(val)+' VND','theo đơn giá gần nhất','acc')}${kpi('Nhập tháng này',fmtNum(cur.iq),`${cur.ic} phiếu`,'ok')}${kpi('Xuất tháng này',fmtNum(cur.oq),`${cur.oc} phiếu`,'warn')}${kpi('Hàng cần bổ sung',na,`${A.out.length} hết hàng · ${A.low.length} sắp hết`,na?'bad':'ok')}</div>
    <div class="grid g2">${card('Nhập / Xuất 6 tháng gần nhất (số lượng)','<div class="ch"><canvas id="c1"></canvas></div>')}${card('Giá trị tồn theo danh mục','<div class="ch"><canvas id="c2"></canvas></div>')}</div>
    <div class="grid g2">${card('Thiết bị IT',`<div class="kpis sm" style="margin:0">${kpi('Trong kho',cnt('in_stock'),'','ok')}${kpi('Đã cấp phát',cnt('assigned'),'','info')}${kpi('Sửa chữa',cnt('repair'),'','warn')}${kpi('Thanh lý',cnt('retired'))}</div><div class="note">Bảo hành hết hạn / sắp hết hạn (≤ 60 ngày): <b>${A.warr.length}</b> · <a href="#/dash/alerts">Xem cảnh báo</a></div>`)}
    ${card('Phiếu gần đây',miniTable(['Phiếu','Ngày','Loại','Đối tượng','SL'],recent.map(({k,r})=>`<tr><td>${slipLink(k,r)}</td><td>${fmtDate(r.date)}</td><td>${k==='receipt'?badge('ok','Nhập'):badge('warn','Xuất')}</td><td>${esc(k==='receipt'?(r.supplierId?nm(db.suppliers,r.supplierId):'—'):targetLabel(r.targetType,r.targetId))}</td><td class="num">${fmtNum(slipTotals(r).q)}</td></tr>`),'Chưa có phiếu nào.'))}</div>`;
  },
  m(){
    const ms=lastMonths(6),fl=monthlyFlow(ms);
    chart('c1',{type:'bar',data:{labels:ms.map(mLabel),datasets:[{label:'Nhập',data:fl.map(x=>x.iq),backgroundColor:PAL[3]},{label:'Xuất',data:fl.map(x=>x.oq),backgroundColor:PAL[0]}]},options:baseOpt({scales:{y:{beginAtZero:true}}})});
    const {m}=stockStats(),rows=db.categories.map(c=>({n:c.name,v:db.items.filter(i=>i.categoryId===c.id).reduce((a,i)=>a+totalOf(m,i.id)*(i.price||0),0),q:db.items.filter(i=>i.categoryId===c.id).reduce((a,i)=>a+totalOf(m,i.id),0)})).filter(x=>x.v>0||x.q>0);
    const useV=rows.some(x=>x.v>0);
    chart('c2',{type:'doughnut',data:{labels:rows.map(x=>x.n),datasets:[{data:rows.map(x=>useV?x.v:x.q),backgroundColor:PAL}]},options:baseOpt()});
  }};

function diffCard(m){
  const rows=db.items.map(i=>({i,a:m[i.id]?.[W_INT]||0,b:m[i.id]?.[W_INV]||0})).filter(x=>Math.abs(x.a-x.b)>1e-9).sort((x,y)=>Math.abs(y.a-y.b)-Math.abs(x.a-x.b)).slice(0,15);
  return card('Chênh lệch giữa hàng thực tế và hóa đơn (top 15)',`<p class="note" style="margin-top:-6px">Chênh lệch = Kho nội bộ − Kho hóa đơn. Dương: hàng thực tế nhiều hơn hóa đơn; âm: hóa đơn nhiều hơn hàng thực tế.</p>`+miniTable(['Mã','Tên hàng','Kho nội bộ','Kho hóa đơn','Chênh lệch'],rows.map(({i,a,b})=>`<tr><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td class="num">${fmtNum(a)}</td><td class="num">${fmtNum(b)}</td><td class="num"><span class="${a-b>0?'pos':'neg'}">${a-b>0?'+':''}${fmtNum(a-b)}</span></td></tr>`),'Số liệu hóa đơn và thực tế đang khớp nhau.'));
}
PAGES['dash/stock']={t:'Tồn kho',
  r(){
    const {m}=stockStats(),rows=db.categories.map(c=>{const its=db.items.filter(i=>i.categoryId===c.id);return{n:c.name,codes:its.length,q:its.reduce((a,i)=>a+totalOf(m,i.id),0),v:its.reduce((a,i)=>a+totalOf(m,i.id)*(i.price||0),0)}}).filter(x=>x.codes);
    const A=alertsData();
    return `<div class="grid g2">${card('Top 10 hàng có giá trị tồn cao nhất','<div class="ch tall"><canvas id="c1"></canvas></div>')}${card('Tổng số lượng theo kho','<div class="ch tall"><canvas id="c2"></canvas></div>')}</div>
    ${card('Tồn kho theo danh mục',miniTable(['Danh mục','Số mã','Tổng SL','Giá trị (VND)'],rows.map(x=>`<tr><td>${esc(x.n)}</td><td class="num">${x.codes}</td><td class="num">${fmtNum(x.q)}</td><td class="num">${fmtMoney(x.v)}</td></tr>`)))}
    ${diffCard(m)}${card(`Hàng sắp hết / hết hàng (${A.low.length+A.out.length})`,miniTable(['Mã','Tên hàng','Tồn','Tối thiểu','Trạng thái'],[...A.out,...A.low].map(({it,t})=>`<tr><td>${esc(it.sku)}</td><td>${esc(it.name)}</td><td class="num">${fmtNum(t)}</td><td class="num">${fmtNum(it.minStock)}</td><td>${badge(...itemStatus(it,t))}</td></tr>`),'Không có hàng nào cần bổ sung.'))}`;
  },
  m(){
    const {m}=stockStats(),top=db.items.map(i=>({n:i.name,v:totalOf(m,i.id)*(i.price||0)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,10);
    chart('c1',{type:'bar',data:{labels:top.map(x=>x.n.length>26?x.n.slice(0,25)+'…':x.n),datasets:[{label:'Giá trị (VND)',data:top.map(x=>x.v),backgroundColor:PAL[0]}]},options:baseOpt({indexAxis:'y',plugins:{legend:{display:false}}})});
    const sumW=w=>db.items.reduce((a,i)=>a+(m[i.id]?.[w]||0),0);
    chart('c2',{type:'bar',data:{labels:['Kho nội bộ (thực tế)','Kho hóa đơn'],datasets:[{label:'Tổng số lượng',data:[sumW(W_INT),sumW(W_INV)],backgroundColor:[PAL[1],PAL[0]]}]},options:baseOpt({plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}})});
  }};

function monthTable(months,wh){
  const fl=monthlyFlow(months,wh),tot=fl.reduce((a,x)=>({iq:a.iq+x.iq,iv:a.iv+x.iv,oq:a.oq+x.oq,ov:a.ov+x.ov,ic:a.ic+x.ic,oc:a.oc+x.oc}),{iq:0,iv:0,oq:0,ov:0,ic:0,oc:0});
  const cols=[{h:'Tháng',f:r=>`${r.mk.slice(5)}/${r.mk.slice(0,4)}`},nc('Số phiếu nhập',r=>r.ic),nc('SL nhập',r=>r.iq),nc('Giá trị nhập (VND)',r=>r.iv,fmtMoney),nc('Số phiếu xuất',r=>r.oc),nc('SL xuất',r=>r.oq),nc('Giá trị xuất (VND)',r=>r.ov,fmtMoney)];
  return table(cols,fl,{foot:`<tr><td>Tổng</td><td class="num">${tot.ic}</td><td class="num">${fmtNum(tot.iq)}</td><td class="num">${fmtMoney(tot.iv)}</td><td class="num">${tot.oc}</td><td class="num">${fmtNum(tot.oq)}</td><td class="num">${fmtMoney(tot.ov)}</td></tr>`});
}
const yearOpts=()=>{const y=new Date().getFullYear();return[0,1,2,3,4].map(i=>String(y-i)).map(v=>[v,v])};
const monthsOfYear=y=>Array.from({length:12},(_,i)=>`${y}-${pad(i+1)}`);
PAGES['dash/monthly']={t:'Nhập / Xuất theo tháng',
  head(){return `<div class="bar"><label class="fl">Năm ${fSel('year','Năm',yearOpts())}</label>${fSel('wh','Kho',stockWhOpts())}<div class="sp"></div><button class="btn" data-act="export" data-name="nhap-xuat-theo-thang">⬇ Excel</button></div>`},
  tbl(){const y=F().year||String(new Date().getFullYear());return `<div class="card"><h4>Số lượng nhập / xuất năm ${y} – ${esc(whName(F().wh||W_INT))}</h4><div class="ch"><canvas id="c1"></canvas></div></div>${monthTable(monthsOfYear(y),F().wh||W_INT)}`},
  tm(){const y=F().year||String(new Date().getFullYear()),fl=monthlyFlow(monthsOfYear(y),F().wh||W_INT);
    chart('c1',{type:'bar',data:{labels:fl.map(x=>'T'+x.mk.slice(5)),datasets:[{label:'Nhập',data:fl.map(x=>x.iq),backgroundColor:PAL[3]},{label:'Xuất',data:fl.map(x=>x.oq),backgroundColor:PAL[0]}]},options:baseOpt({scales:{y:{beginAtZero:true}}})})}};

PAGES['dash/alerts']={t:'Cảnh báo',
  r(){
    const A=alertsData(),t0=todayStr();
    const stRows=l=>l.map(({it,t})=>`<tr><td>${esc(it.sku)}</td><td>${esc(it.name)}</td><td>${esc(nm(db.categories,it.categoryId))}</td><td class="num">${fmtNum(t)}</td><td class="num">${fmtNum(it.minStock)}</td><td>${badge(...itemStatus(it,t))}</td></tr>`);
    const H=['Mã','Tên hàng','Danh mục','Tồn','Tối thiểu','Trạng thái'];
    return `<div class="kpis">${kpi('Hết hàng',A.out.length,'','bad')}${kpi('Sắp hết',A.low.length,'tồn ≤ mức tối thiểu','warn')}${kpi('Bảo hành ≤ 60 ngày',A.warr.length,'gồm đã hết hạn','info')}${kpi('Đang sửa chữa',A.repair.length,'','acc')}</div>
    ${card('Hết hàng',miniTable(H,stRows(A.out),'Không có mặt hàng nào hết hàng.'))}
    ${card('Sắp hết hàng',miniTable(H,stRows(A.low),'Không có mặt hàng nào dưới mức tối thiểu.'))}
    ${card('Bảo hành thiết bị IT',miniTable(['Mã TS','Thiết bị','Serial','Trạng thái','Hết bảo hành'],A.warr.map(a=>`<tr><td>${esc(a.tag)}</td><td>${esc(nm(db.items,a.itemId))}</td><td>${esc(a.serial||'—')}</td><td>${badge(...ST[a.status])}</td><td class="${a.warrantyEnd<t0?'tag-bad':'tag-warn'}">${fmtDate(a.warrantyEnd)} ${a.warrantyEnd<t0?'(đã hết)':''}</td></tr>`),'Không có thiết bị nào sắp hết bảo hành.'))}
    ${card('Thiết bị đang sửa chữa',miniTable(['Mã TS','Thiết bị','Serial','Ghi chú gần nhất'],A.repair.map(a=>`<tr><td>${esc(a.tag)}</td><td>${esc(nm(db.items,a.itemId))}</td><td>${esc(a.serial||'—')}</td><td>${esc((a.history||[]).slice(-1)[0]?.detail||'')}</td></tr>`),'Không có thiết bị nào đang sửa chữa.'))}`;
  }};

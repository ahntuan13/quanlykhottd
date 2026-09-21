/* 01-core-utils.js – Tiện ích chung (định dạng số/ngày, đọc số tiền thành chữ), cấu hình chế độ cục bộ / Firebase */
'use strict';
(self.__mods=self.__mods||[]).push('01-core-utils');

/* =====================================================================
   QUẢN LÝ KHO – TTD
   Dữ liệu lưu trong localStorage của trình duyệt (không cần server).
   Sao lưu / khôi phục bằng file JSON: Settings → Sao lưu & Hệ thống.
   ===================================================================== */
const LS_KEY='ttd_wms_v1', SS_KEY='ttd_wms_uid', FB_LS='ttd_wms_fbcfg';

/* ---------- Firebase (dùng chung dữ liệu) ----------
   Cách 1: dán cấu hình vào biến bên dưới (khuyên dùng khi deploy GitHub Pages), ví dụ:
     const FIREBASE_CONFIG={apiKey:'...',authDomain:'...',projectId:'...',appId:'...'};
   Cách 2: để null rồi bấm “Kết nối Firebase” ở màn hình đăng nhập để dán cấu hình.
   Không cấu hình → app chạy chế độ cục bộ (lưu trong trình duyệt). */
/* FIREBASE_CONFIG được khai báo trong config/firebase-config.js */
const FBCFG=(()=>{if(FIREBASE_CONFIG)return FIREBASE_CONFIG;try{return JSON.parse(localStorage.getItem(FB_LS)||'null')}catch(e){return null}})();
const CLOUD=!!(FBCFG&&FBCFG.apiKey&&FBCFG.projectId);

/* ---------- tiện ích ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayStr=()=>dstr(new Date());
const dAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return dstr(d)};
function addDays(s,n){const [y,m,d]=s.split('-').map(Number);return dstr(new Date(y,m-1,d+n))}
function addMonths(s,n){const [y,m,d]=s.split('-').map(Number);return dstr(new Date(y,m-1+n,d))}
const fmtDate=s=>s?s.split('-').reverse().join('/'):'';
const fmtDT=iso=>{if(!iso)return'';const d=new Date(iso);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
const fmtNum=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(+n||0));
const fmtMoney=n=>fmtNum(Math.round(+n||0));
const fmtPrice=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(+n||0);
const uid=p=>p+'_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
/* num(): đọc số theo kiểu Việt Nam (1.305.555,5 → 1305555.5; 166.667 → 166667; 12,5 → 12.5) */
const num=v=>numVN(v);
const strip=h=>{const d=document.createElement('div');d.innerHTML=String(h??'');return d.textContent.trim()};
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim();
const cell=v=>String(v??'').replace(/\s+/g,' ').trim();
function numVN(v){if(typeof v==='number')return v;let s=String(v??'').replace(/\s/g,'');if(!s)return 0;if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');const n=parseFloat(s);return isNaN(n)?0:n}
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function lastMonths(n){const o=[],d=new Date();for(let i=n-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);o.push(`${x.getFullYear()}-${pad(x.getMonth()+1)}`)}return o}
const mLabel=mk=>`${mk.slice(5)}/${mk.slice(2,4)}`;

function hash(str){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<str.length;i++){const ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(36)}
const pw=p=>hash('ttd-wms|'+p);

/* Đọc số tiền thành chữ (tiếng Việt) */
function readVN(n){
  n=Math.round(+n||0); if(n===0) return 'Không đồng';
  const dg=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  const un=['','nghìn','triệu','tỷ','nghìn tỷ','triệu tỷ'];
  const r3=(x,full)=>{const h=Math.floor(x/100),t=Math.floor(x%100/10),u=x%10;let s='';
    if(h>0||full) s+=dg[h]+' trăm';
    if(t>1){s+=' '+dg[t]+' mươi';if(u===1)s+=' mốt';else if(u===5)s+=' lăm';else if(u>0)s+=' '+dg[u]}
    else if(t===1){s+=' mười';if(u===5)s+=' lăm';else if(u>0)s+=' '+dg[u]}
    else if(u>0){if(h>0||full)s+=' lẻ';s+=' '+dg[u]}
    return s.trim()};
  const g=[];while(n>0){g.push(n%1000);n=Math.floor(n/1000)}
  const parts=[];
  for(let i=g.length-1;i>=0;i--){if(g[i]===0)continue;parts.push(r3(g[i],i<g.length-1)+(un[i]?' '+un[i]:''))}
  const s=parts.join(' ').replace(/\s+/g,' ').trim();
  return s.charAt(0).toUpperCase()+s.slice(1)+' đồng';
}

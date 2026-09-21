/* 34-sample-data.js – Nạp dữ liệu mẫu */
'use strict';
(self.__mods=self.__mods||[]).push('34-sample-data');

/* =====================================================================
   DỮ LIỆU MẪU
   ===================================================================== */
function loadSample(){
  const u=db.users,c=db.company;db=defaultDB();db.users=u;db.company=c;
  db.warehouses=WH_DEF();
  db.suppliers=[{id:'s1',name:'Công ty FPT Trading',contact:'Anh Minh',phone:'0901 234 567',email:'sales@fpt-trading.example',address:'Quận 1, TP.HCM'},{id:'s2',name:'Phong Vũ',contact:'Chị Lan',phone:'0902 345 678',email:'',address:'Quận 3, TP.HCM'},{id:'s3',name:'An Phát Computer',contact:'',phone:'',email:'',address:''}];
  db.projects=[{id:'p1',code:'PRJ-001',name:'Nhà máy Long An – Line 2',customer:'Khách hàng A',contact:'',note:''},{id:'p2',code:'PRJ-002',name:'Văn phòng Bình Dương',customer:'Khách hàng B',contact:'',note:''}];
  db.retail=[{id:'rt1',name:'Nguyễn Văn A',phone:'',dept:'Phòng Kỹ thuật',note:''},{id:'rt2',name:'Trần Thị B',phone:'',dept:'Phòng Kế toán',note:''}];
  const I=(id,sku,name,cat,unit,min,price)=>db.items.push({id,sku,name,categoryId:cat,unit,minStock:min,price,note:''});
  I('i1','LT-DL5440','Laptop Dell Latitude 5440','c_laptop','Cái',2,22500000);I('i2','LT-LNE14','Laptop Lenovo ThinkPad E14','c_laptop','Cái',1,19800000);
  I('i3','MN-DP2422','Monitor Dell P2422H 24"','c_monitor','Cái',2,4200000);I('i4','PR-HP404','Printer HP LaserJet M404dn','c_printer','Cái',1,7800000);
  I('i5','NW-SW24','Switch Cisco 24 port','c_network','Cái',0,9500000);I('i6','UP-APC15','UPS APC 1500VA','c_ups','Cái',2,5200000);
  I('i7','AC-MS331','Chuột Logitech M331','c_acc','Cái',5,250000);I('i8','AC-KB120','Bàn phím Logitech K120','c_acc','Cái',5,200000);I('i9','AC-HDMI2','Cáp HDMI 2m','c_acc','Sợi',5,85000);
  I('i10','VPP-A4','Giấy A4 Double A','c_office','Ream',5,75000);I('i11','VPP-HP76','Mực in HP 76A','c_office','Hộp',3,1500000);
  const ser=(p,off,n)=>Array.from({length:n},(_,k)=>`${p}${String(off+k+1).padStart(4,'0')}`);
  const pick=(iid,n)=>db.assets.filter(a=>a.itemId===iid&&a.status==='in_stock'&&a.warehouseId===W_INT).slice(0,n).map(a=>a.id);
  const R=(date,sup,mode,ref,lines)=>_newReceipt({date,supplierId:sup,whs:modeWhs(mode),ref,invoiceDate:ref?date:'',note:'',lines});
  const X=(date,mode,tt,tid,receiver,ref,lines)=>_newIssue({date,whs:modeWhs(mode),targetType:tt,targetId:tid,receiver,ref,invoiceDate:ref?date:'',note:'',lines});
  const L=(itemId,qty,extra={})=>({itemId,qty,price:itemOf(itemId).price,...extra});
  /* Nhập: có hóa đơn → cả 2 kho; mua không hóa đơn → chỉ Kho nội bộ */
  R(dAgo(110),'s1','both','HD-0001',[L('i1',5,{serials:ser('DL5440-',0,5),warranty:24}),L('i2',3,{serials:ser('TP-E14-',0,3),warranty:24}),L('i3',6,{serials:ser('P2422-',0,6),warranty:3}),L('i4',2),L('i5',2,{serials:ser('SW24-',0,2),warranty:4}),L('i6',3),L('i7',20),L('i8',15),L('i9',10)]);
  R(dAgo(60),'s2','int','',[L('i1',3,{serials:ser('DL5440-',5,3),warranty:24}),L('i3',2,{serials:ser('P2422-',6,2),warranty:24})]);
  R(dAgo(20),'s3','both','HD-0002',[L('i10',20),L('i11',5)]);
  /* Xuất: khách hàng/dự án → có hóa đơn (2 kho); khách lẻ → chỉ Kho nội bộ; 1 phiếu chỉ xuất hóa đơn */
  X(dAgo(95),'both','project','p1','Anh Hùng (PM)','HĐ-1001',[L('i1',3,{assetIds:pick('i1',3)}),L('i3',3,{assetIds:pick('i3',3)})]);
  X(dAgo(70),'int','retail','rt1','Nguyễn Văn A','',[L('i1',1,{assetIds:pick('i1',1)}),L('i7',1)]);
  X(dAgo(40),'both','project','p2','Chị Thu','HĐ-1002',[L('i5',1,{assetIds:pick('i5',1)}),L('i6',1),L('i9',10)]);
  X(dAgo(12),'int','retail','rt2','Trần Thị B','',[L('i3',2,{assetIds:pick('i3',2)})]);
  X(dAgo(5),'both','project','p1','Anh Hùng (PM)','HĐ-1003',[L('i10',5),L('i11',3)]);
  X(dAgo(2),'int','retail','rt1','Nguyễn Văn A','',[L('i7',2),L('i8',2)]);
  X(dAgo(1),'inv','project','p2','','HĐ-1004',[L('i7',3)]);
  db.assets.forEach(a=>{if(a.itemId==='i1')a.spec='Core i7 / 16GB / 512GB SSD';if(a.itemId==='i2')a.spec='Ryzen 5 / 16GB / 512GB SSD';if(a.itemId==='i3')a.spec='24 inch FHD IPS'});
  const rp=db.assets.find(a=>a.itemId==='i3'&&a.status==='in_stock');if(rp){rp.status='repair';addHist(rp,'Sửa chữa','Màn hình bị sọc ngang, gửi bảo hành')}
  save();toast('Đã nạp dữ liệu mẫu');
}

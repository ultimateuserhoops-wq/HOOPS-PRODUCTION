/* Dữ liệu mẫu cho bản chạy thử (khi chưa gắn link API). Bản thật đọc/ghi Google Sheet qua Apps Script. */
/* ============ Chạy thử: dữ liệu mẫu ============ */
const MOCK = (() => {
  const VAI = ['PREMIUM','PRE NGƯỢC','ELITE','ELITE NGƯỢC','2 DA MỀM','2 DA CỨNG','Z2','MAX AIR','BÓNG CHIẾU','KAMI','DƯƠNG HUY','DH NGƯỢC','VẢI LƯỚI','POLY X','ACTIVE','MK50','PRO'];
  const lists = {'THƯƠNG HIỆU':['HOOPS','AKU'],'CS':['QUYÊN','TRINH','VY','HOÀ'],'MỨC ƯU TIÊN':['MỨC 1 - SIÊU GẤP','MỨC 2 - GẤP','MỨC 3 - BÌNH THƯỜNG'],'TIẾN ĐỘ IN':['Chờ in','Đang in','Đã in','Đã ép'],'NGƯỜI IN':['AN THỨC','VĂN TÀI','HẢO'],'ÉP LẺ/CUỘN':['CUỘN','ÉP LẺ'],'XƯỞNG MAY':['CMT8','HÒA NHƠN'],'NGƯỜI LÊN KẾ HOẠCH MAY':['QUYÊN'],'ĐẨY VỀ CS KHI':['Đã in'],'MÁY IN':['MÁY MỚI','MÁY CŨ'],'LOẠI ÁO':['ÁO BO','ÁO THUN','ÁO BẠ','JACKET','MIDLAYER'],'LOẠI QUẦN':['QUẦN LƯNG THƯỜNG','QUẦN LƯNG XỊN','QUẦN LƯNG RỜI','QUẦN DÀI - ĐEN 2 DA','QUẦN DÀI - NAVY 2 DA','QUẦN REDI'],'CUỘN':['N1','N2','N3','N4','N5','T1','T2','T3','T4','T5','H1','H2','H3','C1','C2','C3','V1'],'LOẠI VẢI':VAI};
  const M1='MỨC 1 - SIÊU GẤP', M2='MỨC 2 - GẤP', M3='MỨC 3 - BÌNH THƯỜNG';
  const mk = (ma,ten,th,cs,u,f,ie,k,td,ni,extra) => Object.assign({ma,taoLuc:f+' 09:00',nguoiTao:cs,ten,th,cs,uuTien:u,ngayFinal:f,ngayInEp:ie,ngayKhach:k,ghiChuCS:'',tienDo:td,nguoiIn:ni,epLe:'',slAoIn:'',slQuanIn:'',ghiChuIn:'',inCapNhat:ni?'2026-10-20 08:30':'',slAo:'',slQuan:'',chiTiet:'',confirm:false,csCapNhat:'',xuong:'',ngayGuiMay:'',ngayTraMay:'',ghiChuMay:'',mayCapNhat:'',ngayDaIn:'',ngayDaEp:'',cuon:'',sttCuon:'',vai:'',slBo:'',slPhoi:'',vaiBo:'',vaiPhoi:'',mayIn:'',loai:'',ctGhiChu:'',xuatAnhLuc:'',lyDoTraVe:'',traVeLuc:'',qcNhanLuc:'',qcKetQua:'',qcGhiChu:'',qcLuc:'',hoanThanhLuc:'',chuyenEp:false,chuyenEpLuc:'',epCapNhat:''}, extra||{});
  const DONE = (day, ni, cuon, stt, ao, quan, vai, bo, extra) => Object.assign({ngayDaIn:day, nguoiIn:ni, cuon, sttCuon:stt, slAoIn:ao, slQuanIn:quan, vai, slBo:bo||'', vaiBo:bo?'2 DA MỀM':''}, extra||{});
  const EP = (day, le) => ({chuyenEp:true, ngayDaEp:day, epLe:le||'CUỘN'});
  const orders = [
    // Đã in, chờ BP In confirm chuyển ép
    mk('H2610-237','OT - 19 - 10 - BẬT SAIGON - REO','HOOPS','TRINH',M1,'2026-10-19','2026-10-20','2026-10-23','Đã in','VĂN TÀI',DONE('2026-10-20','VĂN TÀI','T2',1,12,12,'PRE NGƯỢC',12)),
    mk('H2610-253','IG1 NGUYEN SIEU SCHOOL - KHANH NGUYỄN','HOOPS','QUYÊN',M2,'2026-10-18','2026-10-20','2026-10-25','Đã in','VĂN TÀI',DONE('2026-10-20','VĂN TÀI','T2',2,27,'','PRE NGƯỢC',27)),
    mk('H2610-240','WHALES CLUB','HOOPS','QUYÊN',M1,'2026-10-19','2026-10-21','2026-10-25','Đã in','AN THỨC',DONE('2026-10-20','AN THỨC','N1',1,15,15,'PREMIUM')),
    mk('H2610-246','HOUSE 2 - ĐINH THÁI QUANG','HOOPS','VY',M2,'2026-10-20','2026-10-21','2026-10-27','Đã in','AN THỨC',DONE('2026-10-20','AN THỨC','N1',2,20,18,'PREMIUM',20)),
    // Đã chuyển ép, chờ BP Ép
    mk('H2610-171','LÊ LỢI - ANH VIẾT ANH - GẤP','HOOPS','TRINH',M1,'2026-10-18','2026-10-20','2026-10-23','Đã in','HẢO',DONE('2026-10-20','HẢO','H1',1,13,13,'ELITE NGƯỢC',7,{chuyenEp:true})),
    mk('H2610-172','D4 - TRONG PHUC','HOOPS','VY',M2,'2026-10-18','2026-10-21','2026-10-26','Đã in','HẢO',DONE('2026-10-20','HẢO','H1',2,44,'','ELITE NGƯỢC','',{chuyenEp:true})),
    // Đang in / chờ in
    mk('H2610-212','9 - 10 - CLUTCH - HOÀNG NHÂN - JERSEY - REO','HOOPS','TRINH',M1,'2026-10-12','2026-10-20','2026-10-21','Đang in','VĂN TÀI',{inCapNhat:'2026-10-16 14:00'}),
    mk('H2610-251','20-10 TDS NAVY (U13 TDS ƯU TIÊN)','HOOPS','QUYÊN',M1,'2026-10-20','2026-10-21','2026-10-23','Đang in','VĂN TÀI'),
    mk('H2610-249','USH - Thịnh Thái','HOOPS','TRINH',M1,'2026-10-20','2026-10-21','2026-10-26','Chờ in',''),
    mk('H2610-252','20-10 TDS NAVY ( CÒN LẠI )','HOOPS','QUYÊN',M2,'2026-10-20','2026-10-23','2026-10-27','Chờ in',''),
    mk('H2610-229','10B5 - LÂM THU HIỀN','HOOPS','VY',M2,'2026-10-17','2026-10-21','2026-10-27','Chờ in',''),
    mk('H2610-226','CHAMPION - ĐINH HUY HOÀNG','HOOPS','VY',M3,'2026-10-17','2026-10-23','2026-10-28','Chờ in',''),
    mk('A2610-118','19-10-2026 Masters Docceroos - Bruce Ager - REO','AKU','HOÀ',M3,'2026-10-19','2026-10-23','2026-10-30','Chờ in',''),
    mk('A2610-121',"Goofy G's (Lucas Rumberg)",'AKU','HOÀ',M3,'2026-10-20','2026-10-23','2026-10-30','Chờ in',''),
    mk('H2512-019','U17 TRUNG QUỐC','HOOPS','QUYÊN',M1,'2025-12-15','2025-12-20','2025-12-25','Đang in','',{inCapNhat:'2025-12-19 17:00',taoLuc:'2025-12-15 09:00'}),
    // Đã ép, chờ kế hoạch may
    mk('H2610-236','ƯU TIÊN - OLWS TIME - KIỀU OANH - GẤP','HOOPS','TRINH',M1,'2026-10-19','2026-10-20','2026-10-22','Đã ép','AN THỨC',Object.assign(DONE('2026-10-20','AN THỨC','N2',1,5,5,'ELITE'),EP('2026-10-20'),{slAo:5,slQuan:5,chiTiet:'5 áo chéo vai · 5 quần lưng rời',confirm:true})),
    mk('H2610-150','MARIE CURIE - NGUYEN HA PHUONG','HOOPS','TRINH',M2,'2026-10-12','2026-10-15','2026-10-20','Đã ép','HẢO',Object.assign(DONE('2026-10-19','HẢO','H2',1,27,27,'ELITE NGƯỢC',28),EP('2026-10-20','ÉP LẺ'))),
    // Đã ép, đã xếp xưởng
    mk('H2610-231','7A1 - Nguyễn Đình Cẩm - Gấp','HOOPS','TRINH',M2,'2026-10-17','2026-10-19','2026-10-22','Đã ép','VĂN TÀI',Object.assign(DONE('2026-10-19','VĂN TÀI','T3',1,9,9,'PRE NGƯỢC',9),EP('2026-10-19'),{slAo:9,slQuan:9,chiTiet:'4 áo bo + 5 áo thun · 9 quần lưng thường',confirm:true,xuong:'CMT8',ngayGuiMay:'2026-10-20',ngayTraMay:'2026-10-21'})),
    mk('A2610-092','Huy Tran','AKU','HOÀ',M3,'2026-10-14','2026-10-19','2026-10-24','Đã ép','VĂN TÀI',Object.assign(DONE('2026-10-19','VĂN TÀI','T2',3,16,'','DƯƠNG HUY',16),EP('2026-10-19'),{slAo:16,chiTiet:'16 áo bóng đá, cổ tim',confirm:true,xuong:'HÒA NHƠN',ngayGuiMay:'2026-10-20',ngayTraMay:'2026-10-23'})),
  ];
  [['H2610-118','CẦN THƠ - ĐHTQ 2026 - ANH TÂM','HOOPS','QUYÊN',M2,'2026-09-29','2026-10-01','2026-10-05','AN THỨC',91,28,'2026-10-01','N1','PRE NGƯỢC'],
   ['A2610-031','Carina Futsal - Enrico Da Costa','AKU','HOÀ',M3,'2026-09-29','2026-10-02','2026-10-08','VĂN TÀI',48,48,'2026-10-02','T1','DƯƠNG HUY'],
   ['A2610-070','Avengers (Lucas McKissack)','AKU','HOÀ',M3,'2026-10-12','2026-10-15','2026-10-21','VĂN TÀI',10,'','2026-10-15','C3','DƯƠNG HUY'],
   ['H2610-160','NGUYỄN TRÃI BASKETBALL - GIA LƯƠNG','HOOPS','VY',M2,'2026-10-14','2026-10-17','2026-10-22','AN THỨC',32,13,'2026-10-17','C1','PRE NGƯỢC'],
   ['H2610-161','DEAGLES - LÊ MINH','HOOPS','TRINH',M1,'2026-10-15','2026-10-17','2026-10-20','AN THỨC',83,52,'2026-10-17','C1','PRE NGƯỢC'],
   ['H2610-170','DRAGONS - JEROME','HOOPS','VY',M3,'2026-10-14','2026-10-19','2026-10-26','HẢO',27,25,'2026-10-19','C2','PRE NGƯỢC'],
  ].forEach((x,n) => orders.push(mk(x[0],x[1],x[2],x[3],x[4],x[5],x[6],x[7],'Đã ép',x[8],Object.assign(DONE(x[11],x[8],x[12],n+1,x[9],x[10],x[13],x[9]),EP(x[11]),{inCapNhat:x[11]+' 17:00',slAo:x[9],slQuan:x[10],confirm:true,xuong:x[2]==='AKU'?'HÒA NHƠN':'CMT8',ngayGuiMay:x[11],ngayTraMay:x[7]}))));
  // Đơn hoàn thành mẫu các tháng trước (cho màn hình Đơn hoàn thành)
  [['H2609-201','TDS U15 - REO','HOOPS','QUYÊN','2026-09-24','2026-09-26','2026-09-30','AN THỨC',40,40,'40 áo bo · 40 quần lưng thường'],
   ['H2609-188','PHAN THIẾT - ĐĂNG KHOA','HOOPS','TRINH','2026-09-18','2026-09-21','2026-09-27','VĂN TÀI',22,22,'22 áo thun · 22 quần lưng rời'],
   ['A2609-077','Wollongong Wolves - Sam Bell','AKU','HOÀ','2026-09-12','2026-09-15','2026-09-22','HẢO',60,0,'60 áo bóng đá cổ tim'],
   ['H2609-150','LÊ QUÝ ĐÔN - HÀ MINH HIẾU','HOOPS','VY','2026-09-05','2026-09-08','2026-09-12','AN THỨC',15,15,'15 áo raglan · 15 quần 4 mảnh'],
   ['H2608-260','MERCHANDISE HÀ NỘI 2026','HOOPS','QUYÊN','2026-08-27','2026-08-29','2026-09-03','VĂN TÀI',120,0,'120 áo thun tay ngắn'],
   ['A2608-041','Carrot FC - Kaan Akgunes','AKU','HOÀ','2026-08-20','2026-08-22','2026-08-28','HẢO',18,18,'18 áo bóng đá · 18 quần'],
  ].forEach((x,n) => { const [ma,ten,th,cs,ie,gui,kh,ni,ao,qu,ct] = x; orders.push(mk(ma,ten,th,cs,M3,ie,ie,kh,'Đã ép',ni,Object.assign(DONE(ie,ni,'N'+(n%5+1),1,ao,qu,'PREMIUM'),EP(ie),{taoLuc:ie+' 09:00',slAo:ao,slQuan:qu,chiTiet:ct,confirm:true,xuong:th==='AKU'?'HÒA NHƠN':'CMT8',ngayGuiMay:gui,ngayTraMay:n===1?'2026-09-28':kh}))); });
  // Thêm đơn đã xếp xưởng ngày 21/10, chưa xuất ảnh (để thấy danh sách gửi dồn 1 lần)
  [['H2610-241','GIA ĐỊNH BASKETBALL - REO','QUYÊN','CMT8',30,30,{ao:[['ÁO BO',30]],quan:[['QUẦN LƯNG XỊN',30]]}],
   ['H2610-243','NGUYỄN DU U13 - THẦY TÙNG','VY','CMT8',18,18,{ao:[['ÁO BẠ',18]],quan:[['QUẦN LƯNG THƯỜNG',18]]}],
   ['H2610-244','SAIGON HEAT FAN CLUB','TRINH','CMT8',45,0,{ao:[['ÁO THUN',35],['JACKET',10]],quan:[]}],
   ['H2610-245','THPT BÙI THỊ XUÂN - 12A3','VY','CMT8',22,22,{ao:[['ÁO BO',22]],quan:[['QUẦN DÀI - NAVY 2 DA',22]]}],
   ['A2610-101','Northside Kings - Tom Reid','HOÀ','HÒA NHƠN',24,24,{ao:[['ÁO THUN',20],['MIDLAYER',4]],quan:[['QUẦN REDI',24]]}],
  ].forEach((x,n) => { const [ma,ten,cs,xw,ao,qu,lo] = x; orders.push(mk(ma,ten,ma[0]==='A'?'AKU':'HOOPS',cs,M2,'2026-10-17','2026-10-19','2026-10-'+(25+n),'Đã ép','AN THỨC',Object.assign(DONE('2026-10-19','AN THỨC','N3',n+1,ao,qu,'PREMIUM'),EP('2026-10-19'),{slAo:ao,slQuan:qu,confirm:true,loai:JSON.stringify(lo),xuong:xw,ngayGuiMay:'2026-10-21',ngayTraMay:'2026-10-'+(23+n)}))); });
  // Loại áo quần mẫu cho các đơn CS đã xác nhận
  const LO = {'H2610-236':{ao:[['ÁO BẠ',5]],quan:[['QUẦN LƯNG RỜI',5]]}, 'H2610-231':{ao:[['ÁO BO',4],['ÁO THUN',5]],quan:[['QUẦN LƯNG THƯỜNG',9]]}, 'A2610-092':{ao:[['ÁO THUN',16]],quan:[]},
    'H2609-201':{ao:[['ÁO BO',40]],quan:[['QUẦN LƯNG THƯỜNG',40]]}, 'H2609-188':{ao:[['ÁO THUN',22]],quan:[['QUẦN LƯNG RỜI',22]]}, 'A2609-077':{ao:[['ÁO THUN',60]],quan:[]},
    'H2609-150':{ao:[['ÁO BẠ',15]],quan:[['QUẦN LƯNG XỊN',15]]}, 'H2608-260':{ao:[['ÁO THUN',120]],quan:[]}, 'A2608-041':{ao:[['ÁO THUN',18]],quan:[['QUẦN REDI',18]]}};
  const loTxt = l => [l.ao, l.quan].map(a => a.map(r => r[1]+' '+r[0].toLowerCase()).join(' + ')).filter(Boolean).join(' · ');
  orders.forEach(o => { const l = LO[o.ma]; if (l) { o.loai = JSON.stringify(l); o.chiTiet = loTxt(l); } });
  // Nhóm gửi xưởng trước hôm nay coi như đã xuất ảnh (hoàn thành); nhóm 20/10 còn chờ gửi
  orders.forEach(o => { if (o.xuong && o.ngayGuiMay && o.ngayGuiMay < '2026-10-20') o.xuatAnhLuc = o.ngayGuiMay + ' 17:00'; });
  // Đơn gửi xưởng trước 16/10: QC đạt và CS đã bấm hoàn thành. Đơn gửi 17–19/10: đang ở QC
  orders.forEach(o => { if (!o.xuatAnhLuc) return; const t = o.ngayTraMay || o.ngayKhach;
    if (o.ngayGuiMay < '2026-10-16') Object.assign(o, {qcNhanLuc:t+' 09:00', qcKetQua:'Đạt', qcLuc:t+' 15:00', hoanThanhLuc:t+' 16:30'}); });
  Object.assign(orders.find(o => o.ma === 'H2610-161'), {qcNhanLuc:'2026-10-20 08:30'});
  Object.assign(orders.find(o => o.ma === 'H2610-170'), {qcNhanLuc:'2026-10-19 09:00', qcKetQua:'Đạt', qcLuc:'2026-10-20 10:00'});
  // 1 đơn BP Ép vừa trả về BP In
  Object.assign(orders.find(o => o.ma === 'H2610-253'), {lyDoTraVe:'3 áo số 12 bị lem màu, in lại', traVeLuc:'2026-10-20 10:15'});
  // 1 đơn CS đã lưu số khác BP In (lệch số lượng)
  (o => { if (o) { const n = Math.max(0, (+o.slAoIn||0) - 2); Object.assign(o, {slAo:n, slQuan:o.slQuanIn, loai:JSON.stringify({ao:[['ÁO BO',n]],quan:[]}), csCapNhat:'2026-10-20 11:40'}); } })(orders.find(o => o.tienDo === 'Đã in' && !o.confirm && o.cs === 'TRINH' && o.slAoIn !== ''));
  // Máy in mẫu theo người in; vài đơn có vải phối khác vải bo
  orders.forEach(o => { if (o.nguoiIn && o.tienDo !== 'Chờ in') o.mayIn = o.nguoiIn === 'VĂN TÀI' ? 'MÁY CŨ' : 'MÁY MỚI'; });
  [['H2610-246',8,'ELITE'],['H2610-237',4,'2 DA CỨNG'],['H2610-171',6,'Z2']].forEach(([ma,n,v]) => { const o = orders.find(x => x.ma === ma); o.slPhoi = n; o.vaiPhoi = v; });
  const SEC = {don:['ten','cs','uuTien','ngayFinal','ngayInEp','ngayKhach','ghiChuCS'], in:['tienDo','mayIn','nguoiIn','cuon','slAoIn','slQuanIn','vai','slBo','slPhoi','vaiBo','vaiPhoi','ghiChuIn','ngayDaIn','chuyenEp','lyDoTraVe','lechKiemLuc'], ep:['tienDo','epLe','ngayDaEp','chuyenEp','lyDoTraVe','traVeLuc'], cs:['slAo','slQuan','chiTiet','confirm','loai','ctGhiChu'], may:['xuong','ngayGuiMay','ngayTraMay','ghiChuMay','xuatAnhLuc'], qc:['qcNhanLuc','qcKetQua','qcGhiChu'], xong:['hoanThanhLuc']};
  const STAMP = {in:'inCapNhat', ep:'epCapNhat', cs:'csCapNhat', may:'mayCapNhat', qc:'qcLuc'};
  const NUMK = ['slAoIn','slQuanIn','slAo','slQuan','slBo','slPhoi'];
  const now = () => '2026-10-20 ' + new Date().toTimeString().slice(0,5);
  const clean = s => String(s ?? '').replace(/[​\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();
  const check = o => {
    if (!clean(o.ten)) return 'Chưa nhập tên đơn';
    if (lists['CS'].indexOf(o.cs) < 0) return 'Chưa chọn CS phụ trách';
    if (lists['MỨC ƯU TIÊN'].indexOf(o.uuTien) < 0) return 'Chưa chọn mức ưu tiên';
    if (!o.ngayInEp) return 'Chưa nhập ngày cần xong in ép';
    if (!o.ngayKhach) return 'Chưa nhập ngày khách nhận';
    for (const d of [o.ngayFinal,o.ngayInEp,o.ngayKhach]) if (d && (+d.slice(0,4) < 2024 || +d.slice(0,4) > 2030)) return 'Năm của ngày không hợp lệ';
    if (o.ngayFinal && o.ngayInEp < o.ngayFinal) return 'Ngày cần xong in ép đang sớm hơn ngày FINAL';
    if (o.ngayKhach < o.ngayInEp) return 'Ngày khách nhận đang sớm hơn ngày cần xong in ép';
    return '';
  };
  const tkEntries = [
    {id:'TK1',ngay:'2026-10-17',tk:'NAM',ma:'H2610-231',ten:'7A1 - Nguyễn Đình Cẩm - Gấp',th:'HOOPS',rapAo:2,rapQuan:1,ghiChu:''},
    {id:'TK2',ngay:'2026-10-19',tk:'NAM',ma:'H2610-236',ten:'ƯU TIÊN - OLWS TIME - KIỀU OANH - GẤP',th:'HOOPS',rapAo:1,rapQuan:1,ghiChu:''},
    {id:'TK3',ngay:'2026-10-19',tk:'LINH',ma:'A2610-092',ten:'Huy Tran',th:'AKU',rapAo:1,rapQuan:0,ghiChu:''},
    {id:'TK4',ngay:'2026-10-20',tk:'LINH',ma:'H2610-249',ten:'USH - Thịnh Thái',th:'HOOPS',rapAo:3,rapQuan:2,ghiChu:'sửa rập lần 2'},
  ];
  const ACC = {'tk@vidu.vn':{name:'NAM',roles:['TK']},'trinh@vidu.vn':{name:'TRINH',roles:['CS']},'quyen@vidu.vn':{name:'QUYÊN',roles:['CS','KẾ HOẠCH MAY']},'bpin@vidu.vn':{name:'VĂN TÀI',roles:['BP IN']},'ep@vidu.vn':{name:'BP ÉP',roles:['BP ÉP']},'qc@vidu.vn':{name:'QC',roles:['QC']},'quanly@vidu.vn':{name:'MINH',roles:['QUẢN LÝ']}};
  const SESS = {};
  const auth = (t, need) => { const a = SESS[t]; if (!a) throw new Error('AUTH:Bạn cần đăng nhập'); if (need && a.roles.indexOf('QUẢN LÝ')<0 && !need.some(r=>a.roles.indexOf(r)>=0)) throw new Error('Tài khoản của bạn không có quyền làm thao tác này'); return a; };
  const NEED = {don:['CS'], in:['BP IN'], ep:['BP ÉP','BP IN'], cs:['CS'], may:['KẾ HOẠCH MAY'], qc:['QC'], xong:['CS']};
  const nextStt = o => 1 + Math.max(0, ...orders.filter(x => x !== o && x.ngayDaIn === o.ngayDaIn && x.nguoiIn === o.nguoiIn && x.cuon === o.cuon && x.sttCuon !== '').map(x => +x.sttCuon));
  const updateOrder = (t, ma, sec, patch) => {
    auth(t, NEED[sec]);
    const o = orders.find(x => x.ma === ma); if (!o) throw new Error('Không tìm thấy mã đơn ' + ma);
    patch = Object.assign({}, patch);
    const pick = k => (k in patch ? patch[k] : o[k]);
    if (sec === 'don') { const err = check(Object.assign({}, o, patch)); if (err) throw new Error(err); }
    if (sec === 'in') {
      if ('tienDo' in patch && ['Chờ in','Đang in','Đã in'].indexOf(patch.tienDo) < 0) throw new Error('BP In chỉ chọn Chờ in, Đang in hoặc Đã in');
      const td = pick('tienDo');
      if (td === 'Đã in') { if (!pick('nguoiIn')) throw new Error('Chọn người in trước khi lưu Đã in'); if (!pick('cuon')) throw new Error('Chọn cuộn trước khi lưu Đã in'); if (!pick('ngayDaIn')) patch.ngayDaIn = '2026-10-20'; }
      else if (td !== 'Đã ép' && pick('chuyenEp')) patch.chuyenEp = false;
    }
    if (sec === 'ep') {
      if (!o.chuyenEp) throw new Error('Đơn chưa được BP In chuyển sang ép');
      if (patch.tienDo === 'Đã ép' && !pick('ngayDaEp')) patch.ngayDaEp = '2026-10-20';
      if (patch.tienDo === 'Đã in') patch.ngayDaEp = '';
    }
    const before = Object.assign({}, o);
    SEC[sec].forEach(k => { if (!(k in patch)) return; let v = patch[k];
      if (NUMK.indexOf(k) >= 0) { if (v !== '' && (isNaN(+v) || +v < 0)) throw new Error('Số lượng phải là số'); v = v === '' ? '' : Math.round(+v); }
      else if (k === 'confirm' || k === 'chuyenEp') v = !!v; else v = clean(v);
      o[k] = v; });
    if (sec === 'in') {
      if (o.chuyenEp && !before.chuyenEp) o.chuyenEpLuc = now();
      const moved = ['ngayDaIn','nguoiIn','cuon'].some(k => o[k] !== before[k]);
      if (o.tienDo === 'Đã in' && (o.sttCuon === '' || moved)) o.sttCuon = nextStt(o);
      if (o.tienDo !== 'Đã in' && o.tienDo !== 'Đã ép') o.sttCuon = '';
    }
    if (STAMP[sec]) o[STAMP[sec]] = now();
    return o;
  };
  return {
    login: (email, pw) => { const a = ACC[String(email).trim().toLowerCase()]; if (!a || pw !== '123456') throw new Error('Email hoặc mật khẩu không đúng'); const t = 'demo'+Math.random().toString(36).slice(2); SESS[t] = a; return {token:t, me:{email, name:a.name, roles:a.roles}}; },
    logout: t => { delete SESS[t]; return true; },
    addTkEntry: (t, e) => {
      const a = auth(t, ['TK']);
      if (!e.ngay) throw new Error('Chưa nhập ngày');
      const ao = +e.rapAo||0, qu = +e.rapQuan||0; if (ao<0||qu<0) throw new Error('Số rập phải là số');
      if (!ao && !qu) throw new Error('Nhập số rập áo hoặc số rập quần');
      let ten = clean(e.ten), th = e.th||'';
      if (e.ma) { const o = orders.find(x=>x.ma===e.ma); if (!o) throw new Error('Không tìm thấy mã đơn '+e.ma); ten = o.ten; th = o.th; }
      if (!ten) throw new Error('Chọn mã đơn hoặc nhập tên đơn');
      const r = {id:'TK'+Date.now(), ngay:e.ngay, tk: a.roles.indexOf('QUẢN LÝ')>=0 && e.tk ? e.tk : a.name, ma:e.ma||'', ten, th, rapAo:Math.round(ao), rapQuan:Math.round(qu), ghiChu:clean(e.ghiChu)};
      tkEntries.push(r); return r;
    },
    deleteTkEntry: (t, id) => { const a = auth(t, ['TK']); const i = tkEntries.findIndex(x=>x.id===id); if (i<0) throw new Error('Không tìm thấy dòng cần xóa'); if (a.roles.indexOf('QUẢN LÝ')<0 && tkEntries[i].tk!==a.name) throw new Error('Chỉ xóa được dòng của chính bạn'); tkEntries.splice(i,1); return true; },
    getInit: (t) => ({me: auth(t), tkNames:['NAM','LINH'], tkEntries: (auth(t).roles.some(r=>r==='TK'||r==='QUẢN LÝ') ? tkEntries : []), lists, pushAt:'Đã in', orders, today:'2026-10-20', serverTime:'20/10/2026 ' + new Date().toTimeString().slice(0,5) + ' (chạy thử)'}),
    createOrder: (t, o) => {
      const who = auth(t, ['CS']).name;
      const err = check(o); if (err) throw new Error(err);
      const ten = clean(o.ten);
      if (!o.choPhepTrung && orders.some(x => x.ten.toUpperCase() === ten.toUpperCase())) throw new Error('TRÙNG_TÊN:Đã có đơn tên "'+ten+'". Nếu đây là đơn khác, bấm Lưu lần nữa để vẫn tạo.');
      const p = (o.th === 'AKU' ? 'A' : 'H') + '2610-';
      const n = Math.max(0, ...orders.filter(x => x.ma.indexOf(p) === 0).map(x => +x.ma.slice(p.length))) + 1;
      const r = mk(p + String(n).padStart(3,'0'), ten, o.th, o.cs, o.uuTien, o.ngayFinal, o.ngayInEp, o.ngayKhach, 'Chờ in', '', {ghiChuCS:clean(o.ghiChuCS), taoLuc:now(), nguoiTao:who, inCapNhat:''});
      orders.push(r); return r;
    },
    updateOrder,
    updateMany: (t, mas, sec, patch) => mas.map(ma => updateOrder(t, ma, sec, patch)),
    reorderCuon: (t, mas) => { auth(t, ['BP IN']); return mas.map((ma, i) => { const o = orders.find(x => x.ma === ma); o.sttCuon = i + 1; return o; }); },
  };
})();


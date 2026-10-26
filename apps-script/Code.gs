/**
 * WEB TIẾN ĐỘ IN – ÉP (HOOPS & AKU)
 * CS nhập đơn → BP In cập nhật tiến độ → đơn tự về danh sách của CS → CS nhập SL → Quyên lên kế hoạch may.
 *
 * Phiên bản 1.4.2 (BP In theo cuộn, BP Ép riêng, kế hoạch may theo đơn đã ép). Cài đặt: xem HUONG_DAN_CAI_DAT.md. Lần đầu chạy hàm setup() một lần.
 */

// Hàm setup() đặt ở đầu file để Apps Script chọn sẵn khi bấm Chạy.
/* ---------------- Cài đặt lần đầu ---------------- */

function setup() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error('Script chưa gắn với Google Sheet. Hãy mở Google Sheet → Tiện ích mở rộng → Apps Script, rồi dán code vào đó.');
  ss.setSpreadsheetTimeZone(TZ);

  let sh = ss.getSheetByName(SH_DON) || ss.insertSheet(SH_DON);
  sh.getRange(1, 1, 1, COLS.length).setValues([COLS.map(c => c[1])])
    .setFontWeight('bold').setBackground('#e6efe9').setWrap(true);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  COLS.forEach((c, i) => {
    const col = sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1);
    if (c[2] === 'date') col.setNumberFormat('dd/MM/yyyy');
    if (c[2] === 'ts') col.setNumberFormat('dd/MM/yyyy HH:mm');
    if (c[2] === 'num') col.setNumberFormat('0');
  });
  sh.setColumnWidth(KEY_IDX.ten + 1, 320);

  let dm = ss.getSheetByName(SH_DM);
  if (!dm) {
    dm = ss.insertSheet(SH_DM);
    const names = Object.keys(DEFAULT_LISTS);
    const maxLen = Math.max.apply(null, names.map(n => DEFAULT_LISTS[n].length));
    const grid = [names];
    for (let r = 0; r < maxLen; r++) grid.push(names.map(n => DEFAULT_LISTS[n][r] || ''));
    dm.getRange(1, 1, grid.length, names.length).setValues(grid);
    dm.getRange(1, 1, 1, names.length).setFontWeight('bold').setBackground('#f3ead2');
    dm.setFrozenRows(1);
  } else {
    const have = dm.getRange(1, 1, 1, Math.max(1, dm.getLastColumn())).getValues()[0].map(h => String(h).trim());
    Object.keys(DEFAULT_LISTS).forEach(n => {
      if (have.indexOf(n) >= 0) return;
      const c = have.length + 1; have.push(n);
      const vals = [[n]].concat(DEFAULT_LISTS[n].map(v => [v]));
      dm.getRange(1, c, vals.length, 1).setValues(vals);
      dm.getRange(1, c).setFontWeight('bold').setBackground('#f3ead2');
    });
  }

  let lg = ss.getSheetByName(SH_LOG) || ss.insertSheet(SH_LOG);
  if (lg.getLastRow() === 0) {
    lg.getRange(1, 1, 1, 5).setValues([['THỜI GIAN', 'NGƯỜI', 'MÃ ĐƠN', 'THAO TÁC', 'CHI TIẾT']]).setFontWeight('bold');
    lg.setFrozenRows(1);
    lg.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
  let tk = ss.getSheetByName(SH_TK);
  if (!tk) {
    tk = ss.insertSheet(SH_TK);
    tk.getRange(1, 1, 1, TK_HEAD.length).setValues([TK_HEAD]).setFontWeight('bold').setBackground('#fbe0dc');
    tk.setFrozenRows(1);
    tk.getRange(2, 5, tk.getMaxRows() - 1, 1).insertCheckboxes();
    tk.getRange(2, 6, tk.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    tk.setColumnWidth(1, 240); tk.setColumnWidth(2, 260); tk.setColumnWidth(4, 220);
    tk.getRange('A1').setNote('Mỗi người 1 dòng. Gõ mật khẩu dạng chữ thường; script sẽ tự mã hóa ở lần đăng nhập đầu hoặc khi bấm menu "Mã hóa mật khẩu".\nVAI TRÒ: CS, BP IN, KẾ HOẠCH MAY, QUẢN LÝ (nhiều vai trò cách nhau bằng dấu phẩy).\nTÊN HIỂN THỊ của CS phải trùng tên trong cột CS ở tab DANH_MUC.');
  }
  hashPasswords_();

  let tkS = ss.getSheetByName(SH_TKSL);
  if (!tkS) {
    tkS = ss.insertSheet(SH_TKSL);
    tkS.getRange(1, 1, 1, TKSL_HEAD.length).setValues([TKSL_HEAD]).setFontWeight('bold').setBackground('#e3eef4');
    tkS.setFrozenRows(1);
    tkS.getRange('B:B').setNumberFormat('dd/MM/yyyy');
    tkS.getRange('J:J').setNumberFormat('dd/MM/yyyy HH:mm');
    tkS.setColumnWidth(5, 300);
  }

  buildReports();

  const msg = 'Đã tạo xong các tab DON_HANG, DANH_MUC, LICH_SU, TAI_KHOAN, SAN_LUONG_TK và 3 tab báo cáo';
  Logger.log(msg);
  try { ss.toast(msg, 'Tiến độ In – Ép', 8); } catch (e) {}
  return msg;
}

/** Menu trên Google Sheet: Tiến độ In – Ép → Tạo / sửa các tab */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Tiến độ In – Ép')
    .addItem('Tạo / sửa các tab', 'setup')
    .addItem('Mã hóa mật khẩu vừa nhập', 'hashPasswordsMenu')
    .addItem('Kiểm tra 1 tài khoản đăng nhập', 'checkAccountMenu')
    .addItem('Cập nhật báo cáo (khi đổi danh sách người)', 'buildReports')
    .addItem('Đăng xuất mọi người', 'logoutAll')
    .addToUi();
}



const TZ = 'Asia/Ho_Chi_Minh';
const SH_DON = 'DON_HANG';
const SH_DM = 'DANH_MUC';
const SH_LOG = 'LICH_SU';
const SH_TK = 'TAI_KHOAN';
const TK_HEAD = ['EMAIL', 'MẬT KHẨU', 'TÊN HIỂN THỊ', 'VAI TRÒ', 'ĐANG DÙNG', 'ĐĂNG NHẬP GẦN NHẤT'];
const ROLES = ['CS', 'BP IN', 'BP ÉP', 'KẾ HOẠCH MAY', 'TK', 'QUẢN LÝ'];
const IN_STEPS = ['Chờ in', 'Đang in', 'Đã in'];
const SH_TKSL = 'SAN_LUONG_TK';
const TKSL_HEAD = ['ID', 'NGÀY', 'TK', 'MÃ ĐƠN', 'TÊN ĐƠN', 'THƯƠNG HIỆU', 'SỐ RẬP ÁO', 'SỐ RẬP QUẦN', 'GHI CHÚ', 'NHẬP LÚC', 'NGƯỜI NHẬP'];
const BC_IN = 'BC - SẢN LƯỢNG IN', BC_CS = 'BC - ĐƠN CS', BC_TK = 'BC - SẢN LƯỢNG TK';
const SESSION_DAYS = 30;   // đăng nhập giữ trong 30 ngày
const MAX_FAILS = 5;       // sai 5 lần thì khóa 15 phút
const KEEP_DAYS = 180; // web chỉ tải đơn trong 180 ngày gần nhất, hoặc đơn chưa xong

// [khóa, tiêu đề cột trên sheet, kiểu]
const COLS = [
  ['ma', 'MÃ ĐƠN', 'text'],
  ['taoLuc', 'NGÀY TẠO', 'ts'],
  ['nguoiTao', 'NGƯỜI TẠO', 'text'],
  ['ten', 'TÊN ĐƠN', 'text'],
  ['th', 'THƯƠNG HIỆU', 'text'],
  ['cs', 'CS PHỤ TRÁCH', 'text'],
  ['uuTien', 'MỨC ƯU TIÊN', 'text'],
  ['ngayFinal', 'NGÀY FINAL', 'date'],
  ['ngayInEp', 'NGÀY CẦN XONG IN ÉP', 'date'],
  ['ngayKhach', 'NGÀY KHÁCH NHẬN', 'date'],
  ['ghiChuCS', 'GHI CHÚ CS', 'text'],
  ['tienDo', 'TIẾN ĐỘ IN', 'text'],
  ['nguoiIn', 'NGƯỜI IN', 'text'],
  ['epLe', 'ÉP LẺ/CUỘN', 'text'],
  ['slAoIn', 'SL ÁO IN', 'num'],
  ['slQuanIn', 'SL QUẦN IN', 'num'],
  ['ghiChuIn', 'GHI CHÚ IN', 'text'],
  ['inCapNhat', 'IN CẬP NHẬT LÚC', 'ts'],
  ['slAo', 'SL ÁO (CS)', 'num'],
  ['slQuan', 'SL QUẦN (CS)', 'num'],
  ['chiTiet', 'CHI TIẾT MAY', 'text'],
  ['confirm', 'CS CONFIRM', 'bool'],
  ['csCapNhat', 'CS CẬP NHẬT LÚC', 'ts'],
  ['xuong', 'XƯỞNG MAY', 'text'],
  ['ngayGuiMay', 'NGÀY GỬI MAY', 'date'],
  ['ngayTraMay', 'NGÀY XƯỞNG TRẢ', 'date'],
  ['ghiChuMay', 'GHI CHÚ MAY', 'text'],
  ['mayCapNhat', 'MAY CẬP NHẬT LÚC', 'ts'],
  ['ngayDaIn', 'NGÀY ĐÃ IN', 'date'],   // thêm ở bản 1.3, luôn để cuối để không lệch cột cũ
  ['ngayDaEp', 'NGÀY ĐÃ ÉP', 'date'],
  ['cuon', 'CUỘN', 'text'],            // thêm ở bản 1.4
  ['sttCuon', 'STT TRONG CUỘN', 'num'],
  ['vai', 'VẢI', 'text'],
  ['slBo', 'SL BO', 'num'],
  ['slPhoi', 'SL PHỐI', 'num'],
  ['vaiBo', 'VẢI BO/PHỐI', 'text'],
  ['chuyenEp', 'CHUYỂN ÉP', 'bool'],
  ['chuyenEpLuc', 'CHUYỂN ÉP LÚC', 'ts'],
  ['epCapNhat', 'ÉP CẬP NHẬT LÚC', 'ts'],
];
const KEY_IDX = {};
COLS.forEach((c, i) => (KEY_IDX[c[0]] = i));

// Ai được sửa cột nào, và cột "cập nhật lúc" tương ứng
const SECTIONS = {
  don: { keys: ['ten', 'cs', 'uuTien', 'ngayFinal', 'ngayInEp', 'ngayKhach', 'ghiChuCS'], stamp: null, roles: ['CS'] },
  in: { keys: ['tienDo', 'nguoiIn', 'cuon', 'slAoIn', 'slQuanIn', 'vai', 'slBo', 'slPhoi', 'vaiBo', 'ghiChuIn', 'ngayDaIn', 'chuyenEp'], stamp: 'inCapNhat', roles: ['BP IN'] },
  ep: { keys: ['tienDo', 'epLe', 'ngayDaEp'], stamp: 'epCapNhat', roles: ['BP ÉP', 'BP IN'] },
  cs: { keys: ['slAo', 'slQuan', 'chiTiet', 'confirm'], stamp: 'csCapNhat', roles: ['CS'] },
  may: { keys: ['xuong', 'ngayGuiMay', 'ngayTraMay', 'ghiChuMay'], stamp: 'mayCapNhat', roles: ['KẾ HOẠCH MAY'] },
};

const DEFAULT_LISTS = {
  'THƯƠNG HIỆU': ['HOOPS', 'AKU'],
  'CS': ['QUYÊN', 'TRINH', 'VY', 'HOÀ'],
  'MỨC ƯU TIÊN': ['MỨC 1 - SIÊU GẤP', 'MỨC 2 - GẤP', 'MỨC 3 - BÌNH THƯỜNG'],
  'TIẾN ĐỘ IN': ['Chờ in', 'Đang in', 'Đã in', 'Đã ép'],
  'NGƯỜI IN': ['AN THỨC', 'VĂN TÀI', 'HẢO'],
  'ÉP LẺ/CUỘN': ['CUỘN', 'ÉP LẺ'],
  'XƯỞNG MAY': ['CMT8', 'HÒA NHƠN'],
  'NGƯỜI LÊN KẾ HOẠCH MAY': ['QUYÊN'],
  'ĐẨY VỀ CS KHI': ['Đã in'],
  'THIẾT KẾ': [],
  'CUỘN': ['N1', 'N2', 'N3', 'N4', 'N5', 'T1', 'T2', 'T3', 'T4', 'T5', 'H1', 'H2', 'H3', 'C1', 'C2', 'C3', 'V1'],
  'LOẠI VẢI': ['PREMIUM', 'PRE NGƯỢC', 'ELITE', 'ELITE NGƯỢC', '2 DA MỀM', '2 DA CỨNG', 'Z2', 'MAX AIR', 'BÓNG CHIẾU', 'KAMI', 'DƯƠNG HUY', 'DH NGƯỢC', 'VẢI LƯỚI', 'POLY X', 'ACTIVE', 'MK50', 'PRO'],
};

/* ---------------- Web ---------------- */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Tiến độ In – Ép')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------------- Đọc dữ liệu ---------------- */

function getInit(token) {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(SH_DON) || !ss.getSheetByName(SH_DM) || !ss.getSheetByName(SH_LOG) || !ss.getSheetByName(SH_TK)) setup();
  const me = auth_(token);
  const lists = readLists_();
  const sh = sheet_(SH_DON);
  const last = sh.getLastRow();
  const orders = [];
  if (last >= 2) {
    const values = sh.getRange(2, 1, last - 1, COLS.length).getValues();
    const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5);
    values.forEach(row => {
      if (!row[0]) return;
      const o = rowToObj_(row);
      const done = o.tienDo === 'Đã ép' && o.confirm && o.xuong && o.ngayGuiMay;
      const ref = row[KEY_IDX.ngayKhach] instanceof Date ? row[KEY_IDX.ngayKhach]
        : row[KEY_IDX.taoLuc] instanceof Date ? row[KEY_IDX.taoLuc] : null;
      if (done && ref && ref < cutoff) return;
      orders.push(o);
    });
  }
  const tkNames = tkNames_(lists);
  const tkEntries = (me.roles.indexOf('TK') >= 0 || me.roles.indexOf('QUẢN LÝ') >= 0) ? readTk_(62) : [];
  return {
    me: me,
    tkNames: tkNames,
    tkEntries: tkEntries,
    lists: lists,
    pushAt: (lists['ĐẨY VỀ CS KHI'] || ['Đã in'])[0] || 'Đã in',
    orders: orders,
    today: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    serverTime: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'),
  };
}

/* ---------------- Ghi dữ liệu ---------------- */

function createOrder(token, o) {
  const me = auth_(token, ['CS']);
  const who = me.name;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const lists = readLists_();
    const err = validateOrder_(o, lists, true);
    if (err) throw new Error(err);
    const sh = sheet_(SH_DON);
    const ten = cleanText_(o.ten);
    if (findRow_(sh, null, ten)) {
      if (!o.choPhepTrung) throw new Error('TRÙNG_TÊN:Đã có đơn tên "' + ten + '". Nếu đây là đơn khác, bấm Lưu lần nữa để vẫn tạo.');
    }
    const ma = nextMa_(sh, o.th);
    const row = COLS.map(() => '');
    row[KEY_IDX.ma] = ma;
    row[KEY_IDX.taoLuc] = new Date();
    row[KEY_IDX.nguoiTao] = cleanText_(who);
    row[KEY_IDX.ten] = ten;
    row[KEY_IDX.th] = o.th;
    row[KEY_IDX.tienDo] = 'Chờ in';
    SECTIONS.don.keys.forEach(k => {
      if (k !== 'ten') row[KEY_IDX[k]] = toCell_(k, o[k]);
    });
    sh.appendRow(row);
    log_(who, ma, 'Tạo đơn', ten);
    return rowToObj_(row);
  } finally {
    lock.releaseLock();
  }
}

/** section: 'don' | 'in' | 'cs' | 'may' */
function updateOrder(token, ma, section, patch) {
  const sec = SECTIONS[section];
  if (!sec) throw new Error('Không rõ phần cần cập nhật');
  const me = auth_(token, sec.roles);
  const who = me.name;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SH_DON);
    const r = findRow_(sh, ma);
    if (!r) throw new Error('Không tìm thấy mã đơn ' + ma);
    const range = sh.getRange(r, 1, 1, COLS.length);
    const row = range.getValues()[0];
    const before = rowToObj_(row);
    if (section === 'don') {
      const lists = readLists_();
      const err = validateOrder_(Object.assign({}, before, patch), lists, false);
      if (err) throw new Error(err);
    }
    const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    const pick = k => (k in patch ? patch[k] : before[k]);
    if (section === 'in') {
      if ('tienDo' in patch && IN_STEPS.indexOf(patch.tienDo) < 0) throw new Error('BP In chỉ chọn Chờ in, Đang in hoặc Đã in');
      if (before.tienDo === 'Đã ép' && 'tienDo' in patch && patch.tienDo !== 'Đã ép') throw new Error('Đơn đã ép xong. Muốn sửa, nhờ BP Ép hoàn tác trước.');
      const td = pick('tienDo');
      if (td === 'Đã in') {
        if (!pick('nguoiIn')) throw new Error('Chọn người in trước khi lưu Đã in');
        if (!pick('cuon')) throw new Error('Chọn cuộn trước khi lưu Đã in');
        if (!pick('ngayDaIn')) patch.ngayDaIn = today;
      } else if (td !== 'Đã ép') {
        if (pick('chuyenEp')) patch.chuyenEp = false;
      }
      if (patch.chuyenEp && td !== 'Đã in' && td !== 'Đã ép') throw new Error('Chỉ chuyển ép được đơn đã in');
    }
    if (section === 'ep') {
      if ('tienDo' in patch && ['Đã in', 'Đã ép'].indexOf(patch.tienDo) < 0) throw new Error('BP Ép chỉ chọn Đã ép hoặc hoàn tác về Đã in');
      if (!before.chuyenEp) throw new Error('Đơn chưa được BP In chuyển sang ép');
      if (patch.tienDo === 'Đã ép' && !pick('ngayDaEp')) patch.ngayDaEp = today;
      if (patch.tienDo === 'Đã in') patch.ngayDaEp = '';
    }
    const changes = [];
    sec.keys.forEach(k => {
      if (!(k in patch)) return;
      const v = toCell_(k, patch[k]);
      const oldS = String(before[k] === undefined ? '' : before[k]);
      const nv = rowToObj_(withCell_(row, k, v))[k];
      if (String(nv) !== oldS) {
        changes.push(COLS[KEY_IDX[k]][1] + ': ' + (oldS || '—') + ' → ' + (nv === '' ? '—' : nv));
        row[KEY_IDX[k]] = v;
      }
    });
    if (!changes.length) return before;
    if (sec.stamp) row[KEY_IDX[sec.stamp]] = new Date();
    if (section === 'in') {
      const after = rowToObj_(row);
      if (after.chuyenEp && !before.chuyenEp) row[KEY_IDX.chuyenEpLuc] = new Date();
      const moved = ['ngayDaIn', 'nguoiIn', 'cuon'].some(k => after[k] !== before[k]);
      if (after.tienDo === 'Đã in' && (after.sttCuon === '' || moved)) row[KEY_IDX.sttCuon] = nextStt_(sh, r, after);
      if (after.tienDo !== 'Đã in' && after.tienDo !== 'Đã ép') row[KEY_IDX.sttCuon] = '';
    }
    range.setValues([row]);
    log_(who, ma, labelOf_(section), changes.join(' · '));
    return rowToObj_(row);
  } finally {
    lock.releaseLock();
  }
}

/** Thứ tự tiếp theo trong cùng cuộn (cùng ngày đã in, người in, cuộn) */
function nextStt_(sh, selfRow, o) {
  const last = sh.getLastRow();
  if (last < 2) return 1;
  const v = sh.getRange(2, 1, last - 1, COLS.length).getValues();
  let max = 0;
  v.forEach((row, i) => {
    if (i + 2 === selfRow || !row[0]) return;
    const x = rowToObj_(row);
    if (x.ngayDaIn === o.ngayDaIn && x.nguoiIn === o.nguoiIn && x.cuon === o.cuon && x.sttCuon !== '') max = Math.max(max, Number(x.sttCuon));
  });
  return max + 1;
}

/** BP In sắp lại thứ tự đơn trong 1 cuộn: mas là danh sách mã theo thứ tự mới */
function reorderCuon(token, mas) {
  const me = auth_(token, ['BP IN']);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = sheet_(SH_DON);
    const out = [];
    mas.forEach((ma, i) => {
      const r = findRow_(sh, ma);
      if (!r) return;
      sh.getRange(r, KEY_IDX.sttCuon + 1).setValue(i + 1);
      out.push(rowToObj_(sh.getRange(r, 1, 1, COLS.length).getValues()[0]));
    });
    log_(me.name, '', 'Sắp thứ tự cuộn', mas.join(' → '));
    return out;
  } finally { lock.releaseLock(); }
}

/** Làm cùng 1 thao tác cho nhiều đơn (chuyển ép cả cuộn, đã ép cả cuộn) */
function updateMany(token, mas, section, patch) {
  return mas.map(ma => updateOrder(token, ma, section, Object.assign({}, patch)));
}

/* ---------------- Sản lượng TK (bảng riêng) ---------------- */

function addTkEntry(token, e) {
  const me = auth_(token, ['TK']);
  const isQL = me.roles.indexOf('QUẢN LÝ') >= 0;
  const tk = isQL && e.tk ? cleanText_(e.tk) : me.name;
  const d = parseDate_(e.ngay);
  if (!d) throw new Error('Chưa nhập ngày');
  const ao = toInt_(e.rapAo, 'Số rập áo'), quan = toInt_(e.rapQuan, 'Số rập quần');
  if (!ao && !quan) throw new Error('Nhập số rập áo hoặc số rập quần');
  let ten = cleanText_(e.ten), th = cleanText_(e.th), ma = cleanText_(e.ma);
  if (ma) {
    const sh = sheet_(SH_DON); const r = findRow_(sh, ma);
    if (!r) throw new Error('Không tìm thấy mã đơn ' + ma);
    const o = rowToObj_(sh.getRange(r, 1, 1, COLS.length).getValues()[0]);
    ten = o.ten; th = o.th;
  }
  if (!ten) throw new Error('Chọn mã đơn hoặc nhập tên đơn');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const id = 'TK' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    const row = [id, d, tk, ma, ten, th, ao, quan, cleanText_(e.ghiChu), new Date(), me.name];
    sheet_(SH_TKSL).appendRow(row);
    log_(me.name, ma, 'TK nhập rập', tk + ': ' + ao + ' áo, ' + quan + ' quần · ' + ten);
    return tkRowToObj_(row);
  } finally { lock.releaseLock(); }
}

function deleteTkEntry(token, id) {
  const me = auth_(token, ['TK']);
  const sh = sheet_(SH_TKSL);
  if (sh.getLastRow() < 2) throw new Error('Không tìm thấy dòng cần xóa');
  const hit = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  if (!hit) throw new Error('Không tìm thấy dòng cần xóa');
  const row = sh.getRange(hit.getRow(), 1, 1, TKSL_HEAD.length).getValues()[0];
  if (me.roles.indexOf('QUẢN LÝ') < 0 && row[2] !== me.name) throw new Error('Chỉ xóa được dòng của chính bạn');
  sh.deleteRow(hit.getRow());
  log_(me.name, row[3], 'TK xóa dòng rập', row[2] + ': ' + row[6] + ' áo, ' + row[7] + ' quần · ' + row[4]);
  return true;
}

function readTk_(days) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SH_TKSL);
  if (!sh || sh.getLastRow() < 2) return [];
  const cutoff = new Date(Date.now() - days * 864e5);
  return sh.getRange(2, 1, sh.getLastRow() - 1, TKSL_HEAD.length).getValues()
    .filter(r => r[0] && r[1] instanceof Date && r[1] >= cutoff).map(tkRowToObj_);
}

function tkRowToObj_(r) {
  return { id: String(r[0]), ngay: r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'yyyy-MM-dd') : '', tk: String(r[2]), ma: String(r[3]),
    ten: String(r[4]), th: String(r[5]), rapAo: r[6] === '' ? 0 : Number(r[6]), rapQuan: r[7] === '' ? 0 : Number(r[7]), ghiChu: String(r[8]) };
}

function tkNames_(lists) {
  const out = (lists['THIẾT KẾ'] || []).slice();
  const sh = SpreadsheetApp.getActive().getSheetByName(SH_TK);
  if (sh && sh.getLastRow() >= 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(r => {
      const roles = parseRoles_(r[3]);
      const name = cleanText_(r[2]);
      if (name && roles.indexOf('TK') >= 0 && out.indexOf(name) < 0) out.push(name);
    });
  }
  return out;
}

function toInt_(v, label) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(v);
  if (!isFinite(n) || n < 0) throw new Error(label + ' phải là số');
  return Math.round(n);
}

/* ---------------- Báo cáo trong Sheet ---------------- */

/** Tạo (hoặc làm lại) 3 tab báo cáo. Ô B2 là tháng cần xem; đổi tháng thì số liệu tự tính lại. */
function buildReports() {
  const ss = SpreadsheetApp.getActive();
  const lists = readLists_();
  const L = k => colLetter_(KEY_IDX[k] + 1);
  const D = "'" + SH_DON + "'!";
  const rng = k => D + L(k) + '2:' + L(k);

  // 1. Sản lượng in theo người in, tính theo NGÀY ĐÃ IN
  reportSheet_(ss, BC_IN, 'TỔNG HỢP SẢN LƯỢNG IN – BP IN', 'Tính theo NGÀY ĐÃ IN. Đổi tháng ở ô B2.',
    lists['NGƯỜI IN'],
    [['SỐ ĐƠN', n => `=COUNTIFS(${rng('nguoiIn')},"${n}",${rng('ngayDaIn')},">="&$B$2,${rng('ngayDaIn')},"<"&EDATE($B$2,1))`],
     ['SL ÁO', n => `=SUMIFS(${rng('slAoIn')},${rng('nguoiIn')},"${n}",${rng('ngayDaIn')},">="&$B$2,${rng('ngayDaIn')},"<"&EDATE($B$2,1))`],
     ['SL QUẦN', n => `=SUMIFS(${rng('slQuanIn')},${rng('nguoiIn')},"${n}",${rng('ngayDaIn')},">="&$B$2,${rng('ngayDaIn')},"<"&EDATE($B$2,1))`],
     ['TỔNG SP', (n, r) => `=C${r}+D${r}`],
     ['SL BO', n => `=SUMIFS(${rng('slBo')},${rng('nguoiIn')},"${n}",${rng('ngayDaIn')},">="&$B$2,${rng('ngayDaIn')},"<"&EDATE($B$2,1))`],
     ['SL PHỐI', n => `=SUMIFS(${rng('slPhoi')},${rng('nguoiIn')},"${n}",${rng('ngayDaIn')},">="&$B$2,${rng('ngayDaIn')},"<"&EDATE($B$2,1))`],
     ['ĐƠN ÉP LẺ', n => `=COUNTIFS(${rng('nguoiIn')},"${n}",${rng('epLe')},"ÉP LẺ",${rng('ngayDaIn')},">="&$B$2,${rng('ngayDaIn')},"<"&EDATE($B$2,1))`]],
    'SẢN LƯỢNG IN THEO NGÀY (ÁO + QUẦN)',
    (n, dRef) => `=SUMIFS(${rng('slAoIn')},${rng('nguoiIn')},"${n}",${rng('ngayDaIn')},">="&${dRef},${rng('ngayDaIn')},"<"&${dRef}+1)+SUMIFS(${rng('slQuanIn')},${rng('nguoiIn')},"${n}",${rng('ngayDaIn')},">="&${dRef},${rng('ngayDaIn')},"<"&${dRef}+1)`);

  // 2. Đơn CS làm, tính theo NGÀY FINAL
  const csIn = (n, extra) => `=COUNTIFS(${rng('cs')},"${n}",${rng('ngayFinal')},">="&$B$2,${rng('ngayFinal')},"<"&EDATE($B$2,1)${extra || ''})`;
  reportSheet_(ss, BC_CS, 'TỔNG HỢP ĐƠN CS LÀM', 'Tính theo NGÀY FINAL. Đổi tháng ở ô B2. "Trễ in ép" là đơn có NGÀY ĐÃ ÉP sau NGÀY CẦN XONG IN ÉP.',
    lists['CS'],
    [['SỐ ĐƠN', n => csIn(n)],
     ['HOOPS', n => csIn(n, `,${rng('th')},"HOOPS"`)],
     ['AKU', n => csIn(n, `,${rng('th')},"AKU"`)],
     ['MỨC 1', n => csIn(n, `,${rng('uuTien')},"MỨC 1*"`)],
     ['MỨC 2', n => csIn(n, `,${rng('uuTien')},"MỨC 2*"`)],
     ['MỨC 3', n => csIn(n, `,${rng('uuTien')},"MỨC 3*"`)],
     ['ĐÃ CONFIRM', n => csIn(n, `,${rng('confirm')},"CONFIRM"`)],
     ['SL ÁO', n => `=SUMIFS(${rng('slAo')},${rng('cs')},"${n}",${rng('ngayFinal')},">="&$B$2,${rng('ngayFinal')},"<"&EDATE($B$2,1))`],
     ['SL QUẦN', n => `=SUMIFS(${rng('slQuan')},${rng('cs')},"${n}",${rng('ngayFinal')},">="&$B$2,${rng('ngayFinal')},"<"&EDATE($B$2,1))`],
     ['TRỄ IN ÉP', n => `=SUMPRODUCT((${rng('cs')}="${n}")*(${rng('ngayFinal')}>=$B$2)*(${rng('ngayFinal')}<EDATE($B$2,1))*(${rng('ngayDaEp')}<>"")*((${rng('ngayDaEp')}-${rng('ngayInEp')})>=0.5))`]],
    'SỐ ĐƠN THEO NGÀY FINAL',
    (n, dRef) => `=COUNTIFS(${rng('cs')},"${n}",${rng('ngayFinal')},">="&${dRef},${rng('ngayFinal')},"<"&${dRef}+1)`);

  // 3. Sản lượng TK, tính theo NGÀY trong bảng SAN_LUONG_TK
  const T = "'" + SH_TKSL + "'!";
  reportSheet_(ss, BC_TK, 'TỔNG HỢP SẢN LƯỢNG RẬP – THIẾT KẾ', 'Tính theo NGÀY TK nhập trên web. Đổi tháng ở ô B2.',
    tkNames_(lists),
    [['SỐ LẦN NHẬP', n => `=COUNTIFS(${T}C2:C,"${n}",${T}B2:B,">="&$B$2,${T}B2:B,"<"&EDATE($B$2,1))`],
     ['RẬP ÁO', n => `=SUMIFS(${T}G2:G,${T}C2:C,"${n}",${T}B2:B,">="&$B$2,${T}B2:B,"<"&EDATE($B$2,1))`],
     ['RẬP QUẦN', n => `=SUMIFS(${T}H2:H,${T}C2:C,"${n}",${T}B2:B,">="&$B$2,${T}B2:B,"<"&EDATE($B$2,1))`],
     ['TỔNG RẬP', (n, r) => `=C${r}+D${r}`]],
    'TỔNG RẬP THEO NGÀY',
    (n, dRef) => `=SUMIFS(${T}G2:G,${T}C2:C,"${n}",${T}B2:B,">="&${dRef},${T}B2:B,"<"&${dRef}+1)+SUMIFS(${T}H2:H,${T}C2:C,"${n}",${T}B2:B,">="&${dRef},${T}B2:B,"<"&${dRef}+1)`);
  try { ss.toast('Đã cập nhật 3 tab báo cáo', 'Tiến độ In – Ép', 6); } catch (e) {}
}

/**
 * Bố cục 1 tab báo cáo:
 *  A1 tiêu đề · A2 "THÁNG" B2 ngày đầu tháng (giữ nguyên khi làm lại) · A3 ghi chú
 *  Bảng tổng: hàng 5 tiêu đề, mỗi người 1 hàng, hàng TỔNG cuối
 *  Bảng theo ngày: cột A ngày, mỗi người 1 cột, cột TỔNG
 */
function reportSheet_(ss, name, title, note, people, metrics, dayTitle, dayFormula) {
  let sh = ss.getSheetByName(name);
  let month = null;
  if (sh) { const v = sh.getRange('B2').getValue(); if (v instanceof Date) month = v; sh.clear(); sh.clearConditionalFormatRules(); }
  else sh = ss.insertSheet(name);
  if (!month) { const t = new Date(); month = new Date(Date.UTC(t.getFullYear(), t.getMonth(), 1, 5)); }
  people = (people || []).filter(Boolean);
  if (!people.length) people = ['(chưa có tên)'];

  sh.getRange('A1').setValue(title).setFontWeight('bold').setFontSize(14);
  sh.getRange('A2').setValue('THÁNG').setFontWeight('bold');
  sh.getRange('B2').setValue(month).setNumberFormat('MM/yyyy').setBackground('#f3ead2').setFontWeight('bold')
    .setNote('Gõ ngày bất kỳ trong tháng cần xem, ví dụ 01/10/2026');
  sh.getRange('C2').setFormula('=IF(B2="","",DATE(YEAR(B2),MONTH(B2),1))').setNumberFormat('"từ "dd/MM/yyyy').setFontColor('#5d6864');
  sh.getRange('A3').setValue(note).setFontColor('#5d6864').setFontStyle('italic');
  // B2 dùng ngày đầu tháng: đổi công thức để chấp nhận ngày bất kỳ
  const B = '$C$2';

  const head = ['TÊN'].concat(metrics.map(m => m[0]));
  const top = 5;
  sh.getRange(top, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e6efe9');
  people.forEach((n, i) => {
    const r = top + 1 + i;
    const row = [n].concat(metrics.map(m => m[1](n.replace(/"/g, '""'), r).split('$B$2').join(B)));
    sh.getRange(r, 1, 1, row.length).setValues([row]);
  });
  const tr = top + 1 + people.length;
  const totals = ['TỔNG'].concat(metrics.map((m, j) => { const c = colLetter_(j + 2); return `=SUM(${c}${top + 1}:${c}${tr - 1})`; }));
  sh.getRange(tr, 1, 1, totals.length).setValues([totals]).setFontWeight('bold').setBackground('#eaece7');
  sh.getRange(top + 1, 2, people.length + 1, metrics.length).setNumberFormat('#,##0');

  const d0 = tr + 3;
  sh.getRange(d0 - 1, 1).setValue(dayTitle).setFontWeight('bold');
  const dh = ['NGÀY'].concat(people, ['TỔNG']);
  sh.getRange(d0, 1, 1, dh.length).setValues([dh]).setFontWeight('bold').setBackground('#e6efe9');
  const rows = [];
  for (let k = 0; k < 31; k++) {
    const r = d0 + 1 + k;
    const dRef = '$A' + r;
    const dateF = `=IF(${B}+${k}<EDATE(${B},1),${B}+${k},"")`;
    const cells = people.map(n => `=IF(${dRef}="","",${dayFormula(n.replace(/"/g, '""'), dRef).replace(/^=/, '')})`);
    const sumF = `=IF(${dRef}="","",SUM(${colLetter_(2)}${r}:${colLetter_(people.length + 1)}${r}))`;
    rows.push([dateF].concat(cells, [sumF]));
  }
  sh.getRange(d0 + 1, 1, 31, dh.length).setFormulas(rows);
  sh.getRange(d0 + 1, 1, 31, 1).setNumberFormat('ddd dd/MM');
  sh.getRange(d0 + 1, 2, 31, people.length + 1).setNumberFormat('#,##0;-#,##0;""');
  const dsum = d0 + 32;
  sh.getRange(dsum, 1, 1, dh.length).setFormulas([['="TỔNG THÁNG"'].concat(dh.slice(1).map((x, j) => { const c = colLetter_(j + 2); return `=SUM(${c}${d0 + 1}:${c}${d0 + 31})`; }))])
    .setFontWeight('bold').setBackground('#eaece7');
  sh.setFrozenRows(0);
  sh.setColumnWidth(1, 150);
  for (let c = 2; c <= Math.max(head.length, dh.length); c++) sh.setColumnWidth(c, 105);
  // tô đậm chủ nhật
  const rule = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND($A${d0 + 1}<>"",WEEKDAY($A${d0 + 1})=1)`)
    .setBackground('#fbe0dc').setRanges([sh.getRange(d0 + 1, 1, 31, dh.length)]).build();
  sh.setConditionalFormatRules([rule]);
}

function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/* ---------------- Đăng nhập ---------------- */

function login(email, password) {
  email = cleanText_(email).toLowerCase();
  password = String(password || '');
  if (!email || !password) throw new Error('Nhập email và mật khẩu');
  const cache = CacheService.getScriptCache();
  const failKey = 'fail_' + Utilities.base64EncodeWebSafe(email);
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= MAX_FAILS) throw new Error('Sai mật khẩu quá ' + MAX_FAILS + ' lần. Thử lại sau 15 phút.');
  hashPasswords_();
  const acc = findAccount_(email);
  if (!acc || !acc.active || !checkPassword_(password, acc.hash)) {
    cache.put(failKey, String(fails + 1), 900);
    throw new Error(acc && !acc.active ? 'Tài khoản đang bị khóa. Liên hệ quản lý.' : 'Email hoặc mật khẩu không đúng');
  }
  cache.remove(failKey);
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const props = PropertiesService.getScriptProperties();
  cleanSessions_(props);
  props.setProperty('tok_' + token, JSON.stringify({ email: email, exp: Date.now() + SESSION_DAYS * 864e5 }));
  try { sheet_(SH_TK).getRange(acc.row, 6).setValue(new Date()); } catch (e) {}
  log_(acc.name, '', 'Đăng nhập', email);
  return { token: token, me: { email: email, name: acc.name, roles: acc.roles } };
}

function logout(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('tok_' + token);
  return true;
}

/** Menu: buộc mọi người đăng nhập lại (dùng khi đổi mật khẩu hoặc có người nghỉ) */
function logoutAll() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).forEach(k => { if (k.indexOf('tok_') === 0) props.deleteProperty(k); });
  try { SpreadsheetApp.getActive().toast('Đã đăng xuất mọi người', 'Tiến độ In – Ép', 6); } catch (e) {}
}

/** Menu: nhập email + mật khẩu, báo chính xác vì sao đăng nhập được hoặc không */
function checkAccountMenu() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Kiểm tra tài khoản', 'Nhập email cần kiểm tra:', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const email = cleanText_(a.getResponseText()).toLowerCase();
  const sh = SpreadsheetApp.getActive().getSheetByName(SH_TK);
  if (!sh) { ui.alert('Chưa có tab ' + SH_TK + '. Hãy chạy menu "Tạo / sửa các tab".'); return; }
  const n = Math.max(0, sh.getLastRow() - 1);
  const acc = findAccount_(email);
  if (!acc) {
    ui.alert('Không tìm thấy email "' + email + '" trong tab ' + SH_TK + ' (đang có ' + n + ' dòng tài khoản).\n\nKiểm tra: email gõ ở cột A, bắt đầu từ hàng 2, không gõ nhầm chữ.');
    return;
  }
  const b = ui.prompt('Kiểm tra tài khoản', 'Tìm thấy ở hàng ' + acc.row + '. Nhập mật khẩu để thử:', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  hashPasswords_();
  const fresh = findAccount_(email);
  const okPw = checkPassword_(String(b.getResponseText()), fresh.hash);
  const lines = [
    'Email: ' + email + ' (hàng ' + fresh.row + ')',
    'Tên hiển thị: ' + fresh.name,
    'Vai trò: ' + (fresh.roles.length ? fresh.roles.join(', ') : 'CHƯA CÓ VAI TRÒ HỢP LỆ (CS, BP IN, BP ÉP, KẾ HOẠCH MAY, TK, QUẢN LÝ)'),
    'Đang dùng: ' + (fresh.active ? 'có' : 'KHÔNG – cần tick ô cột E'),
    'Mật khẩu: ' + (okPw ? 'đúng' : 'SAI – gõ đè mật khẩu mới vào cột B rồi chạy lại menu này'),
  ];
  ui.alert(okPw && fresh.active && fresh.roles.length ? 'Tài khoản đăng nhập được' : 'Tài khoản chưa đăng nhập được', lines.join('\n'), ui.ButtonSet.OK);
  try { CacheService.getScriptCache().remove('fail_' + Utilities.base64EncodeWebSafe(email)); } catch (e) {}
}

function hashPasswordsMenu() {
  const n = hashPasswords_();
  try { SpreadsheetApp.getActive().toast('Đã mã hóa ' + n + ' mật khẩu', 'Tiến độ In – Ép', 6); } catch (e) {}
}

/** Kiểm tra phiên đăng nhập; need = danh sách vai trò được phép (QUẢN LÝ luôn được) */
function auth_(token, need) {
  if (!token) throw new Error('AUTH:Bạn cần đăng nhập');
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('tok_' + token);
  if (!raw) throw new Error('AUTH:Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
  const s = JSON.parse(raw);
  if (s.exp < Date.now()) { props.deleteProperty('tok_' + token); throw new Error('AUTH:Phiên đăng nhập đã hết hạn, hãy đăng nhập lại'); }
  const acc = findAccount_(s.email);
  if (!acc || !acc.active) { props.deleteProperty('tok_' + token); throw new Error('AUTH:Tài khoản không còn dùng được'); }
  const me = { email: s.email, name: acc.name, roles: acc.roles };
  if (need && me.roles.indexOf('QUẢN LÝ') < 0 && !need.some(r => me.roles.indexOf(r) >= 0)) {
    throw new Error('Tài khoản của bạn không có quyền làm thao tác này');
  }
  return me;
}

function findAccount_(email) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SH_TK);
  if (!sh || sh.getLastRow() < 2) return null;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues();
  for (let i = 0; i < v.length; i++) {
    if (cleanText_(v[i][0]).toLowerCase() !== email) continue;
    const roles = parseRoles_(v[i][3]);
    return { row: i + 2, hash: String(v[i][1]), name: cleanText_(v[i][2]) || email, roles: roles, active: v[i][4] === true || String(v[i][4]).toUpperCase() === 'TRUE' };
  }
  return null;
}

/** Đổi mật khẩu dạng chữ thường trong tab TAI_KHOAN thành mã hóa. Trả về số mật khẩu đã đổi. */
function hashPasswords_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SH_TK);
  if (!sh || sh.getLastRow() < 2) return 0;
  const rg = sh.getRange(2, 2, sh.getLastRow() - 1, 1);
  const v = rg.getValues();
  let n = 0;
  v.forEach(r => {
    const p = String(r[0]);
    if (p && p.indexOf('sha256$') !== 0) { r[0] = makeHash_(p); n++; }
  });
  if (n) rg.setValues(v);
  return n;
}

function makeHash_(password) {
  const salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  return 'sha256$' + salt + '$' + sha256Hex_(salt + password);
}

function checkPassword_(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 3 || parts[0] !== 'sha256') return false;
  return sha256Hex_(parts[1] + password) === parts[2];
}

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

function cleanSessions_(props) {
  const all = props.getProperties(), now = Date.now();
  Object.keys(all).forEach(k => {
    if (k.indexOf('tok_') !== 0) return;
    try { if (JSON.parse(all[k]).exp < now) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}

/* ---------------- Hỗ trợ ---------------- */

function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Chưa có tab ' + name + '. Hãy chạy hàm setup() một lần.');
  return sh;
}

function readLists_() {
  const dm = sheet_(SH_DM);
  const v = dm.getDataRange().getValues();
  const out = {};
  if (!v.length) return Object.assign({}, DEFAULT_LISTS);
  v[0].forEach((h, c) => {
    const name = String(h).trim();
    if (!name) return;
    out[name] = v.slice(1).map(r => cleanText_(r[c])).filter(Boolean);
  });
  Object.keys(DEFAULT_LISTS).forEach(k => { if (!out[k] || !out[k].length) out[k] = DEFAULT_LISTS[k].slice(); });
  return out;
}

function findRow_(sh, ma, ten) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  if (ma) {
    const hit = sh.getRange(2, 1, last - 1, 1).createTextFinder(ma).matchEntireCell(true).findNext();
    return hit ? hit.getRow() : 0;
  }
  const names = sh.getRange(2, KEY_IDX.ten + 1, last - 1, 1).getValues();
  const want = norm_(ten);
  for (let i = names.length - 1; i >= 0; i--) if (norm_(names[i][0]) === want) return i + 2;
  return 0;
}

function nextMa_(sh, th) {
  const prefix = (th === 'AKU' ? 'A' : 'H') + Utilities.formatDate(new Date(), TZ, 'yyMM') + '-';
  const last = sh.getLastRow();
  let max = 0;
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(r => {
      const s = String(r[0]);
      if (s.indexOf(prefix) === 0) max = Math.max(max, parseInt(s.slice(prefix.length), 10) || 0);
    });
  }
  return prefix + ('00' + (max + 1)).slice(-3);
}

function validateOrder_(o, lists, isNew) {
  if (!cleanText_(o.ten)) return 'Chưa nhập tên đơn';
  if (isNew && lists['THƯƠNG HIỆU'].indexOf(o.th) < 0) return 'Chưa chọn thương hiệu';
  if (lists['CS'].indexOf(o.cs) < 0) return 'Chưa chọn CS phụ trách';
  if (lists['MỨC ƯU TIÊN'].indexOf(o.uuTien) < 0) return 'Chưa chọn mức ưu tiên';
  const f = parseDate_(o.ngayFinal), ie = parseDate_(o.ngayInEp), k = parseDate_(o.ngayKhach);
  if (!ie) return 'Chưa nhập ngày cần xong in ép';
  if (!k) return 'Chưa nhập ngày khách nhận';
  for (const d of [f, ie, k]) if (d && (d.getFullYear() < 2024 || d.getFullYear() > 2030)) return 'Năm của ngày không hợp lệ';
  if (f && ie < f) return 'Ngày cần xong in ép đang sớm hơn ngày FINAL';
  if (k < ie) return 'Ngày khách nhận đang sớm hơn ngày cần xong in ép';
  return '';
}

function toCell_(k, v) {
  const type = COLS[KEY_IDX[k]][2];
  if (v === null || v === undefined) return '';
  if (type === 'date') return parseDate_(v) || '';
  if (type === 'num') {
    if (v === '') return '';
    const n = Number(v);
    if (!isFinite(n) || n < 0) throw new Error(COLS[KEY_IDX[k]][1] + ' phải là số');
    return Math.round(n);
  }
  if (type === 'bool') return v ? (k === 'confirm' ? 'CONFIRM' : 'CÓ') : '';
  return cleanText_(v);
}

/** 'yyyy-MM-dd' → Date lúc 12:00 giờ VN, để không lệch ngày dù múi giờ dự án khác */
function parseDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 5, 0, 0));
}

function rowToObj_(row) {
  const o = {};
  COLS.forEach((c, i) => {
    const v = row[i];
    if (c[2] === 'date') o[c[0]] = v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : '';
    else if (c[2] === 'ts') o[c[0]] = v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm') : '';
    else if (c[2] === 'num') o[c[0]] = v === '' || v === null ? '' : Number(v);
    else if (c[2] === 'bool') o[c[0]] = v === true || ['CONFIRM', 'CÓ', 'TRUE'].indexOf(String(v).toUpperCase()) >= 0;
    else o[c[0]] = v === null || v === undefined ? '' : String(v);
  });
  return o;
}

function withCell_(row, k, v) {
  const copy = row.slice();
  copy[KEY_IDX[k]] = v;
  return copy;
}

/** Đọc cột VAI TRÒ: chấp nhận có dấu / không dấu / viết tắt, ví dụ "Quản lí", "QUAN LY", "QL", "in", "ép", "thiết kế" */
function parseRoles_(text) {
  const plain = t => cleanText_(t).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').replace(/\s+/g, ' ');
  const ALIAS = {
    'CS': 'CS', 'CHAM SOC KHACH HANG': 'CS',
    'BP IN': 'BP IN', 'IN': 'BP IN', 'BO PHAN IN': 'BP IN',
    'BP EP': 'BP ÉP', 'EP': 'BP ÉP', 'BO PHAN EP': 'BP ÉP',
    'KE HOACH MAY': 'KẾ HOẠCH MAY', 'KHM': 'KẾ HOẠCH MAY', 'MAY': 'KẾ HOẠCH MAY',
    'TK': 'TK', 'THIET KE': 'TK', 'DESIGN': 'TK',
    'QUAN LY': 'QUẢN LÝ', 'QUAN LI': 'QUẢN LÝ', 'QL': 'QUẢN LÝ', 'ADMIN': 'QUẢN LÝ',
  };
  const out = [];
  String(text || '').split(/[,;\/+\n]/).forEach(r => { const k = ALIAS[plain(r)]; if (k && out.indexOf(k) < 0) out.push(k); });
  return out;
}

function cleanText_(s) {
  return String(s === null || s === undefined ? '' : s).normalize('NFC').replace(/[​\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function norm_(s) {
  return cleanText_(s).toUpperCase();
}

function labelOf_(section) {
  return { don: 'Sửa đơn', in: 'BP In cập nhật', cs: 'CS nhập SL', may: 'Kế hoạch may' }[section];
}

function log_(who, ma, action, detail) {
  try {
    sheet_(SH_LOG).appendRow([new Date(), cleanText_(who) || '(không rõ)', ma, action, detail]);
  } catch (e) { /* lịch sử lỗi thì bỏ qua, không chặn thao tác chính */ }
}

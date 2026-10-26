const errMsg = e => String((e && e.message) || e).replace(/^Error:\s*/, '').replace(/^Exception:\s*/, '');
let TOKEN = null;
async function api(fn, ...args){
  try { return await call(fn, TOKEN, ...args); }
  catch (e) {
    const m = errMsg(e);
    if (m.indexOf('AUTH:') >= 0) { TOKEN = null; store.del('token'); showLogin(m.split('AUTH:')[1]); throw new Error('__auth__'); }
    throw e;
  }
}

/* ============ Trạng thái ============ */
let D = null;                 // {lists, pushAt, orders, today, serverTime}
let VIEW = 'quytrinh';
let ME = '';
const DRAFT = {};             // DRAFT[ma+'|'+section] = {key: value}
let lastCreated = null, editMa = null, allowDup = false;
const EDIT_IN = {};           // đơn đã in đang mở lại để sửa
const EPF = {};               // thiết lập ép theo cuộn: EPF[key] = {epLe, ngay}
const F = {q:'', cs:'', th:'', td:'chua', bpq:'', bpShowDone:false, myCs:'', mayX:'', mayQ:'', htQ:'', htCs:'', htX:'', htOpen:{}, tkMonth:'', tkWho:''};
let SLM = '';
const TKF = {ngay:'', tk:'', don:'', ten:'', th:'HOOPS', rapAo:'', rapQuan:'', ghiChu:'', noMa:false};
const store = {get(k){try{return localStorage.getItem('tdie_'+k)}catch(e){return null}}, set(k,v){try{localStorage.setItem('tdie_'+k,v)}catch(e){}}, del(k){try{localStorage.removeItem('tdie_'+k)}catch(e){}}};
let ROLES = [];
const has = r => ROLES.indexOf('QUẢN LÝ') >= 0 || ROLES.indexOf(r) >= 0;

// step: số bước trong quy trình (hiện trên tab); không có step là màn hình xem / báo cáo
const VIEWS = [
  {id:'quytrinh', name:'Quy trình', role:''},
  {id:'nhap', name:'Nhập đơn', role:'CS', step:1},
  {id:'bpin', name:'BP In', role:'BP IN', step:2},
  {id:'bpep', name:'BP Ép', role:['BP ÉP','BP IN'], step:3},
  {id:'cuatoi', name:'CS xác nhận SL', role:'CS', step:4},
  {id:'may', name:'Kế hoạch may', role:'KẾ HOẠCH MAY', step:5},
  {id:'xong', name:'Đơn hoàn thành', role:''},
  {id:'tiendo', name:'Tiến độ', role:''},
  {id:'slin', name:'Sản lượng In', role:'BP IN'},
  {id:'tk', name:'Sản lượng TK', role:'TK'},
];
const canSee = id => myViews().some(v => v.id === id);
const myViews = () => VIEWS.filter(v => !v.role || [].concat(v.role).some(has));

/* ============ Tiện ích ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dmy = s => s ? s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4) : '';
const dm = s => s ? s.slice(8,10)+'/'+s.slice(5,7) : '—';
const dayNum = s => { const [y,m,d] = s.slice(0,10).split('-').map(Number); return Date.UTC(y,m-1,d)/864e5; };
const diff = (a,b) => (a && b) ? Math.round(dayNum(a) - dayNum(b)) : null;
const pLevel = u => u && u.indexOf('MỨC 1')===0 ? 1 : u && u.indexOf('MỨC 2')===0 ? 2 : 3;
const pShort = u => ({1:'Mức 1 · siêu gấp',2:'Mức 2 · gấp',3:'Mức 3 · bình thường'})[pLevel(u)];
const pTag = u => `<span class="p${pLevel(u)}">${pShort(u)}</span>`;
const tdClass = t => ({'Chờ in':'t-cho','Đang in':'t-dang','Đã in':'t-in','Đã ép':'t-ep'})[t] || 't-cho';
const tdChip = t => `<span class="chip ${tdClass(t)}">${esc(t||'Chờ in')}</span>`;
const oChip = o => o.tienDo === 'Đã in' && o.chuyenEp ? '<span class="chip t-dang">Chờ ép</span>' : tdChip(o.tienDo);
const N0 = v => Number(v) || 0;
const nz = v => v === '' || v === undefined || v === null ? '—' : v;
const gKey = o => (o.ngayDaIn||'') + '|' + (o.nguoiIn||'') + '|' + (o.cuon||'');
function rollGroups(list){
  const g = {};
  list.forEach(o => (g[gKey(o)] = g[gKey(o)] || []).push(o));
  const keys = Object.keys(g).sort((a,b) => { const [da,pa,ca] = a.split('|'), [db,pb,cb] = b.split('|'); return db.localeCompare(da) || pa.localeCompare(pb) || ca.localeCompare(cb, 'vi', {numeric:true}); });
  keys.forEach(k => g[k].sort((a,b) => (N0(a.sttCuon)||999) - (N0(b.sttCuon)||999) || a.ma.localeCompare(b.ma)));
  return keys.map(k => ({key:k, ngay:k.split('|')[0], nguoi:k.split('|')[1], cuon:k.split('|')[2], items:g[k]}));
}
const sumOf = (a, k) => a.reduce((s,o) => s + N0(o[k]), 0);
const stepIdx = t => D.lists['TIẾN ĐỘ IN'].indexOf(t || 'Chờ in');
const reached = o => stepIdx(o.tienDo) >= stepIdx(D.pushAt);
function remTag(o){
  if (o.tienDo === 'Đã ép') return '<span class="rem r-no">xong</span>';
  const n = diff(o.ngayInEp, D.today);
  if (n === null) return '<span class="rem r-no">—</span>';
  const c = n < 0 ? 'r-red' : n <= 2 ? 'r-or' : n <= 7 ? 'r-ye' : 'r-no';
  const t = n < 0 ? 'trễ '+(-n)+' ngày' : n === 0 ? 'hôm nay' : 'còn '+n+' ngày';
  return `<span class="rem ${c}">${t}</span>`;
}
function stuckDays(o){
  const since = (o.inCapNhat || o.taoLuc || '').slice(0,10);
  return since ? diff(D.today, since) : null;
}
function toast(msg, isErr){
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (isErr ? ' err' : ''); t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, isErr ? 6000 : 2600);
}
function copyText(text, title){
  const done = () => toast('Đã chép. Dán vào Zalo là được.');
  const fallback = () => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal-in" role="dialog" aria-label="${esc(title)}"><b>${esc(title)}</b><span class="hint">Trình duyệt chặn chép tự động. Bấm vào ô, chọn tất cả rồi chép.</span><textarea id="cpy" readonly>${esc(text)}</textarea><div class="actions"><button class="btn" type="button" id="cpyClose">Đóng</button></div></div>`;
    document.body.appendChild(m); const ta = m.querySelector('#cpy'); ta.focus(); ta.select();
    m.querySelector('#cpyClose').onclick = () => m.remove();
  };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
}
const byKey = ma => D.orders.find(o => o.ma === ma);
function draft(ma, sec){ const k = ma+'|'+sec; return DRAFT[k] || (DRAFT[k] = {}); }
function val(o, sec, key){ const d = DRAFT[o.ma+'|'+sec]; return d && key in d ? d[key] : o[key]; }
function isDirty(ma, sec){ const d = DRAFT[ma+'|'+sec]; return !!(d && Object.keys(d).length); }
function opts(list, cur, blank){ return (blank !== undefined ? `<option value="">${esc(blank)}</option>` : '') + list.map(v => `<option${v===cur?' selected':''}>${esc(v)}</option>`).join(''); }
function zaloText(o){
  return `[${o.ma}] ${o.ten}\n${o.th} · ${pShort(o.uuTien)} · CS ${o.cs}\nCần xong in ép: ${dmy(o.ngayInEp)} · Khách nhận: ${dmy(o.ngayKhach)}` + (o.ghiChuCS ? `\nGhi chú: ${o.ghiChuCS}` : '');
}

/* ============ Tải dữ liệu ============ */
async function load(){
  TOKEN = TOKEN || store.get('token');
  if (!TOKEN) { showLogin(); return; }
  $('#syncTxt').textContent = 'Đang tải…';
  try {
    D = await api('getInit');
    $('#syncTxt').textContent = 'Cập nhật ' + D.serverTime;
    setMe(D.me); render();
  } catch (e) { if (errMsg(e) === '__auth__') return; $('#syncTxt').textContent = 'Lỗi tải'; toast('Không tải được dữ liệu: ' + errMsg(e), true); }
}
function setMe(me){
  ME = me.name; ROLES = me.roles || [];
  $('#whoBox').hidden = false;
  $('#meName').innerHTML = esc(me.name) + ' <small>· ' + esc(ROLES.join(', ') || 'chưa có vai trò') + '</small>';
  const L = D.lists;
  if (!F.myCs || !has('QUẢN LÝ')) F.myCs = L['CS'].indexOf(ME) >= 0 ? ME : (F.myCs || L['CS'][0]);
  const vs = myViews();
  const saved = store.get('view');
  if (saved && vs.some(v => v.id === saved)) VIEW = saved;
  else if (!vs.some(v => v.id === VIEW)) VIEW = 'quytrinh';
}
function showLogin(msg, typedEmail){
  D = null; ME = ''; ROLES = [];
  $('#whoBox').hidden = true; $('#nav').innerHTML = ''; $('#syncTxt').textContent = 'Chưa đăng nhập';
  const demo = IS_LIVE ? '' : '<div class="demo"><b>Bản chạy thử.</b> Đăng nhập bằng 1 trong các tài khoản mẫu, mật khẩu đều là <b>123456</b>:<br>tk@vidu.vn (Thiết kế) · trinh@vidu.vn (CS) · quyen@vidu.vn (CS + Kế hoạch may) · bpin@vidu.vn (BP In) · ep@vidu.vn (BP Ép) · quanly@vidu.vn (Quản lý)</div>';
  $('#main').innerHTML = demo + `<form class="login" id="fLogin" autocomplete="on">
    <div><h2>Đăng nhập</h2><p class="lede">Dùng email và mật khẩu quản lý đã cấp cho bạn.</p></div>
    ${msg ? `<div class="err">${esc(msg)}</div>` : ''}
    <div class="f"><label for="lgEmail">Email</label><input type="text" id="lgEmail" inputmode="email" autocomplete="username" value="${esc(typedEmail ?? store.get('email') ?? '')}"></div>
    <div class="f"><label for="lgPw">Mật khẩu</label><input type="password" id="lgPw" autocomplete="current-password"></div>
    <button class="btn" type="submit" id="lgBtn">Đăng nhập</button>
    <span class="hint">Quên mật khẩu hoặc chưa có tài khoản: liên hệ quản lý. Quản lý thêm tài khoản ở tab TAI_KHOAN trong Google Sheet.</span>
  </form>`;
  const f = $('#fLogin');
  ($('#lgEmail').value ? $('#lgPw') : $('#lgEmail')).focus();
  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const b = $('#lgBtn'); b.disabled = true; b.textContent = 'Đang đăng nhập…';
    try {
      const em = $('#lgEmail').value.trim();
      const r = await call('login', em, $('#lgPw').value);
      TOKEN = r.token; store.set('token', TOKEN); store.set('email', em);
      load();
    } catch (e) { showLogin(errMsg(e), $('#lgEmail').value); }
  });
}
$('#logoutBtn').addEventListener('click', async () => {
  try { await call('logout', TOKEN); } catch (e) {}
  TOKEN = null; store.del('token'); store.del('view'); showLogin();
});
$('#reload').addEventListener('click', () => { if (TOKEN) load(); });

/* ============ Vẽ giao diện ============ */
function render(){
  if (!D) return;
  const notDone = D.orders.filter(o => o.tienDo !== 'Đã ép');
  const late = notDone.filter(o => diff(o.ngayInEp, D.today) < 0).length;
  const myTodo = D.orders.filter(o => o.cs === F.myCs && reached(o) && !o.confirm).length;
  const mayTodo = D.orders.filter(o => o.confirm && !o.xuong).length;
  const badges = {tiendo: late ? `<span class="badge hot">${late} trễ</span>` : '', bpin:`<span class="badge">${notDone.length}</span>`, cuatoi: myTodo ? `<span class="badge hot">${myTodo}</span>` : '', may: mayTodo ? `<span class="badge hot">${mayTodo}</span>` : ''};
  $('#nav').innerHTML = myViews().map(v => `<button role="tab" type="button" aria-selected="${v.id===VIEW}" data-v="${v.id}">${v.step?`<span class="stepno">${v.step}</span>`:''}${v.name}${badges[v.id]||''}</button>`).join('');
  const noRole = ROLES.length ? '' : '<div class="demo"><b>Tài khoản này chưa có vai trò hợp lệ</b>, nên chỉ xem được Tiến độ. Quản lý ghi ở cột VAI TRÒ (tab TAI_KHOAN) một hoặc nhiều vai trò: CS, BP IN, BP ÉP, KẾ HOẠCH MAY, TK, QUẢN LÝ, cách nhau bằng dấu phẩy. Sau đó bấm Đăng xuất rồi đăng nhập lại.</div>';
  const demo = (IS_LIVE ? '' : '<div class="demo"><b>Bản chạy thử.</b> Dữ liệu là đơn mẫu, chỉ lưu tạm trong trang này và mất khi tải lại. Bản thật ghi thẳng vào Google Sheet.</div>') + noRole;
  const v = {xong:vXong, quytrinh:vQuyTrinh, nhap:vNhap, tiendo:vTienDo, bpin:vBpIn, cuatoi:vCuaToi, may:vMay, bpep:vBpEp, slin:vSlIn, tk:vTk}[VIEW]();
  const keepScroll = window.scrollY;
  $('#main').innerHTML = demo + v;
  window.scrollTo(0, keepScroll);
  bind();
}
$('#nav').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; VIEW = b.dataset.v; store.set('view', VIEW); window.scrollTo(0,0); render(); });

/* ---------- 0. Quy trình: toàn bộ đơn theo 6 chặng ---------- */
const STAGES = [
  {id:'cho',  name:'Chờ in',               who:'BP In',        view:'bpin',  test:o => !o.tienDo || o.tienDo === 'Chờ in'},
  {id:'dang', name:'Đang in',              who:'BP In',        view:'bpin',  test:o => o.tienDo === 'Đang in'},
  {id:'dain', name:'Đã in · chờ chuyển ép', who:'BP In',        view:'bpin',  test:o => o.tienDo === 'Đã in' && !o.chuyenEp},
  {id:'choep',name:'Chờ ép',               who:'BP Ép',        view:'bpep',  test:o => o.tienDo === 'Đã in' && o.chuyenEp},
  {id:'daep', name:'Đã ép · chờ xếp xưởng', who:'Kế hoạch may', view:'may',   test:o => o.tienDo === 'Đã ép' && !o.xuong},
  {id:'xuong',name:'Đã xếp xưởng · chờ gửi', who:'Kế hoạch may', view:'may',   test:o => !!o.xuong && !o.xuatAnhLuc},
];
const stageOf = o => isDone(o) ? {id:'xong', name:'Hoàn thành', who:'Đơn hoàn thành', view:'xong'} : (STAGES.find(s => s.test(o)) || STAGES[0]);
const lateOf = o => o.xuong ? false : o.tienDo === 'Đã ép' ? diff(o.ngayKhach, D.today) < 0 : diff(o.ngayInEp, D.today) < 0;
function vQuyTrinh(){
  const urg = (a,b) => pLevel(a.uuTien)-pLevel(b.uuTien) || (a.ngayInEp||'9').localeCompare(b.ngayInEp||'9');
  const recentX = o => !isDone(o);
  const col = s => {
    const all = D.orders.filter(o => s.test(o) && recentX(o)).sort(urg);
    const late = all.filter(lateOf).length;
    const go = canSee(s.view);
    return `<div class="stage${late?' has-late':''}">
      <${go?`button type="button" data-go="${s.view}"`:'div'} class="stage-h"><span class="stage-n">${all.length}</span><span><b>${esc(s.name)}</b><small>${esc(s.who)}</small></span>${late?`<span class="rem r-red">${late} trễ</span>`:''}</${go?'button':'div'}>
      <ul class="stage-list">${all.slice(0,5).map(o=>`<li><button type="button" class="olink" data-open="${esc(o.ma)}"><span class="mono">${esc(o.ma)}</span><span class="ot">${esc(o.ten)}</span></button>${lateOf(o)?'<span class="dot-late" title="Trễ hạn"></span>':''}</li>`).join('') || '<li class="hint">Trống</li>'}${all.length>5?`<li class="hint">+ ${all.length-5} đơn khác</li>`:''}</ul>
    </div>`;
  };
  const csTodo = D.orders.filter(o => reached(o) && !o.confirm && !o.xuong);
  const todo = [];
  if (has('CS')) { const m = csTodo.filter(o => !has('QUẢN LÝ') ? o.cs === ME : true).length; todo.push({v:'cuatoi', t:`${m} đơn đã in chờ ${has('QUẢN LÝ')?'CS':'bạn'} nhập số lượng & CONFIRM`, n:m}); todo.push({v:'nhap', t:'Nhập đơn mới đã ra file rập', n:-1}); }
  if (has('BP IN')) { const a = D.orders.filter(o => STAGES[0].test(o) || STAGES[1].test(o)).length, b = D.orders.filter(STAGES[2].test).length; todo.push({v:'bpin', t:`${a} đơn cần in · ${b} đơn đã in chờ confirm chuyển ép`, n:a+b}); }
  if (has('BP ÉP')) { const a = D.orders.filter(STAGES[3].test).length; todo.push({v:'bpep', t:`${a} đơn chờ ép`, n:a}); }
  if (has('KẾ HOẠCH MAY')) { const a = D.orders.filter(STAGES[4].test).length; todo.push({v:'may', t:`${a} đơn đã ép chờ xếp xưởng`, n:a}); }
  if (has('TK')) todo.push({v:'tk', t:'Nhập số rập áo, rập quần đã ra', n:-1});
  return `
  <div class="vhead"><h2>Quy trình đơn hàng</h2><p class="lede">Mỗi đơn đi qua 6 chặng, từ lúc CS nhập đến lúc gửi xưởng may. Bấm tên chặng để mở màn hình làm việc, bấm mã đơn để xem toàn bộ lịch sử của đơn đó.</p></div>
  ${todo.length ? `<div class="sec"><h3>Việc của bạn</h3><div class="todo">${todo.map(x=>`<button type="button" class="todo-i" data-go="${x.v}"><span class="stepno">${(VIEWS.find(v=>v.id===x.v)||{}).step||'TK'}</span><span>${esc(x.t)}</span>${x.n>0?`<span class="badge hot">${x.n}</span>`:''}<span class="arr" aria-hidden="true">→</span></button>`).join('')}</div></div>` : ''}
  <div class="flow-steps" aria-hidden="true"><span style="grid-column:span 3">Bước 2 · BP In</span><span>Bước 3 · BP Ép</span><span style="grid-column:span 2">Bước 5 · Kế hoạch may</span></div>
  <div class="pipe">${STAGES.map(col).join('')}</div>
  <div class="cmp">Song song với chặng 3–5: <b>${csTodo.length}</b> đơn đã in nhưng CS chưa CONFIRM số lượng${csTodo.length?` (${D.lists['CS'].map(c=>{const n=csTodo.filter(o=>o.cs===c).length;return n?esc(c)+' '+n:''}).filter(Boolean).join(' · ')})`:''}. Kế hoạch may tạm dùng số BP In cho các đơn này.</div>`;
}

/* ---------- Chi tiết 1 đơn: gộp mọi bước vào 1 dòng thời gian ---------- */
function openOrder(ma){
  const o = byKey(ma); if (!o) return;
  const dd = s => s ? (s.length > 10 ? dm(s)+' '+s.slice(11,16) : dmy(s)) : '';
  const st = (done, title, when, body) => `<li class="tl${done?' done':''}"><div class="tl-h"><b>${title}</b>${when?`<span class="num">${esc(when)}</span>`:''}</div>${body?`<div class="hint">${body}</div>`:''}</li>`;
  const inDone = o.tienDo === 'Đã in' || o.tienDo === 'Đã ép';
  const steps = [
    st(true, '1 · CS nhập đơn', dd(o.taoLuc), `${esc(o.nguoiTao||o.cs)} · FINAL ${dmy(o.ngayFinal)||'—'}${o.ghiChuCS?' · '+esc(o.ghiChuCS):''}`),
    st(inDone, '2 · BP In: '+esc(o.tienDo||'Chờ in'), dd(o.ngayDaIn||o.inCapNhat), o.nguoiIn ? `${esc(o.nguoiIn)}${o.cuon?` · cuộn ${esc(o.cuon)}${o.sttCuon?' #'+o.sttCuon:''}`:''} · ${nz(o.slAoIn)} áo · ${nz(o.slQuanIn)} quần${o.vai?' · '+esc(o.vai):''}${N0(o.slBo)?' · '+o.slBo+' bo':''}${N0(o.slPhoi)?' · '+o.slPhoi+' phối':''}${o.ghiChuIn?' · '+esc(o.ghiChuIn):''}` : 'Chưa phân người in'),
    st(!!o.chuyenEp, '2b · BP In confirm chuyển ép', dd(o.chuyenEpLuc), ''),
    st(o.tienDo === 'Đã ép', '3 · BP Ép', dd(o.ngayDaEp), o.tienDo === 'Đã ép' ? esc(o.epLe||'') : ''),
    st(!!o.confirm, '4 · CS xác nhận số lượng', dd(o.csCapNhat), o.confirm ? `${nz(o.slAo)} áo · ${nz(o.slQuan)} quần${o.chiTiet?' · '+esc(o.chiTiet):''}` : (reached(o) ? 'Chờ CS nhập' : '')),
    st(!!o.xuong, '5 · Kế hoạch may', dd(o.ngayGuiMay), o.xuong ? `Xưởng ${esc(o.xuong)}${o.ngayTraMay?' · trả '+dmy(o.ngayTraMay):''}${o.ghiChuMay?' · '+esc(o.ghiChuMay):''}${o.xuatAnhLuc?' · đã xuất ảnh gửi xưởng '+esc(dd(o.xuatAnhLuc)):' · chưa gửi xưởng'}` : ''),
  ];
  const d = $('#drawer');
  d.innerHTML = `<div class="drawer-bg" data-close></div><aside class="drawer-in" role="dialog" aria-label="Chi tiết đơn ${esc(o.ma)}">
    <div class="ch"><div><div class="mono">${esc(o.ma)} · ${esc(o.th)} · CS ${esc(o.cs)}</div><div class="t">${esc(o.ten)}</div></div><button class="btn ghost sm" type="button" data-close aria-label="Đóng">✕</button></div>
    <div class="meta"><span>${pTag(o.uuTien)}</span><span>Xong in ép <b>${dm(o.ngayInEp)}</b></span><span>Khách nhận <b>${dm(o.ngayKhach)}</b></span><span>${remTag(o)}</span></div>
    <div class="meta"><span>Đang ở chặng <b>${esc(stageOf(o).name)}</b></span></div>
    <ol class="tline">${steps.join('')}</ol>
    <div class="actions">${canSee(stageOf(o).view)?`<button class="btn ghost sm" type="button" data-go="${stageOf(o).view}" data-close>Mở màn hình ${esc(stageOf(o).who)}</button>`:''}</div>
  </aside>`;
  d.hidden = false;
  d.querySelector('.drawer-in .btn[data-close]').focus();
}
function closeDrawer(){ const d = $('#drawer'); d.hidden = true; d.innerHTML = ''; }
document.addEventListener('click', e => {
  const op = e.target.closest('[data-open]'); if (op) { openOrder(op.dataset.open); return; }
  const td = e.target.closest('#main td.mono'); if (td && byKey(td.textContent.trim())) { openOrder(td.textContent.trim()); return; }
  const z = e.target.closest('[data-zalo2]'); if (z) { copyText(zaloText(byKey(z.dataset.zalo2)), 'Tin Zalo cho BP In'); return; }
  const go = e.target.closest('[data-go]');
  if (go) { VIEW = go.dataset.go; store.set('view', VIEW); closeDrawer(); window.scrollTo(0,0); render(); return; }
  if (e.target.closest('[data-close]')) closeDrawer();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer(); });

/* ---------- 1. Nhập đơn ---------- */
function vNhap(){
  const L = D.lists, e = editMa ? byKey(editMa) : null;
  const d = draft(editMa || '_new', 'don');
  const g = k => k in d ? d[k] : e ? e[k] : ({th:'HOOPS', cs: L['CS'].indexOf(ME)>=0 ? ME : '', uuTien:'', ngayFinal:D.today})[k] || '';
  const w = [];
  if (g('ngayFinal') && g('ngayInEp') && diff(g('ngayInEp'), g('ngayFinal')) < 0) w.push('Ngày cần xong in ép đang sớm hơn ngày FINAL.');
  if (g('ngayInEp') && g('ngayKhach') && diff(g('ngayKhach'), g('ngayInEp')) < 0) w.push('Ngày khách nhận đang sớm hơn ngày cần xong in ép.');
  const mine = D.orders.filter(o => o.cs === (L['CS'].indexOf(ME)>=0 ? ME : o.cs) && (o.taoLuc||'').slice(0,10) >= addDays(D.today,-3)).slice(-12).reverse();
  return `
  <div class="vhead"><h2>${e ? 'Sửa đơn '+esc(e.ma) : 'Nhập đơn đã ra file rập'}</h2><p class="lede">Lưu xong, web tự sinh mã đơn và đưa đơn sang màn hình BP In.</p></div>
  ${lastCreated && !e ? `<div class="ok"><span>Đã tạo đơn <b>${esc(lastCreated.ma)}</b> · ${esc(lastCreated.ten)}</span></div>` : ''}
  <form class="form" id="fNhap" autocomplete="off">
    <div class="f s6"><label for="n_ten">Tên đơn <span class="req">*</span></label><input type="text" id="n_ten" data-k="ten" value="${esc(g('ten'))}" placeholder="Ví dụ: 20-10 TDS NAVY (U13 TDS ƯU TIÊN)"></div>
    <div class="f s2"><span class="lb">Thương hiệu <span class="req">*</span></span>${e ? `<div><b>${esc(e.th)}</b> <span class="hint">(không đổi được sau khi tạo)</span></div>` : `<div class="seg" role="group" aria-label="Thương hiệu">${L['THƯƠNG HIỆU'].map(t=>`<button type="button" aria-pressed="${g('th')===t}" data-set="th" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>`}</div>
    <div class="f s2"><label for="n_cs">CS phụ trách <span class="req">*</span></label><select id="n_cs" data-k="cs">${opts(L['CS'], g('cs'), '— chọn —')}</select></div>
    <div class="f s2"><span class="lb">Mức ưu tiên <span class="req">*</span></span><div class="seg" role="group" aria-label="Mức ưu tiên">${L['MỨC ƯU TIÊN'].map(u=>`<button type="button" aria-pressed="${g('uuTien')===u}" data-set="uuTien" data-v="${esc(u)}">${'Mức '+pLevel(u)}</button>`).join('')}</div></div>
    <div class="f s2"><label for="n_f">Ngày FINAL</label><input type="date" id="n_f" data-k="ngayFinal" value="${esc(g('ngayFinal'))}"></div>
    <div class="f s2"><label for="n_ie">Ngày cần xong in ép <span class="req">*</span></label><input type="date" id="n_ie" data-k="ngayInEp" value="${esc(g('ngayInEp'))}"></div>
    <div class="f s2"><label for="n_k">Ngày khách nhận <span class="req">*</span></label><input type="date" id="n_k" data-k="ngayKhach" value="${esc(g('ngayKhach'))}"></div>
    <div class="f s6"><label for="n_gc">Ghi chú cho BP In</label><input type="text" id="n_gc" data-k="ghiChuCS" value="${esc(g('ghiChuCS'))}" placeholder="Ví dụ: in 2 máy, ưu tiên áo thun trước"></div>
    ${w.length ? `<div class="s6 warn">${w.join(' ')}</div>` : ''}
    <div class="s6 actions"><button class="btn" type="submit" id="nSave">${e ? 'Lưu thay đổi' : allowDup ? 'Vẫn tạo đơn trùng tên' : 'Lưu đơn'}</button>${e ? '<button class="btn ghost" type="button" id="nCancel">Hủy sửa</button>' : '<button class="btn ghost" type="button" id="nClear">Xóa form</button>'}</div>
  </form>
  <div class="sec"><h3>Đơn nhập gần đây${L['CS'].indexOf(ME)>=0 ? ' của '+esc(ME) : ''}</h3>
  ${mine.length ? `<div class="tbox"><table><thead><tr><th>Mã</th><th>Tên đơn</th><th>Ưu tiên</th><th>Xong in ép</th><th>Khách nhận</th><th>Tiến độ</th><th></th></tr></thead><tbody>
  ${mine.map(o=>`<tr><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}</td><td>${pTag(o.uuTien)}</td><td class="num">${dm(o.ngayInEp)}</td><td class="num">${dm(o.ngayKhach)}</td><td>${oChip(o)}</td><td><div class="actions"><button class="btn ghost sm" type="button" data-edit="${esc(o.ma)}">Sửa</button></div></td></tr>`).join('')}
  </tbody></table></div>` : '<div class="empty">Chưa có đơn nào trong 3 ngày qua.</div>'}</div>`;
}
function addDays(s, n){ const t = new Date((dayNum(s)+n)*864e5); return t.toISOString().slice(0,10); }

/* ---------- 2. Tiến độ ---------- */
function vTienDo(){
  const L = D.lists;
  let list = D.orders.slice();
  if (F.td === 'chua') list = list.filter(o => o.tienDo !== 'Đã ép');
  else if (F.td !== 'all') list = list.filter(o => (o.tienDo||'Chờ in') === F.td);
  if (F.cs) list = list.filter(o => o.cs === F.cs);
  if (F.th) list = list.filter(o => o.th === F.th);
  if (F.q) { const q = F.q.toUpperCase(); list = list.filter(o => (o.ma+' '+o.ten).toUpperCase().indexOf(q) >= 0); }
  list.sort((a,b) => (a.ngayInEp||'9').localeCompare(b.ngayInEp||'9') || pLevel(a.uuTien)-pLevel(b.uuTien));
  const open = D.orders.filter(o => o.tienDo !== 'Đã ép');
  const k = {
    m1: open.filter(o=>pLevel(o.uuTien)===1).length, m2: open.filter(o=>pLevel(o.uuTien)===2).length, m3: open.filter(o=>pLevel(o.uuTien)===3).length,
    late: open.filter(o=>diff(o.ngayInEp,D.today)<0).length, noP: open.filter(o=>!o.nguoiIn).length,
    stuck: open.filter(o=>(stuckDays(o)||0)>3).length };
  return `
  <div class="vhead"><h2>Tiến độ in ép</h2><p class="lede">Sắp theo ngày cần xong in ép. Màu báo số ngày còn lại: trễ hạn đỏ, còn 0–2 ngày cam, còn 3–7 ngày vàng. "Đứng yên" là số ngày từ lần cập nhật tiến độ gần nhất.</p></div>
  <div class="kpis">
    <div class="kpi"><small>Mức 1 chưa xong</small><b>${k.m1}</b></div>
    <div class="kpi"><small>Mức 2 chưa xong</small><b>${k.m2}</b></div>
    <div class="kpi"><small>Mức 3 chưa xong</small><b>${k.m3}</b></div>
    <div class="kpi${k.late?' alert':''}"><small>Trễ hạn in ép</small><b>${k.late}</b></div>
    <div class="kpi${k.stuck?' alert':''}"><small>Đứng yên &gt; 3 ngày</small><b>${k.stuck}</b></div>
    <div class="kpi"><small>Chưa có người in</small><b>${k.noP}</b></div>
  </div>
  <div class="bar">
    <div class="grow"><input type="search" id="fq" placeholder="Tìm mã hoặc tên đơn" value="${esc(F.q)}" aria-label="Tìm đơn"></div>
    <select id="fcs" aria-label="CS">${opts(L['CS'], F.cs, 'Mọi CS')}</select>
    <select id="fth" aria-label="Thương hiệu">${opts(L['THƯƠNG HIỆU'], F.th, 'Mọi thương hiệu')}</select>
    <select id="ftd" aria-label="Tiến độ"><option value="chua"${F.td==='chua'?' selected':''}>Chưa ép xong</option>${L['TIẾN ĐỘ IN'].map(t=>`<option${F.td===t?' selected':''}>${esc(t)}</option>`).join('')}<option value="all"${F.td==='all'?' selected':''}>Tất cả</option></select>
  </div>
  ${list.length ? `<div class="tbox"><table><thead><tr><th>Mã</th><th>Tên đơn</th><th>TH</th><th>CS</th><th>Ưu tiên</th><th>Xong in ép</th><th>Còn lại</th><th>Tiến độ</th><th>Người in</th><th>Đứng yên</th><th>Khách nhận</th></tr></thead><tbody>
  ${list.map(o=>{const s=stuckDays(o);return `<tr><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}${o.ghiChuIn?`<div class="hint">BP In: ${esc(o.ghiChuIn)}</div>`:''}</td><td>${esc(o.th)}</td><td>${esc(o.cs)}</td><td>${pTag(o.uuTien)}</td><td class="num">${dm(o.ngayInEp)}</td><td>${remTag(o)}</td><td>${oChip(o)}</td><td>${o.nguoiIn?esc(o.nguoiIn):'<span class="hint">chưa phân</span>'}</td><td class="num${o.tienDo!=='Đã ép'&&s>3?' stuck':''}">${o.tienDo==='Đã ép'||s===null?'—':s+' ngày'}</td><td class="num">${dm(o.ngayKhach)}</td></tr>`}).join('')}
  </tbody></table></div>` : '<div class="empty">Không có đơn nào khớp bộ lọc.</div>'}`;
}

/* ---------- 3. BP In ---------- */
function vBpIn(){
  const L = D.lists, IN3 = L['TIẾN ĐỘ IN'].filter(t => t !== 'Đã ép');
  const match = o => !F.bpq || (o.ma+' '+o.ten).toUpperCase().indexOf(F.bpq.toUpperCase()) >= 0;
  const todo = D.orders.filter(o => ((o.tienDo !== 'Đã in' && o.tienDo !== 'Đã ép') || EDIT_IN[o.ma]) && match(o))
    .sort((a,b) => (EDIT_IN[b.ma]?1:0)-(EDIT_IN[a.ma]?1:0) || pLevel(a.uuTien)-pLevel(b.uuTien) || (a.ngayInEp||'9').localeCompare(b.ngayInEp||'9'));
  const doneG = rollGroups(D.orders.filter(o => o.tienDo === 'Đã in' && !o.chuyenEp && !EDIT_IN[o.ma] && match(o)));
  const card = o => {
    const v = k => val(o,'in',k), id = k => k + '_' + esc(o.ma);
    return `<div class="card p-${pLevel(o.uuTien)}${isDirty(o.ma,'in')?' dirty':''}" data-ma="${esc(o.ma)}" data-sec="in">
      <div class="ch"><div><div class="mono">${esc(o.ma)} · ${esc(o.th)}</div><div class="t">${esc(o.ten)}</div></div>${remTag(o)}</div>
      <div class="meta"><span>${pTag(o.uuTien)}</span><span>Xong in ép <b>${dm(o.ngayInEp)}</b></span><span>Khách nhận <b>${dm(o.ngayKhach)}</b></span><span>CS <b>${esc(o.cs)}</b></span></div>
      ${o.ghiChuCS?`<div class="cmp">CS ghi: ${esc(o.ghiChuCS)}</div>`:''}
      <div class="seg" role="group" aria-label="Tiến độ">${IN3.map(t=>`<button type="button" aria-pressed="${(v('tienDo')||'Chờ in')===t}" data-set="tienDo" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="blk"><div class="blk-h">Phân công</div>
      <div class="g4">
        <div class="f"><span class="lb">Máy in</span><div class="seg seg-full" role="group" aria-label="Máy in">${(L['MÁY IN']||[]).map(m=>`<button type="button" aria-pressed="${v('mayIn')===m}" data-set="mayIn" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div></div>
        <div class="f"><label for="${id('ni')}">Người in</label><select id="${id('ni')}" data-k="nguoiIn">${opts(L['NGƯỜI IN'], v('nguoiIn'), '— chọn —')}</select></div>
        <div class="f"><label for="${id('cu')}">Cuộn</label><select id="${id('cu')}" data-k="cuon">${opts(L['CUỘN'] || [], v('cuon'), '— chọn —')}</select></div>
        <div class="f"><label for="${id('di')}">Ngày đã in</label><input type="date" id="${id('di')}" data-k="ngayDaIn" value="${esc(v('ngayDaIn')||'')}"></div>
      </div></div>
      <div class="blk"><div class="blk-h">Số lượng &amp; vải</div>
      <div class="qv">
        <span class="qv-l">Thân</span>
        <div class="f"><label for="${id('sa')}">SL áo</label><input type="number" min="0" inputmode="numeric" id="${id('sa')}" data-k="slAoIn" value="${esc(v('slAoIn'))}"></div>
        <div class="f"><label for="${id('sq')}">SL quần</label><input type="number" min="0" inputmode="numeric" id="${id('sq')}" data-k="slQuanIn" value="${esc(v('slQuanIn'))}"></div>
        <div class="f"><label for="${id('va')}">Vải chính</label><select id="${id('va')}" data-k="vai">${opts(L['LOẠI VẢI'] || [], v('vai'), '—')}</select></div>
        <span class="qv-l">Bo</span>
        <div class="f"><label for="${id('bo')}">SL bo</label><input type="number" min="0" inputmode="numeric" id="${id('bo')}" data-k="slBo" value="${esc(v('slBo'))}"></div>
        <span></span>
        <div class="f"><label for="${id('vb')}">Vải bo</label><select id="${id('vb')}" data-k="vaiBo">${opts(L['LOẠI VẢI'] || [], v('vaiBo'), '—')}</select></div>
        <span class="qv-l">Phối</span>
        <div class="f"><label for="${id('ph')}">SL phối</label><input type="number" min="0" inputmode="numeric" id="${id('ph')}" data-k="slPhoi" value="${esc(v('slPhoi'))}"></div>
        <span></span>
        <div class="f"><label for="${id('vp')}">Vải phối</label><select id="${id('vp')}" data-k="vaiPhoi">${opts(L['LOẠI VẢI'] || [], v('vaiPhoi'), '—')}</select></div>
      </div></div>
      <div class="f"><label for="${id('gi')}">Ghi chú</label><input type="text" id="${id('gi')}" data-k="ghiChuIn" value="${esc(v('ghiChuIn'))}" placeholder="Ví dụ: thiếu áo polo, chờ vải"></div>
      <div class="actions"><button class="btn" type="button" data-save${isDirty(o.ma,'in')?'':' disabled'}>Lưu</button>${EDIT_IN[o.ma]?`<button class="btn ghost" type="button" data-unedit="${esc(o.ma)}">Hủy sửa</button>`:''}${o.inCapNhat?`<span class="hint">Cập nhật ${esc(dm(o.inCapNhat))} ${esc(o.inCapNhat.slice(11))}</span>`:''}</div>
    </div>`;
  };
  const grp = g => `<div class="grp" data-grp="${esc(g.key)}">
    <div class="grp-h"><div><b>Cuộn ${esc(g.cuon||'—')}</b> · ${esc(g.nguoi||'—')} · in ${dm(g.ngay)} · ${g.items.length} đơn · ${sumOf(g.items,'slAoIn')} áo · ${sumOf(g.items,'slQuanIn')} quần</div>
      <button class="btn sm" type="button" data-epall="${esc(g.key)}">Confirm chuyển ép cả cuộn</button></div>
    <div class="tbox" style="border:0;border-radius:0"><table><thead><tr><th>STT</th><th>Đổi vị trí</th><th>Mã</th><th>Tên đơn</th><th>Áo</th><th>Quần</th><th>Máy</th><th>Vải</th><th>Bo</th><th>Vải bo</th><th>Phối</th><th>Vải phối</th><th>Chuyển ép</th><th></th></tr></thead><tbody>
    ${g.items.map((o,i)=>`<tr><td class="num"><b>${i+1}</b></td>
      <td><div class="actions" style="flex-wrap:nowrap"><button class="btn ghost sm" type="button" aria-label="Lên" data-mv="-1" data-ma="${esc(o.ma)}"${i===0?' disabled':''}>▲</button><button class="btn ghost sm" type="button" aria-label="Xuống" data-mv="1" data-ma="${esc(o.ma)}"${i===g.items.length-1?' disabled':''}>▼</button></div></td>
      <td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}${o.ghiChuIn?`<div class="hint">${esc(o.ghiChuIn)}</div>`:''}</td>
      <td class="num">${nz(o.slAoIn)}</td><td class="num">${nz(o.slQuanIn)}</td><td>${esc(o.mayIn||'—')}</td><td>${esc(o.vai||'—')}</td><td class="num">${nz(o.slBo)}</td><td>${esc(o.vaiBo||'—')}</td><td class="num">${nz(o.slPhoi)}</td><td>${esc(o.vaiPhoi||'—')}</td>
      <td><label class="chk"><input type="checkbox" data-ep1="${esc(o.ma)}"> Confirm</label></td>
      <td><button class="btn ghost sm" type="button" data-reedit="${esc(o.ma)}">Sửa</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
  return `
  <div class="vhead"><h2>BP In cập nhật tiến độ</h2><p class="lede">Tìm theo mã hoặc tên đơn. Khi in xong, chọn <b>Đã in</b>, ghi máy in, người in, cuộn, số lượng và vải từng phần (thân, bo, phối) rồi bấm Lưu. Đơn sẽ xuống danh sách đã in bên dưới và về danh sách của CS. Sắp lại thứ tự trong cuộn, rồi tick <b>Confirm</b> để chuyển sang BP Ép.</p></div>
  <div class="bar"><div class="grow"><input type="search" id="bpq" placeholder="Nhập mã (ví dụ H2610-237) hoặc tên đơn" value="${esc(F.bpq)}" aria-label="Tìm đơn"></div></div>
  <div class="sec"><h3>Cần in <span class="badge">${todo.length}</span></h3>${todo.length ? `<div class="cards">${todo.map(card).join('')}</div>` : '<div class="empty">Không còn đơn nào cần in. Đơn mới CS nhập sẽ hiện ở đây.</div>'}</div>
  <div class="sec"><h3>Đã in, chờ chuyển ép <span class="badge${doneG.length?' hot':''}">${doneG.reduce((s,g)=>s+g.items.length,0)}</span></h3>
  <p class="hint" style="margin:0">Nhóm theo ngày in, người in và cuộn. Bấm ▲ ▼ để xếp đúng thứ tự trên cuộn.</p>
  ${doneG.length ? doneG.map(grp).join('') : '<div class="empty">Chưa có đơn nào đã in đang chờ chuyển ép.</div>'}</div>`;
}

/* ---------- 3b. BP Ép ---------- */
function vBpEp(){
  const L = D.lists;
  const match = o => !F.bpq || (o.ma+' '+o.ten).toUpperCase().indexOf(F.bpq.toUpperCase()) >= 0;
  const waitG = rollGroups(D.orders.filter(o => o.tienDo === 'Đã in' && o.chuyenEp && match(o)));
  // Chỉ giữ đơn ép hôm nay để hoàn tác khi bấm nhầm; đơn ép từ hôm qua trở về trước không hiện nữa
  const recent = D.orders.filter(o => o.tienDo === 'Đã ép' && o.ngayDaEp === D.today && match(o));
  const days = Array.from(new Set(waitG.map(g => g.ngay))).sort();
  const wd = s => s ? ['CN','T2','T3','T4','T5','T6','T7'][new Date(dayNum(s)*864e5).getUTCDay()] : '';
  const ef = k => EPF[k] || (EPF[k] = {epLe:'CUỘN', ngay:D.today});
  const grp = g => { const e = ef(g.key); return `<div class="grp">
    <div class="grp-h"><div><b>Cuộn ${esc(g.cuon||'—')}</b> · ${esc(g.nguoi||'—')}${g.items[0].mayIn?' · '+esc(g.items[0].mayIn):''} · ${g.items.length} đơn · ${sumOf(g.items,'slAoIn')} áo · ${sumOf(g.items,'slQuanIn')} quần</div>
      <div class="actions"><select data-epf="epLe" data-key="${esc(g.key)}" aria-label="Ép lẻ hay cuộn" style="width:auto">${opts(L['ÉP LẺ/CUỘN'], e.epLe)}</select>
      <input type="date" data-epf="ngay" data-key="${esc(g.key)}" value="${esc(e.ngay)}" aria-label="Ngày ép" style="width:auto">
      <button class="btn sm" type="button" data-epdoneall="${esc(g.key)}">Đã ép cả cuộn</button></div></div>
    <div class="tbox" style="border:0;border-radius:0"><table><thead><tr><th>STT</th><th>Mã</th><th>Tên đơn</th><th>Áo</th><th>Quần</th><th>Vải</th><th>Bo</th><th>Phối</th><th>Hạn</th><th></th></tr></thead><tbody>
    ${g.items.map((o,i)=>`<tr><td class="num"><b>${i+1}</b></td><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}</td><td class="num">${nz(o.slAoIn)}</td><td class="num">${nz(o.slQuanIn)}</td><td>${esc(o.vai||'—')}</td><td class="num">${nz(o.slBo)}${o.vaiBo?`<div class="hint">${esc(o.vaiBo)}</div>`:''}</td><td class="num">${nz(o.slPhoi)}${o.vaiPhoi?`<div class="hint">${esc(o.vaiPhoi)}</div>`:''}</td><td>${remTag(o)}</td>
      <td><div class="actions" style="flex-wrap:nowrap"><button class="btn sm" type="button" data-epdone="${esc(o.ma)}" data-key="${esc(g.key)}">Đã ép</button><button class="btn ghost sm" type="button" data-epback="${esc(o.ma)}">Trả về BP In</button></div></td></tr>`).join('')}
    </tbody></table></div></div>`; };
  return `
  <div class="vhead"><h2>BP Ép</h2><p class="lede">Đơn BP In đã confirm chuyển ép, xếp theo <b>ngày in</b> (cũ nhất ở trên), trong mỗi ngày theo cuộn và đúng thứ tự trên cuộn. Ép xong bấm <b>Đã ép</b>, hoặc <b>Đã ép cả cuộn</b>. Đơn đã ép chuyển sang Kế hoạch may và rời khỏi màn hình này.</p></div>
  <div class="bar"><div class="grow"><input type="search" id="bpq" placeholder="Nhập mã hoặc tên đơn" value="${esc(F.bpq)}" aria-label="Tìm đơn"></div></div>
  <div class="sec"><h3>Chờ ép <span class="badge${waitG.length?' hot':''}">${waitG.reduce((s,g)=>s+g.items.length,0)}</span></h3></div>
  ${waitG.length ? days.map(d => { const gs = waitG.filter(g => g.ngay === d), n = gs.reduce((s,g)=>s+g.items.length,0), late = diff(D.today, d);
    return `<div class="sec day"><div class="day-h"><b>In ${wd(d)} ${dmy(d)}</b><span class="hint">${gs.length} cuộn · ${n} đơn · ${gs.reduce((s,g)=>s+sumOf(g.items,'slAoIn'),0)} áo · ${gs.reduce((s,g)=>s+sumOf(g.items,'slQuanIn'),0)} quần</span>${late>=2?`<span class="rem r-or">chờ ${late} ngày</span>`:''}</div>${gs.map(grp).join('')}</div>`; }).join('') : '<div class="empty">Không có đơn nào chờ ép.</div>'}
  ${recent.length ? `<details class="sec"><summary>Đã ép hôm nay (${recent.length}) · bấm Hoàn tác nếu bấm nhầm</summary>
  <div class="tbox" style="margin-top:8px"><table><thead><tr><th>Cuộn</th><th>Mã</th><th>Tên đơn</th><th>Ép</th><th>Áo</th><th>Quần</th><th></th></tr></thead><tbody>
  ${recent.map(o=>`<tr><td>${esc(o.cuon||'—')}</td><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}</td><td>${esc(o.epLe||'')}</td><td class="num">${nz(o.slAoIn)}</td><td class="num">${nz(o.slQuanIn)}</td><td>${o.xuong?'<span class="hint">đã xếp xưởng</span>':`<button class="btn ghost sm" type="button" data-epundo="${esc(o.ma)}">Hoàn tác</button>`}</td></tr>`).join('')}
  </tbody></table></div></details>` : ''}`;
}

/* ---------- 4. Của tôi (CS) ---------- */
// Loại áo / quần do CS chọn: lưu dạng JSON {"ao":[["ÁO BO",4]],"quan":[["QUẦN LƯNG THƯỜNG",9]]} ở cột LOẠI ÁO QUẦN.
// SL áo, SL quần và CHI TIẾT MAY được tính lại từ đây nên CS không phải gõ tay.
const LOAI_LIST = {ao:'LOẠI ÁO', quan:'LOẠI QUẦN'};
function parseLoai(s){ try { const j = JSON.parse(s || '{}'); return {ao: j.ao || [], quan: j.quan || []}; } catch (e) { return {ao:[], quan:[]}; } }
function loaiText(l){
  const part = a => a.filter(r => r[0] && +r[1] > 0).map(r => r[1] + ' ' + r[0].toLowerCase()).join(' + ');
  return [part(l.ao), part(l.quan)].filter(Boolean).join(' · ');
}
function loaiBlock(o, kind, v){
  const l = parseLoai(v('loai')), rows = l[kind].length ? l[kind] : [['','']];
  const list = D.lists[LOAI_LIST[kind]] || [], name = kind === 'ao' ? 'áo' : 'quần';
  const tot = rows.reduce((s,r)=>s+(+r[1]||0),0), inN = kind === 'ao' ? o.slAoIn : o.slQuanIn;
  return `<div class="lt" data-kind="${kind}">
    <div class="lt-h"><span class="lb">Loại ${name}</span><span class="lb">SL</span></div>
    ${rows.map((r,i)=>`<div class="lt-r" data-i="${i}"><select data-lt="t" aria-label="Loại ${name} dòng ${i+1}">${opts(list.indexOf(r[0])>=0||!r[0]?list:list.concat([r[0]]), r[0], '— chọn loại '+name+' —')}</select><input type="number" min="0" inputmode="numeric" data-lt="n" value="${esc(r[1])}" aria-label="SL ${name} dòng ${i+1}"><button type="button" class="btn ghost sm" data-lt="x" aria-label="Xóa dòng"${rows.length===1&&!r[0]&&!r[1]?' disabled':''}>✕</button></div>`).join('')}
    <div class="lt-f"><button type="button" class="btn ghost sm" data-lt="add">+ Thêm loại ${name}</button><span>Tổng ${name}: <b class="lt-tot">${tot}</b>${inN!==''?` <span class="hint">(BP In: ${inN})</span>`:''}</span></div>
  </div>`;
}
function vCuaToi(){
  const L = D.lists, cs = F.myCs;
  const mine = D.orders.filter(o => o.cs === cs);
  const todo = mine.filter(o => reached(o) && !o.confirm).sort((a,b)=>(a.ngayKhach||'9').localeCompare(b.ngayKhach||'9'));
  const done = mine.filter(o => reached(o) && o.confirm && !o.xuong);
  const waiting = mine.filter(o => !reached(o)).sort((a,b)=>(a.ngayInEp||'9').localeCompare(b.ngayInEp||'9'));
  const card = o => {
    const v = k => val(o,'cs',k);
    const inTxt = (o.slAoIn!==''||o.slQuanIn!=='') ? `BP In đã in: <b>${o.slAoIn===''?'—':o.slAoIn} áo · ${o.slQuanIn===''?'—':o.slQuanIn} quần</b>` : 'BP In chưa ghi số lượng in';
    const df = (v('slAo')!=='' && o.slAoIn!=='' && Number(v('slAo'))!==Number(o.slAoIn)) || (v('slQuan')!=='' && o.slQuanIn!=='' && Number(v('slQuan'))!==Number(o.slQuanIn));
    return `<div class="card p-${pLevel(o.uuTien)}${isDirty(o.ma,'cs')?' dirty':''}" data-ma="${esc(o.ma)}" data-sec="cs">
      <div class="ch"><div><div class="mono">${esc(o.ma)} · ${esc(o.th)}</div><div class="t">${esc(o.ten)}</div></div>${oChip(o)}</div>
      <div class="meta"><span>Khách nhận <b>${dm(o.ngayKhach)}</b></span><span>Người in <b>${esc(o.nguoiIn||'—')}</b></span>${o.xuong?`<span>Xưởng <b>${esc(o.xuong)}</b></span>`:''}</div>
      <div class="cmp${df?' diff':''}">${inTxt}${df?' · số CS nhập đang khác số BP In':''}</div>
      ${loaiBlock(o, 'ao', v)}
      ${loaiBlock(o, 'quan', v)}
      <div class="f"><label for="cg_${esc(o.ma)}">Ghi chú thêm cho xưởng may</label><input type="text" id="cg_${esc(o.ma)}" data-k="ctGhiChu" value="${esc(v('ctGhiChu'))}" placeholder="Ví dụ: in tên sau lưng, cổ tim"></div>
      <div class="actions"><label class="chk"><input type="checkbox" data-k="confirm"${v('confirm')?' checked':''}> CONFIRM, chuyển cho kế hoạch may</label><button class="btn" type="button" data-save${isDirty(o.ma,'cs')?'':' disabled'}>Lưu</button></div>
    </div>`;
  };
  return `
  <div class="vhead"><h2>Danh sách của CS</h2><p class="lede">Đơn tự về đây khi BP In chuyển sang "${esc(D.pushAt)}". Chọn từng loại áo, loại quần và số lượng (web tự cộng tổng), rồi tick CONFIRM. Đơn đã CONFIRM chuyển sang màn hình Kế hoạch may.</p></div>
  ${has('QUẢN LÝ') || L['CS'].indexOf(ME) < 0 ? `<div class="bar"><span class="lb" style="font-weight:700">CS:</span><div class="seg" role="group" aria-label="Chọn CS">${L['CS'].map(c=>`<button type="button" aria-pressed="${c===cs}" data-mycs="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : ''}
  <div class="sec"><h3>Cần nhập số lượng <span class="badge${todo.length?' hot':''}">${todo.length}</span></h3>${todo.length?`<div class="cards">${todo.map(card).join('')}</div>`:'<div class="empty">Chưa có đơn nào in xong đang chờ bạn nhập số lượng.</div>'}</div>
  <div class="sec"><h3>Đã CONFIRM, chờ xếp xưởng <span class="badge">${done.length}</span></h3>${done.length?`<div class="cards">${done.map(card).join('')}</div>`:'<div class="empty">Không có.</div>'}</div>
  <details class="sec"><summary>Đơn đang ở BP In (${waiting.length})</summary>
  ${waiting.length?`<div class="tbox" style="margin-top:8px"><table><thead><tr><th>Mã</th><th>Tên đơn</th><th>Tiến độ</th><th>Xong in ép</th><th>Còn lại</th></tr></thead><tbody>${waiting.map(o=>`<tr><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}</td><td>${oChip(o)}</td><td class="num">${dm(o.ngayInEp)}</td><td>${remTag(o)}</td></tr>`).join('')}</tbody></table></div>`:''}
  </details>`;
}

/* ---------- Đơn hoàn thành: đã gửi xưởng may, chia theo tháng ---------- */
const doneAt = o => o.ngayGuiMay || (o.mayCapNhat || '').slice(0,10);
function vXong(){
  const L = D.lists;
  let list = D.orders.filter(o => isDone(o) && doneAt(o));
  if (F.htCs) list = list.filter(o => o.cs === F.htCs);
  if (F.htX) list = list.filter(o => o.xuong === F.htX);
  if (F.htQ) { const q = F.htQ.toUpperCase(); list = list.filter(o => (o.ma+' '+o.ten).toUpperCase().indexOf(q) >= 0); }
  list.sort((a,b) => doneAt(b).localeCompare(doneAt(a)) || b.ma.localeCompare(a.ma));
  const months = Array.from(new Set(list.map(o => doneAt(o).slice(0,7))));
  const curM = D.today.slice(0,7);
  const onTime = o => !o.ngayKhach || !o.ngayTraMay || o.ngayTraMay <= o.ngayKhach;
  const mLabel = m => 'Tháng ' + m.slice(5,7) + '/' + m.slice(0,4);
  const block = m => {
    const g = list.filter(o => doneAt(o).slice(0,7) === m);
    const ao = g.reduce((s,o)=>s+mAo(o),0), qu = g.reduce((s,o)=>s+mQuan(o),0), late = g.filter(o=>!onTime(o)).length;
    const open = m in F.htOpen ? F.htOpen[m] : (m === curM || m === months[0]);
    return `<details class="grp month" data-month="${m}"${open?' open':''}>
      <summary class="grp-h"><div><b>${mLabel(m)}</b> · ${g.length} đơn · ${ao.toLocaleString('vi-VN')} áo · ${qu.toLocaleString('vi-VN')} quần${late?` · <span class="stuck">${late} đơn xưởng trả sau ngày khách nhận</span>`:''}</div></summary>
      <div class="tbox" style="border:0;border-radius:0"><table><thead><tr><th>Hoàn thành</th><th>Mã</th><th>Tên đơn</th><th>CS</th><th>Áo</th><th>Loại áo</th><th>Quần</th><th>Loại quần</th><th>Xưởng</th><th>In</th><th>Ép</th><th>Khách nhận</th><th>Xưởng trả</th></tr></thead><tbody>
      ${g.map(o=>`<tr><td class="num"><b>${dm(doneAt(o))}</b></td><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}</td><td>${esc(o.cs)}</td><td class="num">${mAo(o)}</td><td class="wrap">${esc(loaiOf(o,'ao')||'—')}</td><td class="num">${mQuan(o)}</td><td class="wrap">${esc(loaiOf(o,'quan')||'—')}</td><td>${esc(o.xuong)}</td><td class="num">${dm(o.ngayDaIn)}</td><td class="num">${dm(o.ngayDaEp)}</td><td class="num">${dm(o.ngayKhach)}</td><td class="num${onTime(o)?'':' stuck'}">${dm(o.ngayTraMay)}</td></tr>`).join('')}
      </tbody></table></div></details>`;
  };
  return `
  <div class="vhead"><h2>Đơn hoàn thành</h2><p class="lede">Đơn đã <b>xuất ảnh gửi xưởng</b> được tính là hoàn thành, theo <b>ngày gửi may</b>. Đơn hoàn thành không còn hiện ở các màn hình làm việc. Mới nhất ở trên, chia theo tháng. Bấm tên tháng để mở hoặc thu gọn, bấm mã đơn để xem lịch sử.</p></div>
  <div class="bar"><div class="grow"><input type="search" id="htq" placeholder="Tìm mã hoặc tên đơn" value="${esc(F.htQ)}" aria-label="Tìm đơn"></div>
    <select id="htcs" aria-label="CS">${opts(L['CS'], F.htCs, 'Mọi CS')}</select>
    <select id="htx" aria-label="Xưởng">${opts(L['XƯỞNG MAY'], F.htX, 'Mọi xưởng')}</select></div>
  ${months.length ? months.map(block).join('') : '<div class="empty">Chưa có đơn nào hoàn thành khớp bộ lọc.</div>'}`;
}

/* ---------- 5. Kế hoạch may ---------- */
// Loại áo / loại quần của 1 đơn, dạng "20 áo bo + 7 jacket"
const loaiOf = (o, kind) => parseLoai(o.loai)[kind].filter(r => r[0] && +r[1] > 0).map(r => r[1] + ' ' + r[0].toLowerCase()).join(' + ');
// Đơn đã xuất ảnh gửi xưởng = hoàn thành, không hiện ở Kế hoạch may nữa
const isDone = o => !!(o.xuong && o.xuatAnhLuc);
function vMay(){
  const L = D.lists;
  let wait = D.orders.filter(o => o.tienDo === 'Đã ép' && !o.xuong);
  let planned = D.orders.filter(o => o.xuong && !o.xuatAnhLuc);
  if (F.mayQ) { const q = F.mayQ.toUpperCase(); const m = o => (o.ma+' '+o.ten).toUpperCase().indexOf(q) >= 0; wait = wait.filter(m); planned = planned.filter(m); }
  wait.sort((a,b)=>(a.ngayKhach||'9').localeCompare(b.ngayKhach||'9'));
  const lastSent = D.orders.filter(o => o.xuatAnhLuc && diff(D.today, o.xuatAnhLuc.slice(0,10)) <= 0);
  const card = o => {
    const v = k => val(o,'may',k), la = loaiOf(o,'ao'), lq = loaiOf(o,'quan');
    return `<div class="card p-${pLevel(o.uuTien)}${isDirty(o.ma,'may')?' dirty':''}" data-ma="${esc(o.ma)}" data-sec="may">
      <div class="ch"><div><div class="mono">${esc(o.ma)} · ${esc(o.th)} · CS ${esc(o.cs)}</div><div class="t">${esc(o.ten)}</div></div></div>
      <div class="plan">
        <div class="plan-d"><small>Khách nhận</small><b>${dm(o.ngayKhach)}</b>${khTag(o)}</div>
        <div class="plan-q"><small>Áo</small><b>${mAo(o)||'—'}</b>${la?`<span class="plan-l">${esc(la)}</span>`:''}</div>
        <div class="plan-q"><small>Quần</small><b>${mQuan(o)||'—'}</b>${lq?`<span class="plan-l">${esc(lq)}</span>`:''}</div>
      </div>
      ${!o.confirm || o.ctGhiChu || (!la && !lq) ? `<div class="cmp${o.confirm?'':' diff'}">${!la&&!lq?'Chưa có loại áo quần':''}${o.ctGhiChu?(!la&&!lq?' · ':'')+esc(o.ctGhiChu):''}${o.confirm?'':' · CS chưa xác nhận, tạm theo số BP In'}</div>` : ''}
      <div class="seg" role="group" aria-label="Xưởng may">${L['XƯỞNG MAY'].map(x=>`<button type="button" aria-pressed="${v('xuong')===x}" data-set="xuong" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <div class="g2">
        <div class="f"><label for="mg_${esc(o.ma)}">Ngày gửi may</label><input type="date" id="mg_${esc(o.ma)}" data-k="ngayGuiMay" value="${esc(v('ngayGuiMay')||'')}"></div>
        <div class="f"><label for="mt_${esc(o.ma)}">Ngày xưởng trả</label><input type="date" id="mt_${esc(o.ma)}" data-k="ngayTraMay" value="${esc(v('ngayTraMay')||'')}"></div>
      </div>
      <div class="f"><label for="mn_${esc(o.ma)}">Ghi chú cho xưởng</label><input type="text" id="mn_${esc(o.ma)}" data-k="ghiChuMay" value="${esc(v('ghiChuMay'))}"></div>
      <div class="actions"><button class="btn" type="button" data-save${isDirty(o.ma,'may')?'':' disabled'}>Lưu</button></div>
    </div>`;
  };
  const xuongBlock = x => {
    const all = planned.filter(o => o.xuong === x);
    const dates = Array.from(new Set(all.map(o => o.ngayGuiMay || ''))).sort().reverse();
    const ao = all.reduce((s,o)=>s+mAo(o),0), qu = all.reduce((s,o)=>s+mQuan(o),0);
    return `<section class="xw">
      <div class="xw-h"><h3>Xưởng ${esc(x)}</h3><span class="hint">${all.length} đơn · ${ao} áo · ${qu} quần chờ gửi</span></div>
      ${dates.length ? dates.map(ng => { const g = all.filter(o => (o.ngayGuiMay||'') === ng).sort((a,b)=>(a.ngayKhach||'9').localeCompare(b.ngayKhach||'9')); const k = x+'|'+ng;
        return `<div class="grp"><div class="grp-h"><div><b>Gửi ${ng?dmy(ng):'(chưa có ngày)'}</b> · ${g.length} đơn · ${g.reduce((s,o)=>s+mAo(o),0)} áo · ${g.reduce((s,o)=>s+mQuan(o),0)} quần</div><button class="btn sm" type="button" data-png="${esc(k)}">Xuất ảnh PNG gửi xưởng</button></div>
        <div class="tbox" style="border:0;border-radius:0"><table><thead><tr><th>Mã</th><th>Tên đơn</th><th>Áo</th><th>Loại áo</th><th>Quần</th><th>Loại quần</th><th>Khách nhận</th><th>Xưởng trả</th><th></th></tr></thead><tbody>
        ${g.map(o=>`<tr><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}${o.ghiChuMay||o.ctGhiChu?`<div class="hint">${esc([o.ctGhiChu,o.ghiChuMay].filter(Boolean).join(' · '))}</div>`:''}</td><td class="num"><b>${mAo(o)}</b></td><td class="wrap">${esc(loaiOf(o,'ao')||'—')}</td><td class="num"><b>${mQuan(o)}</b></td><td class="wrap">${esc(loaiOf(o,'quan')||'—')}</td><td class="num">${dm(o.ngayKhach)}</td><td class="num">${dm(o.ngayTraMay)}</td><td><button class="btn ghost sm" type="button" data-unplan="${esc(o.ma)}">Sửa</button></td></tr>`).join('')}
        </tbody></table></div></div>`; }).join('') : '<div class="empty">Chưa có đơn nào chờ gửi xưởng này.</div>'}
    </section>`;
  };
  return `
  <div class="vhead"><h2>Kế hoạch may</h2><p class="lede">Đơn đã ép, xếp theo <b>ngày khách nhận</b> gần nhất trước. Chọn xưởng, ngày gửi, ngày xưởng trả rồi Lưu. Đơn đã xếp nằm ở khối của từng xưởng, chia theo ngày gửi. Bấm <b>Xuất ảnh PNG gửi xưởng</b> để lấy ảnh gửi qua Zalo; xuất xong danh sách đó được ẩn và chuyển sang Đơn hoàn thành.</p></div>
  <div class="bar"><div class="grow"><input type="search" id="mq" placeholder="Tìm mã hoặc tên đơn" value="${esc(F.mayQ)}" aria-label="Tìm đơn"></div></div>
  <div class="sec"><h3>Chờ xếp xưởng <span class="badge${wait.length?' hot':''}">${wait.length}</span></h3>${wait.length?`<div class="cards">${wait.map(card).join('')}</div>`:'<div class="empty">Không có đơn nào chờ xếp xưởng.</div>'}</div>
  <div class="xws">${L['XƯỞNG MAY'].map(xuongBlock).join('')}</div>
  ${lastSent.length ? `<details class="sec"><summary>Đã xuất ảnh hôm nay (${lastSent.length} đơn) · bấm Hiện lại nếu cần xuất lại</summary>
    <div class="tbox" style="margin-top:8px"><table><thead><tr><th>Xưởng</th><th>Gửi</th><th>Mã</th><th>Tên đơn</th><th>Áo</th><th>Quần</th><th></th></tr></thead><tbody>
    ${lastSent.map(o=>`<tr><td>${esc(o.xuong)}</td><td class="num">${dm(o.ngayGuiMay)}</td><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}</td><td class="num">${mAo(o)}</td><td class="num">${mQuan(o)}</td><td><button class="btn ghost sm" type="button" data-unsent="${esc(o.ma)}">Hiện lại</button></td></tr>`).join('')}
    </tbody></table></div></details>` : ''}`;
}

/* ---------- Xuất ảnh PNG kế hoạch gửi xưởng (vẽ bằng canvas, không cần thư viện) ---------- */
function planImage(x, ng, g){
  const css = getComputedStyle(document.documentElement), font = (w, sz) => `${w} ${sz}px "Be Vietnam Pro", system-ui, sans-serif`;
  const W = 1700, pad = 40, cols = [
    {h:'STT', w:60, a:'c', f:(o,i)=>String(i+1)}, {h:'Mã', w:140, f:o=>o.ma}, {h:'Tên đơn', w:400, f:o=>o.ten + (o.ctGhiChu||o.ghiChuMay ? '\n' + [o.ctGhiChu,o.ghiChuMay].filter(Boolean).join(' · ') : '')},
    {h:'Áo', w:80, a:'r', f:o=>String(mAo(o)), b:1}, {h:'Loại áo', w:280, f:o=>loaiOf(o,'ao')||'—'},
    {h:'Quần', w:80, a:'r', f:o=>String(mQuan(o)), b:1}, {h:'Loại quần', w:300, f:o=>loaiOf(o,'quan')||'—'},
    {h:'Khách nhận', w:140, a:'c', f:o=>dmy(o.ngayKhach), b:1}, {h:'Xưởng trả', w:140, a:'c', f:o=>dmy(o.ngayTraMay)}];
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  const wrap = (t, w, f) => { ctx.font = f; const out = []; String(t).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(word => { const tst = line ? line + ' ' + word : word; if (ctx.measureText(tst).width > w && line) { out.push(line); line = word; } else line = tst; }); out.push(line); }); return out; };
  const LH = 26, rows = g.map((o,i) => { const cells = cols.map(col => wrap(col.f(o,i), col.w - 20, font(col.b?700:500, 19))); return {cells, h: Math.max(...cells.map(l => l.length)) * LH + 20}; });
  const ao = g.reduce((s,o)=>s+mAo(o),0), qu = g.reduce((s,o)=>s+mQuan(o),0);
  const headH = 150, thH = 44, H = headH + thH + rows.reduce((s,r)=>s+r.h,0) + 70;
  const scale = 1.5; c.width = W*scale; c.height = H*scale; ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#0f6b5c'; ctx.fillRect(0,0,W,8);
  ctx.fillStyle = '#1c2220'; ctx.font = font(800, 34); ctx.fillText('KẾ HOẠCH MAY – XƯỞNG ' + x, pad, 64);
  ctx.font = font(600, 22); ctx.fillStyle = '#3d4643';
  ctx.fillText(`Ngày gửi: ${ng?dmy(ng):'—'}   ·   ${g.length} đơn   ·   ${ao} áo   ·   ${qu} quần`, pad, 104);
  ctx.font = font(500, 16); ctx.fillStyle = '#5d6864'; ctx.fillText('HOOPS & AKU · xuất lúc ' + new Date().toLocaleString('vi-VN'), pad, 132);
  let y = headH; ctx.fillStyle = '#eaece7'; ctx.fillRect(pad, y, W-2*pad, thH);
  const xs = []; let xx = pad; cols.forEach(col => { xs.push(xx); xx += col.w; });
  const tx = (t, i, yy) => { const col = cols[i]; const x0 = xs[i]; ctx.textAlign = col.a==='r'?'right':col.a==='c'?'center':'left'; ctx.fillText(t, col.a==='r'? x0+col.w-10 : col.a==='c'? x0+col.w/2 : x0+10, yy); ctx.textAlign = 'left'; };
  ctx.font = font(800, 16); ctx.fillStyle = '#3d4643'; cols.forEach((col,i) => tx(col.h.toUpperCase(), i, y + 28));
  y += thH;
  rows.forEach((r, ri) => {
    if (ri % 2) { ctx.fillStyle = '#f6f7f4'; ctx.fillRect(pad, y, W-2*pad, r.h); }
    r.cells.forEach((lines, i) => { lines.forEach((ln, li) => { ctx.font = font(cols[i].b ? 700 : (i===2 && li===0 ? 700 : 500), 19); ctx.fillStyle = i===2 && li>0 ? '#5d6864' : '#1c2220'; tx(ln, i, y + 34 + li*LH); }); });
    y += r.h; ctx.strokeStyle = '#d8dcd6'; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
  });
  ctx.font = font(800, 20); ctx.fillStyle = '#1c2220'; ctx.fillText(`TỔNG: ${ao} áo · ${qu} quần`, pad, y + 44);
  return c;
}
async function exportPng(k){
  const [x, ng] = k.split('|');
  const g = D.orders.filter(o => o.xuong === x && (o.ngayGuiMay||'') === ng && !o.xuatAnhLuc).sort((a,b)=>(a.ngayKhach||'9').localeCompare(b.ngayKhach||'9'));
  if (!g.length) return;
  try { await document.fonts.ready; } catch (e) {}
  const cv = planImage(x, ng, g), url = cv.toDataURL('image/png'), name = `KH_MAY_${x.replace(/\s+/g,'_')}_${(ng||'').replace(/-/g,'')}.png`;
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="modal-in modal-img" role="dialog" aria-label="Ảnh gửi xưởng ${esc(x)}">
    <b>Ảnh gửi xưởng ${esc(x)} · ${g.length} đơn</b>
    <div class="imgbox"><img src="${url}" alt="Kế hoạch may xưởng ${esc(x)}"></div>
    <span class="hint">Nếu nút tải không chạy (bản chạy thử), bấm giữ hoặc chuột phải vào ảnh để lưu.</span>
    <div class="actions"><button class="btn" type="button" data-dl>Tải ảnh PNG và ẩn danh sách</button><button class="btn ghost" type="button" data-cp>Sao chép ảnh</button><button class="btn ghost" type="button" data-cl>Đóng, chưa ẩn</button></div></div>`;
  document.body.appendChild(m);
  const hide = () => { m.remove(); bulk(g.map(o=>o.ma), 'may', {xuatAnhLuc: D.today + ' ' + new Date().toTimeString().slice(0,5)}, `Đã xuất ảnh ${g.length} đơn xưởng ${x}. Danh sách đã chuyển sang Đơn hoàn thành.`); };
  m.querySelector('[data-dl]').onclick = () => { try { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {} hide(); };
  m.querySelector('[data-cp]').onclick = () => cv.toBlob(b => { try { navigator.clipboard.write([new ClipboardItem({'image/png': b})]).then(() => toast('Đã chép ảnh. Dán vào Zalo là được.'), () => toast('Trình duyệt không cho chép ảnh. Hãy tải ảnh.', true)); } catch (e) { toast('Trình duyệt không cho chép ảnh. Hãy tải ảnh.', true); } });
  m.querySelector('[data-cl]').onclick = () => m.remove();
}
/* ---------- 6. Sản lượng In (BP In) ---------- */
function vSlIn(){
  const done = D.orders.filter(o => o.ngayDaIn);
  const months = Array.from(new Set(done.map(o => o.ngayDaIn.slice(0,7)).concat([D.today.slice(0,7)]))).sort().reverse();
  if (!SLM) SLM = D.today.slice(0,7);
  const list = done.filter(o => o.ngayDaIn.slice(0,7) === SLM);
  const people = D.lists['NGƯỜI IN'].slice();
  list.forEach(o => { const n = o.nguoiIn || '(chưa ghi người in)'; if (people.indexOf(n) < 0) people.push(n); });
  const N = v => Number(v) || 0;
  const per = people.map(n => { const a = list.filter(o => (o.nguoiIn || '(chưa ghi người in)') === n);
    return {n, don:a.length, ao:a.reduce((s,o)=>s+N(o.slAoIn),0), quan:a.reduce((s,o)=>s+N(o.slQuanIn),0), le:a.filter(o=>o.epLe==='ÉP LẺ').length, noSl:a.filter(o=>o.slAoIn===''&&o.slQuanIn==='').length}; });
  const tot = per.reduce((t,p)=>({don:t.don+p.don, ao:t.ao+p.ao, quan:t.quan+p.quan, le:t.le+p.le, noSl:t.noSl+p.noSl}), {don:0,ao:0,quan:0,le:0,noSl:0});
  const days = Array.from(new Set(list.map(o => o.ngayDaIn))).sort();
  const fmt = n => n ? n.toLocaleString('vi-VN') : '<span class="hint">0</span>';
  const wd = s => ['CN','T2','T3','T4','T5','T6','T7'][new Date(dayNum(s)*864e5).getUTCDay()];
  const mLabel = m => m.slice(5,7)+'/'+m.slice(0,4);
  return `
  <div class="vhead"><h2>Sản lượng in theo người</h2><p class="lede">Tính theo <b>ngày đã in</b> BP In ghi trên từng đơn. Số giống tab BC - SẢN LƯỢNG IN trong Sheet. Đơn chưa ghi SL áo, SL quần sẽ không được cộng.</p></div>
  <div class="bar"><span style="font-weight:700">Tháng</span><select id="slMonth" aria-label="Tháng">${months.map(m=>`<option value="${m}"${m===SLM?' selected':''}>${mLabel(m)}</option>`).join('')}</select></div>
  <div class="kpis">
    <div class="kpi"><small>Đơn đã in</small><b>${tot.don}</b></div>
    <div class="kpi"><small>Áo đã in</small><b>${tot.ao.toLocaleString('vi-VN')}</b></div>
    <div class="kpi"><small>Quần đã in</small><b>${tot.quan.toLocaleString('vi-VN')}</b></div>
    <div class="kpi"><small>Tổng sản phẩm</small><b>${(tot.ao+tot.quan).toLocaleString('vi-VN')}</b></div>
    <div class="kpi${tot.noSl?' alert':''}"><small>Đơn chưa ghi SL</small><b>${tot.noSl}</b></div>
  </div>
  <div class="tbox"><table><thead><tr><th>Người in</th><th>Số đơn</th><th>SL áo</th><th>SL quần</th><th>Tổng SP</th><th>Đơn ép lẻ</th><th>Chưa ghi SL</th></tr></thead><tbody>
  ${per.map(p=>`<tr><td class="name">${esc(p.n)}</td><td class="num">${fmt(p.don)}</td><td class="num">${fmt(p.ao)}</td><td class="num">${fmt(p.quan)}</td><td class="num"><b>${fmt(p.ao+p.quan)}</b></td><td class="num">${fmt(p.le)}</td><td class="num${p.noSl?' stuck':''}">${fmt(p.noSl)}</td></tr>`).join('')}
  <tr style="background:var(--head);font-weight:700"><td>TỔNG</td><td class="num">${fmt(tot.don)}</td><td class="num">${fmt(tot.ao)}</td><td class="num">${fmt(tot.quan)}</td><td class="num">${fmt(tot.ao+tot.quan)}</td><td class="num">${fmt(tot.le)}</td><td class="num">${fmt(tot.noSl)}</td></tr>
  </tbody></table></div>
  <div class="sec"><h3>Theo ngày (áo + quần)</h3>
  ${days.length ? `<div class="tbox"><table><thead><tr><th>Ngày</th>${per.map(p=>`<th>${esc(p.n)}</th>`).join('')}<th>Tổng</th></tr></thead><tbody>
  ${days.map(d => { const vals = per.map(p => list.filter(o=>o.ngayDaIn===d && (o.nguoiIn||'(chưa ghi người in)')===p.n).reduce((s,o)=>s+N(o.slAoIn)+N(o.slQuanIn),0));
    return `<tr${wd(d)==='CN'?' style="background:var(--red)"':''}><td class="num">${wd(d)} ${dm(d)}</td>${vals.map(v=>`<td class="num">${fmt(v)}</td>`).join('')}<td class="num"><b>${fmt(vals.reduce((a,b)=>a+b,0))}</b></td></tr>`; }).join('')}
  </tbody></table></div>` : '<div class="empty">Chưa có đơn nào ghi ngày đã in trong tháng này.</div>'}</div>
  ${list.length ? `<details class="sec"><summary>Danh sách đơn đã in trong tháng (${list.length})</summary>
  <div class="tbox" style="margin-top:8px"><table><thead><tr><th>Ngày in</th><th>Mã</th><th>Tên đơn</th><th>Người in</th><th>Áo</th><th>Quần</th><th>Ép</th><th>Tiến độ</th></tr></thead><tbody>
  ${list.slice().sort((a,b)=>b.ngayDaIn.localeCompare(a.ngayDaIn)).map(o=>`<tr><td class="num">${dm(o.ngayDaIn)}</td><td class="mono">${esc(o.ma)}</td><td class="name">${esc(o.ten)}</td><td>${esc(o.nguoiIn||'—')}</td><td class="num">${o.slAoIn===''?'—':o.slAoIn}</td><td class="num">${o.slQuanIn===''?'—':o.slQuanIn}</td><td>${esc(o.epLe||'')}</td><td>${oChip(o)}</td></tr>`).join('')}
  </tbody></table></div></details>` : ''}`;
}

/* ---------- 7. Sản lượng TK ---------- */
function vTk(){
  const isQL = has('QUẢN LÝ');
  const names = (D.tkNames || []).slice(); if (ME && ROLES.indexOf('TK') >= 0 && names.indexOf(ME) < 0) names.unshift(ME);
  if (!TKF.ngay) TKF.ngay = D.today;
  if (!TKF.tk) TKF.tk = ROLES.indexOf('TK') >= 0 ? ME : (names[0] || '');
  const months = Array.from(new Set((D.tkEntries||[]).map(e => e.ngay.slice(0,7)).concat([D.today.slice(0,7)]))).sort().reverse();
  if (!F.tkMonth) F.tkMonth = D.today.slice(0,7);
  const who = isQL ? F.tkWho : ME;
  let rows = (D.tkEntries||[]).filter(e => e.ngay.slice(0,7) === F.tkMonth && (!who || e.tk === who));
  rows.sort((a,b) => b.ngay.localeCompare(a.ngay) || b.id.localeCompare(a.id));
  const sumA = rows.reduce((s,e)=>s+e.rapAo,0), sumQ = rows.reduce((s,e)=>s+e.rapQuan,0);
  const orderOpts = D.orders.slice().sort((a,b)=>(b.taoLuc||'').localeCompare(a.taoLuc||'')).map(o => `<option value="${esc(o.ma)} · ${esc(o.ten)}"></option>`).join('');
  const mLabel = m => m.slice(5,7)+'/'+m.slice(0,4);
  return `
  <div class="vhead"><h2>Sản lượng rập – Thiết kế</h2><p class="lede">Mỗi lần ra xong file rập, nhập số rập áo và rập quần cho đơn đó. Số liệu lưu ở bảng riêng SAN_LUONG_TK và cộng vào tab báo cáo BC - SẢN LƯỢNG TK.</p></div>
  <form class="form" id="fTk" autocomplete="off">
    <div class="f s2"><label for="tk_ngay">Ngày <span class="req">*</span></label><input type="date" id="tk_ngay" data-tk="ngay" value="${esc(TKF.ngay)}"></div>
    <div class="f s2"><label for="tk_who">Thiết kế</label>${isQL ? `<select id="tk_who" data-tk="tk">${opts(names, TKF.tk, '— chọn —')}</select>` : `<div style="padding:7px 0"><b>${esc(ME)}</b></div>`}</div>
    <div class="f s2"><span class="lb">Đơn hàng</span><label class="chk" style="font-weight:600;font-size:13px"><input type="checkbox" id="tk_noma"${TKF.noMa?' checked':''}> Đơn chưa có mã</label></div>
    ${TKF.noMa ? `
    <div class="f s3"><label for="tk_ten">Tên đơn <span class="req">*</span></label><input type="text" id="tk_ten" data-tk="ten" value="${esc(TKF.ten)}"></div>
    <div class="f s3"><span class="lb">Thương hiệu</span><div class="seg" role="group" aria-label="Thương hiệu">${D.lists['THƯƠNG HIỆU'].map(t=>`<button type="button" aria-pressed="${TKF.th===t}" data-tkth="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>` : `
    <div class="f s6"><label for="tk_don">Chọn mã đơn <span class="req">*</span></label><input type="search" id="tk_don" list="dlOrders" data-tk="don" value="${esc(TKF.don)}" placeholder="Gõ mã hoặc tên đơn rồi chọn trong danh sách"><datalist id="dlOrders">${orderOpts}</datalist></div>`}
    <div class="f s2"><label for="tk_ao">Số rập áo</label><input type="number" min="0" inputmode="numeric" id="tk_ao" data-tk="rapAo" value="${esc(TKF.rapAo)}"></div>
    <div class="f s2"><label for="tk_quan">Số rập quần</label><input type="number" min="0" inputmode="numeric" id="tk_quan" data-tk="rapQuan" value="${esc(TKF.rapQuan)}"></div>
    <div class="f s2"><label for="tk_gc">Ghi chú</label><input type="text" id="tk_gc" data-tk="ghiChu" value="${esc(TKF.ghiChu)}" placeholder="Ví dụ: sửa rập lần 2"></div>
    <div class="s6 actions"><button class="btn" type="submit" id="tkSave">Lưu sản lượng</button></div>
  </form>
  <div class="bar"><span style="font-weight:700">Tháng</span><select id="tkMonth" aria-label="Tháng">${months.map(m=>`<option value="${m}"${m===F.tkMonth?' selected':''}>${mLabel(m)}</option>`).join('')}</select>
    ${isQL ? `<select id="tkWho" aria-label="Thiết kế">${opts(names, F.tkWho, 'Mọi thiết kế')}</select>` : ''}</div>
  <div class="kpis">
    <div class="kpi"><small>Số đơn</small><b>${new Set(rows.map(e=>e.ma||e.ten)).size}</b></div>
    <div class="kpi"><small>Rập áo</small><b>${sumA.toLocaleString('vi-VN')}</b></div>
    <div class="kpi"><small>Rập quần</small><b>${sumQ.toLocaleString('vi-VN')}</b></div>
    <div class="kpi"><small>Tổng rập</small><b>${(sumA+sumQ).toLocaleString('vi-VN')}</b></div>
  </div>
  ${rows.length ? `<div class="tbox"><table><thead><tr><th>Ngày</th>${isQL?'<th>Thiết kế</th>':''}<th>Mã</th><th>Tên đơn</th><th>Rập áo</th><th>Rập quần</th><th>Ghi chú</th><th></th></tr></thead><tbody>
  ${rows.map(e=>`<tr><td class="num">${dm(e.ngay)}</td>${isQL?`<td>${esc(e.tk)}</td>`:''}<td class="mono">${esc(e.ma||'—')}</td><td class="name">${esc(e.ten)}</td><td class="num">${e.rapAo}</td><td class="num">${e.rapQuan}</td><td style="white-space:normal">${esc(e.ghiChu)}</td><td>${(isQL||e.tk===ME)?`<button class="btn ghost sm" type="button" data-tkdel="${esc(e.id)}">Xóa</button>`:''}</td></tr>`).join('')}
  </tbody></table></div>` : '<div class="empty">Chưa có dòng nào trong tháng này.</div>'}`;
}
async function saveTk(){
  const btn = $('#tkSave'); btn.disabled = true; btn.textContent = 'Đang lưu…';
  const e = {ngay:TKF.ngay, tk:TKF.tk, rapAo:TKF.rapAo, rapQuan:TKF.rapQuan, ghiChu:TKF.ghiChu};
  if (TKF.noMa) { e.ten = TKF.ten; e.th = TKF.th; }
  else {
    const m = String(TKF.don).split(' · ')[0].trim().toUpperCase();
    if (!byKey(m)) { toast('Chọn mã đơn trong danh sách gợi ý, hoặc tick "Đơn chưa có mã".', true); btn.disabled = false; btn.textContent = 'Lưu sản lượng'; return; }
    e.ma = m;
  }
  try {
    const r = await api('addTkEntry', e);
    D.tkEntries = (D.tkEntries||[]).concat([r]);
    Object.assign(TKF, {don:'', ten:'', rapAo:'', rapQuan:'', ghiChu:''});
    F.tkMonth = r.ngay.slice(0,7);
    toast(`Đã lưu: ${r.rapAo} rập áo, ${r.rapQuan} rập quần · ${r.ten}`); render();
  } catch (err) { if (errMsg(err) === '__auth__') return; toast(errMsg(err), true); btn.disabled = false; btn.textContent = 'Lưu sản lượng'; }
}
async function delTk(id){
  const b = document.querySelector(`[data-tkdel="${CSS.escape(id)}"]`);
  if (b && b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Bấm lần nữa để xóa'; setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Xóa'; } }, 4000); return; }
  try { await api('deleteTkEntry', id); D.tkEntries = D.tkEntries.filter(e => e.id !== id); toast('Đã xóa dòng'); render(); }
  catch (err) { if (errMsg(err) === '__auth__') return; toast(errMsg(err), true); }
}

function khTag(o){
  const n = diff(o.ngayKhach, D.today);
  if (n === null) return '';
  const c = n < 0 ? 'r-red' : n <= 2 ? 'r-or' : n <= 5 ? 'r-ye' : 'r-no';
  return `<span class="rem ${c}">${n < 0 ? 'trễ '+(-n)+' ngày' : n === 0 ? 'hôm nay' : 'còn '+n+' ngày'}</span>`;
}
const mAo = o => o.confirm && o.slAo !== '' ? N0(o.slAo) : N0(o.slAoIn);
const mQuan = o => o.confirm && o.slQuan !== '' ? N0(o.slQuan) : N0(o.slQuanIn);
function groupText(k){
  const [x, ng] = k.split('|');
  const g = D.orders.filter(o => o.xuong === x && (o.ngayGuiMay||'') === ng);
  const ao = g.reduce((s,o)=>s+mAo(o),0), qu = g.reduce((s,o)=>s+mQuan(o),0);
  return `KẾ HOẠCH MAY – XƯỞNG ${x}\nNgày gửi: ${ng?dmy(ng):'—'} · ${g.length} đơn · ${ao} áo · ${qu} quần\n\n` +
    g.map((o,i)=>`${i+1}. [${o.ma}] ${o.ten}\n   ${mAo(o)} áo · ${mQuan(o)} quần${o.vai?' · vải '+o.vai:''}${N0(o.slBo)?' · '+o.slBo+' bo':''}${N0(o.slPhoi)?' · '+o.slPhoi+' phối':''}${o.chiTiet?' · '+o.chiTiet:''}\n   Khách nhận ${dmy(o.ngayKhach)}${o.ngayTraMay?' · xưởng trả '+dmy(o.ngayTraMay):''}${o.ghiChuMay?'\n   Ghi chú: '+o.ghiChuMay:''}`).join('\n');
}

/* ============ Gắn sự kiện ============ */
function bind(){
  const main = $('#main');
  main.querySelectorAll('[data-zalo]').forEach(b => b.onclick = () => { const o = byKey(b.dataset.zalo) || lastCreated; copyText(zaloText(o), 'Tin Zalo cho BP In'); });
  main.querySelectorAll('[data-png]').forEach(b => b.onclick = () => exportPng(b.dataset.png));
  main.querySelectorAll('[data-unsent]').forEach(b => b.onclick = () => bulk([b.dataset.unsent], 'may', {xuatAnhLuc:''}, 'Đã hiện lại đơn trong danh sách gửi xưởng'));
  main.querySelectorAll('[data-mycs]').forEach(b => b.onclick = () => { F.myCs = b.dataset.mycs; render(); });
  main.querySelectorAll('[data-unplan]').forEach(b => b.onclick = () => { const o = byKey(b.dataset.unplan); Object.assign(draft(o.ma,'may'), {xuong:''}); o._editing = true; saveCard(o.ma,'may'); });
  const on = (id, ev, fn) => { const el = $('#'+id); if (el) el.addEventListener(ev, fn); };
  on('fq','input', e => { F.q = e.target.value; rerenderKeep('fq'); });
  on('fcs','change', e => { F.cs = e.target.value; render(); });
  on('fth','change', e => { F.th = e.target.value; render(); });
  on('ftd','change', e => { F.td = e.target.value; render(); });
  on('bpq','input', e => { F.bpq = e.target.value; rerenderKeep('bpq'); });
  // BP In: danh sách đã in theo cuộn
  main.querySelectorAll('[data-reedit]').forEach(b => b.onclick = () => { EDIT_IN[b.dataset.reedit] = true; window.scrollTo(0,0); render(); });
  main.querySelectorAll('[data-unedit]').forEach(b => b.onclick = () => { delete EDIT_IN[b.dataset.unedit]; delete DRAFT[b.dataset.unedit+'|in']; render(); });
  main.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => moveInRoll(b.dataset.ma, +b.dataset.mv));
  main.querySelectorAll('[data-ep1]').forEach(cb => cb.onchange = () => { if (cb.checked) bulk([cb.dataset.ep1], 'in', {chuyenEp:true}, 'Đã chuyển sang BP Ép'); });
  main.querySelectorAll('[data-epall]').forEach(b => b.onclick = () => { const g = rollGroups(D.orders.filter(o => o.tienDo==='Đã in' && !o.chuyenEp)).find(x => x.key === b.dataset.epall); if (g) bulk(g.items.map(o=>o.ma), 'in', {chuyenEp:true}, `Đã chuyển ${g.items.length} đơn của cuộn ${g.cuon} sang BP Ép`); });
  // BP Ép
  main.querySelectorAll('[data-epf]').forEach(el => el.onchange = () => { const k = el.dataset.key; EPF[k] = EPF[k] || {epLe:'CUỘN', ngay:D.today}; EPF[k][el.dataset.epf] = el.value; });
  const epPatch = k => { const e = EPF[k] || {epLe:'CUỘN', ngay:D.today}; return {tienDo:'Đã ép', epLe:e.epLe, ngayDaEp:e.ngay || D.today}; };
  main.querySelectorAll('[data-epdone]').forEach(b => b.onclick = () => bulk([b.dataset.epdone], 'ep', epPatch(b.dataset.key), 'Đã ép, đơn chuyển sang Kế hoạch may'));
  main.querySelectorAll('[data-epdoneall]').forEach(b => b.onclick = () => { const g = rollGroups(D.orders.filter(o => o.tienDo==='Đã in' && o.chuyenEp)).find(x => x.key === b.dataset.epdoneall); if (g) bulk(g.items.map(o=>o.ma), 'ep', epPatch(g.key), `Đã ép ${g.items.length} đơn, chuyển sang Kế hoạch may`); });
  main.querySelectorAll('[data-epback]').forEach(b => b.onclick = () => bulk([b.dataset.epback], 'in', {chuyenEp:false}, 'Đã trả đơn về BP In'));
  main.querySelectorAll('[data-epundo]').forEach(b => b.onclick = () => bulk([b.dataset.epundo], 'ep', {tienDo:'Đã in'}, 'Đã hoàn tác, đơn quay lại Chờ ép'));
  on('mq','input', e => { F.mayQ = e.target.value; rerenderKeep('mq'); });
  on('htq','input', e => { F.htQ = e.target.value; rerenderKeep('htq'); });
  on('htcs','change', e => { F.htCs = e.target.value; render(); });
  on('htx','change', e => { F.htX = e.target.value; render(); });
  main.querySelectorAll('details.month').forEach(d => d.addEventListener('toggle', () => { F.htOpen[d.dataset.month] = d.open; }));
  // Sản lượng TK
  const ft = $('#fTk');
  if (ft) {
    ft.querySelectorAll('[data-tk]').forEach(el => el.addEventListener(el.tagName==='SELECT'||el.type==='date' ? 'change' : 'input', () => { TKF[el.dataset.tk] = el.value; }));
    ft.querySelectorAll('[data-tkth]').forEach(b => b.onclick = () => { TKF.th = b.dataset.tkth; render(); });
    on('tk_noma','change', e => { TKF.noMa = e.target.checked; render(); });
    ft.addEventListener('submit', ev => { ev.preventDefault(); saveTk(); });
  }
  on('tkMonth','change', e => { F.tkMonth = e.target.value; render(); });
  on('slMonth','change', e => { SLM = e.target.value; render(); });
  on('tkWho','change', e => { F.tkWho = e.target.value; render(); });
  main.querySelectorAll('[data-tkdel]').forEach(b => b.onclick = () => delTk(b.dataset.tkdel));

  // Form nhập đơn
  const f = $('#fNhap');
  if (f) {
    const key = editMa || '_new';
    f.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.tagName==='SELECT'||el.type==='date' ? 'change' : 'input', () => {
      draft(key,'don')[el.dataset.k] = el.value; allowDup = false;
      if (el.type === 'date') rerenderKeep(el.id);
    }));
    f.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { draft(key,'don')[b.dataset.set] = b.dataset.v; render(); });
    f.addEventListener('submit', ev => { ev.preventDefault(); saveOrder(); });
    on('nClear','click', () => { delete DRAFT['_new|don']; lastCreated = null; allowDup = false; render(); });
    on('nCancel','click', () => { delete DRAFT[editMa+'|don']; editMa = null; render(); });
  }
  main.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editMa = b.dataset.edit; lastCreated = null; window.scrollTo(0,0); render(); });

  // Các thẻ (BP In, CS, May)
  main.querySelectorAll('.card[data-ma]').forEach(c => {
    const ma = c.dataset.ma, sec = c.dataset.sec, o = byKey(ma);
    const mark = () => { const d = draft(ma, sec); const dirty = Object.keys(d).some(k => String(d[k]) !== String(o[k] ?? '')); if (!dirty) delete DRAFT[ma+'|'+sec]; c.classList.toggle('dirty', dirty); c.querySelector('[data-save]').disabled = !dirty; };
    c.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type==='checkbox'||el.tagName==='SELECT'||el.type==='date' ? 'change' : 'input', () => {
      draft(ma, sec)[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; mark();
    }));
    c.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      draft(ma, sec)[b.dataset.set] = b.dataset.v;
      if (sec === 'may' && !val(o,'may','ngayGuiMay')) draft(ma,'may').ngayGuiMay = D.today;
      b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      const dg = c.querySelector('[data-k="ngayGuiMay"]'); if (dg && !dg.value) dg.value = D.today;
      if (sec === 'in') {
        const di = c.querySelector('[data-k="ngayDaIn"]'), de = c.querySelector('[data-k="ngayDaEp"]');
        if ((b.dataset.v === 'Đã in' || b.dataset.v === 'Đã ép') && di && !di.value) { di.value = D.today; draft(ma,'in').ngayDaIn = D.today; }
        if (b.dataset.v === 'Đã ép' && de && !de.value) { de.value = D.today; draft(ma,'in').ngayDaEp = D.today; }
      }
      mark();
    });
    if (sec === 'cs') {
      const readLoai = () => { const l = {ao:[], quan:[]}; c.querySelectorAll('.lt').forEach(b => b.querySelectorAll('.lt-r').forEach(r => { const t = r.querySelector('[data-lt="t"]').value, n = r.querySelector('[data-lt="n"]').value; if (t || n) l[b.dataset.kind].push([t, n]); })); return l; };
      const putLoai = l => {
        const d = draft(ma,'cs'), sum = a => a.reduce((s,r)=>s+(+r[1]||0),0);
        d.loai = JSON.stringify(l); d.slAo = l.ao.length ? sum(l.ao) : ''; d.slQuan = l.quan.length ? sum(l.quan) : ''; d.chiTiet = loaiText(l);
        c.querySelectorAll('.lt').forEach(b => { b.querySelector('.lt-tot').textContent = sum(l[b.dataset.kind]); });
        const df = (d.slAo !== '' && o.slAoIn !== '' && +d.slAo !== +o.slAoIn) || (d.slQuan !== '' && o.slQuanIn !== '' && +d.slQuan !== +o.slQuanIn);
        const cm = c.querySelector('.cmp'); cm.classList.toggle('diff', df); cm.innerHTML = cm.innerHTML.split(' · số CS nhập')[0] + (df ? ' · số CS nhập đang khác số BP In' : '');
        mark();
      };
      c.querySelectorAll('[data-lt="t"],[data-lt="n"]').forEach(el => el.addEventListener(el.tagName==='SELECT' ? 'change' : 'input', () => putLoai(readLoai())));
      c.querySelectorAll('[data-lt="add"]').forEach(b => b.onclick = () => { const l = readLoai(), k = b.closest('.lt').dataset.kind; if (!l[k].length) l[k].push(['','']); l[k].push(['','']); putLoai(l); render(); });
      c.querySelectorAll('[data-lt="x"]').forEach(b => b.onclick = () => { const l = readLoai(), k = b.closest('.lt').dataset.kind, i = +b.closest('.lt-r').dataset.i; l[k].splice(i,1); putLoai(l); render(); });
    }
    const sv = c.querySelector('[data-save]'); if (sv) sv.onclick = () => saveCard(ma, sec);
  });
}
async function bulk(mas, sec, patch, okMsg){
  try {
    const rs = await api('updateMany', mas, sec, patch);
    rs.forEach(r => { const o = byKey(r.ma); if (o) Object.assign(o, r); });
    toast(okMsg); render();
  } catch (e) { if (errMsg(e) === '__auth__') return; toast(errMsg(e), true); render(); }
}
async function moveInRoll(ma, dir){
  const o = byKey(ma);
  const g = rollGroups(D.orders.filter(x => x.tienDo === 'Đã in' && !x.chuyenEp && gKey(x) === gKey(o)))[0];
  if (!g) return;
  const arr = g.items.map(x => x.ma), i = arr.indexOf(ma), j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  arr.forEach((m, k) => byKey(m).sttCuon = k + 1);
  render();
  try { const rs = await api('reorderCuon', arr); rs.forEach(r => Object.assign(byKey(r.ma), r)); }
  catch (e) { if (errMsg(e) === '__auth__') return; toast('Chưa lưu được thứ tự: ' + errMsg(e), true); load(); }
}
function rerenderKeep(id){
  const el = document.getElementById(id); const pos = el && el.selectionStart;
  render();
  const n = document.getElementById(id); if (n) { n.focus(); try { if (pos !== null && n.setSelectionRange && n.type !== 'date') n.setSelectionRange(pos, pos); } catch(e){} }
}

/* ============ Lưu ============ */
async function saveOrder(){
  const key = editMa || '_new';
  const e = editMa ? byKey(editMa) : null;
  const d = draft(key,'don');
  const base = e ? {ten:e.ten, cs:e.cs, uuTien:e.uuTien, ngayFinal:e.ngayFinal, ngayInEp:e.ngayInEp, ngayKhach:e.ngayKhach, ghiChuCS:e.ghiChuCS}
                 : {th:'HOOPS', cs: D.lists['CS'].indexOf(ME)>=0 ? ME : '', uuTien:'', ngayFinal:D.today, ngayInEp:'', ngayKhach:'', ghiChuCS:'', ten:''};
  const o = Object.assign(base, d);
  const btn = $('#nSave'); btn.disabled = true; btn.textContent = 'Đang lưu…';
  try {
    if (e) {
      const r = await api('updateOrder', e.ma, 'don', o);
      Object.assign(e, r); delete DRAFT[key]; editMa = null; toast('Đã lưu đơn ' + r.ma);
    } else {
      o.choPhepTrung = allowDup;
      const r = await api('createOrder', o);
      D.orders.push(r); lastCreated = r; delete DRAFT[key]; allowDup = false; toast('Đã tạo đơn ' + r.ma);
    }
    render();
  } catch (err) {
    let m = errMsg(err);
    if (m === '__auth__') return;
    if (m.indexOf('TRÙNG_TÊN:') >= 0) { allowDup = true; m = m.split('TRÙNG_TÊN:')[1]; }
    toast(m, true); render();
  }
}
async function saveCard(ma, sec){
  const o = byKey(ma), d = DRAFT[ma+'|'+sec];
  if (!d) return;
  const c = document.querySelector(`.card[data-ma="${CSS.escape(ma)}"][data-sec="${sec}"] [data-save]`);
  if (c) { c.disabled = true; c.textContent = 'Đang lưu…'; }
  try {
    const r = await api('updateOrder', ma, sec, d);
    Object.assign(o, r); delete DRAFT[ma+'|'+sec];
    if (sec === 'in' && o.tienDo === 'Đã in') delete EDIT_IN[ma];
    const msg = sec==='in' && o.tienDo==='Đã in' ? `Đã lưu. Đơn xuống danh sách đã in (cuộn ${o.cuon}, STT ${o.sttCuon}) và về danh sách của CS ${o.cs}.` : sec==='cs' && o.confirm ? 'Đã CONFIRM, đơn chuyển sang Kế hoạch may.' : 'Đã lưu ' + ma;
    toast(msg); render();
  } catch (err) { if (errMsg(err) === '__auth__') return; toast(errMsg(err), true); render(); }
}


load();

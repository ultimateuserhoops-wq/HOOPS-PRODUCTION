/* ============ Kết nối máy chủ (Apps Script) hoặc chạy thử ============ */
const API_URL = (() => {
  const q = new URLSearchParams(location.search).get('api');
  try {
    if (q === 'demo') localStorage.removeItem('tdie_api');
    else if (q) localStorage.setItem('tdie_api', q);
  } catch (e) {}
  if (q === 'demo') return '';
  let saved = null; try { saved = localStorage.getItem('tdie_api'); } catch (e) {}
  return q || saved || (window.HOOPS_CONFIG && window.HOOPS_CONFIG.API_URL) || '';
})();
const IS_GAS = typeof google !== 'undefined' && google.script && google.script.run;
const IS_LIVE = !!(IS_GAS || API_URL);
function call(fn, ...args){
  if (IS_GAS) return new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...args));
  if (API_URL) {
    // text/plain để trình duyệt không gửi preflight; Apps Script đọc e.postData.contents
    return fetch(API_URL, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({fn, args}), redirect:'follow'})
      .then(r => { if (!r.ok) throw new Error('Máy chủ trả lỗi ' + r.status); return r.json(); })
      .catch(e => { throw new Error(e && e.name === 'SyntaxError' ? 'Link API không đúng hoặc Apps Script chưa mở quyền "Bất kỳ ai"' : (e.message === 'Failed to fetch' ? 'Không kết nối được máy chủ. Kiểm tra mạng hoặc link API.' : e.message)); })
      .then(r => { if (!r.ok) throw new Error(r.error); return r.data; });
  }
  return new Promise((res, rej) => setTimeout(() => { try { res(JSON.parse(JSON.stringify(MOCK[fn](...args)))); } catch (e) { rej(e); } }, 250));
}

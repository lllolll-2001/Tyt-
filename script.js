// ------------------ Настройка: URL Apps Script ------------------
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby3wPWlrKh8sSef9xEV4Gomqg9mKnaopBhJwkXPpiAGnb2WPL1v9yJ3Z5gazxaJBWLzEg/exec';

// UI элементы
const guestTime = document.getElementById('guestTime');
const guestDate = document.getElementById('guestDate');
const bookBtn = document.getElementById('bookBtn');
const bookMsg = document.getElementById('bookMsg');

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginInput = document.getElementById('loginInput');
const passwordInput = document.getElementById('passwordInput');
const loginMsg = document.getElementById('loginMsg');

const adminCard = document.getElementById('adminCard');
const refreshBtn = document.getElementById('refreshBtn');
const noBookingBtn = document.getElementById('noBookingBtn');
const recordsList = document.getElementById('recordsList');
const totalSumEl = document.getElementById('totalSum');
const rangeBtns = document.querySelectorAll('.rangeBtn');
const fromDateEl = document.getElementById('fromDate');
const toDateEl = document.getElementById('toDate');
const rangeShowBtn = document.getElementById('rangeShowBtn');

let token = null;   // будет токен, если сервер выдаст
let role = null;    // 'worker' или 'boss'
let allRecords = [];

// ---------- init ----------
function fillTime(){
  guestTime.innerHTML = '';
  for(let h=8; h<17; h++){
    const hh = String(h).padStart(2,'0');
    guestTime.insertAdjacentHTML('beforeend', `<option>${hh}:00</option>`);
    guestTime.insertAdjacentHTML('beforeend', `<option>${hh}:50</option>`);
  }
}
fillTime();
guestDate.min = new Date().toISOString().slice(0,10);
fromDateEl.value = new Date().toISOString().slice(0,10);
toDateEl.value = new Date().toISOString().slice(0,10);

// ---------- утилиты ----------
function showMsg(el, text, ok=true){
  el.textContent = text;
  el.style.color = ok ? '#8fd19e' : '#ff9b9b';
  if(text) setTimeout(()=> { if(el.textContent === text) el.textContent = ''; }, 4000);
}

async function postJSON(payload){
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('Network response not ok: ' + res.status);
  return res.json();
}

// ---------- бронирование (гость) ----------
bookBtn.addEventListener('click', async ()=>{
  const name = document.getElementById('guestName').value.trim();
  const carType = document.getElementById('guestCarType').value;
  const radius = document.getElementById('radiusSelect').value;
  const service = document.getElementById('serviceSelect').value;
  const date = document.getElementById('guestDate').value;
  const time = document.getElementById('guestTime').value;

  if(!name || !date || !time){ showMsg(bookMsg, 'Заполните имя, дату и время', false); return; }

  try{
    const resp = await postJSON({ action:'addRecord', name, carType, radius, service, date, time });
    if(resp.status === 'ok' || resp.success){
      showMsg(bookMsg, 'Бронь создана', true);
      document.getElementById('guestName').value = '';
      document.getElementById('guestDate').value = '';
      if(token) await loadRecords();
    } else {
      showMsg(bookMsg, resp.message || 'Ошибка', false);
    }
  } catch(e){
    console.error(e);
    showMsg(bookMsg, 'Ошибка связи с сервером', false);
  }
});

// ---------- логин ----------
loginBtn.addEventListener('click', async ()=>{
  const login = loginInput.value.trim();
  const password = passwordInput.value.trim();
  if(!login || !password){ showMsg(loginMsg,'Введите логин и пароль', false); return; }

  try{
    const resp = await postJSON({ action:'login', login, password });
    if(resp.status === 'ok' || resp.success){
      token = resp.token || null; // если сервер вернёт токен
      role = resp.role || resp.userRole || null;
      sessionStorage.setItem('shinom_token', token);
      sessionStorage.setItem('shinom_role', role);
      showMsg(loginMsg,'Вход выполнен', true);
      loginInput.value=''; passwordInput.value='';
      loginInput.disabled = true; passwordInput.disabled = true;
      loginBtn.classList.add('hidden'); logoutBtn.classList.remove('hidden');
      adminCard.classList.remove('hidden');
      await loadRecords();
    } else {
      showMsg(loginMsg, resp.message || 'Неверный логин/пароль', false);
    }
  } catch(e){
    console.error(e);
    showMsg(loginMsg, 'Ошибка связи с сервером', false);
  }
});

// ---------- выход ----------
logoutBtn.addEventListener('click', ()=>{
  token = null; role = null;
  sessionStorage.removeItem('shinom_token'); sessionStorage.removeItem('shinom_role');
  loginInput.disabled = false; passwordInput.disabled = false;
  loginBtn.classList.remove('hidden'); logoutBtn.classList.add('hidden');
  adminCard.classList.add('hidden'); recordsList.innerHTML = '';
});

// ---------- загрузка записей ----------
async function loadRecords(){
  try{
    const payload = token ? { action:'getRecords', token } : { action:'getRecords' };
    const resp = await postJSON(payload);
    if(resp.status === 'ok' || resp.success){
      allRecords = resp.data || resp.records || [];
      renderRecords(allRecords);
    } else {
      showMsg(loginMsg, resp.message || 'Ошибка загрузки', false);
      // если auth ошибка — логаут
      if(resp.message && /auth/i.test(resp.message)) logoutBtn.click();
    }
  } catch(e){
    console.error(e);
    showMsg(loginMsg, 'Ошибка связи с сервером', false);
  }
}

// ---------- отрисовка ----------
function renderRecords(list){
  recordsList.innerHTML = '';
  list.sort((a,b)=> (a.date + a.time) > (b.date + b.time) ? 1 : -1);
  let total = 0;
  list.forEach(r=>{
    const div = document.createElement('div');
    div.className = 'record';
    const sumNum = Number(r.sum || r.earned || 0) || 0;
    total += sumNum;
    div.innerHTML = `
      <div class="top"><b>${escapeHtml(r.name)}</b> — ${escapeHtml(r.service)} — ${escapeHtml(r.carType||r.car)} ${escapeHtml(r.radius)}</div>
      <div class="sub">${escapeHtml(r.date)} ${escapeHtml(r.time)}</div>
      <div class="meta">Выполнил: ${escapeHtml(r.worker||r.addedBy||'-')} | Работа: ${escapeHtml(r.note||r.work||'-')} | Сумма: ${sumNum} грн</div>
    `;
    if(role === 'worker' || role === 'boss'){
      const controls = document.createElement('div');
      controls.className = 'controls';
      const btnDone = document.createElement('button');
      btnDone.textContent = 'Приехал';
      btnDone.onclick = ()=> editRecord(r);
      const btnNo = document.createElement('button');
      btnNo.textContent = 'Не приехал';
      btnNo.onclick = ()=> markNoShow(r);
      controls.appendChild(btnDone); controls.appendChild(btnNo);
      div.appendChild(controls);
    }
    recordsList.appendChild(div);
  });
  totalSumEl.textContent = total;
}

// ---------- редактирование записи ----------
async function editRecord(rec){
  const note = prompt('Что сделано?', rec.note || rec.work || '');
  if(note === null) return;
  const sumStr = prompt('Сумма (грн)', String(rec.sum || rec.earned || '0'));
  if(sumStr === null) return;
  const sum = Number(sumStr);
  if(isNaN(sum)){ alert('Неверная сумма'); return; }
  try{
    const resp = await postJSON({ action:'updateRecord', token, id: rec.id || rec.row || null, date: rec.date, time: rec.time, note, sum, worker: role });
    if(resp.status === 'ok' || resp.success) await loadRecords();
    else showMsg(loginMsg, resp.message || 'Ошибка обновления', false);
  } catch(e){
    console.error(e);
    showMsg(loginMsg, 'Ошибка связи с сервером', false);
  }
}

async function markNoShow(rec){
  try{
    const resp = await postJSON({ action:'updateRecord', token, id: rec.id || rec.row || null, date: rec.date, time: rec.time, note: 'Не приехал', sum: '', worker: role });
    if(resp.status === 'ok' || resp.success) await loadRecords();
    else showMsg(loginMsg, resp.message || 'Ошибка', false);
  } catch(e){
    console.error(e);
    showMsg(loginMsg, 'Ошибка связи с сервером', false);
  }
}

// ---------- добавить без записи ----------
noBookingBtn.addEventListener('click', async ()=>{
  if(!token){ showMsg(loginMsg,'Требуется авторизация', false); return; }
  const name = prompt('Имя клиента:'); if(!name) return;
  const carType = prompt('Тип машины (Легковая...):','Легковая'); if(!carType) return;
  const radius = prompt('Радиус (R13..R21):','R16'); if(!radius) return;
  const service = prompt('Услуга:','Балансировка'); if(!service) return;
  const sumStr = prompt('Сумма (грн):','0'); const sum = Number(sumStr); if(isNaN(sum)) return alert('Неверная сумма');
  const date = new Date().toISOString().slice(0,10);
  const time = 'Без записи';
  try{
    const resp = await postJSON({ action:'addRecord', token, name, carType, radius, service, date, time, note: service, sum: String(sum), role });
    if(resp.status === 'ok' || resp.success){ showMsg(loginMsg,'Добавлено', true); await loadRecords(); }
    else showMsg(loginMsg, resp.message || 'Ошибка', false);
  } catch(e){
    console.error(e); showMsg(loginMsg,'Ошибка связи с сервером', false);
  }
});

// ---------- фильтры ----------
rangeBtns.forEach(b=> b.addEventListener('click', ()=>{
  const mode = b.dataset.range; setRange(mode);
}));
rangeShowBtn.addEventListener('click', ()=> filterByRange(fromDateEl.value, toDateEl.value));

function setRange(mode){
  const now = new Date();
  if(mode === 'day'){ const d = now.toISOString().slice(0,10); fromDateEl.value = d; toDateEl.value = d; }
  if(mode === 'week'){ const start = new Date(now); start.setDate(now.getDate() - now.getDay()); const end = new Date(start); end.setDate(start.getDate()+6); fromDateEl.value = start.toISOString().slice(0,10); toDateEl.value = end.toISOString().slice(0,10); }
  if(mode === 'month'){ const start = new Date(now.getFullYear(), now.getMonth(), 1); const end = new Date(now.getFullYear(), now.getMonth()+1, 0); fromDateEl.value = start.toISOString().slice(0,10); toDateEl.value = end.toISOString().slice(0,10); }
  filterByRange(fromDateEl.value, toDateEl.value);
}

function filterByRange(from, to){
  if(!allRecords.length){ recordsList.innerHTML = '<p>Нет записей</p>'; return; }
  const f = new Date(from); const t = new Date(to);
  const filtered = allRecords.filter(r=> { const d = new Date(r.date); return d >= f && d <= t; });
  renderRecords(filtered);
}

// ---------- автологин ----------
async function init(){
  const savedToken = sessionStorage.getItem('shinom_token');
  const savedRole = sessionStorage.getItem('shinom_role');
  if(savedToken && savedRole){
    token = savedToken; role = savedRole;
    loginInput.disabled = true; passwordInput.disabled = true;
    loginBtn.classList.add('hidden'); logoutBtn.classList.remove('hidden'); adminCard.classList.remove('hidden');
    await loadRecords();
  }
  setInterval(()=> { if(token) loadRecords(); }, 15000);
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

document.getElementById('refreshBtn').addEventListener('click', ()=> loadRecords());
init();
// --- Поставь сюда URL твоего Apps Script (твой URL) ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwS6WO-4XBlGzuAVhaHzwBGfD6TM-8L9ZHb6N0IKcQtMj9F9aC_m3_5VD1S8RqN6Poz_g/exec';

// UI
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

let token = null;
let role = null;
let allRecords = [];

// init times/dates
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

// helper
function showMsg(el, txt, ok=true){
  el.textContent = txt;
  el.style.color = ok ? '#8fd19e' : '#ff9b9b';
  if(txt) setTimeout(()=> { if(el.textContent === txt) el.textContent = ''; }, 4000);
}
async function postJSON(payload){
  const res = await fetch(SCRIPT_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('network '+res.status);
  return res.json();
}

// booking (guest)
bookBtn.addEventListener('click', async ()=>{
  const name = document.getElementById('guestName').value.trim();
  const carType = document.getElementById('guestCarType').value;
  const radius = document.getElementById('radiusSelect').value;
  const service = document.getElementById('serviceSelect').value;
  const date = document.getElementById('guestDate').value;
  const time = document.getElementById('guestTime').value;
  if(!name || !date || !time){ showMsg(bookMsg,'Заполните имя, дату и время', false); return; }
  try{
    const resp = await postJSON({ action:'addRecord', name, carType, radius, service, date, time });
    if(resp.success || resp.status==='ok'){
      showMsg(bookMsg,'Бронь создана', true);
      document.getElementById('guestName').value=''; document.getElementById('guestDate').value='';
      if(token) await loadRecords();
    } else {
      showMsg(bookMsg, resp.message || 'Ошибка', false);
    }
  } catch(e){
    console.error(e);
    showMsg(bookMsg,'Ошибка связи с сервером', false);
  }
});

// login
loginBtn.addEventListener('click', async ()=>{
  const login = loginInput.value.trim();
  const password = passwordInput.value.trim();
  if(!login || !password){ showMsg(loginMsg,'Введите логин и пароль', false); return; }
  try{
    const resp = await postJSON({ action:'login', login, password });
    if(resp.success || resp.status==='ok'){
      token = resp.token || null;
      role = resp.role || resp.data || login;
      sessionStorage.setItem('shinom_token', token);
      sessionStorage.setItem('shinom_role', role);
      showMsg(loginMsg,'Вход выполнен', true);
      loginInput.value=''; passwordInput.value='';
      loginInput.disabled=true; passwordInput.disabled=true;
      loginBtn.classList.add('hidden'); logoutBtn.classList.remove('hidden');
      adminCard.classList.remove('hidden');
      await loadRecords();
    } else {
      showMsg(loginMsg, resp.error || resp.message || 'Неверный логин/пароль', false);
    }
  } catch(e){
    console.error(e);
    showMsg(loginMsg,'Ошибка связи с сервером', false);
  }
});

// logout
logoutBtn.addEventListener('click', ()=>{
  token = null; role = null;
  sessionStorage.removeItem('shinom_token'); sessionStorage.removeItem('shinom_role');
  loginInput.disabled=false; passwordInput.disabled=false;
  loginBtn.classList.remove('hidden'); logoutBtn.classList.add('hidden');
  adminCard.classList.add('hidden'); recordsList.innerHTML='';
});

// load records (requires token for full data)
async function loadRecords(){
  try{
    const payload = token ? { action:'getRecords', token } : { action:'getRecordsPublic' };
    const resp = await postJSON(payload);
    if(resp.success || resp.status==='ok'){
      allRecords = resp.records || resp.data || resp;
      renderRecords(allRecords);
    } else {
      showMsg(loginMsg, resp.error || resp.message || 'Ошибка загрузки', false);
      if(resp.error && /auth/i.test(resp.error)) logoutBtn.click();
    }
  } catch(e){
    console.error(e);
    showMsg(loginMsg,'Ошибка связи с сервером', false);
  }
}

// render
function renderRecords(list){
  recordsList.innerHTML='';
  list.sort((a,b)=> (a.date + a.time) > (b.date + b.time) ? 1 : -1);
  let total = 0;
  list.forEach(r=>{
    const div = document.createElement('div');
    div.className='record';
    const sum = Number(r.sum || r.earned || 0) || 0;
    total += sum;
    div.innerHTML = `
      <div class="top"><b>${escapeHtml(r.name)}</b> — ${escapeHtml(r.service)} — ${escapeHtml(r.carType||r.car)}</div>
      <div class="sub">${escapeHtml(r.date)} ${escapeHtml(r.time)}</div>
      <div class="meta">Выполнил: ${escapeHtml(r.worker||r.addedBy||'-')} | Работа: ${escapeHtml(r.note||r.work||'-')} | Сумма: ${sum} грн</div>
    `;
    if(role === 'worker' || role === 'boss'){
      const controls = document.createElement('div'); controls.className='controls';
      const btnDone = document.createElement('button'); btnDone.textContent='Приехал';
      btnDone.onclick = ()=> editRecord(r);
      const btnNo = document.createElement('button'); btnNo.textContent='Не приехал';
      btnNo.onclick = ()=> markNoShow(r);
      controls.appendChild(btnDone); controls.appendChild(btnNo);
      div.appendChild(controls);
    }
    recordsList.appendChild(div);
  });
  totalSumEl.textContent = total;
}

// edit record (worker)
async function editRecord(rec){
  const note = prompt('Что сделано?', rec.note || rec.work || '');
  if(note === null) return;
  const sumStr = prompt('Сумма (грн)', String(rec.sum || rec.earned || '0'));
  if(sumStr === null) return;
  const sum = Number(sumStr);
  if(isNaN(sum)){ alert('Неверная сумма'); return; }
  try{
    const resp = await postJSON({ action:'updateRecord', token, id: rec.id || rec.row || null, date: rec.date, time: rec.time, note, sum, worker: role });
    if(resp.success || resp.status==='ok') await loadRecords();
    else showMsg(loginMsg, resp.error || resp.message || 'Ошибка обновления', false);
  } catch(e){
    console.error(e); showMsg(loginMsg,'Ошибка связи с сервером', false);
  }
}

async function markNoShow(rec){
  try{
    const resp = await postJSON({ action:'updateRecord', token, id: rec.id || rec.row || null, date: rec.date, time: rec.time, note:'Не приехал', sum:'', worker: role });
    if(resp.success || resp.status==='ok') await loadRecords();
    else showMsg(loginMsg, resp.error || resp.message || 'Ошибка', false);
  } catch(e){
    console.error(e); showMsg(loginMsg,'Ошибка связи с сервером', false);
  }
}

// add without booking (worker)
noBookingBtn.addEventListener('click', async ()=>{
  if(!token){ showMsg(loginMsg,'Требуется авторизация', false); return; }
  const name = prompt('Имя клиента:'); if(!name) return;
  const carType = prompt('Тип машины (Легковая...):','Легковая'); if(!carType) return;
  const radius = prompt('Радиус (R13..R21):','R16'); if(!radius) return;
  const service = prompt('Услуга:','Балансировка'); if(!service) return;
  const sumStr = prompt('Сумма (грн):','0'); const sum = Number(sumStr); if(isNaN(sum)) return alert('Неверная сумма');
  const date = new Date().toISOString().slice(0,10); const time = 'Без записи';
  try{
    const resp = await postJSON({ action:'addRecord', token, name, carType, radius, service, date, time, note: service, sum: String(sum), role });
    if(resp.success || resp.status==='ok'){ showMsg(loginMsg,'Добавлено', true); await loadRecords(); }
    else showMsg(loginMsg, resp.error || resp.message || 'Ошибка', false);
  } catch(e){
    console.error(e); showMsg(loginMsg,'Ошибка связи с сервером', false);
  }
});

// filters
rangeBtns.forEach(b=> b.addEventListener('click', ()=> setRange(b.dataset.range)));
rangeShowBtn.addEventListener('click', ()=> filterByRange(fromDateEl.value, toDateEl.value));
function setRange(mode){
  const now = new Date();
  if(mode==='day'){ const d = now.toISOString().slice(0,10); fromDateEl.value=d; toDateEl.value=d; }
  if(mode==='week'){ const start = new Date(now); start.setDate(now.getDate() - now.getDay()); const end = new Date(start); end.setDate(start.getDate()+6); fromDateEl.value = start.toISOString().slice(0,10); toDateEl.value = end.toISOString().slice(0,10); }
  if(mode==='month'){ const start = new Date(now.getFullYear(), now.getMonth(), 1); const end = new Date(now.getFullYear(), now.getMonth()+1, 0); fromDateEl.value = start.toISOString().slice(0,10); toDateEl.value = end.toISOString().slice(0,10); }
  filterByRange(fromDateEl.value, toDateEl.value);
}
function filterByRange(from,to){
  if(!allRecords.length){ recordsList.innerHTML='<p>Нет записей</p>'; return; }
  const f=new Date(from); const t=new Date(to);
  const filtered = allRecords.filter(r=> { const d=new Date(r.date); return d>=f && d<=t; });
  renderRecords(filtered);
}

// init autologin
async function init(){
  const savedToken = sessionStorage.getItem('shinom_token');
  const savedRole = sessionStorage.getItem('shinom_role');
  if(savedToken && savedRole){
    token = savedToken; role = savedRole;
    loginInput.disabled=true; passwordInput.disabled=true;
    loginBtn.classList.add('hidden'); logoutBtn.classList.remove('hidden'); adminCard.classList.remove('hidden');
    await loadRecords();
  }
  setInterval(()=> { if(token) loadRecords(); }, 15000);
}
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
document.getElementById('refreshBtn').addEventListener('click', ()=> loadRecords());
init();

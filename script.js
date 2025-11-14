const SPREADSHEET_URL = 'https://script.google.com/macros/s/AKfycbwkWctotFr9nlRRhNxfUPUfdOKR41he7NvrhgLU8iNF5YF82jlx6Y9Fata5eiP6tmPbjw/exec';

let futureRecordsDiv = document.getElementById('futureRecords');

// ==== Временные слоты ====
function fillTimeSelect() {
  const select = document.getElementById('guestTime');
  select.innerHTML = '';
  for(let h=8; h<17; h++){
    select.innerHTML += `<option>${h}:00</option>`;
    select.innerHTML += `<option>${h}:50</option>`;
  }
}
fillTimeSelect();

// ==== Минимальная дата ====
document.getElementById('guestDate').min = new Date().toISOString().split('T')[0];

// ==== Добавление записи ====
function addGuestRecord() {
  const name = document.getElementById('guestName').value.trim();
  const car = document.getElementById('guestCarType').value;
  const radius = document.getElementById('radiusSelect').value;
  const service = document.getElementById('serviceSelect').value;
  const date = document.getElementById('guestDate').value;
  const time = document.getElementById('guestTime').value;

  if(!name || !date || !time){
    alert('Заполните все поля!');
    return;
  }

  fetch(SPREADSHEET_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'add', name, car, radius, service, date, time }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    if(data.result === 'success'){
      alert('Запись добавлена!');
      document.getElementById('guestName').value = '';
      loadFutureRecords();
    } else {
      alert(data.message || 'Ошибка добавления');
    }
  })
  .catch(e => alert('Ошибка сети'));
}

// ==== Загрузка будущих записей ====
function loadFutureRecords() {
  fetch(SPREADSHEET_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'list' }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    futureRecordsDiv.innerHTML = '';
    const now = new Date();
    data.records.forEach(r => {
      const recDate = new Date(r.date + ' ' + r.time);
      if(recDate >= now){
        const div = document.createElement('div');
        div.className = 'record';
        div.innerText = `${r.date} ${r.time} | ${r.name} | ${r.car} | ${r.radius} | ${r.service}`;
        futureRecordsDiv.appendChild(div);
      }
    });
  });
}

// ==== Инициализация ====
loadFutureRecords();

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwkWctotFr9nlRRhNxfUPUfdOKR41he7NvrhgLU8iNF5YF82jlx6Y9Fata5eiP6tmPbjw/exec';

document.getElementById('guestDate').min = new Date().toISOString().split('T')[0];

// ====== Заполняем слоты по времени ======
function fillTimeSelect() {
  const select = document.getElementById('guestTime');
  select.innerHTML = '';
  for(let h=8; h<17; h++){
    select.innerHTML += `<option>${h}:00</option>`;
    select.innerHTML += `<option>${h}:50</option>`;
  }
}
fillTimeSelect();

// ====== Добавление записи ======
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

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'addRecord', 
      name, car, radius, service, date, time 
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      alert('Запись добавлена!');
      loadRecords();
    } else {
      alert(data.message || 'Ошибка добавления записи');
    }
  })
  .catch(err => {
    console.error(err);
    alert('Ошибка сети');
  });
}

// ====== Загрузка будущих записей ======
function loadRecords(){
  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getRecords' }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById('recordsList');
    list.innerHTML = '';
    const today = new Date();
    data.records.forEach(r => {
      const recDate = new Date(r.date + ' ' + r.time);
      if(recDate >= today){
        const div = document.createElement('div');
        div.className = 'record';
        div.innerText = `${r.date} ${r.time} | ${r.name} | ${r.car} | ${r.radius} | ${r.service}`;
        list.appendChild(div);
      }
    });
  })
  .catch(err => console.error(err));
}

// ====== Инициализация ======
loadRecords();

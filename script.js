const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwkWctotFr9nlRRhNxfUPUfdOKR41he7NvrhgLU8iNF5YF82jlx6Y9Fata5eiP6tmPbjw/exec';

// ====== Время ======
function fillTimeSelect() {
  const select = document.getElementById('guestTime');
  select.innerHTML = '';
  for (let h = 8; h < 17; h++) {
    select.innerHTML += `<option>${h}:00</option>`;
    select.innerHTML += `<option>${h}:50</option>`;
  }
}
fillTimeSelect();

// ====== Минимальная дата ======
document.getElementById('guestDate').min = new Date().toISOString().split('T')[0];

// ====== Добавление брони ======
function addGuestRecord() {
  const name = document.getElementById('guestName').value.trim();
  const car = document.getElementById('guestCarType').value;
  const radius = document.getElementById('radiusSelect').value;
  const service = document.getElementById('serviceSelect').value;
  const date = document.getElementById('guestDate').value;
  const time = document.getElementById('guestTime').value;

  if (!name || !date || !time) {
    alert('Заполните все поля!');
    return;
  }

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'addRecord', name, car, radius, service, date, time }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    if(data.status === 'success') alert('Запись добавлена!');
    else alert('Ошибка при добавлении записи');
  })
  .catch(err => alert('Ошибка сети'));
}

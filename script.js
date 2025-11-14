// Функция отправки брони
function bookFormSubmit() {
  const name = document.getElementById('name').value;
  const car = document.getElementById('car').value;
  const radius = document.getElementById('radius').value;
  const service = document.getElementById('service').value;
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;

  fetch('https://script.google.com/macros/s/ТВОЙ_ID_РАЗВЕРТЫВАНИЯ/exec?action=book&name=' + encodeURIComponent(name) +
        '&car=' + encodeURIComponent(car) +
        '&radius=' + encodeURIComponent(radius) +
        '&service=' + encodeURIComponent(service) +
        '&date=' + encodeURIComponent(date) +
        '&time=' + encodeURIComponent(time))
    .then(res => res.text())
    .then(res => {
      if (res === 'OK') {
        alert('Бронирование успешно!');
        loadBookings(); // обновляем список брони
      } else {
        alert(res);
      }
    });
}

// Функция загрузки будущих бронирований
function loadBookings() {
  fetch('https://script.google.com/macros/s/ТВОЙ_ID_РАЗВЕРТЫВАНИЯ/exec?action=get')
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('bookings');
      list.innerHTML = '';
      data.forEach(b => {
        const li = document.createElement('li');
        li.textContent = `${b.date} ${b.time} — ${b.name} (${b.car}, ${b.radius}) ${b.service}`;
        list.appendChild(li);
      });
    });
}

// Загружаем список бронирований при открытии страницы
window.onload = loadBookings;

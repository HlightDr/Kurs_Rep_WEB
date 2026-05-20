// Функция показа кастомного alert
function showAlert(message, title = 'Уведомление') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlert');
        const titleEl = document.getElementById('alertTitle');
        const msgEl = document.getElementById('alertMessage');
        const closeBtn = document.getElementById('alertClose');
        const okBtn = document.getElementById('alertOk');
        titleEl.innerText = title;
        msgEl.innerText = message;
        modal.classList.remove('hidden');
        const hide = () => {
            modal.classList.add('hidden');
            resolve();
        };
        closeBtn.onclick = hide;
        okBtn.onclick = hide;
    });
}

// Загрузка списка устройств из localStorage
function loadRecorders() {
    const stored = localStorage.getItem('recorders');
    return stored ? JSON.parse(stored) : [];
}

// Сохранение списка устройств в localStorage
function saveRecorders(recorders) {
    localStorage.setItem('recorders', JSON.stringify(recorders));
}

// Добавление устройства в таблицу (динамически)
function addRecorderToTable(recorder) {
    const tbody = document.querySelector('.table-container tbody');
    const row = tbody.insertRow();
    row.innerHTML = `
        <td class="device-model">${escapeHtml(recorder.model)}</td>
        <td class="serial-number">${escapeHtml(recorder.sn)}</td>
        <td class="date">${recorder.date}</td>
        <td><button class="view-history-button" data-sn="${escapeHtml(recorder.sn)}" data-model="${escapeHtml(recorder.model)}">Посмотреть историю ремонта</button></td>
    `;
    // Привязать обработчик к новой кнопке
    const btn = row.querySelector('.view-history-button');
    // В обработчике кнопки "Посмотреть историю ремонта"
btn.addEventListener('click', function(e) {
    e.preventDefault();
    const sn = this.getAttribute('data-sn') || row.querySelector('.serial-number')?.innerText;
    const model = this.getAttribute('data-model') || row.querySelector('.device-model')?.innerText;
    if (sn && model) {
        window.location.href = `repair-log.html?sn=${encodeURIComponent(sn)}&model=${encodeURIComponent(model)}&from=recorders`;
    }
});
}

// Инициализация таблицы: если хранилище пусто, заполняем начальными данными из статики
function initTable() {
    let recorders = loadRecorders();
    if (recorders.length === 0) {
        // Извлекаем данные из существующих строк таблицы
        const rows = document.querySelectorAll('.table-container tbody tr');
        rows.forEach(row => {
            const model = row.querySelector('.device-model')?.innerText;
            const sn = row.querySelector('.serial-number')?.innerText;
            const date = row.querySelector('.date')?.innerText;
            if (model && sn && date) {
                recorders.push({ model, sn, date });
            }
        });
        saveRecorders(recorders);
    }
    // Очищаем tbody и заполняем из recorders
    const tbody = document.querySelector('.table-container tbody');
    tbody.innerHTML = '';
    recorders.forEach(rec => addRecorderToTable(rec));
}

// Обработчик отправки формы
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serialInput = document.getElementById('serialNumber');
    const serial = serialInput.value.trim();
    if (!serial) {
        await showAlert('Введите серийный номер', 'Ошибка');
        return;
    }
    const recorders = loadRecorders();
    if (recorders.some(r => r.sn === serial)) {
        await showAlert('Устройство с таким серийным номером уже зарегистрировано', 'Ошибка');
        return;
    }
    
    // Определяем модель по префиксу
    let model = 'Неизвестное устройство';
    if (serial.startsWith('DL200')) model = 'DataLogger DL-200';
    else if (serial.startsWith('VM450')) model = 'VibroMaster VM-450';
    else if (serial.startsWith('T12')) model = 'ThermoRec T-12';
    else if (serial.startsWith('SL3')) model = 'SpyderLog SL-3';
    
    const now = new Date();
    const date = now.toLocaleDateString('ru-RU');
    const newRecorder = { model, sn: serial, date };
    
    recorders.push(newRecorder);
    saveRecorders(recorders);
    addRecorderToTable(newRecorder);
    serialInput.value = '';
    document.getElementById('modal-toggle').checked = false;
    await showAlert(`Устройство ${model} (${serial}) успешно добавлено`, 'Успех');
});

// Обработчики для кнопок "Посмотреть историю ремонта" (уже есть, но добавим ещё раз на случай новых)
function attachHistoryButtons() {
    document.querySelectorAll('.view-history-button').forEach(btn => {
        // Убираем старые обработчики, чтобы не дублировать
        btn.removeEventListener('click', btn._listener);
        const handler = function(e) {
            e.preventDefault();
            const sn = this.getAttribute('data-sn') || this.closest('tr').querySelector('.serial-number')?.innerText;
            const model = this.getAttribute('data-model') || this.closest('tr').querySelector('.device-model')?.innerText;
            if (sn && model) {
                window.location.href = `repair-log.html?sn=${encodeURIComponent(sn)}&model=${encodeURIComponent(model)}`;
            }
        };
        btn._listener = handler;
        btn.addEventListener('click', handler);
    });
}

// Вызываем привязку после инициализации таблицы
function refresh() {
    attachHistoryButtons();
}

// Инициализация
initTable();
refresh();

// Вспомогательная функция для защиты от XSS
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
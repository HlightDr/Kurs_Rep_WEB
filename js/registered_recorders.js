(function checkAuth() {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'admin') {
        window.location.href = 'login.html';
    }
})();

function showPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.remove('hidden');
}
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.add('hidden');
}

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

async function loadRecorders() {
    showPreloader();
    try {
        const response = await fetch('http://localhost:3000/recorders');
        const recorders = await response.json();
        const tbody = document.querySelector('.table-container tbody');
        tbody.innerHTML = '';
        recorders.forEach(rec => addRecorderToTable(rec));
        attachHistoryButtons();
    } catch (error) {
        console.error('Ошибка загрузки регистраторов:', error);
        await showAlert('Не удалось загрузить список устройств', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

function addRecorderToTable(recorder) {
    const tbody = document.querySelector('.table-container tbody');
    const row = tbody.insertRow();
    const org = recorder.owner || '';
    row.innerHTML = `
        <td class="device-model">${escapeHtml(recorder.model)}</td>
        <td class="serial-number">${escapeHtml(recorder.sn)}</td>
        <td class="owner">${escapeHtml(org)}</td>
        <td class="date">${recorder.date}</td>
        <td><button class="view-history-button" data-sn="${escapeHtml(recorder.sn)}" data-model="${escapeHtml(recorder.model)}">Посмотреть историю ремонта</button></td>
    `;
    const btn = row.querySelector('.view-history-button');
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const sn = btn.getAttribute('data-sn');
        const model = btn.getAttribute('data-model');
        window.location.href = `repair-log.html?sn=${encodeURIComponent(sn)}&model=${encodeURIComponent(model)}&from=recorders`;
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serialInput = document.getElementById('serialNumber');
    const serial = serialInput.value.trim();
    if (!serial) {
        await showAlert('Введите серийный номер', 'Ошибка');
        return;
    }
    showPreloader();
    try {
        const resp = await fetch('http://localhost:3000/recorders');
        const recorders = await resp.json();
        if (recorders.some(r => r.sn === serial)) {
            await showAlert('Устройство с таким серийным номером уже зарегистрировано', 'Ошибка');
            return;
        }
        let model = 'Неизвестное устройство';
        if (serial.startsWith('DL200')) model = 'DataLogger DL-200';
        else if (serial.startsWith('VM450')) model = 'VibroMaster VM-450';
        else if (serial.startsWith('T12')) model = 'ThermoRec T-12';
        else if (serial.startsWith('SL3')) model = 'SpyderLog SL-3';
        const owner = 'Новый пользователь';
        const now = new Date();
        const date = now.toLocaleDateString('ru-RU');
        const newRecorder = { model, sn: serial, owner, date };
        const response = await fetch('http://localhost:3000/recorders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecorder)
        });
        if (response.ok) {
            const added = await response.json();
            addRecorderToTable(added);
            serialInput.value = '';
            document.getElementById('modal-toggle').checked = false;
            await showAlert(`Устройство ${model} (${serial}) успешно добавлено`, 'Успех');
        } else {
            await showAlert('Ошибка при добавлении', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    } finally {
        hidePreloader();
    }
});

function attachHistoryButtons() {
    document.querySelectorAll('.view-history-button').forEach(btn => {
        btn.removeEventListener('click', btn._listener);
        const handler = (e) => {
            e.preventDefault();
            const sn = btn.getAttribute('data-sn') || btn.closest('tr').querySelector('.serial-number')?.innerText;
            const model = btn.getAttribute('data-model') || btn.closest('tr').querySelector('.device-model')?.innerText;
            if (sn && model) {
                window.location.href = `repair-log.html?sn=${encodeURIComponent(sn)}&model=${encodeURIComponent(model)}&from=recorders`;
            }
        };
        btn._listener = handler;
        btn.addEventListener('click', handler);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'customer_dashboard.html';
        });
    }
    loadRecorders();
});

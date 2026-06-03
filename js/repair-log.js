(function checkAuth() {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'admin') {
        window.location.href = 'login.html';
    }
})();

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sn = urlParams.get('sn');
    const model = urlParams.get('model');
    const from = urlParams.get('from');

    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.removeAttribute('onclick');
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (from === 'customer') {
                window.location.href = 'customer_dashboard.html';
            } else if (from === 'recorders') {
                window.location.href = 'registered_recorders.html';
            } else {
                window.location.href = 'customer_dashboard.html';
            }
        });
    }

    if (sn && model) {
        document.querySelector('h1').innerHTML = `${model} <span class="serial">(Серийный №: ${sn})</span>`;
    } else {
        document.querySelector('h1').innerHTML = 'История ремонтов';
    }

    let allRequests = [];
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        allRequests = await response.json();
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        document.querySelector('.timeline-items').innerHTML = '<p>Ошибка загрузки данных</p>';
        return;
    }

    const deviceRequests = allRequests.filter(req => req.deviceSn === sn);
    const timelineContainer = document.getElementById('timelineItems');
    timelineContainer.innerHTML = '';

    if (deviceRequests.length === 0) {
        timelineContainer.innerHTML = '<div class="empty-state"><p>Нет ремонтов для этого устройства</p></div>';
        return;
    }

    deviceRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    deviceRequests.forEach(req => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        const statusClass = req.status === 'completed' ? 'status-completed' :
                            req.status === 'in-progress' ? 'status-in-progress' : 'status-waiting';
        const statusText = req.status === 'completed' ? 'Завершено' :
                           req.status === 'in-progress' ? 'В процессе' : 'Ожидание';

        item.innerHTML = `
            <div class="timeline-dot-container"><div class="timeline-dot"></div></div>
            <div class="repair-card">
                <div class="repair-header">
                    <svg class="icon"><use href="#icon-doc"/></svg>
                    <h3 class="repair-id">${escapeHtml(req.id)}</h3>
                </div>
                <div class="repair-date">
                    <svg class="icon"><use href="#icon-calendar"/></svg>
                    <time>${new Date(req.createdAt).toLocaleDateString('ru-RU')}</time>
                </div>
                <p class="repair-issue"><span class="label">Проблема:</span> ${escapeHtml(req.problem)}</p>
                <div class="status-container"><span class="status-badge ${statusClass}">${statusText}</span></div>
                <button class="view-details" data-id="${req.id}">Подробнее →</button>
            </div>
        `;
        timelineContainer.appendChild(item);
    });

    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', () => {
            const repairId = btn.getAttribute('data-id');
            if (repairId) window.location.href = `repair-request.html?id=${encodeURIComponent(repairId)}`;
        });
    });
});

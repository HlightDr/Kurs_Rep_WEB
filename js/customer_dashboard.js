(function checkAuth() {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'customer' && role !== 'admin') {
        window.location.href = 'login.html';
    }
})();

document.querySelector('.btn-primary').addEventListener('click', () => {
    window.location.href = 'new-repair-request.html';
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getStatusText(status) {
    switch (status) {
        case 'pending_review': return 'На рассмотрении';
        case 'in-progress': return 'В работе';
        case 'pending': return 'Ожидание';
        case 'completed': return 'Завершено';
        default: return status;
    }
}

function createRequestItem(req) {
    const item = document.createElement('div');
    item.className = 'request-item';
    item.setAttribute('data-id', req.id);
    const deviceName = req.deviceModel || req.device || 'Устройство';
    item.innerHTML = `
        <div class="request-header">
            <div class="request-device"><span class="recorder-name">${escapeHtml(deviceName)}</span></div>
            <span class="status-badge status-blue">${getStatusText(req.status)}</span>
        </div>
        <div class="request-problem">${escapeHtml(req.problem)}</div>
        <div class="request-footer">
            <span class="request-id">ID: ${escapeHtml(req.id)}</span>
            <div class="deadline"><span>Готовность: —</span></div>
        </div>
    `;
    item.addEventListener('click', () => {
        window.location.href = `repair-request.html?id=${encodeURIComponent(req.id)}`;
    });
    return item;
}

async function loadRecorders() {
    try {
        const response = await fetch('http://localhost:3000/recorders');
        const allRecorders = await response.json();
        const role = sessionStorage.getItem('userRole');
        const currentUser = sessionStorage.getItem('username') || 'Дмитрий Соколов';
        let myRecorders = [];
        if (role === 'admin') {
            myRecorders = allRecorders;
        } else {
            myRecorders = allRecorders.filter(r => r.ownerName === currentUser);
        }
        const recorderList = document.querySelector('.recorder-list');
        if (recorderList) {
            recorderList.innerHTML = '';
            myRecorders.forEach(rec => {
                const item = document.createElement('div');
                item.className = 'recorder-item';
                item.setAttribute('data-sn', rec.sn);
                item.setAttribute('data-model', rec.model);
                item.innerHTML = `
                    <div class="recorder-icon"><svg class="icon"><use href="#icon-activity"/></svg></div>
                    <div class="recorder-info">
                        <div class="recorder-name">${escapeHtml(rec.model)}</div>
                        <div class="recorder-sn">С/Н: ${escapeHtml(rec.sn)}</div>
                    </div>
                `;
                if (role === 'admin') {
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', () => {
                        window.location.href = `repair-log.html?sn=${encodeURIComponent(rec.sn)}&model=${encodeURIComponent(rec.model)}&from=customer`;
                    });
                } else {
                    item.style.cursor = 'default';
                }
                recorderList.appendChild(item);
            });
        }
        if (role !== 'admin') {
            window.userDeviceSnList = myRecorders.map(r => r.sn);
        } else {
            window.userDeviceSnList = null;
        }
    } catch (error) {
        console.error('Ошибка загрузки регистраторов:', error);
    }
}

async function loadActiveRequests() {
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        const allRequests = await response.json();
        const role = sessionStorage.getItem('userRole');
        let activeRequests = [];
        if (role === 'admin') {
            activeRequests = allRequests.filter(r => r.status !== 'completed');
        } else {
            if (!window.userDeviceSnList) {
                await loadRecorders();
            }
            const mySnList = window.userDeviceSnList || [];
            activeRequests = allRequests.filter(r => 
                mySnList.includes(r.deviceSn) && r.status !== 'completed'
            );
        }
        const container = document.getElementById('active-requests-container');
        if (container) {
            container.innerHTML = '';
            if (activeRequests.length === 0) {
                container.innerHTML = '<p>Нет активных заявок</p>';
            } else {
                activeRequests.forEach(req => {
                    container.appendChild(createRequestItem(req));
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

async function loadLastCompletedRepair() {
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        const allRequests = await response.json();
        const role = sessionStorage.getItem('userRole');
        let completed = [];
        if (role === 'admin') {
            completed = allRequests.filter(r => r.status === 'completed');
        } else {
            if (!window.userDeviceSnList) {
                await loadRecorders();
            }
            const mySnList = window.userDeviceSnList || [];
            completed = allRequests.filter(r => 
                mySnList.includes(r.deviceSn) && r.status === 'completed'
            );
        }
        if (completed.length === 0) return;
        completed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const last = completed[0];
        const repairTitleEl = document.querySelector('.repair-title');
        const repairDescEl = document.querySelector('.repair-description');
        const repairDateEl = document.querySelector('.repair-date span');
        const repairPriceEl = document.querySelector('.repair-price span');
        if (repairTitleEl) repairTitleEl.innerText = last.deviceModel;
        if (repairDescEl) repairDescEl.innerText = last.problem;
        if (repairDateEl) repairDateEl.innerText = new Date(last.createdAt).toLocaleDateString('ru-RU');
        if (repairPriceEl) repairPriceEl.innerText = (last.totalEstimate || 0).toLocaleString('ru-RU') + ' ₽';
        const repairCard = document.querySelector('.repair-completed');
        if (repairCard) {
            repairCard.style.cursor = 'pointer';
            repairCard.addEventListener('click', () => {
                window.location.href = `repair-request.html?id=${last.id}`;
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки последнего ремонта:', error);
    }
}

async function loadRecentMessages() {
    try {
        const role = sessionStorage.getItem('userRole');
        let myRequestIds = [];

        if (role === 'admin') {
            const requestsResp = await fetch('http://localhost:3000/repairRequests');
            const allRequests = await requestsResp.json();
            myRequestIds = allRequests.map(req => req.id);
        } else {
            if (!window.userDeviceSnList) {
                await loadRecorders();
            }
            const mySnList = window.userDeviceSnList || [];
            if (mySnList.length === 0) {
                document.getElementById('recent-messages-container').innerHTML = '<p>Нет сообщений</p>';
                return;
            }
            const requestsResp = await fetch('http://localhost:3000/repairRequests');
            const allRequests = await requestsResp.json();
            const myRequests = allRequests.filter(req => mySnList.includes(req.deviceSn));
            myRequestIds = myRequests.map(req => req.id);
        }

        if (myRequestIds.length === 0) {
            document.getElementById('recent-messages-container').innerHTML = '<p>Нет сообщений</p>';
            return;
        }

        const messagesResp = await fetch('http://localhost:3000/messages');
        const allMessages = await messagesResp.json();
        let myMessages = allMessages.filter(msg => myRequestIds.includes(msg.requestId));

        myMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recent = myMessages.slice(0, 3);

        const container = document.getElementById('recent-messages-container');
        if (container) {
            if (recent.length === 0) {
                container.innerHTML = '<p>Нет сообщений</p>';
                return;
            }
            container.innerHTML = '';
            recent.forEach(msg => {
                const messageItem = document.createElement('div');
                messageItem.className = `message-item ${!msg.read && msg.sender === 'support' ? 'message-highlight' : ''}`;
                messageItem.style.cursor = 'pointer';
                messageItem.addEventListener('click', () => {
                    window.location.href = `repair-request.html?id=${msg.requestId}`;
                });

                let displayName = msg.senderName;
                if (msg.sender === 'support') {
                    displayName = 'Служба поддержки';
                } else if (msg.sender === 'customer') {
                    displayName = msg.senderName || 'Клиент';
                }

                messageItem.innerHTML = `
                    <div class="message-meta">
                        <div class="message-sender">
                            <svg class="icon"><use href="#icon-message-square"/></svg>
                            <span class="recorder-name">${escapeHtml(displayName)}</span>
                            ${!msg.read && msg.sender === 'support' ? '<span class="unread-dot"></span>' : ''}
                        </div>
                        <div class="message-time"><span>${formatMessageTime(msg.timestamp)}</span></div>
                    </div>
                    <div class="message-text">${escapeHtml(msg.text)}</div>
                `;
                container.appendChild(messageItem);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        document.getElementById('recent-messages-container').innerHTML = '<p>Ошибка загрузки</p>';
    }
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} минут назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} часов назад`;
    return date.toLocaleDateString('ru-RU');
}

function showAdminButton() {
    const role = sessionStorage.getItem('userRole');
    if (role === 'admin') {
        const btn = document.getElementById('gotoAdminBtn');
        if (btn) {
            btn.style.display = 'block';
            btn.addEventListener('click', () => {
                window.location.href = 'admin-panel.html';
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadRecorders();
    await loadActiveRequests();
    await loadLastCompletedRepair();
    await loadRecentMessages();  
    showAdminButton();

    const recordersLink = document.getElementById('recordersLink');
if (recordersLink) {
    const role = sessionStorage.getItem('userRole');
    if (role === 'admin') {
        recordersLink.style.cursor = 'pointer';
        recordersLink.addEventListener('click', () => {
            window.location.href = 'registered_recorders.html';
        });
    } else {
        recordersLink.style.cursor = 'default';
    }
}
});


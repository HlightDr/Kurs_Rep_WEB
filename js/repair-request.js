(function checkAuth() {
    if (!sessionStorage.getItem('userRole')) {
        window.location.href = 'login.html';
    }
})();

let currentRequestId = null;
let currentRequestData = null;
let isAdmin = false;

function formatPrice(price) {
    return price.toLocaleString('ru-RU') + ' ₽';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function loadSparePartsFromServer() {
    try {
        const response = await fetch('http://localhost:3000/spareParts');
        const parts = await response.json();
        const select = document.getElementById('parts-select');
        if (select) {
            select.innerHTML = '';
            parts.forEach(part => {
                const option = document.createElement('option');
                option.value = part.price;
                option.textContent = `${part.name} (${part.price.toLocaleString('ru-RU')} ₽)`;
                select.appendChild(option);
            });
        }
        return parts;
    } catch (error) {
        console.error('Ошибка загрузки запчастей:', error);
        return [];
    }
}

async function loadWorkTypesFromServer() {
    try {
        const response = await fetch('http://localhost:3000/workTypes');
        const works = await response.json();
        const select = document.getElementById('work-select');
        if (select) {
            select.innerHTML = '';
            works.forEach(work => {
                const option = document.createElement('option');
                option.value = work.price;
                option.textContent = `${work.name} (${work.price.toLocaleString('ru-RU')} ₽)`;
                select.appendChild(option);
            });
        }
        return works;
    } catch (error) {
        console.error('Ошибка загрузки типов работ:', error);
        return [];
    }
}

async function loadFaultCausesFromServer() {
    try {
        const response = await fetch('http://localhost:3000/faultCauses');
        const causes = await response.json();
        const select = document.getElementById('fault-causes-select');
        if (select) {
            select.innerHTML = '';
            causes.forEach(cause => {
                const option = document.createElement('option');
                option.value = cause.name;
                option.textContent = cause.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки причин поломок:', error);
    }
}

async function loadRequestById(id) {
    try {
        const response = await fetch(`http://localhost:3000/repairRequests/${id}`);
        if (!response.ok) throw new Error('Заявка не найдена');
        const request = await response.json();
        currentRequestData = request;
        currentRequestId = id;

        document.querySelector('.header h1').innerText = `Заявка на ремонт ${request.id}`;
        const statusBadge = document.querySelector('.header .status-badge');
        if (statusBadge) {
            let statusText = '';
            switch (request.status) {
                case 'pending_review': statusText = 'На рассмотрении'; break;
                case 'in-progress': statusText = 'В работе'; break;
                case 'pending': statusText = 'Ожидание'; break;
                case 'completed': statusText = 'Завершено'; break;
                default: statusText = request.status;
            }
            statusBadge.innerText = statusText;
        }

        const infoRows = document.querySelectorAll('.info-row');
        if (infoRows.length >= 3) {
            const modelSpan = infoRows[0].querySelectorAll('.info-value')[1] || infoRows[0].querySelectorAll('.info-value')[0];
            if (modelSpan) modelSpan.innerText = request.deviceModel || request.device || '';
            const serialSpan = infoRows[1].querySelectorAll('.info-value')[1] || infoRows[1].querySelectorAll('.info-value')[0];
            if (serialSpan) serialSpan.innerText = request.deviceSn || '';
            const problemSpan = infoRows[2].querySelectorAll('.info-value')[1] || infoRows[2].querySelectorAll('.info-value')[0];
            if (problemSpan) problemSpan.innerText = request.problem;
        }

        const diagnosticTextEl = document.querySelector('.diagnostic-text');
        if (diagnosticTextEl && request.diagnosticText) {
            diagnosticTextEl.innerHTML = `<strong>Диагностика завершена:</strong> ${escapeHtml(request.diagnosticText)}`;
        }

        const photoInput = document.getElementById('photo-url');
        if (photoInput && request.photoUrl) photoInput.value = request.photoUrl;
        const videoInput = document.getElementById('video-url');
        if (videoInput && request.videoUrl) videoInput.value = request.videoUrl;

        if (request.selectedFaultCauses && request.selectedFaultCauses.length) {
            const causeSelect = document.getElementById('fault-causes-select');
            if (causeSelect) {
                Array.from(causeSelect.options).forEach(opt => {
                    opt.selected = request.selectedFaultCauses.includes(opt.value);
                });
            }
        }

        if (request.selectedParts && request.selectedParts.length) {
            const partsSelect = document.getElementById('parts-select');
            if (partsSelect) {
                Array.from(partsSelect.options).forEach(opt => {
                    const partName = opt.textContent.split('(')[0].trim();
                    const found = request.selectedParts.find(p => p.name === partName);
                    if (found) opt.selected = true;
                });
            }
        }

        if (request.selectedWork) {
            const workSelect = document.getElementById('work-select');
            if (workSelect) {
                Array.from(workSelect.options).forEach(opt => {
                    const workName = opt.textContent.split('(')[0].trim();
                    if (workName === request.selectedWork.name) {
                        opt.selected = true;
                    }
                });
            }
        }

        if (request.timelineState && request.timelineState.length === 6) {
            localStorage.setItem('repairTimelineState', JSON.stringify(request.timelineState));
            loadTimelineState();
        }

        updateCost();
        renderFinalCostTable();

    } catch (error) {
        console.error(error);
        await showAlert('Заявка не найдена', 'Ошибка');
        window.location.href = 'customer_dashboard.html';
    }
}

async function saveCurrentRequest() {
    if (!currentRequestId) return;

    const selectedFaultCauses = [];
    const causeSelect = document.getElementById('fault-causes-select');
    if (causeSelect) {
        for (let opt of causeSelect.options) {
            if (opt.selected) selectedFaultCauses.push(opt.value);
        }
    }

    const selectedParts = [];
    const partsSelect = document.getElementById('parts-select');
    if (partsSelect) {
        for (let opt of partsSelect.options) {
            if (opt.selected) {
                const name = opt.textContent.split('(')[0].trim();
                const price = parseInt(opt.value);
                selectedParts.push({ name, price });
            }
        }
    }

    const workSelect = document.getElementById('work-select');
    let selectedWork = null;
    if (workSelect) {
        const fullText = workSelect.options[workSelect.selectedIndex].textContent;
        const name = fullText.replace(/\s*\([\d\s]+₽\)\s*$/, '').trim();
        const price = parseInt(workSelect.value);
        selectedWork = { name, price };
    }

    const partsTotal = selectedParts.reduce((sum, p) => sum + p.price, 0);
    const workCost = selectedWork ? selectedWork.price : 0;
    const totalEstimate = partsTotal + workCost;

    let timelineState = null;
    const savedTimeline = localStorage.getItem('repairTimelineState');
    if (savedTimeline) {
        timelineState = JSON.parse(savedTimeline);
    }

    const updateData = {
        selectedFaultCauses,
        selectedParts,
        selectedWork,
        partsTotal,
        workCost,
        totalEstimate,
        timelineState
    };

    try {
        await fetch(`http://localhost:3000/repairRequests/${currentRequestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        console.log('Сохранено на сервер');
    } catch (error) {
        console.error('Ошибка сохранения', error);
    }
}

function updateCost() {
    const partsSelect = document.getElementById('parts-select');
    let partsTotal = 0;
    if (partsSelect) {
        for (let option of partsSelect.options) if (option.selected) partsTotal += parseInt(option.value);
    }
    const workSelect = document.getElementById('work-select');
    let workCost = workSelect ? parseInt(workSelect.value) : 3000;
    document.getElementById('parts-total').textContent = formatPrice(partsTotal);
    document.getElementById('work-cost').textContent = formatPrice(workCost);
    document.getElementById('total-estimate').textContent = formatPrice(partsTotal + workCost);
}

function renderFinalCostTable() {
    const container = document.getElementById('final-cost-table-container');
    if (!container) return;

    const partsSelect = document.getElementById('parts-select');
    const workSelect = document.getElementById('work-select');
    let parts = [], work = null;

    if (partsSelect) {
        for (let opt of partsSelect.options) {
            if (opt.selected) {
                const name = opt.textContent.split('(')[0].trim();
                const price = parseInt(opt.value);
                parts.push({ name, price });
            }
        }
    }
    if (workSelect) {
        const fullText = workSelect.options[workSelect.selectedIndex].textContent;
        const name = fullText.replace(/\s*\([\d\s]+₽\)\s*$/, '').trim();
        const price = parseInt(workSelect.value);
        work = { name, price };
    }

    let rowsHtml = '';
    if (parts.length > 0) {
        rowsHtml += '<tr class="section-header"><td colspan="2" class="font-medium">Запчасти</td></tr>';
        parts.forEach(part => {
            rowsHtml += `<tr><td class="indent">${escapeHtml(part.name)}</td><td class="text-right">${formatPrice(part.price)}</td></tr>`;
        });
    }
    if (work) {
        rowsHtml += '<tr class="section-header"><td colspan="2" class="font-medium">Работа</td></tr>';
        rowsHtml += `<tr><td class="indent">${escapeHtml(work.name)}</td><td class="text-right">${formatPrice(work.price)}</td></tr>`;
    }
    const total = parts.reduce((s, p) => s + p.price, 0) + (work ? work.price : 0);
    rowsHtml += `<tr class="total-row"><td>Итого</td><td class="text-right">${formatPrice(total)}</td></tr>`;

    const tableHtml = `<table class="cost-table"><thead><tr><th>Наименование</th><th class="text-right">Цена</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
    container.innerHTML = tableHtml;
}

function getTimelineSteps() {
    return document.querySelectorAll('.timeline-step');
}
function saveTimelineState() {
    const steps = getTimelineSteps();
    const state = [];
    steps.forEach(step => {
        const dot = step.querySelector('.timeline-dot');
        if (dot.classList.contains('completed')) state.push('completed');
        else if (dot.classList.contains('active')) state.push('active');
        else state.push('pending');
    });
    localStorage.setItem('repairTimelineState', JSON.stringify(state));
    if (currentRequestId && isAdmin) {
        saveCurrentRequest(); 
    }
}
function loadTimelineState() {
    const saved = localStorage.getItem('repairTimelineState');
    if (!saved) return;
    const state = JSON.parse(saved);
    const steps = getTimelineSteps();
    steps.forEach((step, idx) => {
        const dot = step.querySelector('.timeline-dot');
        const line = step.querySelector('.timeline-line');
        const label = step.querySelector('.timeline-label');
        dot.classList.remove('completed', 'active', 'pending');
        if (line) line.classList.remove('completed', 'pending');
        label.classList.remove('completed', 'active', 'pending');
        dot.classList.add(state[idx]);
        if (line) {
            if (state[idx] === 'completed' || (idx > 0 && state[idx-1] === 'completed')) {
                line.classList.add('completed');
                line.classList.remove('pending');
            } else {
                line.classList.add('pending');
                line.classList.remove('completed');
            }
        }
        label.classList.add(state[idx]);
        if (state[idx] === 'active') {
            const svg = dot.querySelector('svg');
            if (svg) svg.remove();
            if (!dot.querySelector('.inner-dot')) {
                const inner = document.createElement('div');
                inner.className = 'inner-dot';
                dot.appendChild(inner);
            }
        } else if (state[idx] === 'completed') {
            const inner = dot.querySelector('.inner-dot');
            if (inner) inner.remove();
            if (!dot.querySelector('svg')) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute('class', 'icon checkmark');
                svg.setAttribute('viewBox', '0 0 24 24');
                const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                polyline.setAttribute('points', '20 6 9 17 4 12');
                svg.appendChild(polyline);
                dot.appendChild(svg);
            }
        } else {
            const inner = dot.querySelector('.inner-dot');
            if (inner) inner.remove();
            const svg = dot.querySelector('svg');
            if (svg) svg.remove();
        }
    });
    checkAllStepsCompleted();
}
function makeTimelineInteractive() {
    if (!isAdmin) return;
    const steps = getTimelineSteps();
    steps.forEach(step => {
        step.style.cursor = 'pointer';
        step.addEventListener('click', (e) => {
            e.stopPropagation();
            const dot = step.querySelector('.timeline-dot');
            let currentState = dot.classList.contains('completed') ? 'completed' :
                               dot.classList.contains('active') ? 'active' : 'pending';
            let newState;
            if (currentState === 'pending') newState = 'active';
            else if (currentState === 'active') newState = 'completed';
            else newState = 'pending';
            dot.classList.remove('completed', 'active', 'pending');
            dot.classList.add(newState);
            const label = step.querySelector('.timeline-label');
            label.classList.remove('completed', 'active', 'pending');
            label.classList.add(newState);
            saveTimelineState(); 
        });
    });
}
function checkAllStepsCompleted() {
    const steps = getTimelineSteps();
    const allCompleted = Array.from(steps).every(step => {
        const dot = step.querySelector('.timeline-dot');
        return dot && dot.classList.contains('completed');
    });
    const timelineContainer = document.querySelector('.timeline');
    const statusBadge = document.querySelector('.status-badge');
    const timelineCard = document.querySelector('.timeline-card');
    if (allCompleted) {
        timelineContainer.classList.add('all-completed');
        if (statusBadge && statusBadge.innerText !== 'Завершено') {
            statusBadge.textContent = 'Выполнено';
            statusBadge.classList.add('completed');
        }
        if (timelineCard) timelineCard.classList.add('completed');
    } else {
        timelineContainer.classList.remove('all-completed');
        if (timelineCard) timelineCard.classList.remove('completed');
    }
}

function showAlert(message, title = 'Уведомление') {
    return new Promise((resolve) => {
        const modal = document.getElementById('alertModal');
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
function showConfirm(message, title = 'Подтверждение') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const closeBtn = document.getElementById('confirmClose');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');
        titleEl.innerText = title;
        msgEl.innerText = message;
        modal.classList.remove('hidden');
        const cleanup = () => modal.classList.add('hidden');
        yesBtn.onclick = () => { cleanup(); resolve(true); };
        noBtn.onclick = () => { cleanup(); resolve(false); };
        closeBtn.onclick = () => { cleanup(); resolve(false); };
    });
}
function showPrompt(message, defaultValue = '', title = 'Ввод данных') {
    return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const msgEl = document.getElementById('promptMessage');
        const input = document.getElementById('promptInput');
        const closeBtn = document.getElementById('promptClose');
        const okBtn = document.getElementById('promptOk');
        const cancelBtn = document.getElementById('promptCancel');
        titleEl.innerText = title;
        msgEl.innerText = message;
        input.value = defaultValue;
        modal.classList.remove('hidden');
        input.focus();
        const cleanup = () => modal.classList.add('hidden');
        okBtn.onclick = () => { cleanup(); resolve(input.value); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
        closeBtn.onclick = () => { cleanup(); resolve(null); };
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                cleanup();
                resolve(input.value);
            }
        });
    });
}

let currentMessages = [];

async function loadMessages(requestId) {
    try {
        const response = await fetch('http://localhost:3000/messages');
        const allMessages = await response.json();
        const filtered = allMessages.filter(msg => msg.requestId === requestId);
        filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        currentMessages = filtered;
        renderMessages(filtered);
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

function renderMessages(messages) {
    console.log('renderMessages called, count:', messages.length);
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) {
        console.error('chatMessages element not found!');
        return;
    }
    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender === 'customer' ? 'customer' : 'support'}`;
        messageDiv.innerHTML = `
            <div class="message-bubble">
                <p class="message-text">${escapeHtml(msg.text)}</p>
            </div>
            <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        `;
        messagesContainer.appendChild(messageDiv);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    console.log('Messages rendered');
}

async function sendMessage(requestId, text) {
    if (!text.trim()) return;
    const role = sessionStorage.getItem('userRole');
    const sender = (role === 'admin') ? 'support' : 'customer';
    const senderName = (role === 'admin') ? 'Служба поддержки' : (sessionStorage.getItem('username') || 'Клиент');
    const newMessage = {
        requestId: requestId,
        sender: sender,
        senderName: senderName,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        read: false
    };
    try {
        const response = await fetch('http://localhost:3000/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMessage)
        });
        if (response.ok) {
            const saved = await response.json();
            currentMessages.push(saved);
            renderMessages(currentMessages);
            document.getElementById('chatInput').value = '';
        } else {
            console.error('Ошибка отправки');
        }
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
    }
}

function initChat() {
    const chatToggle = document.getElementById('chatToggle');
    const chatContainer = document.getElementById('chatContainer');
    const chatClose = document.getElementById('chatClose');
    const chatSend = document.getElementById('chatSend');
    const chatInput = document.getElementById('chatInput');

    if (!chatToggle || !chatContainer) return;

    chatContainer.classList.add('hidden');
    chatToggle.style.display = 'flex';

    chatToggle.addEventListener('click', () => {
        chatContainer.classList.remove('hidden');
        chatToggle.style.display = 'none';
        if (currentRequestId && currentMessages.length === 0) {
            loadMessages(currentRequestId);
        }
    });

    chatClose.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
        chatToggle.style.display = 'flex';
    });

    chatSend.addEventListener('click', () => {
        if (currentRequestId) {
            sendMessage(currentRequestId, chatInput.value);
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentRequestId) {
                sendMessage(currentRequestId, chatInput.value);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    const role = sessionStorage.getItem('userRole');
    isAdmin = (role === 'admin');
    const adminOnlyBlocks = document.querySelectorAll('.admin-only');
    if (!isAdmin) {
        adminOnlyBlocks.forEach(block => block.style.display = 'none');
    } else {
        adminOnlyBlocks.forEach(block => block.style.display = 'block');
    }

    await loadSparePartsFromServer();
    await loadWorkTypesFromServer();
    await loadFaultCausesFromServer();

    const partsSelect = document.getElementById('parts-select');
    const workSelect = document.getElementById('work-select');
    if (partsSelect && workSelect) {
        partsSelect.addEventListener('change', () => {
            updateCost();
            renderFinalCostTable();
            if (isAdmin) saveCurrentRequest();
        });
        workSelect.addEventListener('change', () => {
            updateCost();
            renderFinalCostTable();
            if (isAdmin) saveCurrentRequest();
        });
    }
    const causeSelect = document.getElementById('fault-causes-select');
    if (causeSelect) {
        causeSelect.addEventListener('change', () => {
            if (isAdmin) saveCurrentRequest();
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get('id');
    if (urlId) {
        await loadRequestById(urlId);
        await loadMessages(urlId);  
    } else {
        console.log('Нет ID заявки');
    }

    const savedTimeline = localStorage.getItem('repairTimelineState');
    if (savedTimeline) {
        loadTimelineState();
    } else {
        const defaultState = ['completed', 'completed', 'active', 'pending', 'pending', 'pending'];
        localStorage.setItem('repairTimelineState', JSON.stringify(defaultState));
        loadTimelineState();
    }
    makeTimelineInteractive();
    initChat();   

    document.querySelector('.back-button')?.addEventListener('click', () => {
        window.location.href = 'customer_dashboard.html';
    });

    const paymentModal = document.getElementById('paymentModal');
    const closePaymentBtn = document.getElementById('closePaymentBtn');
    const cancelPayBtn = document.getElementById('cancelPayBtn');
    const payConfirmBtn = document.getElementById('payConfirmBtn');

    function closePaymentModal() {
        paymentModal.classList.add('hidden');
    }

    document.querySelector('.approve-button').addEventListener('click', () => {
        paymentModal.classList.remove('hidden');
    });

    closePaymentBtn?.addEventListener('click', closePaymentModal);
    cancelPayBtn?.addEventListener('click', closePaymentModal);

    paymentModal?.addEventListener('click', (e) => {
        if (e.target === paymentModal) closePaymentModal();
    });

    payConfirmBtn?.addEventListener('click', async () => {
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const expiry = document.getElementById('cardExpiry').value;
        const cvv = document.getElementById('cardCvv').value;

        if (cardNumber.length < 16) {
            await showAlert('Введите корректный номер карты (16 цифр)', 'Ошибка');
            return;
        }
        if (!expiry.match(/^\d{2}\/\d{2}$/)) {
            await showAlert('Введите срок в формате ММ/ГГ', 'Ошибка');
            return;
        }
        if (!cvv.match(/^\d{3}$/)) {
            await showAlert('Введите CVV (3 цифры)', 'Ошибка');
            return;
        }

        await showAlert('Оплата успешно проведена!', 'Успех');
        closePaymentModal();
        
        window.location.href = 'customer_dashboard.html';
    });

});

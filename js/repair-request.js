function formatPrice(price) {
    return price.toLocaleString('ru-RU') + ' ₽';
}

// --- Получение выбранных запчастей (очищаем от цены в скобках) ---
function getSelectedPartsList() {
    const select = document.getElementById('parts-select');
    if (!select) return [];
    const selected = [];
    for (let option of select.options) {
        if (option.selected) {
            let name = option.textContent.split('(')[0].trim();
            selected.push({ name: name, price: parseInt(option.value) });
        }
    }
    return selected;
}

// --- Получение выбранной работы (очищаем от цены в скобках) ---
function getSelectedWork() {
    const select = document.getElementById('work-select');
    if (!select) return { name: 'Стандартный ремонт', price: 3000 };
    const fullText = select.options[select.selectedIndex].textContent;
    let name = fullText.replace(/\s*\([\d\s]+₽\)\s*$/, '').trim();
    return {
        name: name,
        price: parseInt(select.value)
    };
}

// --- Сохранение и загрузка из localStorage ---
function saveSelectionToLocalStorage() {
    const data = { parts: getSelectedPartsList(), work: getSelectedWork() };
    localStorage.setItem('repairEstimate', JSON.stringify(data));
}

function loadSelectionFromLocalStorage() {
    const saved = localStorage.getItem('repairEstimate');
    return saved ? JSON.parse(saved) : null;
}

// --- Обновление синего блока для администратора ---
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

// --- Отрисовка итоговой сметы ---
function renderFinalCostTable() {
    const container = document.getElementById('final-cost-table-container');
    if (!container) return;

    const adminOnlyBlock = document.querySelector('.admin-only');
    const isAdmin = adminOnlyBlock && window.getComputedStyle(adminOnlyBlock).display !== 'none';

    let parts = [], work = null;
    if (isAdmin) {
        parts = getSelectedPartsList();
        work = getSelectedWork();
        saveSelectionToLocalStorage();
    } else {
        const saved = loadSelectionFromLocalStorage();
        if (saved) {
            parts = saved.parts || [];
            work = saved.work || { name: 'Стандартный ремонт', price: 3000 };
        } else {
            parts = [];
            work = { name: 'Стандартный ремонт', price: 3000 };
        }
    }

    let rowsHtml = '';
    if (parts.length > 0) {
        rowsHtml += '<tr class="section-header"><td colspan="2" class="font-medium">Запчасти</td></tr>';
        parts.forEach(part => {
            rowsHtml += `<tr><td class="indent">${escapeHtml(part.name)}</td><td class="text-right">${formatPrice(part.price)}</td></tr>`;
        });
    }
    rowsHtml += '<tr class="section-header"><td colspan="2" class="font-medium">Работа</td></tr>';
    rowsHtml += `<tr><td class="indent">${escapeHtml(work.name)}</td><td class="text-right">${formatPrice(work.price)}</td></tr>`;
    const total = parts.reduce((s, p) => s + p.price, 0) + work.price;
    rowsHtml += `<tr class="total-row"><td>Итого</td><td class="text-right">${formatPrice(total)}</td></tr>`;

    const tableHtml = `<table class="cost-table"><thead><tr><th>Наименование</th><th class="text-right">Цена</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
    container.innerHTML = tableHtml;
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function updateAll() {
    updateCost();
    renderFinalCostTable();
}

// --- Чат ---
const chatToggle = document.getElementById('chatToggle');
const chatContainer = document.getElementById('chatContainer');
const chatClose = document.getElementById('chatClose');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
chatContainer.classList.add('hidden');
chatToggle.style.display = 'flex';
chatToggle.addEventListener('click', () => { chatContainer.classList.remove('hidden'); chatToggle.style.display = 'none'; });
chatClose.addEventListener('click', () => { chatContainer.classList.add('hidden'); chatToggle.style.display = 'flex'; });
chatSend.addEventListener('click', () => { const msg = chatInput.value.trim(); if (msg) { console.log('Sending:', msg); chatInput.value = ''; } });
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') chatSend.click(); });

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', function() {
    const partsSelect = document.getElementById('parts-select');
    const workSelect = document.getElementById('work-select');
    if (partsSelect && workSelect) {
        partsSelect.addEventListener('change', updateAll);
        workSelect.addEventListener('change', updateAll);
    }
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    if (!isAdmin) {
        document.querySelectorAll('.admin-only').forEach(block => block.style.display = 'none');
    }
    renderFinalCostTable();
    if (partsSelect && workSelect) updateCost();
});

// Кнопка "Назад"
document.querySelector('.back-button').addEventListener('click', function() {
    window.location.href = 'customer_dashboard.html';
});

// Кнопка "Одобрить и оплатить" (с модалкой)
document.querySelector('.approve-button').addEventListener('click', async function() {
    const confirmed = await showConfirm('Подтверждаете оплату?', 'Оплата');
    if (confirmed) {
        await showAlert('Оплата успешно проведена!', 'Успех');
        window.location.href = 'customer_dashboard.html';
    }
});

// Если передан параметр id, покажем его в заголовке
const urlId = new URLSearchParams(window.location.search).get('id');
if (urlId) {
    document.querySelector('.header h1').innerText = `Заявка на ремонт ${urlId}`;
}

// ========== УПРАВЛЕНИЕ ТАЙМЛАЙНОМ ==========
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
    const adminOnlyBlock = document.querySelector('.admin-only');
    const isAdmin = adminOnlyBlock && window.getComputedStyle(adminOnlyBlock).display !== 'none';
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
            if (newState === 'active') {
                const svg = dot.querySelector('svg');
                if (svg) svg.remove();
                if (!dot.querySelector('.inner-dot')) {
                    const inner = document.createElement('div');
                    inner.className = 'inner-dot';
                    dot.appendChild(inner);
                }
            } else if (newState === 'completed') {
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
            const label = step.querySelector('.timeline-label');
            label.classList.remove('completed', 'active', 'pending');
            label.classList.add(newState);
            saveTimelineState();
            loadTimelineState();
        });
    });
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

// ========== РЕДАКТИРОВАНИЕ ЦЕН (только для админа) ==========
function loadPricesFromStorage() {
    const savedParts = localStorage.getItem('repairPartsCatalog');
    if (savedParts) {
        const partsData = JSON.parse(savedParts);
        const select = document.getElementById('parts-select');
        if (select) {
            for (let i = 0; i < select.options.length; i++) {
                const opt = select.options[i];
                const partName = opt.textContent.split('(')[0].trim();
                const found = partsData.find(p => p.name === partName);
                if (found) {
                    opt.value = found.price;
                    opt.textContent = `${partName} (${found.price.toLocaleString('ru-RU')} ₽)`;
                }
            }
        }
    }
    const savedWorks = localStorage.getItem('repairWorksCatalog');
    if (savedWorks) {
        const worksData = JSON.parse(savedWorks);
        const select = document.getElementById('work-select');
        if (select) {
            for (let i = 0; i < select.options.length; i++) {
                const opt = select.options[i];
                const workName = opt.textContent.split('(')[0].trim();
                const found = worksData.find(w => w.name === workName);
                if (found) {
                    opt.value = found.price;
                    opt.textContent = `${workName} (${found.price.toLocaleString('ru-RU')} ₽)`;
                }
            }
        }
    }
}

function savePricesToStorage() {
    const partsSelect = document.getElementById('parts-select');
    const partsData = [];
    if (partsSelect) {
        for (let opt of partsSelect.options) {
            const name = opt.textContent.split('(')[0].trim();
            const price = parseInt(opt.value);
            partsData.push({ name, price });
        }
        localStorage.setItem('repairPartsCatalog', JSON.stringify(partsData));
    }
    const workSelect = document.getElementById('work-select');
    const worksData = [];
    if (workSelect) {
        for (let opt of workSelect.options) {
            const name = opt.textContent.split('(')[0].trim();
            const price = parseInt(opt.value);
            worksData.push({ name, price });
        }
        localStorage.setItem('repairWorksCatalog', JSON.stringify(worksData));
    }
}

async function makePricesEditable() {
    const adminOnlyBlock = document.querySelector('.admin-only');
    const isAdmin = adminOnlyBlock && window.getComputedStyle(adminOnlyBlock).display !== 'none';
    if (!isAdmin) return;

    // Редактирование запчастей (multiple)
    const partsSelect = document.getElementById('parts-select');
    if (partsSelect) {
        partsSelect.addEventListener('dblclick', async (e) => {
            const option = e.target.closest('option');
            if (!option) return;
            const oldPrice = parseInt(option.value);
            const partName = option.textContent.split('(')[0].trim();
            const newPrice = await showPrompt(`Введите новую цену для "${partName}" (₽):`, oldPrice, 'Редактирование цены');
            if (newPrice !== null && !isNaN(parseInt(newPrice)) && parseInt(newPrice) >= 0) {
                const price = parseInt(newPrice);
                option.value = price;
                option.textContent = `${partName} (${price.toLocaleString('ru-RU')} ₽)`;
                savePricesToStorage();
                updateAll();
            } else if (newPrice !== null) {
                await showAlert('Введите корректное число', 'Ошибка');
            }
        });
    }

    // Редактирование работы (одиночный select)
    const workSelect = document.getElementById('work-select');
    if (workSelect) {
        workSelect.addEventListener('dblclick', async () => {
            const selectedOption = workSelect.options[workSelect.selectedIndex];
            const oldPrice = parseInt(selectedOption.value);
            const workName = selectedOption.textContent.split('(')[0].trim();
            const newPrice = await showPrompt(`Введите новую цену для "${workName}" (₽):`, oldPrice, 'Редактирование цены');
            if (newPrice !== null && !isNaN(parseInt(newPrice)) && parseInt(newPrice) >= 0) {
                const price = parseInt(newPrice);
                selectedOption.value = price;
                selectedOption.textContent = `${workName} (${price.toLocaleString('ru-RU')} ₽)`;
                savePricesToStorage();
                updateAll();
            } else if (newPrice !== null) {
                await showAlert('Введите корректное число', 'Ошибка');
            }
        });
    }
}

function addEditHint() {
    const adminOnlyBlock = document.querySelector('.admin-only');
    const isAdmin = adminOnlyBlock && window.getComputedStyle(adminOnlyBlock).display !== 'none';
    if (!isAdmin) return;

    const partsCard = document.querySelector('#parts-select')?.closest('.card');
    if (partsCard && !partsCard.querySelector('.edit-hint')) {
        const hint = document.createElement('div');
        hint.className = 'helper-text-multi edit-hint';
        hint.style.marginTop = '6px';
        hint.innerText = 'Двойной клик по запчасти — изменить цену';
        partsCard.appendChild(hint);
    }

    const workCard = document.querySelector('#work-select')?.closest('.card');
    if (workCard && !workCard.querySelector('.edit-hint')) {
        const hint = document.createElement('div');
        hint.className = 'helper-text-multi edit-hint';
        hint.style.marginTop = '6px';
        hint.innerText = 'Двойной клик по типу работы — изменить цену';
        workCard.appendChild(hint);
    }
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
        if (statusBadge) {
            statusBadge.textContent = 'Выполнено';
            statusBadge.classList.add('completed');
        }
        if (timelineCard) {
            timelineCard.classList.add('completed');
        }
    } else {
        timelineContainer.classList.remove('all-completed');
        if (timelineCard) {
            timelineCard.classList.remove('completed');
        }
    }
}

// ========== КАСТОМНЫЕ МОДАЛЬНЫЕ ОКНА (СТИЛЬ АДМИНКИ) ==========
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

// Инициализация
loadPricesFromStorage();
makePricesEditable();
addEditHint();
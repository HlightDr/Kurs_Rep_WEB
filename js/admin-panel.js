// ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ======================== ФУНКЦИИ ВКЛАДОК И ФИЛЬТРОВ ========================
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function filterRepairsByStatus(status) {
    document.querySelectorAll('#repair-table-body tr').forEach(row => {
        row.style.display = (status === 'all' || row.getAttribute('data-status') === status) ? '' : 'none';
    });
}

function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    document.querySelectorAll('#users-table-body tr').forEach(row => {
        const username = row.getAttribute('data-username').toLowerCase();
        const company = row.getAttribute('data-company').toLowerCase();
        const email = row.getAttribute('data-email').toLowerCase();
        const role = row.getAttribute('data-role').toLowerCase();
        const match = username.includes(search) || company.includes(search) || email.includes(search) || role.includes(search);
        row.style.display = match ? '' : 'none';
    });
}

function toggleUserStatus(btn) {
    const row = btn.closest('tr');
    const badge = row.querySelector('.status-badge');
    const status = row.getAttribute('data-status');
    if (status === 'active') {
        row.setAttribute('data-status', 'blocked');
        badge.textContent = 'Заблокирован';
        badge.className = 'status-badge blocked';
        btn.textContent = 'Разблокировать';
        btn.className = 'btn btn-success';
    } else {
        row.setAttribute('data-status', 'active');
        badge.textContent = 'Активен';
        badge.className = 'status-badge active';
        btn.textContent = 'Блокировать';
        btn.className = 'btn btn-danger';
    }
}

function changeRole(select) {
    select.closest('tr').setAttribute('data-role', select.value);
    select.className = 'role-select ' + select.value;
}

// ======================== МОДАЛЬНЫЕ ОКНА (ДОБАВЛЕНИЕ ЗАПЧАСТЕЙ) ========================
function openModal() {
    document.getElementById('add-part-modal').classList.remove('hidden');
}
function closeModal() {
    document.getElementById('add-part-modal').classList.add('hidden');
    document.getElementById('part-name').value = '';
    document.getElementById('supplier').value = '';
    document.getElementById('price').value = '';
}
function closeModalOnOverlay(event) {
    if (event.target === document.getElementById('add-part-modal')) closeModal();
}

let counter = 3;
function addPart(e) {
    e.preventDefault();
    const tbody = document.getElementById('parts-table-body');
    const row = tbody.insertRow();
    const partId = 'SP' + String(counter++).padStart(3, '0');
    row.setAttribute('data-id', partId);
    const name = document.getElementById('part-name').value;
    const supplier = document.getElementById('supplier').value;
    const price = parseFloat(document.getElementById('price').value).toLocaleString('ru-RU');
    row.innerHTML = `
        <td class="font-medium">${escapeHtml(name)}</td>
        <td>${escapeHtml(supplier)}</td>
        <td class="font-medium">${price} ₽</td>
        <td><div class="actions-cell"><button class="btn btn-primary" onclick="editPart(this)">Изменить</button><button class="btn btn-danger" onclick="deletePart(this)">Удалить</button></div></td>
    `;
    closeModal();
}

function viewDetails(requestId) {
    window.location.href = `repair-request.html?id=${encodeURIComponent(requestId)}`;
}

// ======================== КАСТОМНЫЕ МОДАЛКИ (CONFIRM, PROMPT) ========================
let confirmResolve = null;
let promptResolve = null;

function showConfirm(message, title = 'Подтверждение') {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        titleEl.innerText = title;
        msgEl.innerText = message;
        modal.classList.remove('hidden');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');
        const handleYes = () => { cleanup(); resolve(true); };
        const handleNo = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
        };
        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    });
}

function closeConfirmModal() {
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
        document.getElementById('confirm-modal').classList.add('hidden');
    }
}

function showPrompt(message, defaultValue = '', title = 'Ввод данных') {
    return new Promise((resolve) => {
        promptResolve = resolve;
        const modal = document.getElementById('prompt-modal');
        const titleEl = document.getElementById('promptTitle');
        const msgEl = document.getElementById('promptMessage');
        const input = document.getElementById('promptInput');
        titleEl.innerText = title;
        msgEl.innerText = message;
        input.value = defaultValue;
        modal.classList.remove('hidden');
        input.focus();
        const okBtn = document.getElementById('promptOk');
        const cancelBtn = document.getElementById('promptCancel');
        const handleOk = () => { cleanup(); resolve(input.value); };
        const handleCancel = () => { cleanup(); resolve(null); };
        const cleanup = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                cleanup();
                resolve(input.value);
            }
        });
    });
}

function closePromptModal() {
    if (promptResolve) {
        promptResolve(null);
        promptResolve = null;
        document.getElementById('prompt-modal').classList.add('hidden');
    }
}

// ======================== УПРАВЛЕНИЕ ЗАПЧАСТЯМИ ========================
async function deletePart(btn) {
    const confirmed = await showConfirm('Удалить запчасть?', 'Подтверждение удаления');
    if (confirmed) btn.closest('tr').remove();
}

async function editPart(btn) {
    const row = btn.closest('tr');
    const nameCell = row.cells[0];
    const supplierCell = row.cells[1];
    const priceCell = row.cells[2];
    const oldName = nameCell.innerText;
    const oldSupplier = supplierCell.innerText;
    const oldPrice = priceCell.innerText.replace(/[^\d]/g, '');
    const newName = await showPrompt('Название запчасти:', oldName, 'Редактирование');
    if (newName && newName.trim()) nameCell.innerText = newName.trim();
    const newSupplier = await showPrompt('Поставщик:', oldSupplier, 'Редактирование');
    if (newSupplier && newSupplier.trim()) supplierCell.innerText = newSupplier.trim();
    const newPrice = await showPrompt('Цена (₽):', oldPrice, 'Редактирование');
    if (newPrice && !isNaN(parseFloat(newPrice))) {
        priceCell.innerText = Number(newPrice).toLocaleString('ru-RU') + ' ₽';
    }
}

// ======================== УПРАВЛЕНИЕ СТАТУСАМИ ЗАЯВОК ========================
let currentStatusRow = null;

function openStatusModal(rowElement) {
    currentStatusRow = rowElement;
    const currentStatus = rowElement.getAttribute('data-status');
    const select = document.getElementById('statusSelect');
    select.value = currentStatus;
    document.getElementById('statusModal').classList.remove('hidden');
}

function closeStatusModal() {
    document.getElementById('statusModal').classList.add('hidden');
    currentStatusRow = null;
}

async function updateStatus() {
    if (!currentStatusRow) return;
    const newStatus = document.getElementById('statusSelect').value;
    const statusBadge = currentStatusRow.querySelector('.status-badge');
    let statusText = '';
    switch (newStatus) {
        case 'pending_review': statusText = 'На рассмотрении'; break;
        case 'in-progress': statusText = 'В процессе'; break;
        case 'pending': statusText = 'Ожидание'; break;
        case 'completed': statusText = 'Завершено'; break;
        default: statusText = newStatus;
    }
    statusBadge.textContent = statusText;
    statusBadge.className = `status-badge ${newStatus}`;
    currentStatusRow.setAttribute('data-status', newStatus);
    const allRepairs = JSON.parse(localStorage.getItem('repairRequests') || '[]');
    const requestId = currentStatusRow.querySelector('.font-medium')?.innerText;
    if (requestId) {
        const request = allRepairs.find(r => r.id === requestId);
        if (request) request.status = newStatus;
        localStorage.setItem('repairRequests', JSON.stringify(allRepairs));
    }
    closeStatusModal();
}

function attachStatusHandlers() {
    document.querySelectorAll('#repair-table-body .btn-primary').forEach(btn => {
        if (btn.getAttribute('data-status-attached') === 'true') return;
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            openStatusModal(row);
        });
        btn.setAttribute('data-status-attached', 'true');
    });
}

// ======================== ЗАГРУЗКА ЗАЯВОК ИЗ localStorage ========================
function loadRequests() {
    const tbody = document.getElementById('repair-table-body');
    let requests = JSON.parse(localStorage.getItem('repairRequests') || '[]');
    
    // Если хранилище пусто, используем демо-заявки (три примера из HTML)
    if (requests.length === 0) {
        requests = [
            { id: "REQ-2024-001", device: "VibLog-3000 CNC Monitor", problem: "", photoUrl: "", videoUrl: "", status: "in-progress", createdAt: "2024-03-15" },
            { id: "REQ-2024-002", device: "DataHub-500 Machine Logger", problem: "", photoUrl: "", videoUrl: "", status: "pending", createdAt: "2024-03-18" },
            { id: "REQ-2024-003", device: "ProLog-X Industrial Recorder", problem: "", photoUrl: "", videoUrl: "", status: "completed", createdAt: "2024-03-10" }
        ];
        // Сохраним их в localStorage, чтобы в следующий раз они подхватились
        localStorage.setItem('repairRequests', JSON.stringify(requests));
    }
    
    tbody.innerHTML = '';
    requests.forEach(req => {
        const row = tbody.insertRow();
        row.setAttribute('data-status', req.status);
        let statusText = '';
        switch (req.status) {
            case 'pending_review': statusText = 'На рассмотрении'; break;
            case 'in-progress': statusText = 'В процессе'; break;
            case 'pending': statusText = 'Ожидание'; break;
            case 'completed': statusText = 'Завершено'; break;
            default: statusText = req.status;
        }
row.innerHTML = `
    <td class="font-medium">${escapeHtml(req.id)}</td>
    <td>${escapeHtml(req.device)}</td>
    <td><span class="status-badge ${req.status}">${statusText}</span></td>
    <td>${req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}</td>
    <td><div class="actions-cell"><button class="btn btn-primary">Обновить Статус</button><button class="btn btn-secondary" onclick="viewDetails('${escapeHtml(req.id)}')">Подробности</button></div></td>
`;
    });
    attachStatusHandlers();
}

// ======================== ИНИЦИАЛИЗАЦИЯ ========================
document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
});

document.getElementById('statusSaveBtn')?.addEventListener('click', updateStatus);
document.getElementById('statusCancelBtn')?.addEventListener('click', closeStatusModal);

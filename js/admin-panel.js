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

async function addPart(e) {
    e.preventDefault();
    const name = document.getElementById('part-name').value;
    const supplier = document.getElementById('supplier').value;
    const price = parseInt(document.getElementById('price').value);
    if (!name || !supplier || isNaN(price)) {
        await showAlert('Заполните все поля', 'Ошибка');
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/spareParts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, supplier, price })
        });
        if (response.ok) {
            const newPart = await response.json();
            const tbody = document.getElementById('parts-table-body');
            const row = tbody.insertRow();
            row.setAttribute('data-id', newPart.id);
            row.innerHTML = `
                <td class="font-medium">${escapeHtml(newPart.name)}</td>
                <td>${escapeHtml(newPart.supplier)}</td>
                <td class="font-medium">${newPart.price.toLocaleString('ru-RU')} ₽</td>
                <td><div class="actions-cell"><button class="btn btn-primary" onclick="editPart(this)">Изменить</button><button class="btn btn-danger" onclick="deletePart(this)">Удалить</button></div></td>
            `;
            closeModal();
            await loadSpareParts();
        } else {
            await showAlert('Ошибка при добавлении', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    }
}

function viewDetails(requestId) {
    window.location.href = `repair-request.html?id=${encodeURIComponent(requestId)}`;
}

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

async function deletePart(btn) {
    const row = btn.closest('tr');
    const partId = row.getAttribute('data-id');
    if (!partId) return;
    const confirmed = await showConfirm('Удалить запчасть?', 'Подтверждение удаления');
    if (!confirmed) return;
    try {
        const response = await fetch(`http://localhost:3000/spareParts/${partId}`, { method: 'DELETE' });
        if (response.ok) {
            row.remove();
        } else {
            await showAlert('Ошибка при удалении', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    }
}

async function editPart(btn) {
    const row = btn.closest('tr');
    const partId = row.getAttribute('data-id');
    const nameCell = row.cells[0];
    const supplierCell = row.cells[1];
    const priceCell = row.cells[2];
    const oldName = nameCell.innerText;
    const oldSupplier = supplierCell.innerText;
    const oldPrice = priceCell.innerText.replace(/[^\d]/g, '');
    const newName = await showPrompt('Название запчасти:', oldName, 'Редактирование');
    if (!newName || !newName.trim()) return;
    const newSupplier = await showPrompt('Поставщик:', oldSupplier, 'Редактирование');
    if (!newSupplier || !newSupplier.trim()) return;
    const newPrice = await showPrompt('Цена (₽):', oldPrice, 'Редактирование');
    if (!newPrice || isNaN(parseFloat(newPrice))) return;
    try {
        const response = await fetch(`http://localhost:3000/spareParts/${partId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim(), supplier: newSupplier.trim(), price: parseInt(newPrice) })
        });
        if (response.ok) {
            const updated = await response.json();
            nameCell.innerText = updated.name;
            supplierCell.innerText = updated.supplier;
            priceCell.innerText = updated.price.toLocaleString('ru-RU') + ' ₽';
        } else {
            await showAlert('Ошибка при обновлении', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    }
}

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
    const requestId = currentStatusRow.querySelector('.font-medium')?.innerText;
    if (!requestId) return;
    try {
        const response = await fetch(`http://localhost:3000/repairRequests/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            const updated = await response.json();
            const statusBadge = currentStatusRow.querySelector('.status-badge');
            let statusText = '';
            switch (updated.status) {
                case 'pending_review': statusText = 'На рассмотрении'; break;
                case 'in-progress': statusText = 'В процессе'; break;
                case 'pending': statusText = 'Ожидание'; break;
                case 'completed': statusText = 'Завершено'; break;
                default: statusText = updated.status;
            }
            statusBadge.textContent = statusText;
            statusBadge.className = `status-badge ${updated.status}`;
            currentStatusRow.setAttribute('data-status', updated.status);
        } else {
            await showAlert('Ошибка обновления статуса', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
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

async function loadRequests() {
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        const requests = await response.json();
        const tbody = document.getElementById('repair-table-body');
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
                <td>${escapeHtml(req.deviceModel || req.device)}</td>
                <td><span class="status-badge ${req.status}">${statusText}</span></td>
                <td>${req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}</td>
                <td><div class="actions-cell"><button class="btn btn-primary" data-id="${req.id}">Обновить Статус</button><button class="btn btn-secondary" onclick="viewDetails('${req.id}')">Подробности</button></div></td>
            `;
        });
        attachStatusHandlers();
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

async function loadSpareParts() {
    try {
        const response = await fetch('http://localhost:3000/spareParts');
        const parts = await response.json();
        const tbody = document.getElementById('parts-table-body');
        tbody.innerHTML = '';
        parts.forEach(part => {
            const row = tbody.insertRow();
            row.setAttribute('data-id', part.id);
            row.innerHTML = `
                <td class="font-medium">${escapeHtml(part.name)}</td>
                <td>${escapeHtml(part.supplier || '')}</td>
                <td class="font-medium">${part.price.toLocaleString('ru-RU')} ₽</td>
                <td><div class="actions-cell"><button class="btn btn-primary" onclick="editPart(this)">Изменить</button><button class="btn btn-danger" onclick="deletePart(this)">Удалить</button></div></td>
            `;
        });
    } catch (error) {
        console.error('Ошибка загрузки запчастей:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('http://localhost:3000/users');
        const users = await response.json();
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        users.forEach(user => {
            const row = tbody.insertRow();
            row.setAttribute('data-username', user.username);
            row.setAttribute('data-company', user.company);
            row.setAttribute('data-email', user.email);
            row.setAttribute('data-role', user.role);
            row.setAttribute('data-status', user.status);
            row.innerHTML = `
                <td class="font-medium">${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.company)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td><select class="role-select ${user.role}" onchange="changeRole(this)"><option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Клиент</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option></select></td>
                <td><span class="status-badge ${user.status}">${user.status === 'active' ? 'Активен' : 'Заблокирован'}</span></td>
                <td><button class="btn ${user.status === 'active' ? 'btn-danger' : 'btn-success'}" onclick="toggleUserStatus(this)">${user.status === 'active' ? 'Блокировать' : 'Разблокировать'}</button></td>
            `;
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

async function loadStatistics() {
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        const requests = await response.json();

        const totalElem = document.getElementById('total-repairs-value');
        if (totalElem) totalElem.innerText = requests.length;

        const causeCount = {};
        requests.forEach(req => {
            if (req.selectedFaultCauses && req.selectedFaultCauses.length) {
                req.selectedFaultCauses.forEach(cause => {
                    causeCount[cause] = (causeCount[cause] || 0) + 1;
                });
            }
        });

        const statsCard = document.querySelector('.stats-card:first-child');
        if (statsCard) {
            statsCard.querySelectorAll('.bar-item').forEach(el => el.remove());
            const sorted = Object.entries(causeCount).sort((a,b) => b[1] - a[1]);
            const maxCount = sorted[0]?.[1] || 1;
            for (let [cause, count] of sorted) {
                const percent = (count / maxCount) * 100;
                const barDiv = document.createElement('div');
                barDiv.className = 'bar-item';
                barDiv.innerHTML = `
                    <div class="bar-label">${escapeHtml(cause)}</div>
                    <div class="bar-bg"><div class="bar-fill" style="width: ${percent}%">${count}</div></div>
                `;
                statsCard.insertBefore(barDiv, statsCard.querySelector('.bar-item') || statsCard.lastElementChild);
            }
            if (sorted.length === 0) {
                statsCard.insertAdjacentHTML('beforeend', '<p>Нет данных по причинам поломок</p>');
            }
        }
    } catch (error) {
        console.error('Ошибка статистики', error);
    }
}

document.getElementById('gotoDashboardBtn')?.addEventListener('click', () => {
    window.location.href = 'customer_dashboard.html';
});

document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    loadSpareParts();
    loadUsers();
    loadStatistics();
});

document.getElementById('statusSaveBtn')?.addEventListener('click', updateStatus);
document.getElementById('statusCancelBtn')?.addEventListener('click', closeStatusModal);

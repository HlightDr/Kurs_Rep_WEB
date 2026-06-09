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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showTab(tabName, evt) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    }
}

let allRequests = [];
let currentPage = 1;
const rowsPerPage = 5;
let currentStatusFilter = 'all';

async function loadRequests() {
    showPreloader();
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        allRequests = await response.json();
        currentPage = 1;
        renderRequestsPage();
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        await showAlert('Ошибка загрузки заявок', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

function renderRequestsPage() {
    const tbody = document.getElementById('repair-table-body');
    tbody.innerHTML = '';

    let filtered = allRequests;
    if (currentStatusFilter !== 'all') {
        filtered = allRequests.filter(req => req.status === currentStatusFilter);
    }

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filtered.slice(start, end);

    pageData.forEach(req => {
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
            <td>${escapeHtml(req.deviceModel || req.device || '')}</td>
            <td><span class="status-badge ${req.status}">${statusText}</span></td>
            <td>${req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}</td>
            <td class="actions-cell">
                <button class="btn btn-secondary" onclick="viewUserRequest('${req.id}')">Просмотр</button>
                <button class="btn btn-primary" onclick="viewDetails('${req.id}')">Редактировать</button>
                <button class="btn btn-warning" onclick="openStatusModalFromRow('${req.id}')">Обновить статус</button>
            </td>
        `;
    });

    renderPaginationControls(filtered.length);
}

function renderPaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const container = document.querySelector('#repair-requests-tab .card');
    let paginationDiv = container.querySelector('.pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        container.appendChild(paginationDiv);
    }
    paginationDiv.innerHTML = `
        <button class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage('prev')">← Назад</button>
        <span>Страница ${currentPage} из ${totalPages || 1}</span>
        <button class="btn btn-secondary" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="changePage('next')">Вперёд →</button>
    `;
}

function changePage(direction) {
    let filtered = allRequests;
    if (currentStatusFilter !== 'all') {
        filtered = allRequests.filter(req => req.status === currentStatusFilter);
    }
    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (direction === 'prev' && currentPage > 1) {
        currentPage--;
        renderRequestsPage();
    } else if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
        renderRequestsPage();
    }
}



function filterRepairsByStatus(status) {
    currentStatusFilter = status;
    currentPage = 1;
    renderRequestsPage();
}

function viewUserRequest(requestId) {
    window.location.href = `new-repair-request.html?id=${encodeURIComponent(requestId)}`;
}
function viewDetails(requestId) {
    window.location.href = `repair-request.html?id=${encodeURIComponent(requestId)}`;
}

let currentStatusRow = null;
let currentStatusRequestId = null;

function openStatusModal(rowElement) {
    currentStatusRow = rowElement;
    const currentStatus = rowElement.getAttribute('data-status');
    const select = document.getElementById('statusSelect');
    select.value = currentStatus;
    document.getElementById('statusModal').classList.remove('hidden');
}

function openStatusModalFromRow(requestId) {
    const rows = document.querySelectorAll('#repair-table-body tr');
    let targetRow = null;
    for (let row of rows) {
        const idCell = row.querySelector('.font-medium');
        if (idCell && idCell.innerText === requestId) {
            targetRow = row;
            break;
        }
    }
    if (targetRow) {
        openStatusModal(targetRow);
        currentStatusRequestId = null;
    } else {
        currentStatusRequestId = requestId;
        const select = document.getElementById('statusSelect');
        select.value = 'pending_review';
        document.getElementById('statusModal').classList.remove('hidden');
    }
}

function closeStatusModal() {
    document.getElementById('statusModal').classList.add('hidden');
    currentStatusRow = null;
    currentStatusRequestId = null;
}

async function updateStatus() {
    let requestId = null;
    let newStatus = document.getElementById('statusSelect').value;
    if (currentStatusRow) {
        requestId = currentStatusRow.querySelector('.font-medium')?.innerText;
        if (!requestId) return;
        showPreloader();
        try {
            const response = await fetch(`http://localhost:3000/repairRequests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                await loadRequests();
                await showAlert('Статус обновлён', 'Успех');
            } else {
                await showAlert('Ошибка обновления статуса', 'Ошибка');
            }
        } catch (error) {
            console.error(error);
            await showAlert('Сервер недоступен', 'Ошибка');
        } finally {
            hidePreloader();
        }
    } else if (currentStatusRequestId) {
        requestId = currentStatusRequestId;
        showPreloader();
        try {
            const response = await fetch(`http://localhost:3000/repairRequests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                await loadRequests();
                await showAlert('Статус обновлён', 'Успех');
            } else {
                await showAlert('Ошибка обновления статуса', 'Ошибка');
            }
        } catch (error) {
            console.error(error);
            await showAlert('Сервер недоступен', 'Ошибка');
        } finally {
            hidePreloader();
        }
    }
    closeStatusModal();
}

async function loadUsers() {
    showPreloader();
    try {
        const response = await fetch('http://localhost:3000/users');
        const users = await response.json();
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        users.forEach(user => {
            const row = tbody.insertRow();
            row.setAttribute('data-id', user.id);      
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
                <td><button class="btn ${user.status === 'active' ? 'btn-danger' : 'btn-success'}" onclick="toggleUserStatus(event, this)">${user.status === 'active' ? 'Блокировать' : 'Разблокировать'}</button></td>
                 `;
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        await showAlert('Ошибка загрузки пользователей', 'Ошибка');
    } finally {
        hidePreloader();
    }
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

async function toggleUserStatus(event, btn) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const row = btn.closest('tr');
    const userId = row.getAttribute('data-id');
    if (!userId) return;

    const currentStatus = row.getAttribute('data-status');
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    
    showPreloader();
    try {
        const response = await fetch(`http://localhost:3000/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            row.setAttribute('data-status', newStatus);
            const badge = row.querySelector('.status-badge');
            badge.textContent = newStatus === 'active' ? 'Активен' : 'Заблокирован';
            badge.className = `status-badge ${newStatus}`;
            btn.textContent = newStatus === 'active' ? 'Блокировать' : 'Разблокировать';
            btn.className = newStatus === 'active' ? 'btn btn-danger' : 'btn btn-success';
            await showAlert('Статус пользователя обновлён', 'Успех');
        } else {
            await showAlert('Ошибка при обновлении статуса', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

async function changeRole(select) {
    const row = select.closest('tr');
    const userId = row.getAttribute('data-id');
    const newRole = select.value;
    showPreloader();
    try {
        const response = await fetch(`http://localhost:3000/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        });
        if (response.ok) {
            row.setAttribute('data-role', newRole);
            select.className = 'role-select ' + newRole;
            await showAlert('Роль пользователя обновлена', 'Успех');
        } else {
            await showAlert('Ошибка обновления роли', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

async function loadSpareParts() {
    showPreloader();
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
                <td class="font-medium">${part.price.toLocaleString('ru-RU')} Б</td>
                <td class="actions-cell"><button class="btn btn-primary" onclick="editPart(this)">Изменить</button><button class="btn btn-danger" onclick="deletePart(this)">Удалить</button></td>
            `;
        });
    } catch (error) {
        console.error('Ошибка загрузки запчастей:', error);
        await showAlert('Ошибка загрузки запчастей', 'Ошибка');
    } finally {
        hidePreloader();
    }
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
    showPreloader();
    try {
        const response = await fetch('http://localhost:3000/spareParts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, supplier, price })
        });
        if (response.ok) {
            await loadSpareParts();
            closeModal();
            await showAlert('Запчасть добавлена', 'Успех');
        } else {
            await showAlert('Ошибка при добавлении', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

async function deletePart(btn) {
    const row = btn.closest('tr');
    const partId = row.getAttribute('data-id');
    if (!partId) return;
    const confirmed = await showConfirm('Удалить запчасть?', 'Подтверждение удаления');
    if (!confirmed) return;
    showPreloader();
    try {
        const response = await fetch(`http://localhost:3000/spareParts/${partId}`, { method: 'DELETE' });
        if (response.ok) {
            row.remove();
            await showAlert('Запчасть удалена', 'Успех');
        } else {
            await showAlert('Ошибка при удалении', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    } finally {
        hidePreloader();
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
    const newPrice = await showPrompt('Цена (Б):', oldPrice, 'Редактирование');
    if (!newPrice || isNaN(parseFloat(newPrice))) return;
    showPreloader();
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
            priceCell.innerText = updated.price.toLocaleString('ru-RU') + ' Б';
            await showAlert('Запчасть обновлена', 'Успех');
        } else {
            await showAlert('Ошибка при обновлении', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

async function loadStatistics() {
    showPreloader();
    try {
        const [repairResp, recordersResp] = await Promise.all([
            fetch('http://localhost:3000/repairRequests'),
            fetch('http://localhost:3000/recorders')
        ]);
        const requests = await repairResp.json();
        const recorders = await recordersResp.json();

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

        const statsCardFaults = document.querySelector('.stats-card:first-child');
        if (statsCardFaults) {
            const title = statsCardFaults.querySelector('h3');
            statsCardFaults.innerHTML = '';
            if (title) statsCardFaults.appendChild(title);

            const sorted = Object.entries(causeCount).sort((a, b) => b[1] - a[1]);
            const maxCount = sorted[0]?.[1] || 1;
            for (const [cause, count] of sorted) {
                const percent = (count / maxCount) * 100;
                const barDiv = document.createElement('div');
                barDiv.className = 'bar-item';
                barDiv.innerHTML = `
                    <div class="bar-label">${escapeHtml(cause)}</div>
                    <div class="bar-bg"><div class="bar-fill" style="width: ${percent}%">${count}</div></div>
                `;
                statsCardFaults.appendChild(barDiv);
            }
            if (sorted.length === 0) {
                statsCardFaults.insertAdjacentHTML('beforeend', '<p>Нет данных по причинам поломок</p>');
            }
        }

        const snToRegion = {};
        recorders.forEach(rec => {
            snToRegion[rec.sn] = rec.region || 'Не указан';
        });

        const regionCount = {};
        requests.forEach(req => {
            const region = snToRegion[req.deviceSn];
            if (region) {
                regionCount[region] = (regionCount[region] || 0) + 1;
            } else {
                regionCount['Не указан'] = (regionCount['Не указан'] || 0) + 1;
            }
        });

        const statsCardRegion = document.querySelector('.stats-card:last-child');
        if (statsCardRegion) {
            const titleRegion = statsCardRegion.querySelector('h3');
            statsCardRegion.innerHTML = '';
            if (titleRegion) statsCardRegion.appendChild(titleRegion);

            const total = Object.values(regionCount).reduce((sum, v) => sum + v, 0);
            if (total === 0) {
                statsCardRegion.insertAdjacentHTML('beforeend', '<p>Нет данных по регионам</p>');
                return;
            }

            const sortedRegions = Object.entries(regionCount).sort((a, b) => b[1] - a[1]);
            const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#FEF3C7', '#FDE68A', '#FCD34D'];

            const container = document.createElement('div');
            container.className = 'pie-container';

            let gradientParts = [];
            let start = 0;
            const legendItems = [];
            for (let i = 0; i < sortedRegions.length; i++) {
                const [region, count] = sortedRegions[i];
                const percent = (count / total) * 100;
                const color = colors[i % colors.length];
                gradientParts.push(`${color} ${start}% ${start + percent}%`);
                start += percent;
                legendItems.push({ region, percent: percent.toFixed(1), count, color });
            }
            const gradient = `conic-gradient(${gradientParts.join(', ')})`;

            const pieChart = document.createElement('div');
            pieChart.className = 'pie-chart';
            pieChart.style.background = gradient;
            pieChart.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

            const legendDiv = document.createElement('div');
            legendDiv.className = 'pie-legend';
            legendDiv.innerHTML = legendItems.map(item => `
                <div class="legend-item">
                    <div class="legend-label">
                        <div class="legend-color" style="background-color: ${item.color};"></div>
                        <span>${escapeHtml(item.region)}</span>
                    </div>
                    <div class="legend-value">${item.percent}% (${item.count})</div>
                </div>
            `).join('');

            container.appendChild(pieChart);
            container.appendChild(legendDiv);
            statsCardRegion.appendChild(container);
        }
    } catch (error) {
        console.error('Ошибка статистики:', error);
        await showAlert('Ошибка загрузки статистики', 'Ошибка');
    } finally {
        hidePreloader();
    }
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

async function showAlert(message, title = 'Уведомление') {
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

document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    loadSpareParts();
    loadUsers();
    loadStatistics();

    document.getElementById('gotoDashboardBtn')?.addEventListener('click', () => {
        window.location.href = 'customer_dashboard.html';
    });
    document.getElementById('statusSaveBtn')?.addEventListener('click', updateStatus);
    document.getElementById('statusCancelBtn')?.addEventListener('click', closeStatusModal);
});

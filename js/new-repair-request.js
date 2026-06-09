(function checkAuth() {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'customer' && role !== 'admin') {
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

async function getNextRequestId() {
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const requests = await response.json();
        let maxNum = 0;
        for (const req of requests) {
            const match = req.id && String(req.id).match(/^REQ-(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        }
        const nextNum = maxNum + 1;
        const newId = `REQ-${nextNum.toString().padStart(3, '0')}`;
        return newId;
    } catch (error) {
        console.error('Ошибка в getNextRequestId:', error);
        return `REQ-${Date.now().toString().slice(-3)}`;
    }
}

async function hasActiveRequest(deviceSn) {
    try {
        const response = await fetch('http://localhost:3000/repairRequests');
        const requests = await response.json();
        return requests.some(req => req.deviceSn === deviceSn && req.status !== 'completed');
    } catch (error) {
        console.error(error);
        return false;
    }
}

let isViewMode = false; 
let currentRequestId = null;

async function loadDevices() {
    showPreloader();
    try {
        const role = sessionStorage.getItem('userRole');
        const currentUser = sessionStorage.getItem('username') || 'Дмитрий Соколов';
        const response = await fetch('http://localhost:3000/recorders');
        const allRecorders = await response.json();
        let myRecorders = [];
        if (role === 'admin') {
            myRecorders = allRecorders;
        } else {
            myRecorders = allRecorders.filter(r => r.ownerName === currentUser);
        }
        const select = document.getElementById('device-select');
        if (select) {
            select.innerHTML = '<option value="">Выберите устройство...</option>';
            myRecorders.forEach(rec => {
                const option = document.createElement('option');
                option.value = rec.model;
                option.textContent = `${rec.model} (С/Н: ${rec.sn})`;
                option.setAttribute('data-sn', rec.sn);
                select.appendChild(option);
            });
        }
        const urlParams = new URLSearchParams(window.location.search);
        const requestId = urlParams.get('id');
        if (requestId) {
            await loadRequestData(requestId);
        } else {
            loadFormState();
        }
    } catch (error) {
        console.error(error);
        await showAlert('Не удалось загрузить список устройств', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

async function loadRequestData(requestId) {
    showPreloader();
    try {
        const response = await fetch(`http://localhost:3000/repairRequests/${requestId}`);
        if (!response.ok) throw new Error('Заявка не найдена');
        const request = await response.json();
        currentRequestId = request.id;
        isViewMode = true;
        const select = document.getElementById('device-select');
        if (select && request.deviceModel) {
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === request.deviceModel) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }
        document.getElementById('problem-description').value = request.problem || '';
        document.getElementById('photo-url').value = request.photoUrl || '';
        document.getElementById('video-url').value = request.videoUrl || '';
        
        select.disabled = true;
        document.getElementById('problem-description').disabled = true;
        document.getElementById('photo-url').disabled = true;
        document.getElementById('video-url').disabled = true;
        const submitBtn = document.getElementById('submitBottomBtn');
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
        const backBtn = document.querySelector('.back-button');
        if (!backBtn) {
            const header = document.querySelector('.header');
            const btn = document.createElement('button');
            btn.textContent = 'Назад';
            btn.className = 'btn btn-secondary';
            btn.style.marginTop = '20px';
            btn.addEventListener('click', () => {
                window.location.href = 'customer_dashboard.html';
            });
            document.querySelector('.submit-section').appendChild(btn);
        }
        const title = document.querySelector('.header h1');
        if (title) title.innerText = `Просмотр заявки ${request.id}`;
    } catch (error) {
        console.error(error);
        await showAlert('Заявка не найдена', 'Ошибка');
        window.location.href = 'customer_dashboard.html';
    } finally {
        hidePreloader();
    }
}

function saveFormState() {
    if (isViewMode) return; 
    const deviceSelect = document.getElementById('device-select');
    const problem = document.getElementById('problem-description');
    const photoUrl = document.getElementById('photo-url');
    const videoUrl = document.getElementById('video-url');
    const data = {
        deviceValue: deviceSelect ? deviceSelect.value : '',
        problem: problem ? problem.value : '',
        photoUrl: photoUrl ? photoUrl.value : '',
        videoUrl: videoUrl ? videoUrl.value : ''
    };
    localStorage.setItem('newRepairForm', JSON.stringify(data));
}

function loadFormState() {
    const saved = localStorage.getItem('newRepairForm');
    if (!saved) return;
    const data = JSON.parse(saved);
    const deviceSelect = document.getElementById('device-select');
    if (deviceSelect && data.deviceValue) {
        deviceSelect.value = data.deviceValue;
    }
    const problem = document.getElementById('problem-description');
    if (problem && data.problem !== undefined) problem.value = data.problem;
    const photoUrl = document.getElementById('photo-url');
    if (photoUrl && data.photoUrl !== undefined) photoUrl.value = data.photoUrl;
    const videoUrl = document.getElementById('video-url');
    if (videoUrl && data.videoUrl !== undefined) videoUrl.value = data.videoUrl;
}

function attachAutoSave() {
    if (isViewMode) return;
    const inputs = ['device-select', 'problem-description', 'photo-url', 'video-url'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = (id === 'device-select') ? 'change' : 'input';
            el.addEventListener(eventType, saveFormState);
        }
    });
}

function clearFormState() {
    localStorage.removeItem('newRepairForm');
}

async function submitRequest() {
    if (isViewMode) return; 
    const deviceSelect = document.getElementById('device-select');
    const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
    const deviceModel = selectedOption.value;
    const deviceSn = selectedOption.getAttribute('data-sn') || '';
    const problem = document.getElementById('problem-description').value.trim();
    const photoUrl = document.getElementById('photo-url').value.trim();
    const videoUrl = document.getElementById('video-url').value.trim();

    if (!deviceModel) {
        await showAlert('Выберите устройство', 'Ошибка');
        return;
    }
    if (!problem) {
        await showAlert('Опишите проблему', 'Ошибка');
        return;
    }

    showPreloader();
    try {
        const activeExists = await hasActiveRequest(deviceSn);
        if (activeExists) {
            await showAlert('Для этого устройства уже есть незавершённая заявка', 'Ошибка');
            return;
        }

        const newId = await getNextRequestId();
        const newRequest = {
            id: newId,
            deviceModel,
            deviceSn,
            problem,
            photoUrl,
            videoUrl,
            status: 'pending_review',
            createdAt: new Date().toISOString(),
            selectedFaultCauses: [],
            selectedParts: [],
            selectedWork: null,
            partsTotal: 0,
            workCost: 0,
            totalEstimate: 0,
            diagnosticText: '',
            timelineState: ['pending', 'pending', 'pending', 'pending', 'pending', 'pending']
        };

        const response = await fetch('http://localhost:3000/repairRequests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRequest)
        });
        if (response.ok) {
            clearFormState();
            await showAlert('Заявка отправлена на рассмотрение', 'Успех');
            window.location.href = 'customer_dashboard.html';
        } else {
            const err = await response.text();
            console.error('Ошибка сервера:', err);
            await showAlert('Ошибка при отправке', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    } finally {
        hidePreloader();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadDevices(); 
    attachAutoSave();
    const submitBtn = document.getElementById('submitBottomBtn');
    if (submitBtn && !isViewMode) {
        submitBtn.addEventListener('click', submitRequest);
    }
});

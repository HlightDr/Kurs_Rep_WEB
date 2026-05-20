// Модалка Alert
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

async function submitRequest() {
    const deviceSelect = document.getElementById('device-select');
    const device = deviceSelect.value;
    const problem = document.getElementById('problem-description').value.trim();
    const photoUrl = document.getElementById('photo-url').value;
    const videoUrl = document.getElementById('video-url').value;

    if (!device) {
        await showAlert('Выберите устройство', 'Ошибка');
        return;
    }
    if (!problem) {
        await showAlert('Опишите проблему', 'Ошибка');
        return;
    }

    let lastId = parseInt(localStorage.getItem('lastRepairId') || '0');
const newId = 'REQ-' + String(lastId + 1).padStart(4, '0');
localStorage.setItem('lastRepairId', lastId + 1);

    const newRequest = {
        id: newId,
        device: device,
        problem: problem,
        photoUrl: photoUrl,
        videoUrl: videoUrl,
        status: 'pending_review',   // статус "На рассмотрении"
        createdAt: new Date().toISOString()
    };

    const allRequests = JSON.parse(localStorage.getItem('repairRequests') || '[]');
    allRequests.push(newRequest);
    localStorage.setItem('repairRequests', JSON.stringify(allRequests));

    await showAlert('Заявка отправлена на рассмотрение', 'Успех');
    window.location.href = 'customer_dashboard.html';
}

document.getElementById('submitBtn').addEventListener('click', submitRequest);
document.getElementById('submitBottomBtn').addEventListener('click', submitRequest);
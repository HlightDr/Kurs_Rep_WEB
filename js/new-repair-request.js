(function checkAuth() {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'customer' && role !== 'admin') {
        window.location.href = 'login.html';
    }
})();

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

async function loadDevices() {
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
    } catch (error) {
        console.error(error);
        await showAlert('Не удалось загрузить список устройств', 'Ошибка');
    }
}

function initPhotoUpload() {
    const container = document.getElementById('photos-container');
    const addBtn = document.getElementById('add-photo-btn');
    const previewContainer = document.getElementById('photos-preview');
    let photoFileMap = new Map(); // храним файлы по индексу поля

    function updatePhotoPreview() {
        const inputs = document.querySelectorAll('.photo-input');
        previewContainer.innerHTML = '';
        inputs.forEach((input, idx) => {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const div = document.createElement('div');
                    div.style.position = 'relative';
                    div.style.width = '80px';
                    div.style.height = '80px';
                    div.style.border = '1px solid #ccc';
                    div.style.borderRadius = '8px';
                    div.style.overflow = 'hidden';
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = '✕';
                    removeBtn.style.position = 'absolute';
                    removeBtn.style.top = '2px';
                    removeBtn.style.right = '2px';
                    removeBtn.style.backgroundColor = 'rgba(0,0,0,0.6)';
                    removeBtn.style.color = 'white';
                    removeBtn.style.border = 'none';
                    removeBtn.style.borderRadius = '50%';
                    removeBtn.style.width = '20px';
                    removeBtn.style.height = '20px';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.style.fontSize = '12px';
                    removeBtn.style.display = 'flex';
                    removeBtn.style.alignItems = 'center';
                    removeBtn.style.justifyContent = 'center';
                    removeBtn.onclick = () => {
                        input.value = '';
                        div.remove();
                        updatePhotoPreview();
                        updateAddButtonState();
                    };
                    div.appendChild(img);
                    div.appendChild(removeBtn);
                    previewContainer.appendChild(div);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function updateAddButtonState() {
        const inputs = document.querySelectorAll('.photo-input');
        const nonEmptyCount = Array.from(inputs).filter(inp => inp.files && inp.files[0]).length;
        if (nonEmptyCount >= 9) {
            addBtn.disabled = true;
            addBtn.style.opacity = '0.5';
        } else {
            addBtn.disabled = false;
            addBtn.style.opacity = '1';
        }
    }

    // обработчик изменения любого фото-поля
    document.addEventListener('change', (e) => {
        if (e.target.classList && e.target.classList.contains('photo-input')) {
            updatePhotoPreview();
            updateAddButtonState();
        }
    });

    addBtn.addEventListener('click', () => {
        const currentCount = document.querySelectorAll('.photo-input').length;
        if (currentCount >= 9) {
            showAlert('Максимум 9 фотографий', 'Ошибка');
            return;
        }
        const newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.classList.add('photo-input');
        newInput.accept = 'image/*';
        container.appendChild(newInput);
        updateAddButtonState();
    });

    updateAddButtonState();
}

function initVideoPreview() {
    const videoInput = document.getElementById('video-file');
    const previewDiv = document.getElementById('video-preview');
    videoInput.addEventListener('change', () => {
        if (videoInput.files && videoInput.files[0]) {
            const file = videoInput.files[0];
            const fileName = file.name;
            previewDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>🎥 ${fileName}</span>
                    <button type="button" id="remove-video-btn" style="background: none; border: none; color: red; cursor: pointer;">✕</button>
                </div>
            `;
            document.getElementById('remove-video-btn')?.addEventListener('click', () => {
                videoInput.value = '';
                previewDiv.innerHTML = '';
            });
        } else {
            previewDiv.innerHTML = '';
        }
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function collectFiles() {
    const photoInputs = document.querySelectorAll('.photo-input');
    const photoFiles = [];
    for (let inp of photoInputs) {
        if (inp.files && inp.files[0]) photoFiles.push(inp.files[0]);
    }
    const selectedPhotos = photoFiles.slice(0, 9);
    const photoBase64 = [];
    for (let f of selectedPhotos) photoBase64.push(await fileToBase64(f));
    const videoInput = document.getElementById('video-file');
    let videoBase64 = '';
    if (videoInput.files && videoInput.files[0]) videoBase64 = await fileToBase64(videoInput.files[0]);
    return { photoUrls: photoBase64, videoUrlFile: videoBase64 };
}

async function submitRequest() {
    const deviceSelect = document.getElementById('device-select');
    const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
    const deviceModel = selectedOption.value;
    const deviceSn = selectedOption.getAttribute('data-sn') || '';
    const problem = document.getElementById('problem-description').value.trim();
    const photoUrlLink = document.getElementById('photo-url').value.trim();
    const videoUrlLink = document.getElementById('video-url').value.trim();

    if (!deviceModel) {
        await showAlert('Выберите устройство', 'Ошибка');
        return;
    }
    if (!problem) {
        await showAlert('Опишите проблему', 'Ошибка');
        return;
    }

    let photoUrls = [];
    let videoUrlFile = '';
    try {
        const files = await collectFiles();
        photoUrls = files.photoUrls;
        videoUrlFile = files.videoUrlFile;
    } catch (err) {
        console.error(err);
        await showAlert('Ошибка при обработке файлов', 'Ошибка');
        return;
    }

    const newRequest = {
        deviceModel,
        deviceSn,
        problem,
        photoUrl: photoUrlLink,
        videoUrl: videoUrlLink,
        photoUrls: photoUrls,
        videoUrlFile: videoUrlFile,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        selectedFaultCauses: [],
        selectedParts: [],
        selectedWork: null,
        partsTotal: 0,
        workCost: 0,
        totalEstimate: 0,
        diagnosticText: '',
        timelineState: ['completed', 'completed', 'active', 'pending', 'pending', 'pending']
    };

    try {
        const response = await fetch('http://localhost:3000/repairRequests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRequest)
        });
        if (response.ok) {
            await showAlert('Заявка отправлена на рассмотрение', 'Успех');
            window.location.href = 'customer_dashboard.html';
        } else {
            await showAlert('Ошибка при отправке', 'Ошибка');
        }
    } catch (error) {
        console.error(error);
        await showAlert('Сервер недоступен', 'Ошибка');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadDevices();
    initPhotoUpload();
    initVideoPreview();
    document.getElementById('submitBottomBtn')?.addEventListener('click', submitRequest);
});

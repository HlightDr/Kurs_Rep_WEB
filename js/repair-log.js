// Функция handleBack больше не используется, убираем её.
// Удаляем старые обработчики и пишем новый.

document.addEventListener('DOMContentLoaded', () => {
    // Читаем параметры URL
    const urlParams = new URLSearchParams(window.location.search);
    const sn = urlParams.get('sn');
    const model = urlParams.get('model');
    const from = urlParams.get('from'); // 'customer' или 'recorders'

    // Подставить модель и серийный номер в заголовок
    if (sn && model) {
        document.querySelector('h1').innerHTML = `${model} <span class="serial">(Серийный №: ${sn})</span>`;
    }

    // Настроить кнопку "Назад"
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        // Убираем возможный старый onclick
        backButton.removeAttribute('onclick');
        // Вешаем новый обработчик
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (from === 'customer') {
                window.location.href = 'customer_dashboard.html';
            } else {
                // по умолчанию (или from === 'recorders')
                window.location.href = 'registered_recorders.html';
            }
        });
    }

    // Кнопки "Подробнее" (оставляем без изменений)
    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', function() {
            let repairId = this.closest('.repair-card')?.querySelector('.repair-id')?.innerText;
            if (repairId) window.location.href = `repair-request.html?id=${encodeURIComponent(repairId)}`;
        });
    });
});
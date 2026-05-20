// Кнопка "Новая заявка на ремонт"
document.querySelector('.btn-primary').addEventListener('click', () => {
    window.location.href = 'new-repair-request.html';
});

// Клик по активной заявке -> страница заявки (параметр id)
document.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        if (id) window.location.href = `repair-request.html?id=${encodeURIComponent(id)}`;
    });
});

// Клик по регистратору -> история ремонтов (sn, model)
document.querySelectorAll('.recorder-item').forEach(rec => {
    rec.addEventListener('click', () => {
        const sn = rec.getAttribute('data-sn');
        const model = rec.getAttribute('data-model');
        if (sn && model) {
            window.location.href = `repair-log.html?sn=${encodeURIComponent(sn)}&model=${encodeURIComponent(model)}&from=customer`;
        }
    });
});

// Заголовок "Мои зарегистрированные регистраторы" -> список устройств
document.getElementById('recordersLink')?.addEventListener('click', () => {
    window.location.href = 'registered_recorders.html';
});
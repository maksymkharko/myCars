// Константы
const OIL_CHANGE_INTERVAL = 10000;
const WARNING_DAYS = 7;

// DOM элементы
const elements = {
    carList: document.getElementById('carList'),
    addCarModal: document.getElementById('addCarModal'),
    viewCarModal: document.getElementById('viewCarModal'),
    confirmationDialog: document.getElementById('confirmationDialog'),
    toast: document.getElementById('toast'),
    addCarForm: document.getElementById('addCarForm'),
    authContainer: document.getElementById('authContainer')
};

// Состояние приложения
const state = {
    cars: [],
    currentCarIndex: -1,
    tg: null,
    currentUser: null
};

// Firebase
const database = window.firebaseDb;

// Глобальные функции
window.onTelegramAuth = handleTelegramAuth;
window.copyVIN = copyVIN;
window.editDescription = editDescription;

// Инициализация
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    checkTelegram();
    setupEventListeners();
}

function checkTelegram() {
    if (window.Telegram?.WebApp) {
        state.tg = window.Telegram.WebApp;
        state.tg.expand();
        state.tg.ready();
        
        if (state.tg.initDataUnsafe?.user) {
            handleTelegramAuth(state.tg.initDataUnsafe.user);
        } else {
            elements.authContainer.style.display = 'block';
        }
    } else {
        elements.authContainer.style.display = 'block';
        handleTelegramAuth({ 
            id: 123456789, 
            first_name: "Тестовый",
            last_name: "Пользователь"
        });
    }
}

function setupEventListeners() {
    // Кнопка добавления
    document.querySelector('.add-car-button').addEventListener('click', () => {
        elements.addCarModal.style.display = 'block';
    });

    // Форма добавления
    elements.addCarForm.addEventListener('submit', handleAddCar);
    
    // Кнопка отмены
    elements.addCarModal.querySelector('.cancel-button').addEventListener('click', () => {
        elements.addCarModal.style.display = 'none';
    });

    // Закрытие модальных окон
    window.addEventListener('click', (e) => {
        if (e.target === elements.addCarModal) elements.addCarModal.style.display = 'none';
        if (e.target === elements.viewCarModal) elements.viewCarModal.style.display = 'none';
    });
}

// Остальные функции (handleTelegramAuth, loadCars, saveCar и т.д.)
// ... [остальной код из предыдущих примеров] ...

function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.style.display = 'block';
    setTimeout(() => { elements.toast.style.display = 'none'; }, 3000);
}

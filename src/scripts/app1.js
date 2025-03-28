// Constants
const OIL_CHANGE_INTERVAL = 10000; // 10,000 km
const WARNING_DAYS = 7;

// DOM Elements
const carList = document.getElementById('carList');
const addCarModal = document.getElementById('addCarModal');
const viewCarModal = document.getElementById('viewCarModal');
const confirmationDialog = document.getElementById('confirmationDialog');
const toast = document.getElementById('toast');
const addCarForm = document.getElementById('addCarForm');
const authContainer = document.getElementById('authContainer');

// State
let cars = [];
let currentCarIndex = -1;
let tg = null;
let currentUser = null;

// Firebase functions
const { db, ref, set, onValue, remove } = window.firebaseDb;

// Глобальная функция для Telegram Widget
window.onTelegramAuth = function(user) {
    handleTelegramAuth(user);
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем Telegram WebApp
    if (window.Telegram?.WebApp) {
        tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        
        if (tg.initDataUnsafe?.user) {
            handleTelegramAuth(tg.initDataUnsafe.user);
        } else {
            authContainer.style.display = 'block';
        }
    } else {
        // Режим разработки (вне Telegram)
        authContainer.style.display = 'block';
        handleTelegramAuth({ 
            id: 123456789, 
            first_name: "Тестовый",
            last_name: "Пользователь"
        });
    }
    
    setupEventListeners();
});

function handleTelegramAuth(user) {
    currentUser = {
        id: user.id.toString(),
        firstName: user.first_name,
        lastName: user.last_name || ''
    };
    
    authContainer.style.display = 'none';
    showToast(`Добро пожаловать, ${currentUser.firstName}!`);
    loadCars();
}

async function loadCars() {
    if (!currentUser) return;
    
    try {
        const carsRef = ref(db, `users/${currentUser.id}/cars`);
        
        onValue(carsRef, (snapshot) => {
            const carsData = snapshot.val() || {};
            cars = Object.keys(carsData).map(key => ({
                id: key,
                ...carsData[key]
            }));
            renderCarList();
        });
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        showToast("Ошибка загрузки данных", "error");
        cars = [];
        renderCarList();
    }
}

async function saveCar(car) {
    if (!currentUser) {
        showToast("Сначала авторизуйтесь", "error");
        return null;
    }
    
    try {
        const carId = car.id || Date.now().toString();
        await set(ref(db, `users/${currentUser.id}/cars/${carId}`), car);
        return carId;
    } catch (error) {
        console.error("Ошибка сохранения:", error);
        showToast("Ошибка сохранения", "error");
        return null;
    }
}

async function deleteCar(carId) {
    if (!currentUser) return false;
    
    try {
        await remove(ref(db, `users/${currentUser.id}/cars/${carId}`));
        return true;
    } catch (error) {
        console.error("Ошибка удаления:", error);
        showToast("Ошибка удаления", "error");
        return false;
    }
}

// Остальные функции (setupEventListeners, renderCarList, showCarDetails и т.д.)
// ... остальной ваш код остается без изменений ...

// Делаем функции доступными глобально для HTML
window.copyVIN = function(vin) {
    navigator.clipboard.writeText(vin).then(() => {
        showToast('VIN скопирован');
    }).catch(err => {
        console.error('Failed to copy VIN:', err);
        showToast('Ошибка при копировании VIN');
    });
};

window.editDescription = function(index) {
    const car = cars[index];
    const description = car.description || '';
    
    const textarea = document.createElement('textarea');
    textarea.value = description;
    textarea.rows = 4;
    textarea.className = 'description-edit';
    
    const descriptionDiv = viewCarModal.querySelector('.description-text');
    const editButton = viewCarModal.querySelector('.edit-description-button');
    
    descriptionDiv.replaceWith(textarea);
    
    const saveButton = document.createElement('button');
    saveButton.innerHTML = '<i class="fas fa-save"></i> Сохранить';
    saveButton.className = 'save-description-button';
    
    saveButton.addEventListener('click', async () => {
        car.description = textarea.value;
        await saveCar(car);
        showCarDetails(index);
        showToast('Описание сохранено');
    });
    
    editButton.replaceWith(saveButton);
};

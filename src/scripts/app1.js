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

function setupEventListeners() {
    // Кнопка добавления автомобиля
    document.querySelector('.add-car-button').addEventListener('click', () => {
        addCarModal.style.display = 'block';
    });

    // Форма добавления
    addCarForm.addEventListener('submit', handleAddCar);
    
    // Кнопка отмены
    addCarModal.querySelector('.cancel-button').addEventListener('click', () => {
        addCarModal.style.display = 'none';
    });

    // Закрытие модальных окон при клике вне их области
    window.addEventListener('click', (e) => {
        if (e.target === addCarModal) addCarModal.style.display = 'none';
        if (e.target === viewCarModal) viewCarModal.style.display = 'none';
    });
}

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

async function handleAddCar(e) {
    e.preventDefault();
    
    const newCar = {
        name: document.getElementById('carName').value,
        mileage: parseInt(document.getElementById('mileage').value),
        vin: document.getElementById('vin').value.toUpperCase(),
        plate: document.getElementById('plate').value.toUpperCase(),
        purchaseDate: document.getElementById('purchaseDate').value,
        lastOilChangeMileage: parseInt(document.getElementById('lastOilChange').value),
        lastTimingBeltMileage: parseInt(document.getElementById('lastTimingBelt').value),
        insuranceEndDate: document.getElementById('insuranceEnd').value,
        maintenanceEndDate: document.getElementById('maintenanceEnd').value,
        description: document.getElementById('description').value || '',
        link1: formatURL(document.getElementById('link1').value),
        link2: formatURL(document.getElementById('link2').value),
        link3: formatURL(document.getElementById('link3').value),
        link4: formatURL(document.getElementById('link4').value),
        createdAt: new Date().toISOString()
    };

    const carId = await saveCar(newCar);
    if (carId) {
        newCar.id = carId;
        cars.push(newCar);
        renderCarList();
        addCarModal.style.display = 'none';
        addCarForm.reset();
        showToast('Автомобиль добавлен');
    }
}

function renderCarList() {
    carList.innerHTML = '';
    cars.forEach((car, index) => {
        const carElement = document.createElement('div');
        carElement.className = 'car-item';
        carElement.innerHTML = `
            <div class="car-name">${car.name}</div>
            <div class="timer-container">
                <div class="timer ${isDateWarning(car.insuranceEndDate) ? 'warning' : ''}">
                    <div class="timer-label">Страховка</div>
                    <div class="timer-value">${formatTimeRemaining(car.insuranceEndDate)}</div>
                </div>
                <div class="timer ${isDateWarning(car.maintenanceEndDate) ? 'warning' : ''}">
                    <div class="timer-label">ТО</div>
                    <div class="timer-value">${formatTimeRemaining(car.maintenanceEndDate)}</div>
                </div>
                <div class="timer">
                    <div class="timer-label">До замены масла</div>
                    <div class="timer-value">${formatMileageRemaining(car.mileage, car.lastOilChangeMileage)} км</div>
                </div>
            </div>
        `;
        carElement.addEventListener('click', () => showCarDetails(index));
        carList.appendChild(carElement);
    });
}

// Остальные вспомогательные функции
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function formatURL(url) {
    if (!url) return '';
    try {
        new URL(url);
        return url;
    } catch {
        return url.startsWith('http') ? url : `https://${url}`;
    }
}

// Делаем функции доступными глобально для HTML
window.copyVIN = copyVIN;
window.editDescription = editDescription;

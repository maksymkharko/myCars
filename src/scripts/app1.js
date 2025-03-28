// Firebase configuration
const firebaseConfig = {
    apiKey: "5BaJOC0M4wQijmt8jCq1qgpg0iKpNfpSV5SrzCbx",
    authDomain: "telegramstorage-5e85f.firebaseapp.com",
    databaseURL: "https://telegramstorage-5e85f.firebaseio.com",
    projectId: "telegramstorage-5e85f",
    storageBucket: "telegramstorage-5e85f.appspot.com",
    messagingSenderId: "794673027643",
    appId: "1:794673027643:web:92a8afcdb21d7ccb729a1e"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        
        if (tg.initDataUnsafe.user) {
            handleTelegramAuth(tg.initDataUnsafe.user);
        } else {
            authContainer.style.display = 'block';
        }
    } else {
        // Development mode (outside Telegram)
        authContainer.style.display = 'block';
        // Test user for development
        handleTelegramAuth({ 
            id: 123456789, 
            first_name: "Тестовый",
            last_name: "Пользователь"
        });
    }
    
    setupEventListeners();
});

// Telegram Auth Handler
window.onTelegramAuth = function(user) {
    handleTelegramAuth(user);
};

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

// Firebase Functions
async function loadCars() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref(`users/${currentUser.id}/cars`).once('value');
        const carsData = snapshot.val() || {};
        
        // Convert to array
        cars = Object.keys(carsData).map(key => ({
            id: key,
            ...carsData[key]
        }));
        
        renderCarList();
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
        if (!car.id) {
            const newCarRef = database.ref(`users/${currentUser.id}/cars`).push();
            car.id = newCarRef.key;
            await newCarRef.set(car);
        } else {
            await database.ref(`users/${currentUser.id}/cars/${car.id}`).set(car);
        }
        
        return car.id;
    } catch (error) {
        console.error("Ошибка сохранения:", error);
        showToast("Ошибка сохранения", "error");
        return null;
    }
}

async function deleteCar(carId) {
    if (!currentUser) return false;
    
    try {
        await database.ref(`users/${currentUser.id}/cars/${carId}`).remove();
        return true;
    } catch (error) {
        console.error("Ошибка удаления:", error);
        showToast("Ошибка удаления", "error");
        return false;
    }
}

// Event Listeners
function setupEventListeners() {
    // Add car button
    document.querySelector('.add-car-button').addEventListener('click', () => {
        addCarModal.style.display = 'block';
    });

    // Add car form
    addCarForm.addEventListener('submit', handleAddCar);
    addCarModal.querySelector('.cancel-button').addEventListener('click', () => {
        addCarModal.style.display = 'none';
        addCarForm.reset();
    });

    // View car modal buttons
    viewCarModal.querySelector('.edit-button').addEventListener('click', handleEditCar);
    viewCarModal.querySelector('.delete-button').addEventListener('click', showDeleteConfirmation);
    viewCarModal.querySelector('.close-button').addEventListener('click', () => {
        viewCarModal.style.display = 'none';
    });

    // Confirmation dialog
    confirmationDialog.querySelector('.confirm-button').addEventListener('click', handleDeleteCar);
    confirmationDialog.querySelector('.cancel-button').addEventListener('click', () => {
        confirmationDialog.style.display = 'none';
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === addCarModal) addCarModal.style.display = 'none';
        if (e.target === viewCarModal) viewCarModal.style.display = 'none';
    });

    // Uppercase inputs
    document.getElementById('vin').addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });
    document.getElementById('plate').addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });
}

// Car Management
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

async function handleEditCar() {
    if (currentCarIndex === -1) return;
    
    const car = cars[currentCarIndex];
    const form = viewCarModal.querySelector('form');
    
    // Populate form with current values
    form.querySelector('#carName').value = car.name;
    form.querySelector('#mileage').value = car.mileage;
    form.querySelector('#vin').value = car.vin;
    form.querySelector('#plate').value = car.plate;
    form.querySelector('#purchaseDate').value = car.purchaseDate;
    form.querySelector('#lastOilChange').value = car.lastOilChangeMileage;
    form.querySelector('#lastTimingBelt').value = car.lastTimingBeltMileage;
    form.querySelector('#insuranceEnd').value = car.insuranceEndDate;
    form.querySelector('#maintenanceEnd').value = car.maintenanceEndDate;
    form.querySelector('#description').value = car.description;
    form.querySelector('#link1').value = car.link1;
    form.querySelector('#link2').value = car.link2;
    form.querySelector('#link3').value = car.link3;
    form.querySelector('#link4').value = car.link4;
    
    // Show form and hide info view
    viewCarModal.querySelector('.car-info').style.display = 'none';
    viewCarModal.querySelector('.car-form').style.display = 'block';
    viewCarModal.querySelector('.edit-button').style.display = 'none';
    viewCarModal.querySelector('.delete-button').style.display = 'none';
    viewCarModal.querySelector('.save-button').style.display = 'block';
}

async function handleDeleteCar() {
    if (currentCarIndex === -1) return;
    
    const carId = cars[currentCarIndex].id;
    const success = await deleteCar(carId);
    
    if (success) {
        cars.splice(currentCarIndex, 1);
        renderCarList();
        viewCarModal.style.display = 'none';
        confirmationDialog.style.display = 'none';
        showToast('Автомобиль удален');
    }
}

// UI Functions
function renderCarList() {
    carList.innerHTML = '';
    if (cars.length === 0) {
        carList.innerHTML = '<p class="no-cars">У вас пока нет добавленных автомобилей</p>';
        return;
    }
    
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

function showCarDetails(index) {
    currentCarIndex = index;
    const car = cars[index];
    
    const carInfo = viewCarModal.querySelector('.car-info');
    carInfo.innerHTML = `
        <h3>${car.name}</h3>
        <div class="info-grid">
            <div class="info-item">
                <label>VIN:</label>
                <div class="vin-container">
                    <span>${car.vin}</span>
                    <button class="copy-button" onclick="copyVIN('${car.vin}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="info-item">
                <label>Номер:</label>
                <span>${car.plate}</span>
            </div>
            <div class="info-item">
                <label>Пробег:</label>
                <span>${car.mileage} км</span>
            </div>
            <div class="info-item">
                <label>Дата покупки:</label>
                <span>${formatDate(car.purchaseDate)}</span>
            </div>
            <div class="info-item">
                <label>Последняя замена масла:</label>
                <span>${car.lastOilChangeMileage} км</span>
            </div>
            <div class="info-item">
                <label>Последняя замена ГРМ:</label>
                <span>${car.lastTimingBeltMileage} км</span>
            </div>
            <div class="info-item">
                <label>Страховка до:</label>
                <span>${formatDate(car.insuranceEndDate)}</span>
            </div>
            <div class="info-item">
                <label>ТО до:</label>
                <span>${formatDate(car.maintenanceEndDate)}</span>
            </div>
            <div class="info-item full-width">
                <label>Описание:</label>
                <div class="description-text">${car.description || 'Нет описания'}</div>
                <button class="edit-description-button" onclick="editDescription(${currentCarIndex})">
                    <i class="fas fa-edit"></i> Редактировать описание
                </button>
            </div>
            ${renderLinks(car)}
        </div>
    `;
    
    viewCarModal.style.display = 'block';
}

function renderLinks(car) {
    return ['link1', 'link2', 'link3', 'link4']
        .map((link, index) => {
            const url = car[link];
            return url ? `
                <div class="info-item">
                    <label>Ссылка ${index + 1}:</label>
                    <a href="${url}" target="_blank">${url}</a>
                </div>
            ` : '';
        })
        .join('');
}

function showDeleteConfirmation() {
    confirmationDialog.style.display = 'block';
}

function copyVIN(vin) {
    navigator.clipboard.writeText(vin).then(() => {
        showToast('VIN скопирован');
    }).catch(err => {
        console.error('Failed to copy VIN:', err);
        showToast('Ошибка при копировании VIN');
    });
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast';
    toast.classList.add(type);
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'Не указана';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
}

function formatTimeRemaining(dateString) {
    if (!dateString) return 'Не указана';
    
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Истекло';
    return `${days} дн.`;
}

function formatMileageRemaining(currentMileage, lastChangeMileage) {
    const remaining = OIL_CHANGE_INTERVAL - (currentMileage - lastChangeMileage);
    return remaining > 0 ? remaining : 0;
}

function isDateWarning(dateString) {
    if (!dateString) return false;
    
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= WARNING_DAYS;
}

function editDescription(index) {
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
}

function formatURL(url) {
    if (!url) return '';
    
    url = url.trim();
    if (!url) return '';
    
    // Add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        new URL(url);
        return url;
    } catch {
        return '';
    }
}

// Make functions available globally for HTML onclick attributes
window.copyVIN = copyVIN;
window.editDescription = editDescription;
window.onTelegramAuth = onTelegramAuth;

// Update timers every minute
setInterval(() => {
    renderCarList();
}, 60000);

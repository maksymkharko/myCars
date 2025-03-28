// Constants
const STORAGE_KEY = 'clownadesCars';
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
        
        // Get user data from Telegram Web App
        if (tg.initDataUnsafe.user) {
            currentUser = tg.initDataUnsafe.user;
            showToast(`Добро пожаловать, ${currentUser.first_name}!`);
            authContainer.style.display = 'none';
            loadCars();
        } else {
            // Check if user data exists in localStorage
            const storedUser = localStorage.getItem('telegram_user');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
                authContainer.style.display = 'none';
                loadCars();
            } else {
                authContainer.style.display = 'block';
            }
        }
    }
    
    renderCarList();
    setupEventListeners();
});

// Override the onTelegramAuth function
window.onTelegramAuth = function(user) {
    currentUser = user;
    localStorage.setItem('telegram_user', JSON.stringify(user));
    authContainer.style.display = 'none';
    showToast(`Добро пожаловать, ${user.first_name}!`);
    loadCars(); // Reload cars with user-specific data
};

// Event Listeners Setup
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
}

// Car Management Functions
async function loadCars() {
    try {
        // Try to load from Telegram cloud storage first
        if (tg && currentUser) {
            const userKey = `${STORAGE_KEY}_${currentUser.id}`;
            try {
                const tgData = await tg.CloudStorage.getItem(userKey);
                if (tgData) {
                    const data = JSON.parse(tgData);
                    cars = data.cars || [];
                    renderCarList();
                    return;
                }
            } catch (e) {
                console.error('Error loading from Telegram storage:', e);
            }
        }
        
        // Fallback to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            cars = data.cars || [];
            renderCarList();
        }
    } catch (e) {
        console.error('Error loading cars:', e);
        cars = [];
        renderCarList();
    }
}

async function saveCars() {
    const data = JSON.stringify({ cars });
    
    try {
        // Try to save to Telegram cloud storage first
        if (tg && currentUser) {
            const userKey = `${STORAGE_KEY}_${currentUser.id}`;
            try {
                await tg.CloudStorage.setItem(userKey, data);
            } catch (e) {
                console.error('Error saving to Telegram storage:', e);
            }
        }
        
        // Also save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, data);
    } catch (e) {
        console.error('Error saving cars:', e);
        // Fallback to localStorage only
        localStorage.setItem(STORAGE_KEY, data);
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
        link4: formatURL(document.getElementById('link4').value)
    };

    cars.push(newCar);
    await saveCars();
    renderCarList();
    addCarModal.style.display = 'none';
    addCarForm.reset();
    showToast('Автомобиль добавлен');
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
    
    cars.splice(currentCarIndex, 1);
    await saveCars();
    renderCarList();
    viewCarModal.style.display = 'none';
    confirmationDialog.style.display = 'none';
    showToast('Автомобиль удален');
}

// UI Functions
function renderCarList() {
    carList.innerHTML = '';
    cars.forEach((car, index) => {
        const carElement = createCarElement(car, index);
        carList.appendChild(carElement);
    });
}

function createCarElement(car, index) {
    const div = document.createElement('div');
    div.className = 'car-item';
    div.innerHTML = `
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

    div.addEventListener('click', () => showCarDetails(index));
    return div;
}

function renderCarInfo(car) {
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
}

function renderCarInfoEditable(car) {
    const carInfo = viewCarModal.querySelector('.car-info');
    carInfo.innerHTML = `
        <div class="form-group">
            <label>Название:</label>
            <input type="text" data-field="name" value="${car.name}" required>
        </div>
        <div class="form-group">
            <label>VIN:</label>
            <input type="text" data-field="vin" value="${car.vin}" required>
        </div>
        <div class="form-group">
            <label>Номер:</label>
            <input type="text" data-field="plate" value="${car.plate}" required>
        </div>
        <div class="form-group">
            <label>Пробег (км):</label>
            <input type="number" data-field="mileage" value="${car.mileage}" required>
        </div>
        <div class="form-group">
            <label>Дата покупки:</label>
            <input type="date" data-field="purchaseDate" value="${car.purchaseDate}" required>
        </div>
        <div class="form-group">
            <label>Пробег на последней замене масла (км):</label>
            <input type="number" data-field="lastOilChangeMileage" value="${car.lastOilChangeMileage}" required>
        </div>
        <div class="form-group">
            <label>Пробег на последней замене ГРМ (км):</label>
            <input type="number" data-field="lastTimingBeltMileage" value="${car.lastTimingBeltMileage}" required>
        </div>
        <div class="form-group">
            <label>Страховка до:</label>
            <input type="date" data-field="insuranceEndDate" value="${car.insuranceEndDate}" required>
        </div>
        <div class="form-group">
            <label>ТО до:</label>
            <input type="date" data-field="maintenanceEndDate" value="${car.maintenanceEndDate}" required>
        </div>
        <div class="form-group">
            <label>Описание:</label>
            <textarea data-field="description" rows="4">${car.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Ссылка 1:</label>
            <input type="url" data-field="link1" value="${car.link1 || ''}">
        </div>
        <div class="form-group">
            <label>Ссылка 2:</label>
            <input type="url" data-field="link2" value="${car.link2 || ''}">
        </div>
        <div class="form-group">
            <label>Ссылка 3:</label>
            <input type="url" data-field="link3" value="${car.link3 || ''}">
        </div>
        <div class="form-group">
            <label>Ссылка 4:</label>
            <input type="url" data-field="link4" value="${car.link4 || ''}">
        </div>
    `;
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
            ` : `
                <div class="info-item">
                    <label>Ссылка ${index + 1}:</label>
                    <span class="no-link">Нет ссылки</span>
                </div>
            `;
        })
        .join('');
}

// Utility Functions
function showCarDetails(index) {
    currentCarIndex = index;
    const car = cars[index];
    renderCarInfo(car);
    viewCarModal.style.display = 'block';
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

function showToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU');
}

function formatTimeRemaining(dateString) {
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} дн.`;
}

function formatMileageRemaining(currentMileage, lastChangeMileage) {
    const remaining = OIL_CHANGE_INTERVAL - (currentMileage - lastChangeMileage);
    return remaining > 0 ? remaining : 0;
}

function isDateWarning(dateString) {
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
    
    saveButton.addEventListener('click', () => {
        car.description = textarea.value;
        saveCars();
        renderCarInfo(car);
        showToast('Описание сохранено');
    });
    
    editButton.replaceWith(saveButton);
}

function formatURL(url) {
    if (!url) return '';
    
    url = url.trim();
    if (!url) return '';
    
    // Remove any existing http:// or https:// to standardize the URL
    url = url.replace(/^(https?:\/\/)/, '');
    
    // If the URL is still empty after trimming, return empty string
    if (!url) return '';
    
    // Add https:// and check if it's valid
    const fullUrl = `https://${url}`;
    try {
        new URL(fullUrl);
        return fullUrl;
    } catch {
        // If it's not a valid URL, return empty string
        return '';
    }
}

// Add input event listeners for VIN and plate number fields
document.addEventListener('DOMContentLoaded', () => {
    // Existing initialization code...
    
    // Add input event listeners for uppercase conversion
    document.getElementById('vin').addEventListener('input', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.toUpperCase();
        this.setSelectionRange(start, end);
    });

    document.getElementById('plate').addEventListener('input', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.toUpperCase();
        this.setSelectionRange(start, end);
    });
    
    // Add input event listeners for URL fields to show preview
    ['link1', 'link2', 'link3', 'link4'].forEach(id => {
        const input = document.getElementById(id);
        const previewId = `${id}Preview`;
        
        // Create preview element if it doesn't exist
        let preview = document.getElementById(previewId);
        if (!preview) {
            preview = document.createElement('div');
            preview.id = previewId;
            preview.className = 'url-preview';
            input.parentNode.insertBefore(preview, input.nextSibling);
        }
        
        input.addEventListener('input', function() {
            const formattedUrl = formatURL(this.value);
            if (formattedUrl) {
                preview.textContent = `Будет сохранено как: ${formattedUrl}`;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        });
    });
});

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    loadCars();
    renderCarList();
    
    // Update timers every minute
    setInterval(() => {
        renderCarList();
    }, 60000);
}); 
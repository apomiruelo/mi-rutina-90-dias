// Inicializar la base de datos
const dbName = "Rutina90DiasDB";
const dbVersion = 1;

let db;

// Abrir o crear la base de datos
const request = indexedDB.open(dbName, dbVersion);

request.onerror = (event) => {
    console.error("Error al abrir la base de datos:", event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    
    // Crear object store para el progreso
    if (!db.objectStoreNames.contains('progress')) {
        const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
        progressStore.createIndex('date', 'date', { unique: false });
    }
    
    // Crear object store para configuración
    if (!db.objectStoreNames.contains('settings')) {
        const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    loadProgress();
    loadSettings();
    
    // Mostrar el día actual de la semana
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const today = new Date().getDay();
    const todayElement = document.querySelector(`.nav-day[data-day="${days[today]}"]`);
    if (todayElement) {
        todayElement.click();
    }
};

// Cambiar entre días
document.querySelectorAll('.nav-day').forEach(day => {
    day.addEventListener('click', function() {
        // Remover clase active de todos los días
        document.querySelectorAll('.nav-day').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.day-content').forEach(content => content.classList.remove('active'));
        
        // Agregar clase active al día seleccionado
        this.classList.add('active');
        const dayId = this.getAttribute('data-day');
        document.getElementById(dayId).classList.add('active');
    });
});

// Función para marcar tareas como completadas
function toggleCompleted(button, taskId) {
    const scheduleItem = button.parentElement;
    button.classList.toggle('completed');
    scheduleItem.classList.toggle('completed');
    
    // Cambiar ícono
    if (button.classList.contains('completed')) {
        button.innerHTML = '<i class="fas fa-check-circle"></i>';
        
        // Guardar en la base de datos
        saveProgress(taskId, true);
    } else {
        button.innerHTML = '<i class="far fa-circle"></i>';
        
        // Eliminar de la base de datos
        saveProgress(taskId, false);
    }
    
    // Actualizar estadísticas
    updateStats();
}

// Guardar progreso en la base de datos
function saveProgress(taskId, completed) {
    if (!db) return;
    
    const transaction = db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');
    
    if (completed) {
        const progress = {
            id: taskId,
            completed: true,
            date: new Date()
        };
        store.put(progress);
    } else {
        store.delete(taskId);
    }
}

// Cargar progreso desde la base de datos
function loadProgress() {
    if (!db) return;
    
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const request = store.getAll();
    
    request.onsuccess = (event) => {
        const progress = event.target.result;
        
        progress.forEach(task => {
            const button = document.querySelector(`button[onclick*="${task.id}"]`);
            if (button) {
                button.classList.add('completed');
                button.innerHTML = '<i class="fas fa-check-circle"></i>';
                button.parentElement.classList.add('completed');
            }
        });
        
        updateStats();
    };
}

// Cargar configuraciones
function loadSettings() {
    if (!db) return;
    
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('startDate');
    
    request.onsuccess = (event) => {
        const result = event.target.result;
        if (!result) {
            // Guardar fecha de inicio si no existe
            saveStartDate();
        }
    };
}

// Guardar fecha de inicio
function saveStartDate() {
    if (!db) return;
    
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    store.put({ key: 'startDate', value: new Date() });
}

// Actualizar estadísticas
function updateStats() {
    const totalTasks = document.querySelectorAll('.check-button').length;
    const completedTasks = document.querySelectorAll('.check-button.completed').length;
    const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('successRate').textContent = `${successRate}%`;
    
    // Calcular días transcurridos desde el inicio de la rutina
    const startDate = new Date(2023, 7, 1); // 1 de Agosto de 2023
    const today = new Date();
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(diffDays, 90);
    const daysLeft = 90 - currentDay;
    
    document.getElementById('currentDay').textContent = currentDay;
    document.getElementById('daysLeft').textContent = daysLeft;
    
    // Actualizar barra de progreso global
    const globalProgress = document.getElementById('globalProgress');
    const percentage = (currentDay / 90) * 100;
    globalProgress.style.width = percentage + '%';
    
    document.getElementById('progressText').textContent = `Día ${currentDay} de 90 - ${percentage.toFixed(1)}% completado`;
}

// Service Worker para funcionamiento offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// Detectar si la app se está ejecutando en modo standalone (desde la pantalla de inicio)
function isRunningStandalone() {
    return (window.matchMedia('(display-mode: standalone)').matches) || 
           (window.navigator.standalone) || 
           (document.referrer.includes('android-app://'));
}

// Añadir estilos específicos para modo standalone
if (isRunningStandalone()) {
    document.documentElement.classList.add('standalone');
}
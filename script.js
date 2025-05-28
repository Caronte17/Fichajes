// Importar funciones necesarias
import { login, logout, checkSession } from './userAuth.js';

// Inicializar flatpickr
flatpickr('#date', { dateFormat: 'Y-m-d' });
flatpickr('#time', { enableTime: true, noCalendar: true, dateFormat: 'H:i' });
flatpickr('#leaveRange', { mode: 'range', dateFormat: 'Y-m-d' });
flatpickr('#issueDate', { dateFormat: 'Y-m-d' });

function pad(n) { return n < 10 ? '0' + n : n; }

function formatDate(date) {
  if (!date) return '';
  return date.getFullYear() + '-' + 
         pad(date.getMonth() + 1) + '-' + 
         pad(date.getDate()) + ' ' + 
         pad(date.getHours()) + ':' + 
         pad(date.getMinutes());
}

function formatYMD(date) {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Variables globales
let punches = [];
let leaves = [];
let currentUser = null;
let users = [];

// Función para actualizar la UI del usuario
function updateUserUI() {
    if (!currentUser) {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('userPanel').style.display = 'none';
        document.getElementById('actionButtonsSection').style.display = 'none';
        document.getElementById('advancedOptionsToggle').style.display = 'none';
        document.getElementById('toggleTableBtn').style.display = 'none';
        document.querySelector('h4.mb-0').style.display = 'none';
        return;
    }

    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('currentUsername').textContent = currentUser.email;
    
    document.getElementById('employee').value = currentUser.name;
    document.getElementById('leaveEmployee').value = currentUser.name;
    
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userPanel').style.display = 'block';
    document.getElementById('actionButtonsSection').style.display = 'block';
    document.getElementById('advancedOptionsToggle').style.display = 'block';
    
    document.getElementById('toggleTableBtn').style.display = 'block';
    document.getElementById('tableContainer').style.display = 'none';
    document.querySelector('h4.mb-0').style.display = 'none';
}

// Función para actualizar la tabla
function updateTableUI() {
    const tableBody = document.querySelector('#punchTable tbody');
    if (tableBody) {
        updateTable(tableBody);
    }
}

// Función para actualizar la tabla con los datos
function updateTable(tableBody) {
    if (!tableBody) return;

    const pairs = [];
    const stack = {};

    // Ordenar los fichajes por fecha
    punches.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Procesar los fichajes
    punches.forEach(p => {
        if (!stack[p.employee]) stack[p.employee] = [];
        if (p.type === 'in') {
            stack[p.employee].push(p);
        } else {
            const inEvent = stack[p.employee].pop();
            if (inEvent) {
                pairs.push({
                    employee: p.employee,
                    in: inEvent.time,
                    out: p.time
                });
            }
        }
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let monthlySum = 0, annualSum = 0;

    const pairsToSum = currentUser 
        ? pairs.filter(p => p.employee === currentUser.name)
        : pairs;

    pairsToSum.forEach(pair => {
        const dur = (new Date(pair.out) - new Date(pair.in)) / 3600000;
        if (new Date(pair.in) >= monthStart && new Date(pair.in) < nextMonth) monthlySum += dur;
        if (new Date(pair.in).getFullYear() === now.getFullYear()) annualSum += dur;
    });

    document.getElementById('monthlyTotal').textContent = monthlySum.toFixed(2);
    document.getElementById('annualTotal').textContent = annualSum.toFixed(2);

    const rows = [];

    // Añadir fichajes
    pairs.forEach(pair => {
        if (!currentUser || pair.employee === currentUser.name) {
            rows.push({
                ...pair,
                duration: (new Date(pair.out) - new Date(pair.in)) / 3600000,
                source: 'punch'
            });
        }
    });

    // Añadir fichajes pendientes
    Object.keys(stack).forEach(emp => {
        if (!currentUser || emp === currentUser.name) {
            stack[emp].forEach(inEvent => {
                rows.push({
                    employee: emp,
                    in: inEvent.time,
                    out: null,
                    duration: null,
                    source: 'punch'
                });
            });
        }
    });

    // Añadir ausencias
    leaves.forEach(l => {
        if (!currentUser || l.employee === currentUser.name) {
            const start = new Date(l.start);
            const end = new Date(l.end);
            let currentDate = new Date(start);
            
            while (currentDate <= end) {
                const day = new Date(currentDate);
                const hasPunch = punches.some(p => 
                    p.employee === l.employee && 
                    formatYMD(p.time) === formatYMD(day)
                );
                
                if (!hasPunch) {
                    rows.push({
                        employee: l.employee,
                        in: day,
                        out: null,
                        duration: null,
                        source: 'leave',
                        leaveType: l.type
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    });

    // Ordenar todas las filas por fecha
    rows.sort((a, b) => new Date(a.in) - new Date(b.in));

    // Limpiar y actualizar la tabla
    tableBody.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.source = row.source;
        tr.dataset.employee = row.employee;
        
        // Asegurarse de que in y out sean objetos Date válidos
        const inDate = row.in instanceof Date ? row.in : new Date(row.in);
        const outDate = row.out instanceof Date ? row.out : row.out ? new Date(row.out) : null;
        
        tr.dataset.in = inDate.toISOString();
        if (outDate) tr.dataset.out = outDate.toISOString();
        
        if (row.source === 'leave') {
            tr.dataset.leaveType = row.leaveType;
            tr.classList.add(row.leaveType === 'vacation' ? 'table-warning' : 'table-danger');
        }

        tr.innerHTML = `
            <td>${row.employee}</td>
            <td>${formatDate(row.in)}</td>
            <td>${row.out ? formatDate(row.out) : ''}</td>
            <td>${row.duration != null ? row.duration.toFixed(2) : ''}</td>
            <td>${row.source === 'leave' ? 
                (row.leaveType === 'vacation' ? 
                    '<span class="badge bg-warning text-dark">Vacaciones</span>' : 
                    '<span class="badge bg-danger">Baja laboral</span>') 
                : ''}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-btn"><i class="bi bi-trash"></i> Eliminar</button>
                <button class="btn btn-sm btn-warning edit-btn"><i class="bi bi-pencil"></i> Modificar</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Función para guardar fichajes
async function savePunches(punches) {
    // Solo guardar fichajes que no tienen ID (son nuevos)
    const newPunches = punches.filter(p => !p.id);
    
    if (newPunches.length === 0) return Promise.resolve();

    // Procesar cada fichaje individualmente
    const savePromises = newPunches
        .filter(p => p && p.employee && p.type && p.time)
        .map(p => {
            // Asegurarse de que time sea un objeto Date válido
            let timeValue;
            if (p.time instanceof Date) {
                timeValue = p.time.toISOString();
            } else if (typeof p.time === 'string') {
                timeValue = new Date(p.time).toISOString();
            } else {
                console.error('Invalid time value:', p.time);
                return null;
            }

            const punchData = {
                employee: p.employee.toString().trim(),
                type: p.type.toString().trim(),
                time: timeValue
            };

            return fetch('time_backend/punches.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(punchData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Error al guardar el fichaje');
                    });
                }
                return response.json();
            });
        })
        .filter(promise => promise !== null); // Filtrar promesas nulas

    if (savePromises.length === 0) return Promise.resolve();

    try {
        await Promise.all(savePromises);
        // Recargar los fichajes después de guardar
        await loadPunches();
    } catch (error) {
        console.error('Error al guardar fichajes:', error);
        // No lanzar el error para evitar que se muestre al usuario
        // solo actualizar la UI con los datos existentes
        updateTableUI();
    }
}

// Función para cargar los fichajes
async function loadPunches() {
    try {
        if (!currentUser) {
            return;
        }

        const response = await fetch('time_backend/punches.php', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar los fichajes');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        // Limpiar el array de punches antes de cargar nuevos datos
        punches = [];
        
        // Procesar los datos del servidor
        punches = data
            .filter(p => p && p.employee && p.type && p.time)
            .map(p => ({
                ...p,
                time: parseDate(p.time)
            }))
            .filter(p => p.time !== null);

        // Ordenar los fichajes por fecha
        punches.sort((a, b) => new Date(a.time) - new Date(b.time));

        updateTableUI();
    } catch (error) {
        console.error('Error al cargar fichajes:', error);
        if (!error.message.includes('No active session')) {
            alert('Error al cargar los fichajes');
        }
    }
}

// Función para cargar las ausencias
async function loadLeaves() {
    try {
        if (!currentUser) {
            return;
        }

        const response = await fetch('time_backend/leaves.php', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        leaves = data
            .filter(l => l && l.employee && l.start && l.end && l.type)
            .map(l => ({
                ...l,
                start: new Date(l.start),
                end: new Date(l.end)
            }))
            .filter(l => l.start !== null && l.end !== null);

        // Actualizar la tabla después de cargar las ausencias
        updateTableUI();
    } catch (error) {
        console.error('Error al cargar ausencias:', error);
        // No mostrar alerta si es error de sesión
        if (!error.message.includes('No active session')) {
            alert('Error al cargar las ausencias');
        }
    }
}

// Función para cargar los usuarios
async function loadUsers() {
    try {
        const response = await fetch('time_backend/users.php', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        users = data;
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        alert('Error al cargar los usuarios');
    }
}

// Función para cargar el usuario actual
async function loadCurrentUser() {
    try {
        const response = await fetch('time_backend/currentUser.php', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        currentUser = data;
        updateUserUI();

        // Solo cargar datos adicionales si hay un usuario activo
        if (currentUser) {
            // Cargar datos en paralelo para mayor velocidad
            await Promise.all([
                loadUsers(),
                loadPunches(),
                loadLeaves()
            ]);

            // Mostrar la tabla después de cargar los datos
            const tableContainer = document.getElementById('tableContainer');
            const toggleTableBtn = document.getElementById('toggleTableBtn');
            if (tableContainer && toggleTableBtn) {
                tableContainer.style.display = 'block';
                toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
            }
        }
    } catch (error) {
        console.error('Error al cargar usuario actual:', error);
        // No mostrar alerta si es error de sesión
        if (!error.message.includes('No active session')) {
            alert('Error al cargar el usuario actual');
        }
    }
}

// Función para guardar datos
async function saveData() {
    // Solo guardar si hay cambios pendientes
    const hasNewPunches = punches.some(p => !p.id);
    const hasNewLeaves = leaves.some(l => !l.id);
    
    if (!hasNewPunches && !hasNewLeaves) {
        return Promise.resolve();
    }

    const promises = [];
    
    if (hasNewPunches) {
        promises.push(savePunches(punches));
    }
    
    if (hasNewLeaves) {
        promises.push(saveLeaves(leaves));
    }
    
    return Promise.all(promises);
}

// Función para guardar ausencias
async function saveLeaves(leaves) {
    const newLeaves = leaves.filter(l => !l.id);
    
    if (newLeaves.length === 0) return Promise.resolve();

    // Procesar cada ausencia individualmente
    const savePromises = newLeaves
        .filter(l => l && l.employee && l.start && l.end && l.type)
        .map(l => {
            const start = l.start instanceof Date ? l.start : new Date(l.start);
            const end = l.end instanceof Date ? l.end : new Date(l.end);
            
            const leaveData = {
                employee: l.employee.toString().trim(),
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
                type: l.type.toString().trim()
            };

            return fetch('time_backend/leaves.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(leaveData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Error al guardar la ausencia');
                    });
                }
                return response.json();
            });
        });

    if (savePromises.length === 0) return Promise.resolve();

    try {
        await Promise.all(savePromises);
        // Recargar las ausencias después de guardar
        await loadLeaves();
    } catch (error) {
        console.error('Error al guardar ausencias:', error);
        alert(error.message);
        // No lanzar el error para evitar que se muestre al usuario
        // solo actualizar la UI con los datos existentes
        updateTableUI();
    }
}

// Función para eliminar un fichaje
async function deletePunch(punchId) {
    try {
        const response = await fetch('time_backend/punches.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id: punchId })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al eliminar el fichaje');
        }

        // Recargar los fichajes después de eliminar
        await loadPunches();
    } catch (error) {
        console.error('Error al eliminar fichaje:', error);
        alert(error.message);
    }
}

// Actualizar el manejador de inicio de sesión
document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const success = await login(email, password);
        if (success) {
            // Cargar datos inmediatamente después del login exitoso
            await loadCurrentUser();
        }
    } catch (error) {
        console.error('Error en login:', error);
        alert('Error al iniciar sesión');
    }
});

// Actualizar la función de verificación de sesión inicial
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Primero verificar la sesión
        const hasSession = await checkSession();
        
        // Actualizar UI basado en el estado de la sesión
        if (hasSession) {
            // Cargar datos inmediatamente si hay sesión
            await loadCurrentUser();
        } else {
            // Si no hay sesión, limpiar el estado y actualizar UI
            currentUser = null;
            punches = [];
            leaves = [];
            updateUserUI();
            
            // Intentar cargar usuarios sin mostrar errores si falla
            try {
                await loadUsers();
            } catch (error) {
                // Silenciar errores de carga de usuarios si no hay sesión
                console.log('No se pudieron cargar los usuarios: sesión no iniciada');
            }
        }
    } catch (error) {
        // Silenciar errores de autorización
        if (!error.message.includes('401') && !error.message.includes('Unauthorized')) {
            console.error('Error al cargar datos iniciales:', error);
        }
        // Asegurar que la UI esté en un estado consistente
        currentUser = null;
        updateUserUI();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('punchForm');
    const tableBody = document.querySelector('#punchTable tbody');
    const tableContainer = document.getElementById('tableContainer');
    const toggleTableBtn = document.getElementById('toggleTableBtn');
    
    // Al inicio, ocultar la tabla para una interfaz más limpia
    tableContainer.style.display = 'none';
    toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Mostrar tabla';
    document.querySelector('h4.mb-0').style.display = 'none';
    
    // Actualizar el botón de opciones avanzadas
    const advancedOptionsBtn = document.querySelector('[data-bs-target="#advancedOptions"]');
    advancedOptionsBtn.className = 'btn btn-outline-secondary';
    advancedOptionsBtn.innerHTML = '<i class="bi bi-gear"></i> Mostrar opciones avanzadas';
    
    // Actualizar el texto del botón cuando se expande/colapsa
    document.getElementById('advancedOptions').addEventListener('show.bs.collapse', function () {
        advancedOptionsBtn.innerHTML = '<i class="bi bi-gear"></i> Ocultar opciones avanzadas';
    });
    
    document.getElementById('advancedOptions').addEventListener('hide.bs.collapse', function () {
        advancedOptionsBtn.innerHTML = '<i class="bi bi-gear"></i> Mostrar opciones avanzadas';
    });

    toggleTableBtn.addEventListener('click', function() {
        const tableTitle = document.querySelector('h4.mb-0');
        if (tableContainer.style.display === 'none') {
            tableContainer.style.display = 'block';
            tableTitle.style.display = 'block';
            toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
        } else {
            tableContainer.style.display = 'none';
            tableTitle.style.display = 'none';
            toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Mostrar tabla';
        }
    });

    function saveCurrentUser(currentUser) {
        if (!currentUser || !currentUser.name || !currentUser.username) return Promise.resolve();

        return fetch('time_backend/currentUser.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentUser)
        });
    }

    function removeCurrentUser() {
        return fetch('time_backend/currentUser.php', {
            method: 'DELETE'
        });
    }

    // Gestionar registro de usuarios
    document.getElementById('showRegisterBtn').addEventListener('click', function() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerSection').style.display = 'block';
    });
    
    document.getElementById('cancelRegisterBtn').addEventListener('click', function() {
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('registerForm').reset();
    });
    
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        if (!name || !username || !password) {
            alert('Por favor completa todos los campos.');
            return;
        }
        
        // Verificar si el usuario ya existe
        if (users.some(u => u.username === username)) {
            alert('Este nombre de usuario ya existe. Por favor elige otro.');
            return;
        }
        
        // Crear nuevo usuario
        const newUser = {
            name: name,
            username: username,
            password: password
        };
        
        // Guardar usuario en el servidor
        fetch('time_backend/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error al registrar usuario: ' + data.error);
            } else {
                // Añadir usuario a la lista local
                users.push(newUser);
                
                alert('Usuario registrado correctamente. Ya puedes iniciar sesión.');
                
                // Ocultar formulario de registro y mostrar login
                document.getElementById('registerSection').style.display = 'none';
                document.getElementById('loginSection').style.display = 'block';
                document.getElementById('registerForm').reset();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al registrar usuario. Por favor intenta de nuevo.');
        });
    });
    
    // Gestionar logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        currentUser = null;
        saveData();
        
        // Actualizar UI
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('userPanel').style.display = 'none';
        document.getElementById('actionButtonsSection').style.display = 'none';
        document.getElementById('advancedOptionsToggle').style.display = 'none';
        
        // Ocultar la tabla y resetear el botón
        tableContainer.style.display = 'none';
        toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Mostrar tabla';
        toggleTableBtn.style.display = 'none';
        document.querySelector('h4.mb-0').style.display = 'none';
        
        // Ocultar formularios avanzados
        const advancedOptions = document.getElementById('advancedOptions');
        const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
        bsCollapse.hide();
        
        // Limpiar la tabla
        tableBody.innerHTML = '';
        
        // Limpiar los totales
        document.getElementById('monthlyTotal').textContent = '0.00';
        document.getElementById('annualTotal').textContent = '0.00';
    });
    
    // Fichar entrada rápida
    document.getElementById('quickCheckIn').addEventListener('click', function() {
        if (!currentUser) {
            alert('Debes iniciar sesión para fichar.');
            return;
        }
        
        const now = new Date();
        const timeString = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
        const [datePart, timePart] = timeString.split(', ');
        const [day, month, year] = datePart.split('/');
        const formattedDate = `${year}-${month}-${day} ${timePart}`;
        
        // Comprobar si ya existe una entrada sin salida para este empleado
        const hasPendingEntry = punches.some(p => 
            p.employee === currentUser.name && 
            p.type === 'in' && 
            !punches.some(exit => 
                exit.employee === currentUser.name && 
                exit.type === 'out' && 
                exit.time > p.time
            )
        );
        
        if (hasPendingEntry) {
            if (!confirm('Ya tienes una entrada registrada sin salida. ¿Deseas registrar otra entrada?')) {
                return;
            }
        }
        
        const newPunch = { 
            employee: currentUser.name,
            type: 'in',
            time: formattedDate
        };
        
        punches.push(newPunch);
        
        punches.sort((a, b) => a.time - b.time);
        saveData().then(() => {
            updateTable(tableBody);
            
            // Mostrar la tabla automáticamente después de fichar
            tableContainer.style.display = 'block';
            toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
            
            alert('Entrada registrada a las ' + timePart);
        }).catch(error => {
            alert('Error al guardar el fichaje. Por favor intenta de nuevo.');
        });
    });
    
    // Fichar salida rápida
    document.getElementById('quickCheckOut').addEventListener('click', function() {
        if (!currentUser) {
            alert('Debes iniciar sesión para fichar.');
            return;
        }
        
        // Comprobar si existe una entrada sin salida para este empleado
        let hasEntry = false;
        const entries = punches.filter(p => p.employee === currentUser.name && p.type === 'in');
        const exits = punches.filter(p => p.employee === currentUser.name && p.type === 'out');
        
        for (const entry of entries) {
            // Comprobar si hay una salida posterior a esta entrada
            const hasExit = exits.some(exit => exit.time > entry.time);
            if (!hasExit) {
                hasEntry = true;
                break;
            }
        }
        
        if (!hasEntry) {
            if (!confirm('No tienes ninguna entrada registrada sin salida. ¿Deseas registrar una salida de todos modos?')) {
                return;
            }
        }
        
        const now = new Date();
        const timeString = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
        const [datePart, timePart] = timeString.split(', ');
        const [day, month, year] = datePart.split('/');
        const formattedDate = `${year}-${month}-${day} ${timePart}`;
        
        const newPunch = { 
            employee: currentUser.name,
            type: 'out',
            time: formattedDate
        };
        
        punches.push(newPunch);
        
        punches.sort((a, b) => a.time - b.time);
        saveData().then(() => {
            updateTable(tableBody);
            
            // Mostrar la tabla automáticamente después de fichar
            tableContainer.style.display = 'block';
            toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
            
            alert('Salida registrada a las ' + timePart);
        }).catch(error => {
            alert('Error al guardar el fichaje. Por favor intenta de nuevo.');
        });
    });
    
    // Solicitar vacaciones rápido
    document.getElementById('quickVacation').addEventListener('click', function() {
        if (!currentUser) {
            alert('Debes iniciar sesión para solicitar vacaciones.');
            return;
        }
        
        // Mostrar el formulario avanzado
        const advancedOptions = document.getElementById('advancedOptions');
        const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
        bsCollapse.show();
        
        // Establecer vacaciones como opción seleccionada
        document.getElementById('leaveTypeVac').checked = true;
        
        // Enfocar el selector de fecha
        setTimeout(() => {
            document.getElementById('leaveRange').focus();
        }, 500);
    });
    
    // Registrar baja laboral rápido
    document.getElementById('quickSickLeave').addEventListener('click', function() {
        if (!currentUser) {
            alert('Debes iniciar sesión para registrar baja laboral.');
            return;
        }
        
        // Mostrar el formulario avanzado
        const advancedOptions = document.getElementById('advancedOptions');
        const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
        bsCollapse.show();
        
        // Establecer baja laboral como opción seleccionada
        document.getElementById('leaveTypeSick').checked = true;
        
        // Enfocar el selector de fecha
        setTimeout(() => {
            document.getElementById('leaveRange').focus();
        }, 500);
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        const employee = document.getElementById('employee').value.trim();
        const type = document.getElementById('type').value;
        const dateStr = document.getElementById('date').value;
        const timeStr = document.getElementById('time').value;
        const datetime = new Date(dateStr + 'T' + timeStr);

        if (!employee || isNaN(datetime)) return;

        if (form.dataset.editing === 'true') {
            const index = form.dataset.index;
            punches[index] = { employee, type, time: datetime };
            form.dataset.editing = 'false';
        } else {
            punches.push({ employee, type, time: datetime });
        }

        punches.sort((a, b) => a.time - b.time);
        saveData();
        updateTable(tableBody);
        form.reset();
        
        // Actualizar también el campo de empleado
        if (currentUser) {
            document.getElementById('employee').value = currentUser.name;
        }
    });

    document.getElementById('leaveForm').addEventListener('submit', async e => {
        e.preventDefault();
        const emp = document.getElementById('leaveEmployee').value.trim();
        const type = document.querySelector('input[name="leaveType"]:checked').value;
        const rangeVal = document.getElementById('leaveRange').value;
        
        if (!emp || !type || !rangeVal) {
            alert('Por favor completa todos los campos del formulario de ausencia.');
            return;
        }

        const [startStr, endStr] = rangeVal.split(' to ');
        const start = new Date(startStr);
        const end = endStr ? new Date(endStr) : start;

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            alert('Por favor selecciona fechas válidas.');
            return;
        }

        try {
            const leaveData = {
                employee: emp,
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
                type: type
            };

            const response = await fetch('time_backend/leaves.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(leaveData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al guardar la ausencia');
            }

            // Recargar las ausencias después de guardar
            await loadLeaves();
            
            // Limpiar el formulario
            e.target.reset();
            
            // Actualizar el campo de empleado
            if (currentUser) {
                document.getElementById('leaveEmployee').value = currentUser.name;
            }
            
            // Ocultar el formulario avanzado después de enviar
            const advancedOptions = document.getElementById('advancedOptions');
            const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
            bsCollapse.hide();

            // Mostrar mensaje de éxito
            alert(type === 'vacation' ? 'Vacaciones registradas correctamente' : 'Baja laboral registrada correctamente');
        } catch (error) {
            console.error('Error al guardar ausencia:', error);
            alert(error.message);
        }
    });

    // Manejo de botones Eliminar y Modificar
    document.querySelector('#punchTable').addEventListener('click', function (e) {
        const deleteBtn = e.target.closest('.delete-btn');
        const editBtn = e.target.closest('.edit-btn');
        
        if (!deleteBtn && !editBtn) return;
        
        const tr = e.target.closest('tr');
        if (!tr) return;

        const employee = tr.dataset.employee;
        const inDate = new Date(tr.dataset.in);
        const outDate = tr.dataset.out ? new Date(tr.dataset.out) : null;
        const source = tr.dataset.source;
        
        if (currentUser && employee !== currentUser.name) {
            alert('Solo puedes modificar tus propios registros.');
            return;
        }

        if (editBtn) {
            // Mostrar el formulario avanzado primero
            const advancedOptions = document.getElementById('advancedOptions');
            const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
            bsCollapse.show();
            
            // Luego llenar el formulario con los datos
            const form = document.getElementById('punchForm');
            form.dataset.editing = 'true';
            document.getElementById('employee').value = employee;

            if (!outDate) {
                document.getElementById('type').value = 'in';
                document.getElementById('date').value = inDate.toISOString().split('T')[0];
                document.getElementById('time').value = inDate.toTimeString().slice(0, 5);
                const index = punches.findIndex(p =>
                    p.employee === employee && p.type === 'in' && p.time.toISOString() === inDate.toISOString()
                );
                form.dataset.index = index;
            } else {
                document.getElementById('type').value = 'out';
                document.getElementById('date').value = outDate.toISOString().split('T')[0];
                document.getElementById('time').value = outDate.toTimeString().slice(0, 5);
                const index = punches.findIndex(p =>
                    p.employee === employee && p.type === 'out' && p.time.toISOString() === outDate.toISOString()
                );
                form.dataset.index = index;
            }
        }

        if (deleteBtn) {
            if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                if (source === 'leave') {
                    // Si es una ausencia, eliminarla de la lista de ausencias
                    const leaveStart = new Date(tr.dataset.leaveStart);
                    const leaveEnd = new Date(tr.dataset.leaveEnd);
                    const leaveType = tr.dataset.leaveType;
                    
                    leaves = leaves.filter(l => 
                        !(l.employee === employee && 
                            l.start.toISOString() === leaveStart.toISOString() && 
                            l.end.toISOString() === leaveEnd.toISOString() && 
                            l.type === leaveType)
                    );
                    saveData();
                } else {
                    // Si es un fichaje, encontrar el ID y eliminarlo
                    const punch = punches.find(p => 
                        p.employee === employee && 
                        p.time.toISOString() === inDate.toISOString()
                    );
                    
                    if (punch && punch.id) {
                        deletePunch(punch.id);
                    } else {
                        // Si no tiene ID, solo eliminarlo de la memoria
                        punches = punches.filter(p =>
                            !((p.type === 'in' && p.employee === employee && p.time.toISOString() === inDate.toISOString()) ||
                                (p.type === 'out' && outDate && p.employee === employee && p.time.toISOString() === outDate.toISOString()))
                        );
                        updateTableUI();
                    }
                }
            }
        }
    });

    updateTable(tableBody);

    // Exportar a Excel
    document.getElementById('exportExcel').addEventListener('click', function() {
        const table = document.getElementById('punchTable');
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const monthlyTotal = document.getElementById('monthlyTotal').textContent;
        const annualTotal = document.getElementById('annualTotal').textContent;
        
        // Crear encabezados con columnas adicionales
        const data = [
            ['Empleado', 'Entrada', 'Salida', 'Duración (h)', 'Ausencia', 'Total Mes (h)', 'Total Año (h)']
        ];
        
        // Agregar todas las filas, dejando las columnas de totales vacías para todas excepto la primera
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cellsData = Array.from(row.querySelectorAll('td')).slice(0, 5).map(cell => cell.textContent.trim());
            
            // Añadir columnas de totales (solo en la primera fila)
            if (i === 0) {
                cellsData.push(monthlyTotal);
                cellsData.push(annualTotal);
            } else {
                cellsData.push('');
                cellsData.push('');
            }
            
            data.push(cellsData);
        }
        
        // Si no hay filas, agregar una fila con los totales
        if (rows.length === 0) {
            data.push(['', '', '', '', '', monthlyTotal, annualTotal]);
        }
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Fichajes');
        
        const fileName = 'fichajes_' + new Date().toISOString().split('T')[0] + '.xlsx';
        XLSX.writeFile(wb, fileName);
    });
    
    // Exportar a PDF
    document.getElementById('exportPDF').addEventListener('click', function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text('Fichajes de Personal', 14, 15);
        
        const table = document.getElementById('punchTable');
        const headers = Array.from(table.querySelectorAll('thead th'))
            .slice(0, 5) // Exclude Action column
            .map(th => th.textContent);
        
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => {
            return Array.from(row.querySelectorAll('td'))
                .slice(0, 5) // Exclude Action column
                .map(td => td.textContent.trim());
        });
        
        doc.autoTable({
            head: [headers],
            body: rows,
            startY: 20,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });
        
        const summaryText = 'Total horas mes: ' + document.getElementById('monthlyTotal').textContent + 
                            ' h | Total horas año: ' + document.getElementById('annualTotal').textContent + ' h';
        doc.text(summaryText, 14, doc.lastAutoTable.finalY + 10);
        
        doc.save('fichajes_' + new Date().toISOString().split('T')[0] + '.pdf');
    });

    // Botón de reportar incidencia
    document.getElementById('reportIssueBtn').addEventListener('click', function() {
        if (!currentUser) {
            alert('Debes iniciar sesión para reportar una incidencia.');
            return;
        }
        
        // Establecer la fecha de hoy por defecto
        document.getElementById('issueDate').value = formatYMD(new Date());
        
        // Mostrar el modal
        const reportIssueModal = new bootstrap.Modal(document.getElementById('reportIssueModal'));
        reportIssueModal.show();
    });
    
    // Enviar el reporte de incidencia
    document.getElementById('submitIssue').addEventListener('click', function() {
        const issueType = document.getElementById('issueType').value;
        const issueDescription = document.getElementById('issueDescription').value;
        const issueDate = document.getElementById('issueDate').value;
        
        if (!issueType || !issueDescription || !issueDate) {
            alert('Por favor completa todos los campos del formulario.');
            return;
        }
        
        // Simular envío de email
        const email = 'recursos.humanos@empresa.com';
        const subject = 'Incidencia en sistema de fichajes: ' + issueType;
        const body = `
            Empleado: ${currentUser.name} (${currentUser.username})
            Tipo de incidencia: ${issueType}
            Fecha de la incidencia: ${issueDate}
            
            Descripción:
            ${issueDescription}
            
            Enviado desde el sistema de fichajes el ${formatDate(new Date())}
        `;
        
        console.log('Enviando email a:', email);
        console.log('Asunto:', subject);
        console.log('Cuerpo:', body);
        
        // En un sistema real, aquí se enviaría el email mediante una API o backend
        
        // Mostrar confirmación
        alert('Tu incidencia ha sido reportada correctamente. El departamento de RRHH ha sido notificado y atenderá tu solicitud lo antes posible.');
        
        // Cerrar el modal y limpiar el formulario
        const reportIssueModal = bootstrap.Modal.getInstance(document.getElementById('reportIssueModal'));
        reportIssueModal.hide();
        document.getElementById('issueForm').reset();
    });

    // Función para registrar un fichaje
    async function registerPunch(type) {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (!user) {
                alert('Debes iniciar sesión primero');
                return;
            }

            const response = await fetch('time_backend/punches.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employee: user.name,
                    type: type
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error);
            }

            alert(type === 'in' ? 'Entrada registrada' : 'Salida registrada');
            loadPunches(); // Recargar la lista de fichajes
        } catch (error) {
            alert(error.message);
        }
    }

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        // Botón de entrada rápida
        const quickCheckIn = document.getElementById('quickCheckIn');
        if (quickCheckIn) {
            quickCheckIn.addEventListener('click', () => registerPunch('in'));
        }

        // Botón de salida rápida
        const quickCheckOut = document.getElementById('quickCheckOut');
        if (quickCheckOut) {
            quickCheckOut.addEventListener('click', () => registerPunch('out'));
        }

        // Cargar fichajes iniciales si hay sesión
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            loadPunches();
        }
    });
});

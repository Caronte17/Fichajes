// Exportar funciones necesarias
export { loadUsers, loadPunches, loadLeaves, updateTableUI };

// Importar funciones necesarias
import { login, logout, checkSession, getCurrentUser, currentUser } from './userAuth.js';

// Inicializar flatpickr
flatpickr('#date', { 
    dateFormat: 'Y-m-d',
    time_24hr: true
});
flatpickr('#time', { 
    enableTime: true, 
    noCalendar: true, 
    dateFormat: 'H:i',
    time_24hr: true
});
flatpickr('#leaveRange', { 
    mode: 'range', 
    dateFormat: 'Y-m-d',
    time_24hr: true
});
flatpickr('#issueDate', { 
    dateFormat: 'Y-m-d',
    time_24hr: true
});

function pad(n) { return n < 10 ? '0' + n : n; }

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' + 
           pad(d.getMonth() + 1) + '-' + 
           pad(d.getDate()) + ' ' + 
           pad(d.getHours()) + ':' + 
           pad(d.getMinutes());
}

function formatYMD(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' + 
           pad(d.getMonth() + 1) + '-' + 
           pad(d.getDate());
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

// Variables globales
let punches = [];
let leaves = [];
let users = [];

// Función para actualizar la UI del usuario
export function updateUserUI() {
    if (!currentUser) {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('userPanel').style.display = 'none';
        document.getElementById('actionButtonsSection').style.display = 'none';
        document.getElementById('advancedOptionsToggle').style.display = 'none';
        document.getElementById('toggleTableBtn').style.display = 'none';
        document.querySelector('h4.mb-0').style.display = 'none';
        document.getElementById('tableContainer').style.display = 'none';
        return;
    }

    // Actualizar información del usuario
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('currentUsername').textContent = currentUser.email;
    
    // Mostrar indicador de administrador si corresponde
    const isAdmin = currentUser.role === 'admin';
    if (isAdmin) {
        document.getElementById('currentUsername').innerHTML = currentUser.email + ' <span class="badge bg-danger">Administrador</span>';
    }
    
    // Actualizar campos de formulario
    document.getElementById('employee').value = currentUser.name;
    document.getElementById('leaveEmployee').value = currentUser.name;
    
    // Mostrar secciones necesarias
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userPanel').style.display = 'block';
    document.getElementById('actionButtonsSection').style.display = 'block';
    document.getElementById('advancedOptionsToggle').style.display = 'block';
    document.getElementById('toggleTableBtn').style.display = 'block';
    document.querySelector('h4.mb-0').style.display = 'block';
    
    // Configurar visibilidad de la tabla
    const tableContainer = document.getElementById('tableContainer');
    const toggleTableBtn = document.getElementById('toggleTableBtn');
    
    if (tableContainer && toggleTableBtn) {
        tableContainer.style.display = 'block';
        toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
        
        // Asegurarse de que la tabla tenga contenido
        const tableBody = document.querySelector('#punchTable tbody');
        if (tableBody) {
            updateTable(tableBody);
        }
    }
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
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }

    console.log('Updating table with punches:', punches);
    console.log('Current leaves:', leaves);

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
                    out: p.time,
                    inId: inEvent.id,
                    outId: p.id
                });
            }
        }
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let monthlySum = 0, annualSum = 0;

    // Calcular totales
    pairs.forEach(pair => {
        const dur = (new Date(pair.out) - new Date(pair.in)) / 3600000;
        if (new Date(pair.in) >= monthStart && new Date(pair.in) < nextMonth) monthlySum += dur;
        if (new Date(pair.in).getFullYear() === now.getFullYear()) annualSum += dur;
    });

    document.getElementById('monthlyTotal').textContent = monthlySum.toFixed(2);
    document.getElementById('annualTotal').textContent = annualSum.toFixed(2);

    const rows = [];

    // Añadir fichajes
    pairs.forEach(pair => {
        rows.push({
            ...pair,
            duration: (new Date(pair.out) - new Date(pair.in)) / 3600000,
            source: 'punch',
            inId: pair.inId,
            outId: pair.outId
        });
    });

    // Añadir fichajes pendientes
    Object.keys(stack).forEach(emp => {
        stack[emp].forEach(inEvent => {
            rows.push({
                employee: emp,
                in: inEvent.time,
                out: null,
                duration: null,
                source: 'punch',
                inId: inEvent.id
            });
        });
    });

    // Añadir ausencias
    leaves.forEach(l => {
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
                    leaveType: l.type,
                    id: l.id
                });
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });

    // Ordenar todas las filas por fecha
    rows.sort((a, b) => new Date(a.in) - new Date(b.in));

    console.log('Generated rows:', rows);

    // Limpiar y actualizar la tabla
    tableBody.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.source = row.source;
        tr.dataset.employee = row.employee;
        
        const inDate = row.in instanceof Date ? row.in : new Date(row.in);
        const outDate = row.out instanceof Date ? row.out : row.out ? new Date(row.out) : null;
        
        tr.dataset.in = inDate.toISOString();
        if (outDate) tr.dataset.out = outDate.toISOString();
        
        if (row.source === 'leave') {
            tr.dataset.leaveType = row.leaveType;
            tr.dataset.id = row.id;
            tr.classList.add(row.leaveType === 'vacation' ? 'table-warning' : 'table-danger');
        }

        // Añadir el ID del fichaje al dataset de la fila
        if (row.source === 'punch') {
            if (row.inId) tr.dataset.punchId = row.inId;
            if (row.outId) tr.dataset.outPunchId = row.outId;
        }

        // Verificar si el usuario actual es administrador
        const isAdmin = getCurrentUser() && getCurrentUser().role === 'admin';

        // Crear los botones solo si el usuario es administrador
        const actionButtons = isAdmin ? `
            <button class="btn btn-sm btn-danger delete-btn" data-id="${row.source === 'punch' ? row.inId : row.id}" data-source="${row.source}">
                <i class="bi bi-trash"></i> Eliminar
            </button>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${row.source === 'punch' ? row.inId : row.id}" data-source="${row.source}">
                <i class="bi bi-pencil"></i> Modificar
            </button>
        ` : '';

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
            <td>${actionButtons}</td>
        `;
        tableBody.appendChild(tr);
    });

    // Asegurarse de que la tabla sea visible
    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
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
        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.log('No hay usuario actual, no se cargarán los fichajes');
            return;
        }

        console.log('Cargando fichajes...');
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

        console.log('Fichajes recibidos:', data);

        // Limpiar el array de punches antes de cargar nuevos datos
        punches = [];
        
        // Procesar los datos del servidor
        punches = data
            .filter(p => p && p.employee && p.type && p.time)
            .map(p => ({
                ...p,
                id: parseInt(p.id), // Asegurarnos de que el ID sea un número
                time: parseDate(p.time)
            }))
            .filter(p => p.time !== null);

        console.log('Fichajes procesados:', punches);

        // Ordenar los fichajes por fecha
        punches.sort((a, b) => new Date(a.time) - new Date(b.time));

        // Asegurarse de que la tabla sea visible
        const tableContainer = document.getElementById('tableContainer');
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }

        // Actualizar la tabla
        const tableBody = document.querySelector('#punchTable tbody');
        if (tableBody) {
            updateTable(tableBody);
        } else {
            console.error('No se encontró el elemento tbody de la tabla');
        }
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
        const currentUser = getCurrentUser();
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
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.status === 401) {
            console.log('No hay sesión activa');
            currentUser = null;
            updateUserUI();
            return;
        }
        
        if (!response.ok) {
            throw new Error('Error al cargar el usuario actual');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        if (data.success && data.data) {
            currentUser = data.data;
            console.log('Current user loaded:', currentUser);
            updateUserUI();

            // Solo cargar datos adicionales si hay un usuario activo
            if (currentUser) {
                try {
                    // Cargar datos en paralelo para mayor velocidad
                    await Promise.all([
                        loadUsers(),
                        loadPunches(),
                        loadLeaves()
                    ]);
                    
                    // Forzar la actualización de la tabla
                    const tableBody = document.querySelector('#punchTable tbody');
                    if (tableBody) {
                        updateTable(tableBody);
                    }
                } catch (error) {
                    console.error('Error al cargar datos adicionales:', error);
                }
            }
        } else {
            currentUser = null;
            updateUserUI();
        }
    } catch (error) {
        console.error('Error al cargar usuario actual:', error);
        currentUser = null;
        updateUserUI();
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

// Event delegation for edit and delete buttons
const tableBody = document.querySelector('#punchTable tbody');
if (tableBody) {
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const row = target.closest('tr');
        
        if (!row) return;

        console.log('Click detected on table row:', row);

        // Handle delete button
        if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            console.log('Delete button clicked');
            const deleteBtn = target.classList.contains('delete-btn') ? target : target.closest('.delete-btn');
            const id = parseInt(deleteBtn.dataset.id);
            const source = deleteBtn.dataset.source;
            console.log('ID to delete:', id, 'Source:', source);
            
            if (id) {
                if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                    if (source === 'punch') {
                        await deletePunch(id);
                    } else if (source === 'leave') {
                        await deleteLeave(id);
                    }
                }
            } else {
                console.error('No ID found on delete button');
            }
        }

        // Handle edit button
        if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
            console.log('Edit button clicked');
            const editBtn = target.classList.contains('edit-btn') ? target : target.closest('.edit-btn');
            const id = parseInt(editBtn.dataset.id);
            const source = editBtn.dataset.source;
            console.log('ID to edit:', id, 'Source:', source);
            
            if (id) {
                if (source === 'punch') {
                    const punch = punches.find(p => p.id === id);
                    console.log('Found punch to edit:', punch);
                    
                    if (punch) {
                        // Fill the form with punch data
                        document.getElementById('employee').value = punch.employee;
                        document.getElementById('type').value = punch.type;
                        
                        // Formatear la fecha y hora para los campos
                        const punchDate = new Date(punch.time);
                        document.getElementById('date').value = formatYMD(punchDate);
                        document.getElementById('time').value = formatDate(punchDate).split(' ')[1];
                        
                        // Mostrar opciones avanzadas
                        const advancedOptions = document.getElementById('advancedOptions');
                        const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: true });
                        bsCollapse.show();
                        
                        // Configurar el formulario para edición
                        const punchForm = document.getElementById('punchForm');
                        punchForm.dataset.editing = 'true';
                        punchForm.dataset.punchId = id;
                        
                        // Cambiar el texto del botón de submit
                        const submitBtn = punchForm.querySelector('button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.textContent = 'Actualizar Fichaje';
                        }
                        
                        // Hacer scroll hasta el formulario
                        advancedOptions.scrollIntoView({ behavior: 'smooth' });
                    }
                } else if (source === 'leave') {
                    const leave = leaves.find(l => l.id === id);
                    console.log('Found leave to edit:', leave);
                    
                    if (leave) {
                        // Fill the form with leave data
                        document.getElementById('leaveEmployee').value = leave.employee;
                        document.getElementById('leaveRange').value = `${formatYMD(leave.start)} to ${formatYMD(leave.end)}`;
                        document.querySelector(`input[name="leaveType"][value="${leave.type}"]`).checked = true;
                        
                        // Mostrar opciones avanzadas
                        const advancedOptions = document.getElementById('advancedOptions');
                        const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: true });
                        bsCollapse.show();
                        
                        // Configurar el formulario para edición
                        const leaveForm = document.getElementById('leaveForm');
                        leaveForm.dataset.editing = 'true';
                        leaveForm.dataset.leaveId = id;
                        
                        // Cambiar el texto del botón de submit
                        const submitBtn = leaveForm.querySelector('button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.textContent = 'Actualizar Ausencia';
                        }
                        
                        // Hacer scroll hasta el formulario
                        advancedOptions.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            } else {
                console.error('No ID found on edit button');
            }
        }
    });
}

// Función para eliminar un fichaje
async function deletePunch(punchId) {
    if (!punchId) {
        console.error('No punch ID provided');
        return;
    }

    try {
        console.log('Deleting punch with ID:', punchId);
        const response = await fetch('./time_backend/punches.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id: punchId })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error al eliminar el fichaje');
        }

        // Recargar los fichajes después de eliminar
        await loadPunches();
        alert('Fichaje eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar fichaje:', error);
        alert(error.message || 'Error al eliminar el fichaje');
    }
}

// Función para eliminar una ausencia
async function deleteLeave(leaveId) {
    if (!leaveId) {
        console.error('No leave ID provided');
        return;
    }
    
    try {
        console.log('Deleting leave with ID:', leaveId);
        const response = await fetch('./time_backend/leaves.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ id: leaveId })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error al eliminar la ausencia');
        }

        // Recargar las ausencias después de eliminar
        await loadLeaves();
        alert('Ausencia eliminada correctamente');
    } catch (error) {
        console.error('Error al eliminar ausencia:', error);
        alert(error.message || 'Error al eliminar la ausencia');
    }
}

// Función para actualizar una ausencia
async function updateLeave(leaveData) {
    try {
        const response = await fetch('./time_backend/leaves.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(leaveData)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al actualizar la ausencia');
        }

        // Recargar las ausencias después de actualizar
        await loadLeaves();
        alert('Ausencia actualizada correctamente');
    } catch (error) {
        console.error('Error al actualizar ausencia:', error);
        alert(error.message || 'Error al actualizar la ausencia');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Primero verificar la sesión
        const hasSession = await checkSession();
        
        // Si hay sesión, cargar datos adicionales
        if (hasSession) {
            // Cargar todos los datos necesarios
            await Promise.all([
                loadUsers(),
                loadPunches(),
                loadLeaves()
            ]);
            
            // Actualizar la tabla
            updateTableUI();
        }

        // Inicializar event listeners
        initializeEventListeners();
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
    }
});

// Función para inicializar todos los event listeners
function initializeEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await login(email, password);
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
        });
    }

    // Quick action buttons
    const quickCheckIn = document.getElementById('quickCheckIn');
    if (quickCheckIn) {
        quickCheckIn.addEventListener('click', async () => {
            try {
                const response = await fetch('time_backend/punches.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ type: 'in' })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Error al fichar entrada');
                }

                alert('Entrada registrada correctamente');
                await loadPunches();
            } catch (error) {
                console.error('Error al fichar entrada:', error);
                alert(error.message);
            }
        });
    }

    const quickCheckOut = document.getElementById('quickCheckOut');
    if (quickCheckOut) {
        quickCheckOut.addEventListener('click', async () => {
            try {
                const response = await fetch('time_backend/punches.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ type: 'out' })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Error al fichar salida');
                }

                alert('Salida registrada correctamente');
                await loadPunches();
            } catch (error) {
                console.error('Error al fichar salida:', error);
                alert(error.message);
            }
        });
    }

    const quickVacation = document.getElementById('quickVacation');
    if (quickVacation) {
        quickVacation.addEventListener('click', () => {
            // Mostrar el formulario de ausencias
            const advancedOptions = document.getElementById('advancedOptions');
            const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: true });
            bsCollapse.show();
            
            // Seleccionar el tipo de ausencia como vacaciones
            document.getElementById('leaveTypeVac').checked = true;
            
            // Enfocar el campo de rango de fechas
            document.getElementById('leaveRange').focus();
        });
    }

    const quickSickLeave = document.getElementById('quickSickLeave');
    if (quickSickLeave) {
        quickSickLeave.addEventListener('click', () => {
            // Mostrar el formulario de ausencias
            const advancedOptions = document.getElementById('advancedOptions');
            const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: true });
            bsCollapse.show();
            
            // Seleccionar el tipo de ausencia como baja
            document.getElementById('leaveTypeSick').checked = true;
            
            // Enfocar el campo de rango de fechas
            document.getElementById('leaveRange').focus();
        });
    }

    const reportIssueBtn = document.getElementById('reportIssueBtn');
    if (reportIssueBtn) {
        reportIssueBtn.addEventListener('click', () => {
            // Mostrar el modal de reporte de incidencias
            const reportIssueModal = new bootstrap.Modal(document.getElementById('reportIssueModal'));
            reportIssueModal.show();
        });
    }

    // Toggle table button
    const toggleTableBtn = document.getElementById('toggleTableBtn');
    if (toggleTableBtn) {
        toggleTableBtn.addEventListener('click', function() {
            const tableContainer = document.getElementById('tableContainer');
            const tableTitle = document.querySelector('h4.mb-0');
            
            if (tableContainer.style.display === 'none') {
                tableContainer.style.display = 'block';
                tableTitle.style.display = 'block';
                this.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
            } else {
                tableContainer.style.display = 'none';
                tableTitle.style.display = 'none';
                this.innerHTML = '<i class="bi bi-table"></i> Mostrar tabla';
            }
        });
    }

    // Punch form
    const punchForm = document.getElementById('punchForm');
    if (punchForm) {
        punchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = getCurrentUser();
            if (!currentUser) {
                alert('No hay usuario activo');
                return;
            }

            const employee = document.getElementById('employee').value.trim();
            const type = document.getElementById('type').value;
            const dateStr = document.getElementById('date').value;
            const timeStr = document.getElementById('time').value;
            const datetime = new Date(dateStr + 'T' + timeStr);

            if (!employee || isNaN(datetime)) {
                alert('Por favor completa todos los campos correctamente');
                return;
            }

            try {
                const punchData = {
                    employee: employee,
                    type: type,
                    time: datetime.toISOString()
                };

                // Si estamos en modo edición, añadir el ID
                if (punchForm.dataset.editing === 'true') {
                    punchData.id = punchForm.dataset.punchId;
                }

                const response = await fetch('./time_backend/punches.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(punchData)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Error al guardar el fichaje');
                }

                // Mostrar mensaje de éxito
                alert(punchForm.dataset.editing === 'true' ? 
                    'Fichaje modificado correctamente' : 
                    'Fichaje registrado correctamente');

                // Recargar los fichajes y actualizar la tabla
                await loadPunches();
                
                // Limpiar el formulario
                punchForm.reset();
                
                // Restaurar el campo de empleado
                document.getElementById('employee').value = currentUser.name;
                
                // Restaurar el texto del botón de submit
                const submitBtn = punchForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Registrar Fichaje';
                }
                
                // Limpiar el modo de edición
                delete punchForm.dataset.editing;
                delete punchForm.dataset.punchId;
                
                // Ocultar el formulario avanzado
                const advancedOptions = document.getElementById('advancedOptions');
                const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
                bsCollapse.hide();
            } catch (error) {
                console.error('Error al guardar fichaje:', error);
                alert(error.message);
            }
        });
    }

    // Leave form
    const leaveForm = document.getElementById('leaveForm');
    if (leaveForm) {
        leaveForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = getCurrentUser();
            if (!currentUser) {
                alert('No hay usuario activo');
                return;
            }
            
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

                // Si estamos en modo edición, añadir el ID
                if (leaveForm.dataset.editing === 'true') {
                    leaveData.id = leaveForm.dataset.leaveId;
                    await updateLeave(leaveData);
                } else {
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
                }

                // Recargar las ausencias después de guardar
                await loadLeaves();
                
                // Limpiar el formulario
                e.target.reset();
                
                // Actualizar el campo de empleado
                document.getElementById('leaveEmployee').value = currentUser.name;
                
                // Ocultar el formulario avanzado después de enviar
                const advancedOptions = document.getElementById('advancedOptions');
                const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
                bsCollapse.hide();

                // Limpiar el modo de edición
                delete leaveForm.dataset.editing;
                delete leaveForm.dataset.leaveId;
                
                // Restaurar el texto del botón de submit
                const submitBtn = leaveForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Añadir';
                }

                // Mostrar mensaje de éxito
                alert(leaveForm.dataset.editing === 'true' ? 
                    'Ausencia actualizada correctamente' : 
                    (type === 'vacation' ? 'Vacaciones registradas correctamente' : 'Baja laboral registrada correctamente'));
            } catch (error) {
                console.error('Error al guardar ausencia:', error);
                alert(error.message);
            }
        });
    }
}

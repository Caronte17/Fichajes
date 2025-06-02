import { currentUser, getCurrentUser } from './users.js';
import { formatDate, formatYMD, calculateDuration } from './utils.js';
import { loadPunches } from './punches.js';
import { loadLeaves } from './leaves.js';

let punches = [];
let leaves = [];

export function setData({ punchList, leaveList }) {
    punches = punchList;
    leaves = leaveList;
}

export function clearAllForms() {
    const forms = [
        document.getElementById('loginForm'),
        document.getElementById('registerForm'),
        document.getElementById('punchForm'),
        document.getElementById('leaveForm'),
        document.getElementById('issueForm')
    ];
    forms.forEach(form => {
        if (form) {
            // Si el formulario tiene un campo de empleado, guarda su valor antes de resetear
            let empleadoValue = null;
            let leaveEmpleadoValue = null;
            if (form.id === 'punchForm') {
                const empleadoInput = form.querySelector('#employee');
                if (empleadoInput) empleadoValue = empleadoInput.value;
            }
            if (form.id === 'leaveForm') {
                const leaveEmpleadoInput = form.querySelector('#leaveEmployee');
                if (leaveEmpleadoInput) leaveEmpleadoValue = leaveEmpleadoInput.value;
            }
            form.reset();
            // Restaurar el valor del campo de empleado si corresponde
            if (form.id === 'punchForm' && empleadoValue !== null) {
                const empleadoInput = form.querySelector('#employee');
                if (empleadoInput) empleadoInput.value = empleadoValue;
            }
            if (form.id === 'leaveForm' && leaveEmpleadoValue !== null) {
                const leaveEmpleadoInput = form.querySelector('#leaveEmployee');
                if (leaveEmpleadoInput) leaveEmpleadoInput.value = leaveEmpleadoValue;
            }
        }
    });
    // Limpiar campos manuales si flatpickr o valores custom
    if (document.getElementById('date')) document.getElementById('date').value = '';
    if (document.getElementById('time')) document.getElementById('time').value = '';
    if (document.getElementById('leaveRange')) document.getElementById('leaveRange').value = '';
}

export function updateUserUI() {
    const currentUser = getCurrentUser();
    const tableContainer = document.getElementById('tableContainer');
    const loginSection = document.getElementById('loginSection');
    const userPanel = document.getElementById('userPanel');
    const actionButtonsSection = document.getElementById('actionButtonsSection');
    const advancedOptionsToggle = document.getElementById('advancedOptionsToggle');
    const toggleTableBtn = document.getElementById('toggleTableBtn');
    const h4mb0 = document.querySelector('h4.mb-0');

    if (!currentUser) {
        // Oculta la tabla y paneles si no hay usuario
        if (tableContainer) tableContainer.style.display = 'none';
        if (userPanel) userPanel.style.display = 'none';
        if (actionButtonsSection) actionButtonsSection.style.display = 'none';
        if (advancedOptionsToggle) advancedOptionsToggle.style.display = 'none';
        if (toggleTableBtn) toggleTableBtn.style.display = 'none';
        if (h4mb0) h4mb0.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
        // Limpiar tabla
        const tableBody = document.querySelector('#punchTable tbody');
        if (tableBody) tableBody.innerHTML = '';
        // Limpiar totales
        if (document.getElementById('monthlyTotal')) document.getElementById('monthlyTotal').textContent = '0.00';
        if (document.getElementById('annualTotal')) document.getElementById('annualTotal').textContent = '0.00';
        // Limpiar formularios
        clearAllForms();
        // Ocultar opciones avanzadas (collapse) SOLO con clases
        const advancedOptions = document.getElementById('advancedOptions');
        if (advancedOptions) {
            advancedOptions.classList.remove('show');
        }
        return;
    }

    // Muestra la tabla y paneles si hay usuario
    if (tableContainer) tableContainer.style.display = 'block';
    if (userPanel) userPanel.style.display = 'block';
    if (actionButtonsSection) actionButtonsSection.style.display = 'block';
    if (advancedOptionsToggle) advancedOptionsToggle.style.display = 'block';
    if (toggleTableBtn) toggleTableBtn.style.display = 'block';
    if (h4mb0) h4mb0.style.display = 'block';
    if (loginSection) loginSection.style.display = 'none';

    // Actualiza los datos del usuario en el panel
    const currentUserName = document.getElementById('currentUserName');
    const currentUsername = document.getElementById('currentUsername');
    if (currentUserName) currentUserName.textContent = currentUser.name;
    if (currentUsername) currentUsername.textContent = currentUser.email;

    if (currentUser.role === 'admin') {
        currentUsername.innerHTML = `${currentUser.email} <span class="badge bg-danger">Administrador</span>`;
    }

    // Si tienes campos para el nombre en formularios, actualízalos
    const employeeInput = document.getElementById('employee');
    const leaveEmployeeInput = document.getElementById('leaveEmployee');
    if (employeeInput) employeeInput.value = currentUser.name;
    if (leaveEmployeeInput) leaveEmployeeInput.value = currentUser.name;

    // Asignar manualmente el evento click al botón de collapse (sin depender de data-bs-toggle)
    const advancedOptionsBtn = document.getElementById('advancedOptionsBtn');
    const collapseEl = document.getElementById('advancedOptions');
    if (advancedOptionsBtn && collapseEl && typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
        advancedOptionsBtn.onclick = null;
        advancedOptionsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const collapseInstance = bootstrap.Collapse.getOrCreateInstance(collapseEl);
            collapseInstance.toggle();
        });
    }
}

export function updateTableUI() {
    updateTable(document.querySelector('#punchTable tbody'));

    // Calcular totales de horas
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let monthlyTotal = 0;
    let annualTotal = 0;
    punches.forEach(p => {
        if (p.type === 'in') {
            const outPunch = punches.find(p2 =>
                p2.type === 'out' &&
                p2.employee === p.employee &&
                new Date(p2.time).toDateString() === new Date(p.time).toDateString() &&
                new Date(p2.time) > new Date(p.time)
            );
            if (outPunch) {
                const duration = calculateDuration(p.time, outPunch.time);
                const punchDate = new Date(p.time);
                if (punchDate.getFullYear() === currentYear) {
                    annualTotal += duration;
                    if (punchDate.getMonth() === currentMonth) {
                        monthlyTotal += duration;
                    }
                }
            }
        }
    });
    // Sumar 8h por cada día de vacaciones
    leaves.forEach(l => {
        if (l.type === 'vacation') {
            let start = new Date(l.start);
            let end = new Date(l.end);
            // Normalizar a medianoche para evitar problemas de horas
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            let current = new Date(start);
            while (current <= end) {
                if (current.getFullYear() === currentYear) {
                    annualTotal += 8;
                    if (current.getMonth() === currentMonth) {
                        monthlyTotal += 8;
                    }
                }
                current.setDate(current.getDate() + 1);
            }
        }
    });
    document.getElementById('monthlyTotal').textContent = monthlyTotal.toFixed(2);
    document.getElementById('annualTotal').textContent = annualTotal.toFixed(2);
}

function deleteItem(id, source) {
    const endpoint = source === 'leave' ? 'time_backend/leaves.php' : 'time_backend/punches.php';
    fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Error al eliminar el elemento');
            });
        }
        return response.json();
    })
    .then(() => {
        // Recargar los datos y actualizar la tabla
        if (source === 'punch') {
            loadPunches();
        } else if (source === 'leave') {
            loadLeaves();
        }
    })
    .catch(error => {
        alert(error.message);
    });
}

function editItem(id, source) {
    if (source === 'punch') {
        // Buscar el punch por id
        const punch = punches.find(p => p.id == id);
        if (!punch) return alert('Fichaje no encontrado');
        // Mostrar el formulario
        const advancedToggle = document.getElementById('advancedOptionsToggle');
        const advancedOptions = document.getElementById('advancedOptions');
        if (advancedToggle && advancedOptions) {
            advancedOptions.classList.add('show');
            advancedToggle.style.display = 'block';
        }
        // Rellenar campos
        document.getElementById('employee').value = punch.employee;
        document.getElementById('type').value = punch.type;
        const dateObj = new Date(punch.time);
        document.getElementById('date').value = dateObj.toISOString().slice(0,10);
        document.getElementById('time').value = dateObj.toTimeString().slice(0,5);
        // Guardar id en edición
        document.getElementById('punchForm').setAttribute('data-edit-id', id);
        // Cambiar texto del botón
        document.querySelector('#punchForm button[type="submit"]').textContent = 'Guardar cambios';
    } else if (source === 'leave') {
        // Buscar la ausencia por id
        const leave = leaves.find(l => l.id == id);
        if (!leave) return alert('Ausencia no encontrada');
        // Mostrar el formulario
        const advancedToggle = document.getElementById('advancedOptionsToggle');
        const advancedOptions = document.getElementById('advancedOptions');
        if (advancedToggle && advancedOptions) {
            advancedOptions.classList.add('show');
            advancedToggle.style.display = 'block';
        }
        // Rellenar campos
        document.getElementById('leaveEmployee').value = leave.employee;
        document.getElementById('leaveRange').value = leave.start.toISOString().slice(0,10) + (leave.start.getTime() !== leave.end.getTime() ? ' a ' + leave.end.toISOString().slice(0,10) : '');
        document.getElementById('leaveTypeVac').checked = leave.type === 'vacation';
        document.getElementById('leaveTypeSick').checked = leave.type === 'sick';
        // Guardar id en edición
        document.getElementById('leaveForm').setAttribute('data-edit-id', id);
        // Cambiar texto del botón
        document.querySelector('#leaveForm button[type="submit"]').textContent = 'Guardar cambios';
    }
}

function addEventListenersToButtons() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const editButtons = document.querySelectorAll('.edit-btn');

    // Limpiar event listeners previos usando clonación
    deleteButtons.forEach(button => {
        const newBtn = button.cloneNode(true);
        button.parentNode.replaceChild(newBtn, button);
    });
    editButtons.forEach(button => {
        const newBtn = button.cloneNode(true);
        button.parentNode.replaceChild(newBtn, button);
    });

    // Seleccionar de nuevo tras reemplazo
    const freshDeleteButtons = document.querySelectorAll('.delete-btn');
    const freshEditButtons = document.querySelectorAll('.edit-btn');

    freshDeleteButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const id = button.getAttribute('data-id');
            const source = button.getAttribute('data-source');
            if (source === 'punch') {
                // Buscar la fila para ver si tiene inId y outId
                const tr = button.closest('tr');
                const inId = tr && tr.dataset.punchId ? tr.dataset.punchId : null;
                const outId = tr && tr.dataset.outPunchId ? tr.dataset.outPunchId : null;
                // Si ambos existen, eliminar ambos
                if (inId && outId) {
                    if (!confirm('¿Seguro que quieres eliminar ambos fichajes (entrada y salida) de este día?')) return;
                    try {
                        await deleteItem(inId, 'punch');
                        await deleteItem(outId, 'punch');
                        alert('Fichajes de entrada y salida eliminados correctamente');
                        await loadPunches();
                    } catch (err) {
                        alert('Error al eliminar fichajes: ' + err.message);
                    }
                } else {
                    if (!confirm('¿Seguro que quieres eliminar este fichaje?')) return;
                    try {
                        await deleteItem(id, 'punch');
                        alert('Fichaje eliminado correctamente');
                        await loadPunches();
                    } catch (err) {
                        alert('Error al eliminar fichaje: ' + err.message);
                    }
                }
            } else if (source === 'leave') {
                if (!confirm('¿Seguro que quieres eliminar esta ausencia?')) return;
                try {
                    await deleteItem(id, 'leave');
                } catch (err) {
                    alert('Error al eliminar ausencia: ' + err.message);
                }
            }
        });
    });

    freshEditButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const id = button.getAttribute('data-id');
            const source = button.getAttribute('data-source');
            editItem(id, source);
        });
    });
}

function updateTable(tableBody) {
    if (!tableBody) return;

    punches.sort((a, b) => new Date(a.time) - new Date(b.time));
    const rows = [];
    const processedPunches = new Set();

    punches.forEach(p => {
        if (processedPunches.has(p.id)) return;

        if (p.type === 'in') {
            const outPunch = punches.find(p2 =>
                p2.type === 'out' &&
                p2.employee === p.employee &&
                new Date(p2.time).toDateString() === new Date(p.time).toDateString() &&
                new Date(p2.time) > new Date(p.time)
            );

            if (outPunch) {
                processedPunches.add(p.id);
                processedPunches.add(outPunch.id);
            }

            rows.push({
                employee: p.employee,
                in: p.time,
                out: outPunch ? outPunch.time : null,
                duration: outPunch ? calculateDuration(p.time, outPunch.time) : null,
                source: 'punch',
                inId: p.id,
                outId: outPunch ? outPunch.id : null
            });
        } else if (p.type === 'out' && !processedPunches.has(p.id)) {
            rows.push({
                employee: p.employee,
                in: null,
                out: p.time,
                duration: null,
                source: 'punch',
                inId: null,
                outId: p.id
            });
            processedPunches.add(p.id);
        }
    });

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

    rows.sort((a, b) => {
        const dateA = a.in || a.out;
        const dateB = b.in || b.out;
        return new Date(dateA) - new Date(dateB);
    });

    tableBody.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.source = row.source;
        tr.dataset.employee = row.employee;

        const inDate = row.in instanceof Date ? row.in : row.in ? new Date(row.in) : null;
        const outDate = row.out instanceof Date ? row.out : row.out ? new Date(row.out) : null;

        if (inDate) tr.dataset.in = inDate.toISOString();
        if (outDate) tr.dataset.out = outDate.toISOString();

        if (row.source === 'leave') {
            tr.dataset.leaveType = row.leaveType;
            tr.dataset.id = row.id;
            tr.classList.add(row.leaveType === 'vacation' ? 'table-warning' : 'table-danger');
        }

        if (row.source === 'punch') {
            if (row.inId) tr.dataset.punchId = row.inId;
            if (row.outId) tr.dataset.outPunchId = row.outId;
        }

        // Asignar data-id correctamente
        let editId = '';
        if (row.source === 'punch') {
            editId = row.inId ? row.inId : row.outId;
        } else if (row.source === 'leave') {
            editId = row.id;
        }

        const isAdmin = getCurrentUser() && getCurrentUser().role === 'admin';
        const actionButtons = isAdmin ? `
            <button class="btn btn-sm btn-danger delete-btn" data-id="${editId}" data-source="${row.source}">
                <i class="bi bi-trash"></i> Eliminar
            </button>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${editId}" data-source="${row.source}">
                <i class="bi bi-pencil"></i> Modificar
            </button>
        ` : '';

        // Mostrar solo la fecha (YYYY-MM-DD) para ausencias
        const entrada = row.source === 'leave' && inDate ? inDate.toISOString().slice(0,10) : (inDate ? formatDate(inDate) : '');
        const salida = row.source === 'leave' && outDate ? outDate.toISOString().slice(0,10) : (outDate ? formatDate(outDate) : '');

        tr.innerHTML = `
            <td>${row.employee}</td>
            <td>${entrada}</td>
            <td>${salida}</td>
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

    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }

    // Agregar eventos a los botones después de actualizar la tabla
    addEventListenersToButtons();
}

export function exportToExcel() {
    const table = document.getElementById('punchTable');
    if (!table) return alert('No hay datos para exportar');

    const wb = XLSX.utils.table_to_book(table, { sheet: 'Sheet1' });
    XLSX.writeFile(wb, 'export.xlsx');
}

export function exportToPDF() {
    const table = document.getElementById('punchTable');
    if (!table) return alert('No hay datos para exportar');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.autoTable({ html: '#punchTable' });
    doc.save('export.pdf');
}

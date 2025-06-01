// events.js
import { login, logout, getCurrentUser, handleRegister } from './users.js';
import { loadPunches, savePunches, deletePunch } from './punches.js';
import { loadLeaves, saveLeaves, deleteLeave } from './leaves.js';
import { createDateTime } from './utils.js';
import { updateUserUI } from './ui.js';

export function initializeEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('Formulario de login no encontrado');
        return;
    }
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
        loginForm.reset();
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) {
        console.error('Botón de logout no encontrado');
        return;
    }
    logoutBtn.addEventListener('click', async () => {
        await logout();
        // Limpiar formularios y UI
        import('./ui.js').then(mod => {
            if (mod.clearAllForms) mod.clearAllForms();
            if (mod.updateUserUI) mod.updateUserUI();
        });
    });

    const quickCheckIn = document.getElementById('quickCheckIn');
    if (quickCheckIn) {
        quickCheckIn.addEventListener('click', async () => {
            const currentUser = getCurrentUser();
            if (!currentUser) return alert('No hay usuario activo');

            await fetch('time_backend/punches.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: 'in' })
            });

            alert('Entrada registrada correctamente');
            await loadPunches();
        });
    }

    const quickCheckOut = document.getElementById('quickCheckOut');
    if (quickCheckOut) {
        quickCheckOut.addEventListener('click', async () => {
            const currentUser = getCurrentUser();
            if (!currentUser) return alert('No hay usuario activo');

            await fetch('time_backend/punches.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: 'out' })
            });

            alert('Salida registrada correctamente');
            await loadPunches();
        });
    }

    const reportIssueBtn = document.getElementById('reportIssueBtn');
    if (reportIssueBtn) {
        reportIssueBtn.addEventListener('click', () => {
            const reportIssueModal = new bootstrap.Modal(document.getElementById('reportIssueModal'));
            reportIssueModal.show();
        });
    }

    const toggleTableBtn = document.getElementById('toggleTableBtn');
    if (toggleTableBtn) {
        toggleTableBtn.addEventListener('click', function() {
            const tableContainer = document.getElementById('tableContainer');
            const tableTitle = document.querySelector('h4.mb-0');

            const visible = tableContainer.style.display !== 'none';
            tableContainer.style.display = visible ? 'none' : 'block';
            tableTitle.style.display = visible ? 'none' : 'block';
            this.innerHTML = `<i class="bi bi-table"></i> ${visible ? 'Mostrar' : 'Ocultar'} tabla`;
        });
    }

    const quickVacation = document.getElementById('quickVacation');
    if (quickVacation) {
        quickVacation.addEventListener('click', () => {
            // Mostrar opciones avanzadas
            const advancedToggle = document.getElementById('advancedOptionsToggle');
            const advancedOptions = document.getElementById('advancedOptions');
            if (advancedToggle && advancedOptions) {
                advancedOptions.classList.add('show');
                advancedToggle.style.display = 'block';
            }
            // Preseleccionar tipo vacaciones
            const vacRadio = document.getElementById('leaveTypeVac');
            if (vacRadio) vacRadio.checked = true;
            // Poner foco en el campo de rango de fechas
            const leaveRange = document.getElementById('leaveRange');
            if (leaveRange) leaveRange.focus();
        });
    }

    const quickSickLeave = document.getElementById('quickSickLeave');
    if (quickSickLeave) {
        quickSickLeave.addEventListener('click', () => {
            // Mostrar opciones avanzadas
            const advancedToggle = document.getElementById('advancedOptionsToggle');
            const advancedOptions = document.getElementById('advancedOptions');
            if (advancedToggle && advancedOptions) {
                advancedOptions.classList.add('show');
                advancedToggle.style.display = 'block';
            }
            // Preseleccionar tipo baja
            const sickRadio = document.getElementById('leaveTypeSick');
            if (sickRadio) sickRadio.checked = true;
            // Poner foco en el campo de rango de fechas
            const leaveRange = document.getElementById('leaveRange');
            if (leaveRange) leaveRange.focus();
        });
    }

    // Event listener para el formulario de ausencias
    const leaveForm = document.getElementById('leaveForm');
    if (leaveForm) {
        leaveForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = getCurrentUser();
            if (!currentUser) return alert('No hay usuario activo');
            const leaveEmployee = document.getElementById('leaveEmployee').value;
            const leaveRange = document.getElementById('leaveRange').value;
            const leaveType = document.querySelector('input[name="leaveType"]:checked')?.value;
            if (!leaveRange || !leaveType) return alert('Debes seleccionar un rango de fechas y tipo');
            let start, end;
            let fechas = leaveRange.split(' a ');
            if (fechas.length === 1) {
                fechas = leaveRange.split(' to ');
            }
            if (fechas.length === 2) {
                start = fechas[0].trim();
                end = fechas[1].trim();
            } else {
                start = end = leaveRange.trim();
            }
            const editId = leaveForm.getAttribute('data-edit-id');
            if (editId) {
                // PUT para editar
                try {
                    const response = await fetch('time_backend/leaves.php', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            id: editId,
                            employee: leaveEmployee,
                            start,
                            end,
                            type: leaveType
                        })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Error al editar la ausencia');
                    alert('Ausencia editada correctamente');
                    leaveForm.removeAttribute('data-edit-id');
                    document.querySelector('#leaveForm button[type="submit"]').textContent = 'Añadir';
                    await loadLeaves();
                } catch (error) {
                    alert(error.message || 'Error al editar la ausencia');
                }
            } else {
                await saveLeaves([
                    {
                        employee: leaveEmployee,
                        start,
                        end,
                        type: leaveType
                    }
                ]);
                alert('Ausencia registrada correctamente');
                await loadLeaves();
            }
            leaveForm.reset();
        });
    }

    // Event listener para el formulario de fichajes manuales
    const punchForm = document.getElementById('punchForm');
    if (punchForm) {
        punchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = getCurrentUser();
            if (!currentUser) return alert('No hay usuario activo');
            const employee = document.getElementById('employee').value;
            const type = document.getElementById('type').value;
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            if (!employee || !type || !date || !time) return alert('Todos los campos son obligatorios');
            const dateTime = createDateTime(date, time);
            if (isNaN(dateTime.getTime())) return alert('Fecha u hora inválida');
            const editId = punchForm.getAttribute('data-edit-id');
            if (editId) {
                // PUT para editar
                try {
                    let timeValue = dateTime.getFullYear() + '-' +
                        String(dateTime.getMonth() + 1).padStart(2, '0') + '-' +
                        String(dateTime.getDate()).padStart(2, '0') + ' ' +
                        String(dateTime.getHours()).padStart(2, '0') + ':' +
                        String(dateTime.getMinutes()).padStart(2, '0') + ':00';
                    const response = await fetch('time_backend/punches.php', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            id: editId,
                            employee,
                            type,
                            time: timeValue
                        })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Error al editar el fichaje');
                    alert('Fichaje editado correctamente');
                    punchForm.removeAttribute('data-edit-id');
                    document.querySelector('#punchForm button[type="submit"]').textContent = 'Registrar Fichaje';
                    await loadPunches();
                } catch (error) {
                    alert(error.message || 'Error al editar el fichaje');
                }
            } else {
                await savePunches([
                    {
                        employee,
                        type,
                        time: dateTime
                    }
                ]);
                alert('Fichaje registrado correctamente');
                await loadPunches();
            }
            punchForm.reset();
        });
    }

    const showRegisterBtn = document.getElementById('showRegisterBtn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            const registerSection = document.getElementById('registerSection');
            const loginSection = document.getElementById('loginSection');
            if (registerSection) registerSection.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerUsername').value;
            const password = document.getElementById('registerPassword').value;
            if (!name || !email || !password) return alert('Todos los campos son obligatorios');
            try {
                await handleRegister(email, password, name);
                alert('Usuario registrado correctamente. Ahora puedes iniciar sesión.');
                // Alternar a login
                const registerSection = document.getElementById('registerSection');
                const loginSection = document.getElementById('loginSection');
                if (registerSection) registerSection.style.display = 'none';
                if (loginSection) loginSection.style.display = 'block';
            } catch (error) {
                alert(error.message || 'Error al registrar usuario');
            }
            registerForm.reset();
        });
    }

    const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
    if (cancelRegisterBtn) {
        cancelRegisterBtn.addEventListener('click', () => {
            const registerSection = document.getElementById('registerSection');
            const loginSection = document.getElementById('loginSection');
            if (registerSection) registerSection.style.display = 'none';
            if (loginSection) loginSection.style.display = 'block';
            if (registerForm) registerForm.reset();
        });
    }

    // Limpiar issueForm tras enviar
    const issueForm = document.getElementById('issueForm');
    const submitIssue = document.getElementById('submitIssue');
    if (issueForm && submitIssue) {
        submitIssue.addEventListener('click', () => {
            issueForm.reset();
        });
    }
}

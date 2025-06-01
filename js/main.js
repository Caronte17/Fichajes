import { initializeEventListeners } from './events.js';
import { checkSession, loadUsers } from './users.js';
import { loadPunches, getPunches } from './punches.js';
import { loadLeaves, getLeaves } from './leaves.js';
import { setData, updateTableUI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const hasSession = await checkSession();

        if (hasSession) {
            try {
                await Promise.all([
                    loadUsers(),
                    loadPunches(),
                    loadLeaves()
                ]);

                const punchesData = getPunches();
                const leavesData = getLeaves();
                console.log('Datos cargados:', { punchesData, leavesData });

                setData({
                    punchList: punchesData,
                    leaveList: leavesData
                });

                updateTableUI();
            } catch (error) {
                console.error('Error al cargar datos:', error);
            }
        }

        // Inicialización de flatpickr (migrado de script.js)
        flatpickr('#date', { 
            dateFormat: 'Y-m-d',
            time_24hr: true
        });
        flatpickr('#time', { 
            enableTime: true, 
            noCalendar: true, 
            dateFormat: 'h:i K', // Formato 12h con AM/PM
            time_24hr: false     // Mostrar selector AM/PM
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

        initializeEventListeners();
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
    }
});

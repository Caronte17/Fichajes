// punches.js
import { parseDate, calculateDuration, parseDateLocal } from './utils.js';
import { updateTableUI, setData } from './ui.js';
import { getLeaves } from './leaves.js';
// import { loadPunches } from './punches.js';


let punches = [];

export function getPunches() {
    return punches;
}

export async function loadPunches() {
    try {
        const response = await fetch('time_backend/punches.php', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Error al cargar los fichajes');

        const data = await response.json();
        console.log('Datos de fichajes cargados:', data);
        if (data.error) throw new Error(data.error);

        punches = data
            .filter(p => p && p.employee && p.type && p.time)
            .map(p => ({
                ...p,
                id: parseInt(p.id),
                time: parseDateLocal(p.time)
            }))
            .filter(p => p.time !== null);
        console.log('Punches actualizados:', punches);
        punches.sort((a, b) => new Date(a.time) - new Date(b.time));
        setData({ punchList: punches, leaveList: getLeaves() });
        updateTableUI();
    } catch (error) {
        console.error('Error al cargar fichajes:', error);
        if (!error.message.includes('No active session')) {
            alert('Error al cargar los fichajes');
        }
    }
}

export async function savePunches(punchList) {
    const newPunches = punchList.filter(p => !p.id);
    if (newPunches.length === 0) return;

    const savePromises = newPunches
        .filter(p => p && p.employee && p.type && p.time)
        .map(p => {
            let timeValue;
            if (p.time instanceof Date) {
                // Formato local: YYYY-MM-DD HH:mm:ss
                timeValue = p.time.getFullYear() + '-' +
                    String(p.time.getMonth() + 1).padStart(2, '0') + '-' +
                    String(p.time.getDate()).padStart(2, '0') + ' ' +
                    String(p.time.getHours()).padStart(2, '0') + ':' +
                    String(p.time.getMinutes()).padStart(2, '0') + ':00';
            } else if (typeof p.time === 'string') {
                const d = new Date(p.time);
                timeValue = d.getFullYear() + '-' +
                    String(d.getMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getDate()).padStart(2, '0') + ' ' +
                    String(d.getHours()).padStart(2, '0') + ':' +
                    String(d.getMinutes()).padStart(2, '0') + ':00';
            } else {
                console.warn('Datos de fichaje incompletos:', p);
                return null;
            }

            const punchData = {
                employee: p.employee.trim(),
                type: p.type.trim(),
                time: timeValue
            };

            return fetch('time_backend/punches.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(punchData)
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(data => {
                        throw new Error(data.error || 'Error al guardar el fichaje');
                    });
                }
                return res.json();
            });
        })
        .filter(p => p !== null);

    try {
        await Promise.all(savePromises);
        await loadPunches();
    } catch (error) {
        console.error('Error al guardar fichajes:', error);
        updateTableUI();
    }
}

export async function deletePunch(punchId) {
    if (!punchId) return;

    try {
        const response = await fetch('./time_backend/punches.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: punchId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al eliminar el fichaje');

        await loadPunches();
    } catch (error) {
        console.error('Error al eliminar fichaje:', error);
        throw error;
    }
}

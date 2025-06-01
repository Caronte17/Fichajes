// leaves.js
import { updateTableUI } from './ui.js';
import { getPunches } from './punches.js';
import { setData } from './ui.js';
// import { loadLeaves } from './leaves.js';


let leaves = [];

export function getLeaves() {
    return leaves;
}

export async function loadLeaves() {
    try {
        const response = await fetch('time_backend/leaves.php', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Error al cargar las ausencias');

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        leaves = data
            .filter(l => l && l.employee && l.start && l.end && l.type)
            .map(l => ({
                ...l,
                start: new Date(l.start),
                end: new Date(l.end)
            }))
            .filter(l => l.start !== null && l.end !== null);

        // Sincronizar el estado global
        setData({ punchList: getPunches(), leaveList: leaves });

        updateTableUI();
    } catch (error) {
        console.error('Error al cargar ausencias:', error);
        if (!error.message.includes('No active session')) {
            alert('Error al cargar las ausencias');
        }
    }
}

export async function saveLeaves(newLeaves) {
    const leavesToSave = newLeaves.filter(l => !l.id);
    if (leavesToSave.length === 0) return;

    const savePromises = leavesToSave
        .filter(l => l && l.employee && l.start && l.end && l.type)
        .map(l => {
            const leaveData = {
                employee: l.employee.trim(),
                start: (l.start instanceof Date) ? l.start.toISOString().split('T')[0] : l.start,
                end: (l.end instanceof Date) ? l.end.toISOString().split('T')[0] : l.end,
                type: l.type.trim()
            };
            console.log('Enviando leaveData:', leaveData);

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

    try {
        await Promise.all(savePromises);
        await loadLeaves();
    } catch (error) {
        console.error('Error al guardar ausencias:', error);
        alert(error.message);
        updateTableUI();
    }
}

export async function deleteLeave(leaveId) {
    if (!leaveId) return;

    try {
        const response = await fetch('./time_backend/leaves.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: leaveId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al eliminar la ausencia');

        await loadLeaves();
        alert('Ausencia eliminada correctamente');
    } catch (error) {
        console.error('Error al eliminar ausencia:', error);
        alert(error.message || 'Error al eliminar la ausencia');
    }
}

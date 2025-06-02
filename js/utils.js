// Funciones auxiliares
export function pad(n) {
    return n < 10 ? '0' + n : n;
}

export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' + 
           pad(d.getMonth() + 1) + '-' + 
           pad(d.getDate()) + ' ' + 
           pad(d.getHours()) + ':' + 
           pad(d.getMinutes());
}

export function formatYMD(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' + 
           pad(d.getMonth() + 1) + '-' + 
           pad(d.getDate());
}

export function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

export function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    return diffMs / (1000 * 60 * 60); // horas
}

export function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('es-ES', { 
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function createDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hours = 0, minutes = 0;
    let ampm = null;
    // Soporta formatos: 'HH:mm', 'hh:mm AM', 'hh:mm PM'
    if (/am|pm/i.test(timeStr)) {
        // 12h con AM/PM
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([APap][Mm])/);
        if (match) {
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            ampm = match[3].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
        }
    } else {
        // 24h
        [hours, minutes] = timeStr.split(':').map(Number);
    }
    return new Date(year, month - 1, day, hours, minutes);
}

export function parseDateLocal(dateStr) {
    // dateStr: 'YYYY-MM-DD HH:mm:ss'
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart || !timePart) return null;
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
}

import { updateUserUI } from './ui.js';
import { loadPunches, getPunches } from './punches.js';
import { loadLeaves, getLeaves } from './leaves.js';
import { updateTableUI, setData } from './ui.js';

export let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export async function checkSession() {
    try {
        const response = await fetch('time_backend/currentUser.php', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 401) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            updateUserUI();
            return false;
        }

        if (!response.ok) throw new Error('Error al verificar sesión');

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (data.success && data.data) {
            currentUser = data.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserUI();
            updateTableUI();
            return true;
        } else {
            currentUser = null;
            localStorage.removeItem('currentUser');
            updateUserUI();
            updateTableUI();
            return false;
        }
    } catch (error) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        updateUserUI();
        return false;
    }
}

export async function loadUsers() {
    try {
        const response = await fetch('time_backend/users.php', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Error al cargar los usuarios');

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        return data;
    } catch (error) {
        alert('Error al cargar los usuarios');
        return [];
    }
}

export async function login(email, password) {
    try {
        const response = await fetch('time_backend/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error al iniciar sesión');
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Error al iniciar sesión');

        currentUser = data.data;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateUserUI();

        try {
            await Promise.all([
                loadUsers(),
                loadPunches(),
                loadLeaves()
            ]);
            setData({ punchList: getPunches(), leaveList: getLeaves() });
            updateTableUI();
        } catch (error) {
        }

        return true;
    } catch (error) {
        alert(error.message);
        return false;
    }
}

export async function logout() {
    try {
        const response = await fetch('time_backend/login.php', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        localStorage.removeItem('currentUser');
        currentUser = null;

        updateUserUI();
        return true;
    } catch (error) {
        alert(error.message);
        return false;
    }
}

export async function handleRegister(email, password, name) {
    try {
        const response = await fetch('./time_backend/users.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, name })
        });

        if (!response.ok) throw new Error('Error en el registro');

        const data = await response.json();
        if (data.success) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            updateUserUI();
            updateTableUI();
            return true;
        } else {
            throw new Error(data.message || 'Error en el registro');
        }
    } catch (error) {
        throw error;
    }
}

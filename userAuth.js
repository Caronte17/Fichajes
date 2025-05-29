// Importar funciones necesarias
import { loadUsers, loadPunches, loadLeaves, updateTableUI, updateUserUI } from './script.js';

// Variable global para el usuario actual
export let currentUser = null;

// Función para obtener el usuario actual
export function getCurrentUser() {
    return currentUser;
}

// Función para iniciar sesión
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

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Error al iniciar sesión');
        }

        // Guardar usuario en localStorage y actualizar variable global
        currentUser = data.data;
        localStorage.setItem('currentUser', JSON.stringify(data.data));
        
        // Actualizar UI
        updateUserUI();
        
        // Cargar datos adicionales y actualizar la tabla
        try {
            await Promise.all([
                loadUsers(),
                loadPunches(),
                loadLeaves()
            ]);
            
            // Forzar la actualización de la tabla
            const tableBody = document.querySelector('#punchTable tbody');
            if (tableBody) {
                updateTableUI();
            }
        } catch (error) {
            console.error('Error al cargar datos después del login:', error);
        }
        
        return true;
    } catch (error) {
        alert(error.message);
        return false;
    }
}

// Función para cerrar sesión
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
        if (!data.success) {
            throw new Error(data.error);
        }

        // Limpiar localStorage y variable global
        localStorage.removeItem('currentUser');
        currentUser = null;
        
        // Actualizar UI
        updateUserUI();
        
        return true;
    } catch (error) {
        alert(error.message);
        return false;
    }
}

// Función para verificar el estado de la sesión
export async function checkSession() {
    try {
        const response = await fetch('time_backend/currentUser.php', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        // Si la respuesta es 401, retornamos false sin lanzar error
        if (response.status === 401) {
            console.log('No hay sesión activa');
            localStorage.removeItem('currentUser');
            currentUser = null;
            return false;
        }

        // Si hay un error que no es 401, lo manejamos
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.success && data.data) {
            // Actualizar el usuario actual
            currentUser = data.data;
            localStorage.setItem('currentUser', JSON.stringify(data.data));
            
            // Actualizar la UI
            updateUserUI();
            
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('currentUser');
        currentUser = null;
        return false;
    }
}

// Función para manejar el registro
export async function handleRegister(email, password, name) {
  try {
    const response = await fetch('./time_backend/register.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      throw new Error('Error en el registro');
    }

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
    console.error('Error en registro:', error);
    throw error;
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
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

    // Verificar si hay sesión activa
    checkSession().then(hasSession => {
        if (hasSession) {
            updateUserUI();
        }
    });
}); 
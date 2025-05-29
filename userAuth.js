// Importar funciones necesarias
import { loadUsers, loadPunches, loadLeaves, updateTableUI } from './script.js';

// Función para iniciar sesión
export async function login(email, password) {
    try {
        const response = await fetch('time_backend/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Error al iniciar sesión');
        }

        // Guardar usuario en localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.data));
        
        // Actualizar UI
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('userPanel').style.display = 'block';
        document.getElementById('actionButtonsSection').style.display = 'block';
        document.getElementById('advancedOptionsToggle').style.display = 'block';
        document.getElementById('toggleTableBtn').style.display = 'block';
        document.querySelector('h4.mb-0').style.display = 'block';
        
        // Actualizar información del usuario
        document.getElementById('currentUserName').textContent = data.data.name;
        document.getElementById('currentUsername').textContent = data.data.email;
        
        // Mostrar indicador de administrador si corresponde
        if (data.data.role === 'admin') {
            document.getElementById('currentUsername').innerHTML = data.data.email + ' <span class="badge bg-danger">Administrador</span>';
        }
        
        // Actualizar campos de formulario
        document.getElementById('employee').value = data.data.name;
        document.getElementById('leaveEmployee').value = data.data.name;
        
        // Cargar datos adicionales
        await Promise.all([
            loadUsers(),
            loadPunches(),
            loadLeaves()
        ]);
        
        // Actualizar la tabla
        updateTableUI();
        
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
            credentials: 'include'
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        // Limpiar localStorage
        localStorage.removeItem('currentUser');
        
        // Actualizar UI
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('userPanel').style.display = 'none';
        
        // Limpiar la tabla de fichajes
        document.querySelector('#punchTable tbody').innerHTML = '';
        
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
            credentials: 'include'
        });

        // Si la respuesta es 401, retornamos false sin lanzar error
        if (response.status === 401) {
            return false;
        }

        // Si hay un error que no es 401, lo manejamos
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.success && data.data) {
            localStorage.setItem('currentUser', JSON.stringify(data.data));
            return true;
        }

        return false;
    } catch (error) {
        // Silenciar completamente los errores 401 y no loguear nada
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            return false;
        }
        // Solo loguear otros tipos de errores
        if (!error.message.includes('401') && !error.message.includes('Unauthorized')) {
            console.error('Error checking session:', error);
        }
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
            const user = JSON.parse(localStorage.getItem('currentUser'));
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('userPanel').style.display = 'block';
            document.getElementById('currentUserName').textContent = user.name;
            document.getElementById('currentUsername').textContent = user.email;
        }
    });
}); 
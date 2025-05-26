// Inicializar flatpickr
flatpickr('#date', { dateFormat: 'Y-m-d' });
flatpickr('#time', { enableTime: true, noCalendar: true, dateFormat: 'H:i' });
flatpickr('#leaveRange', { mode: 'range', dateFormat: 'Y-m-d' });
flatpickr('#issueDate', { dateFormat: 'Y-m-d' });

function pad(n) { return n < 10 ? '0' + n : n; }

function formatDate(date) {
  if (!date) return '';
  return date.getFullYear() + '-' + 
         pad(date.getMonth() + 1) + '-' + 
         pad(date.getDate()) + ' ' + 
         pad(date.getHours()) + ':' + 
         pad(date.getMinutes());
}

function formatYMD(date) {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Variables globales
let punches = [];
let leaves = [];
let currentUser = null;
let users = [];

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('punchForm');
  const tableBody = document.querySelector('#punchTable tbody');
  const tableContainer = document.getElementById('tableContainer');
  const toggleTableBtn = document.getElementById('toggleTableBtn');
  
  // Al inicio, ocultar la tabla para una interfaz más limpia
  tableContainer.style.display = 'none';
  toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Mostrar tabla';
  
  toggleTableBtn.addEventListener('click', function() {
    if (tableContainer.style.display === 'none') {
      tableContainer.style.display = 'block';
      toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
    } else {
      tableContainer.style.display = 'none';
      toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Mostrar tabla';
    }
  });

  // Función para actualizar la tabla
  function updateTable(tableBody) {
    const pairs = [];
    const stack = {};

    punches.sort((a, b) => a.time - b.time);

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
            out: p.time
          });
        }
      }
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let monthlySum = 0, annualSum = 0;

    const pairsToSum = currentUser 
      ? pairs.filter(p => p.employee === currentUser.name)
      : pairs;

    pairsToSum.forEach(pair => {
      const dur = (pair.out - pair.in) / 3600000;
      if (pair.in >= monthStart && pair.in < nextMonth) monthlySum += dur;
      if (pair.in.getFullYear() === now.getFullYear()) annualSum += dur;
    });

    document.getElementById('monthlyTotal').textContent = monthlySum.toFixed(2);
    document.getElementById('annualTotal').textContent = annualSum.toFixed(2);

    const rows = [];

    pairs.forEach(pair => {
      if (!currentUser || pair.employee === currentUser.name) {
        rows.push({
          ...pair,
          duration: (pair.out - pair.in) / 3600000,
          source: 'punch'
        });
      }
    });

    Object.keys(stack).forEach(emp => {
      if (!currentUser || emp === currentUser.name) {
        stack[emp].forEach(inEvent => {
          rows.push({
            employee: emp,
            in: inEvent.time,
            out: null,
            duration: null,
            source: 'punch'
          });
        });
      }
    });

    leaves.forEach(l => {
      if (!currentUser || l.employee === currentUser.name) {
        const d = new Date(l.start);
        while (d <= l.end) {
          const day = new Date(d);
          const hasPunch = punches.some(p => p.employee === l.employee && formatYMD(p.time) === formatYMD(day));
          if (!hasPunch) {
            rows.push({
              employee: l.employee,
              in: day,
              out: null,
              duration: null,
              source: 'leave',
              leaveStart: l.start,
              leaveEnd: l.end,
              leaveType: l.type
            });
          }
          d.setDate(d.getDate() + 1);
        }
      }
    });

    rows.sort((a, b) => a.in - b.in);
    tableBody.innerHTML = '';
    rows.forEach(row => {
      const leave = leaves.find(l =>
        l.employee === row.employee &&
        formatYMD(row.in) >= formatYMD(l.start) &&
        formatYMD(row.in) <= formatYMD(l.end)
      );

      const tr = document.createElement('tr');
      tr.dataset.source = row.source;
      tr.dataset.employee = row.employee;
      tr.dataset.in = row.in.toISOString();
      if (row.out) tr.dataset.out = row.out.toISOString();
      if (row.source === 'leave') {
        tr.dataset.leaveStart = row.leaveStart.toISOString();
        tr.dataset.leaveEnd = row.leaveEnd.toISOString();
        tr.dataset.leaveType = row.leaveType;
      }

      if (leave) tr.classList.add(leave.type === 'vacation' ? 'table-warning' : 'table-danger');

      tr.innerHTML = `
        <td>${row.employee}</td>
        <td>${formatDate(row.in)}</td>
        <td>${row.out ? formatDate(row.out) : ''}</td>
        <td>${row.duration != null ? row.duration.toFixed(2) : ''}</td>
        <td>${leave ? (leave.type === 'vacation' ? '<span class="badge bg-info text-dark">Vacaciones</span>' : '<span class="badge bg-danger">Baja laboral</span>') : ''}</td>
        <td>
          <button class="btn btn-sm btn-danger delete-btn"><i class="bi bi-trash"></i> Eliminar</button>
          <button class="btn btn-sm btn-warning edit-btn"><i class="bi bi-pencil"></i> Modificar</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Función para guardar fichajes
  function savePunches(punches) {
    const newPunches = punches.filter(p => !p.id);
    
    if (newPunches.length === 0) return Promise.resolve();

    const validPunches = newPunches
      .filter(p => p && p.employee && p.type && p.time)
      .map(p => ({
        employee: p.employee.toString().trim(),
        type: p.type.toString().trim(),
        time: p.time instanceof Date ? p.time.toISOString() : p.time
      }));
    
    if (validPunches.length === 0) return Promise.resolve();

    return fetch('time_backend/punches.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPunches)
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      return fetch('time_backend/punches.php', { method: 'GET' })
        .then(response => response.json())
        .then(data => {
          punches = data
            .filter(p => p && p.employee && p.type && p.time)
            .map(p => ({
              ...p,
              time: parseDate(p.time)
            }))
            .filter(p => p.time !== null);
          updateTable(tableBody);
        });
    });
  }

  // Función para guardar ausencias
  function saveLeaves(leaves) {
    const newLeaves = leaves.filter(l => !l.id);
    
    if (newLeaves.length === 0) return Promise.resolve();

    const validLeaves = newLeaves
      .filter(l => l && l.employee && l.start && l.end && l.type)
      .map(l => ({
        employee: l.employee.toString().trim(),
        start: l.start instanceof Date ? l.start.toISOString() : l.start,
        end: l.end instanceof Date ? l.end.toISOString() : l.end,
        type: l.type.toString().trim()
      }));
    
    if (validLeaves.length === 0) return Promise.resolve();

    return fetch('time_backend/leaves.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLeaves)
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      return fetch('time_backend/leaves.php', { method: 'GET' })
        .then(response => response.json())
        .then(data => {
          leaves = data
            .filter(l => l && l.employee && l.start && l.end && l.type)
            .map(l => ({
              ...l,
              start: parseDate(l.start),
              end: parseDate(l.end)
            }))
            .filter(l => l.start !== null && l.end !== null);
        });
    });
  }

  function saveCurrentUser(currentUser) {
    if (!currentUser || !currentUser.name || !currentUser.username) return Promise.resolve();

    return fetch('time_backend/currentUser.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentUser)
    });
  }

  function removeCurrentUser() {
    return fetch('time_backend/currentUser.php', {
      method: 'DELETE'
    });
  }

  function saveData() {
    const promises = [];
    
    if (punches.length > 0) {
      promises.push(savePunches(punches));
    }
    
    if (leaves.length > 0) {
      promises.push(saveLeaves(leaves));
    }
    
    if (currentUser) {
      promises.push(saveCurrentUser(currentUser));
    } else {
      promises.push(removeCurrentUser());
    }
    
    return Promise.all(promises);
  }

  // Cargar datos iniciales
  Promise.all([
    fetch('time_backend/users.php', { method: 'GET' })
      .then(response => response.json())
      .then(data => { users = data; }),
    
    fetch('time_backend/currentUser.php', { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        currentUser = data;
        updateUIForLoggedInUser();
      }),

    fetch('time_backend/punches.php', { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        punches = data
          .filter(p => p && p.employee && p.type && p.time)
          .map(p => ({
            ...p,
            time: parseDate(p.time)
          }))
          .filter(p => p.time !== null);
        updateTable(tableBody);
      }),

    fetch('time_backend/leaves.php', { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        leaves = data
          .filter(l => l && l.employee && l.start && l.end && l.type)
          .map(l => ({
            ...l,
            start: parseDate(l.start),
            end: parseDate(l.end)
          }))
          .filter(l => l.start !== null && l.end !== null);
      })
  ]);

  // Gestionar registro de usuarios
  document.getElementById('showRegisterBtn').addEventListener('click', function() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'block';
  });
  
  document.getElementById('cancelRegisterBtn').addEventListener('click', function() {
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('registerForm').reset();
  });
  
  document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    if (!name || !username || !password) {
      alert('Por favor completa todos los campos.');
      return;
    }
    
    // Verificar si el usuario ya existe
    if (users.some(u => u.username === username)) {
      alert('Este nombre de usuario ya existe. Por favor elige otro.');
      return;
    }
    
    // Crear nuevo usuario
    const newUser = {
      name: name,
      username: username,
      password: password
    };
    
    // Guardar usuario en el servidor
    fetch('time_backend/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert('Error al registrar usuario: ' + data.error);
      } else {
        // Añadir usuario a la lista local
        users.push(newUser);
        
        alert('Usuario registrado correctamente. Ya puedes iniciar sesión.');
        
        // Ocultar formulario de registro y mostrar login
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('registerForm').reset();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error al registrar usuario. Por favor intenta de nuevo.');
    });
  });
  
  // Gestionar login
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Buscar usuario en el servidor
    fetch('time_backend/users.php', {
      method: 'GET'
    })
    .then(response => response.json())
    .then(users => {
      console.log('Available users:', users); // Debug log
      
      // Buscar usuario
      const user = users.find(u => u.username === username && u.password === password);
      console.log('Found user:', user); // Debug log
      
      if (user) {
        currentUser = {
          name: user.name,
          username: user.username
        };
        
        saveData();
        updateUIForLoggedInUser();
        
        document.getElementById('loginForm').reset();
      } else {
        alert('Usuario o contraseña incorrectos.');
      }
    })
    .catch(error => {
      console.error('Error during login:', error);
      alert('Error al intentar iniciar sesión. Por favor intenta de nuevo.');
    });
  });
  
  // Gestionar logout
  document.getElementById('logoutBtn').addEventListener('click', function() {
    currentUser = null;
    saveData();
    
    // Actualizar UI
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('actionButtonsSection').style.display = 'none';
    document.getElementById('advancedOptionsToggle').style.display = 'none';
    
    // Ocultar formularios avanzados
    const advancedOptions = document.getElementById('advancedOptions');
    const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
    bsCollapse.hide();
    
    // Actualizar tabla para mostrar solo registros públicos o del usuario
    updateTable(tableBody);
  });
  
  // Función para actualizar la UI cuando un usuario inicia sesión
  function updateUIForLoggedInUser() {
    if (!currentUser) {
      // Si no hay usuario logueado, mostrar sección de login y ocultar panel de usuario
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('userPanel').style.display = 'none';
      document.getElementById('actionButtonsSection').style.display = 'none';
      document.getElementById('advancedOptionsToggle').style.display = 'none';
      document.getElementById('toggleTableBtn').style.display = 'none';
      document.querySelector('h4.mb-0').style.display = 'none';
      return;
    }

    // Actualizar info del usuario
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('currentUsername').textContent = currentUser.username;
    
    // Actualizar campos de empleado en formularios
    document.getElementById('employee').value = currentUser.name;
    document.getElementById('leaveEmployee').value = currentUser.name;
    
    // Mostrar/ocultar elementos
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userPanel').style.display = 'block';
    document.getElementById('actionButtonsSection').style.display = 'block';
    document.getElementById('advancedOptionsToggle').style.display = 'block';
    
    // Mostrar el botón toggleTableBtn y el título 'Registros de fichajes'
    document.getElementById('toggleTableBtn').style.display = 'block';
    document.querySelector('h4.mb-0').style.display = 'block';
    
    // Actualizar tabla para mostrar registros del usuario
    updateTable(tableBody);
  }
  
  // Al inicio, ocultar el botón toggleTableBtn y el título 'Registros de fichajes'
  document.getElementById('toggleTableBtn').style.display = 'none';
  document.querySelector('h4.mb-0').style.display = 'none';
  
  // Fichar entrada rápida
  document.getElementById('quickCheckIn').addEventListener('click', function() {
    if (!currentUser) {
      alert('Debes iniciar sesión para fichar.');
      return;
    }
    
    const now = new Date();
    const timeString = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const [datePart, timePart] = timeString.split(', ');
    const [day, month, year] = datePart.split('/');
    const formattedDate = `${year}-${month}-${day} ${timePart}`;
    
    // Comprobar si ya existe una entrada sin salida para este empleado
    const hasPendingEntry = punches.some(p => 
      p.employee === currentUser.name && 
      p.type === 'in' && 
      !punches.some(exit => 
        exit.employee === currentUser.name && 
        exit.type === 'out' && 
        exit.time > p.time
      )
    );
    
    if (hasPendingEntry) {
      if (!confirm('Ya tienes una entrada registrada sin salida. ¿Deseas registrar otra entrada?')) {
        return;
      }
    }
    
    const newPunch = { 
      employee: currentUser.name,
      type: 'in',
      time: formattedDate
    };
    
    punches.push(newPunch);
    
    punches.sort((a, b) => a.time - b.time);
    saveData().then(() => {
      updateTable(tableBody);
      
      // Mostrar la tabla automáticamente después de fichar
      tableContainer.style.display = 'block';
      toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
      
      alert('Entrada registrada a las ' + timePart);
    }).catch(error => {
      alert('Error al guardar el fichaje. Por favor intenta de nuevo.');
    });
  });
  
  // Fichar salida rápida
  document.getElementById('quickCheckOut').addEventListener('click', function() {
    if (!currentUser) {
      alert('Debes iniciar sesión para fichar.');
      return;
    }
    
    // Comprobar si existe una entrada sin salida para este empleado
    let hasEntry = false;
    const entries = punches.filter(p => p.employee === currentUser.name && p.type === 'in');
    const exits = punches.filter(p => p.employee === currentUser.name && p.type === 'out');
    
    for (const entry of entries) {
      // Comprobar si hay una salida posterior a esta entrada
      const hasExit = exits.some(exit => exit.time > entry.time);
      if (!hasExit) {
        hasEntry = true;
        break;
      }
    }
    
    if (!hasEntry) {
      if (!confirm('No tienes ninguna entrada registrada sin salida. ¿Deseas registrar una salida de todos modos?')) {
        return;
      }
    }
    
    const now = new Date();
    const timeString = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const [datePart, timePart] = timeString.split(', ');
    const [day, month, year] = datePart.split('/');
    const formattedDate = `${year}-${month}-${day} ${timePart}`;
    
    const newPunch = { 
      employee: currentUser.name,
      type: 'out',
      time: formattedDate
    };
    
    punches.push(newPunch);
    
    punches.sort((a, b) => a.time - b.time);
    saveData().then(() => {
      updateTable(tableBody);
      
      // Mostrar la tabla automáticamente después de fichar
      tableContainer.style.display = 'block';
      toggleTableBtn.innerHTML = '<i class="bi bi-table"></i> Ocultar tabla';
      
      alert('Salida registrada a las ' + timePart);
    }).catch(error => {
      alert('Error al guardar el fichaje. Por favor intenta de nuevo.');
    });
  });
  
  // Solicitar vacaciones rápido
  document.getElementById('quickVacation').addEventListener('click', function() {
    if (!currentUser) {
      alert('Debes iniciar sesión para solicitar vacaciones.');
      return;
    }
    
    // Mostrar el formulario avanzado
    const advancedOptions = document.getElementById('advancedOptions');
    const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
    bsCollapse.show();
    
    // Establecer vacaciones como opción seleccionada
    document.getElementById('leaveTypeVac').checked = true;
    
    // Enfocar el selector de fecha
    setTimeout(() => {
      document.getElementById('leaveRange').focus();
    }, 500);
  });
  
  // Registrar baja laboral rápido
  document.getElementById('quickSickLeave').addEventListener('click', function() {
    if (!currentUser) {
      alert('Debes iniciar sesión para registrar baja laboral.');
      return;
    }
    
    // Mostrar el formulario avanzado
    const advancedOptions = document.getElementById('advancedOptions');
    const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
    bsCollapse.show();
    
    // Establecer baja laboral como opción seleccionada
    document.getElementById('leaveTypeSick').checked = true;
    
    // Enfocar el selector de fecha
    setTimeout(() => {
      document.getElementById('leaveRange').focus();
    }, 500);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const employee = document.getElementById('employee').value.trim();
    const type = document.getElementById('type').value;
    const dateStr = document.getElementById('date').value;
    const timeStr = document.getElementById('time').value;
    const datetime = new Date(dateStr + 'T' + timeStr);

    if (!employee || isNaN(datetime)) return;

    if (form.dataset.editing === 'true') {
      const index = form.dataset.index;
      punches[index] = { employee, type, time: datetime };
      form.dataset.editing = 'false';
    } else {
      punches.push({ employee, type, time: datetime });
    }

    punches.sort((a, b) => a.time - b.time);
    saveData();
    updateTable(tableBody);
    form.reset();
    
    // Actualizar también el campo de empleado
    if (currentUser) {
      document.getElementById('employee').value = currentUser.name;
    }
  });

  document.getElementById('leaveForm').addEventListener('submit', e => {
    e.preventDefault();
    const emp = document.getElementById('leaveEmployee').value.trim();
    const type = document.querySelector('input[name="leaveType"]:checked').value;
    const rangeVal = document.getElementById('leaveRange').value;
    const [startStr, endStr] = rangeVal.split(' to ');
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : start;

    leaves.push({ employee: emp, start, end, type });
    saveData();
    updateTable(tableBody);
    e.target.reset();
    
    // Actualizar también el campo de empleado 
    if (currentUser) {
      document.getElementById('leaveEmployee').value = currentUser.name;
    }
    
    // Ocultar el formulario avanzado después de enviar
    const advancedOptions = document.getElementById('advancedOptions');
    const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
    bsCollapse.hide();
  });

  // Manejo de botones Eliminar y Modificar
  document.querySelector('#punchTable').addEventListener('click', function (e) {
    // Buscar si se hizo clic en el botón o en un elemento hijo (como el ícono)
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    
    // Si no se hizo clic en ninguno de los botones, salir
    if (!deleteBtn && !editBtn) return;
    
    const tr = e.target.closest('tr');
    if (!tr) return;

    const employee = tr.dataset.employee;
    const inDate = new Date(tr.dataset.in);
    const outDate = tr.dataset.out ? new Date(tr.dataset.out) : null;
    const source = tr.dataset.source;
    
    // Comprobar si el usuario tiene permisos para editar/eliminar este registro
    if (currentUser && employee !== currentUser.name) {
      alert('Solo puedes modificar tus propios registros.');
      return;
    }

    if (editBtn) {
      // Mostrar el formulario avanzado primero
      const advancedOptions = document.getElementById('advancedOptions');
      const bsCollapse = new bootstrap.Collapse(advancedOptions, { toggle: false });
      bsCollapse.show();
      
      // Luego llenar el formulario con los datos
      const form = document.getElementById('punchForm');
      form.dataset.editing = 'true';
      document.getElementById('employee').value = employee;

      if (!outDate) {
        document.getElementById('type').value = 'in';
        document.getElementById('date').value = inDate.toISOString().split('T')[0];
        document.getElementById('time').value = inDate.toTimeString().slice(0, 5);
        const index = punches.findIndex(p =>
          p.employee === employee && p.type === 'in' && p.time.toISOString() === inDate.toISOString()
        );
        form.dataset.index = index;
      } else {
        document.getElementById('type').value = 'out';
        document.getElementById('date').value = outDate.toISOString().split('T')[0];
        document.getElementById('time').value = outDate.toTimeString().slice(0, 5);
        const index = punches.findIndex(p =>
          p.employee === employee && p.type === 'out' && p.time.toISOString() === outDate.toISOString()
        );
        form.dataset.index = index;
      }
    }

    if (deleteBtn) {
      // Confirmar la eliminación
      if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
        if (source === 'leave') {
          // Si es una ausencia, eliminarla de la lista de ausencias
          const leaveStart = new Date(tr.dataset.leaveStart);
          const leaveEnd = new Date(tr.dataset.leaveEnd);
          const leaveType = tr.dataset.leaveType;
          
          leaves = leaves.filter(l => 
            !(l.employee === employee && 
              l.start.toISOString() === leaveStart.toISOString() && 
              l.end.toISOString() === leaveEnd.toISOString() && 
              l.type === leaveType)
          );
        } else {
          // Si es un fichaje, eliminar la entrada o salida
          punches = punches.filter(p =>
            !((p.type === 'in' && p.employee === employee && p.time.toISOString() === inDate.toISOString()) ||
              (p.type === 'out' && outDate && p.employee === employee && p.time.toISOString() === outDate.toISOString()))
          );
        }
        
        saveData();
        updateTable(tableBody);
      }
    }
  });

  updateTable(tableBody);

  // Exportar a Excel
  document.getElementById('exportExcel').addEventListener('click', function() {
    const table = document.getElementById('punchTable');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const monthlyTotal = document.getElementById('monthlyTotal').textContent;
    const annualTotal = document.getElementById('annualTotal').textContent;
    
    // Crear encabezados con columnas adicionales
    const data = [
      ['Empleado', 'Entrada', 'Salida', 'Duración (h)', 'Ausencia', 'Total Mes (h)', 'Total Año (h)']
    ];
    
    // Agregar todas las filas, dejando las columnas de totales vacías para todas excepto la primera
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cellsData = Array.from(row.querySelectorAll('td')).slice(0, 5).map(cell => cell.textContent.trim());
      
      // Añadir columnas de totales (solo en la primera fila)
      if (i === 0) {
        cellsData.push(monthlyTotal);
        cellsData.push(annualTotal);
      } else {
        cellsData.push('');
        cellsData.push('');
      }
      
      data.push(cellsData);
    }
    
    // Si no hay filas, agregar una fila con los totales
    if (rows.length === 0) {
      data.push(['', '', '', '', '', monthlyTotal, annualTotal]);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fichajes');
    
    const fileName = 'fichajes_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
  });
  
  // Exportar a PDF
  document.getElementById('exportPDF').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text('Fichajes de Personal', 14, 15);
    
    const table = document.getElementById('punchTable');
    const headers = Array.from(table.querySelectorAll('thead th'))
      .slice(0, 5) // Exclude Action column
      .map(th => th.textContent);
    
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => {
      return Array.from(row.querySelectorAll('td'))
        .slice(0, 5) // Exclude Action column
        .map(td => td.textContent.trim());
    });
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    const summaryText = 'Total horas mes: ' + document.getElementById('monthlyTotal').textContent + 
                        ' h | Total horas año: ' + document.getElementById('annualTotal').textContent + ' h';
    doc.text(summaryText, 14, doc.lastAutoTable.finalY + 10);
    
    doc.save('fichajes_' + new Date().toISOString().split('T')[0] + '.pdf');
  });

  // Botón de reportar incidencia
  document.getElementById('reportIssueBtn').addEventListener('click', function() {
    if (!currentUser) {
      alert('Debes iniciar sesión para reportar una incidencia.');
      return;
    }
    
    // Establecer la fecha de hoy por defecto
    document.getElementById('issueDate').value = formatYMD(new Date());
    
    // Mostrar el modal
    const reportIssueModal = new bootstrap.Modal(document.getElementById('reportIssueModal'));
    reportIssueModal.show();
  });
  
  // Enviar el reporte de incidencia
  document.getElementById('submitIssue').addEventListener('click', function() {
    const issueType = document.getElementById('issueType').value;
    const issueDescription = document.getElementById('issueDescription').value;
    const issueDate = document.getElementById('issueDate').value;
    
    if (!issueType || !issueDescription || !issueDate) {
      alert('Por favor completa todos los campos del formulario.');
      return;
    }
    
    // Simular envío de email
    const email = 'recursos.humanos@empresa.com';
    const subject = 'Incidencia en sistema de fichajes: ' + issueType;
    const body = `
      Empleado: ${currentUser.name} (${currentUser.username})
      Tipo de incidencia: ${issueType}
      Fecha de la incidencia: ${issueDate}
      
      Descripción:
      ${issueDescription}
      
      Enviado desde el sistema de fichajes el ${formatDate(new Date())}
    `;
    
    console.log('Enviando email a:', email);
    console.log('Asunto:', subject);
    console.log('Cuerpo:', body);
    
    // En un sistema real, aquí se enviaría el email mediante una API o backend
    
    // Mostrar confirmación
    alert('Tu incidencia ha sido reportada correctamente. El departamento de RRHH ha sido notificado y atenderá tu solicitud lo antes posible.');
    
    // Cerrar el modal y limpiar el formulario
    const reportIssueModal = bootstrap.Modal.getInstance(document.getElementById('reportIssueModal'));
    reportIssueModal.hide();
    document.getElementById('issueForm').reset();
  });
});

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fichajes de Personal</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="style.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
</head>
<body>
    <div class="container my-5">
        <h1>Fichajes de Personal</h1>

        <!-- Sistema de login -->
        <div id="loginSection" class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Acceso de empleados</h5>
                        <button class="btn btn-sm btn-outline-primary" id="showRegisterBtn">Registrar nuevo empleado</button>
                    </div>
                    <div class="card-body">
                        <form id="loginForm" class="row g-3">
                            <div class="col-md-4">
                                <label for="loginEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="loginEmail" required>
                            </div>
                            <div class="col-md-4">
                                <label for="loginPassword" class="form-label">Contraseña</label>
                                <input type="password" class="form-control" id="loginPassword" required>
                            </div>
                            <div class="col-md-4 d-flex align-items-end">
                                <button type="submit" class="btn btn-primary">Iniciar sesión</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Formulario de registro (oculto por defecto) -->
        <div id="registerSection" class="row mb-4" style="display: none;">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Registro de nuevo empleado</h5>
                    </div>
                    <div class="card-body">
                        <form id="registerForm" class="row g-3">
                            <div class="col-md-4">
                                <label for="registerName" class="form-label">Nombre completo</label>
                                <input type="text" class="form-control" id="registerName" required>
                            </div>
                            <div class="col-md-3">
                                <label for="registerUsername" class="form-label">Usuario</label>
                                <input type="text" class="form-control" id="registerUsername" required>
                            </div>
                            <div class="col-md-3">
                                <label for="registerPassword" class="form-label">Contraseña</label>
                                <input type="password" class="form-control" id="registerPassword" required>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-success">Registrar</button>
                                <button type="button" class="btn btn-outline-secondary" id="cancelRegisterBtn">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Panel de usuario logueado (oculto inicialmente) -->
        <div id="userPanel" class="row mb-4" style="display: none;">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="mb-0">Bienvenido/a, <span id="currentUserName">Usuario</span></h5>
                                <span id="currentUsername">usuario</span>
                            </div>
                            <button id="logoutBtn" class="btn btn-outline-danger">
                                <i class="bi bi-box-arrow-right"></i> Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Botones de acción rápida (solo visibles cuando un usuario ha iniciado sesión) -->
        <div id="actionButtonsSection" class="row mb-4" style="display: none;">
            <div class="col-12">
                <h4>Acciones rápidas</h4>
                <div class="quick-actions">
                    <button id="quickCheckIn" class="btn btn-primary me-2">
                        <i class="bi bi-box-arrow-in-right"></i> Fichar entrada
                    </button>
                    <button id="quickCheckOut" class="btn btn-info me-2">
                        <i class="bi bi-box-arrow-right"></i> Fichar salida
                    </button>
                    <button id="quickVacation" class="btn btn-warning me-2">
                        <i class="bi bi-calendar-check"></i> Solicitar vacaciones
                    </button>
                    <button id="quickSickLeave" class="btn btn-danger me-2">
                        <i class="bi bi-hospital"></i> Registrar baja
                    </button>
                    <button id="reportIssueBtn" class="btn btn-secondary">
                        <i class="bi bi-exclamation-triangle"></i> Reportar incidencia
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal para reportar incidencias -->
        <div class="modal fade" id="reportIssueModal" tabindex="-1" aria-labelledby="reportIssueModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="reportIssueModalLabel">Reportar incidencia</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="issueForm">
                            <div class="mb-3">
                                <label for="issueType" class="form-label">Tipo de incidencia</label>
                                <select class="form-select" id="issueType" required>
                                    <option value="">Selecciona un tipo</option>
                                    <option value="error_fichar">Error al fichar</option>
                                    <option value="horas_incorrectas">Horas registradas incorrectas</option>
                                    <option value="vacaciones">Problema con vacaciones</option>
                                    <option value="baja">Problema con baja laboral</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="issueDescription" class="form-label">Descripción de la incidencia</label>
                                <textarea class="form-control" id="issueDescription" rows="3" required placeholder="Describe lo que ha ocurrido..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="issueDate" class="form-label">Fecha de la incidencia</label>
                                <input type="text" class="form-control" id="issueDate" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="submitIssue">Enviar reporte</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Formulario original (ahora ocultable) -->
        <div class="row mb-4" id="advancedOptionsToggle" style="display: none;">
            <div class="col-12">
                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#advancedOptions">
                    Mostrar/ocultar opciones avanzadas
                </button>
            </div>
        </div>

        <div class="collapse" id="advancedOptions">
            <form id="punchForm" class="row g-3 align-items-center mb-4">
                <div class="col-md-3">
                    <label for="employee" class="form-label">Empleado</label>
                    <input type="text" class="form-control" id="employee" readonly required>
                </div>
                <div class="col-md-2">
                    <label for="type" class="form-label">Tipo</label>
                    <select class="form-select" id="type">
                        <option value="in">Entrada</option>
                        <option value="out">Salida</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label for="date" class="form-label">Fecha</label>
                    <input type="text" class="form-control" id="date" required>
                </div>
                <div class="col-md-2">
                    <label for="time" class="form-label">Hora</label>
                    <input type="text" class="form-control" id="time" required>
                </div>
                <div class="col-md-3">
                    <button type="submit" class="btn btn-primary w-100 mt-4">Registrar Fichaje</button>
                </div>
            </form>

            <h4 class="mt-5">Ausencias</h4>
            <form id="leaveForm" class="row g-3 align-items-center mb-4">
                <div class="col-md-3">
                    <label for="leaveEmployee" class="form-label">Empleado</label>
                    <input type="text" class="form-control" id="leaveEmployee" readonly required>
                </div>
                <div class="col-md-5">
                    <label for="leaveRange" class="form-label">Rango fechas</label>
                    <input type="text" class="form-control" id="leaveRange" required>
                </div>
                <div class="col-md-2">
                    <div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="leaveType" id="leaveTypeVac" value="vacation" checked>
                            <label class="form-check-label" for="leaveTypeVac">Vacaciones</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="leaveType" id="leaveTypeSick" value="sick">
                            <label class="form-check-label" for="leaveTypeSick">Baja laboral</label>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <button type="submit" class="btn btn-warning w-100 mt-4">Añadir</button>
                </div>
            </form>
        </div>
        
        <div class="row mb-3">
            <div class="col-12 d-flex justify-content-between align-items-center">
                <h4 class="mb-0">Registros de fichajes</h4>
                <button id="toggleTableBtn" class="btn btn-outline-secondary">
                    <i class="bi bi-table"></i> Mostrar/ocultar tabla
                </button>
            </div>
        </div>
        
        <!-- Solo la tabla será ocultable -->
        <div id="tableContainer" class="mb-4">
            <div class="table-responsive">
                <table id="punchTable" class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Duración (h)</th>
                            <th>Ausencia</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                <div class="summary mb-4">
                    <p>Total horas mes: <span id="monthlyTotal">0.00</span> h</p>
                    <p>Total horas año: <span id="annualTotal">0.00</span> h</p>
                </div>
                <div class="btn-group mb-4" role="group">
                    <button id="exportExcel" class="btn btn-success">Exportar a Excel</button>
                    <button id="exportPDF" class="btn btn-danger">Exportar a PDF</button>
                </div>
            </div>
        </div>
         
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>
        <script type="module" src="script.js"></script>
    </div>
</body>
</html> 
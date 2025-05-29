<?php
// Habilitar todos los errores en desarrollo
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Iniciar sesión y buffer de salida
session_start();
ob_start();

// Limpiar cualquier salida anterior
while (ob_get_level()) {
    ob_end_clean();
}

// Configurar headers para CORS y cookies
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de la base de datos
$db_config = [
    'host' => 'localhost',
    'dbname' => 'time_tracking',
    'username' => 'root',
    'password' => ''
];

// Función para enviar respuesta JSON
function sendResponse($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit;
}

// Función para conectar a la base de datos
function getDBConnection() {
    global $db_config;
    
    $conn = new mysqli(
        $db_config['host'],
        $db_config['username'],
        $db_config['password'],
        $db_config['dbname']
    );
    
    if ($conn->connect_error) {
        http_response_code(500);
        sendResponse(false, null, 'Connection failed: ' . $conn->connect_error);
    }
    
    $conn->set_charset('utf8mb4');
    return $conn;
} 
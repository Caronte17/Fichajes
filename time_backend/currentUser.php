<?php
// Habilitar todos los errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Iniciar sesión y buffer de salida
session_start();

// Configurar headers para CORS y cookies
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';
$conn = getDBConnection();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'data' => null,
        'error' => 'No active session'
    ]);
    exit;
}

$stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data' => null,
        'error' => 'Error preparing statement: ' . $conn->error
    ]);
    exit;
}

$stmt->bind_param("i", $_SESSION['user_id']);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data' => null,
        'error' => 'Error executing statement: ' . $stmt->error
    ]);
    exit;
}

$result = $stmt->get_result();
if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'data' => null,
        'error' => 'User not found'
    ]);
    exit;
}

$user = $result->fetch_assoc();
echo json_encode([
    'success' => true,
    'data' => $user,
    'error' => null
]);

$stmt->close();
$conn->close();
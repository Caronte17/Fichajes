<?php
// Habilitar todos los errores
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
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de la base de datos
$host = "localhost";
$dbname = "time_tracking";
$username = "root";
$password = "";

// Función para enviar respuesta JSON
function sendResponse($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit;
}

// Manejar la petición según el método HTTP
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Obtener datos del POST
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data || !isset($data['email']) || !isset($data['password'])) {
        sendResponse(false, null, 'Datos incompletos');
    }

    try {
        // Conectar a la base de datos
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Buscar usuario
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($data['password'], $user['password'])) {
            // Guardar en sesión
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];

            // Configurar cookie de sesión
            session_regenerate_id(true);
            
            // Configurar la cookie de sesión con los parámetros correctos
            $cookieParams = session_get_cookie_params();
            setcookie(
                session_name(),
                session_id(),
                [
                    'expires' => time() + 86400, // 24 horas
                    'path' => '/',
                    'domain' => '',
                    'secure' => false,
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]
            );

            // Enviar respuesta exitosa
            sendResponse(true, [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]);
        } else {
            sendResponse(false, null, 'Credenciales incorrectas');
        }
    } catch(PDOException $e) {
        sendResponse(false, null, 'Error de conexión');
    }
} elseif ($method === 'DELETE') {
    // Cerrar sesión
    session_destroy();
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    sendResponse(true, ['message' => 'Sesión cerrada']);
} else {
    sendResponse(false, null, 'Método no permitido');
}
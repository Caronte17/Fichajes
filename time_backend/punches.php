<?php
session_start();
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

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No active session']);
    exit;
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "time_tracking";

$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset('utf8mb4');

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if ($data === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }

    if (empty($data['type'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Punch type is required']);
        exit;
    }

    $type = $data['type'];
    $employee = $_SESSION['user_name'];
    $currentTime = date('Y-m-d H:i:s');

    // Validación específica según el tipo de fichaje
    if ($type === 'in') {
        // Para entrada, verificar que no haya una entrada sin salida
        $stmt = $conn->prepare("
            SELECT id FROM punches 
            WHERE employee = ? 
            AND DATE(time) = CURDATE() 
            AND type = 'in' 
            AND NOT EXISTS (
                SELECT 1 FROM punches p2 
                WHERE p2.employee = punches.employee 
                AND p2.type = 'out' 
                AND p2.time > punches.time
            )
        ");
    } else {
        // Para salida, verificar que haya una entrada sin salida
        $stmt = $conn->prepare("
            SELECT id FROM punches 
            WHERE employee = ? 
            AND DATE(time) = CURDATE() 
            AND type = 'in' 
            AND NOT EXISTS (
                SELECT 1 FROM punches p2 
                WHERE p2.employee = punches.employee 
                AND p2.type = 'out' 
                AND p2.time > punches.time
            )
        ");
    }

    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("s", $employee);
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error' => 'Error executing statement: ' . $stmt->error]);
        exit;
    }

    $result = $stmt->get_result();
    
    if ($type === 'in' && $result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Ya tienes una entrada registrada sin salida']);
        exit;
    } else if ($type === 'out' && $result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'No tienes una entrada registrada para fichar la salida']);
        exit;
    }
    $stmt->close();

    // Insert new punch
    $stmt = $conn->prepare("INSERT INTO punches (employee, type, time) VALUES (?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("sss", $employee, $type, $currentTime);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Punch registered successfully',
            'punch' => [
                'id' => $stmt->insert_id,
                'employee' => $employee,
                'type' => $type,
                'time' => $currentTime
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error registering punch: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Verificar si el usuario es administrador
    $isAdmin = isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
    
    // Preparar la consulta según el rol
    if ($isAdmin) {
        $stmt = $conn->prepare("SELECT * FROM punches ORDER BY time DESC");
    } else {
        $stmt = $conn->prepare("SELECT * FROM punches WHERE employee = ? ORDER BY time DESC");
        $stmt->bind_param("s", $_SESSION['user_name']);
    }
    
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error' => 'Error executing statement: ' . $stmt->error]);
        exit;
    }

    $result = $stmt->get_result();
    $punches = [];
    while ($row = $result->fetch_assoc()) {
        $punches[] = $row;
    }

    echo json_encode($punches);
    $stmt->close();
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if ($data === null || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data or missing punch ID']);
        exit;
    }

    // Verificar que el usuario es administrador
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'No tienes permisos para eliminar fichajes']);
        exit;
    }

    // Verificar que el fichaje existe
    $stmt = $conn->prepare("SELECT id FROM punches WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("i", $data['id']);
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error' => 'Error executing statement: ' . $stmt->error]);
        exit;
    }

    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Fichaje no encontrado']);
        exit;
    }
    $stmt->close();

    // Eliminar el fichaje
    $stmt = $conn->prepare("DELETE FROM punches WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("i", $data['id']);
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Fichaje eliminado correctamente'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar el fichaje: ' . $stmt->error]);
    }
    $stmt->close();
}

$conn->close();
?>
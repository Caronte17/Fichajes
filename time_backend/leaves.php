<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Configurar zona horaria
date_default_timezone_set('Europe/Madrid');

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No active session']);
    exit;
}

$conn = getDBConnection();
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

    if (empty($data['type']) || empty($data['start']) || empty($data['end'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Type, start date and end date are required']);
        exit;
    }

    $type = $data['type'];
    $startDate = $data['start'];
    $endDate = $data['end'];
    $description = $data['description'] ?? '';
    $employee = $_SESSION['user_name'];
    $status = 'pending';

    // Log temporal para depuración de hora del servidor
    file_put_contents(__DIR__ . '/leaves_debug.log', 'Servidor: ' . date('Y-m-d H:i:s') . ' - startDate: ' . $startDate . "\n", FILE_APPEND);

    // Validar que las fechas sean válidas
    if (strtotime($startDate) > strtotime($endDate)) {
        http_response_code(400);
        echo json_encode(['error' => 'La fecha de inicio debe ser anterior a la fecha de fin']);
        exit;
    }

    // Validar que no sean fechas pasadas (permitir hoy)
    if (strtotime($startDate) < strtotime(date('Y-m-d'))) {
        http_response_code(400);
        echo json_encode(['error' => 'No se pueden solicitar ausencias para fechas pasadas']);
        exit;
    }

    // Verificar solapamiento con otras ausencias
    $stmt = $conn->prepare("
        SELECT id FROM leaves 
        WHERE employee = ? 
        AND (
            (start <= ? AND end >= ?) OR  -- Solapamiento total
            (start BETWEEN ? AND ?) OR    -- Solapamiento parcial inicio
            (end BETWEEN ? AND ?)         -- Solapamiento parcial fin
        )
    ");

    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("sssssss", 
        $employee, 
        $endDate, $startDate,  // Para solapamiento total
        $startDate, $endDate,  // Para solapamiento parcial inicio
        $startDate, $endDate   // Para solapamiento parcial fin
    );

    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error' => 'Error executing statement: ' . $stmt->error]);
        exit;
    }

    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Ya tienes una ausencia registrada que se solapa con estas fechas']);
        exit;
    }
    $stmt->close();

    // Verificar que no haya fichajes en las fechas solicitadas
    $stmt = $conn->prepare("
        SELECT id FROM punches 
        WHERE employee = ? 
        AND DATE(time) BETWEEN ? AND ?
    ");

    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("sss", $employee, $startDate, $endDate);
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error' => 'Error executing statement: ' . $stmt->error]);
        exit;
    }

    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Ya tienes fichajes registrados en las fechas solicitadas']);
        exit;
    }
    $stmt->close();

    // Insert new leave request
    $stmt = $conn->prepare("INSERT INTO leaves (employee, type, start, end) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("ssss", $employee, $type, $startDate, $endDate);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud de ausencia enviada correctamente',
            'leave' => [
                'id' => $stmt->insert_id,
                'employee' => $employee,
                'type' => $type,
                'start' => $startDate,
                'end' => $endDate
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al enviar la solicitud de ausencia: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Verificar si el usuario es administrador
    $isAdmin = isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
    
    // Preparar la consulta según el rol
    if ($isAdmin) {
        $stmt = $conn->prepare("SELECT * FROM leaves ORDER BY start DESC");
    } else {
        $stmt = $conn->prepare("SELECT * FROM leaves WHERE employee = ? ORDER BY start DESC");
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
    $leaves = [];
    while ($row = $result->fetch_assoc()) {
        $leaves[] = $row;
    }

    echo json_encode($leaves);
    $stmt->close();
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if ($data === null || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data or missing leave ID']);
        exit;
    }

    // Verificar que el usuario es administrador
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'No tienes permisos para eliminar ausencias']);
        exit;
    }

    // Verificar que la ausencia existe
    $stmt = $conn->prepare("SELECT id FROM leaves WHERE id = ?");
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
        echo json_encode(['error' => 'Ausencia no encontrada']);
        exit;
    }
    $stmt->close();

    // Eliminar la ausencia
    $stmt = $conn->prepare("DELETE FROM leaves WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("i", $data['id']);
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Ausencia eliminada correctamente'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar la ausencia: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if ($data === null || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data or missing leave ID']);
        exit;
    }

    // Verificar que el usuario es administrador
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'No tienes permisos para modificar ausencias']);
        exit;
    }

    // Verificar que la ausencia existe
    $stmt = $conn->prepare("SELECT id FROM leaves WHERE id = ?");
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
        echo json_encode(['error' => 'Ausencia no encontrada']);
        exit;
    }
    $stmt->close();

    // Actualizar la ausencia
    $stmt = $conn->prepare("UPDATE leaves SET employee = ?, type = ?, start = ?, end = ? WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("ssssi", $data['employee'], $data['type'], $data['start'], $data['end'], $data['id']);
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Ausencia actualizada correctamente',
            'leave' => [
                'id' => $data['id'],
                'employee' => $data['employee'],
                'type' => $data['type'],
                'start' => $data['start'],
                'end' => $data['end']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar la ausencia: ' . $stmt->error]);
    }
    $stmt->close();
}

$conn->close();
?>
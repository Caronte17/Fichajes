<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

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

    // Validar que las fechas sean válidas
    if (strtotime($startDate) > strtotime($endDate)) {
        http_response_code(400);
        echo json_encode(['error' => 'La fecha de inicio debe ser anterior a la fecha de fin']);
        exit;
    }

    // Validar que no sean fechas pasadas
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
    // Get leave requests for the current user
    $stmt = $conn->prepare("
        SELECT * FROM leaves 
        WHERE employee = ? 
        ORDER BY start DESC
    ");
    
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("s", $_SESSION['user_name']);
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
}

$conn->close();
?>
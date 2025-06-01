<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Configurar zona horaria
date_default_timezone_set('Europe/Madrid');

require_once 'config.php';

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

    if (empty($data['type'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Punch type is required']);
        exit;
    }

    $type = $data['type'];
    $employee = $_SESSION['user_name'];
    $time = isset($data['time']) ? $data['time'] : date('Y-m-d H:i:s');

    // Si hay un ID, es una actualización
    if (isset($data['id'])) {
        // Verificar que el usuario es administrador
        if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'No tienes permisos para modificar fichajes']);
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

        // Actualizar el fichaje
        $stmt = $conn->prepare("UPDATE punches SET employee = ?, type = ?, time = ? WHERE id = ?");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
            exit;
        }

        $stmt->bind_param("sssi", $employee, $type, $time, $data['id']);
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Fichaje actualizado correctamente',
                'punch' => [
                    'id' => $data['id'],
                    'employee' => $employee,
                    'type' => $type,
                    'time' => $time
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar el fichaje: ' . $stmt->error]);
        }
        $stmt->close();
    } else {
        // Es un nuevo fichaje
        // Validación específica según el tipo de fichaje
        if ($type === 'in') {
            // Para entrada, verificar que no haya una entrada sin salida en la fecha seleccionada y antes de la hora actual
            $fechaSeleccionada = isset($data['time']) ? substr($data['time'], 0, 10) : date('Y-m-d');
            $horaSeleccionada = isset($data['time']) ? substr($data['time'], 11, 8) : date('H:i:s');
            $stmt = $conn->prepare("
                SELECT id FROM punches 
                WHERE employee = ? 
                AND DATE(time) = DATE(?) 
                AND type = 'in' 
                AND time <= ?
                AND NOT EXISTS (
                    SELECT 1 FROM punches p2 
                    WHERE p2.employee = punches.employee 
                    AND p2.type = 'out' 
                    AND p2.time > punches.time AND p2.time <= ?
                )
            ");
            $fechaHoraSeleccionada = $fechaSeleccionada . ' ' . $horaSeleccionada;
            $stmt->bind_param("ssss", $employee, $fechaSeleccionada, $fechaHoraSeleccionada, $fechaHoraSeleccionada);
        } else {
            // Para salida, buscar la última entrada sin salida anterior a la hora de salida
            $fechaSeleccionada = isset($data['time']) ? substr($data['time'], 0, 10) : date('Y-m-d');
            $horaSeleccionada = isset($data['time']) ? substr($data['time'], 11, 8) : date('H:i:s');
            $stmt = $conn->prepare("
                SELECT id FROM punches 
                WHERE employee = ? 
                AND DATE(time) = DATE(?) 
                AND type = 'in' 
                AND time <= ?
                AND NOT EXISTS (
                    SELECT 1 FROM punches p2 
                    WHERE p2.employee = punches.employee 
                    AND p2.type = 'out' 
                    AND p2.time > punches.time AND p2.time <= ?
                )
                ORDER BY time DESC LIMIT 1
            ");
            $fechaHoraSeleccionada = $fechaSeleccionada . ' ' . $horaSeleccionada;
            $stmt->bind_param("ssss", $employee, $fechaSeleccionada, $fechaHoraSeleccionada, $fechaHoraSeleccionada);
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

        $stmt->bind_param("sss", $employee, $type, $time);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Punch registered successfully',
                'punch' => [
                    'id' => $stmt->insert_id,
                    'employee' => $employee,
                    'type' => $type,
                    'time' => $time
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Error registering punch: ' . $stmt->error]);
        }
        $stmt->close();
    }
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
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
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
        echo json_encode(['error' => 'No tienes permisos para modificar fichajes']);
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

    // Actualizar el fichaje
    $stmt = $conn->prepare("UPDATE punches SET employee = ?, type = ?, time = ? WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("sssi", $data['employee'], $data['type'], $data['time'], $data['id']);
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Fichaje actualizado correctamente',
            'punch' => [
                'id' => $data['id'],
                'employee' => $data['employee'],
                'type' => $data['type'],
                'time' => $data['time']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar el fichaje: ' . $stmt->error]);
    }
    $stmt->close();
}

$conn->close();
?>
<?php
header('Content-Type: application/json');

// Establecer la zona horaria para España
date_default_timezone_set('Europe/Madrid');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "time_tracking";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON data from request body
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if ($data === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }

    // Validate data
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Data must be an array']);
        exit;
    }

    $success = true;
    $errors = [];

    foreach ($data as $leave) {
        // Validate required fields
        if (empty($leave['employee']) || empty($leave['start']) || empty($leave['end']) || empty($leave['type'])) {
            $errors[] = 'Missing required fields in leave record';
            $success = false;
            continue;
        }

        // Prepare and execute insert
        $stmt = $conn->prepare("INSERT INTO leaves (employee, start, end, type) VALUES (?, ?, ?, ?)");
        if (!$stmt) {
            $errors[] = 'Error preparing statement: ' . $conn->error;
            $success = false;
            continue;
        }

        $stmt->bind_param("ssss", $leave['employee'], $leave['start'], $leave['end'], $leave['type']);
        
        if (!$stmt->execute()) {
            $errors[] = 'Error creating leave record: ' . $stmt->error;
            $success = false;
        }
        
        $stmt->close();
    }

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Leaves saved successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => implode(', ', $errors)]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Retrieve all leaves
    $sql = "SELECT * FROM leaves ORDER BY start DESC";
    $result = $conn->query($sql);

    $leaves = [];
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            // Convertir las fechas a la zona horaria de España
            $start = new DateTime($row['start']);
            $end = new DateTime($row['end']);
            $start->setTimezone(new DateTimeZone('Europe/Madrid'));
            $end->setTimezone(new DateTimeZone('Europe/Madrid'));
            $row['start'] = $start->format('Y-m-d');
            $row['end'] = $end->format('Y-m-d');
            $leaves[] = $row;
        }
    }
    echo json_encode($leaves);
}

$conn->close();
?>
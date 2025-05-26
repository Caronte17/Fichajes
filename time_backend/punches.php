<?php
header('Content-Type: application/json');

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

    // Log received data
    error_log('Received punch data: ' . $json);

    // Validate data
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Data must be an array']);
        exit;
    }

    $success = true;
    $errors = [];

    foreach ($data as $punch) {
        // Validate required fields
        if (empty($punch['employee']) || empty($punch['type']) || empty($punch['time'])) {
            $errors[] = 'Missing required fields in punch record';
            $success = false;
            continue;
        }

        // Prepare and execute insert
        $stmt = $conn->prepare("INSERT INTO punches (employee, type, time) VALUES (?, ?, ?)");
        if (!$stmt) {
            $errors[] = 'Error preparing statement: ' . $conn->error;
            $success = false;
            continue;
        }

        $stmt->bind_param("sss", $punch['employee'], $punch['type'], $punch['time']);
        
        if (!$stmt->execute()) {
            $errors[] = 'Error creating punch record: ' . $stmt->error;
            $success = false;
        }
        
        $stmt->close();
    }

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Punches saved successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => implode(', ', $errors)]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Retrieve all punches
    $sql = "SELECT * FROM punches ORDER BY time DESC";
    $result = $conn->query($sql);

    $punches = [];
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $punches[] = $row;
        }
    }
    echo json_encode($punches);
}

$conn->close();
?>
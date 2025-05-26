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

    // Prepare and execute the insert statement
    $stmt = $conn->prepare("INSERT INTO leaves (employee, start, end, type) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $data['employee'], $data['start'], $data['end'], $data['type']);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Leave record created successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error creating leave record: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Retrieve all leaves
    $sql = "SELECT * FROM leaves ORDER BY start DESC";
    $result = $conn->query($sql);

    $leaves = [];
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $leaves[] = $row;
        }
    }
    echo json_encode($leaves);
}

$conn->close();
?>
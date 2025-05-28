<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "time_tracking";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset('utf8mb4');

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

    // Validate required fields
    if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'All fields are required']);
        exit;
    }

    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("s", $data['email']);
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error' => 'Error executing statement: ' . $stmt->error]);
        exit;
    }

    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Email already exists']);
        exit;
    }
    $stmt->close();

    // Hash password
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

    // Insert new user
    $stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error preparing statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("sss", $data['name'], $data['email'], $hashedPassword);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'user' => [
                'id' => $stmt->insert_id,
                'name' => $data['name'],
                'email' => $data['email']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error creating user: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Retrieve all users
    $sql = "SELECT id, name, email FROM users";
    $result = $conn->query($sql);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['error' => 'Error retrieving users: ' . $conn->error]);
        exit;
    }

    $users = [];
    while($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode($users);
}

$conn->close();
?>
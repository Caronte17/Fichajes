<?php
header('Content-Type: application/json');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "time_tracking";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(['error' => 'Connection failed: ' . $conn->connect_error]));
}

// Añadir columna role si no existe
$result = $conn->query("SHOW COLUMNS FROM users LIKE 'role'");
if ($result->num_rows === 0) {
    $conn->query("ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user'");
}

// Verificar la estructura de la tabla users
$result = $conn->query("DESCRIBE users");
$users_structure = [];
while ($row = $result->fetch_assoc()) {
    $users_structure[] = $row;
}

// Verificar los usuarios existentes (sin mostrar contraseñas)
$result = $conn->query("SELECT id, name, email, role FROM users");
$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

$response = [
    'database_connection' => 'success',
    'users_table_structure' => $users_structure,
    'existing_users' => $users
];

echo json_encode($response, JSON_PRETTY_PRINT);
$conn->close();
?> 
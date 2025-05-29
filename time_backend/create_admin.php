<?php
require_once 'config.php';

// Obtener conexión a la base de datos
$conn = getDBConnection();

// Datos del administrador
$admin = [
    'name' => 'Administrador',
    'email' => 'admin@empresa.com',
    'password' => password_hash('admin123', PASSWORD_DEFAULT),
    'role' => 'admin'
];

// Verificar si ya existe un administrador
$stmt = $conn->prepare("SELECT id FROM users WHERE role = 'admin'");
if (!$stmt) {
    die("Error preparing statement: " . $conn->error);
}

$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo "Ya existe un administrador en el sistema.\n";
    exit;
}

// Insertar el administrador
$stmt = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
if (!$stmt) {
    die("Error preparing statement: " . $conn->error);
}

$stmt->bind_param("ssss", $admin['name'], $admin['email'], $admin['password'], $admin['role']);

if ($stmt->execute()) {
    echo "Administrador creado exitosamente.\n";
    echo "Email: " . $admin['email'] . "\n";
    echo "Contraseña: admin123\n";
} else {
    echo "Error al crear el administrador: " . $stmt->error . "\n";
}

$stmt->close();
$conn->close(); 
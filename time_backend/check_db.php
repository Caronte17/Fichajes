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

$tables = ['users', 'punches', 'leaves'];
$structure = [];

foreach ($tables as $table) {
    $result = $conn->query("DESCRIBE $table");
    if ($result) {
        $structure[$table] = [];
        while ($row = $result->fetch_assoc()) {
            $structure[$table][] = $row;
        }
    } else {
        $structure[$table] = ['error' => $conn->error];
    }
}

echo json_encode($structure, JSON_PRETTY_PRINT);
$conn->close();
?> 
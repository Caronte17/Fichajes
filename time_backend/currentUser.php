<?php
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_SESSION['currentUser'])) {
        echo json_encode($_SESSION['currentUser']);
    } else {
        echo json_encode(null);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $_SESSION['currentUser'] = $data;
    echo json_encode(['message' => 'Current user set successfully']);
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    unset($_SESSION['currentUser']);
    echo json_encode(['message' => 'Current user removed successfully']);
}
?>
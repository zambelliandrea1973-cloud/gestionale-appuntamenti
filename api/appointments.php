<?php
session_start();
require_once '../includes/config.php';
require_once '../includes/auth.php';

if (!isLoggedIn()) {
    http_response_code(401);
    exit();
}

header('Content-Type: application/json');

$pdo = getDB();
$userId = $_SESSION['user_id'];

$stmt = $pdo->prepare("
    SELECT a.*, CONCAT(c.name, ' ', c.surname) as client_name 
    FROM appointments a 
    LEFT JOIN clients c ON a.client_id = c.id 
    WHERE a.user_id = ? 
    ORDER BY a.date_time DESC
");
$stmt->execute([$userId]);
$appointments = $stmt->fetchAll();

echo json_encode($appointments);
?>
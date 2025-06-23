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

$stmt = $pdo->prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC");
$stmt->execute([$userId]);
$clients = $stmt->fetchAll();

echo json_encode($clients);
?>

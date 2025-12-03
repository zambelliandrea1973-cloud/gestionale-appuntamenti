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
    SELECT id, CONCAT(name, ' ', surname) as client_name, qr_code 
    FROM clients 
    WHERE user_id = ? AND qr_code IS NOT NULL 
    ORDER BY created_at DESC
");
$stmt->execute([$userId]);
$qrCodes = $stmt->fetchAll();

echo json_encode($qrCodes);
?>
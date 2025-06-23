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

// Conta clienti
$stmt = $pdo->prepare("SELECT COUNT(*) as total FROM clients WHERE user_id = ?");
$stmt->execute([$userId]);
$totalClients = $stmt->fetchColumn();

// Conta appuntamenti di oggi
$stmt = $pdo->prepare("SELECT COUNT(*) as total FROM appointments WHERE user_id = ? AND DATE(date_time) = CURDATE()");
$stmt->execute([$userId]);
$todayAppointments = $stmt->fetchColumn();

// Conta QR attivi
$stmt = $pdo->prepare("SELECT COUNT(*) as total FROM clients WHERE user_id = ? AND qr_code IS NOT NULL");
$stmt->execute([$userId]);
$activeQR = $stmt->fetchColumn();

echo json_encode([
    'total_clients' => $totalClients,
    'today_appointments' => $todayAppointments,
    'active_qr' => $activeQR
]);
?>

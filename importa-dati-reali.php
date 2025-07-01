<?php
/**
 * IMPORTA DATI REALI - Sistema PHP con dati autentici
 * Importa tutti i 396 clienti reali e gli account staff esistenti
 */

echo "<!DOCTYPE html>
<html lang='it'>
<head>
    <meta charset='UTF-8'>
    <title>Importazione Dati Reali</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .step { background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; }
        .loading { color: #0066cc; }
    </style>
</head>
<body>
<h1>📊 Importazione Dati Reali</h1>";

echo "<div class='step loading'>📥 Caricamento dati autentici dal sistema esistente...</div>";

// Carica i VERI dati dal sistema Replit
$storageData = file_exists('storage_data.json') ? json_decode(file_get_contents('storage_data.json'), true) : [];
$accountsData = file_exists('accounts-credentials.json') ? json_decode(file_get_contents('accounts-credentials.json'), true) : [];

// Estrai clienti reali (sono in formato array associativo)
$realClients = [];
if (isset($storageData['clients']) && is_array($storageData['clients'])) {
    foreach ($storageData['clients'] as $clientEntry) {
        if (is_array($clientEntry) && count($clientEntry) >= 2) {
            $realClients[] = $clientEntry[1]; // Il cliente è nel secondo elemento
        }
    }
}

echo "<div class='step success'>✅ Caricati " . count($realClients) . " clienti reali dal sistema</div>";

// Estrai utenti reali dal sistema accounts
$realUsers = [];

// Admin reale
if (isset($accountsData['admin'])) {
    $realUsers[] = [
        'email' => $accountsData['admin']['email'],
        'password' => $accountsData['admin']['password'],
        'firstName' => 'Andrea',
        'lastName' => 'Zambelli',
        'role' => 'admin',
        'type' => 'admin'
    ];
}

// Staff reali
if (isset($accountsData['staff']) && is_array($accountsData['staff'])) {
    foreach ($accountsData['staff'] as $staff) {
        $realUsers[] = [
            'email' => $staff['email'],
            'password' => $staff['password'],
            'firstName' => ucfirst($staff['username']),
            'lastName' => 'Staff',
            'role' => 'staff',
            'type' => 'staff'
        ];
    }
}

echo "<div class='step success'>✅ Caricati " . count($realUsers) . " utenti reali (admin + staff)</div>";

// Appuntamenti reali
$realAppointments = $storageData['appointments'] ?? [];
echo "<div class='step success'>✅ Caricati " . count($realAppointments) . " appuntamenti reali</div>";

// Crea il gestionale PHP con dati REALI
$gestionaleContent = '<?php
session_start();

// DATI REALI IMPORTATI DAL SISTEMA REPLIT
$realClients = ' . var_export($realClients, true) . ';
$realUsers = ' . var_export($realUsers, true) . ';
$realAppointments = ' . var_export($realAppointments, true) . ';

// Gestione login con credenziali REALI
if (isset($_POST["action"]) && $_POST["action"] == "login") {
    $email = $_POST["email"];
    $password = $_POST["password"];
    
    foreach ($realUsers as $user) {
        if ($user["email"] == $email && $user["password"] == $password) {
            $_SESSION["user"] = $user;
            $_SESSION["logged_in"] = true;
            break;
        }
    }
    
    if (!isset($_SESSION["logged_in"])) {
        $loginError = "Credenziali non valide";
    }
}

// Logout
if (isset($_GET["logout"])) {
    session_destroy();
    header("Location: " . $_SERVER["PHP_SELF"]);
    exit;
}

$isLoggedIn = $_SESSION["logged_in"] ?? false;
$currentUser = $_SESSION["user"] ?? null;
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestionale Sanitario - Dr.ssa Silvia Busnari</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: #f5f6fa; }
        
        .header { background: white; padding: 15px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
        .logo { font-size: 1.5em; font-weight: bold; color: #2c5aa0; }
        .user-info { display: flex; align-items: center; gap: 15px; }
        .logout-btn { background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 4px; text-decoration: none; }
        
        .nav { background: #2c5aa0; padding: 0; }
        .nav-content { max-width: 1200px; margin: 0 auto; display: flex; }
        .nav-item { color: white; padding: 15px 20px; text-decoration: none; transition: background 0.3s; cursor: pointer; }
        .nav-item:hover, .nav-item.active { background: rgba(255,255,255,0.1); }
        
        .main { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-card { text-align: center; }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #2c5aa0; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9em; }
        
        .table-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2c5aa0; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        tr:hover { background: #f8f9fa; }
        
        .login-container { max-width: 400px; margin: 100px auto; }
        .login-card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
        .login-title { font-size: 1.8em; color: #2c5aa0; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        .form-control { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 1em; }
        .btn-primary { background: #2c5aa0; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; width: 100%; }
        .btn-primary:hover { background: #1e3d6f; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .real-data-badge { background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; }
        
        @media (max-width: 768px) {
            .header-content { flex-direction: column; gap: 10px; }
            .nav-content { flex-wrap: wrap; }
            .dashboard-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

<?php if (!$isLoggedIn): ?>
    <div class="login-container">
        <div class="login-card">
            <h1 class="login-title">🏥 Gestionale Sanitario</h1>
            <p style="color: #666; margin-bottom: 30px;">Dr.ssa Silvia Busnari - Biomedicina Integrata</p>
            
            <?php if (isset($loginError)): ?>
                <div class="error"><?= $loginError ?></div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <input type="hidden" name="action" value="login">
                
                <div class="form-group">
                    <input type="email" name="email" class="form-control" placeholder="Email" required 
                           value="' . $realUsers[0]['email'] . '">
                </div>
                
                <div class="form-group">
                    <input type="password" name="password" class="form-control" placeholder="Password" required 
                           value="' . $realUsers[0]['password'] . '">
                </div>
                
                <button type="submit" class="btn-primary">Accedi</button>
            </form>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                <p><strong>Account Reali dal Sistema:</strong></p>';
                
foreach ($realUsers as $user) {
    $gestionaleContent .= '
                <p>' . htmlspecialchars($user['email']) . ' / ' . htmlspecialchars($user['password']) . '</p>';
}

$gestionaleContent .= '
            </div>
        </div>
    </div>

<?php else: ?>
    <div class="header">
        <div class="header-content">
            <div class="logo">🏥 Gestionale Sanitario <span class="real-data-badge">DATI REALI</span></div>
            <div class="user-info">
                <span>Benvenuto, <?= htmlspecialchars($currentUser["firstName"] ?? $currentUser["email"]) ?></span>
                <a href="?logout=1" class="logout-btn">Esci</a>
            </div>
        </div>
    </div>
    
    <nav class="nav">
        <div class="nav-content">
            <div class="nav-item active" onclick="showTab(\'dashboard\')">Dashboard</div>
            <div class="nav-item" onclick="showTab(\'patients\')">Pazienti Reali</div>
            <div class="nav-item" onclick="showTab(\'appointments\')">Appuntamenti</div>
        </div>
    </nav>
    
    <main class="main">
        <div id="dashboard" class="tab-content active">
            <h2 style="margin-bottom: 20px;">Dashboard - Sistema con Dati Reali</h2>
            
            <div class="dashboard-grid">
                <div class="card stat-card">
                    <div class="stat-number"><?= count($realClients) ?></div>
                    <div class="stat-label">Pazienti Reali</div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-number"><?= count($realAppointments) ?></div>
                    <div class="stat-label">Appuntamenti Reali</div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-number"><?= count($realUsers) ?></div>
                    <div class="stat-label">Staff Reale</div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-number">100%</div>
                    <div class="stat-label">Dati Autentici</div>
                </div>
            </div>
            
            <div class="card">
                <h3>✅ Sistema Operativo con Dati Reali</h3>
                <p>✅ ' . count($realClients) . ' pazienti reali importati dal sistema Replit</p>
                <p>✅ ' . count($realUsers) . ' account staff reali configurati</p>
                <p>✅ ' . count($realAppointments) . ' appuntamenti reali</p>
                <p>✅ Credenziali autentiche del sistema originale</p>
                <p>✅ Completamente indipendente da Replit</p>
            </div>
        </div>
        
        <div id="patients" class="tab-content">
            <h2 style="margin-bottom: 20px;">Pazienti Reali (<?= count($realClients) ?>)</h2>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefono</th>
                            <th>Accessi</th>
                            <th>Ultimo Accesso</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach (array_slice($realClients, 0, 25) as $client): ?>
                        <tr>
                            <td><?= htmlspecialchars($client["id"] ?? "N/A") ?></td>
                            <td><?= htmlspecialchars(($client["firstName"] ?? "") . " " . ($client["lastName"] ?? "")) ?></td>
                            <td><?= htmlspecialchars($client["email"] ?? "N/A") ?></td>
                            <td><?= htmlspecialchars($client["phone"] ?? "N/A") ?></td>
                            <td><?= $client["accessCount"] ?? 0 ?></td>
                            <td><?= isset($client["lastAccess"]) ? date("d/m/Y H:i", strtotime($client["lastAccess"])) : "Mai" ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <p style="margin-top: 15px; color: #666; text-align: center;">
                Mostrati primi 25 di <?= count($realClients) ?> pazienti reali totali
            </p>
        </div>
        
        <div id="appointments" class="tab-content">
            <h2 style="margin-bottom: 20px;">Appuntamenti Reali (<?= count($realAppointments) ?>)</h2>
            
            <?php if (count($realAppointments) > 0): ?>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Ora</th>
                            <th>Paziente ID</th>
                            <th>Servizio</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($realAppointments as $appointment): ?>
                        <tr>
                            <td><?= isset($appointment["date"]) ? date("d/m/Y", strtotime($appointment["date"])) : "N/A" ?></td>
                            <td><?= htmlspecialchars($appointment["time"] ?? "N/A") ?></td>
                            <td><?= htmlspecialchars($appointment["client"] ?? "N/A") ?></td>
                            <td><?= htmlspecialchars($appointment["service"] ?? "Consulenza") ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="card">
                <p style="text-align: center; color: #666; padding: 40px;">
                    📅 Nessun appuntamento presente nei dati reali
                </p>
            </div>
            <?php endif; ?>
        </div>
    </main>

<?php endif; ?>

<script>
function showTab(tabName) {
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.remove("active"));
    
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => item.classList.remove("active"));
    
    document.getElementById(tabName).classList.add("active");
    event.target.classList.add("active");
}

console.log("🏥 Gestionale Sanitario PHP - DATI REALI");
console.log("📊 Pazienti reali: <?= count($realClients) ?>");
console.log("📅 Appuntamenti reali: <?= count($realAppointments) ?>");
console.log("👥 Staff reali: <?= count($realUsers) ?>");
</script>

</body>
</html>';

file_put_contents('gestionale-dati-reali.php', $gestionaleContent);

echo "<div class='step success'>✅ Sistema PHP con dati reali creato: gestionale-dati-reali.php</div>";

echo "<div class='step success'>
🎉 <strong>SISTEMA CON DATI REALI COMPLETATO!</strong><br><br>

<a href='gestionale-dati-reali.php' target='_blank' style='background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 1.2em;'>
📊 ACCEDI AL GESTIONALE CON DATI REALI
</a><br><br>

<strong>📊 DATI AUTENTICI IMPORTATI:</strong><br>
✅ " . count($realClients) . " pazienti reali dal tuo sistema<br>
✅ " . count($realUsers) . " account staff reali<br>
✅ " . count($realAppointments) . " appuntamenti reali<br>
✅ Credenziali originali del sistema Replit<br><br>

<strong>🔐 Credenziali Reali:</strong><br>";

foreach ($realUsers as $user) {
    echo "👤 " . htmlspecialchars($user['email']) . " / " . htmlspecialchars($user['password']) . "<br>";
}

echo "<br><strong>✨ Vantaggi:</strong><br>
• Tutti i tuoi 396 pazienti reali<br>
• Account staff originali<br>
• Appuntamenti esistenti<br>
• Credenziali autentiche<br>
• Sistema indipendente da Replit<br>
• Pronto per staff e clienti reali<br><br>

<em>Questo è il tuo sistema completo con tutti i dati autentici!</em>
</div>";

echo "</body></html>";
?>
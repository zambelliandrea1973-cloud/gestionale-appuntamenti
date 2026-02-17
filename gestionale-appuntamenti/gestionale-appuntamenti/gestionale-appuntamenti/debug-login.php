<?php
/**
 * DEBUG LOGIN - Mostra esattamente le credenziali nel sistema
 */

// Carica i dati reali
$storageData = file_exists('storage_data.json') ? json_decode(file_get_contents('storage_data.json'), true) : [];
$accountsData = file_exists('accounts-credentials.json') ? json_decode(file_get_contents('accounts-credentials.json'), true) : [];

echo "<!DOCTYPE html>
<html lang='it'>
<head>
    <meta charset='UTF-8'>
    <title>Debug Login - Credenziali Sistema</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .debug-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .credential { background: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
        .test-btn { background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
<h1>🔍 Debug Login - Credenziali Esatte del Sistema</h1>";

echo "<div class='debug-box'>
<h3>📁 File accounts-credentials.json:</h3>";

if (empty($accountsData)) {
    echo "<p style='color: red;'>❌ File accounts-credentials.json vuoto o non trovato</p>";
} else {
    echo "<h4>Admin:</h4>";
    if (isset($accountsData['admin'])) {
        echo "<div class='credential'>Email: " . htmlspecialchars($accountsData['admin']['email']) . "</div>";
        echo "<div class='credential'>Password: " . htmlspecialchars($accountsData['admin']['password']) . "</div>";
        echo "<div class='credential'>Type: " . htmlspecialchars($accountsData['admin']['type']) . "</div>";
    }
    
    echo "<h4>Staff:</h4>";
    if (isset($accountsData['staff']) && is_array($accountsData['staff'])) {
        foreach ($accountsData['staff'] as $i => $staff) {
            echo "<div class='credential'>Staff " . ($i+1) . " - Email: " . htmlspecialchars($staff['email']) . "</div>";
            echo "<div class='credential'>Staff " . ($i+1) . " - Password: " . htmlspecialchars($staff['password']) . "</div>";
        }
    }
}

echo "</div>";

echo "<div class='debug-box'>
<h3>🧪 Test Login Automatico</h3>
<p>Prova questi login automaticamente:</p>";

// Crea mini form di test per ogni account
if (isset($accountsData['admin'])) {
    echo "<form method='POST' action='gestionale-dati-reali.php' style='display: inline;'>
    <input type='hidden' name='action' value='login'>
    <input type='hidden' name='email' value='" . htmlspecialchars($accountsData['admin']['email']) . "'>
    <input type='hidden' name='password' value='" . htmlspecialchars($accountsData['admin']['password']) . "'>
    <button type='submit' class='test-btn'>Login Admin: " . htmlspecialchars($accountsData['admin']['email']) . "</button>
    </form><br>";
}

if (isset($accountsData['staff']) && is_array($accountsData['staff'])) {
    foreach ($accountsData['staff'] as $staff) {
        echo "<form method='POST' action='gestionale-dati-reali.php' style='display: inline;'>
        <input type='hidden' name='action' value='login'>
        <input type='hidden' name='email' value='" . htmlspecialchars($staff['email']) . "'>
        <input type='hidden' name='password' value='" . htmlspecialchars($staff['password']) . "'>
        <button type='submit' class='test-btn'>Login Staff: " . htmlspecialchars($staff['email']) . "</button>
        </form><br>";
    }
}

echo "</div>";

// Crea versione corretta del gestionale con debug
$correctedGestionale = '<?php
session_start();

// Debug completo
error_reporting(E_ALL);
ini_set("display_errors", 1);

// Carica dati reali esatti
$accountsData = file_exists("accounts-credentials.json") ? json_decode(file_get_contents("accounts-credentials.json"), true) : [];
$storageData = file_exists("storage_data.json") ? json_decode(file_get_contents("storage_data.json"), true) : [];

// Estrai clienti dal formato array
$realClients = [];
if (isset($storageData["clients"]) && is_array($storageData["clients"])) {
    foreach ($storageData["clients"] as $clientEntry) {
        if (is_array($clientEntry) && count($clientEntry) >= 2) {
            $realClients[] = $clientEntry[1];
        }
    }
}

// Prepara tutti gli utenti dal sistema accounts
$allUsers = [];

// Admin
if (isset($accountsData["admin"])) {
    $allUsers[] = $accountsData["admin"];
}

// Staff
if (isset($accountsData["staff"]) && is_array($accountsData["staff"])) {
    foreach ($accountsData["staff"] as $staff) {
        $allUsers[] = $staff;
    }
}

// Customers (se servono)
if (isset($accountsData["customers"]) && is_array($accountsData["customers"])) {
    foreach ($accountsData["customers"] as $customer) {
        $allUsers[] = $customer;
    }
}

// Debug info
if (isset($_GET["debug"])) {
    echo "<h2>Debug Info:</h2>";
    echo "<h3>Tutti gli utenti trovati:</h3>";
    foreach ($allUsers as $i => $user) {
        echo "<p>User " . ($i+1) . ": " . htmlspecialchars($user["email"]) . " / " . htmlspecialchars($user["password"]) . " (" . htmlspecialchars($user["type"]) . ")</p>";
    }
    echo "<h3>Totale clienti: " . count($realClients) . "</h3>";
    exit;
}

// Gestione login con TUTTE le credenziali
$loginError = "";
if (isset($_POST["action"]) && $_POST["action"] == "login") {
    $email = trim($_POST["email"]);
    $password = trim($_POST["password"]);
    
    $loginSuccess = false;
    foreach ($allUsers as $user) {
        if (trim($user["email"]) == $email && trim($user["password"]) == $password) {
            $_SESSION["user"] = $user;
            $_SESSION["logged_in"] = true;
            $loginSuccess = true;
            break;
        }
    }
    
    if (!$loginSuccess) {
        $loginError = "Credenziali non valide. Email: " . htmlspecialchars($email) . " - Password: " . htmlspecialchars($password);
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
    <title>Gestionale Sanitario - Sistema Reale</title>
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
        
        .login-container { max-width: 400px; margin: 100px auto; }
        .login-card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
        .login-title { font-size: 1.8em; color: #2c5aa0; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        .form-control { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 1em; }
        .btn-primary { background: #2c5aa0; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; width: 100%; }
        .btn-primary:hover { background: #1e3d6f; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .table-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2c5aa0; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        tr:hover { background: #f8f9fa; }
    </style>
</head>
<body>

<?php if (!$isLoggedIn): ?>
    <div class="login-container">
        <div class="login-card">
            <h1 class="login-title">🏥 Gestionale Sanitario</h1>
            <p style="color: #666; margin-bottom: 30px;">Sistema con Dati Reali - Dr.ssa Silvia Busnari</p>
            
            <?php if ($loginError): ?>
                <div class="error"><?= $loginError ?></div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <input type="hidden" name="action" value="login">
                
                <div class="form-group">
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>
                
                <div class="form-group">
                    <input type="password" name="password" class="form-control" placeholder="Password" required>
                </div>
                
                <button type="submit" class="btn-primary">Accedi</button>
            </form>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                <p><strong>Credenziali dal Sistema Replit:</strong></p>';
                
foreach ($allUsers as $user) {
    $correctedGestionale .= '<p>' . htmlspecialchars($user['email']) . ' / ' . htmlspecialchars($user['password']) . '</p>';
}

$correctedGestionale .= '
                <p><a href="?debug=1" style="color: #2c5aa0;">Mostra Debug Info</a></p>
            </div>
        </div>
    </div>

<?php else: ?>
    <div class="header">
        <div class="header-content">
            <div class="logo">🏥 Gestionale Sanitario - DATI REALI</div>
            <div class="user-info">
                <span>Benvenuto, <?= htmlspecialchars($currentUser["email"]) ?></span>
                <a href="?logout=1" class="logout-btn">Esci</a>
            </div>
        </div>
    </div>
    
    <nav class="nav">
        <div class="nav-content">
            <div class="nav-item active" onclick="showTab(\'dashboard\')">Dashboard</div>
            <div class="nav-item" onclick="showTab(\'patients\')">Pazienti Reali</div>
        </div>
    </nav>
    
    <main class="main">
        <div id="dashboard" class="tab-content active">
            <h2>Dashboard - Sistema con <?= count($realClients) ?> Pazienti Reali</h2>
            
            <div class="dashboard-grid">
                <div class="card stat-card">
                    <div class="stat-number"><?= count($realClients) ?></div>
                    <div class="stat-label">Pazienti Reali</div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-number"><?= count($allUsers) ?></div>
                    <div class="stat-label">Account Reali</div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-number">100%</div>
                    <div class="stat-label">Dati Autentici</div>
                </div>
            </div>
            
            <div class="card">
                <div class="success">✅ Login effettuato con successo! Sistema operativo con dati reali.</div>
                <p>✅ Account: <?= htmlspecialchars($currentUser["email"]) ?></p>
                <p>✅ Tipo: <?= htmlspecialchars($currentUser["type"]) ?></p>
                <p>✅ <?= count($realClients) ?> pazienti reali caricati</p>
                <p>✅ Sistema completamente indipendente da Replit</p>
            </div>
        </div>
        
        <div id="patients" class="tab-content">
            <h2>Pazienti Reali (<?= count($realClients) ?>)</h2>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefono</th>
                            <th>Accessi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach (array_slice($realClients, 0, 20) as $client): ?>
                        <tr>
                            <td><?= htmlspecialchars($client["id"] ?? "N/A") ?></td>
                            <td><?= htmlspecialchars(($client["firstName"] ?? "") . " " . ($client["lastName"] ?? "")) ?></td>
                            <td><?= htmlspecialchars($client["email"] ?? "N/A") ?></td>
                            <td><?= htmlspecialchars($client["phone"] ?? "N/A") ?></td>
                            <td><?= $client["accessCount"] ?? 0 ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <p style="margin-top: 15px; color: #666; text-align: center;">
                Mostrati primi 20 di <?= count($realClients) ?> pazienti reali totali
            </p>
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
</script>

</body>
</html>';

file_put_contents('gestionale-sistema-reale.php', $correctedGestionale);

echo "<div class='debug-box'>
<h3>✅ Sistema Corretto Creato</h3>
<p><strong>File creato:</strong> gestionale-sistema-reale.php</p>
<p>Questo include debug completo e tutte le credenziali esatte dal sistema Replit.</p>
<a href='gestionale-sistema-reale.php' style='background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>PROVA IL GESTIONALE CORRETTO</a>
</div>";

echo "</body></html>";
?>
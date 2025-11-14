#!/bin/bash

# Script per creare versione PHP del gestionale sanitario per SiteGround
echo "🔧 Creazione versione PHP per hosting condiviso..."

# Crea directory per versione PHP
rm -rf php-gestionale
mkdir -p php-gestionale
mkdir -p php-gestionale/api
mkdir -p php-gestionale/assets
mkdir -p php-gestionale/includes
mkdir -p php-gestionale/css
mkdir -p php-gestionale/js

# Crea index.php principale
cat > php-gestionale/index.php << 'EOF'
<?php
session_start();
require_once 'includes/config.php';
require_once 'includes/auth.php';

// Check if user is logged in
if (!isLoggedIn()) {
    header('Location: login.php');
    exit();
}

$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestionale Sanitario - Biomedicina Integrata</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#2563eb">
</head>
<body>
    <div id="app">
        <header class="header">
            <div class="container">
                <h1>Gestionale Sanitario</h1>
                <div class="user-info">
                    <span>Benvenuto, <?php echo htmlspecialchars($user['username']); ?></span>
                    <a href="logout.php" class="btn-logout">Logout</a>
                </div>
            </div>
        </header>

        <nav class="navigation">
            <div class="container">
                <ul class="nav-menu">
                    <li><a href="#dashboard" class="nav-link active">Dashboard</a></li>
                    <li><a href="#clients" class="nav-link">Clienti</a></li>
                    <li><a href="#appointments" class="nav-link">Appuntamenti</a></li>
                    <li><a href="#qr-codes" class="nav-link">Codici QR</a></li>
                    <li><a href="#settings" class="nav-link">Impostazioni</a></li>
                </ul>
            </div>
        </nav>

        <main class="main-content">
            <div class="container">
                <div id="dashboard" class="page active">
                    <h2>Dashboard</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>Clienti Totali</h3>
                            <span id="total-clients">0</span>
                        </div>
                        <div class="stat-card">
                            <h3>Appuntamenti Oggi</h3>
                            <span id="today-appointments">0</span>
                        </div>
                        <div class="stat-card">
                            <h3>Codici QR Attivi</h3>
                            <span id="active-qr">0</span>
                        </div>
                    </div>
                </div>

                <div id="clients" class="page">
                    <h2>Gestione Clienti</h2>
                    <button class="btn-primary" onclick="showAddClientForm()">Aggiungi Cliente</button>
                    <div id="clients-list"></div>
                </div>

                <div id="appointments" class="page">
                    <h2>Gestione Appuntamenti</h2>
                    <button class="btn-primary" onclick="showAddAppointmentForm()">Nuovo Appuntamento</button>
                    <div id="appointments-list"></div>
                </div>

                <div id="qr-codes" class="page">
                    <h2>Codici QR Clienti</h2>
                    <div id="qr-list"></div>
                </div>

                <div id="settings" class="page">
                    <h2>Impostazioni</h2>
                    <form id="settings-form">
                        <div class="form-group">
                            <label>Nome Attività</label>
                            <input type="text" name="business_name" value="Biomedicina Integrata">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="busnari.silvia@libero.it">
                        </div>
                        <div class="form-group">
                            <label>Telefono</label>
                            <input type="tel" name="phone" value="+39 3471445767">
                        </div>
                        <button type="submit" class="btn-primary">Salva Impostazioni</button>
                    </form>
                </div>
            </div>
        </main>
    </div>

    <script src="js/app.js"></script>
</body>
</html>
EOF

# Crea login.php
cat > php-gestionale/login.php << 'EOF'
<?php
session_start();
require_once 'includes/config.php';
require_once 'includes/auth.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit();
}

$error = '';
if ($_POST) {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (login($username, $password)) {
        header('Location: index.php');
        exit();
    } else {
        $error = 'Credenziali non valide';
    }
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Gestionale Sanitario</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="login-page">
    <div class="login-container">
        <div class="login-form">
            <h1>Gestionale Sanitario</h1>
            <h2>Biomedicina Integrata</h2>
            
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                <button type="submit" class="btn-primary">Accedi</button>
            </form>
        </div>
    </div>
</body>
</html>
EOF

# Crea config.php
cat > php-gestionale/includes/config.php << 'EOF'
<?php
// Configurazione database
define('DB_HOST', 'localhost');
define('DB_NAME', 'gestionale_sanitario');
define('DB_USER', 'root');
define('DB_PASS', '');

// Configurazione applicazione
define('APP_NAME', 'Gestionale Sanitario');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'https://biomedicinaintegrata.it/');

// Connessione database
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            die('Errore connessione database: ' . $e->getMessage());
        }
    }
    
    return $pdo;
}

// Inizializza database se non esiste
function initializeDB() {
    $pdo = getDB();
    
    // Tabella utenti
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Tabella clienti
    $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        birth_date DATE,
        qr_code VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )");
    
    // Tabella appuntamenti
    $pdo->exec("CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT,
        user_id INT,
        date_time DATETIME NOT NULL,
        notes TEXT,
        status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )");
    
    // Inserisci utente di default se non esiste
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    
    if ($stmt->fetchColumn() == 0) {
        $stmt = $pdo->prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)");
        $stmt->execute(['admin', password_hash('coverde79', PASSWORD_DEFAULT), 'busnari.silvia@libero.it']);
    }
}

// Inizializza DB all'avvio
initializeDB();
?>
EOF

# Crea auth.php
cat > php-gestionale/includes/auth.php << 'EOF'
<?php
require_once 'config.php';

function login($username, $password) {
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        return true;
    }
    
    return false;
}

function logout() {
    session_destroy();
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}
?>
EOF

# Crea logout.php
cat > php-gestionale/logout.php << 'EOF'
<?php
session_start();
require_once 'includes/auth.php';
logout();
header('Location: login.php');
?>
EOF

# Crea CSS
cat > php-gestionale/css/style.css << 'EOF'
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8fafc;
    color: #1f2937;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
.header {
    background: #2563eb;
    color: white;
    padding: 1rem 0;
}

.header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    font-size: 1.5rem;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.btn-logout {
    background: rgba(255,255,255,0.2);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    text-decoration: none;
    border: none;
    cursor: pointer;
}

.btn-logout:hover {
    background: rgba(255,255,255,0.3);
}

/* Navigation */
.navigation {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 0;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 0;
}

.nav-link {
    display: block;
    padding: 1rem 1.5rem;
    text-decoration: none;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
}

.nav-link:hover,
.nav-link.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
}

/* Main Content */
.main-content {
    padding: 2rem 0;
}

.page {
    display: none;
}

.page.active {
    display: block;
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin: 2rem 0;
}

.stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    text-align: center;
}

.stat-card h3 {
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.stat-card span {
    font-size: 2rem;
    font-weight: bold;
    color: #2563eb;
}

/* Forms */
.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Buttons */
.btn-primary {
    background: #2563eb;
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: background-color 0.2s;
}

.btn-primary:hover {
    background: #1d4ed8;
}

/* Login Page */
.login-page {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-container {
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 400px;
}

.login-form h1 {
    text-align: center;
    color: #2563eb;
    margin-bottom: 0.5rem;
}

.login-form h2 {
    text-align: center;
    color: #6b7280;
    font-weight: normal;
    margin-bottom: 2rem;
}

.error {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    border: 1px solid #fecaca;
}

/* Responsive */
@media (max-width: 768px) {
    .nav-menu {
        flex-direction: column;
    }
    
    .header .container {
        flex-direction: column;
        gap: 1rem;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
}
EOF

# Crea JavaScript
cat > php-gestionale/js/app.js << 'EOF'
// Gestione navigazione SPA
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza navigazione
    initNavigation();
    loadDashboardData();
    
    // Carica dati iniziali
    loadClients();
    loadAppointments();
    loadQRCodes();
});

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Rimuovi classe active da tutti
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Aggiungi active al link cliccato
            this.classList.add('active');
            
            // Mostra pagina corrispondente
            const pageId = this.getAttribute('href').substring(1);
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.add('active');
            }
        });
    });
}

function loadDashboardData() {
    fetch('api/dashboard.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-clients').textContent = data.total_clients || 0;
            document.getElementById('today-appointments').textContent = data.today_appointments || 0;
            document.getElementById('active-qr').textContent = data.active_qr || 0;
        })
        .catch(error => console.error('Errore caricamento dashboard:', error));
}

function loadClients() {
    fetch('api/clients.php')
        .then(response => response.json())
        .then(clients => {
            const container = document.getElementById('clients-list');
            container.innerHTML = clients.map(client => `
                <div class="client-card">
                    <h3>${client.name} ${client.surname}</h3>
                    <p>Email: ${client.email || 'N/A'}</p>
                    <p>Telefono: ${client.phone || 'N/A'}</p>
                    <p>QR Code: ${client.qr_code}</p>
                </div>
            `).join('');
        })
        .catch(error => console.error('Errore caricamento clienti:', error));
}

function loadAppointments() {
    fetch('api/appointments.php')
        .then(response => response.json())
        .then(appointments => {
            const container = document.getElementById('appointments-list');
            container.innerHTML = appointments.map(apt => `
                <div class="appointment-card">
                    <h3>${apt.client_name}</h3>
                    <p>Data: ${new Date(apt.date_time).toLocaleString('it-IT')}</p>
                    <p>Note: ${apt.notes || 'Nessuna nota'}</p>
                    <p>Stato: ${apt.status}</p>
                </div>
            `).join('');
        })
        .catch(error => console.error('Errore caricamento appuntamenti:', error));
}

function loadQRCodes() {
    fetch('api/qr-codes.php')
        .then(response => response.json())
        .then(qrCodes => {
            const container = document.getElementById('qr-list');
            container.innerHTML = qrCodes.map(qr => `
                <div class="qr-card">
                    <h3>${qr.client_name}</h3>
                    <p>Codice: ${qr.qr_code}</p>
                    <a href="client-access.php?code=${qr.qr_code}" target="_blank">
                        Apri accesso cliente
                    </a>
                </div>
            `).join('');
        })
        .catch(error => console.error('Errore caricamento QR codes:', error));
}

function showAddClientForm() {
    // Implementare modal per aggiungere cliente
    alert('Funzione aggiungi cliente - da implementare');
}

function showAddAppointmentForm() {
    // Implementare modal per aggiungere appuntamento
    alert('Funzione aggiungi appuntamento - da implementare');
}
EOF

# Crea API endpoints
cat > php-gestionale/api/dashboard.php << 'EOF'
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
EOF

cat > php-gestionale/api/clients.php << 'EOF'
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
EOF

# Crea manifest.json per PWA
cat > php-gestionale/manifest.json << 'EOF'
{
    "name": "Gestionale Sanitario - Biomedicina Integrata",
    "short_name": "Gestionale",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#2563eb",
    "icons": [
        {
            "src": "assets/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "assets/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
EOF

# Crea .htaccess per Apache
cat > php-gestionale/.htaccess << 'EOF'
# Abilita mod_rewrite
RewriteEngine On

# Redirect HTTP a HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Gestione routing per SPA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^.*$ index.php [QSA,L]

# Cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
</IfModule>

# Compressione GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>
EOF

# Crea README
cat > php-gestionale/README.md << 'EOF'
# Gestionale Sanitario - Versione PHP

Versione PHP/MySQL del gestionale sanitario ottimizzata per hosting condiviso SiteGround.

## Installazione

1. Carica tutti i file nella directory principale del dominio
2. Crea un database MySQL dal pannello SiteGround
3. Modifica le credenziali in `includes/config.php`
4. Visita il sito - il database si inizializzerà automaticamente

## Credenziali di default
- Username: `admin`
- Password: `coverde79`

## Funzionalità
- Gestione clienti
- Sistema appuntamenti
- Generazione codici QR
- Accesso clienti tramite QR
- Interfaccia responsive
- PWA ready

## Configurazione Database
Modifica `includes/config.php` con i dati del tuo database SiteGround:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'il_tuo_database');
define('DB_USER', 'il_tuo_username');
define('DB_PASS', 'la_tua_password');
```

EOF

echo "✅ Versione PHP creata in php-gestionale/"
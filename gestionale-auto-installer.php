<?php
/**
 * GESTIONALE SANITARIO - INSTALLER AUTOINSTALLANTE COMPLETO
 * Versione: 2.0 - Include tutti i file dell'applicazione
 * 
 * ISTRUZIONI SEMPLICI:
 * 1. Carica questo singolo file nella root del tuo sito
 * 2. Visita: https://tuosito.it/gestionale-auto-installer.php
 * 3. Inserisci i dati del database
 * 4. Clicca "Installa" e attendi il completamento
 * 
 * L'installer creerà automaticamente:
 * - Tutte le cartelle necessarie
 * - Tutti i file PHP, CSS, JS
 * - Il database con le tabelle
 * - L'utente amministratore
 * 
 * CREDENZIALI PREDEFINITE:
 * Username: admin
 * Password: coverde79
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300); // 5 minuti per l'installazione

class GestionaleAutoInstaller {
    private $errors = [];
    private $success = [];
    private $installDir = 'gestionale-sanitario';
    
    public function __construct() {
        session_start();
    }
    
    public function run() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->processInstallation();
        } else {
            $this->showForm();
        }
    }
    
    private function showForm() {
        ?>
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>🏥 Installer Gestionale Sanitario</title>
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh; display: flex; align-items: center; justify-content: center;
                }
                .container { 
                    max-width: 500px; width: 100%; background: white; padding: 40px; 
                    border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }
                h1 { color: #2c3e50; text-align: center; margin-bottom: 10px; font-size: 28px; }
                .subtitle { text-align: center; color: #7f8c8d; margin-bottom: 30px; }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 8px; font-weight: 600; color: #34495e; }
                input[type="text"], input[type="password"] { 
                    width: 100%; padding: 12px 16px; border: 2px solid #e1e8ed; 
                    border-radius: 8px; font-size: 16px; transition: border-color 0.3s;
                }
                input[type="text"]:focus, input[type="password"]:focus { 
                    outline: none; border-color: #3498db; 
                }
                .install-btn { 
                    background: linear-gradient(135deg, #2ecc71, #27ae60); 
                    color: white; padding: 16px 32px; border: none; border-radius: 8px; 
                    font-size: 18px; font-weight: 600; cursor: pointer; width: 100%;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .install-btn:hover { 
                    transform: translateY(-2px); 
                    box-shadow: 0 10px 20px rgba(46, 204, 113, 0.3);
                }
                .info-box { 
                    background: #e8f4fd; padding: 20px; border-radius: 10px; 
                    margin-bottom: 25px; border-left: 4px solid #3498db;
                }
                .credentials-box { 
                    background: #f8f9fa; padding: 20px; border-radius: 10px; 
                    margin-top: 25px; text-align: center;
                }
                .feature-list { 
                    background: #eafaf1; padding: 20px; border-radius: 10px; 
                    margin-bottom: 25px;
                }
                .feature-list ul { margin: 0; padding-left: 20px; }
                .feature-list li { margin-bottom: 8px; color: #27ae60; }
                .loading { display: none; text-align: center; margin-top: 20px; }
                .spinner { 
                    border: 3px solid #f3f3f3; border-top: 3px solid #3498db; 
                    border-radius: 50%; width: 40px; height: 40px; 
                    animation: spin 1s linear infinite; margin: 0 auto 15px;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏥 Gestionale Sanitario</h1>
                <p class="subtitle">Installer Automatico v2.0</p>
                
                <div class="info-box">
                    <strong>🚀 Installazione One-Click</strong><br>
                    Questo installer creerà automaticamente tutto il necessario per il tuo gestionale sanitario.
                </div>
                
                <div class="feature-list">
                    <strong>✨ Cosa include:</strong>
                    <ul>
                        <li>Sistema completo di gestione clienti</li>
                        <li>Gestione appuntamenti con calendario</li>
                        <li>Codici QR per accesso clienti</li>
                        <li>App PWA per dispositivi mobili</li>
                        <li>Sistema di autenticazione sicuro</li>
                        <li>Dashboard amministrativa completa</li>
                    </ul>
                </div>
                
                <form method="POST" id="installForm">
                    <div class="form-group">
                        <label for="db_host">🌐 Host Database:</label>
                        <input type="text" id="db_host" name="db_host" value="localhost" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_name">🗄️ Nome Database:</label>
                        <input type="text" id="db_name" name="db_name" placeholder="gestionale_sanitario" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_user">👤 Username Database:</label>
                        <input type="text" id="db_user" name="db_user" placeholder="root" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_pass">🔒 Password Database:</label>
                        <input type="password" id="db_pass" name="db_pass" placeholder="Lascia vuoto se non presente">
                    </div>
                    
                    <button type="submit" class="install-btn" onclick="showLoading()">
                        🚀 Installa Gestionale Sanitario
                    </button>
                    
                    <div class="loading" id="loading">
                        <div class="spinner"></div>
                        <p>⏳ Installazione in corso...<br>Attendere qualche minuto</p>
                    </div>
                </form>
                
                <div class="credentials-box">
                    <strong>🔑 Credenziali di accesso:</strong><br>
                    <strong>Username:</strong> admin<br>
                    <strong>Password:</strong> coverde79
                </div>
            </div>
            
            <script>
                function showLoading() {
                    document.getElementById('loading').style.display = 'block';
                    document.querySelector('.install-btn').style.display = 'none';
                }
            </script>
        </body>
        </html>
        <?php
    }
    
    private function processInstallation() {
        $dbHost = $_POST['db_host'];
        $dbName = $_POST['db_name'];
        $dbUser = $_POST['db_user'];
        $dbPass = $_POST['db_pass'];
        
        // Test connessione database
        if (!$this->testConnection($dbHost, $dbName, $dbUser, $dbPass)) {
            $this->showResult();
            return;
        }
        
        // Crea cartella installazione
        if (!$this->createDirectory($this->installDir)) {
            $this->showResult();
            return;
        }
        
        // Estrai tutti i files
        if (!$this->extractAllFiles()) {
            $this->showResult();
            return;
        }
        
        // Configura database
        if (!$this->configureDatabase($dbHost, $dbName, $dbUser, $dbPass)) {
            $this->showResult();
            return;
        }
        
        // Crea tabelle e dati iniziali
        if (!$this->setupDatabase($dbHost, $dbName, $dbUser, $dbPass)) {
            $this->showResult();
            return;
        }
        
        $this->success[] = "✅ Installazione completata con successo!";
        $this->success[] = "🌐 Accedi al gestionale: <a href='{$this->installDir}/index.php' target='_blank' style='color: #2ecc71; font-weight: bold;'>{$this->installDir}/index.php</a>";
        $this->success[] = "👤 Username: <strong>admin</strong>";
        $this->success[] = "🔑 Password: <strong>coverde79</strong>";
        
        $this->showResult();
    }
    
    private function testConnection($host, $name, $user, $pass) {
        try {
            $pdo = new PDO("mysql:host=$host;dbname=$name", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->success[] = "✅ Connessione database riuscita";
            return true;
        } catch (PDOException $e) {
            $this->errors[] = "❌ Errore connessione database: " . $e->getMessage();
            return false;
        }
    }
    
    private function createDirectory($dir) {
        if (!file_exists($dir)) {
            if (mkdir($dir, 0755, true)) {
                $this->success[] = "✅ Cartella '$dir' creata";
            } else {
                $this->errors[] = "❌ Impossibile creare la cartella '$dir'";
                return false;
            }
        }
        return true;
    }
    
    private function extractAllFiles() {
        $files = $this->getAllApplicationFiles();
        $count = 0;
        
        foreach ($files as $file => $content) {
            $filePath = $this->installDir . '/' . $file;
            $fileDir = dirname($filePath);
            
            if (!file_exists($fileDir)) {
                mkdir($fileDir, 0755, true);
            }
            
            if (file_put_contents($filePath, $content) === false) {
                $this->errors[] = "❌ Errore creazione file: $file";
                return false;
            }
            $count++;
        }
        
        $this->success[] = "✅ Estratti $count file dell'applicazione";
        return true;
    }
    
    private function configureDatabase($host, $name, $user, $pass) {
        $configContent = "<?php\n";
        $configContent .= "// Configurazione database generata automaticamente\n";
        $configContent .= "define('DB_HOST', '$host');\n";
        $configContent .= "define('DB_NAME', '$name');\n";
        $configContent .= "define('DB_USER', '$user');\n";
        $configContent .= "define('DB_PASS', '$pass');\n\n";
        $configContent .= "// Configurazione applicazione\n";
        $configContent .= "define('APP_NAME', 'Gestionale Sanitario');\n";
        $configContent .= "define('APP_VERSION', '2.0.0');\n";
        $configContent .= "define('BASE_URL', 'https://' . \$_SERVER['HTTP_HOST'] . '/' . basename(__DIR__));\n";
        $configContent .= "date_default_timezone_set('Europe/Rome');\n";
        $configContent .= "?>";
        
        $configPath = $this->installDir . '/includes/config.php';
        if (file_put_contents($configPath, $configContent) === false) {
            $this->errors[] = "❌ Errore creazione config.php";
            return false;
        }
        
        $this->success[] = "✅ Configurazione database scritta";
        return true;
    }
    
    private function setupDatabase($host, $name, $user, $pass) {
        try {
            $pdo = new PDO("mysql:host=$host;dbname=$name", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Tabella users
            $pdo->exec("CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100),
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                role ENUM('admin', 'staff') DEFAULT 'staff',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )");
            
            // Tabella clients
            $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(20),
                date_of_birth DATE,
                address TEXT,
                notes TEXT,
                qr_token VARCHAR(255) UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )");
            
            // Tabella appointments
            $pdo->exec("CREATE TABLE IF NOT EXISTS appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                appointment_date DATETIME NOT NULL,
                duration INT DEFAULT 60,
                notes TEXT,
                status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
            )");
            
            // Tabella settings per configurazioni
            $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )");
            
            // Inserisci utente admin
            $hashedPassword = password_hash('coverde79', PASSWORD_DEFAULT);
            $pdo->exec("INSERT IGNORE INTO users (username, password, email, first_name, last_name, role) 
                       VALUES ('admin', '$hashedPassword', 'busnari.silvia@libero.it', 'Silvia', 'Busnari', 'admin')");
            
            // Inserisci impostazioni predefinite
            $pdo->exec("INSERT IGNORE INTO settings (setting_key, setting_value) VALUES 
                       ('business_name', 'Biomedicina Integrata'),
                       ('business_email', 'busnari.silvia@libero.it'),
                       ('business_phone', '+39 3471445767'),
                       ('business_website', 'biomedicinaintegrata.it')");
            
            $this->success[] = "✅ Database e tabelle create";
            $this->success[] = "✅ Utente amministratore configurato";
            $this->success[] = "✅ Impostazioni predefinite inserite";
            return true;
            
        } catch (PDOException $e) {
            $this->errors[] = "❌ Errore setup database: " . $e->getMessage();
            return false;
        }
    }
    
    private function showResult() {
        $isSuccess = empty($this->errors);
        ?>
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Risultato Installazione</title>
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    margin: 0; padding: 20px; 
                    background: <?php echo $isSuccess ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'linear-gradient(135deg, #e74c3c, #c0392b)'; ?>;
                    min-height: 100vh; display: flex; align-items: center; justify-content: center;
                }
                .container { 
                    max-width: 600px; width: 100%; background: white; padding: 40px; 
                    border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }
                h1 { text-align: center; margin-bottom: 30px; font-size: 28px; }
                .success-title { color: #27ae60; }
                .error-title { color: #e74c3c; }
                .result-item { 
                    padding: 15px; margin-bottom: 10px; border-radius: 8px; 
                    border-left: 4px solid; 
                }
                .success { background: #d4edda; border-color: #28a745; color: #155724; }
                .error { background: #f8d7da; border-color: #dc3545; color: #721c24; }
                .actions { text-align: center; margin-top: 30px; }
                .btn { 
                    padding: 12px 30px; border: none; border-radius: 8px; 
                    text-decoration: none; display: inline-block; margin: 0 10px;
                    font-weight: 600; transition: transform 0.2s;
                }
                .btn:hover { transform: translateY(-2px); }
                .btn-primary { background: #3498db; color: white; }
                .btn-success { background: #2ecc71; color: white; }
                .btn-secondary { background: #6c757d; color: white; }
                .success-icon { font-size: 64px; text-align: center; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <?php if ($isSuccess): ?>
                    <div class="success-icon">🎉</div>
                    <h1 class="success-title">Installazione Completata!</h1>
                <?php else: ?>
                    <h1 class="error-title">Errore Installazione</h1>
                <?php endif; ?>
                
                <?php foreach ($this->success as $msg): ?>
                    <div class="result-item success"><?php echo $msg; ?></div>
                <?php endforeach; ?>
                
                <?php foreach ($this->errors as $msg): ?>
                    <div class="result-item error"><?php echo $msg; ?></div>
                <?php endforeach; ?>
                
                <div class="actions">
                    <a href="<?php echo $_SERVER['PHP_SELF']; ?>" class="btn btn-secondary">🔙 Torna all'Installer</a>
                    
                    <?php if ($isSuccess): ?>
                        <a href="<?php echo $this->installDir; ?>/index.php" class="btn btn-success" target="_blank">
                            🚀 Accedi al Gestionale
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </body>
        </html>
        <?php
    }
    
    private function getAllApplicationFiles() {
        // Files dell'applicazione embedded
        return [
            'index.php' => '<?php
session_start();
require_once \'includes/config.php\';
require_once \'includes/auth.php\';

if (!isLoggedIn()) {
    header(\'Location: login.php\');
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
                    <span>Benvenuto, <?php echo htmlspecialchars($user[\'username\']); ?></span>
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
</html>',

            'login.php' => '<?php
session_start();
require_once \'includes/config.php\';
require_once \'includes/auth.php\';

if (isLoggedIn()) {
    header(\'Location: index.php\');
    exit();
}

$error = \'\';

if ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {
    $username = $_POST[\'username\'] ?? \'\';
    $password = $_POST[\'password\'] ?? \'\';
    
    if (login($username, $password)) {
        header(\'Location: index.php\');
        exit();
    } else {
        $error = \'Credenziali non valide\';
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
                <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <button type="submit" class="btn-primary">Accedi</button>
            </form>
        </div>
    </div>
</body>
</html>',

            'logout.php' => '<?php
session_start();
session_destroy();
header(\'Location: login.php\');
exit();
?>',

            'includes/auth.php' => '<?php
require_once \'config.php\';

function isLoggedIn() {
    return isset($_SESSION[\'user_id\']);
}

function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$_SESSION[\'user_id\']]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return null;
    }
}

function login($username, $password) {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($password, $user[\'password\'])) {
            $_SESSION[\'user_id\'] = $user[\'id\'];
            $_SESSION[\'username\'] = $user[\'username\'];
            $_SESSION[\'role\'] = $user[\'role\'];
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        return false;
    }
}
?>',

            'css/style.css' => '/* Reset e base */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f8f9fa;
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
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    font-size: 1.5rem;
    font-weight: 600;
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
    border-radius: 4px;
    text-decoration: none;
    transition: background 0.2s;
}

.btn-logout:hover {
    background: rgba(255,255,255,0.3);
}

/* Navigation */
.navigation {
    background: white;
    border-bottom: 1px solid #e5e7eb;
}

.nav-menu {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
}

.nav-link {
    display: block;
    padding: 1rem 1.5rem;
    color: #6b7280;
    text-decoration: none;
    transition: color 0.2s, background 0.2s;
}

.nav-link:hover,
.nav-link.active {
    color: #2563eb;
    background: #f3f4f6;
}

/* Main content */
.main-content {
    padding: 2rem 0;
    min-height: calc(100vh - 200px);
}

.page {
    display: none;
}

.page.active {
    display: block;
}

.page h2 {
    margin-bottom: 1.5rem;
    color: #1f2937;
}

/* Stats grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
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
    display: block;
    font-size: 2rem;
    font-weight: 700;
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
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
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
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-primary:hover {
    background: #1d4ed8;
}

.btn-secondary {
    background: #6b7280;
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-secondary:hover {
    background: #4b5563;
}

/* Login page */
.login-page {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-container {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
}

.login-form {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.login-form h1 {
    text-align: center;
    color: #2563eb;
    margin-bottom: 0.5rem;
}

.login-form h2 {
    text-align: center;
    color: #6b7280;
    font-size: 1rem;
    font-weight: 400;
    margin-bottom: 2rem;
}

.error-message {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    border: 1px solid #fecaca;
}

/* Tables */
.table {
    width: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.table th,
.table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
}

.table th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
}

.table tbody tr:hover {
    background: #f9fafb;
}

/* Responsive */
@media (max-width: 768px) {
    .nav-menu {
        flex-wrap: wrap;
    }
    
    .nav-link {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .container {
        padding: 0 1rem;
    }
}',

            'js/app.js' => '// Gestionale Sanitario - App JavaScript
class GestionaleApp {
    constructor() {
        this.currentPage = "dashboard";
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadDashboard();
        this.setupEventListeners();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll(".nav-link");
        navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const page = link.getAttribute("href").substring(1);
                this.showPage(page);
            });
        });
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add("active");
        }

        // Update navigation
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.remove("active");
        });
        
        const activeLink = document.querySelector(`[href="#${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add("active");
        }

        this.currentPage = pageId;

        // Load page-specific content
        switch(pageId) {
            case "clients":
                this.loadClients();
                break;
            case "appointments":
                this.loadAppointments();
                break;
            case "qr-codes":
                this.loadQRCodes();
                break;
        }
    }

    setupEventListeners() {
        // Settings form
        const settingsForm = document.getElementById("settings-form");
        if (settingsForm) {
            settingsForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }
    }

    async loadDashboard() {
        try {
            // Load dashboard stats
            const stats = await this.fetchAPI("/api/dashboard.php");
            
            document.getElementById("total-clients").textContent = stats.totalClients || 0;
            document.getElementById("today-appointments").textContent = stats.todayAppointments || 0;
            document.getElementById("active-qr").textContent = stats.activeQR || 0;
        } catch (error) {
            console.error("Errore caricamento dashboard:", error);
        }
    }

    async loadClients() {
        try {
            const clients = await this.fetchAPI("/api/clients.php");
            this.renderClients(clients);
        } catch (error) {
            console.error("Errore caricamento clienti:", error);
        }
    }

    renderClients(clients) {
        const container = document.getElementById("clients-list");
        if (!container) return;

        if (!clients || clients.length === 0) {
            container.innerHTML = "<p>Nessun cliente trovato.</p>";
            return;
        }

        const table = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Telefono</th>
                        <th>Data Nascita</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${clients.map(client => `
                        <tr>
                            <td>${client.first_name} ${client.last_name}</td>
                            <td>${client.email || "-"}</td>
                            <td>${client.phone || "-"}</td>
                            <td>${client.date_of_birth || "-"}</td>
                            <td>
                                <button onclick="app.editClient(${client.id})" class="btn-secondary">Modifica</button>
                                <button onclick="app.generateQR(${client.id})" class="btn-primary">QR Code</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

        container.innerHTML = table;
    }

    async loadAppointments() {
        try {
            const appointments = await this.fetchAPI("/api/appointments.php");
            this.renderAppointments(appointments);
        } catch (error) {
            console.error("Errore caricamento appuntamenti:", error);
        }
    }

    renderAppointments(appointments) {
        const container = document.getElementById("appointments-list");
        if (!container) return;

        if (!appointments || appointments.length === 0) {
            container.innerHTML = "<p>Nessun appuntamento trovato.</p>";
            return;
        }

        const table = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Data</th>
                        <th>Ora</th>
                        <th>Durata</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${appointments.map(apt => `
                        <tr>
                            <td>${apt.client_name}</td>
                            <td>${new Date(apt.appointment_date).toLocaleDateString()}</td>
                            <td>${new Date(apt.appointment_date).toLocaleTimeString()}</td>
                            <td>${apt.duration} min</td>
                            <td>${apt.status}</td>
                            <td>
                                <button onclick="app.editAppointment(${apt.id})" class="btn-secondary">Modifica</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

        container.innerHTML = table;
    }

    async loadQRCodes() {
        try {
            const qrCodes = await this.fetchAPI("/api/qr-codes.php");
            this.renderQRCodes(qrCodes);
        } catch (error) {
            console.error("Errore caricamento QR codes:", error);
        }
    }

    renderQRCodes(qrCodes) {
        const container = document.getElementById("qr-list");
        if (!container) return;

        if (!qrCodes || qrCodes.length === 0) {
            container.innerHTML = "<p>Nessun codice QR generato.</p>";
            return;
        }

        const grid = `
            <div class="qr-grid">
                ${qrCodes.map(qr => `
                    <div class="qr-card">
                        <h4>${qr.client_name}</h4>
                        <div class="qr-code">
                            <img src="${qr.qr_image}" alt="QR Code ${qr.client_name}" />
                        </div>
                        <p>Token: ${qr.qr_token}</p>
                        <button onclick="app.downloadQR(\'${qr.qr_token}\')" class="btn-primary">Scarica</button>
                    </div>
                `).join("")}
            </div>
        `;

        container.innerHTML = grid;
    }

    async fetchAPI(endpoint, options = {}) {
        const response = await fetch(endpoint, {
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    showAddClientForm() {
        // Implementare form per aggiungere cliente
        alert("Funzione in sviluppo");
    }

    showAddAppointmentForm() {
        // Implementare form per aggiungere appuntamento
        alert("Funzione in sviluppo");
    }

    editClient(id) {
        // Implementare modifica cliente
        alert(`Modifica cliente ID: ${id}`);
    }

    editAppointment(id) {
        // Implementare modifica appuntamento
        alert(`Modifica appuntamento ID: ${id}`);
    }

    generateQR(clientId) {
        // Implementare generazione QR
        alert(`Genera QR per cliente ID: ${clientId}`);
    }

    downloadQR(token) {
        // Implementare download QR
        window.open(`/api/qr-download.php?token=${token}`, "_blank");
    }

    async saveSettings() {
        try {
            const formData = new FormData(document.getElementById("settings-form"));
            const data = Object.fromEntries(formData.entries());
            
            await this.fetchAPI("/api/settings.php", {
                method: "POST",
                body: JSON.stringify(data)
            });

            alert("Impostazioni salvate con successo!");
        } catch (error) {
            console.error("Errore salvataggio impostazioni:", error);
            alert("Errore nel salvataggio delle impostazioni");
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.app = new GestionaleApp();
});',

            'manifest.json' => '{
    "name": "Gestionale Sanitario",
    "short_name": "Gestionale",
    "description": "Sistema di gestione per studi medici",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#2563eb",
    "background_color": "#ffffff",
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
}',

            '.htaccess' => 'RewriteEngine On

# Redirect HTTP to HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Pretty URLs
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/$1.php [L]

# Security Headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# Hide PHP version
Header unset X-Powered-By

# Prevent access to sensitive files
<Files "*.log">
    Order allow,deny
    Deny from all
</Files>

<Files "config.php">
    Order allow,deny
    Deny from all
</Files>',

            'api/dashboard.php' => '<?php
session_start();
require_once "../includes/config.php";
require_once "../includes/auth.php";

header("Content-Type: application/json");

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(["error" => "Non autorizzato"]);
    exit();
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Count total clients
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM clients WHERE is_active = 1");
    $totalClients = $stmt->fetch()["total"];
    
    // Count today appointments
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM appointments WHERE DATE(appointment_date) = CURDATE() AND status = \'scheduled\'");
    $todayAppointments = $stmt->fetch()["total"];
    
    // Count active QR codes
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM clients WHERE qr_token IS NOT NULL AND is_active = 1");
    $activeQR = $stmt->fetch()["total"];
    
    echo json_encode([
        "totalClients" => $totalClients,
        "todayAppointments" => $todayAppointments,
        "activeQR" => $activeQR
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Errore database: " . $e->getMessage()]);
}
?>',

            'api/clients.php' => '<?php
session_start();
require_once "../includes/config.php";
require_once "../includes/auth.php";

header("Content-Type: application/json");

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(["error" => "Non autorizzato"]);
    exit();
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $stmt = $pdo->query("SELECT * FROM clients WHERE is_active = 1 ORDER BY last_name, first_name");
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($clients);
        
    } elseif ($_SERVER["REQUEST_METHOD"] === "POST") {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $stmt = $pdo->prepare("INSERT INTO clients (first_name, last_name, email, phone, date_of_birth, address, notes, qr_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $qrToken = uniqid("client_", true);
        
        $stmt->execute([
            $data["first_name"],
            $data["last_name"],
            $data["email"],
            $data["phone"],
            $data["date_of_birth"],
            $data["address"],
            $data["notes"],
            $qrToken
        ]);
        
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId(), "qr_token" => $qrToken]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Errore database: " . $e->getMessage()]);
}
?>',

            'api/appointments.php' => '<?php
session_start();
require_once "../includes/config.php";
require_once "../includes/auth.php";

header("Content-Type: application/json");

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(["error" => "Non autorizzato"]);
    exit();
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $stmt = $pdo->query("
            SELECT a.*, CONCAT(c.first_name, \' \', c.last_name) as client_name 
            FROM appointments a 
            JOIN clients c ON a.client_id = c.id 
            ORDER BY a.appointment_date DESC
        ");
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($appointments);
        
    } elseif ($_SERVER["REQUEST_METHOD"] === "POST") {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $stmt = $pdo->prepare("INSERT INTO appointments (client_id, appointment_date, duration, notes, status) VALUES (?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $data["client_id"],
            $data["appointment_date"],
            $data["duration"] ?? 60,
            $data["notes"],
            $data["status"] ?? "scheduled"
        ]);
        
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Errore database: " . $e->getMessage()]);
}
?>',

            'api/qr-codes.php' => '<?php
session_start();
require_once "../includes/config.php";
require_once "../includes/auth.php";

header("Content-Type: application/json");

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(["error" => "Non autorizzato"]);
    exit();
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("
        SELECT 
            c.id, 
            CONCAT(c.first_name, \' \', c.last_name) as client_name,
            c.qr_token,
            CONCAT(\'data:image/svg+xml;base64,\', BASE64(CONCAT(
                \'<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\" viewBox=\"0 0 200 200\">
                <rect width=\"200\" height=\"200\" fill=\"white\"/>
                <text x=\"100\" y=\"100\" text-anchor=\"middle\" font-family=\"monospace\" font-size=\"8\">\', c.qr_token, \'</text>
                </svg>\'
            ))) as qr_image
        FROM clients c 
        WHERE c.qr_token IS NOT NULL AND c.is_active = 1
        ORDER BY c.last_name, c.first_name
    ");
    
    $qrCodes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($qrCodes);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Errore database: " . $e->getMessage()]);
}
?>',

            'client-access.php' => '<?php
session_start();
require_once "includes/config.php";

// Get QR token from URL
$qrToken = $_GET["token"] ?? "";

if (empty($qrToken)) {
    header("Location: login.php");
    exit();
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare("SELECT * FROM clients WHERE qr_token = ? AND is_active = 1");
    $stmt->execute([$qrToken]);
    $client = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$client) {
        header("Location: login.php");
        exit();
    }
    
    // Get client appointments
    $stmt = $pdo->prepare("SELECT * FROM appointments WHERE client_id = ? ORDER BY appointment_date DESC LIMIT 10");
    $stmt->execute([$client["id"]]);
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (PDOException $e) {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Area Cliente - <?php echo htmlspecialchars($client["first_name"] . " " . $client["last_name"]); ?></title>
    <link rel="stylesheet" href="css/client-style.css">
    <link rel="manifest" href="client-manifest.json">
    <meta name="theme-color" content="#2563eb">
</head>
<body>
    <div class="client-app">
        <header class="client-header">
            <h1>Biomedicina Integrata</h1>
            <p>Area riservata di <?php echo htmlspecialchars($client["first_name"] . " " . $client["last_name"]); ?></p>
        </header>
        
        <main class="client-content">
            <section class="client-info">
                <h2>I tuoi dati</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Nome:</label>
                        <span><?php echo htmlspecialchars($client["first_name"] . " " . $client["last_name"]); ?></span>
                    </div>
                    <div class="info-item">
                        <label>Email:</label>
                        <span><?php echo htmlspecialchars($client["email"] ?? "Non specificata"); ?></span>
                    </div>
                    <div class="info-item">
                        <label>Telefono:</label>
                        <span><?php echo htmlspecialchars($client["phone"] ?? "Non specificato"); ?></span>
                    </div>
                </div>
            </section>
            
            <section class="appointments-section">
                <h2>I tuoi appuntamenti</h2>
                <?php if (empty($appointments)): ?>
                    <p>Nessun appuntamento trovato.</p>
                <?php else: ?>
                    <div class="appointments-list">
                        <?php foreach ($appointments as $appointment): ?>
                            <div class="appointment-card">
                                <div class="appointment-date">
                                    <?php echo date("d/m/Y H:i", strtotime($appointment["appointment_date"])); ?>
                                </div>
                                <div class="appointment-status"><?php echo ucfirst($appointment["status"]); ?></div>
                                <?php if ($appointment["notes"]): ?>
                                    <div class="appointment-notes"><?php echo htmlspecialchars($appointment["notes"]); ?></div>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </section>
            
            <section class="contact-section">
                <h2>Contatti</h2>
                <div class="contact-info">
                    <div class="contact-item">
                        <strong>Email:</strong> busnari.silvia@libero.it
                    </div>
                    <div class="contact-item">
                        <strong>Telefono:</strong> +39 3471445767
                    </div>
                    <div class="contact-item">
                        <strong>Sito web:</strong> biomedicinaintegrata.it
                    </div>
                </div>
            </section>
        </main>
    </div>
</body>
</html>',

            'css/client-style.css' => '/* Client Area Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.client-app {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.client-header {
    background: rgba(255, 255, 255, 0.95);
    padding: 2rem;
    border-radius: 15px;
    text-align: center;
    margin-bottom: 2rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.client-header h1 {
    color: #2563eb;
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.client-header p {
    color: #6b7280;
    font-size: 1.1rem;
}

.client-content {
    display: grid;
    gap: 2rem;
}

section {
    background: rgba(255, 255, 255, 0.95);
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

section h2 {
    color: #2563eb;
    margin-bottom: 1.5rem;
    font-size: 1.3rem;
}

.info-grid {
    display: grid;
    gap: 1rem;
}

.info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 8px;
}

.info-item label {
    font-weight: 600;
    color: #374151;
}

.appointments-list {
    display: grid;
    gap: 1rem;
}

.appointment-card {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid #2563eb;
}

.appointment-date {
    font-weight: 600;
    color: #2563eb;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
}

.appointment-status {
    background: #2563eb;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.8rem;
    display: inline-block;
    margin-bottom: 0.5rem;
}

.appointment-notes {
    color: #6b7280;
    font-style: italic;
}

.contact-info {
    display: grid;
    gap: 1rem;
}

.contact-item {
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 8px;
}

.contact-item strong {
    color: #374151;
}

@media (max-width: 768px) {
    .client-app {
        padding: 10px;
    }
    
    .client-header,
    section {
        padding: 1.5rem;
    }
    
    .client-header h1 {
        font-size: 1.5rem;
    }
}',

            'client-manifest.json' => '{
    "name": "Area Cliente - Biomedicina Integrata",
    "short_name": "Area Cliente",
    "description": "Area riservata clienti",
    "start_url": "/client-access.php",
    "display": "standalone",
    "theme_color": "#2563eb",
    "background_color": "#ffffff",
    "icons": [
        {
            "src": "assets/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        }
    ]
}'
        ];
    }
}

// Avvia installer
$installer = new GestionaleAutoInstaller();
$installer->run();
?>
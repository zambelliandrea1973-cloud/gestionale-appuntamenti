<?php
/**
 * Auto-installer per Gestionale Sanitario - Sistema File-Based
 * Compatibile con hosting condiviso SiteGround
 */

class GestionaleInstaller {
    private $installDir = 'gestionale';
    private $success = [];
    private $errors = [];
    
    public function __construct() {
        if (isset($_POST['action']) && $_POST['action'] === 'install') {
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
            <title>Installer Gestionale Sanitario</title>
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    margin: 0; padding: 20px; 
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    min-height: 100vh; display: flex; align-items: center; justify-content: center;
                }
                .container { 
                    max-width: 500px; width: 100%; background: white; padding: 40px; 
                    border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }
                h1 { text-align: center; margin-bottom: 30px; color: #2c3e50; }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 8px; font-weight: 600; color: #34495e; }
                input[type="email"], input[type="password"] { 
                    width: 100%; padding: 12px; border: 2px solid #ecf0f1; 
                    border-radius: 8px; font-size: 16px; 
                }
                input:focus { border-color: #3498db; outline: none; }
                .install-btn { 
                    width: 100%; padding: 15px; background: #2ecc71; color: white; 
                    border: none; border-radius: 8px; font-size: 18px; font-weight: 600; 
                    cursor: pointer; transition: background 0.3s;
                }
                .install-btn:hover { background: #27ae60; }
                .loading { display: none; text-align: center; margin-top: 20px; }
                .spinner { 
                    border: 4px solid #f3f3f3; border-top: 4px solid #3498db; 
                    border-radius: 50%; width: 40px; height: 40px; 
                    animation: spin 2s linear infinite; margin: 0 auto 10px;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .info-box { 
                    background: #e8f4fd; padding: 15px; border-radius: 8px; 
                    margin-bottom: 20px; border-left: 4px solid #3498db;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Gestionale Sanitario</h1>
                <div class="info-box">
                    Sistema file-based per hosting condiviso. Non richiede database MySQL.
                </div>
                
                <form method="POST" action="">
                    <input type="hidden" name="action" value="install">
                    
                    <div class="form-group">
                        <label>Email Amministratore:</label>
                        <input type="email" name="admin_email" value="busnari.silvia@libero.it" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Password Amministratore:</label>
                        <input type="password" name="admin_password" value="gestionale2024!" required>
                    </div>
                    
                    <button type="submit" class="install-btn" onclick="showLoading()">
                        Installa Gestionale
                    </button>
                    
                    <div class="loading" id="loading">
                        <div class="spinner"></div>
                        <p>Installazione in corso...</p>
                    </div>
                </form>
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
        $this->success[] = "Avvio installazione sistema file-based";
        
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
        
        // Setup storage file-based
        if (!$this->setupFileBasedStorage()) {
            $this->showResult();
            return;
        }
        
        $this->success[] = "Installazione completata con successo!";
        $this->success[] = "Accedi al gestionale: <a href='{$this->installDir}/index.php' target='_blank' style='color: #2ecc71; font-weight: bold;'>{$this->installDir}/index.php</a>";
        $this->success[] = "Username: <strong>admin</strong>";
        $this->success[] = "Password: <strong>coverde79</strong>";
        
        $this->showResult();
    }
    
    private function createDirectory($dir) {
        if (!file_exists($dir)) {
            if (mkdir($dir, 0755, true)) {
                $this->success[] = "Cartella '{$dir}' creata";
            } else {
                $this->errors[] = "Impossibile creare la cartella '{$dir}'";
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
            
            if (file_put_contents($filePath, $content)) {
                $count++;
            } else {
                $this->errors[] = "Errore creazione file: $file";
                return false;
            }
        }
        
        $this->success[] = "Estratti {$count} file dell'applicazione";
        return true;
    }
    
    private function setupFileBasedStorage() {
        // Crea directory di storage
        $storage_dir = $this->installDir . '/gestionale_data';
        if (!file_exists($storage_dir)) {
            mkdir($storage_dir, 0755, true);
        }
        
        // Crea file di configurazione
        $config_content = "<?php
// Configurazione storage file-based
define('STORAGE_TYPE', 'file');
define('STORAGE_DIR', '" . $storage_dir . "');
define('ADMIN_EMAIL', '{$_POST['admin_email']}');
define('ADMIN_PASSWORD', '" . password_hash($_POST['admin_password'], PASSWORD_DEFAULT) . "');
?>";
        
        $includes_dir = $this->installDir . '/includes';
        if (!file_exists($includes_dir)) {
            mkdir($includes_dir, 0755, true);
        }
        
        file_put_contents($includes_dir . '/config.php', $config_content);
        
        // Crea file di storage iniziali
        $initial_data = [
            'clients' => [],
            'appointments' => [],
            'settings' => [
                'app_name' => 'Gestionale Sanitario',
                'admin_email' => $_POST['admin_email']
            ]
        ];
        
        file_put_contents($storage_dir . '/data.json', json_encode($initial_data, JSON_PRETTY_PRINT));
        
        $this->success[] = "Sistema file-based configurato";
        return true;
    }
    
    private function getAllApplicationFiles() {
        return [
            'index.php' => '<?php
require_once "includes/config.php";
session_start();

if (!isset($_SESSION["admin_logged"])) {
    header("Location: login.php");
    exit;
}

include "includes/header.php";
?>

<div class="container mt-4">
    <div class="row">
        <div class="col-md-12">
            <h2>Dashboard Gestionale Sanitario</h2>
            <div class="card">
                <div class="card-body">
                    <h5>Benvenuto nel gestionale</h5>
                    <p>Sistema attivo con storage file-based.</p>
                    <a href="clients.php" class="btn btn-primary">Gestione Clienti</a>
                    <a href="appointments.php" class="btn btn-success">Appuntamenti</a>
                </div>
            </div>
        </div>
    </div>
</div>

<?php include "includes/footer.php"; ?>',

            'login.php' => '<?php
require_once "includes/config.php";
session_start();

if (isset($_POST["login"])) {
    $email = $_POST["email"];
    $password = $_POST["password"];
    
    if ($email === ADMIN_EMAIL && password_verify($password, ADMIN_PASSWORD)) {
        $_SESSION["admin_logged"] = true;
        header("Location: index.php");
        exit;
    } else {
        $error = "Credenziali non valide";
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Login - Gestionale Sanitario</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container">
        <div class="row justify-content-center mt-5">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h3>Login Gestionale</h3>
                    </div>
                    <div class="card-body">
                        <?php if (isset($error)): ?>
                            <div class="alert alert-danger"><?php echo $error; ?></div>
                        <?php endif; ?>
                        
                        <form method="post">
                            <div class="mb-3">
                                <label>Email:</label>
                                <input type="email" name="email" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label>Password:</label>
                                <input type="password" name="password" class="form-control" required>
                            </div>
                            <button type="submit" name="login" class="btn btn-primary">Accedi</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>',

            'client-access.php' => '<?php
// Sistema di accesso QR per clienti
$client_code = $_GET["code"] ?? "";

if ($client_code) {
    $data_file = "gestionale_data/data.json";
    if (file_exists($data_file)) {
        $data = json_decode(file_get_contents($data_file), true);
        
        foreach ($data["clients"] as $client) {
            if ($client["qr_code"] === $client_code) {
                // Cliente trovato, mostra area privata
                ?>
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Area Cliente - <?php echo htmlspecialchars($client["name"]); ?></title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                </head>
                <body>
                    <div class="container mt-4">
                        <h2>Benvenuto <?php echo htmlspecialchars($client["name"]); ?></h2>
                        <div class="card">
                            <div class="card-body">
                                <h5>I tuoi dati</h5>
                                <p><strong>Email:</strong> <?php echo htmlspecialchars($client["email"]); ?></p>
                                <p><strong>Telefono:</strong> <?php echo htmlspecialchars($client["phone"]); ?></p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                <?php
                exit;
            }
        }
    }
}

echo "Codice non valido o cliente non trovato.";
?>',

            'includes/header.php' => '<!DOCTYPE html>
<html>
<head>
    <title>Gestionale Sanitario</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand" href="index.php">Gestionale Sanitario</a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="logout.php">Logout</a>
            </div>
        </div>
    </nav>',

            'includes/footer.php' => '    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>',

            'logout.php' => '<?php
session_start();
session_destroy();
header("Location: login.php");
exit;
?>'
        ];
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
                    <a href="<?php echo $_SERVER['PHP_SELF']; ?>" class="btn btn-secondary">Torna all'Installer</a>
                    
                    <?php if ($isSuccess): ?>
                        <a href="<?php echo $this->installDir; ?>/index.php" class="btn btn-success" target="_blank">
                            Accedi al Gestionale
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </body>
        </html>
        <?php
    }
}

// Avvia installer
new GestionaleInstaller();
?>
<?php
/**
 * Plugin Name: Gestionale Sanitario
 * Description: Sistema di gestione clienti con accesso QR code
 * Version: 1.0
 * Author: Silvia Busnari
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Create plugin directory and files on activation
register_activation_hook(__FILE__, 'gestionale_create_files');

function gestionale_create_files() {
    $upload_dir = wp_upload_dir();
    $gestionale_dir = $upload_dir['basedir'] . '/gestionale';
    
    // Create gestionale directory
    if (!file_exists($gestionale_dir)) {
        wp_mkdir_p($gestionale_dir);
    }
    
    // Create index.php with proper headers
    $index_content = '<?php
// Gestionale Index - WordPress integration bypass
define("GESTIONALE_STANDALONE", true);

// Start session without WordPress
if (!session_id()) {
    session_start();
}

// Check authentication
if (!isset($_SESSION["gestionale_admin"])) {
    header("Location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestionale Sanitario</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand" href="index.php">Gestionale Sanitario</a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="client-access.php?code=CLI001">Test QR</a>
                <a class="nav-link" href="logout.php">Logout</a>
            </div>
        </div>
    </nav>
    
    <div class="container mt-4">
        <h1>Dashboard Gestionale Sanitario</h1>
        <div class="alert alert-success">
            <h4>Sistema Installato e Funzionante!</h4>
            <p>Il gestionale sanitario è ora attivo e accessibile.</p>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Accesso QR Clienti</h5>
                        <p class="card-text">I clienti possono accedere alle loro informazioni tramite QR code.</p>
                        <a href="client-access.php?code=CLI001" class="btn btn-primary" target="_blank">
                            Test Accesso Cliente
                        </a>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Amministrazione</h5>
                        <p class="card-text">Gestione completa del sistema.</p>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-success" onclick="location.reload()">
                                Aggiorna
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-4">
            <h3>Codici QR di Test</h3>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Codice</th>
                            <th>URL Accesso</th>
                            <th>Azione</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Mario Rossi</td>
                            <td>CLI001</td>
                            <td><code>client-access.php?code=CLI001</code></td>
                            <td><a href="client-access.php?code=CLI001" target="_blank" class="btn btn-sm btn-primary">Accedi</a></td>
                        </tr>
                        <tr>
                            <td>Anna Verdi</td>
                            <td>CLI002</td>
                            <td><code>client-access.php?code=CLI002</code></td>
                            <td><a href="client-access.php?code=CLI002" target="_blank" class="btn btn-sm btn-primary">Accedi</a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>';
    
    file_put_contents($gestionale_dir . '/index.php', $index_content);
    
    // Create login.php
    $login_content = '<?php
// Gestionale Login - WordPress integration bypass
define("GESTIONALE_STANDALONE", true);

if (!session_id()) {
    session_start();
}

if (isset($_POST["login"])) {
    $email = $_POST["email"];
    $password = $_POST["password"];
    
    if ($email === "busnari.silvia@libero.it" && $password === "gestionale2024!") {
        $_SESSION["gestionale_admin"] = true;
        header("Location: index.php");
        exit;
    } else {
        $error = "Credenziali non valide";
    }
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Gestionale Sanitario</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .login-card { margin-top: 100px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card login-card">
                    <div class="card-header bg-primary text-white">
                        <h3 class="mb-0">Gestionale Sanitario</h3>
                        <small>Accesso Amministratore</small>
                    </div>
                    <div class="card-body">
                        <?php if (isset($error)): ?>
                            <div class="alert alert-danger"><?php echo $error; ?></div>
                        <?php endif; ?>
                        
                        <form method="post">
                            <div class="mb-3">
                                <label class="form-label">Email:</label>
                                <input type="email" name="email" class="form-control" value="busnari.silvia@libero.it" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password:</label>
                                <input type="password" name="password" class="form-control" placeholder="Inserisci password" required>
                            </div>
                            <button type="submit" name="login" class="btn btn-primary w-100">Accedi</button>
                        </form>
                        
                        <div class="mt-4 p-3 bg-light rounded">
                            <h6 class="text-muted">Credenziali di accesso:</h6>
                            <small>
                                <strong>Email:</strong> busnari.silvia@libero.it<br>
                                <strong>Password:</strong> gestionale2024!
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>';
    
    file_put_contents($gestionale_dir . '/login.php', $login_content);
    
    // Create client-access.php
    $client_access = '<?php
// Client Access - WordPress integration bypass
define("GESTIONALE_STANDALONE", true);

$client_code = $_GET["code"] ?? "";

$clients_data = [
    "CLI001" => [
        "name" => "Mario Rossi",
        "email" => "mario.rossi@email.com", 
        "phone" => "+39 123 456 7890",
        "birth_date" => "1980-05-15",
        "appointments" => [
            ["date" => "2024-01-15", "time" => "10:00", "type" => "Visita controllo"],
            ["date" => "2024-02-20", "time" => "14:30", "type" => "Consulenza specialistica"]
        ]
    ],
    "CLI002" => [
        "name" => "Anna Verdi",
        "email" => "anna.verdi@email.com",
        "phone" => "+39 098 765 4321", 
        "birth_date" => "1975-08-22",
        "appointments" => [
            ["date" => "2024-01-20", "time" => "09:00", "type" => "Prima visita"],
            ["date" => "2024-03-10", "time" => "15:00", "type" => "Controllo follow-up"]
        ]
    ]
];

if ($client_code && isset($clients_data[$client_code])) {
    $client = $clients_data[$client_code];
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Area Cliente - <?php echo htmlspecialchars($client["name"]); ?></title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            body { background: #f8f9fa; }
            .client-header { background: linear-gradient(135deg, #28a745, #20c997); color: white; }
            .contact-card { border-left: 4px solid #007bff; }
            .appointment-card { border-left: 4px solid #28a745; }
        </style>
    </head>
    <body>
        <div class="client-header py-4">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col">
                        <h1><i class="fas fa-user-circle me-2"></i>Benvenuto <?php echo htmlspecialchars($client["name"]); ?></h1>
                        <p class="mb-0">Area Cliente Personale</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="container mt-4">
            <div class="row">
                <div class="col-md-6">
                    <div class="card contact-card mb-4">
                        <div class="card-header">
                            <h5><i class="fas fa-id-card me-2"></i>I tuoi dati</h5>
                        </div>
                        <div class="card-body">
                            <p><i class="fas fa-envelope me-2"></i><strong>Email:</strong> <?php echo htmlspecialchars($client["email"]); ?></p>
                            <p><i class="fas fa-phone me-2"></i><strong>Telefono:</strong> <?php echo htmlspecialchars($client["phone"]); ?></p>
                            <p><i class="fas fa-birthday-cake me-2"></i><strong>Data di nascita:</strong> <?php echo htmlspecialchars($client["birth_date"]); ?></p>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card appointment-card mb-4">
                        <div class="card-header">
                            <h5><i class="fas fa-calendar-alt me-2"></i>Prossimi appuntamenti</h5>
                        </div>
                        <div class="card-body">
                            <?php if (!empty($client["appointments"])): ?>
                                <?php foreach ($client["appointments"] as $appointment): ?>
                                    <div class="appointment-item p-3 mb-2 bg-light rounded">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h6 class="mb-1"><?php echo htmlspecialchars($appointment["type"]); ?></h6>
                                                <small class="text-muted">
                                                    <i class="fas fa-calendar me-1"></i><?php echo $appointment["date"]; ?> 
                                                    <i class="fas fa-clock ms-2 me-1"></i><?php echo $appointment["time"]; ?>
                                                </small>
                                            </div>
                                            <span class="badge bg-success">Confermato</span>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <p class="text-muted">Nessun appuntamento in programma</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5><i class="fas fa-clinic-medical me-2"></i>Contatti Studio</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6><strong>Dr.ssa Silvia Busnari</strong></h6>
                            <p class="mb-1"><i class="fas fa-envelope me-2"></i>busnari.silvia@libero.it</p>
                            <p class="mb-1"><i class="fas fa-phone me-2"></i>+39 3471445767</p>
                            <p class="mb-1"><i class="fas fa-globe me-2"></i>biomedicinaintegrata.it</p>
                            <p class="mb-0"><i class="fab fa-instagram me-2"></i>@biomedicinaintegrata</p>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="d-grid gap-2">
                                <a href="tel:+393471445767" class="btn btn-success">
                                    <i class="fas fa-phone me-1"></i>Chiama
                                </a>
                                <a href="mailto:busnari.silvia@libero.it" class="btn btn-primary">
                                    <i class="fas fa-envelope me-1"></i>Email
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <footer class="mt-5 py-4 bg-dark text-white text-center">
            <div class="container">
                <p class="mb-0">&copy; 2024 Dr.ssa Silvia Busnari - Gestionale Sanitario</p>
            </div>
        </footer>
    </body>
    </html>
    <?php
    exit;
} else {
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accesso non valido</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card border-danger">
                        <div class="card-header bg-danger text-white text-center">
                            <h4><i class="fas fa-exclamation-triangle me-2"></i>Accesso Negato</h4>
                        </div>
                        <div class="card-body text-center">
                            <p>Il codice QR fornito non è valido o è scaduto.</p>
                            <p class="text-muted">Contatta lo studio per assistenza.</p>
                            <a href="tel:+393471445767" class="btn btn-primary">
                                <i class="fas fa-phone me-1"></i>Chiama Studio
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
}
?>';
    
    file_put_contents($gestionale_dir . '/client-access.php', $client_access);
    
    // Create logout.php
    $logout_content = '<?php
// Gestionale Logout
define("GESTIONALE_STANDALONE", true);

if (!session_id()) {
    session_start();
}

session_destroy();
header("Location: login.php");
exit;
?>';
    
    file_put_contents($gestionale_dir . '/logout.php', $logout_content);
}

// Add WordPress admin menu
add_action('admin_menu', 'gestionale_admin_menu');

function gestionale_admin_menu() {
    add_menu_page(
        'Gestionale Sanitario',
        'Gestionale',
        'manage_options',
        'gestionale-admin',
        'gestionale_admin_page',
        'dashicons-groups',
        30
    );
}

function gestionale_admin_page() {
    $upload_dir = wp_upload_dir();
    $gestionale_url = $upload_dir['baseurl'] . '/gestionale/';
    
    echo '<div class="wrap">';
    echo '<h1>Gestionale Sanitario</h1>';
    echo '<div class="notice notice-success"><p><strong>Gestionale installato e funzionante!</strong></p></div>';
    echo '<p>Il sistema gestionale è stato installato correttamente.</p>';
    echo '<h3>Link di accesso:</h3>';
    echo '<ul>';
    echo '<li><strong>Amministrazione:</strong> <a href="' . $gestionale_url . 'login.php" target="_blank">' . $gestionale_url . 'login.php</a></li>';
    echo '<li><strong>Test Cliente 1:</strong> <a href="' . $gestionale_url . 'client-access.php?code=CLI001" target="_blank">' . $gestionale_url . 'client-access.php?code=CLI001</a></li>';
    echo '<li><strong>Test Cliente 2:</strong> <a href="' . $gestionale_url . 'client-access.php?code=CLI002" target="_blank">' . $gestionale_url . 'client-access.php?code=CLI002</a></li>';
    echo '</ul>';
    echo '<h3>Credenziali di accesso:</h3>';
    echo '<p><strong>Email:</strong> busnari.silvia@libero.it<br><strong>Password:</strong> gestionale2024!</p>';
    echo '</div>';
}
?>
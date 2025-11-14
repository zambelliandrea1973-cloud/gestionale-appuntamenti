<?php
/**
 * Plugin Name: Gestionale Sanitario
 * Plugin URI: https://biomedicinaintegrata.it
 * Description: Sistema completo di gestione clienti con accesso QR code per studi medici
 * Version: 1.0.0
 * Author: Dr.ssa Silvia Busnari
 * License: GPL v2 or later
 * Text Domain: gestionale-sanitario
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GESTIONALE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('GESTIONALE_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('GESTIONALE_VERSION', '1.0.0');

// Plugin activation and deactivation hooks
register_activation_hook(__FILE__, 'gestionale_activate');
register_deactivation_hook(__FILE__, 'gestionale_deactivate');

// Initialize plugin
add_action('init', 'gestionale_init');
add_action('wp_enqueue_scripts', 'gestionale_enqueue_scripts');

function gestionale_activate() {
    // Create database tables and initial data
    gestionale_create_tables();
    gestionale_create_pages();
    gestionale_create_files();
    
    // Flush rewrite rules
    flush_rewrite_rules();
}

function gestionale_deactivate() {
    // Clean up if needed
    flush_rewrite_rules();
}

function gestionale_init() {
    // Add custom rewrite rules for QR access
    add_rewrite_rule('^cliente/([^/]+)/?', 'index.php?gestionale_client=$matches[1]', 'top');
    add_rewrite_rule('^gestionale-admin/?', 'index.php?gestionale_admin=1', 'top');
    
    // Add query vars
    add_filter('query_vars', 'gestionale_query_vars');
}

function gestionale_query_vars($vars) {
    $vars[] = 'gestionale_client';
    $vars[] = 'gestionale_admin';
    return $vars;
}

function gestionale_enqueue_scripts() {
    wp_enqueue_style('bootstrap', 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css');
    wp_enqueue_script('bootstrap', 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js', array(), false, true);
    wp_enqueue_style('fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
}

function gestionale_create_tables() {
    $upload_dir = wp_upload_dir();
    $data_dir = $upload_dir['basedir'] . '/gestionale-data';
    
    if (!file_exists($data_dir)) {
        wp_mkdir_p($data_dir);
    }
    
    // Create initial data file
    $initial_data = array(
        'settings' => array(
            'doctor_name' => 'Dr.ssa Silvia Busnari',
            'studio_name' => 'Studio di Biomedicina Integrata',
            'email' => 'busnari.silvia@libero.it',
            'phone' => '+39 3471445767',
            'website' => 'biomedicinaintegrata.it',
            'instagram' => '@biomedicinaintegrata',
            'admin_password' => password_hash('gestionale2024!', PASSWORD_DEFAULT)
        ),
        'clients' => array(
            array(
                'id' => 'CLI001',
                'name' => 'Mario Rossi',
                'email' => 'mario.rossi@email.com',
                'phone' => '+39 123 456 7890',
                'birth_date' => '1980-05-15',
                'qr_code' => 'CLI001',
                'created_date' => date('Y-m-d H:i:s'),
                'appointments' => array(
                    array('date' => '2024-01-15', 'time' => '10:00', 'type' => 'Visita controllo', 'status' => 'confermato'),
                    array('date' => '2024-02-20', 'time' => '14:30', 'type' => 'Consulenza specialistica', 'status' => 'confermato')
                )
            ),
            array(
                'id' => 'CLI002', 
                'name' => 'Anna Verdi',
                'email' => 'anna.verdi@email.com',
                'phone' => '+39 098 765 4321',
                'birth_date' => '1975-08-22',
                'qr_code' => 'CLI002',
                'created_date' => date('Y-m-d H:i:s'),
                'appointments' => array(
                    array('date' => '2024-01-20', 'time' => '09:00', 'type' => 'Prima visita', 'status' => 'confermato'),
                    array('date' => '2024-03-10', 'time' => '15:00', 'type' => 'Controllo follow-up', 'status' => 'programmato')
                )
            )
        )
    );
    
    $data_file = $data_dir . '/data.json';
    if (!file_exists($data_file)) {
        file_put_contents($data_file, json_encode($initial_data, JSON_PRETTY_PRINT));
    }
}

function gestionale_create_pages() {
    // Create admin page
    $admin_page = array(
        'post_title' => 'Gestionale Admin',
        'post_content' => '[gestionale_admin]',
        'post_status' => 'private',
        'post_type' => 'page',
        'post_name' => 'gestionale-admin'
    );
    
    $admin_page_id = wp_insert_post($admin_page);
    update_option('gestionale_admin_page_id', $admin_page_id);
}

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
    // Handle form submissions
    if (isset($_POST['action'])) {
        gestionale_handle_admin_actions();
    }
    
    $clients = gestionale_get_clients();
    $stats = gestionale_get_stats();
    
    ?>
    <div class="wrap">
        <h1><i class="fas fa-stethoscope"></i> Gestionale Sanitario</h1>
        
        <!-- Stats Dashboard -->
        <div class="gestionale-stats">
            <div class="stat-box">
                <h3><?php echo $stats['total_clients']; ?></h3>
                <p>Clienti Totali</p>
            </div>
            <div class="stat-box">
                <h3><?php echo $stats['appointments_today']; ?></h3>
                <p>Appuntamenti Oggi</p>
            </div>
            <div class="stat-box">
                <h3><?php echo $stats['appointments_week']; ?></h3>
                <p>Appuntamenti Settimana</p>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="gestionale-actions">
            <button type="button" class="button button-primary" onclick="showAddClientForm()">
                <i class="fas fa-user-plus"></i> Aggiungi Cliente
            </button>
            <a href="<?php echo home_url('/cliente/CLI001'); ?>" target="_blank" class="button">
                <i class="fas fa-qrcode"></i> Test QR Cliente 1
            </a>
            <a href="<?php echo home_url('/cliente/CLI002'); ?>" target="_blank" class="button">
                <i class="fas fa-qrcode"></i> Test QR Cliente 2
            </a>
        </div>
        
        <!-- Add Client Form (Hidden) -->
        <div id="add-client-form" style="display:none;">
            <h2>Aggiungi Nuovo Cliente</h2>
            <form method="post">
                <input type="hidden" name="action" value="add_client">
                <table class="form-table">
                    <tr>
                        <th><label for="client_name">Nome Completo</label></th>
                        <td><input type="text" id="client_name" name="client_name" class="regular-text" required></td>
                    </tr>
                    <tr>
                        <th><label for="client_email">Email</label></th>
                        <td><input type="email" id="client_email" name="client_email" class="regular-text" required></td>
                    </tr>
                    <tr>
                        <th><label for="client_phone">Telefono</label></th>
                        <td><input type="tel" id="client_phone" name="client_phone" class="regular-text" required></td>
                    </tr>
                    <tr>
                        <th><label for="client_birth">Data di Nascita</label></th>
                        <td><input type="date" id="client_birth" name="client_birth" class="regular-text"></td>
                    </tr>
                </table>
                <p class="submit">
                    <input type="submit" class="button button-primary" value="Crea Cliente">
                    <button type="button" class="button" onclick="hideAddClientForm()">Annulla</button>
                </p>
            </form>
        </div>
        
        <!-- Clients Table -->
        <h2>Clienti</h2>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefono</th>
                    <th>Codice QR</th>
                    <th>URL Cliente</th>
                    <th>Azioni</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($clients as $client): ?>
                    <tr>
                        <td><strong><?php echo esc_html($client['name']); ?></strong></td>
                        <td><?php echo esc_html($client['email']); ?></td>
                        <td><?php echo esc_html($client['phone']); ?></td>
                        <td><code><?php echo esc_html($client['qr_code']); ?></code></td>
                        <td>
                            <a href="<?php echo home_url('/cliente/' . $client['qr_code']); ?>" target="_blank">
                                <?php echo home_url('/cliente/' . $client['qr_code']); ?>
                            </a>
                        </td>
                        <td>
                            <a href="<?php echo home_url('/cliente/' . $client['qr_code']); ?>" target="_blank" class="button button-small">
                                <i class="fas fa-external-link-alt"></i> Visualizza
                            </a>
                            <button class="button button-small" onclick="generateQRCode('<?php echo $client['qr_code']; ?>')">
                                <i class="fas fa-qrcode"></i> QR
                            </button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <!-- QR Code Modal -->
        <div id="qr-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000;">
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:20px; border-radius:10px; text-align:center;">
                <h3>QR Code Cliente</h3>
                <div id="qr-code-container"></div>
                <p><strong>URL:</strong> <span id="qr-url"></span></p>
                <button class="button button-primary" onclick="closeQRModal()">Chiudi</button>
            </div>
        </div>
    </div>
    
    <style>
    .gestionale-stats {
        display: flex;
        gap: 20px;
        margin: 20px 0;
    }
    .stat-box {
        background: #fff;
        border: 1px solid #ccd0d4;
        border-radius: 4px;
        padding: 20px;
        text-align: center;
        flex: 1;
    }
    .stat-box h3 {
        margin: 0;
        font-size: 2em;
        color: #0073aa;
    }
    .stat-box p {
        margin: 5px 0 0;
        color: #666;
    }
    .gestionale-actions {
        margin: 20px 0;
    }
    .gestionale-actions .button {
        margin-right: 10px;
    }
    </style>
    
    <script>
    function showAddClientForm() {
        document.getElementById('add-client-form').style.display = 'block';
    }
    
    function hideAddClientForm() {
        document.getElementById('add-client-form').style.display = 'none';
    }
    
    function generateQRCode(clientCode) {
        var url = '<?php echo home_url('/cliente/'); ?>' + clientCode;
        document.getElementById('qr-url').textContent = url;
        
        // Create QR code using qrcode.js library
        var qrContainer = document.getElementById('qr-code-container');
        qrContainer.innerHTML = '';
        
        // Simple QR code placeholder - in production would use QR library
        qrContainer.innerHTML = '<div style="width:200px; height:200px; border:1px solid #ccc; display:flex; align-items:center; justify-content:center; margin:20px auto;">QR Code<br>' + clientCode + '</div>';
        
        document.getElementById('qr-modal').style.display = 'block';
    }
    
    function closeQRModal() {
        document.getElementById('qr-modal').style.display = 'none';
    }
    </script>
    <?php
}

// Helper functions
function gestionale_get_clients() {
    $upload_dir = wp_upload_dir();
    $data_file = $upload_dir['basedir'] . '/gestionale-data/data.json';
    
    if (file_exists($data_file)) {
        $data = json_decode(file_get_contents($data_file), true);
        return isset($data['clients']) ? $data['clients'] : array();
    }
    
    return array();
}

function gestionale_get_stats() {
    $clients = gestionale_get_clients();
    $stats = array(
        'total_clients' => count($clients),
        'appointments_today' => 0,
        'appointments_week' => 0
    );
    
    $today = date('Y-m-d');
    $week_start = date('Y-m-d', strtotime('monday this week'));
    $week_end = date('Y-m-d', strtotime('sunday this week'));
    
    foreach ($clients as $client) {
        if (isset($client['appointments'])) {
            foreach ($client['appointments'] as $appointment) {
                $apt_date = $appointment['date'];
                if ($apt_date === $today) {
                    $stats['appointments_today']++;
                }
                if ($apt_date >= $week_start && $apt_date <= $week_end) {
                    $stats['appointments_week']++;
                }
            }
        }
    }
    
    return $stats;
}

function gestionale_handle_admin_actions() {
    if ($_POST['action'] === 'add_client') {
        $new_client = array(
            'id' => 'CLI' . sprintf('%03d', time() % 1000),
            'name' => sanitize_text_field($_POST['client_name']),
            'email' => sanitize_email($_POST['client_email']),
            'phone' => sanitize_text_field($_POST['client_phone']),
            'birth_date' => sanitize_text_field($_POST['client_birth']),
            'qr_code' => 'CLI' . sprintf('%03d', time() % 1000),
            'created_date' => date('Y-m-d H:i:s'),
            'appointments' => array()
        );
        
        $upload_dir = wp_upload_dir();
        $data_file = $upload_dir['basedir'] . '/gestionale-data/data.json';
        
        if (file_exists($data_file)) {
            $data = json_decode(file_get_contents($data_file), true);
            $data['clients'][] = $new_client;
            file_put_contents($data_file, json_encode($data, JSON_PRETTY_PRINT));
            
            echo '<div class="notice notice-success"><p>Cliente aggiunto con successo! Codice QR: ' . $new_client['qr_code'] . '</p></div>';
        }
    }
}
?>
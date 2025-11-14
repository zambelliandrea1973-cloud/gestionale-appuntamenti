<?php
/**
 * Plugin Name: Gestionale Sanitario Completo
 * Plugin URI: https://biomedicinaintegrata.it
 * Description: Sistema multi-tenant con gestione professionisti, piani abbonamento e clienti - Migrazione completa da Replit
 * Version: 2.0.0
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
define('GESTIONALE_VERSION', '2.0.0');

// Plugin activation and deactivation hooks
register_activation_hook(__FILE__, 'gestionale_activate_complete');
register_deactivation_hook(__FILE__, 'gestionale_deactivate_complete');

// Initialize plugin
add_action('init', 'gestionale_init_complete');
add_action('wp_enqueue_scripts', 'gestionale_enqueue_scripts_complete');

function gestionale_activate_complete() {
    gestionale_create_complete_system();
    flush_rewrite_rules();
}

function gestionale_deactivate_complete() {
    flush_rewrite_rules();
}

function gestionale_init_complete() {
    // Add custom rewrite rules for multi-tenant access
    add_rewrite_rule('^gestionale/([^/]+)/?$', 'index.php?gestionale_professional=$matches[1]', 'top');
    add_rewrite_rule('^cliente/([^/]+)/?$', 'index.php?gestionale_client=$matches[1]', 'top');
    add_rewrite_rule('^gestionale-admin/?$', 'index.php?gestionale_admin=1', 'top');
    
    // Add query vars
    add_filter('query_vars', 'gestionale_query_vars_complete');
}

function gestionale_query_vars_complete($vars) {
    $vars[] = 'gestionale_professional';
    $vars[] = 'gestionale_client';  
    $vars[] = 'gestionale_admin';
    return $vars;
}

function gestionale_enqueue_scripts_complete() {
    wp_enqueue_style('bootstrap', 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css');
    wp_enqueue_script('bootstrap', 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js', array(), false, true);
    wp_enqueue_style('fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
}

function gestionale_create_complete_system() {
    $upload_dir = wp_upload_dir();
    $data_dir = $upload_dir['basedir'] . '/gestionale-data';
    
    if (!file_exists($data_dir)) {
        wp_mkdir_p($data_dir);
    }
    
    // Carica i dati del sistema completo dal file JSON
    $system_file = $data_dir . '/complete-system.json';
    if (!file_exists($system_file)) {
        // Copia i dati di default se il file non esiste
        $source_file = GESTIONALE_PLUGIN_PATH . 'wordpress-complete-system.json';
        if (file_exists($source_file)) {
            copy($source_file, $system_file);
        }
    }
}

// Handle template redirect
add_action('template_redirect', 'gestionale_template_redirect_complete');

function gestionale_template_redirect_complete() {
    $professional_id = get_query_var('gestionale_professional');
    $client_code = get_query_var('gestionale_client');
    $admin_access = get_query_var('gestionale_admin');
    
    if ($professional_id) {
        gestionale_display_professional_dashboard($professional_id);
        exit;
    }
    
    if ($client_code) {
        gestionale_display_client_area($client_code);
        exit;
    }
    
    if ($admin_access) {
        gestionale_display_system_admin();
        exit;
    }
}

function gestionale_get_system_data() {
    $upload_dir = wp_upload_dir();
    $system_file = $upload_dir['basedir'] . '/gestionale-data/complete-system.json';
    
    if (file_exists($system_file)) {
        $data = file_get_contents($system_file);
        return json_decode($data, true);
    }
    
    return null;
}

function gestionale_authenticate_professional($username, $password) {
    $system = gestionale_get_system_data();
    if (!$system) return false;
    
    foreach ($system['professionals'] as $prof) {
        if ($prof['username'] === $username || $prof['email'] === $username) {
            // Verifica password hash o password temporanea
            if (password_verify($password, $prof['password_hash']) || 
                $password === 'gestionale2024!') {
                return $prof;
            }
        }
    }
    
    return false;
}

function gestionale_display_professional_dashboard($professional_id) {
    session_start();
    
    // Handle login
    if (isset($_POST['login'])) {
        $username = sanitize_text_field($_POST['username']);
        $password = $_POST['password'];
        
        $professional = gestionale_authenticate_professional($username, $password);
        if ($professional && ($professional['id'] == $professional_id || $professional['username'] == $professional_id)) {
            $_SESSION['gestionale_professional'] = $professional['id'];
            $_SESSION['gestionale_professional_data'] = $professional;
            wp_redirect(current_url());
            exit;
        } else {
            $error = 'Credenziali non valide per questo professionista';
        }
    }
    
    // Check if logged in
    if (!isset($_SESSION['gestionale_professional']) || $_SESSION['gestionale_professional'] != $professional_id) {
        gestionale_display_professional_login($professional_id, isset($error) ? $error : null);
        return;
    }
    
    $professional = $_SESSION['gestionale_professional_data'];
    
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Dashboard - <?php echo esc_html($professional['settings']['studio_name']); ?></title>
        <?php wp_head(); ?>
        <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .dashboard-header { 
                background: linear-gradient(135deg, <?php echo esc_attr($professional['settings']['primary_color']); ?>, <?php echo esc_attr($professional['settings']['secondary_color']); ?>); 
                color: white; 
                padding: 2rem 0; 
            }
            .license-badge { 
                background: <?php echo $professional['license']['type'] === 'business' ? '#28a745' : ($professional['license']['type'] === 'pro' ? '#007bff' : '#ffc107'); ?>; 
                color: white; 
                padding: 0.25rem 0.75rem; 
                border-radius: 1rem; 
                font-size: 0.875rem; 
            }
            .logout-btn { position: absolute; top: 1rem; right: 1rem; }
        </style>
    </head>
    <body>
        <div class="dashboard-header">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col">
                        <h1><i class="fas fa-clinic-medical me-2"></i><?php echo esc_html($professional['settings']['studio_name']); ?></h1>
                        <p class="mb-0">
                            Dashboard Professionista - 
                            <span class="license-badge"><?php echo strtoupper($professional['license']['type']); ?></span>
                            <?php if ($professional['license']['expires_at']): ?>
                                <small class="ms-2">Scade: <?php echo date('d/m/Y', strtotime($professional['license']['expires_at'])); ?></small>
                            <?php endif; ?>
                        </p>
                    </div>
                    <div class="col-auto">
                        <a href="?logout=1" class="btn btn-outline-light btn-sm">
                            <i class="fas fa-sign-out-alt me-1"></i>Logout
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="container mt-4">
            <div class="row">
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-primary"><?php echo $professional['stats']['total_clients']; ?></h3>
                            <p class="mb-0">Clienti Totali</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-success"><?php echo $professional['stats']['active_clients']; ?></h3>
                            <p class="mb-0">Clienti Attivi</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-info">0</h3>
                            <p class="mb-0">Appuntamenti Oggi</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-warning">0</h3>
                            <p class="mb-0">In Attesa</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5><i class="fas fa-users me-2"></i>I tuoi Clienti</h5>
                            <button class="btn btn-primary btn-sm" onclick="showAddClientForm()">
                                <i class="fas fa-user-plus me-1"></i>Aggiungi Cliente
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Email</th>
                                            <th>Telefono</th>
                                            <th>Codice QR</th>
                                            <th>URL Cliente</th>
                                            <th>Ultimo Accesso</th>
                                            <th>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($professional['clients'] as $client): ?>
                                            <tr>
                                                <td><strong><?php echo esc_html($client['name']); ?></strong></td>
                                                <td><?php echo esc_html($client['email']); ?></td>
                                                <td><?php echo esc_html($client['phone']); ?></td>
                                                <td><code><?php echo esc_html($client['qr_code']); ?></code></td>
                                                <td>
                                                    <a href="<?php echo home_url('/cliente/' . $client['qr_code']); ?>" target="_blank" class="btn btn-sm btn-outline-primary">
                                                        <i class="fas fa-external-link-alt"></i> Apri
                                                    </a>
                                                </td>
                                                <td>
                                                    <?php if ($client['last_access']): ?>
                                                        <?php echo date('d/m/Y H:i', strtotime($client['last_access'])); ?>
                                                    <?php else: ?>
                                                        <span class="text-muted">Mai</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <a href="<?php echo home_url('/cliente/' . $client['qr_code']); ?>" target="_blank" class="btn btn-outline-primary">
                                                            <i class="fas fa-eye"></i>
                                                        </a>
                                                        <button class="btn btn-outline-secondary" onclick="generateQR('<?php echo esc_js($client['qr_code']); ?>')">
                                                            <i class="fas fa-qrcode"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                        
                                        <?php if (empty($professional['clients'])): ?>
                                            <tr>
                                                <td colspan="7" class="text-center text-muted py-4">
                                                    <i class="fas fa-users fa-3x mb-3 d-block"></i>
                                                    Nessun cliente registrato. Aggiungi il primo cliente per iniziare.
                                                </td>
                                            </tr>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Add Client Modal -->
        <div id="add-client-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000;">
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:20px; border-radius:10px; width:90%; max-width:500px;">
                <h4>Aggiungi Nuovo Cliente</h4>
                <form id="add-client-form">
                    <div class="mb-3">
                        <label class="form-label">Nome Completo:</label>
                        <input type="text" name="client_name" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email:</label>
                        <input type="email" name="client_email" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Telefono:</label>
                        <input type="tel" name="client_phone" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Data di Nascita:</label>
                        <input type="date" name="client_birth" class="form-control">
                    </div>
                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">Aggiungi Cliente</button>
                        <button type="button" class="btn btn-secondary" onclick="hideAddClientForm()">Annulla</button>
                    </div>
                </form>
            </div>
        </div>
        
        <script>
        function showAddClientForm() {
            document.getElementById('add-client-modal').style.display = 'block';
        }
        
        function hideAddClientForm() {
            document.getElementById('add-client-modal').style.display = 'none';
        }
        
        function generateQR(clientCode) {
            const url = '<?php echo home_url('/cliente/'); ?>' + clientCode;
            window.open('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url), '_blank');
        }
        
        // Handle logout
        if (window.location.search.includes('logout=1')) {
            if (confirm('Sei sicuro di voler uscire?')) {
                window.location.href = '<?php echo home_url('/gestionale/' . $professional['id']); ?>?action=logout';
            }
        }
        </script>
        
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
    
    // Handle logout
    if (isset($_GET['action']) && $_GET['action'] === 'logout') {
        session_destroy();
        wp_redirect(home_url('/gestionale/' . $professional['id']));
        exit;
    }
}

function gestionale_display_professional_login($professional_id, $error = null) {
    $system = gestionale_get_system_data();
    $professional = null;
    
    foreach ($system['professionals'] as $p) {
        if ($p['id'] == $professional_id || $p['username'] == $professional_id) {
            $professional = $p;
            break;
        }
    }
    
    if (!$professional) {
        wp_die('Professionista non trovato');
        return;
    }
    
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Login - <?php echo esc_html($professional['settings']['studio_name']); ?></title>
        <?php wp_head(); ?>
        <style>
            body { 
                background: linear-gradient(135deg, <?php echo esc_attr($professional['settings']['primary_color']); ?>, <?php echo esc_attr($professional['settings']['secondary_color']); ?>); 
                min-height: 100vh; 
                margin: 0; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            }
            .login-card { margin-top: 100px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card login-card">
                        <div class="card-header text-white" style="background-color: <?php echo esc_attr($professional['settings']['primary_color']); ?>;">
                            <h3 class="mb-0"><?php echo esc_html($professional['settings']['studio_name']); ?></h3>
                            <small>Accesso Professionista</small>
                        </div>
                        <div class="card-body">
                            <?php if ($error): ?>
                                <div class="alert alert-danger"><?php echo esc_html($error); ?></div>
                            <?php endif; ?>
                            
                            <form method="post">
                                <div class="mb-3">
                                    <label class="form-label">Username/Email:</label>
                                    <input type="text" name="username" class="form-control" value="<?php echo esc_attr($professional['username']); ?>" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Password:</label>
                                    <input type="password" name="password" class="form-control" placeholder="Inserisci password" required>
                                </div>
                                <button type="submit" name="login" class="btn btn-primary w-100">Accedi</button>
                            </form>
                            
                            <div class="mt-4 p-3 bg-light rounded">
                                <h6 class="text-muted">Password temporanea sistema test:</h6>
                                <small><strong>gestionale2024!</strong></small>
                                <hr>
                                <small class="text-muted">
                                    <strong>Professionista:</strong> <?php echo esc_html($professional['username']); ?><br>
                                    <strong>Licenza:</strong> <?php echo strtoupper($professional['license']['type']); ?><br>
                                    <strong>Clienti:</strong> <?php echo $professional['stats']['total_clients']; ?>
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
}

function gestionale_display_client_area($client_code) {
    $system = gestionale_get_system_data();
    $client = null;
    $professional = null;
    
    // Trova il cliente e il suo professionista
    foreach ($system['professionals'] as $p) {
        foreach ($p['clients'] as $c) {
            if ($c['qr_code'] === $client_code) {
                $client = $c;
                $professional = $p;
                break 2;
            }
        }
    }
    
    if (!$client || !$professional) {
        gestionale_display_not_found();
        return;
    }
    
    // Aggiorna ultimo accesso
    gestionale_update_client_access($client_code);
    
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Area Cliente - <?php echo esc_html($client['name']); ?> | <?php echo esc_html($professional['settings']['studio_name']); ?></title>
        <?php wp_head(); ?>
        <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .client-header { 
                background: linear-gradient(135deg, <?php echo esc_attr($professional['settings']['primary_color']); ?>, <?php echo esc_attr($professional['settings']['secondary_color']); ?>); 
                color: white; 
                padding: 2rem 0; 
            }
            .contact-card { border-left: 4px solid <?php echo esc_attr($professional['settings']['primary_color']); ?>; }
            .appointment-card { border-left: 4px solid #28a745; }
            .studio-card { border-left: 4px solid #6f42c1; }
        </style>
    </head>
    <body>
        <div class="client-header">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col">
                        <h1><i class="fas fa-user-circle me-2"></i>Benvenuto <?php echo esc_html($client['name']); ?></h1>
                        <p class="mb-0"><?php echo esc_html($professional['settings']['studio_name']); ?> - Area Cliente Personale</p>
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
                            <p><i class="fas fa-user me-2"></i><strong>Nome:</strong> <?php echo esc_html($client['name']); ?></p>
                            <p><i class="fas fa-envelope me-2"></i><strong>Email:</strong> <?php echo esc_html($client['email']); ?></p>
                            <p><i class="fas fa-phone me-2"></i><strong>Telefono:</strong> <?php echo esc_html($client['phone']); ?></p>
                            <?php if (!empty($client['birth_date'])): ?>
                                <p><i class="fas fa-birthday-cake me-2"></i><strong>Data di nascita:</strong> <?php echo esc_html($client['birth_date']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($client['address'])): ?>
                                <p><i class="fas fa-map-marker-alt me-2"></i><strong>Indirizzo:</strong> <?php echo esc_html($client['address']); ?></p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card appointment-card mb-4">
                        <div class="card-header">
                            <h5><i class="fas fa-calendar-alt me-2"></i>Prossimi appuntamenti</h5>
                        </div>
                        <div class="card-body">
                            <?php if (!empty($client['appointments'])): ?>
                                <?php foreach ($client['appointments'] as $appointment): ?>
                                    <div class="appointment-item p-3 mb-2 bg-light rounded">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h6 class="mb-1"><?php echo esc_html($appointment['type']); ?></h6>
                                                <small class="text-muted">
                                                    <i class="fas fa-calendar me-1"></i><?php echo esc_html($appointment['date']); ?> 
                                                    <i class="fas fa-clock ms-2 me-1"></i><?php echo esc_html($appointment['time']); ?>
                                                </small>
                                            </div>
                                            <span class="badge bg-<?php echo $appointment['status'] === 'confermato' ? 'success' : 'warning'; ?>">
                                                <?php echo ucfirst($appointment['status']); ?>
                                            </span>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <p class="text-muted">Nessun appuntamento in programma</p>
                                <a href="tel:<?php echo esc_attr($professional['settings']['contact_phone']); ?>" class="btn btn-primary btn-sm">
                                    <i class="fas fa-phone me-1"></i>Prenota Appuntamento
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card studio-card">
                <div class="card-header" style="background-color: <?php echo esc_attr($professional['settings']['primary_color']); ?>; color: white;">
                    <h5><i class="fas fa-clinic-medical me-2"></i>Contatti Studio</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6><strong><?php echo esc_html($professional['settings']['studio_name']); ?></strong></h6>
                            <p class="mb-1"><i class="fas fa-envelope me-2"></i><?php echo esc_html($professional['email']); ?></p>
                            <p class="mb-1"><i class="fas fa-phone me-2"></i><?php echo esc_html($professional['settings']['contact_phone']); ?></p>
                            <?php if (!empty($professional['settings']['website'])): ?>
                                <p class="mb-1"><i class="fas fa-globe me-2"></i><?php echo esc_html($professional['settings']['website']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($professional['settings']['instagram_handle'])): ?>
                                <p class="mb-0"><i class="fab fa-instagram me-2"></i><?php echo esc_html($professional['settings']['instagram_handle']); ?></p>
                            <?php endif; ?>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="d-grid gap-2">
                                <a href="tel:<?php echo esc_attr($professional['settings']['contact_phone']); ?>" class="btn btn-success">
                                    <i class="fas fa-phone me-1"></i>Chiama
                                </a>
                                <a href="mailto:<?php echo esc_attr($professional['email']); ?>" class="btn btn-primary">
                                    <i class="fas fa-envelope me-1"></i>Email
                                </a>
                                <?php if (!empty($professional['settings']['website'])): ?>
                                    <a href="https://<?php echo esc_attr($professional['settings']['website']); ?>" target="_blank" class="btn btn-info">
                                        <i class="fas fa-globe me-1"></i>Sito Web
                                    </a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <footer class="mt-5 py-4 bg-dark text-white text-center">
            <div class="container">
                <p class="mb-0">&copy; <?php echo date('Y'); ?> <?php echo esc_html($professional['settings']['studio_name']); ?></p>
                <small class="text-muted">Accesso: <?php echo date('d/m/Y H:i'); ?> | ID: <?php echo esc_html($client['qr_code']); ?></small>
            </div>
        </footer>
        
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
}

function gestionale_update_client_access($client_code) {
    $system = gestionale_get_system_data();
    if (!$system) return;
    
    $updated = false;
    foreach ($system['professionals'] as &$prof) {
        foreach ($prof['clients'] as &$client) {
            if ($client['qr_code'] === $client_code) {
                $client['last_access'] = date('c');
                $client['access_count'] = ($client['access_count'] ?? 0) + 1;
                $updated = true;
                break 2;
            }
        }
    }
    
    if ($updated) {
        $upload_dir = wp_upload_dir();
        $system_file = $upload_dir['basedir'] . '/gestionale-data/complete-system.json';
        file_put_contents($system_file, json_encode($system, JSON_PRETTY_PRINT));
    }
}

function gestionale_display_system_admin() {
    $system = gestionale_get_system_data();
    
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Amministrazione Sistema | Gestionale Sanitario</title>
        <?php wp_head(); ?>
    </head>
    <body>
        <div class="container mt-5">
            <h1><i class="fas fa-cogs me-2"></i>Amministrazione Sistema Completo</h1>
            
            <div class="row mt-4">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-primary"><?php echo count($system['professionals']); ?></h3>
                            <p class="mb-0">Professionisti Attivi</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-success">
                                <?php 
                                echo array_sum(array_map(function($p) { 
                                    return count($p['clients']); 
                                }, $system['professionals'])); 
                                ?>
                            </h3>
                            <p class="mb-0">Clienti Totali</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-info"><?php echo $system['system_info']['version']; ?></h3>
                            <p class="mb-0">Versione Sistema</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mt-4">
                <div class="card-header">
                    <h5><i class="fas fa-users me-2"></i>Professionisti Registrati</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Licenza</th>
                                    <th>Clienti</th>
                                    <th>Studio</th>
                                    <th>Accesso Dashboard</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($system['professionals'] as $prof): ?>
                                    <tr>
                                        <td><?php echo $prof['id']; ?></td>
                                        <td><strong><?php echo esc_html($prof['username']); ?></strong></td>
                                        <td><?php echo esc_html($prof['email']); ?></td>
                                        <td>
                                            <span class="badge bg-<?php echo $prof['license']['type'] === 'business' ? 'success' : ($prof['license']['type'] === 'pro' ? 'primary' : 'warning'); ?>">
                                                <?php echo strtoupper($prof['license']['type']); ?>
                                            </span>
                                        </td>
                                        <td><?php echo count($prof['clients']); ?></td>
                                        <td><?php echo esc_html($prof['settings']['studio_name']); ?></td>
                                        <td>
                                            <a href="<?php echo home_url('/gestionale/' . $prof['id']); ?>" target="_blank" class="btn btn-sm btn-outline-primary">
                                                <i class="fas fa-external-link-alt"></i> Apri Dashboard
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="card mt-4">
                <div class="card-header">
                    <h5><i class="fas fa-qrcode me-2"></i>Test Clienti QR</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <?php foreach ($system['professionals'] as $prof): ?>
                            <?php if (!empty($prof['clients'])): ?>
                                <?php foreach (array_slice($prof['clients'], 0, 2) as $client): ?>
                                    <div class="col-md-6 mb-3">
                                        <div class="card">
                                            <div class="card-body">
                                                <h6><?php echo esc_html($client['name']); ?></h6>
                                                <p class="text-muted mb-1">Studio: <?php echo esc_html($prof['settings']['studio_name']); ?></p>
                                                <p class="text-muted mb-2">QR: <code><?php echo esc_html($client['qr_code']); ?></code></p>
                                                <a href="<?php echo home_url('/cliente/' . $client['qr_code']); ?>" target="_blank" class="btn btn-sm btn-primary">
                                                    <i class="fas fa-external-link-alt me-1"></i>Test Area Cliente
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
        
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
}

function gestionale_display_not_found() {
    ?>
    <!DOCTYPE html>
    <html <?php language_attributes(); ?>>
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Accesso non valido | Gestionale Sanitario</title>
        <?php wp_head(); ?>
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
                            <p class="text-muted">Contatta il tuo professionista di riferimento per assistenza.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
}

// Add admin menu
add_action('admin_menu', 'gestionale_admin_menu_complete');

function gestionale_admin_menu_complete() {
    add_menu_page(
        'Gestionale Completo',
        'Gestionale',
        'manage_options',
        'gestionale-completo',
        'gestionale_admin_page_complete',
        'dashicons-stethoscope',
        30
    );
}

function gestionale_admin_page_complete() {
    $system = gestionale_get_system_data();
    
    if (!$system) {
        echo '<div class="wrap"><h1>Gestionale non configurato</h1><p>Impossibile caricare i dati del sistema.</p></div>';
        return;
    }
    
    ?>
    <div class="wrap">
        <h1><i class="fas fa-stethoscope"></i> Gestionale Sanitario Completo</h1>
        
        <div class="gestionale-stats">
            <div class="stat-box">
                <h3><?php echo count($system['professionals']); ?></h3>
                <p>Professionisti</p>
            </div>
            <div class="stat-box">
                <h3><?php echo array_sum(array_map(function($p) { return count($p['clients']); }, $system['professionals'])); ?></h3>
                <p>Clienti Totali</p>
            </div>
            <div class="stat-box">
                <h3><?php echo $system['system_info']['version']; ?></h3>
                <p>Versione</p>
            </div>
        </div>
        
        <div class="gestionale-actions">
            <a href="<?php echo home_url('/gestionale-admin'); ?>" target="_blank" class="button button-primary">
                <i class="fas fa-external-link-alt"></i> Apri Amministrazione Completa
            </a>
        </div>
        
        <h2>Professionisti nel Sistema</h2>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Licenza</th>
                    <th>Clienti</th>
                    <th>Studio</th>
                    <th>URL Dashboard</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($system['professionals'] as $prof): ?>
                    <tr>
                        <td><strong><?php echo esc_html($prof['username']); ?></strong></td>
                        <td><?php echo esc_html($prof['email']); ?></td>
                        <td><?php echo strtoupper($prof['license']['type']); ?></td>
                        <td><?php echo count($prof['clients']); ?></td>
                        <td><?php echo esc_html($prof['settings']['studio_name']); ?></td>
                        <td>
                            <a href="<?php echo home_url('/gestionale/' . $prof['id']); ?>" target="_blank">
                                <?php echo home_url('/gestionale/' . $prof['id']); ?>
                            </a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <div class="card mt-4" style="border: 1px solid #ccd0d4; background: #fff;">
            <div class="card-body" style="padding: 20px;">
                <h3>Test Clienti QR - Accesso Immediato</h3>
                <div class="row">
                    <?php foreach ($system['professionals'] as $prof): ?>
                        <?php if (!empty($prof['clients'])): ?>
                            <?php foreach ($prof['clients'] as $client): ?>
                                <div class="col-md-4 mb-3">
                                    <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
                                        <h5><?php echo esc_html($client['name']); ?></h5>
                                        <p>Studio: <?php echo esc_html($prof['settings']['studio_name']); ?></p>
                                        <p>QR: <code><?php echo esc_html($client['qr_code']); ?></code></p>
                                        <a href="<?php echo home_url('/cliente/' . $client['qr_code']); ?>" target="_blank" class="button button-secondary">
                                            Test Area Cliente
                                        </a>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
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
    .row {
        display: flex;
        flex-wrap: wrap;
        margin: -10px;
    }
    .col-md-4 {
        flex: 0 0 33.333333%;
        padding: 10px;
    }
    </style>
    <?php
}

// Helper function to get current URL
function current_url() {
    return (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
}
?>
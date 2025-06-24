<?php
/**
 * Gestionale Sanitario Standalone
 * Sistema completo multi-tenant senza dipendenze WordPress
 * Può essere installato su qualsiasi hosting con PHP
 */

session_start();

// Configurazione
define('GESTIONALE_VERSION', '2.0.0');
define('DATA_FILE', 'gestionale-data.json');

// Carica dati sistema
function loadSystemData() {
    if (file_exists(DATA_FILE)) {
        return json_decode(file_get_contents(DATA_FILE), true);
    }
    return getDefaultSystemData();
}

// Salva dati sistema
function saveSystemData($data) {
    file_put_contents(DATA_FILE, json_encode($data, JSON_PRETTY_PRINT));
}

// Dati di default del sistema
function getDefaultSystemData() {
    return [
        "system_info" => [
            "version" => "2.0.0",
            "export_date" => date('c'),
            "source" => "replit_migration_standalone",
            "total_professionals" => 3,
            "total_clients" => 4
        ],
        "professionals" => [
            [
                "id" => 3,
                "username" => "zambelli.andrea.1973@gmail.com",
                "email" => "zambelli.andrea.1973@gmail.com",
                "role" => "admin",
                "license" => [
                    "code" => "0103 1973 2009 1979",
                    "type" => "passepartout",
                    "is_active" => true,
                    "expires_at" => null
                ],
                "settings" => [
                    "studio_name" => "Studio Andrea Zambelli",
                    "contact_phone" => "+393472550110",
                    "contact_phone2" => "",
                    "address" => "Via Cavallotti, 6",
                    "website" => "",
                    "instagram_handle" => "Biomedicinaintegrata",
                    "primary_color" => "#006400",
                    "secondary_color" => "#ffffff",
                    "theme" => "professional"
                ],
                "clients" => [
                    [
                        "id" => "PROF_003_0003_CLIENT_1_0001",
                        "name" => "Mario Rossi",
                        "email" => "mario.rossi@esempio.it",
                        "phone" => "3201234567",
                        "birth_date" => "",
                        "qr_code" => "PROF_003_0003_CLIENT_1_0001",
                        "created_date" => "2025-04-02T16:08:04.062Z",
                        "last_access" => null,
                        "access_count" => 0,
                        "active" => true
                    ],
                    [
                        "id" => "PROF_003_0003_CLIENT_2_0002",
                        "name" => "Zambelli Andrea",
                        "email" => "zambelli.andrea.1973@gmail.com",
                        "phone" => "3472550110",
                        "birth_date" => "2025-04-24",
                        "qr_code" => "PROF_003_0003_CLIENT_2_0002",
                        "created_date" => "2025-04-02T16:43:36.683Z",
                        "last_access" => null,
                        "access_count" => 0,
                        "active" => true
                    ]
                ]
            ],
            [
                "id" => 14,
                "username" => "busnari.silvia@libero.it",
                "email" => "busnari.silvia@libero.it",
                "role" => "staff",
                "license" => [
                    "code" => "STAFF-12345678",
                    "type" => "staff_free",
                    "is_active" => true,
                    "expires_at" => "2035-05-09T06:10:12.859Z"
                ],
                "settings" => [
                    "studio_name" => "Studio di Biomedicina Integrata",
                    "contact_phone" => "+39 3471445767",
                    "contact_phone2" => "+39 123 456 7890",
                    "website" => "biomedicinaintegrata.it",
                    "instagram_handle" => "biomedicinaintegrata",
                    "primary_color" => "#28a745",
                    "secondary_color" => "#20c997"
                ],
                "clients" => []
            ],
            [
                "id" => 16,
                "username" => "faverioelisa6@gmail.com",
                "email" => "faverioelisa6@gmail.com",
                "role" => "staff",
                "license" => [
                    "code" => "BASE-16-12345678",
                    "type" => "base",
                    "is_active" => true,
                    "expires_at" => "2026-05-09T08:27:44.469Z"
                ],
                "settings" => [
                    "studio_name" => "Studio Elisa Faverio",
                    "contact_phone" => "",
                    "website" => "",
                    "primary_color" => "#3f51b5",
                    "secondary_color" => "#ffffff"
                ],
                "clients" => []
            ]
        ]
    ];
}

// Autenticazione
function authenticateProfessional($username, $password) {
    $system = loadSystemData();
    foreach ($system['professionals'] as $prof) {
        if ($prof['username'] === $username || $prof['email'] === $username) {
            if ($password === 'gestionale2024!') {
                return $prof;
            }
        }
    }
    return false;
}

// Trova cliente per QR code
function findClientByQR($qr_code) {
    $system = loadSystemData();
    foreach ($system['professionals'] as $prof) {
        foreach ($prof['clients'] as $client) {
            if ($client['qr_code'] === $qr_code) {
                return ['client' => $client, 'professional' => $prof];
            }
        }
    }
    return null;
}

// Aggiorna accesso cliente
function updateClientAccess($qr_code) {
    $system = loadSystemData();
    $updated = false;
    
    foreach ($system['professionals'] as &$prof) {
        foreach ($prof['clients'] as &$client) {
            if ($client['qr_code'] === $qr_code) {
                $client['last_access'] = date('c');
                $client['access_count'] = ($client['access_count'] ?? 0) + 1;
                $updated = true;
                break 2;
            }
        }
    }
    
    if ($updated) {
        saveSystemData($system);
    }
}

// Routing
$request_uri = $_SERVER['REQUEST_URI'];
$base_url = dirname($_SERVER['SCRIPT_NAME']);
$path = str_replace($base_url, '', $request_uri);
$path = trim($path, '/');

// Gestisci logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ' . $_SERVER['SCRIPT_NAME']);
    exit;
}

// Gestisci login
if (isset($_POST['login'])) {
    $professional = authenticateProfessional($_POST['username'], $_POST['password']);
    if ($professional) {
        $_SESSION['professional_id'] = $professional['id'];
        $_SESSION['professional_data'] = $professional;
        header('Location: ' . $_SERVER['SCRIPT_NAME'] . '?dashboard=' . $professional['id']);
        exit;
    } else {
        $login_error = 'Credenziali non valide';
    }
}

// Routing principale
if (isset($_GET['dashboard'])) {
    $prof_id = (int)$_GET['dashboard'];
    if (isset($_SESSION['professional_id']) && $_SESSION['professional_id'] == $prof_id) {
        showProfessionalDashboard($_SESSION['professional_data']);
    } else {
        showLoginForm($prof_id, isset($login_error) ? $login_error : null);
    }
} elseif (isset($_GET['client'])) {
    $qr_code = $_GET['client'];
    $result = findClientByQR($qr_code);
    if ($result) {
        updateClientAccess($qr_code);
        showClientArea($result['client'], $result['professional']);
    } else {
        showNotFound();
    }
} elseif (isset($_GET['admin'])) {
    showSystemAdmin();
} else {
    showHomePage();
}

// Pagina principale
function showHomePage() {
    $system = loadSystemData();
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gestionale Sanitario Standalone</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            body { background: linear-gradient(135deg, #28a745, #20c997); min-height: 100vh; }
            .hero-card { margin-top: 100px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="card hero-card">
                        <div class="card-header bg-success text-white text-center">
                            <h1><i class="fas fa-stethoscope me-2"></i>Gestionale Sanitario</h1>
                            <p class="mb-0">Sistema Multi-Tenant Standalone</p>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4 text-center mb-3">
                                    <h3 class="text-primary"><?php echo count($system['professionals']); ?></h3>
                                    <p>Professionisti</p>
                                </div>
                                <div class="col-md-4 text-center mb-3">
                                    <h3 class="text-success">
                                        <?php echo array_sum(array_map(function($p) { return count($p['clients']); }, $system['professionals'])); ?>
                                    </h3>
                                    <p>Clienti Totali</p>
                                </div>
                                <div class="col-md-4 text-center mb-3">
                                    <h3 class="text-info"><?php echo $system['system_info']['version']; ?></h3>
                                    <p>Versione</p>
                                </div>
                            </div>
                            
                            <h5 class="mt-4">Accesso Professionisti:</h5>
                            <div class="list-group">
                                <?php foreach ($system['professionals'] as $prof): ?>
                                    <a href="?dashboard=<?php echo $prof['id']; ?>" class="list-group-item list-group-item-action">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1"><?php echo htmlspecialchars($prof['settings']['studio_name']); ?></h6>
                                            <span class="badge bg-<?php echo $prof['license']['type'] === 'passepartout' ? 'success' : 'primary'; ?>">
                                                <?php echo strtoupper($prof['license']['type']); ?>
                                            </span>
                                        </div>
                                        <p class="mb-1"><?php echo htmlspecialchars($prof['username']); ?></p>
                                        <small>Clienti: <?php echo count($prof['clients']); ?></small>
                                    </a>
                                <?php endforeach; ?>
                            </div>
                            
                            <div class="mt-4">
                                <h5>Test Clienti QR:</h5>
                                <div class="row">
                                    <?php foreach ($system['professionals'] as $prof): ?>
                                        <?php foreach ($prof['clients'] as $client): ?>
                                            <div class="col-md-6 mb-2">
                                                <a href="?client=<?php echo $client['qr_code']; ?>" class="btn btn-outline-primary btn-sm w-100">
                                                    <i class="fas fa-user me-1"></i><?php echo htmlspecialchars($client['name']); ?>
                                                </a>
                                            </div>
                                        <?php endforeach; ?>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                            
                            <div class="mt-4 text-center">
                                <a href="?admin=1" class="btn btn-warning">
                                    <i class="fas fa-cogs me-1"></i>Amministrazione Sistema
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card mt-4">
                        <div class="card-body">
                            <h6>Credenziali Test:</h6>
                            <p><strong>Password universale:</strong> <code>gestionale2024!</code></p>
                            <p><strong>Username:</strong> Email del professionista</p>
                            <p><strong>URL base:</strong> <code><?php echo getCurrentUrl(); ?></code></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
}

// Login form
function showLoginForm($prof_id, $error = null) {
    $system = loadSystemData();
    $professional = null;
    
    foreach ($system['professionals'] as $p) {
        if ($p['id'] == $prof_id) {
            $professional = $p;
            break;
        }
    }
    
    if (!$professional) {
        echo '<h1>Professionista non trovato</h1>';
        return;
    }
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - <?php echo htmlspecialchars($professional['settings']['studio_name']); ?></title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            body { 
                background: linear-gradient(135deg, <?php echo $professional['settings']['primary_color']; ?>, <?php echo $professional['settings']['secondary_color']; ?>); 
                min-height: 100vh; 
            }
            .login-card { margin-top: 100px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card login-card">
                        <div class="card-header text-white" style="background-color: <?php echo $professional['settings']['primary_color']; ?>;">
                            <h3 class="mb-0"><?php echo htmlspecialchars($professional['settings']['studio_name']); ?></h3>
                            <small>Accesso Professionista</small>
                        </div>
                        <div class="card-body">
                            <?php if ($error): ?>
                                <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
                            <?php endif; ?>
                            
                            <form method="post">
                                <div class="mb-3">
                                    <label class="form-label">Username/Email:</label>
                                    <input type="text" name="username" class="form-control" value="<?php echo htmlspecialchars($professional['username']); ?>" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Password:</label>
                                    <input type="password" name="password" class="form-control" placeholder="gestionale2024!" required>
                                </div>
                                <button type="submit" name="login" class="btn btn-primary w-100">Accedi</button>
                            </form>
                            
                            <div class="mt-4 p-3 bg-light rounded">
                                <h6 class="text-muted">Info Sistema Test:</h6>
                                <small><strong>Password:</strong> gestionale2024!</small><br>
                                <small><strong>Licenza:</strong> <?php echo strtoupper($professional['license']['type']); ?></small><br>
                                <small><strong>Clienti:</strong> <?php echo count($professional['clients']); ?></small>
                            </div>
                            
                            <div class="mt-3 text-center">
                                <a href="?" class="btn btn-outline-secondary btn-sm">
                                    <i class="fas fa-arrow-left me-1"></i>Torna alla Home
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
}

// Dashboard professionista
function showProfessionalDashboard($professional) {
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - <?php echo htmlspecialchars($professional['settings']['studio_name']); ?></title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .dashboard-header { 
                background: linear-gradient(135deg, <?php echo $professional['settings']['primary_color']; ?>, <?php echo $professional['settings']['secondary_color']; ?>); 
                color: white; 
                padding: 2rem 0; 
            }
            .license-badge { 
                background: <?php echo $professional['license']['type'] === 'passepartout' ? '#28a745' : '#007bff'; ?>; 
                color: white; 
                padding: 0.25rem 0.75rem; 
                border-radius: 1rem; 
                font-size: 0.875rem; 
            }
        </style>
    </head>
    <body>
        <div class="dashboard-header">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col">
                        <h1><i class="fas fa-clinic-medical me-2"></i><?php echo htmlspecialchars($professional['settings']['studio_name']); ?></h1>
                        <p class="mb-0">
                            Dashboard Professionista - 
                            <span class="license-badge"><?php echo strtoupper($professional['license']['type']); ?></span>
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
                            <h3 class="text-primary"><?php echo count($professional['clients']); ?></h3>
                            <p class="mb-0">Clienti Totali</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-success"><?php echo count(array_filter($professional['clients'], function($c) { return $c['active']; })); ?></h3>
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
                            <h3 class="text-warning"><?php echo GESTIONALE_VERSION; ?></h3>
                            <p class="mb-0">Versione</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-users me-2"></i>I tuoi Clienti</h5>
                        </div>
                        <div class="card-body">
                            <?php if (!empty($professional['clients'])): ?>
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
                                                    <td><strong><?php echo htmlspecialchars($client['name']); ?></strong></td>
                                                    <td><?php echo htmlspecialchars($client['email']); ?></td>
                                                    <td><?php echo htmlspecialchars($client['phone']); ?></td>
                                                    <td><code><?php echo htmlspecialchars($client['qr_code']); ?></code></td>
                                                    <td>
                                                        <a href="?client=<?php echo $client['qr_code']; ?>" target="_blank" class="btn btn-sm btn-outline-primary">
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
                                                            <a href="?client=<?php echo $client['qr_code']; ?>" target="_blank" class="btn btn-outline-primary">
                                                                <i class="fas fa-eye"></i>
                                                            </a>
                                                            <button class="btn btn-outline-secondary" onclick="generateQR('<?php echo $client['qr_code']; ?>')">
                                                                <i class="fas fa-qrcode"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php else: ?>
                                <div class="text-center py-5">
                                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                                    <h5 class="text-muted">Nessun cliente registrato</h5>
                                    <p class="text-muted">Aggiungi il primo cliente per iniziare.</p>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h6>URL di accesso per questo sistema:</h6>
                            <p><strong>Dashboard:</strong> <code><?php echo getCurrentUrl() . '?dashboard=' . $professional['id']; ?></code></p>
                            <?php foreach ($professional['clients'] as $client): ?>
                                <p><strong><?php echo htmlspecialchars($client['name']); ?>:</strong> <code><?php echo getCurrentUrl() . '?client=' . $client['qr_code']; ?></code></p>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
        function generateQR(clientCode) {
            const url = '<?php echo getCurrentUrl(); ?>?client=' + clientCode;
            window.open('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url), '_blank');
        }
        </script>
    </body>
    </html>
    <?php
}

// Area cliente
function showClientArea($client, $professional) {
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Area Cliente - <?php echo htmlspecialchars($client['name']); ?> | <?php echo htmlspecialchars($professional['settings']['studio_name']); ?></title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .client-header { 
                background: linear-gradient(135deg, <?php echo $professional['settings']['primary_color']; ?>, <?php echo $professional['settings']['secondary_color']; ?>); 
                color: white; 
                padding: 2rem 0; 
            }
            .contact-card { border-left: 4px solid <?php echo $professional['settings']['primary_color']; ?>; }
            .studio-card { border-left: 4px solid #6f42c1; }
        </style>
    </head>
    <body>
        <div class="client-header">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col">
                        <h1><i class="fas fa-user-circle me-2"></i>Benvenuto <?php echo htmlspecialchars($client['name']); ?></h1>
                        <p class="mb-0"><?php echo htmlspecialchars($professional['settings']['studio_name']); ?> - Area Cliente Personale</p>
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
                            <p><i class="fas fa-user me-2"></i><strong>Nome:</strong> <?php echo htmlspecialchars($client['name']); ?></p>
                            <p><i class="fas fa-envelope me-2"></i><strong>Email:</strong> <?php echo htmlspecialchars($client['email']); ?></p>
                            <p><i class="fas fa-phone me-2"></i><strong>Telefono:</strong> <?php echo htmlspecialchars($client['phone']); ?></p>
                            <?php if (!empty($client['birth_date'])): ?>
                                <p><i class="fas fa-birthday-cake me-2"></i><strong>Data di nascita:</strong> <?php echo htmlspecialchars($client['birth_date']); ?></p>
                            <?php endif; ?>
                            <p><i class="fas fa-qrcode me-2"></i><strong>Codice ID:</strong> <code><?php echo htmlspecialchars($client['qr_code']); ?></code></p>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card mb-4" style="border-left: 4px solid #28a745;">
                        <div class="card-header">
                            <h5><i class="fas fa-calendar-alt me-2"></i>Prossimi appuntamenti</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Nessun appuntamento in programma</p>
                            <a href="tel:<?php echo $professional['settings']['contact_phone']; ?>" class="btn btn-primary btn-sm">
                                <i class="fas fa-phone me-1"></i>Prenota Appuntamento
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card studio-card">
                <div class="card-header" style="background-color: <?php echo $professional['settings']['primary_color']; ?>; color: white;">
                    <h5><i class="fas fa-clinic-medical me-2"></i>Contatti Studio</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6><strong><?php echo htmlspecialchars($professional['settings']['studio_name']); ?></strong></h6>
                            <p class="mb-1"><i class="fas fa-envelope me-2"></i><?php echo htmlspecialchars($professional['email']); ?></p>
                            <p class="mb-1"><i class="fas fa-phone me-2"></i><?php echo htmlspecialchars($professional['settings']['contact_phone']); ?></p>
                            <?php if (!empty($professional['settings']['website'])): ?>
                                <p class="mb-1"><i class="fas fa-globe me-2"></i><?php echo htmlspecialchars($professional['settings']['website']); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($professional['settings']['instagram_handle'])): ?>
                                <p class="mb-0"><i class="fab fa-instagram me-2"></i><?php echo htmlspecialchars($professional['settings']['instagram_handle']); ?></p>
                            <?php endif; ?>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="d-grid gap-2">
                                <a href="tel:<?php echo $professional['settings']['contact_phone']; ?>" class="btn btn-success">
                                    <i class="fas fa-phone me-1"></i>Chiama
                                </a>
                                <a href="mailto:<?php echo $professional['email']; ?>" class="btn btn-primary">
                                    <i class="fas fa-envelope me-1"></i>Email
                                </a>
                                <?php if (!empty($professional['settings']['website'])): ?>
                                    <a href="https://<?php echo $professional['settings']['website']; ?>" target="_blank" class="btn btn-info">
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
                <p class="mb-0">&copy; <?php echo date('Y'); ?> <?php echo htmlspecialchars($professional['settings']['studio_name']); ?></p>
                <small class="text-muted">
                    Accesso: <?php echo date('d/m/Y H:i'); ?> | 
                    Visite: <?php echo $client['access_count']; ?> | 
                    ID: <?php echo htmlspecialchars($client['qr_code']); ?>
                </small>
            </div>
        </footer>
    </body>
    </html>
    <?php
}

// Amministrazione sistema
function showSystemAdmin() {
    $system = loadSystemData();
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Amministrazione Sistema | Gestionale Sanitario</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    </head>
    <body>
        <div class="container mt-5">
            <h1><i class="fas fa-cogs me-2"></i>Amministrazione Sistema Standalone</h1>
            
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
                                <?php echo array_sum(array_map(function($p) { return count($p['clients']); }, $system['professionals'])); ?>
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
                                    <th>Dashboard</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($system['professionals'] as $prof): ?>
                                    <tr>
                                        <td><?php echo $prof['id']; ?></td>
                                        <td><strong><?php echo htmlspecialchars($prof['username']); ?></strong></td>
                                        <td><?php echo htmlspecialchars($prof['email']); ?></td>
                                        <td>
                                            <span class="badge bg-<?php echo $prof['license']['type'] === 'passepartout' ? 'success' : 'primary'; ?>">
                                                <?php echo strtoupper($prof['license']['type']); ?>
                                            </span>
                                        </td>
                                        <td><?php echo count($prof['clients']); ?></td>
                                        <td><?php echo htmlspecialchars($prof['settings']['studio_name']); ?></td>
                                        <td>
                                            <a href="?dashboard=<?php echo $prof['id']; ?>" target="_blank" class="btn btn-sm btn-outline-primary">
                                                <i class="fas fa-external-link-alt"></i> Apri
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-link me-2"></i>URL Complete Sistema</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>URL Base:</strong> <code><?php echo getCurrentUrl(); ?></code></p>
                            
                            <h6>Dashboard Professionisti:</h6>
                            <?php foreach ($system['professionals'] as $prof): ?>
                                <p><strong><?php echo htmlspecialchars($prof['settings']['studio_name']); ?>:</strong> 
                                <code><?php echo getCurrentUrl() . '?dashboard=' . $prof['id']; ?></code></p>
                            <?php endforeach; ?>
                            
                            <h6 class="mt-3">Aree Clienti:</h6>
                            <?php foreach ($system['professionals'] as $prof): ?>
                                <?php foreach ($prof['clients'] as $client): ?>
                                    <p><strong><?php echo htmlspecialchars($client['name']); ?>:</strong> 
                                    <code><?php echo getCurrentUrl() . '?client=' . $client['qr_code']; ?></code></p>
                                <?php endforeach; ?>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 text-center">
                <a href="?" class="btn btn-secondary">
                    <i class="fas fa-home me-1"></i>Torna alla Home
                </a>
            </div>
        </div>
    </body>
    </html>
    <?php
}

// Cliente non trovato
function showNotFound() {
    ?>
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cliente non trovato | Gestionale Sanitario</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card border-danger">
                        <div class="card-header bg-danger text-white text-center">
                            <h4><i class="fas fa-exclamation-triangle me-2"></i>Cliente Non Trovato</h4>
                        </div>
                        <div class="card-body text-center">
                            <p>Il codice QR fornito non è valido o il cliente non esiste nel sistema.</p>
                            <p class="text-muted">Contatta il tuo professionista di riferimento per assistenza.</p>
                            <a href="?" class="btn btn-primary">
                                <i class="fas fa-home me-1"></i>Torna alla Home
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

// Utility per URL corrente
function getCurrentUrl() {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $script = $_SERVER['SCRIPT_NAME'];
    return $protocol . '://' . $host . $script;
}
?>
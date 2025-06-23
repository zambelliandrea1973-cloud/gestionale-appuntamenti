<?php
// Direct file creation without WordPress interference
if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

// Prevent WordPress from loading
if (!defined('SHORTINIT')) {
    define('SHORTINIT', true);
}

// Create gestionale system directly
$install_dir = __DIR__ . '/gestionale';

if (isset($_POST['create_gestionale'])) {
    $results = [];
    
    // Create directory
    if (!file_exists($install_dir)) {
        if (mkdir($install_dir, 0755, true)) {
            $results[] = "Directory created: gestionale";
        } else {
            $results[] = "ERROR: Could not create directory";
            exit(json_encode($results));
        }
    }
    
    // Create index.php
    $index_content = '<?php
session_start();
if (!isset($_SESSION["admin_logged"])) {
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
                <a class="nav-link" href="clients.php">Clienti</a>
                <a class="nav-link" href="qr-generator.php">QR Code</a>
                <a class="nav-link" href="logout.php">Logout</a>
            </div>
        </div>
    </nav>
    
    <div class="container mt-4">
        <h1>Dashboard Gestionale Sanitario</h1>
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Sistema Attivo</h5>
                        <p class="card-text">Gestionale sanitario con accesso QR per clienti</p>
                        <a href="clients.php" class="btn btn-primary">Gestione Clienti</a>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Accesso Clienti</h5>
                        <p class="card-text">I clienti accedono tramite QR code personalizzati</p>
                        <a href="qr-generator.php" class="btn btn-success">Genera QR</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>';
    
    if (file_put_contents($install_dir . '/index.php', $index_content)) {
        $results[] = "Created: index.php";
    }
    
    // Create login.php
    $login_content = '<?php
session_start();

// Simple file-based authentication
if (isset($_POST["login"])) {
    $email = $_POST["email"];
    $password = $_POST["password"];
    
    // Default credentials
    if ($email === "busnari.silvia@libero.it" && $password === "gestionale2024!") {
        $_SESSION["admin_logged"] = true;
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
</head>
<body class="bg-light">
    <div class="container">
        <div class="row justify-content-center mt-5">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h3>Accesso Gestionale Sanitario</h3>
                    </div>
                    <div class="card-body">
                        <?php if (isset($error)): ?>
                            <div class="alert alert-danger"><?php echo $error; ?></div>
                        <?php endif; ?>
                        
                        <form method="post">
                            <div class="mb-3">
                                <label>Email:</label>
                                <input type="email" name="email" class="form-control" value="busnari.silvia@libero.it" required>
                            </div>
                            <div class="mb-3">
                                <label>Password:</label>
                                <input type="password" name="password" class="form-control" required>
                            </div>
                            <button type="submit" name="login" class="btn btn-primary w-100">Accedi</button>
                        </form>
                        
                        <div class="mt-3 text-muted small">
                            <strong>Credenziali di accesso:</strong><br>
                            Email: busnari.silvia@libero.it<br>
                            Password: gestionale2024!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>';
    
    if (file_put_contents($install_dir . '/login.php', $login_content)) {
        $results[] = "Created: login.php";
    }
    
    // Create client-access.php for QR code access
    $client_access = '<?php
// Accesso clienti tramite QR code
$client_code = $_GET["code"] ?? "";

// Dati clienti di esempio (in produzione salvati su file JSON)
$clients_data = [
    "CLI001" => [
        "name" => "Mario Rossi",
        "email" => "mario.rossi@email.com",
        "phone" => "+39 123 456 7890",
        "appointments" => [
            "2024-01-15 10:00" => "Visita controllo",
            "2024-02-20 14:30" => "Consulenza"
        ]
    ],
    "CLI002" => [
        "name" => "Anna Verdi", 
        "email" => "anna.verdi@email.com",
        "phone" => "+39 098 765 4321",
        "appointments" => [
            "2024-01-20 09:00" => "Prima visita"
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
    </head>
    <body>
        <div class="container mt-4">
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h3>Benvenuto <?php echo htmlspecialchars($client["name"]); ?></h3>
                        </div>
                        <div class="card-body">
                            <h5>I tuoi dati</h5>
                            <p><strong>Email:</strong> <?php echo htmlspecialchars($client["email"]); ?></p>
                            <p><strong>Telefono:</strong> <?php echo htmlspecialchars($client["phone"]); ?></p>
                            
                            <h5 class="mt-4">Prossimi appuntamenti</h5>
                            <?php if (!empty($client["appointments"])): ?>
                                <div class="list-group">
                                    <?php foreach ($client["appointments"] as $datetime => $description): ?>
                                        <div class="list-group-item">
                                            <strong><?php echo $datetime; ?></strong><br>
                                            <?php echo htmlspecialchars($description); ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php else: ?>
                                <p>Nessun appuntamento in programma</p>
                            <?php endif; ?>
                            
                            <div class="mt-4">
                                <h6>Contatti Studio</h6>
                                <p>
                                    <strong>Dr.ssa Silvia Busnari</strong><br>
                                    Email: busnari.silvia@libero.it<br>
                                    Telefono: +39 3471445767<br>
                                    Sito: biomedicinaintegrata.it
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    <body>
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="alert alert-danger text-center">
                        <h4>Codice non valido</h4>
                        <p>Il codice QR fornito non è valido o è scaduto.</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
}
?>';
    
    if (file_put_contents($install_dir . '/client-access.php', $client_access)) {
        $results[] = "Created: client-access.php";
    }
    
    // Create logout.php
    $logout_content = '<?php
session_start();
session_destroy();
header("Location: login.php");
exit;
?>';
    
    if (file_put_contents($install_dir . '/logout.php', $logout_content)) {
        $results[] = "Created: logout.php";
    }
    
    $results[] = "SUCCESS: Gestionale installed!";
    $results[] = "Access URL: https://biomedicinaintegrata.it/gestionale/login.php";
    $results[] = "Username: busnari.silvia@libero.it";
    $results[] = "Password: gestionale2024!";
    $results[] = "QR Test: https://biomedicinaintegrata.it/gestionale/client-access.php?code=CLI001";
    
    echo json_encode($results);
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Gestionale Installer</title>
    <style>
        body { font-family: Arial; padding: 50px; background: #f0f0f0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        .btn { padding: 15px 30px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer; }
        .result { margin-top: 20px; padding: 10px; background: #e8f5e8; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Gestionale Sanitario Installer</h1>
        <p>Questo installer crea un sistema gestionale file-based senza database MySQL.</p>
        
        <form method="post">
            <button type="submit" name="create_gestionale" class="btn">
                Installa Gestionale Sanitario
            </button>
        </form>
        
        <div id="result"></div>
        
        <script>
        document.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            fetch('', {
                method: 'POST',
                body: new FormData(this),
                headers: {'X-Requested-With': 'XMLHttpRequest'}
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('result').innerHTML = 
                    '<div class="result">' + data.join('<br>') + '</div>';
            })
            .catch(error => {
                document.getElementById('result').innerHTML = 
                    '<div style="background:#ffe8e8;padding:10px;">Error: ' + error + '</div>';
            });
        });
        </script>
    </div>
</body>
</html>
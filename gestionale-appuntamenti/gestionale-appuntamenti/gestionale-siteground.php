<?php
/**
 * Gestionale Sanitario per SiteGround
 * Sistema completo con interfaccia utente integrata
 */

session_start();

// Configurazione
define('GESTIONALE_VERSION', '2.0.0');
define('DATA_FILE', 'gestionale-data.json');

// Dati di default del sistema
function getDefaultSystemData() {
    return [
        "professionals" => [
            [
                "id" => 3,
                "username" => "zambelli.andrea.1973@gmail.com",
                "email" => "zambelli.andrea.1973@gmail.com",
                "role" => "admin",
                "password" => password_hash("admin123", PASSWORD_DEFAULT),
                "settings" => [
                    "studio_name" => "Studio Andrea Zambelli",
                    "phone" => "+39 333 123 4567",
                    "address" => "Via Example 123, Milano"
                ]
            ],
            [
                "id" => 14,
                "username" => "busnari.silvia@libero.it",
                "email" => "busnari.silvia@libero.it",
                "role" => "staff",
                "password" => password_hash("staff123", PASSWORD_DEFAULT),
                "settings" => [
                    "studio_name" => "Studio Medico Silvia Busnari",
                    "phone" => "+39 3471445767",
                    "address" => "Via Risorgimento 459, Cardano al Campo"
                ]
            ],
            [
                "id" => 15,
                "username" => "elisa.faverio@gmail.com",
                "email" => "elisa.faverio@gmail.com",
                "role" => "staff",
                "password" => password_hash("staff123", PASSWORD_DEFAULT),
                "settings" => [
                    "studio_name" => "Studio Medico Elisa Faverio",
                    "phone" => "+39 333 987 6543",
                    "address" => "Via Roma 456, Varese"
                ]
            ]
        ],
        "clients" => [
            [
                "id" => 1,
                "professional_id" => 3,
                "name" => "Mario Rossi",
                "email" => "mario.rossi@email.com",
                "phone" => "+39 333 111 2222",
                "created_at" => date('Y-m-d H:i:s')
            ],
            [
                "id" => 2,
                "professional_id" => 14,
                "name" => "Laura Bianchi",
                "email" => "laura.bianchi@email.com",
                "phone" => "+39 333 333 4444",
                "created_at" => date('Y-m-d H:i:s')
            ]
        ],
        "appointments" => []
    ];
}

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

// Gestione login
function authenticateUser($email, $password) {
    $data = loadSystemData();
    foreach ($data['professionals'] as $prof) {
        if ($prof['email'] === $email && password_verify($password, $prof['password'])) {
            $_SESSION['user_id'] = $prof['id'];
            $_SESSION['user_email'] = $prof['email'];
            $_SESSION['user_role'] = $prof['role'];
            return $prof;
        }
    }
    return false;
}

// Verifica autenticazione
function isAuthenticated() {
    return isset($_SESSION['user_id']);
}

// Logout
function logout() {
    session_destroy();
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// Gestione richieste AJAX
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'login':
            $user = authenticateUser($input['email'], $input['password']);
            if ($user) {
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Credenziali non valide']);
            }
            break;
            
        case 'get_clients':
            if (!isAuthenticated()) {
                echo json_encode(['success' => false, 'message' => 'Non autenticato']);
                break;
            }
            
            $data = loadSystemData();
            $clients = array_filter($data['clients'], function($client) {
                return $client['professional_id'] == $_SESSION['user_id'];
            });
            echo json_encode(['success' => true, 'clients' => array_values($clients)]);
            break;
            
        case 'add_client':
            if (!isAuthenticated()) {
                echo json_encode(['success' => false, 'message' => 'Non autenticato']);
                break;
            }
            
            $data = loadSystemData();
            $newClient = [
                'id' => count($data['clients']) + 1,
                'professional_id' => $_SESSION['user_id'],
                'name' => $input['name'],
                'email' => $input['email'],
                'phone' => $input['phone'],
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $data['clients'][] = $newClient;
            saveSystemData($data);
            
            echo json_encode(['success' => true, 'client' => $newClient]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Azione non riconosciuta']);
    }
    exit;
}

// Gestione logout
if (isset($_GET['logout'])) {
    logout();
}

?><!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestionale Sanitario</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 1200px;
            min-height: 600px;
            overflow: hidden;
        }
        
        .login-form {
            padding: 40px;
            text-align: center;
        }
        
        .login-form h1 {
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .dashboard {
            padding: 40px;
        }
        
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e1e5e9;
        }
        
        .dashboard-header h1 {
            color: #333;
        }
        
        .clients-section {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        
        .clients-section h2 {
            color: #333;
            margin-bottom: 20px;
        }
        
        .client-list {
            display: grid;
            gap: 15px;
        }
        
        .client-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .client-info h3 {
            color: #333;
            margin-bottom: 5px;
        }
        
        .client-info p {
            color: #666;
            font-size: 14px;
        }
        
        .add-client-form {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 20px;
        }
        
        .add-client-form h3 {
            color: #333;
            margin-bottom: 20px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr auto;
            gap: 15px;
            align-items: end;
        }
        
        .error {
            color: #dc3545;
            margin-top: 10px;
            padding: 10px;
            background: #f8d7da;
            border-radius: 5px;
        }
        
        .success {
            color: #155724;
            margin-top: 10px;
            padding: 10px;
            background: #d4edda;
            border-radius: 5px;
        }
        
        .credentials-info {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .credentials-info h3 {
            color: #1976d2;
            margin-bottom: 15px;
        }
        
        .credentials-info ul {
            list-style: none;
        }
        
        .credentials-info li {
            padding: 5px 0;
            color: #333;
        }
        
        .credentials-info strong {
            color: #1976d2;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if (!isAuthenticated()): ?>
            <!-- Form di Login -->
            <div class="login-form">
                <h1>Gestionale Sanitario</h1>
                
                <div class="credentials-info">
                    <h3>Credenziali di Accesso</h3>
                    <ul>
                        <li><strong>Andrea Zambelli:</strong> zambelli.andrea.1973@gmail.com</li>
                        <li><strong>Silvia Busnari:</strong> busnari.silvia@libero.it</li>
                        <li><strong>Elisa Faverio:</strong> elisa.faverio@gmail.com</li>
                        <li><em>Password per tutti: staff123</em></li>
                    </ul>
                </div>
                
                <form id="loginForm">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn">Accedi</button>
                </form>
                
                <div id="loginMessage"></div>
            </div>
        <?php else: ?>
            <!-- Dashboard -->
            <div class="dashboard">
                <div class="dashboard-header">
                    <h1>Benvenuto nel Gestionale</h1>
                    <div>
                        <span>Utente: <?php echo htmlspecialchars($_SESSION['user_email']); ?></span>
                        <a href="?logout=1" class="btn" style="margin-left: 15px;">Logout</a>
                    </div>
                </div>
                
                <div class="add-client-form">
                    <h3>Aggiungi Nuovo Cliente</h3>
                    <form id="addClientForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="clientName">Nome Completo</label>
                                <input type="text" id="clientName" name="name" required>
                            </div>
                            <div class="form-group">
                                <label for="clientEmail">Email</label>
                                <input type="email" id="clientEmail" name="email" required>
                            </div>
                            <div class="form-group">
                                <label for="clientPhone">Telefono</label>
                                <input type="tel" id="clientPhone" name="phone" required>
                            </div>
                            <button type="submit" class="btn">Aggiungi</button>
                        </div>
                    </form>
                    <div id="clientMessage"></div>
                </div>
                
                <div class="clients-section">
                    <h2>I Tuoi Clienti</h2>
                    <div class="client-list" id="clientList">
                        <!-- I clienti verranno caricati qui -->
                    </div>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <script>
        // Funzione per fare richieste AJAX
        async function makeRequest(data) {
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(data)
                });
                return await response.json();
            } catch (error) {
                console.error('Errore:', error);
                return { success: false, message: 'Errore di connessione' };
            }
        }
        
        // Gestione login
        <?php if (!isAuthenticated()): ?>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const result = await makeRequest({
                action: 'login',
                email: email,
                password: password
            });
            
            const messageDiv = document.getElementById('loginMessage');
            
            if (result.success) {
                messageDiv.innerHTML = '<div class="success">Login effettuato con successo! Ricaricamento...</div>';
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                messageDiv.innerHTML = '<div class="error">' + result.message + '</div>';
            }
        });
        <?php endif; ?>
        
        // Gestione dashboard
        <?php if (isAuthenticated()): ?>
        // Carica clienti
        async function loadClients() {
            const result = await makeRequest({ action: 'get_clients' });
            
            if (result.success) {
                const clientList = document.getElementById('clientList');
                clientList.innerHTML = '';
                
                if (result.clients.length === 0) {
                    clientList.innerHTML = '<p>Nessun cliente trovato. Aggiungi il primo cliente!</p>';
                } else {
                    result.clients.forEach(client => {
                        const clientCard = document.createElement('div');
                        clientCard.className = 'client-card';
                        clientCard.innerHTML = `
                            <div class="client-info">
                                <h3>${client.name}</h3>
                                <p>Email: ${client.email}</p>
                                <p>Telefono: ${client.phone}</p>
                                <p>Aggiunto: ${new Date(client.created_at).toLocaleDateString('it-IT')}</p>
                            </div>
                        `;
                        clientList.appendChild(clientCard);
                    });
                }
            }
        }
        
        // Aggiungi cliente
        document.getElementById('addClientForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const clientData = {
                action: 'add_client',
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };
            
            const result = await makeRequest(clientData);
            const messageDiv = document.getElementById('clientMessage');
            
            if (result.success) {
                messageDiv.innerHTML = '<div class="success">Cliente aggiunto con successo!</div>';
                this.reset();
                loadClients();
            } else {
                messageDiv.innerHTML = '<div class="error">' + result.message + '</div>';
            }
        });
        
        // Carica clienti all'avvio
        loadClients();
        <?php endif; ?>
    </script>
</body>
</html>
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

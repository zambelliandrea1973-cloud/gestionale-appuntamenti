<?php
/**
 * Script di test per verificare le credenziali del database
 */

// Configurazioni da testare
$configs = [
    [
        'host' => 'localhost',
        'db' => 'dbv5hshva16sx',
        'user' => 'ug87lyqbcduwf',
        'pass' => ''
    ],
    [
        'host' => 'localhost',
        'db' => 'biomedicinaintegrata_db',
        'user' => 'ug87lyqbcduwf',
        'pass' => ''
    ],
    [
        'host' => 'localhost',
        'db' => 'dbv5hshva16sx',
        'user' => 'busnari_user',
        'pass' => ''
    ]
];

echo "<h2>Test Connessione Database</h2>";

foreach ($configs as $i => $config) {
    echo "<h3>Test " . ($i + 1) . ":</h3>";
    echo "Host: " . $config['host'] . "<br>";
    echo "Database: " . $config['db'] . "<br>";
    echo "Username: " . $config['user'] . "<br>";
    echo "Password: " . (empty($config['pass']) ? '(vuota)' : '(presente)') . "<br>";
    
    try {
        $pdo = new PDO(
            "mysql:host={$config['host']};dbname={$config['db']}", 
            $config['user'], 
            $config['pass']
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "<span style='color: green;'>✅ CONNESSIONE RIUSCITA!</span><br>";
        
        // Test creazione tabella
        $pdo->exec("CREATE TABLE IF NOT EXISTS test_table (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50))");
        echo "<span style='color: green;'>✅ Permessi di scrittura OK</span><br>";
        $pdo->exec("DROP TABLE test_table");
        
    } catch (PDOException $e) {
        echo "<span style='color: red;'>❌ ERRORE: " . $e->getMessage() . "</span><br>";
    }
    echo "<hr>";
}

// Verifica esistenza database
echo "<h3>Database disponibili:</h3>";
try {
    $pdo = new PDO("mysql:host=localhost", "ug87lyqbcduwf", "");
    $stmt = $pdo->query("SHOW DATABASES");
    $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($databases as $db) {
        if (strpos($db, 'biomedicinaintegrata') !== false || strpos($db, 'dbv5') !== false) {
            echo "<strong>" . $db . "</strong><br>";
        } else {
            echo $db . "<br>";
        }
    }
} catch (PDOException $e) {
    echo "Errore nel listare i database: " . $e->getMessage();
}
?>
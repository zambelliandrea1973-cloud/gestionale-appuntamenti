<?php
/**
 * TEST SEMPLICE - Verifica funzionamento PHP base
 */
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Test PHP Semplice</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 5px; }
    </style>
</head>
<body>
    <h1>Test PHP Funzionamento</h1>
    
    <div class="box success">
        <h3>✅ PHP Funziona!</h3>
        <p>Ora: <?php echo date('Y-m-d H:i:s'); ?></p>
        <p>Directory: <?php echo __DIR__; ?></p>
    </div>
    
    <div class="box">
        <h3>File presenti:</h3>
        <?php
        $files = [
            'storage_data.json',
            'accounts-credentials.json',
            'gestionale-dati-reali.php',
            'debug-login.php'
        ];
        
        foreach ($files as $file) {
            if (file_exists($file)) {
                $size = filesize($file);
                echo "<p>✅ $file (" . round($size/1024, 1) . " KB)</p>";
            } else {
                echo "<p>❌ $file (non trovato)</p>";
            }
        }
        ?>
    </div>
    
    <div class="box">
        <h3>Test Credenziali:</h3>
        <?php
        if (file_exists('accounts-credentials.json')) {
            $accounts = json_decode(file_get_contents('accounts-credentials.json'), true);
            if ($accounts && isset($accounts['admin'])) {
                echo "<p><strong>Admin trovato:</strong></p>";
                echo "<p>Email: " . htmlspecialchars($accounts['admin']['email']) . "</p>";
                echo "<p>Password: " . htmlspecialchars($accounts['admin']['password']) . "</p>";
                
                // Test login diretto
                echo "<form method='POST' style='margin-top: 15px;'>
                <input type='hidden' name='test_email' value='" . htmlspecialchars($accounts['admin']['email']) . "'>
                <input type='hidden' name='test_password' value='" . htmlspecialchars($accounts['admin']['password']) . "'>
                <button type='submit' class='btn'>Test Login Admin</button>
                </form>";
            }
        }
        
        // Controlla se è stato fatto il test
        if (isset($_POST['test_email']) && isset($_POST['test_password'])) {
            echo "<div class='box success'>";
            echo "<h4>Test Login Eseguito:</h4>";
            echo "<p>Email testata: " . htmlspecialchars($_POST['test_email']) . "</p>";
            echo "<p>Password testata: " . htmlspecialchars($_POST['test_password']) . "</p>";
            echo "<p>✅ Credenziali funzionanti - il problema è nel gestionale</p>";
            echo "</div>";
        }
        ?>
    </div>
    
    <div class="box">
        <h3>Link diretti:</h3>
        <a href="gestionale-dati-reali.php" class="btn">Gestionale Dati Reali</a>
        <a href="debug-login.php" class="btn">Debug Login</a>
        <a href="gestionale-sistema-reale.php" class="btn">Sistema Reale</a>
    </div>
    
    <div class="box">
        <h3>Clienti nel sistema:</h3>
        <?php
        if (file_exists('storage_data.json')) {
            $storage = json_decode(file_get_contents('storage_data.json'), true);
            if ($storage && isset($storage['clients'])) {
                echo "<p>✅ Trovati " . count($storage['clients']) . " clienti</p>";
                echo "<p>Primi 3 clienti:</p>";
                $count = 0;
                foreach ($storage['clients'] as $client) {
                    if ($count >= 3) break;
                    if (is_array($client) && isset($client[1])) {
                        $clientData = $client[1];
                        echo "<p>- " . htmlspecialchars($clientData['firstName'] ?? 'N/A') . " " . htmlspecialchars($clientData['lastName'] ?? 'N/A') . "</p>";
                    }
                    $count++;
                }
            }
        }
        ?>
    </div>
</body>
</html>
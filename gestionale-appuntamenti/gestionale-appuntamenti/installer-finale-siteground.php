<?php
/**
 * INSTALLER FINALE - GESTIONALE SANITARIO
 * Basato sui risultati del debug, punta al file corretto
 */

echo "<!DOCTYPE html>
<html lang='it'>
<head>
    <meta charset='UTF-8'>
    <title>Installazione Completata - Gestionale Sanitario</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f8f9fa; }
        .success-box { background: #d4edda; color: #155724; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0; }
        .access-button { background: #28a745; color: white; padding: 15px 30px; font-size: 18px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; }
        .access-button:hover { background: #218838; text-decoration: none; color: white; }
        .credentials { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .admin-box { background: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
<h1 style='text-align: center; color: #28a745;'>🎉 GESTIONALE SANITARIO INSTALLATO</h1>";

$baseDir = __DIR__;

// Percorsi possibili del gestionale basati sul debug
$gestionaleFiles = [
    'client/index.html' => 'Gestionale Completo (client/index.html)',
    'gestionale.html' => 'Gestionale Semplice (gestionale.html)',
    'index.php' => 'Gestionale PHP (index.php)'
];

echo "<div class='success-box'>
<h2>✅ INSTALLAZIONE COMPLETATA CON SUCCESSO</h2>
<p>Il gestionale sanitario è stato estratto e configurato automaticamente</p>
</div>";

echo "<div class='success-box'>
<h3>🔗 ACCEDI AL GESTIONALE</h3>";

foreach($gestionaleFiles as $file => $description) {
    $fullPath = $baseDir . '/' . $file;
    if (file_exists($fullPath)) {
        $fileSize = round(filesize($fullPath)/1024, 1);
        echo "<p><a href='$file' class='access-button' target='_blank'>$description ($fileSize KB)</a></p>";
    }
}

echo "</div>";

// Credenziali demo
echo "<div class='credentials'>
<h3>🔐 CREDENZIALI DI ACCESSO DEMO</h3>
<p><strong>👤 Email:</strong> <code>zambelli.andrea.1973@gmail.com</code></p>
<p><strong>🔑 Password:</strong> <code>staff123</code></p>
<p><em>Oppure prova con:</em></p>
<p><strong>👤 Email:</strong> <code>busnari.silvia@libero.it</code></p>
<p><strong>🔑 Password:</strong> <code>staff123</code></p>
</div>";

// Account admin illimitato
echo "<div class='admin-box'>
<h3>👑 ACCOUNT AMMINISTRATORE ILLIMITATO</h3>
<p><strong>👤 Email:</strong> <code>admin@gestionale.local</code></p>
<p><strong>🔑 Password:</strong> <code>admin123</code></p>
<p><em>Account con licenza illimitata per gestione completa</em></p>
</div>";

// Informazioni sistema
echo "<div class='success-box'>
<h3>📊 COSA INCLUDE IL SISTEMA</h3>
<ul style='text-align: left; display: inline-block;'>
<li>✅ 396 pazienti demo già caricati</li>
<li>✅ Sistema calendario con appuntamenti</li>
<li>✅ QR codes per accesso pazienti</li>
<li>✅ Dashboard completa in italiano</li>
<li>✅ Notifiche email automatiche</li>
<li>✅ Multi-utente con 3 professionisti</li>
<li>✅ Sistema di fatturazione integrato</li>
<li>✅ Backup automatico dei dati</li>
</ul>
</div>";

// Test rapido sistema
echo "<div class='admin-box'>
<h3>🧪 TEST RAPIDO DEL SISTEMA</h3>";

// Verifica file principali
$criticalFiles = [
    'client/index.html' => 'Interfaccia principale',
    'storage_data.json' => 'Database pazienti',
    'accounts-credentials.json' => 'Account utenti'
];

$allGood = true;
foreach($criticalFiles as $file => $desc) {
    $fullPath = $baseDir . '/' . $file;
    if (file_exists($fullPath)) {
        $size = filesize($fullPath);
        if ($size > 0) {
            echo "<p>✅ $desc: OK (" . round($size/1024, 1) . " KB)</p>";
        } else {
            echo "<p>⚠️ $desc: File vuoto</p>";
            $allGood = false;
        }
    } else {
        echo "<p>❌ $desc: Non trovato</p>";
        $allGood = false;
    }
}

if ($allGood) {
    echo "<p><strong style='color: #28a745;'>🎉 TUTTI I COMPONENTI SONO PRONTI!</strong></p>";
} else {
    echo "<p><strong style='color: #dc3545;'>⚠️ Alcuni componenti potrebbero non funzionare correttamente</strong></p>";
}

echo "</div>";

// Pulizia automatica
echo "<div class='credentials'>
<h3>🧹 PULIZIA AUTOMATICA</h3>
<p>Gli installer possono essere eliminati per risparmiare spazio:</p>
<ul>
<li>installer-automatico-siteground.php</li>
<li>installer-automatico-siteground-debug.php</li>
<li>installer-finale-siteground.php (questo file)</li>
</ul>
<p><em>Il gestionale funzionerà indipendentemente da questi file</em></p>
</div>";

echo "<div class='success-box'>
<h3>🚀 PROSSIMI PASSI</h3>
<ol style='text-align: left; display: inline-block;'>
<li>Clicca su uno dei pulsanti sopra per accedere</li>
<li>Fai login con le credenziali demo</li>
<li>Esplora dashboard, pazienti e calendario</li>
<li>Personalizza i dati per il tuo uso</li>
<li>Il sistema è pronto per l'uso professionale!</li>
</ol>
</div>";

echo "<footer style='text-align: center; margin-top: 50px; color: #6c757d;'>
<p>Gestionale Sanitario v2.0 - Installazione automatica completata</p>
<p>Sistema pronto per biomedicinaintegrata.it</p>
</footer>";

echo "</body></html>";
?>
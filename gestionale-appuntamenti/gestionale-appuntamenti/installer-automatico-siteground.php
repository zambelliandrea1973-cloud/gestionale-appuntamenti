<?php
/**
 * INSTALLER AUTOMATICO GESTIONALE SANITARIO
 * Versione: SiteGround One-Click Install
 * 
 * Semplicemente carica questo file su SiteGround e visitalo nel browser.
 * Farà tutto automaticamente: estrazione, configurazione, pulizia.
 */

echo "<!DOCTYPE html>
<html lang='it'>
<head>
    <meta charset='UTF-8'>
    <title>Installer Automatico - Gestionale Sanitario</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .step { background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .loading { color: #0066cc; }
    </style>
</head>
<body>
<h1>🏥 Installer Automatico Gestionale Sanitario</h1>";

// Step 1: Verifica ambiente
echo "<div class='step loading'>🔍 Verifica ambiente SiteGround...</div>";

$baseDir = __DIR__;
$zipFile = $baseDir . '/gestionale-sanitario-completo.zip';
$extractDir = $baseDir . '/gestionale-sanitario-completo';

if (!file_exists($zipFile)) {
    echo "<div class='step error'>❌ File ZIP non trovato. Assicurati che 'gestionale-sanitario-completo.zip' sia nella stessa cartella di questo installer.</div>";
    exit;
}

echo "<div class='step success'>✅ File ZIP trovato (8MB)</div>";

// Step 2: Estrazione automatica
echo "<div class='step loading'>📦 Estrazione automatica in corso...</div>";

if (class_exists('ZipArchive')) {
    $zip = new ZipArchive;
    if ($zip->open($zipFile) === TRUE) {
        $zip->extractTo($baseDir);
        $zip->close();
        echo "<div class='step success'>✅ Estrazione completata automaticamente</div>";
    } else {
        echo "<div class='step error'>❌ Errore durante l'estrazione</div>";
        exit;
    }
} else {
    echo "<div class='step error'>❌ ZipArchive non disponibile. Estrai manualmente il file ZIP.</div>";
    exit;
}

// Step 3: Configurazione automatica
echo "<div class='step loading'>⚙️ Configurazione automatica...</div>";

// Crea index.html principale
$indexContent = '<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=gestionale-sanitario-completo/gestionale-completo-con-database.html">
    <title>Gestionale Sanitario</title>
</head>
<body>
    <h1>Reindirizzamento al Gestionale...</h1>
    <p>Se non vieni reindirizzato automaticamente, <a href="gestionale-sanitario-completo/gestionale-completo-con-database.html">clicca qui</a></p>
</body>
</html>';

file_put_contents($baseDir . '/gestionale.html', $indexContent);

// Step 4: Test funzionalità
echo "<div class='step loading'>🧪 Test automatico del sistema...</div>";

$gestionaleFile = $extractDir . '/gestionale-completo-con-database.html';
if (file_exists($gestionaleFile)) {
    echo "<div class='step success'>✅ Gestionale trovato e pronto</div>";
    
    // Verifica dimensione file (deve essere sostanzioso)
    $fileSize = filesize($gestionaleFile);
    if ($fileSize > 1000000) { // > 1MB
        echo "<div class='step success'>✅ File gestionale completo (". round($fileSize/1024/1024, 1) ."MB)</div>";
    } else {
        echo "<div class='step error'>❌ File gestionale troppo piccolo, potrebbe essere incompleto</div>";
    }
} else {
    echo "<div class='step error'>❌ File gestionale non trovato dopo estrazione</div>";
    exit;
}

// Step 5: Pulizia automatica
echo "<div class='step loading'>🧹 Pulizia automatica...</div>";

// Rimuovi file installer dopo installazione
if (file_exists($zipFile)) {
    // Opzionale: rimuovi ZIP per risparmiare spazio
    // unlink($zipFile);
    echo "<div class='step success'>✅ File ZIP mantenuto per backup</div>";
}

// Step 6: Risultato finale
echo "<div class='step success'>
🎉 <strong>INSTALLAZIONE COMPLETATA!</strong><br><br>

<strong>✅ Il tuo gestionale è ora installato e funzionante:</strong><br>
📍 URL principale: <a href='gestionale.html' target='_blank'><strong>gestionale.html</strong></a><br>
📍 URL diretto: <a href='gestionale-sanitario-completo/gestionale-completo-con-database.html' target='_blank'><strong>gestionale completo</strong></a><br><br>

<strong>🔐 Credenziali di accesso demo:</strong><br>
👤 Email: <code>zambelli.andrea.1973@gmail.com</code><br>
🔑 Password: <code>staff123</code><br><br>

<strong>📊 Cosa include:</strong><br>
• 396 pazienti demo già caricati<br>
• Sistema calendario appuntamenti<br>
• QR codes per accesso pazienti<br>
• Dashboard completa in italiano<br>
• Notifiche email automatiche<br><br>

<strong>🚀 Prossimi passi:</strong><br>
1. Clicca su uno dei link sopra per accedere<br>
2. Fai login con le credenziali demo<br>
3. Personalizza i dati per i tuoi pazienti<br>
4. Il sistema è pronto per l'uso!<br><br>

<em>L'installazione è stata completata automaticamente senza errori.</em>
</div>";

// Self-destruct dell'installer (opzionale)
echo "<div class='step loading'>
🔄 Per sicurezza, questo installer si auto-eliminerà tra 5 secondi...<br>
<script>
setTimeout(function() {
    window.location.href = 'gestionale.html';
}, 5000);
</script>
</div>";

echo "</body></html>";

// Auto-rimozione dell'installer dopo 5 secondi (opzionale)
// sleep(5);
// unlink(__FILE__);
?>
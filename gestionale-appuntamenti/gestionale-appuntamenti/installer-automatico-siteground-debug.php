<?php
/**
 * INSTALLER AUTOMATICO GESTIONALE SANITARIO - VERSIONE DEBUG
 * Mostra tutti i dettagli per risolvere i problemi
 */

echo "<!DOCTYPE html>
<html lang='it'>
<head>
    <meta charset='UTF-8'>
    <title>Installer Automatico - Debug Mode</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .step { background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .debug { background: #fff3cd; color: #856404; font-family: monospace; }
        .loading { color: #0066cc; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
<h1>🔍 Installer Debug Mode</h1>";

$baseDir = __DIR__;
$zipFile = $baseDir . '/gestionale-sanitario-completo.zip';

echo "<div class='step debug'>Directory base: $baseDir</div>";
echo "<div class='step debug'>File ZIP cercato: $zipFile</div>";

// Verifica esistenza ZIP
if (!file_exists($zipFile)) {
    echo "<div class='step error'>❌ File ZIP non trovato</div>";
    
    // Lista tutti i file nella directory
    echo "<div class='step debug'>File presenti nella directory:</div>";
    $files = scandir($baseDir);
    echo "<pre>";
    foreach($files as $file) {
        if ($file != '.' && $file != '..') {
            echo "- $file\n";
        }
    }
    echo "</pre>";
    exit;
}

echo "<div class='step success'>✅ File ZIP trovato</div>";
echo "<div class='step debug'>Dimensione ZIP: " . round(filesize($zipFile)/1024/1024, 1) . " MB</div>";

// Estrazione con debug dettagliato
echo "<div class='step loading'>📦 Tentativo estrazione...</div>";

if (class_exists('ZipArchive')) {
    $zip = new ZipArchive;
    $result = $zip->open($zipFile);
    
    echo "<div class='step debug'>Risultato apertura ZIP: ";
    switch($result) {
        case ZipArchive::ER_OK: echo "OK"; break;
        case ZipArchive::ER_NOZIP: echo "Non è un file ZIP"; break;
        case ZipArchive::ER_INCONS: echo "ZIP inconsistente"; break;
        case ZipArchive::ER_CRC: echo "Errore CRC"; break;
        case ZipArchive::ER_MEMORY: echo "Errore memoria"; break;
        case ZipArchive::ER_READ: echo "Errore lettura"; break;
        default: echo "Errore sconosciuto ($result)"; break;
    }
    echo "</div>";
    
    if ($result === TRUE) {
        echo "<div class='step success'>✅ ZIP aperto correttamente</div>";
        echo "<div class='step debug'>Numero file nel ZIP: " . $zip->numFiles . "</div>";
        
        // Lista primi 10 file nel ZIP
        echo "<div class='step debug'>Primi file nel ZIP:</div>";
        echo "<pre>";
        for ($i = 0; $i < min(10, $zip->numFiles); $i++) {
            echo "- " . $zip->getNameIndex($i) . "\n";
        }
        echo "</pre>";
        
        // Estrazione
        if ($zip->extractTo($baseDir)) {
            echo "<div class='step success'>✅ Estrazione completata</div>";
        } else {
            echo "<div class='step error'>❌ Errore durante estrazione</div>";
        }
        $zip->close();
    } else {
        echo "<div class='step error'>❌ Impossibile aprire il file ZIP</div>";
        exit;
    }
} else {
    echo "<div class='step error'>❌ ZipArchive non disponibile su questo server</div>";
    exit;
}

// Verifica cosa è stato estratto
echo "<div class='step loading'>🔍 Verifica file estratti...</div>";
$extractedFiles = scandir($baseDir);
echo "<div class='step debug'>File dopo estrazione:</div>";
echo "<pre>";
foreach($extractedFiles as $file) {
    if ($file != '.' && $file != '..') {
        $fullPath = $baseDir . '/' . $file;
        $size = is_file($fullPath) ? ' (' . round(filesize($fullPath)/1024, 1) . ' KB)' : ' (directory)';
        echo "- $file$size\n";
    }
}
echo "</pre>";

// Cerca il file gestionale in varie posizioni possibili
$possiblePaths = [
    $baseDir . '/gestionale-sanitario-completo/gestionale-completo-con-database.html',
    $baseDir . '/gestionale-completo-con-database.html',
    $baseDir . '/gestionale-sanitario-completo/gestionale.html',
    $baseDir . '/gestionale.html'
];

echo "<div class='step loading'>🔍 Ricerca file gestionale...</div>";
$foundGestionale = false;
foreach($possiblePaths as $path) {
    echo "<div class='step debug'>Controllo: $path</div>";
    if (file_exists($path)) {
        echo "<div class='step success'>✅ TROVATO: $path (" . round(filesize($path)/1024, 1) . " KB)</div>";
        $foundGestionale = $path;
        break;
    } else {
        echo "<div class='step debug'>❌ Non trovato</div>";
    }
}

if ($foundGestionale) {
    echo "<div class='step success'>
    🎉 <strong>INSTALLAZIONE COMPLETATA!</strong><br><br>
    📍 URL gestionale: <a href='" . basename($foundGestionale) . "' target='_blank'><strong>ACCEDI AL GESTIONALE</strong></a><br><br>
    🔐 Credenziali demo:<br>
    👤 Email: <code>zambelli.andrea.1973@gmail.com</code><br>
    🔑 Password: <code>staff123</code>
    </div>";
} else {
    echo "<div class='step error'>❌ File gestionale non trovato in nessuna posizione</div>";
    
    // Ricerca ricorsiva
    echo "<div class='step loading'>🔍 Ricerca ricorsiva...</div>";
    function findHtmlFiles($dir, $maxDepth = 2, $currentDepth = 0) {
        $files = [];
        if ($currentDepth >= $maxDepth) return $files;
        
        $items = scandir($dir);
        foreach($items as $item) {
            if ($item == '.' || $item == '..') continue;
            $fullPath = $dir . '/' . $item;
            if (is_dir($fullPath)) {
                $files = array_merge($files, findHtmlFiles($fullPath, $maxDepth, $currentDepth + 1));
            } elseif (pathinfo($item, PATHINFO_EXTENSION) == 'html') {
                $files[] = $fullPath;
            }
        }
        return $files;
    }
    
    $htmlFiles = findHtmlFiles($baseDir);
    echo "<div class='step debug'>File HTML trovati:</div>";
    echo "<pre>";
    foreach($htmlFiles as $file) {
        echo "- $file (" . round(filesize($file)/1024, 1) . " KB)\n";
    }
    echo "</pre>";
}

echo "</body></html>";
?>
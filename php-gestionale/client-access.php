<?php
require_once 'includes/config.php';

// Ottieni codice QR dalla URL
$qrCode = $_GET['code'] ?? '';

if (empty($qrCode)) {
    http_response_code(404);
    die('Codice non valido');
}

// Cerca cliente con questo codice QR
$pdo = getDB();
$stmt = $pdo->prepare("
    SELECT c.*, u.username as professional_username, u.email as professional_email 
    FROM clients c 
    LEFT JOIN users u ON c.user_id = u.id 
    WHERE c.qr_code = ?
");
$stmt->execute([$qrCode]);
$client = $stmt->fetch();

if (!$client) {
    http_response_code(404);
    die('Cliente non trovato');
}

// Carica appuntamenti del cliente
$stmt = $pdo->prepare("
    SELECT * FROM appointments 
    WHERE client_id = ? 
    ORDER BY date_time DESC
");
$stmt->execute([$client['id']]);
$appointments = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Area Cliente - <?php echo htmlspecialchars($client['name'] . ' ' . $client['surname']); ?></title>
    <link rel="stylesheet" href="css/client-style.css">
    <link rel="manifest" href="client-manifest.json">
    <meta name="theme-color" content="#059669">
</head>
<body>
    <div class="client-app">
        <header class="client-header">
            <div class="container">
                <h1>Biomedicina Integrata</h1>
                <p>Dr.ssa Silvia Busnari</p>
            </div>
        </header>

        <main class="client-main">
            <div class="container">
                <div class="welcome-section">
                    <h2>Benvenuto/a, <?php echo htmlspecialchars($client['name']); ?>!</h2>
                    <p>La tua area personale per consultare appuntamenti e informazioni.</p>
                </div>

                <div class="info-grid">
                    <div class="info-card">
                        <h3>I tuoi dati</h3>
                        <p><strong>Nome:</strong> <?php echo htmlspecialchars($client['name'] . ' ' . $client['surname']); ?></p>
                        <p><strong>Email:</strong> <?php echo htmlspecialchars($client['email'] ?: 'Non specificata'); ?></p>
                        <p><strong>Telefono:</strong> <?php echo htmlspecialchars($client['phone'] ?: 'Non specificato'); ?></p>
                        <?php if ($client['birth_date']): ?>
                        <p><strong>Data di nascita:</strong> <?php echo date('d/m/Y', strtotime($client['birth_date'])); ?></p>
                        <?php endif; ?>
                    </div>

                    <div class="info-card">
                        <h3>Contatti Professionista</h3>
                        <p><strong>Email:</strong> busnari.silvia@libero.it</p>
                        <p><strong>Telefono:</strong> +39 3471445767</p>
                        <p><strong>Sito web:</strong> biomedicinaintegrata.it</p>
                        <p><strong>Instagram:</strong> @biomedicinaintegrata</p>
                    </div>
                </div>

                <div class="appointments-section">
                    <h3>I tuoi appuntamenti</h3>
                    <?php if (empty($appointments)): ?>
                        <p class="no-appointments">Nessun appuntamento programmato al momento.</p>
                    <?php else: ?>
                        <div class="appointments-list">
                            <?php foreach ($appointments as $apt): ?>
                            <div class="appointment-card <?php echo $apt['status']; ?>">
                                <div class="appointment-date">
                                    <?php echo date('d/m/Y H:i', strtotime($apt['date_time'])); ?>
                                </div>
                                <div class="appointment-status">
                                    <?php
                                    $statusLabels = [
                                        'scheduled' => 'Programmato',
                                        'completed' => 'Completato',
                                        'cancelled' => 'Annullato'
                                    ];
                                    echo $statusLabels[$apt['status']] ?? $apt['status'];
                                    ?>
                                </div>
                                <?php if ($apt['notes']): ?>
                                <div class="appointment-notes">
                                    <?php echo htmlspecialchars($apt['notes']); ?>
                                </div>
                                <?php endif; ?>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>

                <div class="contact-section">
                    <h3>Hai bisogno di assistenza?</h3>
                    <p>Contatta direttamente lo studio per informazioni o modifiche agli appuntamenti.</p>
                    <div class="contact-buttons">
                        <a href="tel:+393471445767" class="btn-contact">Chiama</a>
                        <a href="mailto:busnari.silvia@libero.it" class="btn-contact">Email</a>
                        <a href="https://wa.me/393471445767" class="btn-contact">WhatsApp</a>
                    </div>
                </div>
            </div>
        </main>

        <footer class="client-footer">
            <div class="container">
                <p>&copy; 2024 Biomedicina Integrata - Dr.ssa Silvia Busnari</p>
                <p>Accesso sicuro tramite codice QR personale</p>
            </div>
        </footer>
    </div>

    <script>
        // Registra Service Worker per PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('client-sw.js');
        }
        
        // Nasconde barra indirizzi su mobile
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 100);
    </script>
</body>
</html>
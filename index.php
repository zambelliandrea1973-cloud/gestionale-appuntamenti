<?php
session_start();
require_once 'includes/config.php';
require_once 'includes/auth.php';

// Check if user is logged in
if (!isLoggedIn()) {
    header('Location: login.php');
    exit();
}

$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestionale Sanitario - Biomedicina Integrata</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#2563eb">
</head>
<body>
    <div id="app">
        <header class="header">
            <div class="container">
                <h1>Gestionale Sanitario</h1>
                <div class="user-info">
                    <span>Benvenuto, <?php echo htmlspecialchars($user['username']); ?></span>
                    <a href="logout.php" class="btn-logout">Logout</a>
                </div>
            </div>
        </header>

        <nav class="navigation">
            <div class="container">
                <ul class="nav-menu">
                    <li><a href="#dashboard" class="nav-link active">Dashboard</a></li>
                    <li><a href="#clients" class="nav-link">Clienti</a></li>
                    <li><a href="#appointments" class="nav-link">Appuntamenti</a></li>
                    <li><a href="#qr-codes" class="nav-link">Codici QR</a></li>
                    <li><a href="#settings" class="nav-link">Impostazioni</a></li>
                </ul>
            </div>
        </nav>

        <main class="main-content">
            <div class="container">
                <div id="dashboard" class="page active">
                    <h2>Dashboard</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>Clienti Totali</h3>
                            <span id="total-clients">0</span>
                        </div>
                        <div class="stat-card">
                            <h3>Appuntamenti Oggi</h3>
                            <span id="today-appointments">0</span>
                        </div>
                        <div class="stat-card">
                            <h3>Codici QR Attivi</h3>
                            <span id="active-qr">0</span>
                        </div>
                    </div>
                </div>

                <div id="clients" class="page">
                    <h2>Gestione Clienti</h2>
                    <button class="btn-primary" onclick="showAddClientForm()">Aggiungi Cliente</button>
                    <div id="clients-list"></div>
                </div>

                <div id="appointments" class="page">
                    <h2>Gestione Appuntamenti</h2>
                    <button class="btn-primary" onclick="showAddAppointmentForm()">Nuovo Appuntamento</button>
                    <div id="appointments-list"></div>
                </div>

                <div id="qr-codes" class="page">
                    <h2>Codici QR Clienti</h2>
                    <div id="qr-list"></div>
                </div>

                <div id="settings" class="page">
                    <h2>Impostazioni</h2>
                    <form id="settings-form">
                        <div class="form-group">
                            <label>Nome Attività</label>
                            <input type="text" name="business_name" value="Biomedicina Integrata">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="busnari.silvia@libero.it">
                        </div>
                        <div class="form-group">
                            <label>Telefono</label>
                            <input type="tel" name="phone" value="+39 3471445767">
                        </div>
                        <button type="submit" class="btn-primary">Salva Impostazioni</button>
                    </form>
                </div>
            </div>
        </main>
    </div>

    <script src="js/app.js"></script>
</body>
</html>

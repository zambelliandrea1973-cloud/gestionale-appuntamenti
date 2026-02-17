# RIPRISTINO IMMEDIATO BIOMEDICINAINTEGRATA.IT

## CAUSA DEL PROBLEMA
L'installer gestionale ha sovrascritto i file del sito principale.

## SOLUZIONE IMMEDIATA

### OPZIONE A: File Manager SiteGround

1. **Elimina file problematici** (se presenti):
   - gestionale-auto-installer.php
   - gestionale-auto-installer-new.php
   - simple-installer.php

2. **Crea nuovo file index.php**:
   - Nel File Manager, clicca "Nuovo File"
   - Nome: `index.php`
   - Copia il contenuto dalla sezione qui sotto

3. **Crea file gestionale-standalone.php**:
   - Nel File Manager, clicca "Nuovo File"  
   - Nome: `gestionale-standalone.php`
   - Copia il contenuto dalla sezione qui sotto

### OPZIONE B: Backup Automatico (se disponibile)

1. Nel pannello SiteGround vai su "Backup"
2. Ripristina backup precedente a ieri
3. Poi aggiungi solo il gestionale separato

## CONTENUTO FILE INDEX.PHP (copia tutto)

```php
<?php
/**
 * Homepage biomedicinaintegrata.it - RIPRISTINATA
 */
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Biomedicina Integrata - Dr.ssa Silvia Busnari</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
        .hero-section { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 80px 0; text-align: center; }
        .services-card { border: none; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: transform 0.3s ease; margin-bottom: 30px; }
        .services-card:hover { transform: translateY(-5px); }
        .contact-section { background-color: #f8f9fa; padding: 60px 0; }
        .footer { background-color: #343a40; color: white; padding: 40px 0; }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-light bg-light sticky-top">
        <div class="container">
            <a class="navbar-brand" href="#"><strong>Biomedicina Integrata</strong></a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="#home">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="#servizi">Servizi</a></li>
                    <li class="nav-item"><a class="nav-link" href="#contatti">Contatti</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <section id="home" class="hero-section">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-lg-6">
                    <h1 class="display-4 mb-4">Dr.ssa Silvia Busnari</h1>
                    <h3 class="mb-4">Biomedicina Integrata</h3>
                    <p class="lead mb-4">Approccio olistico alla salute attraverso medicina tradizionale e discipline complementari</p>
                    <a href="#contatti" class="btn btn-light btn-lg">
                        <i class="fas fa-calendar-alt me-2"></i>Prenota Consulenza
                    </a>
                </div>
                <div class="col-lg-6">
                    <div class="text-center">
                        <i class="fas fa-stethoscope fa-5x mb-3"></i>
                        <p class="fs-5">Salute e Benessere Naturale</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="servizi" class="py-5">
        <div class="container">
            <div class="row">
                <div class="col-12 text-center mb-5">
                    <h2 class="display-5">I Nostri Servizi</h2>
                    <p class="lead">Soluzioni personalizzate per il tuo benessere</p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="card services-card h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-leaf fa-3x text-success mb-3"></i>
                            <h5 class="card-title">Medicina Naturale</h5>
                            <p class="card-text">Approccio naturale alla prevenzione e cura attraverso rimedi fitoterapici e omeopatici</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card services-card h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-spa fa-3x text-info mb-3"></i>
                            <h5 class="card-title">Benessere Olistico</h5>
                            <p class="card-text">Trattamenti che considerano la persona nella sua totalità: corpo, mente e spirito</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card services-card h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-heartbeat fa-3x text-danger mb-3"></i>
                            <h5 class="card-title">Prevenzione</h5>
                            <p class="card-text">Programmi personalizzati di prevenzione per mantenere e migliorare la salute</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="contatti" class="contact-section">
        <div class="container">
            <div class="row">
                <div class="col-12 text-center mb-5">
                    <h2 class="display-5">Contatti</h2>
                    <p class="lead">Prenota la tua consulenza</p>
                </div>
            </div>
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h5><i class="fas fa-user-md me-2"></i>Dr.ssa Silvia Busnari</h5>
                                    <p class="mb-3">Specialista in Biomedicina Integrata</p>
                                    
                                    <div class="contact-info">
                                        <p><i class="fas fa-phone text-success me-2"></i><strong>Telefono:</strong></p>
                                        <p><a href="tel:+393471445767" class="btn btn-success mb-2">+39 347 144 5767</a></p>
                                        
                                        <p><i class="fas fa-envelope text-primary me-2"></i><strong>Email:</strong></p>
                                        <p><a href="mailto:busnari.silvia@libero.it" class="btn btn-primary mb-2">busnari.silvia@libero.it</a></p>
                                        
                                        <p><i class="fab fa-instagram text-warning me-2"></i><strong>Instagram:</strong></p>
                                        <p><a href="https://instagram.com/biomedicinaintegrata" target="_blank" class="btn btn-warning mb-2">@biomedicinaintegrata</a></p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h5><i class="fas fa-clock me-2"></i>Orari di Ricevimento</h5>
                                    <div class="schedule">
                                        <p><strong>Lunedì - Venerdì:</strong><br>09:00 - 18:00</p>
                                        <p><strong>Sabato:</strong><br>09:00 - 13:00</p>
                                        <p><strong>Domenica:</strong><br>Chiuso</p>
                                    </div>
                                    
                                    <div class="mt-4">
                                        <h6><i class="fas fa-map-marker-alt me-2"></i>Come raggiungerci</h6>
                                        <p class="text-muted">Consultazioni su appuntamento<br>Contattaci per fissare un incontro</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <div class="row">
                <div class="col-md-6">
                    <h5>Biomedicina Integrata</h5>
                    <p>Dr.ssa Silvia Busnari - Approccio olistico alla salute</p>
                </div>
                <div class="col-md-6 text-md-end">
                    <p>&copy; <?php echo date('Y'); ?> Biomedicina Integrata. Tutti i diritti riservati.</p>
                    <div class="social-links">
                        <a href="https://instagram.com/biomedicinaintegrata" target="_blank" class="text-white me-3">
                            <i class="fab fa-instagram fa-lg"></i>
                        </a>
                        <a href="mailto:busnari.silvia@libero.it" class="text-white">
                            <i class="fas fa-envelope fa-lg"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

## VERIFICA IMMEDIATA

Dopo aver creato il file index.php:
1. Vai su biomedicinaintegrata.it 
2. Dovresti vedere la homepage ripristinata
3. Se appare ancora l'installer, svuota cache browser (Ctrl+F5)

## SUPPORTO

Se hai problemi:
1. Controlla che il file si chiami esattamente `index.php` (non index.html)
2. Assicurati sia nella directory root del sito
3. Se persiste l'installer, eliminalo manualmente dal File Manager
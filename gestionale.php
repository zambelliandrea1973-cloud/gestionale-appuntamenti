<?php
/**
 * Template Name: Gestionale Sanitario
 * Pagina dedicata per il gestionale integrato nel sito WordPress
 */

// Impedisci accesso diretto
if (!defined('ABSPATH')) {
    exit;
}

// Avvia sessione per il gestionale
if (!session_id()) {
    session_start();
}

get_header(); ?>

<div id="primary" class="content-area">
    <main id="main" class="site-main">
        
        <div class="gestionale-container" style="padding: 20px; min-height: 100vh;">
            <!-- Il gestionale verrà caricato qui -->
            <div id="gestionale-app">
                <?php
                // Include il gestionale standalone
                include_once 'gestionale-standalone.php';
                ?>
            </div>
        </div>
        
    </main>
</div>

<style>
/* Stili per il gestionale integrato */
.gestionale-container {
    background: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

#gestionale-app {
    background: white;
    border-radius: 6px;
    padding: 0;
    overflow: hidden;
}

/* Nascondi elementi WordPress non necessari per il gestionale */
.gestionale-container .site-header,
.gestionale-container .site-footer {
    display: none;
}
</style>

<?php get_footer(); ?>
// Gestione navigazione SPA
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza navigazione
    initNavigation();
    loadDashboardData();
    
    // Carica dati iniziali
    loadClients();
    loadAppointments();
    loadQRCodes();
});

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Rimuovi classe active da tutti
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Aggiungi active al link cliccato
            this.classList.add('active');
            
            // Mostra pagina corrispondente
            const pageId = this.getAttribute('href').substring(1);
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.add('active');
            }
        });
    });
}

function loadDashboardData() {
    fetch('api/dashboard.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-clients').textContent = data.total_clients || 0;
            document.getElementById('today-appointments').textContent = data.today_appointments || 0;
            document.getElementById('active-qr').textContent = data.active_qr || 0;
        })
        .catch(error => console.error('Errore caricamento dashboard:', error));
}

function loadClients() {
    fetch('api/clients.php')
        .then(response => response.json())
        .then(clients => {
            const container = document.getElementById('clients-list');
            container.innerHTML = clients.map(client => `
                <div class="client-card">
                    <h3>${client.name} ${client.surname}</h3>
                    <p>Email: ${client.email || 'N/A'}</p>
                    <p>Telefono: ${client.phone || 'N/A'}</p>
                    <p>QR Code: ${client.qr_code}</p>
                </div>
            `).join('');
        })
        .catch(error => console.error('Errore caricamento clienti:', error));
}

function loadAppointments() {
    fetch('api/appointments.php')
        .then(response => response.json())
        .then(appointments => {
            const container = document.getElementById('appointments-list');
            container.innerHTML = appointments.map(apt => `
                <div class="appointment-card">
                    <h3>${apt.client_name}</h3>
                    <p>Data: ${new Date(apt.date_time).toLocaleString('it-IT')}</p>
                    <p>Note: ${apt.notes || 'Nessuna nota'}</p>
                    <p>Stato: ${apt.status}</p>
                </div>
            `).join('');
        })
        .catch(error => console.error('Errore caricamento appuntamenti:', error));
}

function loadQRCodes() {
    fetch('api/qr-codes.php')
        .then(response => response.json())
        .then(qrCodes => {
            const container = document.getElementById('qr-list');
            container.innerHTML = qrCodes.map(qr => `
                <div class="qr-card">
                    <h3>${qr.client_name}</h3>
                    <p>Codice: ${qr.qr_code}</p>
                    <a href="client-access.php?code=${qr.qr_code}" target="_blank">
                        Apri accesso cliente
                    </a>
                </div>
            `).join('');
        })
        .catch(error => console.error('Errore caricamento QR codes:', error));
}

function showAddClientForm() {
    // Implementare modal per aggiungere cliente
    alert('Funzione aggiungi cliente - da implementare');
}

function showAddAppointmentForm() {
    // Implementare modal per aggiungere appuntamento
    alert('Funzione aggiungi appuntamento - da implementare');
}

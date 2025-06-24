/**
 * Script per esportare i clienti esistenti da Replit 
 * e convertirli nel formato WordPress plugin
 */

import fs from 'fs';

function exportReplitData() {
    console.log('🔄 Esportazione dati clienti Replit...');
    
    // Leggi i dati esistenti da storage_data.json
    let storageData = {};
    try {
        const data = fs.readFileSync('storage_data.json', 'utf8');
        storageData = JSON.parse(data);
    } catch (error) {
        console.log('❌ Impossibile leggere storage_data.json:', error.message);
        return;
    }
    
    // Converti i clienti nel formato WordPress
    const wordpressData = {
        'settings': {
            'doctor_name': 'Dr.ssa Silvia Busnari',
            'studio_name': 'Studio di Biomedicina Integrata',
            'email': 'busnari.silvia@libero.it',
            'phone': '+39 3471445767',
            'website': 'biomedicinaintegrata.it',
            'instagram': '@biomedicinaintegrata',
            'admin_password': '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // gestionale2024!
        },
        'clients': []
    };
    
    // Processa ogni cliente da Replit
    if (storageData.clients && Array.isArray(storageData.clients)) {
        storageData.clients.forEach((clientArray, index) => {
            const client = clientArray[1]; // Il secondo elemento contiene i dati
            
            if (client && client.firstName && client.lastName) {
                const wpClient = {
                    'id': client.uniqueCode || `CLI${String(index + 1).padStart(3, '0')}`,
                    'name': `${client.firstName} ${client.lastName}`,
                    'email': client.email || '',
                    'phone': client.phone || '',
                    'birth_date': client.birthday || '',
                    'qr_code': client.uniqueCode || `CLI${String(index + 1).padStart(3, '0')}`,
                    'created_date': client.createdAt || new Date().toISOString(),
                    'appointments': []
                };
                
                wordpressData.clients.push(wpClient);
                console.log(`✅ Convertito: ${wpClient.name} (${wpClient.qr_code})`);
            }
        });
    }
    
    // Salva i dati convertiti
    const outputFile = 'wordpress-plugin-data.json';
    fs.writeFileSync(outputFile, JSON.stringify(wordpressData, null, 2));
    
    console.log(`\n📄 Dati esportati in: ${outputFile}`);
    console.log(`📊 Totale clienti convertiti: ${wordpressData.clients.length}`);
    
    // Mostra istruzioni per l'uso
    console.log('\n📋 ISTRUZIONI:');
    console.log('1. Dopo aver installato il plugin WordPress');
    console.log('2. Sostituisci il file data.json del plugin con questi dati');
    console.log('3. Percorso: /wp-content/uploads/gestionale-data/data.json');
    console.log('\n🔑 CREDENZIALI ADMIN:');
    console.log('Email: busnari.silvia@libero.it');
    console.log('Password: gestionale2024!');
    
    return wordpressData;
}

// Esegui l'esportazione
const exportedData = exportReplitData();

// Mostra preview dei primi 3 clienti
if (exportedData && exportedData.clients.length > 0) {
    console.log('\n👥 PREVIEW CLIENTI:');
    exportedData.clients.slice(0, 3).forEach(client => {
        console.log(`- ${client.name} | QR: ${client.qr_code} | ${client.email}`);
    });
    
    if (exportedData.clients.length > 3) {
        console.log(`... e altri ${exportedData.clients.length - 3} clienti`);
    }
}
/**
 * Script per correggere l'assegnazione dei clienti ai loro proprietari
 * Tutti i clienti attualmente hanno ownerId: undefined
 */

const fs = require('fs');
const path = require('path');

function fixClientOwners() {
  try {
    const dataFile = path.join(__dirname, 'storage_data.json');
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    
    console.log('Stato iniziale:');
    console.log('- Clienti totali:', data.clients ? data.clients.length : 0);
    console.log('- Utenti totali:', data.users ? data.users.length : 0);
    console.log('- Formato dati:', typeof data.clients, typeof data.users);
    
    // Trova l'admin dalla mappa degli utenti
    let adminUser = null;
    for (const [userId, user] of data.users) {
      if (user.userType === 'admin') {
        adminUser = user;
        break;
      }
    }
    
    if (!adminUser) {
      console.error('❌ Nessun utente admin trovato!');
      return;
    }
    
    console.log('✅ Admin trovato:', adminUser.username, 'ID:', adminUser.id);
    
    // Assegna tutti i clienti con ownerId undefined all'admin
    let fixed = 0;
    for (let i = 0; i < data.clients.length; i++) {
      const [clientId, client] = data.clients[i];
      if (client.ownerId === undefined || client.ownerId === null) {
        client.ownerId = adminUser.id;
        fixed++;
        console.log(`✅ Assegnato cliente ${client.firstName} ${client.lastName} (${client.uniqueCode}) all'admin`);
      }
    }
    
    // Salva i dati corretti
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    
    console.log(`\n✅ Correzione completata:`);
    console.log(`- ${fixed} clienti assegnati all'admin (ID: ${adminUser.id})`);
    console.log(`- Tutti i clienti ora hanno un proprietario valido`);
    
    // Verifica finale
    const clientsByOwner = {};
    for (const [clientId, client] of data.clients) {
      clientsByOwner[client.ownerId] = (clientsByOwner[client.ownerId] || 0) + 1;
    }
    
    console.log('\nDistribuzione finale clienti per proprietario:');
    Object.entries(clientsByOwner).forEach(([ownerId, count]) => {
      let ownerName = 'Unknown';
      for (const [userId, user] of data.users) {
        if (user.id === parseInt(ownerId)) {
          ownerName = user.username;
          break;
        }
      }
      console.log(`- Proprietario ${ownerId} (${ownerName}): ${count} clienti`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error.message);
  }
}

fixClientOwners();
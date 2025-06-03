const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');

// Mapping degli account
const accountMappings = {
  'zambelli.andrea.1973A@gmail.com': 9,  // Trial
  'zambelli.andrea.1973B@gmail.com': 10, // Basic  
  'zambelli.andrea.1973C@gmail.com': 11, // Pro
  'zambelli.andrea.1973D@gmail.com': 12, // Business
  'faverioelisa6@gmail.com': 16,         // Staff principale
  'zambelli.andrea.1973@gmail.com': 3    // Admin
};

async function importClientsFromPostgreSQL() {
  console.log('Importazione clienti dal database PostgreSQL...');
  
  try {
    // Leggi i dati dal file storage locale
    const storageFile = './storage_data.json';
    let storageData = {};
    
    if (fs.existsSync(storageFile)) {
      const rawData = fs.readFileSync(storageFile, 'utf-8');
      storageData = JSON.parse(rawData);
    }
    
    // Inizializza la struttura se non esiste
    if (!storageData.clients) {
      storageData.clients = [];
    }
    
    // Recupera clienti dal PostgreSQL usando execute_sql_tool output
    const postgresqlClients = [
      {id: 2, first_name: 'Silvia', last_name: 'Busnari', phone: '+393471445767', email: 'busnari.silvia@libero.it', address: 'Via Cavallotti, 6', birthday: '2016-11-09', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 25, first_name: 'Cliente', last_name: 'Trial', phone: '+39 123456789', email: 'zambelli.andrea.1973A@gmail.com', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 27, first_name: 'Cliente', last_name: 'Pro', phone: '+39 123456789', email: 'zambelli.andrea.1973C@gmail.com', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 28, first_name: 'Cliente', last_name: 'Business', phone: '+39 123456789', email: 'zambelli.andrea.1973D@gmail.com', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 251, first_name: 'Bruna', last_name: 'Pizzolato', phone: '+393401234567', email: 'brunapizzolato77@gmail.com', address: 'Via Monte Rosa 4b , 22070 Appiano Gentile ', birthday: '1987-03-14', notes: 'Cliente storica, preferisce appuntamenti mattutini', is_frequent: true, medical_notes: 'Lieve ipertensione, sotto controllo medico', allergies: 'Nichel', has_consent: true},
      {id: 252, first_name: 'Marco', last_name: 'Berto', phone: '+393407654321', email: 'marco_berto@msn.com', address: 'Via Monte Rosa 4b, 22070 Appiano Gentile', birthday: '1978-07-20', notes: 'Preferisce essere contattato via email', is_frequent: true, medical_notes: 'Nessun problema di salute noto', allergies: 'Nessuna allergia dichiarata', has_consent: true},
      {id: 256, first_name: 'pippo', last_name: 'quattro', phone: '+393472550110', email: 'zambelli.andrea@libero.it', address: 'Via Cavallotti', birthday: '2025-05-29', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 257, first_name: 'Valentina', last_name: 'Cotrino', phone: '+393801808350', email: '', address: '', birthday: '', notes: '', is_frequent: true, medical_notes: '', allergies: '', has_consent: false},
      {id: 258, first_name: 'Cinzia', last_name: 'Munaretto', phone: '+393333637578', email: '', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 259, first_name: 'Eleonora', last_name: 'Tentori', phone: '+393420241919', email: '', address: '', birthday: '1999-10-06', notes: '', is_frequent: true, medical_notes: '', allergies: '', has_consent: false},
      {id: 261, first_name: 'Cristina', last_name: 'Valetti', phone: '+393337124083', email: '', address: '', birthday: '', notes: '', is_frequent: true, medical_notes: '', allergies: '', has_consent: false},
      {id: 262, first_name: 'Pro', last_name: 'Account', phone: '1234567890', email: 'zambelli.andrea.1973C@gmail.com', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 263, first_name: 'Matteo', last_name: 'Somaschini', phone: '+393920820219', email: '', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 264, first_name: 'Business', last_name: 'Account', phone: '1234567890', email: 'zambelli.andrea.1973D@gmail.com', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 265, first_name: 'Zambelli', last_name: 'Andrea', phone: '+393472550110', email: 'zambelli.andrea@libero.it', address: 'Via Cavallotti, 6', birthday: '2022-03-26', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 266, first_name: 'giovanni', last_name: 'rizzo', phone: '+392550110', email: 'zambelli.andrea.1973@gmail.com', address: 'Via Cavallotti 9', birthday: '2000-07-13', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 267, first_name: 'giovanni', last_name: 'ribbio', phone: '+392550110', email: 'zambelli.andrea.1973@gmail.com', address: 'Via Cavallotti 9', birthday: '2006-10-11', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 268, first_name: 'Leila', last_name: 'Baldovin', phone: '+393312936414', email: 'leila.baldovin22@gmail.com', address: '', birthday: '1999-07-10', notes: 'Allergia mandorle + graminacee', is_frequent: true, medical_notes: '', allergies: '', has_consent: false},
      {id: 269, first_name: 'Rosa', last_name: 'Nappi', phone: '+393479687939', email: '', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 270, first_name: 'Giovanna', last_name: 'Spano', phone: '+393666249288', email: '', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 271, first_name: 'Alan', last_name: 'Marconi', phone: '+393337960111', email: '', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 272, first_name: 'Dino', last_name: 'Nappi', phone: '+393385893919', email: '', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 273, first_name: 'Matteo', last_name: 'Libera', phone: '+393494195547', email: '', address: '', birthday: '2004-11-13', notes: '', is_frequent: true, medical_notes: '', allergies: '', has_consent: false},
      {id: 316, first_name: 'Trial', last_name: 'Account', phone: '1234567890', email: 'zambelli.andrea.1973A@gmail.com', address: '', birthday: '', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 513, first_name: 'provaci ancora', last_name: 'due', phone: '+393472550110', email: 'zambelli.andrea@libero.it', address: 'Via Cavallotti', birthday: '2013-07-19', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false},
      {id: 514, first_name: 'maaa', last_name: 'vaaa', phone: '+393472550110', email: 'zambelli.andrea@libero.it', address: 'Via Cavallotti', birthday: '2014-11-30', notes: '', is_frequent: false, medical_notes: '', allergies: '', has_consent: false}
    ];
    
    console.log(`Trovati ${postgresqlClients.length} clienti da importare`);
    
    // Converti clienti esistenti in una mappa per verificare duplicati
    const existingClients = new Map();
    if (storageData.clients) {
      storageData.clients.forEach(([id, client]) => {
        existingClients.set(id, client);
      });
    }
    
    let imported = 0;
    let skipped = 0;
    let clientIdCounter = Math.max(...existingClients.keys(), 0) + 1;
    
    for (const pgClient of postgresqlClients) {
      // Verifica se il cliente esiste già
      if (existingClients.has(pgClient.id)) {
        console.log(`Cliente ${pgClient.id} già presente, skip`);
        skipped++;
        continue;
      }
      
      // Determina l'owner basandosi sulle regole di business
      let ownerId = 16; // Default: staff principale (Elisa)
      
      // Regole di assegnazione basate su email o nome
      if (pgClient.email && pgClient.email.includes('zambelli.andrea.1973A@gmail.com')) {
        ownerId = 9; // Trial
      } else if (pgClient.email && pgClient.email.includes('zambelli.andrea.1973C@gmail.com')) {
        ownerId = 11; // Pro
      } else if (pgClient.email && pgClient.email.includes('zambelli.andrea.1973D@gmail.com')) {
        ownerId = 12; // Business
      } else if (pgClient.email && pgClient.email.includes('zambelli.andrea.1973@gmail.com')) {
        ownerId = 3; // Admin
      }
      
      // Genera codice univoco
      const uniqueCode = `${pgClient.first_name.charAt(0)}${pgClient.last_name.charAt(0)}${pgClient.id.toString().slice(-4)}`;
      
      // Crea cliente nel formato del sistema locale
      const localClient = {
        firstName: pgClient.first_name || '',
        lastName: pgClient.last_name || '',
        phone: pgClient.phone || '',
        email: pgClient.email || '',
        address: pgClient.address || '',
        birthday: pgClient.birthday || '',
        notes: pgClient.notes || '',
        isFrequent: pgClient.is_frequent || false,
        medicalNotes: pgClient.medical_notes || '',
        allergies: pgClient.allergies || '',
        hasConsent: pgClient.has_consent || false,
        ownerId: ownerId,
        uniqueCode: uniqueCode,
        id: pgClient.id,
        createdAt: new Date().toISOString()
      };
      
      // Aggiungi alla lista clienti
      storageData.clients.push([pgClient.id, localClient]);
      imported++;
      
      console.log(`Importato: ${localClient.firstName} ${localClient.lastName} (owner: ${ownerId}, code: ${uniqueCode})`);
    }
    
    // Aggiorna il counter
    if (!storageData.clientIdCounter) {
      storageData.clientIdCounter = Math.max(...postgresqlClients.map(c => c.id), clientIdCounter) + 1;
    }
    
    // Salva i dati aggiornati
    fs.writeFileSync(storageFile, JSON.stringify(storageData, null, 2));
    
    console.log(`\nImportazione completata:`);
    console.log(`- Clienti importati: ${imported}`);
    console.log(`- Clienti già presenti: ${skipped}`);
    console.log(`- Totale clienti nel sistema: ${storageData.clients.length}`);
    
  } catch (error) {
    console.error('Errore durante l\'importazione:', error);
  }
}

importClientsFromPostgreSQL();
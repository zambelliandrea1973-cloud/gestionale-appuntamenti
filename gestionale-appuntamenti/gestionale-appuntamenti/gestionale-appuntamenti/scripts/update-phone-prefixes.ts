/**
 * Script per aggiornare automaticamente i numeri di telefono dei clienti
 * aggiungendo il prefisso internazionale +39 (italiano) a quelli che non ne hanno già uno.
 */

import { db } from "../server/db";
import { clients } from "../shared/schema";
import { eq, and, not, like } from "drizzle-orm";

async function updatePhonePrefixes() {
  try {
    console.log("Inizio aggiornamento prefissi telefonici...");
    
    // Recupera tutti i clienti dal database
    const allClients = await db.select().from(clients);
    console.log(`Trovati ${allClients.length} clienti nel database.`);
    
    // Contatori per tenere traccia delle modifiche
    let updatedCount = 0;
    let skippedCount = 0;
    let emptyCount = 0;
    
    // Itera tutti i clienti
    for (const client of allClients) {
      // Salta i clienti senza numero di telefono
      if (!client.phone || client.phone.trim() === '') {
        console.log(`Cliente ID ${client.id} (${client.firstName} ${client.lastName}): nessun numero di telefono presente.`);
        emptyCount++;
        continue;
      }
      
      // Verifica se il numero inizia già con un prefisso internazionale (+)
      if (client.phone.startsWith('+')) {
        console.log(`Cliente ID ${client.id} (${client.firstName} ${client.lastName}): il numero ${client.phone} ha già un prefisso internazionale.`);
        skippedCount++;
        continue;
      }
      
      // Pulisci il numero rimuovendo eventuali spazi o caratteri non numerici all'inizio
      let cleanNumber = client.phone.trim();
      
      // Rimuovi eventuali zeri iniziali (in Italia il prefisso locale)
      while (cleanNumber.startsWith('0')) {
        cleanNumber = cleanNumber.substring(1);
      }
      
      // Se il numero inizia con "39", potrebbe essere già un prefisso senza il +
      if (cleanNumber.startsWith('39')) {
        cleanNumber = cleanNumber.substring(2);
      }
      
      // Aggiungi il prefisso italiano
      const updatedPhone = `+39${cleanNumber}`;
      
      // Aggiorna il numero nel database
      await db.update(clients)
        .set({ phone: updatedPhone })
        .where(eq(clients.id, client.id));
      
      console.log(`Cliente ID ${client.id} (${client.firstName} ${client.lastName}): aggiornato da ${client.phone} a ${updatedPhone}`);
      updatedCount++;
    }
    
    console.log("\n--- RIEPILOGO AGGIORNAMENTO ---");
    console.log(`Clienti totali: ${allClients.length}`);
    console.log(`Numeri aggiornati: ${updatedCount}`);
    console.log(`Numeri già con prefisso: ${skippedCount}`);
    console.log(`Clienti senza numero di telefono: ${emptyCount}`);
    console.log("Aggiornamento completato con successo!");
    
  } catch (error) {
    console.error("Si è verificato un errore durante l'aggiornamento dei prefissi:", error);
  } finally {
    // Chiudi la connessione al database
    process.exit(0);
  }
}

// Esegui lo script
updatePhonePrefixes();
import { db } from "./db";
import { paymentMethodsConfig } from "../shared/schema";
import * as fs from 'fs';

async function migratePaymentMethods() {
  try {
    console.log('🔄 Inizio migrazione metodi di pagamento dal JSON al database PostgreSQL...');
    
    // Leggi il file JSON
    const jsonPath = './payment_methods.json';
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const methods = JSON.parse(fileContent);
    
    console.log(`📦 Trovati ${methods.length} metodi nel file JSON`);
    
    for (const method of methods) {
      // Controlla se già esiste
      const existing = await db
        .select()
        .from(paymentMethodsConfig)
        .where((t) => t.methodId == method.id)
        .limit(1);
      
      if (existing.length === 0) {
        // Inserisce nuovo
        await db.insert(paymentMethodsConfig).values({
          methodId: method.id,
          name: method.name,
          enabled: method.enabled,
          config: method.config
        });
        console.log(`✅ Migrato: ${method.name}`);
      } else {
        console.log(`⏭️  Saltato: ${method.name} (già presente)`);
      }
    }
    
    console.log('✅ MIGRAZIONE COMPLETATA! Tutte le credenziali sono salvate in PostgreSQL');
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore migrazione:', error);
    process.exit(1);
  }
}

migratePaymentMethods();

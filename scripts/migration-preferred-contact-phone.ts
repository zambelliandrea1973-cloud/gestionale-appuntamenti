/**
 * Script per aggiungere la colonna preferred_contact_phone alla tabella notification_settings
 */
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addPreferredContactPhoneColumn() {
  try {
    console.log('Aggiunta colonna preferred_contact_phone alla tabella notification_settings...');
    
    // Verifica se la colonna esiste già per evitare errori
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notification_settings' 
      AND column_name = 'preferred_contact_phone'
    `;
    
    const columnCheck = await db.execute(sql.raw(checkColumnQuery));
    
    if (columnCheck.length === 0) {
      // La colonna non esiste, possiamo aggiungerla
      await db.execute(sql.raw(`
        ALTER TABLE notification_settings 
        ADD COLUMN preferred_contact_phone TEXT DEFAULT 'primary'
      `));
      console.log('Colonna preferred_contact_phone aggiunta con successo!');
    } else {
      console.log('La colonna preferred_contact_phone esiste già.');
    }
    
    console.log('Migrazione completata con successo!');
  } catch (error) {
    console.error('Errore durante la migrazione:', error);
    process.exit(1);
  }
}

addPreferredContactPhoneColumn().then(() => process.exit(0));
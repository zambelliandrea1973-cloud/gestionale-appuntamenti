/**
 * Script per creare la tabella notification_settings
 */
import { db } from "../server/db";
import { notificationSettings } from "../shared/schema";
import { sql } from "drizzle-orm";

async function createNotificationSettingsTable() {
  console.log("Esecuzione migrazione per notification_settings...");
  
  try {
    // Creo la tabella direttamente, se esiste già PostgreSQL genererà un errore
    // che cattureremo e gestiremo
    try {
      await db.execute(sql`
        CREATE TABLE notification_settings (
          id SERIAL PRIMARY KEY,
          email_enabled BOOLEAN DEFAULT FALSE,
          smtp_server TEXT,
          smtp_port INTEGER DEFAULT 587,
          smtp_username TEXT,
          smtp_password TEXT,
          sender_email TEXT,
          email_signature TEXT,
          sms_enabled BOOLEAN DEFAULT FALSE,
          sms_gateway_method TEXT DEFAULT 'direct',
          whatsapp_enabled BOOLEAN DEFAULT FALSE,
          whatsapp_method TEXT DEFAULT 'direct',
          twilio_enabled BOOLEAN DEFAULT FALSE,
          twilio_account_sid TEXT,
          twilio_auth_token TEXT,
          twilio_phone_number TEXT,
          notification_center_enabled BOOLEAN DEFAULT TRUE,
          default_reminder_time INTEGER DEFAULT 24,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("Tabella notification_settings creata con successo");
      
      // Inserisco le impostazioni predefinite
      await db.insert(notificationSettings).values({
        emailEnabled: false,
        smsEnabled: false,
        whatsappEnabled: false,
        twilioEnabled: false,
        notificationCenterEnabled: true,
        defaultReminderTime: 24
      });
      
      console.log("Inserimento impostazioni predefinite completato");
    } catch (err: any) {
      // Se la tabella esiste già, PostgreSQL restituirà un errore con codice "42P07"
      if (err.code === '42P07') {
        console.log("La tabella notification_settings esiste già");
      } else {
        // Se è un altro tipo di errore, lo propaghiamo
        throw err;
      }
    }
    
  } catch (error) {
    console.error("Errore durante la migrazione:", error);
    throw error;
  }
}

// Eseguo la migrazione
createNotificationSettingsTable()
  .then(() => {
    console.log("Migrazione completata");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Errore nella migrazione:", error);
    process.exit(1);
  });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema';

// Check that DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create the postgres client with secure configuration
const isProduction = process.env.NODE_ENV === 'production' || process.env.SLIPLANE_SKIP_GZIP === 'true';

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  ssl: 'prefer',
  prepare: false,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

// Additional implementations for the notification system
export const notificationSettingsRepository = {
  async get() {
    try {
      const settings = await db.select().from(schema.notificationSettings).limit(1);
      return settings.length > 0 ? settings[0] : null;
    } catch (error) {
      console.error('Error retrieving notification settings:', error);
      return null;
    }
  },

  async save(data: schema.InsertNotificationSettings) {
    try {
      // First check if a configuration already exists
      const existing = await this.get();
      
      if (existing) {
        // If it exists, update it
        return await this.update(existing.id, data);
      } else {
        // otherwise create a new configuration
        const [result] = await db.insert(schema.notificationSettings).values(data).returning();
        return result;
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  },

  async update(id: number, data: Partial<schema.InsertNotificationSettings>) {
    try {
      const [result] = await db
        .update(schema.notificationSettings)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(schema.notificationSettings.id, id))
        .returning();
      
      return result;
    } catch (error) {
      console.error(`Error updating notification settings ${id}:`, error);
      throw error;
    }
  }
};
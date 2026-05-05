// @ts-nocheck
import { db } from "./db";
import { paymentMethodsConfig } from "../shared/schema";
import * as fs from 'fs';

async function migratePaymentMethods() {
  try {
    console.log('🔄 Starting migration of payment methods from JSON to PostgreSQL database...');
    
    // Read the file JSON
    const jsonPath = './payment_methods.json';
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const methods = JSON.parse(fileContent);
    
    console.log(`📦 Found ${methods.length} methods in JSON file`);
    
    for (const method of methods) {
      // Check if it already exists
      const existing = await db
        .select()
        .from(paymentMethodsConfig)
        .where((t) => t.methodId == method.id)
        .limit(1);
      
      if (existing.length === 0) {
        // Insert new
        await db.insert(paymentMethodsConfig).values({
          methodId: method.id,
          name: method.name,
          enabled: method.enabled,
          config: method.config
        });
        console.log(`✅ Migrato: ${method.name}`);
      } else {
        console.log(`⏭️  Skipped: ${method.name} (already present)`);
      }
    }
    
    console.log('✅ MIGRATION COMPLETED! All credentials saved in PostgreSQL');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migratePaymentMethods();

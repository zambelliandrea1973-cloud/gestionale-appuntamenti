// @ts-nocheck
import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { clients, licenses, users } from '../../shared/schema';
import { eq, sql, count, or, and, not, like } from 'drizzle-orm';
import { generateClientCode as generateNewClientCode } from '../utils/clientCodeGenerator';
import { migrateClientCodes } from '../scripts/migrate-client-codes';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';

const router = Router();

async function generateProfessionistCode(userId: number): Promise<string> {
  return `PROF_${userId.toString().padStart(3, '0')}`;
}

async function getProfessionistCode(userId: number): Promise<string> {
  const storageData = loadStorageData();
  if (storageData.professionistCodes && storageData.professionistCodes[userId]) {
    return storageData.professionistCodes[userId];
  }
  const newCode = await generateProfessionistCode(userId);
  if (!storageData.professionistCodes) {
    storageData.professionistCodes = {};
  }
  storageData.professionistCodes[userId] = newCode;
  saveStorageData(storageData);
  logger.debug(`✅ New professional code generated for user ${userId}: ${newCode}`);
  return newCode;
}

async function generateClientCode(ownerId: number, clientId: number): Promise<string> {
  const profCode = await getProfessionistCode(ownerId);
  const clientNumber = clientId.toString().padStart(5, '0');
  return `${profCode}_C${clientNumber}`;
}

  // Preview next client code for the current user
router.get("/api/clients/next-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;

    // Use the same tenant resolution as POST /api/clients
    const tenantId = user.ownerId ?? user.tenantId ?? user.id;

    try {
      const [userRow] = await db.select({ assignmentCode: users.assignmentCode })
        .from(users)
        .where(eq(users.id, tenantId))
        .limit(1);

      if (!userRow?.assignmentCode) {
        return res.json({ previewCode: null });
      }

      const professionalCode = userRow.assignmentCode;

      const existingClients = await db.select({ newUniqueCode: clients.newUniqueCode })
        .from(clients)
        .where(eq(clients.ownerId, tenantId));

      let maxSequence = 0;
      const pattern = new RegExp(`^${professionalCode}-(\\d+)$`);
      for (const client of existingClients) {
        if (client.newUniqueCode) {
          const match = client.newUniqueCode.match(pattern);
          if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSequence) maxSequence = seq;
          }
        }
      }

      const nextSequence = maxSequence + 1;
      const paddedSequence = nextSequence.toString().padStart(3, '0');
      const previewCode = `${professionalCode}-${paddedSequence}`;

      return res.json({ previewCode });
    } catch (error: any) {
      logger.error("Error previewing next client code:", error);
      return res.status(500).json({ message: "Internal error" });
    }
  });

  // Simple linear system - Clients
  // NOTE: For admin, load ONLY their own clients (lazy loading for others)
router.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`🔍 [/api/clients] [${deviceType}] Request from user ID:${user.id}, type:${user.type}, email:${user.email}`);
    
    // FORZA ANTI-CACHE AGGRESSIVO PER MOBILE
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-clients-${Date.now()}-${Math.random()}`,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'User-Agent, x-device-type',
        'X-Accel-Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      logger.debug(`🔄 [${deviceType}] AGGRESSIVE anti-cache applied for mobile clients - timestamp: ${Date.now()}`);
    }
    
    const startTime = Date.now();
    
    const excludeImported = or(
      sql`${clients.email} IS NULL`,
      not(like(clients.email, '%@imported.local'))
    );
    
    let ownerCondition;
    if (user.type === 'admin') {
      ownerCondition = eq(clients.ownerId, user.id);
    } else if (user.type === 'staff') {
      // Demo account has no assignmentCode — show its own seeded clients directly
      if (user.username === '__demo__') {
        ownerCondition = eq(clients.ownerId, user.id);
      } else {
        const [staffUser] = await db.select().from(users).where(eq(users.id, user.id));
        if (!staffUser?.assignmentCode) {
          return res.json([]);
        }
        const userPrefix = staffUser.assignmentCode.substring(0, 3);
        ownerCondition = or(
          eq(clients.ownerId, user.id),
          like(clients.uniqueCode, `${userPrefix}-%`)
        );
      }
    } else {
      ownerCondition = eq(clients.ownerId, user.id);
    }
    
    const results = await db.select({
      id: clients.id,
      userId: clients.userId,
      firstName: clients.firstName,
      lastName: clients.lastName,
      phone: clients.phone,
      email: clients.email,
      address: clients.address,
      birthday: clients.birthday,
      notes: clients.notes,
      isFrequent: clients.isFrequent,
      medicalNotes: clients.medicalNotes,
      allergies: clients.allergies,
      createdAt: clients.createdAt,
      hasConsent: clients.hasConsent,
      ownerId: clients.ownerId,
      assignmentCode: clients.assignmentCode,
      uniqueCode: clients.uniqueCode,
      newUniqueCode: clients.newUniqueCode,
      taxCode: clients.taxCode,
      vatNumber: clients.vatNumber,
      emailBlocked: clients.emailBlocked,
      emailBlockedReason: clients.emailBlockedReason,
      isDemo: clients.isDemo,
      accessCount: sql<number>`COALESCE((SELECT COUNT(*) FROM client_accesses WHERE client_accesses.client_id = ${clients.id}), 0)`.as('accessCount'),
    })
      .from(clients)
      .where(and(ownerCondition, excludeImported))
      .orderBy(clients.lastName);
    
    const elapsed = Date.now() - startTime;
    logger.debug(`📦 [/api/clients] [${deviceType}] ${results.length} clients in ${elapsed}ms (1 query with count subquery)`);
    
    res.json(results);
  });

router.post("/api/clients/check-duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const tenantId = user.ownerId ?? user.tenantId ?? user.id;
    const { firstName, lastName, phone } = req.body;
    
    try {
      const conditions = [eq(clients.ownerId, tenantId)];
      
      if (firstName && lastName) {
        conditions.push(sql`LOWER(${clients.firstName}) = LOWER(${firstName})`);
        conditions.push(sql`LOWER(${clients.lastName}) = LOWER(${lastName})`);
      }
      
      const duplicates = await db.select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        phone: clients.phone,
        email: clients.email
      })
      .from(clients)
      .where(and(...conditions));
      
      const phoneNormalized = phone ? phone.replace(/[\s\-()]/g, '') : '';
      const matches = duplicates.filter(d => {
        const dPhone = (d.phone || '').replace(/[\s\-()]/g, '');
        const nameMatch = true;
        const phoneMatch = phoneNormalized && dPhone && (dPhone.includes(phoneNormalized) || phoneNormalized.includes(dPhone));
        return nameMatch || phoneMatch;
      });
      
      if (phone && phoneNormalized.length >= 6) {
        const phoneDuplicates = await db.select({
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          phone: clients.phone,
          email: clients.email
        })
        .from(clients)
        .where(and(
          eq(clients.ownerId, tenantId),
          sql`REPLACE(REPLACE(REPLACE(REPLACE(${clients.phone}, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ${'%' + phoneNormalized.slice(-8)}`
        ));
        
        for (const pd of phoneDuplicates) {
          if (!matches.find(m => m.id === pd.id)) {
            matches.push(pd);
          }
        }
      }
      
      res.json({ hasDuplicates: matches.length > 0, duplicates: matches });
    } catch (error: any) {
      console.error("Error checking duplicates:", error);
      res.status(500).json({ message: "Error checking duplicates" });
    }
  });

router.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    logger.debug(`🔄 [POST /api/clients] Request from user ${user.id} (${user.type})`);
    logger.debug(`📝 [POST /api/clients] Data received:`, req.body);
    
    try {
      const [clientCountResult] = await db.select({ count: count() })
        .from(clients)
        .where(eq(clients.ownerId, user.id));
      const currentClients = clientCountResult?.count || 0;
      
      const limits = {
        admin: 'unlimited',
        staff: 'unlimited', 
        customer: 1000,
        basic: 100
      };
      
      const userLimit = limits[user.type] || limits.basic;
      
      logger.debug(`📊 [POST /api/clients] Limit ${userLimit}, Current: ${currentClients}`);
      
      if (userLimit !== 'unlimited' && currentClients >= userLimit) {
        console.log(`❌ [POST /api/clients] Limit reached for user ${user.id}`);
        return res.status(403).json({ 
          message: `Client limit reached for plan ${user.type}`,
          limit: userLimit,
          current: currentClients,
          upgradeRequired: true
        });
      }
      
      // 🔄 USE POSTGRESQL: Create client (ID auto-generated by PostgreSQL)
      // 🔒 MULTI-TENANT SECURITY: use the same tenant resolution logic as GET
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      
      const { isDemo: _ignoreIsDemo, ...sanitizedBody } = req.body || {};
      const clientData: any = {
        userId: tenantId,  // ✅ Use tenantId instead of user.id for staff compatibility
        ownerId: tenantId,
        professionistCode: await getProfessionistCode(tenantId),
        ...sanitizedBody,
        // isDemo deliberately omitted: DB DEFAULT false handles it,
        // and this avoids errors on DBs where is_demo column doesn't exist yet
      };
      
      const newClient = await storage.createClient(clientData);
      
      let newUniqueCode = null;
      try {
        newUniqueCode = await generateNewClientCode(tenantId);
      } catch (error: any) {
        // Non-blocking: log and continue without newUniqueCode
        // (can fail if newUniqueCode column not yet on this DB instance)
        logger.debug(`⚠️ [POST /api/clients] newUniqueCode generation skipped: ${error.message}`);
      }
      
      let legacyUniqueCode = null;
      try {
        legacyUniqueCode = await generateClientCode(tenantId, newClient.id);
      } catch (error: any) {
        logger.debug(`⚠️ [POST /api/clients] legacyUniqueCode generation skipped: ${error.message}`);
      }
      
      if (legacyUniqueCode || newUniqueCode) {
        const updateData: any = {};
        if (legacyUniqueCode) updateData.uniqueCode = legacyUniqueCode;
        if (newUniqueCode) updateData.newUniqueCode = newUniqueCode;
        try {
          await storage.updateClient(newClient.id, updateData);
        } catch (updateErr: any) {
          logger.debug(`⚠️ [POST /api/clients] updateClient codes skipped: ${updateErr.message}`);
        }
      }
      
      const finalClient = await storage.getClient(newClient.id);

      // Auto-cleanup: remove demo clients if the user just created a real one
      if (finalClient && !finalClient.isDemo) {
        try {
          const { cleanupDemoDataIfNeeded } = await import('../services/onboardingDemoService');
          await cleanupDemoDataIfNeeded(tenantId, 'clients');
        } catch (cleanupErr) {
          console.error(`⚠️ [POST /api/clients] Error cleaning up demo:`, cleanupErr);
        }
      }
      
      logger.debug(`✅ [POST /api/clients] Client created: ${finalClient.firstName} ${finalClient.lastName}`);
      if (newUniqueCode) {
        console.log(`   📋 New code: ${newUniqueCode} | Legacy code: ${legacyUniqueCode}`);
      } else {
        console.log(`   📋 Legacy code: ${legacyUniqueCode} (professional without assignmentCode)`);
      }
      
      res.status(201).json(finalClient);
    } catch (error: any) {
      console.error(`❌ [POST /api/clients] General error:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin-only endpoint: Retrieve metadata for professional owners (id, assignmentCode, username)
router.get("/api/client-owners", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    // Only admin can access this endpoint
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Access denied - admin only" });
    }
    
    logger.debug(`🔍 [/api/client-owners] Metadata owners request from admin ${user.id}`);
    
    try {
      // Retrieve all clients visible to admin
      const allClients = await storage.getVisibleClientsForUser(user.id, user.type);
      
      // Estrae ownerIds unici
      const ownerIds = [...new Set(allClients.map(c => c.ownerId).filter(Boolean))];
      
      logger.debug(`📊 [/api/client-owners] Found ${ownerIds.length} unique professional owners: ${ownerIds.join(', ')}`);
      
      // Retrieve metadata for owners
      const ownersMetadata = await storage.getOwnersByIds(ownerIds);
      
      logger.debug(`✅ [/api/client-owners] Returning metadata for ${ownersMetadata.length} professionals`);
      
      res.json(ownersMetadata);
    } catch (error: any) {
      console.error(`❌ [/api/client-owners] Error:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint for importing contacts from CSV file
router.post("/api/clients/import-csv", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    // 🔒 MULTI-TENANT SECURITY: use the same tenant resolution logic
    // of the other routes (POST /api/clients and GET /api/clients).
    const ownerId = user.ownerId ?? user.tenantId ?? user.id;

    if (!ownerId) {
      console.error(`❌ [CSV IMPORT] Tenant not risolto for user ${user.id} (type=${user.type})`);
      return res.status(400).json({ success: false, error: 'Tenant non risolto' });
    }

    console.log(`📥 [CSV IMPORT] user ${user.id} (tenant ${ownerId}) starting CSV import`);

    try {
      const { contacts } = req.body;
      
      if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ success: false, error: 'Invalid data' });
      }

      let imported = 0;
      let skipped = 0;
      
      for (const contact of contacts) {
        // Check if the contact already exists (same email or phone)
        const existingClients = await storage.getClients(ownerId);
        const exists = existingClients.some(c => 
          (contact.email && c.email && c.email.toLowerCase() === contact.email.toLowerCase()) ||
          (contact.phone && c.phone && c.phone.replace(/\s/g, '') === contact.phone.replace(/\s/g, ''))
        );

        if (exists) {
          skipped++;
          continue;
        }

        // Create the new client
        const clientData = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          phone: contact.phone || '',
          notes: contact.notes || 'Importato da file CSV',
          userId: ownerId,
          ownerId,
          isDemo: false,
        };

        await storage.createClient(clientData);
        imported++;
      }

      logger.debug(`✅ [CSV IMPORT] Imported ${imported} contacts, skipped ${skipped}`);

      // Auto-cleanup: remove demo clients if the import added real ones
      if (imported > 0) {
        try {
          const { cleanupDemoDataIfNeeded } = await import('../services/onboardingDemoService');
          await cleanupDemoDataIfNeeded(ownerId, 'clients');
        } catch (cleanupErr) {
          console.error('⚠️ [CSV IMPORT] Error cleaning up demo:', cleanupErr);
        }
      }

      res.json({ 
        success: true, 
        imported, 
        skipped,
        message: `Imported ${imported} contacts` + (skipped > 0 ? `, ${skipped} already existing` : '')
      });
    } catch (error: any) {
      console.error('[CSV IMPORT] Error:', error);
      res.status(500).json({ success: false, error: 'Error during import' });
    }
  });

  // Admin-only endpoint: Automatic client code migration (old → new format)
router.post("/api/clients/migrate-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    // Only admin can execute the migration
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Access denied - admin only" });
    }
    
    logger.debug(`🚀 [/api/clients/migrate-codes] Admin ${user.id} started client code migration`);
    
    try {
      // Execute the migration script
      const stats = await migrateClientCodes();
      
      logger.debug(`✅ [/api/clients/migrate-codes] Migration completed successfully`);
      
      res.json({
        success: true,
        message: 'Migration completed',
        stats: {
          total: stats.total,
          migrated: stats.migrated,
          skipped: stats.skipped,
          errors: stats.errors
        },
        details: stats.details
      });
    } catch (error: any) {
      console.error(`❌ [/api/clients/migrate-codes] Error during migration:`, error);
      res.status(500).json({ 
        success: false,
        message: "Error during migration",
        error: error.message 
      });
    }
  });

  // Helper function to generate random hashes
  function generateRandomHash(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // ENDPOINT per normalizzare all codici clients (fix one-time)
router.post("/api/clients/normalize-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    try {
      const storageData = loadStorageData();
      let updatedCount = 0;
      
      // Update all clients of the user with new sequential IDs
      const userClients = (storageData.clients || [])
        .filter(([id, client]) => client.ownerId === user.id)
        .sort((a, b) => a[1].id - b[1].id); // Sort by existing ID
      
      const userIdBase = user.id * 1000;
      
      for (let i = 0; i < userClients.length; i++) {
        const [oldId, client] = userClients[i];
        const newSequentialId = userIdBase + i + 1;
        
        // Update the client ID and regenerate the unique code
        client.id = newSequentialId;
        const professionistCode = await getProfessionistCode(user.id);
        client.uniqueCode = `${professionistCode}_CLIENT_${newSequentialId}_${generateRandomHash()}`;
        
        // Replace in storage with new ID
        const index = storageData.clients.findIndex(([id, c]) => id === oldId);
        if (index !== -1) {
          storageData.clients[index] = [newSequentialId, client];
          updatedCount++;
        }
        
        logger.debug(`🔄 NORMALIZED: ${client.firstName} ${client.lastName} - ${oldId} → ${newSequentialId}`);
      }
      
      saveStorageData(storageData);
      logger.debug(`✅ NORMALIZATION completed: ${updatedCount} clients updated`);
      
      res.json({ 
        success: true, 
        message: `${updatedCount} clients normalized successfully`,
        updatedCount 
      });
    } catch (error: any) {
      console.error("❌ Error normalizing:", error);
      res.status(500).json({ message: "Error during normalization" });
    }
  });

  // PUT /api/clients/:id - Update existing client
router.put("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }

    try {
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Request from user ID:${user.id}, type:${user.type}, email:${user.email}`);
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Data received:`, req.body);

      // 🔄 USE POSTGRESQL: Find the existing client
      const existingClient = await storage.getClient(clientId);
      
      if (!existingClient) {
        console.log(`❌ [PUT /api/clients/${clientId}] Client not found`);
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Verify ownership per users non-staff
      if (user.type !== 'staff' && existingClient.ownerId !== user.id) {
        console.log(`❌ [PUT /api/clients/${clientId}] Access denied - client does not belong to user`);
        return res.status(403).json({ message: "Access denied" });
      }

      // 🔄 USE POSTGRESQL: Update the client
      await storage.updateClient(clientId, req.body);
      
      // Reload the updated client
      const updatedClient = await storage.getClient(clientId);
      
      logger.debug(`✅ [PUT /api/clients/${clientId}] Client updated successfully in PostgreSQL`);
      res.json(updatedClient);
      
    } catch (error: any) {
      console.error(`❌ [PUT /api/clients/${clientId}] Error during update:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

export default router;

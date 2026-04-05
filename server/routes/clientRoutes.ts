import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { clients, licenses } from '../../shared/schema';
import { eq, sql, count, or, and, not } from 'drizzle-orm';
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
  logger.debug(`✅ Nuovo codice professionista generato per utente ${userId}: ${newCode}`);
  return newCode;
}

async function generateClientCode(ownerId: number, clientId: number): Promise<string> {
  const profCode = await getProfessionistCode(ownerId);
  const clientNumber = clientId.toString().padStart(5, '0');
  return `${profCode}_C${clientNumber}`;
}

  // Sistema lineare semplice - Clienti
  // NOTA: Per admin, carica SOLO i propri clienti (lazy loading per gli altri)
router.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`🔍 [/api/clients] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.email}`);
    
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
      logger.debug(`🔄 [${deviceType}] Anti-cache AGGRESSIVO applicato per clienti mobile - timestamp: ${Date.now()}`);
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
      const [staffUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (!staffUser?.assignmentCode) {
        return res.json([]);
      }
      const userPrefix = staffUser.assignmentCode.substring(0, 3);
      ownerCondition = or(
        eq(clients.ownerId, user.id),
        like(clients.uniqueCode, `${userPrefix}-%`)
      );
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
      accessCount: sql<number>`COALESCE((SELECT COUNT(*) FROM client_accesses WHERE client_accesses.client_id = ${clients.id}), 0)`.as('accessCount'),
    })
      .from(clients)
      .where(and(ownerCondition, excludeImported))
      .orderBy(clients.lastName);
    
    const elapsed = Date.now() - startTime;
    logger.debug(`📦 [/api/clients] [${deviceType}] ${results.length} clienti in ${elapsed}ms (1 query con subquery conteggio)`);
    
    res.json(results);
  });

router.post("/api/clients/check-duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
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
    } catch (error) {
      console.error("Errore check duplicati:", error);
      res.status(500).json({ message: "Errore controllo duplicati" });
    }
  });

router.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    logger.debug(`🔄 [POST /api/clients] Richiesta da utente ${user.id} (${user.type})`);
    logger.debug(`📝 [POST /api/clients] Dati ricevuti:`, req.body);
    
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
      
      logger.debug(`📊 [POST /api/clients] Limite ${userLimit}, Correnti: ${currentClients}`);
      
      if (userLimit !== 'unlimited' && currentClients >= userLimit) {
        console.log(`❌ [POST /api/clients] Limite raggiunto per utente ${user.id}`);
        return res.status(403).json({ 
          message: `Limite clienti raggiunto per piano ${user.type}`,
          limit: userLimit,
          current: currentClients,
          upgradeRequired: true
        });
      }
      
      // 🔄 USA POSTGRESQL: Crea cliente (ID auto-generato da PostgreSQL)
      // 🔒 MULTI-TENANT SECURITY: usa la stessa logica di tenant resolution del GET
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      
      const clientData = {
        userId: tenantId,  // ✅ Usa tenantId invece di user.id per staff compatibility
        ownerId: tenantId,
        professionistCode: await getProfessionistCode(tenantId),
        ...req.body
      };
      
      const newClient = await storage.createClient(clientData);
      
      let newUniqueCode = null;
      try {
        newUniqueCode = await generateNewClientCode(tenantId);
      } catch (error: any) {
        if (error.message && error.message.includes('Codice professionista non trovato')) {
          logger.debug(`⚠️ [POST /api/clients] Professionista senza assignmentCode, skip newUniqueCode generation`);
        } else {
          throw error;
        }
      }
      
      const legacyUniqueCode = await generateClientCode(tenantId, newClient.id);
      
      const updateData: any = { uniqueCode: legacyUniqueCode };
      if (newUniqueCode) {
        updateData.newUniqueCode = newUniqueCode;
      }
      
      await storage.updateClient(newClient.id, updateData);
      
      const finalClient = await storage.getClient(newClient.id);
      
      logger.debug(`✅ [POST /api/clients] Cliente creato: ${finalClient.firstName} ${finalClient.lastName}`);
      if (newUniqueCode) {
        console.log(`   📋 Codice nuovo: ${newUniqueCode} | Codice legacy: ${legacyUniqueCode}`);
      } else {
        console.log(`   📋 Codice legacy: ${legacyUniqueCode} (professionista senza assignmentCode)`);
      }
      
      res.status(201).json(finalClient);
    } catch (error) {
      console.error(`❌ [POST /api/clients] Errore generale:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Admin-only endpoint: Recupera metadata professionisti owners (id, assignmentCode, username)
router.get("/api/client-owners", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    // Solo admin può accedere a questo endpoint
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato - solo admin" });
    }
    
    logger.debug(`🔍 [/api/client-owners] Richiesta metadata owners da admin ${user.id}`);
    
    try {
      // Recupera tutti i clienti visibili all'admin
      const allClients = await storage.getVisibleClientsForUser(user.id, user.type);
      
      // Estrae ownerIds unici
      const ownerIds = [...new Set(allClients.map(c => c.ownerId).filter(Boolean))];
      
      logger.debug(`📊 [/api/client-owners] Trovati ${ownerIds.length} professionisti owner unici: ${ownerIds.join(', ')}`);
      
      // Recupera metadata per gli owners
      const ownersMetadata = await storage.getOwnersByIds(ownerIds);
      
      logger.debug(`✅ [/api/client-owners] Ritorno metadata per ${ownersMetadata.length} professionisti`);
      
      res.json(ownersMetadata);
    } catch (error) {
      console.error(`❌ [/api/client-owners] Errore:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Endpoint per importazione contatti da file CSV
router.post("/api/clients/import-csv", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const ownerId = user.type === 'staff' ? user.userId : user.id;

    console.log(`📥 [CSV IMPORT] Utente ${user.id} avvia importazione CSV`);

    try {
      const { contacts } = req.body;
      
      if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ success: false, error: 'Dati non validi' });
      }

      let imported = 0;
      let skipped = 0;
      
      for (const contact of contacts) {
        // Verifica se il contatto esiste già (stesso email o telefono)
        const existingClients = await storage.getClients(ownerId);
        const exists = existingClients.some(c => 
          (contact.email && c.email && c.email.toLowerCase() === contact.email.toLowerCase()) ||
          (contact.phone && c.phone && c.phone.replace(/\s/g, '') === contact.phone.replace(/\s/g, ''))
        );

        if (exists) {
          skipped++;
          continue;
        }

        // Crea il nuovo cliente
        const clientData = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          phone: contact.phone || '',
          notes: contact.notes || 'Importato da file CSV',
          userId: ownerId,
        };

        await storage.createClient(clientData);
        imported++;
      }

      logger.debug(`✅ [CSV IMPORT] Importati ${imported} contatti, saltati ${skipped}`);

      res.json({ 
        success: true, 
        imported, 
        skipped,
        message: `Importati ${imported} contatti` + (skipped > 0 ? `, ${skipped} già esistenti` : '')
      });
    } catch (error) {
      console.error('[CSV IMPORT] Errore:', error);
      res.status(500).json({ success: false, error: 'Errore durante l\'importazione' });
    }
  });

  // Admin-only endpoint: Migrazione automatica codici clienti (vecchio → nuovo formato)
router.post("/api/clients/migrate-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    // Solo admin può eseguire la migrazione
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato - solo admin" });
    }
    
    logger.debug(`🚀 [/api/clients/migrate-codes] Admin ${user.id} ha avviato la migrazione codici clienti`);
    
    try {
      // Esegui lo script di migrazione
      const stats = await migrateClientCodes();
      
      logger.debug(`✅ [/api/clients/migrate-codes] Migrazione completata con successo`);
      
      res.json({
        success: true,
        message: 'Migrazione completata',
        stats: {
          total: stats.total,
          migrated: stats.migrated,
          skipped: stats.skipped,
          errors: stats.errors
        },
        details: stats.details
      });
    } catch (error: any) {
      console.error(`❌ [/api/clients/migrate-codes] Errore durante la migrazione:`, error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante la migrazione",
        error: error.message 
      });
    }
  });

  // Helper function per generare hash casuali
  function generateRandomHash(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // ENDPOINT per normalizzare tutti i codici clienti (fix one-time)
router.post("/api/clients/normalize-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const storageData = loadStorageData();
      let updatedCount = 0;
      
      // Aggiorna tutti i clienti dell'utente con nuovi ID sequenziali
      const userClients = (storageData.clients || [])
        .filter(([id, client]) => client.ownerId === user.id)
        .sort((a, b) => a[1].id - b[1].id); // Ordina per ID esistente
      
      const userIdBase = user.id * 1000;
      
      for (let i = 0; i < userClients.length; i++) {
        const [oldId, client] = userClients[i];
        const newSequentialId = userIdBase + i + 1;
        
        // Aggiorna l'ID del cliente e rigenera il codice univoco
        client.id = newSequentialId;
        const professionistCode = await getProfessionistCode(user.id);
        client.uniqueCode = `${professionistCode}_CLIENT_${newSequentialId}_${generateRandomHash()}`;
        
        // Sostituisci nel storage con nuovo ID
        const index = storageData.clients.findIndex(([id, c]) => id === oldId);
        if (index !== -1) {
          storageData.clients[index] = [newSequentialId, client];
          updatedCount++;
        }
        
        logger.debug(`🔄 NORMALIZZATO: ${client.firstName} ${client.lastName} - ${oldId} → ${newSequentialId}`);
      }
      
      saveStorageData(storageData);
      logger.debug(`✅ NORMALIZZAZIONE COMPLETATA: ${updatedCount} clienti aggiornati`);
      
      res.json({ 
        success: true, 
        message: `${updatedCount} clienti normalizzati con successo`,
        updatedCount 
      });
    } catch (error) {
      console.error("❌ Errore normalizzazione:", error);
      res.status(500).json({ message: "Errore durante la normalizzazione" });
    }
  });

  // PUT /api/clients/:id - Aggiorna cliente esistente
router.put("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }

    try {
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.email}`);
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Dati ricevuti:`, req.body);

      // 🔄 USA POSTGRESQL: Trova il cliente esistente
      const existingClient = await storage.getClient(clientId);
      
      if (!existingClient) {
        console.log(`❌ [PUT /api/clients/${clientId}] Cliente non trovato`);
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Verifica ownership per utenti non-staff
      if (user.type !== 'staff' && existingClient.ownerId !== user.id) {
        console.log(`❌ [PUT /api/clients/${clientId}] Accesso negato - cliente non appartiene all'utente`);
        return res.status(403).json({ message: "Accesso negato" });
      }

      // 🔄 USA POSTGRESQL: Aggiorna il cliente
      await storage.updateClient(clientId, req.body);
      
      // Ricarica il cliente aggiornato
      const updatedClient = await storage.getClient(clientId);
      
      logger.debug(`✅ [PUT /api/clients/${clientId}] Cliente aggiornato con successo in PostgreSQL`);
      res.json(updatedClient);
      
    } catch (error) {
      console.error(`❌ [PUT /api/clients/${clientId}] Errore durante l'aggiornamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

export default router;

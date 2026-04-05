import { Router } from 'express';
import { db } from '../db';
import { clients, users, clientAccesses, userSettings as userSettingsTable } from '../../shared/schema';
import { eq, or, not, like, sql, count } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';

const router = Router();

router.get("/api/admin/clients-summary", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Accesso riservato agli amministratori" });
  }
  
  console.log(`📊 [ADMIN-SUMMARY] Richiesta riepilogo clienti per admin ${user.id}`);
  
  try {
    const summary = await db.select({
      ownerId: clients.ownerId,
      clientCount: count()
    })
    .from(clients)
    .where(or(
      sql`${clients.email} IS NULL`,
      not(like(clients.email, '%@imported.local'))
    ))
    .groupBy(clients.ownerId);
    
    const enrichedSummary = await Promise.all(summary.map(async (item) => {
      if (!item.ownerId) return { ...item, ownerName: 'Sconosciuto', ownerEmail: null };
      
      const [owner] = await db.select({
        id: users.id,
        email: users.email,
        username: users.username
      }).from(users).where(eq(users.id, item.ownerId));
      
      let ownerName = owner?.email || owner?.username || 'Sconosciuto';
      
      if (owner) {
        const [settings] = await db.select({
          businessName: userSettingsTable.businessName
        }).from(userSettingsTable).where(eq(userSettingsTable.userId, owner.id));
        
        if (settings?.businessName) {
          ownerName = settings.businessName;
        }
      }
      
      return {
        ownerId: item.ownerId,
        clientCount: item.clientCount,
        ownerName,
        ownerEmail: owner?.email || null,
        isCurrentUser: item.ownerId === user.id
      };
    }));
    
    enrichedSummary.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return b.clientCount - a.clientCount;
    });
    
    console.log(`📊 [ADMIN-SUMMARY] Trovati ${enrichedSummary.length} professionisti con clienti`);
    res.json(enrichedSummary);
  } catch (error) {
    console.error(`❌ [ADMIN-SUMMARY] Errore:`, error);
    res.status(500).json({ message: "Errore nel recupero riepilogo" });
  }
});

router.get("/api/admin/clients-by-owner/:ownerId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Accesso riservato agli amministratori" });
  }
  
  const ownerId = parseInt(req.params.ownerId, 10);
  if (isNaN(ownerId)) {
    return res.status(400).json({ message: "ownerId non valido" });
  }
  
  console.log(`📦 [ADMIN-CLIENTS-BY-OWNER] Admin ${user.id} richiede clienti di ownerId ${ownerId}`);
  
  try {
    const ownerClients = await db.select().from(clients)
      .where(eq(clients.ownerId, ownerId))
      .orderBy(clients.lastName);
    
    const ownerClientIds = ownerClients.map(c => c.id);
    let ownerAccessMap: Record<number, number> = {};
    if (ownerClientIds.length > 0) {
      const ownerAccessCounts = await db.select({
        clientId: clientAccesses.clientId,
        count: count()
      })
        .from(clientAccesses)
        .where(sql`${clientAccesses.clientId} IN (${sql.join(ownerClientIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(clientAccesses.clientId);
      for (const row of ownerAccessCounts) {
        ownerAccessMap[row.clientId] = row.count;
      }
    }
    const clientsWithAccessCount = ownerClients.map(client => ({
      ...client,
      accessCount: ownerAccessMap[client.id] || 0
    }));
    
    console.log(`📦 [ADMIN-CLIENTS-BY-OWNER] Caricati ${clientsWithAccessCount.length} clienti per ownerId ${ownerId}`);
    res.json(clientsWithAccessCount);
  } catch (error) {
    console.error(`❌ [ADMIN-CLIENTS-BY-OWNER] Errore:`, error);
    res.status(500).json({ message: "Errore nel caricamento clienti" });
  }
});

router.get("/api/admin/notifications", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Accesso negato" });
  }
  
  const storageData = loadStorageData();
  const notifications = storageData.adminNotifications || [];
  
  const sortedNotifications = notifications.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  res.json(sortedNotifications);
});

router.post("/api/admin/notifications/:id/read", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Accesso negato" });
  }
  
  const notificationId = parseInt(req.params.id);
  const storageData = loadStorageData();
  
  if (storageData.adminNotifications) {
    const notification = storageData.adminNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      saveStorageData(storageData);
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Notifica non trovata" });
    }
  } else {
    res.status(404).json({ message: "Notifica non trovata" });
  }
});

export default router;

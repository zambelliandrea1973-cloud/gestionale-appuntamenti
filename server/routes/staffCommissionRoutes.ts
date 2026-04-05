import { Router } from 'express';
import { storage } from '../storage';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';

const router = Router();

router.get("/api/staff/users", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può accedere alla gestione staff" });
  }
  
  try {
    console.log("🔵 [/api/staff/users] SIMPLE-ROUTES - Recupero staff da PostgreSQL");
    
    const staffUsers = await storage.getAllStaffUsers();
    console.log(`🔵 [/api/staff/users] Trovati ${staffUsers.length} utenti dal database`);
    
    const safeUsers = staffUsers.map(staffUser => {
      const { password, ...userWithoutPassword } = staffUser;
      
      const referralCode = staffUser.id === 14 ? "BUS14" : 
                         staffUser.id === 16 ? "FAV16" : 
                         staffUser.id === 8 ? "ZAM08" : 
                         `REF${staffUser.id}`;
      
      return {
        ...userWithoutPassword,
        referralCode: referralCode
      };
    });
    
    console.log(`✅ [/api/staff/users] Invio ${safeUsers.length} utenti staff`);
    res.json(safeUsers);
  } catch (error) {
    console.error("❌ [/api/staff/users] Errore:", error);
    res.status(500).json({ message: "Errore nel caricamento staff" });
  }
});

router.patch("/api/staff/:userId/banking", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può modificare i dati bancari staff" });
  }
  
  try {
    const userId = parseInt(req.params.userId);
    const { iban, bic, bankName, accountHolder } = req.body;
    
    console.log(`💳 [BANKING] Aggiornamento dati bancari per staff ${userId}:`, { iban, bic, bankName, accountHolder });
    
    const updated = await storage.updateStaffBanking(userId, {
      iban,
      bic,
      bankName,
      accountHolder
    });
    
    if (!updated) {
      return res.status(404).json({ message: "Staff non trovato" });
    }
    
    console.log(`✅ [BANKING] Dati bancari aggiornati per staff ${userId}`);
    res.json({ success: true, message: "Dati bancari aggiornati con successo" });
  } catch (error) {
    console.error("❌ [BANKING] Errore:", error);
    res.status(500).json({ message: "Errore nel salvataggio dati bancari" });
  }
});

router.get("/api/referral/codes", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin' && user.type !== 'business') {
    return res.status(403).json({ message: "Solo admin e business possono accedere ai referral" });
  }
  
  const referralCodes = loadStorageData().referralCodes || [];
  
  let userCodes;
  if (user.type === 'admin') {
    userCodes = referralCodes;
  } else {
    userCodes = referralCodes.filter(code => code.ownerId === user.id);
  }
  
  res.json(userCodes);
});

router.get("/api/referral-overview", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può accedere alla panoramica referral" });
  }
  
  try {
    const storageData = loadStorageData();
    const referralCommissions = storageData.referralCommissions || [];
    
    const allUsersArray = Object.entries(storageData.users || {});
    const staffMembers = allUsersArray
      .filter(([key, userEntry]) => {
        const userData = (userEntry as any)[1];
        return userData && userData.type === 'staff';
      })
      .map(([key, userEntry]) => {
        const userData = (userEntry as any)[1];
        return {
          staffId: userData.id,
          staffName: userData.username,
          staffEmail: userData.email || userData.username
        };
      });
    
    const staffStats = staffMembers.map(staff => {
      const staffCommissions = referralCommissions.filter((commission: any) => 
        commission.referrerId === staff.staffId && commission.status === 'active'
      );
      
      const sponsoredCount = staffCommissions.length;
      const totalCommissions = staffCommissions.reduce((sum: number, commission: any) => 
        sum + (commission.monthlyAmount || 0), 0
      );
      const paidCommissions = staffCommissions
        .filter((commission: any) => commission.isPaid)
        .reduce((sum: number, commission: any) => sum + (commission.monthlyAmount || 0), 0);
      const pendingCommissions = totalCommissions - paidCommissions;
      
      return {
        ...staff,
        sponsoredCount,
        totalCommissions,
        paidCommissions,
        pendingCommissions
      };
    }).filter(staff => staff.sponsoredCount > 0);
    
    const totals = {
      totalSponsored: staffStats.reduce((sum, staff) => sum + staff.sponsoredCount, 0),
      totalCommissions: staffStats.reduce((sum, staff) => sum + staff.totalCommissions, 0),
      totalPaid: staffStats.reduce((sum, staff) => sum + staff.paidCommissions, 0),
      totalPending: staffStats.reduce((sum, staff) => sum + staff.pendingCommissions, 0)
    };
    
    const response = {
      staffStats,
      totals,
      commissionRate: 25,
      minSponsorshipForCommission: 3
    };
    
    res.json(response);
  } catch (error) {
    console.error('Errore nel caricamento panoramica referral:', error);
    res.status(500).json({ message: "Errore nel caricamento dei dati referral" });
  }
});

router.get("/api/staff-commissions/all", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può accedere alle commissioni staff" });
  }
  
  try {
    const storageData = loadStorageData();
    const referralCommissions = storageData.referralCommissions || [];
    
    const allCommissions = await Promise.all(
      referralCommissions.map(async (commission) => {
        const referredUser = await storage.getUser(commission.referredId);
        const subscription = await storage.getSubscriptionByUserId(commission.referredId);
        
        const staffUser = await storage.getUser(commission.referrerId);
        
        return {
          id: commission.id,
          commissionAmount: commission.monthlyAmount || 0,
          isPaid: commission.isPaid || false,
          paidAt: commission.paidAt || null,
          createdAt: commission.createdAt || commission.startDate || new Date().toISOString(),
          notes: commission.notes || null,
          licenseCode: subscription?.licenseCode || `REF-${commission.id}`,
          licenseType: subscription?.licenseType || 'business',
          customerEmail: referredUser?.email || referredUser?.username || 'cliente@email.com',
          staffName: `${staffUser?.firstName || ''} ${staffUser?.lastName || ''}`.trim() || staffUser?.username || 'Staff',
          staffEmail: staffUser?.email || staffUser?.username || 'staff@email.com'
        };
      })
    );
    
    res.json(allCommissions);
  } catch (error) {
    console.error('Errore nel caricamento di tutte le commissioni:', error);
    res.status(500).json({ message: "Errore nel caricamento delle commissioni" });
  }
});

router.get("/api/staff-commissions/:staffId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può accedere alle commissioni staff" });
  }
  
  try {
    const staffId = parseInt(req.params.staffId);
    const storageData = loadStorageData();
    const referralCommissions = storageData.referralCommissions || [];
    
    const staffCommissions = await Promise.all(
      referralCommissions
        .filter(commission => commission.referrerId === staffId)
        .map(async (commission) => {
          const referredUser = await storage.getUser(commission.referredId);
          const subscription = await storage.getSubscriptionByUserId(commission.referredId);
          
          return {
            id: commission.id,
            commissionAmount: commission.monthlyAmount || 0,
            isPaid: commission.isPaid || false,
            paidAt: commission.paidAt || null,
            createdAt: commission.createdAt || commission.startDate || new Date().toISOString(),
            notes: commission.notes || null,
            licenseCode: subscription?.licenseCode || `REF-${commission.id}`,
            licenseType: subscription?.licenseType || 'business',
            customerEmail: referredUser?.email || referredUser?.username || 'cliente@email.com'
          };
        })
    );
    
    res.json(staffCommissions);
  } catch (error) {
    console.error('Errore nel caricamento commissioni staff:', error);
    res.status(500).json({ message: "Errore nel caricamento delle commissioni" });
  }
});

router.post("/api/staff-commissions/:commissionId/mark-paid", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Solo admin può aggiornare le commissioni" });
  }
  
  try {
    const commissionId = parseInt(req.params.commissionId);
    const { notes } = req.body;
    
    const storageData = loadStorageData();
    const referralCommissions = storageData.referralCommissions || [];
    
    const commissionIndex = referralCommissions.findIndex(c => c.id === commissionId);
    if (commissionIndex === -1) {
      return res.status(404).json({ message: "Commissione non trovata" });
    }
    
    referralCommissions[commissionIndex] = {
      ...referralCommissions[commissionIndex],
      isPaid: true,
      paidAt: new Date().toISOString(),
      notes: notes || referralCommissions[commissionIndex].notes
    };
    
    storageData.referralCommissions = referralCommissions;
    saveStorageData(storageData);
    
    res.json({ success: true, message: "Commissione segnata come pagata" });
  } catch (error) {
    console.error('Errore nell\'aggiornamento commissione:', error);
    res.status(500).json({ message: "Errore nell'aggiornamento della commissione" });
  }
});

export default router;

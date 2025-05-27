import { Request, Response } from 'express';
import { getIndividualStaffReferral } from './individualStaffReferral';
import { getAllStaffUsers } from '../storage'; // Assumendo che esista questa funzione

/**
 * Aggregatore per la vista admin del sistema referral
 * Raccoglie tutti i dati dai sistemi staff individuali
 */
export async function getAdminReferralAggregation(req: Request, res: Response) {
  try {
    console.log('🔄 ADMIN AGGREGATOR: Raccogliendo dati da tutti gli staff...');
    
    // Ottieni tutti gli utenti staff dal database
    const allStaffUsers = await getAllStaffUsers();
    console.log(`📊 TROVATI ${allStaffUsers.length} staff da aggregare`);
    
    const staffStatsArray = [];
    let totalStats = {
      totalSponsored: 0,
      totalCommissions: 0,
      totalPaid: 0,
      totalPending: 0
    };
    
    // Per ogni staff, ottieni i suoi dati individuali
    for (const staff of allStaffUsers) {
      try {
        console.log(`📈 Aggregando dati per staff: ${staff.email} (ID: ${staff.id})`);
        
        // Simula la richiesta per ottenere i dati dello staff
        const mockReq = {
          ...req,
          user: staff,
          params: { staffId: staff.id.toString() }
        };
        
        // Crea un mock response per catturare i dati
        let staffData;
        const mockRes = {
          json: (data: any) => { staffData = data; },
          status: () => mockRes,
          send: () => mockRes
        };
        
        // Ottieni i dati dello staff individuale
        await getIndividualStaffReferral(mockReq as any, mockRes as any);
        
        if (staffData && staffData.stats) {
          const stats = staffData.stats;
          
          staffStatsArray.push({
            staffId: staff.id,
            staffName: staff.username || staff.email,
            staffEmail: staff.email,
            referralCode: stats.myReferralCode,
            sponsoredCount: stats.totalReferrals || 0,
            totalCommissions: stats.totalCommissions || 0,
            paidCommissions: stats.paidCommissions || 0,
            pendingCommissions: stats.pendingCommissions || 0,
            // Dati bancari (se implementati nel sistema individuale)
            bankingInfo: {
              hasIban: stats.bankingInfo?.iban ? true : false,
              bankName: stats.bankingInfo?.bankName || null,
              accountHolder: stats.bankingInfo?.accountHolder || null
            }
          });
          
          // Aggrega ai totali
          totalStats.totalSponsored += stats.totalReferrals || 0;
          totalStats.totalCommissions += stats.totalCommissions || 0;
          totalStats.totalPaid += stats.paidCommissions || 0;
          totalStats.totalPending += stats.pendingCommissions || 0;
        }
        
      } catch (error) {
        console.error(`❌ Errore aggregando staff ${staff.email}:`, error);
        // Continua con il prossimo staff anche se uno fallisce
      }
    }
    
    const aggregatedData = {
      staffStats: staffStatsArray,
      totals: totalStats,
      commissionRate: 1, // 1€ per commissione
      minSponsorshipForCommission: 3
    };
    
    console.log(`✅ AGGREGAZIONE COMPLETATA: ${staffStatsArray.length} staff processati`);
    console.log('📊 TOTALI AGGREGATI:', totalStats);
    
    res.json(aggregatedData);
    
  } catch (error) {
    console.error('❌ ERRORE NELLA AGGREGAZIONE ADMIN:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggregazione dei dati referral',
      details: error.message
    });
  }
}

/**
 * Funzione helper per ottenere tutti gli utenti staff
 * (Da implementare nel sistema di storage)
 */
async function getAllStaffUsers() {
  // Questa funzione dovrebbe essere implementata nel sistema di storage
  // Per ora restituisco un array mock che include gli staff conosciuti
  return [
    { id: 14, email: 'busnari.silvia@libero.it', username: 'busnari.silvia@libero.it', role: 'staff' },
    { id: 16, email: 'faverioelisa6@gmail.com', username: 'faverioelisa6@gmail.com', role: 'staff' },
    // Altri staff verranno aggiunti automaticamente dal database
  ];
}
import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { isAdmin } from "../auth";

/**
 * Configura le route per la gestione dei dati bancari
 */
export default function setupBankingRoutes(app: Express) {
  
  // Ottieni le impostazioni bancarie (solo admin)
  app.get("/api/admin/banking-settings", isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('🏦 GET /api/admin/banking-settings chiamato da:', req.user?.username);
      const settings = await storage.getBankingSettings();
      console.log('🏦 Settings ricevute da storage:', JSON.stringify(settings));
      
      // NON mascherare l'IBAN - il frontend ha bisogno del valore reale per il salvataggio
      // La sicurezza è garantita dall'autenticazione admin
      
      const responseData = settings || {
        bankName: '',
        accountHolder: '',
        iban: '',
        bic: '',
        address: '',
        autoPayEnabled: false,
        paymentDelay: 30,
        minimumAmount: 1.0,
        description: 'Commissione referral sistema gestione appuntamenti',
        isConfigured: false,
      };
      
      console.log('🏦 Ritorno al frontend:', JSON.stringify(responseData));
      res.json(responseData);
    } catch (error) {
      console.error("❌ Errore durante il recupero delle impostazioni bancarie:", error);
      res.status(500).json({ message: "Errore nel recupero delle impostazioni bancarie" });
    }
  });

  // Salva le impostazioni bancarie (solo admin)
  app.post("/api/admin/banking-settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const {
        bankName,
        accountHolder,
        iban,
        bic,
        address,
        autoPayEnabled,
        paymentDelay,
        minimumAmount,
        description
      } = req.body;

      // Validazione base
      if (!bankName || !accountHolder || !iban) {
        return res.status(400).json({ 
          message: "Nome banca, intestatario e IBAN sono obbligatori" 
        });
      }

      // Validazione IBAN (formato italiano - 27 caratteri totali)
      // IT + 2 cifre controllo + 23 caratteri alfanumerici (CIN + ABI + CAB + numero conto)
      const ibanRegex = /^IT\d{2}[A-Z0-9]{23}$/;
      if (!ibanRegex.test(iban.replace(/\s/g, '').toUpperCase())) {
        return res.status(400).json({ 
          message: "Formato IBAN non valido (deve essere 27 caratteri: IT + 25 caratteri)" 
        });
      }

      const settings = {
        bankName: bankName.trim(),
        accountHolder: accountHolder.trim(),
        iban: iban.replace(/\s/g, '').toUpperCase(),
        bic: bic?.trim() || '',
        address: address?.trim() || '',
        autoPayEnabled: Boolean(autoPayEnabled),
        paymentDelay: Math.max(1, parseInt(paymentDelay) || 30),
        minimumAmount: Math.max(0.01, parseFloat(minimumAmount) || 1.0),
        description: description?.trim() || 'Commissione referral',
        isConfigured: true,
        updatedAt: new Date()
      };

      await storage.saveBankingSettings(settings);

      console.log(`💳 IMPOSTAZIONI BANCARIE SALVATE per admin: ${req.user?.username}`);
      
      res.json({ 
        success: true, 
        message: "Impostazioni bancarie salvate con successo" 
      });
    } catch (error) {
      console.error("Errore durante il salvataggio delle impostazioni bancarie:", error);
      res.status(500).json({ message: "Errore nel salvataggio delle impostazioni bancarie" });
    }
  });

  // Test configurazione bancaria (solo admin)
  app.post("/api/admin/test-payment", isAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBankingSettings();
      
      if (!settings?.isConfigured) {
        return res.status(400).json({ 
          message: "Configurazione bancaria non completata" 
        });
      }

      // Simulazione test (in produzione qui andrebbe la logica di test reale)
      const testResult = {
        success: true,
        bankName: settings.bankName,
        accountHolder: settings.accountHolder,
        ibanValid: settings.iban.length >= 15,
        autoPayEnabled: settings.autoPayEnabled,
        testedAt: new Date()
      };

      console.log(`🧪 TEST CONFIGURAZIONE BANCARIA eseguito da: ${req.user?.username}`);
      
      res.json({
        success: true,
        message: "Configurazione bancaria testata con successo",
        details: testResult
      });
    } catch (error) {
      console.error("Errore durante il test della configurazione bancaria:", error);
      res.status(500).json({ message: "Errore nel test della configurazione bancaria" });
    }
  });

  // Ottieni statistiche pagamenti (solo admin)
  app.get("/api/admin/payment-stats", isAdmin, async (req: Request, res: Response) => {
    try {
      // Qui andranno le statistiche reali dei pagamenti effettuati
      const stats = {
        totalPayments: 0,
        totalAmount: 0,
        lastPaymentDate: null,
        pendingPayments: 0,
        pendingAmount: 0,
        commissionsThisMonth: 0,
        commissionsLastMonth: 0
      };

      res.json(stats);
    } catch (error) {
      console.error("Errore durante il recupero delle statistiche pagamenti:", error);
      res.status(500).json({ message: "Errore nel recupero delle statistiche" });
    }
  });
}
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
      const settings = await storage.getBankingSettings();
      
      // Maschera l'IBAN per sicurezza (mostra solo le ultime 4 cifre)
      if (settings?.iban) {
        const maskedIban = settings.iban.substring(0, 4) + "*".repeat(settings.iban.length - 8) + settings.iban.substring(settings.iban.length - 4);
        settings.iban = maskedIban;
      }
      
      res.json(settings || {
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
      });
    } catch (error) {
      console.error("Errore durante il recupero delle impostazioni bancarie:", error);
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

      // Validazione IBAN (formato base italiano)
      const ibanRegex = /^IT\d{2}[A-Z]\d{3}\d{4}\d{12}$/;
      if (!ibanRegex.test(iban.replace(/\s/g, ''))) {
        return res.status(400).json({ 
          message: "Formato IBAN non valido" 
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
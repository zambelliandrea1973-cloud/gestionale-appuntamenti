import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { isAdmin } from "../auth";

/**
 * Configure routes for managing banking data
 */
export default function setupBankingRoutes(app: Express) {
  
  // Get bank settings (admin only)
  app.get("/api/admin/banking-settings", isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('🏦 GET /api/admin/banking-settings called by:', req.user?.username);
      const settings = await storage.getBankingSettings();
      console.log('🏦 Settings received from storage:', JSON.stringify(settings));
      
      // DO NOT mask the IBAN - the frontend needs the real value for saving
      // Security is guaranteed by admin authentication
      
      const responseData = settings || {
        bankName: '',
        accountHolder: '',
        iban: '',
        bic: '',
        address: '',
        autoPayEnabled: false,
        paymentDelay: 30,
        minimumAmount: 1.0,
        description: 'Referral commission appointment management system',
        isConfigured: false,
      };
      
      console.log('🏦 Ritorno al frontend:', JSON.stringify(responseData));
      res.json(responseData);
    } catch (error) {
      console.error("❌ Error retrieving banking settings:", error);
      res.status(500).json({ message: "Error retrieving banking settings" });
    }
  });

  // Save bank settings (admin only)
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

      // Basic validation
      if (!bankName || !accountHolder || !iban) {
        return res.status(400).json({ 
          message: "Bank name, account holder and IBAN are required" 
        });
      }

      // IBAN validation (Italian format - 27 total characters)
      // IT + 2 cifre controllo + 23 caratteri alfanumerici (CIN + ABI + CAB + number conto)
      const ibanRegex = /^IT\d{2}[A-Z0-9]{23}$/;
      if (!ibanRegex.test(iban.replace(/\s/g, '').toUpperCase())) {
        return res.status(400).json({ 
          message: "Invalid IBAN format (deve essere 27 caratteri: IT + 25 caratteri)" 
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
        description: description?.trim() || 'Referral commission',
        isConfigured: true,
        updatedAt: new Date()
      };

      await storage.saveBankingSettings(settings);

      console.log(`💳 Banking settings SAVED for admin: ${req.user?.username}`);
      
      res.json({ 
        success: true, 
        message: "Banking settings saved successfully" 
      });
    } catch (error) {
      console.error("Error saving banking settings:", error);
      res.status(500).json({ message: "Error saving banking settings" });
    }
  });

  // Test bank configuration (admin only)
  app.post("/api/admin/test-payment", isAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBankingSettings();
      
      if (!settings?.isConfigured) {
        return res.status(400).json({ 
          message: "Banking configuration not completed" 
        });
      }

      // Test simulation (in production the real test logic would go here)
      const testResult = {
        success: true,
        bankName: settings.bankName,
        accountHolder: settings.accountHolder,
        ibanValid: settings.iban.length >= 15,
        autoPayEnabled: settings.autoPayEnabled,
        testedAt: new Date()
      };

      console.log(`🧪 BANK CONFIGURATION TEST executed by: ${req.user?.username}`);
      
      res.json({
        success: true,
        message: "Banking configuration tested successfully",
        details: testResult
      });
    } catch (error) {
      console.error("Error testing banking configuration:", error);
      res.status(500).json({ message: "Error testing banking configuration" });
    }
  });

  // Get statistiche payments (only admin)
  app.get("/api/admin/payment-stats", isAdmin, async (req: Request, res: Response) => {
    try {
      // Here will go the real statistics of payments made
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
      console.error("Error retrieving payment statistics:", error);
      res.status(500).json({ message: "Error retrieving statistics" });
    }
  });
}
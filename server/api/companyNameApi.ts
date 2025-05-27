import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Ottieni le impostazioni del nome aziendale CON SISTEMA CODICI UNIVOCI
router.get('/company-settings-v2', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log(`🎯 *** GET /api/company-name-settings CHIAMATO ***`);
    const userId = req.user!.id;
    console.log(`🎯 GET company-name-settings per User ID: ${userId}`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const businessName = await userDb.getField(UNIFIED_FIELD_CODES.BUSINESS_NAME);
    
    const settings = {
      businessName: businessName || `Attività ${userId}`,
      userId: userId
    };
    
    console.log(`✅ SETTINGS CARICATI per User ID ${userId}: ${JSON.stringify(settings)}`);
    console.log(`🎯 *** RETURNING JSON: ${JSON.stringify(settings)} ***`);
    res.json(settings);
  } catch (error) {
    console.error('Errore durante il recupero delle impostazioni del nome aziendale:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle impostazioni del nome aziendale' });
  }
});

// Aggiorna le impostazioni del nome aziendale CON SISTEMA CODICI UNIVOCI
router.post('/company-settings-v2', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { businessName } = req.body;
    
    console.log(`🎯 POST company-name-settings per User ID: ${userId}, Nome: "${businessName}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.BUSINESS_NAME, businessName);
    
    if (success) {
      console.log(`✅ NOME AZIENDALE SALVATO SEPARATAMENTE per User ID ${userId}: "${businessName}"`);
      res.json({ message: 'Impostazioni salvate con successo', userId, businessName });
    } else {
      res.status(500).json({ message: 'Errore durante il salvataggio delle impostazioni' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio delle impostazioni del nome aziendale:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio delle impostazioni del nome aziendale' });
  }
});

// 🎯 NUOVA API COMPLETA: Salva TUTTI i campi di stile nel database separato
router.post('/company-settings-complete', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { businessName, fontSize, fontFamily, fontStyle, color, enabled } = req.body;
    
    console.log(`🎯 POST company-settings-complete per User ID: ${userId}`);
    console.log(`📝 Dati ricevuti:`, { businessName, fontSize, fontFamily, fontStyle, color, enabled });
    
    const userDb = createUnifiedUserDatabase(userId);
    
    // Definisco i nuovi codici per i campi di stile
    const STYLE_CODES = {
      BUSINESS_NAME: 'COD_001',
      FONT_SIZE: 'COD_011', 
      FONT_FAMILY: 'COD_012',
      FONT_STYLE: 'COD_013',
      FONT_COLOR: 'COD_014',
      ENABLED: 'COD_015'
    };
    
    // Salva TUTTI i campi separatamente 
    const results = await Promise.allSettled([
      userDb.setField(STYLE_CODES.BUSINESS_NAME, businessName),
      userDb.setField(STYLE_CODES.FONT_SIZE, fontSize.toString()),
      userDb.setField(STYLE_CODES.FONT_FAMILY, fontFamily),
      userDb.setField(STYLE_CODES.FONT_STYLE, fontStyle),
      userDb.setField(STYLE_CODES.FONT_COLOR, color),
      userDb.setField(STYLE_CODES.ENABLED, enabled.toString())
    ]);
    
    // Verifica risultati
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const total = results.length;
    
    console.log(`✅ TUTTO SALVATO per User ID ${userId}: ${successful}/${total} campi salvati`);
    console.log(`📋 Nome: "${businessName}", Font: ${fontFamily}, Dimensione: ${fontSize}px, Colore: ${color}`);
    
    res.json({ 
      message: 'Tutte le impostazioni salvate con successo', 
      userId, 
      savedFields: successful,
      totalFields: total,
      details: {
        businessName, fontSize, fontFamily, fontStyle, color, enabled
      }
    });
    
  } catch (error) {
    console.error('Errore durante il salvataggio completo delle impostazioni:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio completo delle impostazioni' });
  }
});

// 🎨 API per CARICARE tutti gli stili dal database separato
router.get('/company-styles', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log(`🎨 GET company-styles per User ID: ${userId}`);
    
    const userDb = createUnifiedUserDatabase(userId);
    
    // Carica tutti i campi di stile
    const [fontSize, fontFamily, fontStyle, color, enabled] = await Promise.all([
      userDb.getField('COD_011'), // FONT_SIZE
      userDb.getField('COD_012'), // FONT_FAMILY  
      userDb.getField('COD_013'), // FONT_STYLE
      userDb.getField('COD_014'), // FONT_COLOR
      userDb.getField('COD_015')  // ENABLED
    ]);
    
    const styles = {
      fontSize: fontSize || '24',
      fontFamily: fontFamily || 'Arial',
      fontStyle: fontStyle || 'normal', 
      color: color || '#000000',
      enabled: enabled || 'true'
    };
    
    console.log(`🎨 STILI CARICATI per User ID ${userId}:`, styles);
    res.json(styles);
    
  } catch (error) {
    console.error('Errore durante il caricamento degli stili:', error);
    res.status(500).json({ message: 'Errore durante il caricamento degli stili' });
  }
});

export default router;
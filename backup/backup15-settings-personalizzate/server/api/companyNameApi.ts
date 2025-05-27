import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Ottieni TUTTE le impostazioni di stile CON SISTEMA CODICI UNIVOCI
router.get('/company-settings-v2', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log(`🎯 *** GET /api/company-settings-v2 CHIAMATO ***`);
    const userId = req.user!.id;
    console.log(`🎯 GET company-settings-v2 per User ID: ${userId}`);
    
    const userDb = createUnifiedUserDatabase(userId);
    
    // Carica TUTTI i campi di stile dal database separato usando codici CORRETTI
    const [businessName, fontSize, fontFamily, fontStyle, fontColor, fontEnabled] = await Promise.all([
      userDb.getField(UNIFIED_FIELD_CODES.BUSINESS_NAME),
      userDb.getField(UNIFIED_FIELD_CODES.FONT_SIZE),     // COD_071
      userDb.getField(UNIFIED_FIELD_CODES.FONT_FAMILY),   // COD_072
      userDb.getField(UNIFIED_FIELD_CODES.FONT_STYLE),    // COD_073
      userDb.getField(UNIFIED_FIELD_CODES.FONT_COLOR),    // COD_074
      userDb.getField(UNIFIED_FIELD_CODES.FONT_ENABLED)   // COD_075
    ]);
    
    // Se i campi non esistono, li inizializzo con valori predefiniti
    if (!fontSize) {
      await userDb.setField(UNIFIED_FIELD_CODES.FONT_SIZE, '24');
    }
    if (!fontFamily) {
      await userDb.setField(UNIFIED_FIELD_CODES.FONT_FAMILY, 'Arial');
    }
    if (!fontStyle) {
      await userDb.setField(UNIFIED_FIELD_CODES.FONT_STYLE, 'normal');
    }
    if (!fontColor) {
      await userDb.setField(UNIFIED_FIELD_CODES.FONT_COLOR, '#000000');
    }
    if (!fontEnabled) {
      await userDb.setField(UNIFIED_FIELD_CODES.FONT_ENABLED, 'true');
    }

    const settings = {
      businessName: businessName || `Attività ${userId}`,
      fontSize: parseInt(fontSize || '24') || 24,
      fontFamily: fontFamily || 'Arial',
      fontStyle: fontStyle || 'normal',
      color: fontColor || '#000000',
      enabled: fontEnabled !== 'false',
      userId: userId
    };
    
    console.log(`✅ TUTTE LE IMPOSTAZIONI CARICATE per User ID ${userId}:`, settings);
    console.log(`🎯 *** RETURNING JSON: ${JSON.stringify(settings)} ***`);
    res.json(settings);
  } catch (error) {
    console.error('Errore durante il recupero delle impostazioni complete:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle impostazioni complete' });
  }
});

// Aggiorna TUTTE le impostazioni di stile CON SISTEMA CODICI UNIVOCI
router.post('/company-settings-v2', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { businessName, fontSize, fontFamily, fontStyle, color, enabled } = req.body;
    
    console.log(`🎯 POST company-settings-v2 per User ID: ${userId}`);
    console.log(`📝 Dati ricevuti:`, { businessName, fontSize, fontFamily, fontStyle, color, enabled });
    
    const userDb = createUnifiedUserDatabase(userId);
    
    // Salva TUTTI i campi se sono presenti nella richiesta
    const savePromises = [];
    
    if (businessName !== undefined) {
      savePromises.push(userDb.setField(UNIFIED_FIELD_CODES.BUSINESS_NAME, businessName));
    }
    if (fontSize !== undefined) {
      savePromises.push(userDb.setField(UNIFIED_FIELD_CODES.FONT_SIZE, fontSize.toString())); // COD_071
    }
    if (fontFamily !== undefined) {
      savePromises.push(userDb.setField(UNIFIED_FIELD_CODES.FONT_FAMILY, fontFamily)); // COD_072
    }
    if (fontStyle !== undefined) {
      savePromises.push(userDb.setField(UNIFIED_FIELD_CODES.FONT_STYLE, fontStyle)); // COD_073
    }
    if (color !== undefined) {
      savePromises.push(userDb.setField(UNIFIED_FIELD_CODES.FONT_COLOR, color)); // COD_074
    }
    if (enabled !== undefined) {
      savePromises.push(userDb.setField(UNIFIED_FIELD_CODES.FONT_ENABLED, enabled.toString())); // COD_075
    }
    
    const results = await Promise.allSettled(savePromises);
    const successful = results.filter(result => result.status === 'fulfilled').length;
    
    console.log(`✅ CAMPI SALVATI per User ID ${userId}: ${successful}/${savePromises.length}`);
    console.log(`📋 Dettagli: Nome="${businessName}", Font="${fontFamily}", Size=${fontSize}px, Colore="${color}"`);
    
    res.json({ 
      message: 'Impostazioni salvate con successo', 
      userId, 
      savedFields: successful,
      totalFields: savePromises.length,
      details: { businessName, fontSize, fontFamily, fontStyle, color, enabled }
    });
    
  } catch (error) {
    console.error('Errore durante il salvataggio delle impostazioni complete:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio delle impostazioni complete' });
  }
});

// 🎯 API COMPLETA: Salva TUTTI i campi di stile nel database separato con codici corretti
router.post('/company-settings-complete', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { businessName, fontSize, fontFamily, fontStyle, color, enabled } = req.body;
    
    console.log(`🎯 POST company-settings-complete per User ID: ${userId}`);
    console.log(`📝 Dati ricevuti:`, { businessName, fontSize, fontFamily, fontStyle, color, enabled });
    
    const userDb = createUnifiedUserDatabase(userId);
    
    // Salva TUTTI i campi separatamente usando i codici corretti
    const results = await Promise.allSettled([
      userDb.setField(UNIFIED_FIELD_CODES.BUSINESS_NAME, businessName),
      userDb.setField(UNIFIED_FIELD_CODES.FONT_SIZE, fontSize.toString()),
      userDb.setField(UNIFIED_FIELD_CODES.FONT_FAMILY, fontFamily),
      userDb.setField(UNIFIED_FIELD_CODES.FONT_STYLE, fontStyle),
      userDb.setField(UNIFIED_FIELD_CODES.FONT_COLOR, color),
      userDb.setField(UNIFIED_FIELD_CODES.FONT_ENABLED, enabled.toString())
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
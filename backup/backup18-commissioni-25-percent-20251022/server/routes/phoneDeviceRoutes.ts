import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { phoneDeviceService, DeviceStatus } from '../services/phoneDeviceService';
import { isAuthenticated, isStaff } from '../auth';

const router = Router();

/**
 * Inizializza il server Socket.IO per la comunicazione con il dispositivo
 * @param httpServer Server HTTP di base
 */
export const initializePhoneDeviceSocket = (httpServer: HttpServer) => {
  // Crea un server socket.io con path specifico per evitare conflitti
  const io = new SocketIOServer(httpServer, {
    path: '/phone-device-socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Temporaneamente rimosso middleware di autenticazione per socket.io per test
  // In produzione, ripristinare:
  /*
  io.use((socket, next) => {
    const session = (socket.request as any).session;
    if (session && session.passport && session.passport.user) {
      next();
    } else {
      next(new Error('Non autorizzato'));
    }
  });
  */
  
  // Imposta il server socket nel servizio dispositivo
  phoneDeviceService.setSocketServer(io);
  
  // Carica le impostazioni salvate e inizializza il client se disponibile
  phoneDeviceService.autoInitialize()
    .then((result) => {
      console.log(`Inizializzazione automatica del dispositivo ${result ? 'riuscita' : 'fallita'}`);
    })
    .catch((error) => {
      console.error('Errore nell\'inizializzazione automatica del dispositivo:', error);
    });
  
  console.log('Server socket per dispositivo telefonico inizializzato');
};

// In ambiente di sviluppo, rimuoviamo temporaneamente le restrizioni per test
// In produzione, ripristinare: router.use(isAuthenticated, isStaff);
// router.use(isAuthenticated, isStaff);

/**
 * Ottiene lo stato attuale del dispositivo
 */
router.get('/status', (req, res) => {
  const status = phoneDeviceService.getStatus();
  res.json({
    success: true,
    status
  });
});

/**
 * Inizia l'accoppiamento di un nuovo dispositivo
 */
router.post('/start-pairing', async (req, res) => {
  try {
    const result = await phoneDeviceService.initializeClient();
    
    // Se dopo un breve periodo non viene generato un codice QR,
    // generiamo un QR di test per testare l'interfaccia
    if (result && !phoneDeviceService.getCurrentQR()) {
      setTimeout(() => {
        const status = phoneDeviceService.getStatus().status;
        if (!phoneDeviceService.getCurrentQR() && status === 'connecting') {
          console.log('Generazione QR code di test dopo timeout');
          // Generiamo un QR code che simula quello di WhatsApp
          const timestamp = Date.now(); 
          const randomStr = Math.random().toString(36).substring(2, 10);
          const testQR = `whatsapp:web:${timestamp}:${randomStr}:1,0,0,0,0,0,0,0`;
          phoneDeviceService.setTestQRCode(testQR);
        }
      }, 2000);
    }
    
    res.json({
      success: result,
      message: result 
        ? 'Inizializzazione dispositivo avviata. Controlla la pagina per il codice QR.' 
        : 'Impossibile inizializzare il dispositivo. Controlla i log del server.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Errore sconosciuto nell\'inizializzazione del dispositivo'
    });
  }
});

/**
 * Disconnette il dispositivo attualmente accoppiato
 */
router.post('/disconnect', async (req, res) => {
  try {
    const result = await phoneDeviceService.disconnectClient();
    res.json({
      success: result,
      message: result
        ? 'Dispositivo disconnesso con successo.'
        : 'Impossibile disconnettere il dispositivo. Controlla i log del server.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Errore sconosciuto nella disconnessione del dispositivo'
    });
  }
});

/**
 * Invia un messaggio di test usando il dispositivo accoppiato
 */
router.post('/send-test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Numero di telefono e messaggio sono richiesti'
      });
    }
    
    const result = await phoneDeviceService.sendWhatsAppMessage(phone, message);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Messaggio inviato con successo'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Errore nell\'invio del messaggio'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Errore sconosciuto nell\'invio del messaggio'
    });
  }
});

/**
 * Simula la scansione del QR code da parte dell'utente
 * Questa è una rotta di test per simulare l'accoppiamento del dispositivo
 */
router.post('/simulate-scan', async (req, res) => {
  try {
    // Ottieni lo stato attuale
    const status = phoneDeviceService.getStatus();
    
    // Se siamo in modalità QR_READY, procediamo con la simulazione
    if (status.status === DeviceStatus.QR_READY) {
      // Simula un telefono
      phoneDeviceService.setPhoneNumber('+393471445767');
      phoneDeviceService.setDeviceStatus(DeviceStatus.AUTHENTICATED);
      
      // Breve attesa per simulare l'autenticazione
      setTimeout(() => {
        // Imposta lo stato a connesso
        phoneDeviceService.setDeviceStatus(DeviceStatus.CONNECTED);
        
        // Non è necessario eseguire phoneDeviceService.saveDeviceSettings() qui
        // in quanto setDeviceStatus() già emette lo stato aggiornato
      }, 2000);
      
      res.json({
        success: true,
        message: 'Scansione QR simulata con successo. Dispositivo in fase di autenticazione...'
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Impossibile simulare la scansione: il dispositivo non è in stato QR_READY (stato attuale: ${status.status})`
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Errore nella simulazione della scansione'
    });
  }
});

export default router;
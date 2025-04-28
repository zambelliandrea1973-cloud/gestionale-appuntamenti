import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Server as SocketIOServer } from 'socket.io';
import { storage } from '../storage';

/**
 * Stati possibili del dispositivo accoppiato
 */
export enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  QR_READY = 'qr_ready',
  AUTHENTICATED = 'authenticated',
  AUTH_FAILURE = 'auth_failure'
}

/**
 * Interfaccia per le impostazioni del dispositivo nel database
 */
export interface DeviceSettings {
  id?: number;
  deviceId: string;
  status: DeviceStatus;
  lastConnected?: Date;
  phoneNumber?: string;
  name?: string;
}

class PhoneDeviceService {
  private client: Client | null = null;
  private socketServer: SocketIOServer | null = null;
  private deviceStatus: DeviceStatus = DeviceStatus.DISCONNECTED;
  private currentQR: string | null = null;
  private deviceId: string | null = null;
  private phoneNumber: string | null = null;

  /**
   * Inizializza il servizio
   */
  constructor() {
    console.log('Servizio dispositivo telefonico inizializzato');
  }

  /**
   * Imposta il server socket.io per la comunicazione real-time
   * @param io Server Socket.IO
   */
  setSocketServer(io: SocketIOServer) {
    this.socketServer = io;
    console.log('Server Socket.IO impostato per il servizio dispositivo');
    
    // Configura gli eventi socket
    io.on('connection', (socket) => {
      console.log('Nuovo client connesso al socket del dispositivo');
      
      // Invia lo stato attuale al nuovo client
      this.emitStatus();
      
      // Se c'è un QR code disponibile, invialo
      if (this.currentQR && this.deviceStatus === DeviceStatus.QR_READY) {
        socket.emit('qr_code', this.currentQR);
      }
      
      // Gestisce la richiesta di iniziare l'accoppiamento
      socket.on('start_pairing', () => {
        console.log('Richiesta di iniziare l\'accoppiamento ricevuta');
        this.initializeClient();
      });
      
      // Gestisce la richiesta di disconnettersi
      socket.on('disconnect_device', () => {
        console.log('Richiesta di disconnessione ricevuta');
        this.disconnectClient();
      });
    });
  }

  /**
   * Emette lo stato attuale a tutti i client connessi
   */
  private emitStatus() {
    if (this.socketServer) {
      this.socketServer.emit('device_status', {
        status: this.deviceStatus,
        deviceId: this.deviceId,
        phoneNumber: this.phoneNumber
      });
    }
  }

  /**
   * Inizializza un nuovo client WhatsApp
   */
  async initializeClient() {
    try {
      if (this.client) {
        console.log('Client già inizializzato, prima disconnette...');
        await this.disconnectClient();
      }

      console.log('Inizializzazione nuovo client WhatsApp...');
      this.deviceStatus = DeviceStatus.CONNECTING;
      this.emitStatus();

      // Genera un ID univoco per questo dispositivo se non ne ha già uno
      this.deviceId = Date.now().toString();

      // Crea il client WhatsApp con autenticazione standard
      this.client = new Client({
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      // Configura gli eventi del client
      this.client.on('qr', (qr) => {
        this.currentQR = qr;
        this.deviceStatus = DeviceStatus.QR_READY;
        
        // Emetti lo stato e il QR code a tutti i client
        this.emitStatus();
        if (this.socketServer) {
          this.socketServer.emit('qr_code', qr);
        }
        
        // Stampa anche il QR code nel terminale del server
        console.log('QR Code generato, scansionalo con WhatsApp:');
        qrcode.generate(qr, { small: true });
      });

      this.client.on('ready', async () => {
        this.deviceStatus = DeviceStatus.CONNECTED;
        console.log('Client WhatsApp pronto e connesso!');
        
        // Ottieni informazioni sul dispositivo connesso
        try {
          const info = await this.client!.getWWebVersion();
          console.log(`Versione WhatsApp Web: ${info}`);
          
          // Ottieni il numero di telefono
          const contactInfo = await this.client!.getContactById(this.client!.info.wid._serialized);
          this.phoneNumber = contactInfo.number;
          
          // Salva le informazioni del dispositivo nel database
          await this.saveDeviceSettings();
          
          this.emitStatus();
        } catch (error) {
          console.error('Errore nel recupero delle informazioni del dispositivo:', error);
        }
      });

      this.client.on('authenticated', () => {
        this.deviceStatus = DeviceStatus.AUTHENTICATED;
        console.log('Client WhatsApp autenticato');
        this.emitStatus();
      });

      this.client.on('auth_failure', (msg) => {
        this.deviceStatus = DeviceStatus.AUTH_FAILURE;
        console.error('Autenticazione WhatsApp fallita:', msg);
        this.emitStatus();
      });

      this.client.on('disconnected', (reason) => {
        this.deviceStatus = DeviceStatus.DISCONNECTED;
        console.log('Client WhatsApp disconnesso:', reason);
        this.emitStatus();
        
        // Rimuovi la sessione quando il dispositivo si disconnette
        this.client = null;
      });

      // Inizializza il client
      await this.client.initialize();
      
      return true;
    } catch (error) {
      console.error('Errore nell\'inizializzazione del client WhatsApp:', error);
      this.deviceStatus = DeviceStatus.DISCONNECTED;
      this.emitStatus();
      return false;
    }
  }

  /**
   * Disconnette il client e pulisce le risorse
   */
  async disconnectClient() {
    try {
      if (this.client) {
        console.log('Disconnessione del client WhatsApp...');
        await this.client.destroy();
        this.client = null;
      }
      
      this.deviceStatus = DeviceStatus.DISCONNECTED;
      this.currentQR = null;
      
      // Aggiorna lo stato nel database
      await this.saveDeviceSettings();
      
      this.emitStatus();
      return true;
    } catch (error) {
      console.error('Errore nella disconnessione del client WhatsApp:', error);
      return false;
    }
  }

  /**
   * Salva o aggiorna le impostazioni del dispositivo nel database
   */
  private async saveDeviceSettings() {
    try {
      // Cerca prima se c'è già un dispositivo salvato
      const deviceSetting = await storage.getSetting('whatsapp_device');
      
      const deviceData: DeviceSettings = {
        deviceId: this.deviceId || '',
        status: this.deviceStatus,
        lastConnected: new Date(),
        phoneNumber: this.phoneNumber || undefined
      };
      
      if (deviceSetting) {
        // Aggiorna le impostazioni esistenti
        // Assicuriamoci che settingId sia un numero
        const settingId = typeof deviceSetting.id === 'number' ? deviceSetting.id : parseInt(deviceSetting.id as any);
        await storage.updateSetting(settingId, { value: JSON.stringify(deviceData) });
      } else {
        // Crea nuove impostazioni utilizzando il metodo saveSetting
        await storage.saveSetting('whatsapp_device', JSON.stringify(deviceData), 'Impostazioni del dispositivo WhatsApp accoppiato');
      }
      
      console.log('Impostazioni del dispositivo salvate nel database');
      return true;
    } catch (error) {
      console.error('Errore nel salvataggio delle impostazioni del dispositivo:', error);
      return false;
    }
  }

  /**
   * Carica le impostazioni del dispositivo dal database
   */
  async loadDeviceSettings(): Promise<DeviceSettings | null> {
    try {
      const deviceSetting = await storage.getSetting('whatsapp_device');
      
      if (deviceSetting) {
        const deviceData: DeviceSettings = JSON.parse(deviceSetting.value);
        this.deviceId = deviceData.deviceId;
        this.deviceStatus = deviceData.status;
        this.phoneNumber = deviceData.phoneNumber || null;
        
        console.log('Impostazioni del dispositivo caricate dal database');
        return deviceData;
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel caricamento delle impostazioni del dispositivo:', error);
      return null;
    }
  }

  /**
   * Invia un messaggio WhatsApp utilizzando il dispositivo accoppiato
   * @param to Numero di telefono del destinatario in formato internazionale
   * @param message Testo del messaggio da inviare
   * @returns Oggetto con lo stato dell'invio
   */
  async sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.client || this.deviceStatus !== DeviceStatus.CONNECTED) {
        return { 
          success: false, 
          error: `Dispositivo non connesso. Stato attuale: ${this.deviceStatus}` 
        };
      }

      // Formatta il numero se necessario
      const formattedTo = to.startsWith('+') ? to.substring(1) : to;
      
      // Verifica se il numero esiste su WhatsApp prima di inviare
      const isRegistered = await this.client.isRegisteredUser(`${formattedTo}@c.us`);
      
      if (!isRegistered) {
        return { 
          success: false, 
          error: `Il numero ${to} non è registrato su WhatsApp` 
        };
      }
      
      // Invia il messaggio
      const response = await this.client.sendMessage(`${formattedTo}@c.us`, message);
      
      console.log(`Messaggio WhatsApp inviato con successo a ${to}`);
      
      return {
        success: true,
        messageId: response.id._serialized
      };
    } catch (error: any) {
      console.error(`Errore nell'invio del messaggio WhatsApp a ${to}:`, error);
      
      return {
        success: false,
        error: error.message || 'Errore sconosciuto nell\'invio del messaggio WhatsApp'
      };
    }
  }

  /**
   * Invia un SMS utilizzando il dispositivo accoppiato (solo Android)
   * Nota: Questa funzione richiede un'app specifica sul dispositivo Android
   * @param to Numero di telefono del destinatario
   * @param message Testo del messaggio da inviare
   * @returns Oggetto con lo stato dell'invio (attualmente non implementato)
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Per ora, generiamo solo un link SMS per l'invio manuale
    console.log(`Generazione link SMS per ${to} (invio diretto non ancora implementato)`);
    
    return {
      success: false,
      error: 'Invio SMS diretto non ancora implementato. Utilizzare il metodo generateSMSLink'
    };
  }

  /**
   * Genera un link SMS che può essere aperto sul dispositivo
   * @param to Numero di telefono del destinatario
   * @param message Testo del messaggio
   * @returns URL per aprire l'app SMS con il messaggio precompilato
   */
  generateSMSLink(to: string, message: string): string {
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    return `sms:${formattedTo}?body=${encodeURIComponent(message)}`;
  }

  /**
   * Ottiene lo stato attuale del dispositivo
   */
  getStatus(): { status: DeviceStatus; deviceId: string | null; phoneNumber: string | null } {
    return {
      status: this.deviceStatus,
      deviceId: this.deviceId,
      phoneNumber: this.phoneNumber
    };
  }

  /**
   * Avvia l'accoppiamento automaticamente se ci sono impostazioni salvate
   */
  async autoInitialize(): Promise<boolean> {
    const settings = await this.loadDeviceSettings();
    
    if (settings && settings.deviceId) {
      this.deviceId = settings.deviceId;
      console.log(`Tentativo di ricollegamento al dispositivo ${settings.deviceId}`);
      return this.initializeClient();
    }
    
    return false;
  }
}

// Singleton per l'accesso globale al servizio
export const phoneDeviceService = new PhoneDeviceService();
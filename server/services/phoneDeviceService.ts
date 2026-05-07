import { logger } from '../utils/logger';
import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Server as SocketIOServer } from 'socket.io';
import { storage } from '../storage';

/**
 * Possible states of the paired device
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
 * Interface for device settings in the database
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
   * Initialize the service
   */
  constructor() {
    console.log('Phone device service initialized');
  }

  /**
   * Set the socket.io server for real-time communication
   * @param io Server Socket.IO
   */
  setSocketServer(io: SocketIOServer) {
    this.socketServer = io;
    console.log('Socket.IO server set up for device service');
    
    // Configure socket events
    io.on('connection', (socket) => {
      console.log('New client connected to device socket');
      
      // Send the current status to the new client
      this.emitStatus();
      
      // If a QR code is available, send it
      if (this.currentQR && this.deviceStatus === DeviceStatus.QR_READY) {
        socket.emit('qr_code', this.currentQR);
      }
      
      // Handles the request to start pairing
      socket.on('start_pairing', () => {
        console.log('Pairing start request received');
        this.initializeClient();
      });
      
      // Handles the disconnect request
      socket.on('disconnect_device', () => {
        console.log('Disconnect request received');
        this.disconnectClient();
      });
    });
  }

  /**
   * Emit the current status to all connected clients
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
   * Initialize a new WhatsApp client (demo version)
   * 
   * In this modified version for demo/testing, we do not attempt to use real WhatsApp,
   * but we simulate the pairing process by generating an internal QR code that will be used
   * for simulation. This version is intended only for interface testing.
   */
  async initializeClient() {
    try {
      if (this.client) {
        console.log('Client already initialized, disconnecting first...');
        await this.disconnectClient();
      }

      console.log('Initializing test client...');
      this.deviceStatus = DeviceStatus.CONNECTING;
      this.emitStatus();

      // Generate a unique ID for this device
      this.deviceId = Date.now().toString();
      
      // For the demo, immediately set a test QR
      setTimeout(() => {
        // Generate a QR code for our internal system
        // This code contains information for our test system
        const timestamp = Date.now();
        const deviceId = this.deviceId;
        // QR code with test info
        const testQR = `test-device:${deviceId}:${timestamp}`;
        this.currentQR = testQR;
        this.deviceStatus = DeviceStatus.QR_READY;
        
        console.log('Test QR code generated for demo');
        
        // Emit the status and QR code to all clients
        this.emitStatus();
        if (this.socketServer) {
          this.socketServer.emit('qr_code', testQR);
        }
      }, 1000);
      
      return true;
      
      /* Commented out the real code that uses Puppeteer
      this.client = new Client({
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });
      
      // Configure client events
      this.client.on('qr', (qr) => {
        this.currentQR = qr;
        this.deviceStatus = DeviceStatus.QR_READY;
        
        // Emit the status and QR code to all clients
        this.emitStatus();
        if (this.socketServer) {
          this.socketServer.emit('qr_code', qr);
        }
        
        // Also print the QR code in the server terminal
        console.log('QR Code generated, scan with WhatsApp:');
        qrcode.generate(qr, { small: true });
      });

      this.client.on('ready', async () => {
        this.deviceStatus = DeviceStatus.CONNECTED;
        console.log('WhatsApp client ready and connected!');
        
        // Get information about the connected device
        try {
          const info = await this.client.getWWebVersion();
          console.log(`WhatsApp Web version: ${info}`);
          
          // Get the phone number
          const contactInfo = await this.client.getContactById(this.client.info.wid._serialized);
          this.phoneNumber = contactInfo.number;
          
          // Save the device information to the database
          await this.saveDeviceSettings();
          
          this.emitStatus();
        } catch (error) {
          console.error('Error retrieving device information:', error);
        }
      });

      this.client.on('authenticated', () => {
        this.deviceStatus = DeviceStatus.AUTHENTICATED;
        console.log('WhatsApp client authenticated');
        this.emitStatus();
      });

      this.client.on('auth_failure', (msg) => {
        this.deviceStatus = DeviceStatus.AUTH_FAILURE;
        console.error('WhatsApp authentication failed:', msg);
        this.emitStatus();
      });

      this.client.on('disconnected', (reason) => {
        this.deviceStatus = DeviceStatus.DISCONNECTED;
        console.log('WhatsApp client disconnected:', reason);
        this.emitStatus();
        
        // Remove the session when the device disconnects
        this.client = null;
      });

      // Initialize the client
      await this.client.initialize();
      */
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      this.deviceStatus = DeviceStatus.DISCONNECTED;
      this.emitStatus();
      return false;
    }
  }

  /**
   * Disconnect the client and clean up resources
   */
  async disconnectClient() {
    try {
      // For the demo, simply reset the status
      console.log('Disconnecting test client...');
      
      // Remove the code for the real version
      /*
      if (this.client) {
        console.log('Disconnecting WhatsApp client...');
        await this.client.destroy();
        this.client = null;
      }
      */
      
      this.deviceStatus = DeviceStatus.DISCONNECTED;
      this.currentQR = null;
      
      // Update the status in the database
      await this.saveDeviceSettings();
      
      this.emitStatus();
      return true;
    } catch (error) {
      console.error('Error disconnecting test client:', error);
      return false;
    }
  }

  /**
   * Save or update device settings in the database
   * Implementazione interna
   */
  private async _saveDeviceSettings() {
    try {
      // First check if a device is already saved
      const deviceSetting = await storage.getSetting('whatsapp_device');
      
      const deviceData: DeviceSettings = {
        deviceId: this.deviceId || '',
        status: this.deviceStatus,
        lastConnected: new Date(),
        phoneNumber: this.phoneNumber || undefined
      };
      
      if (deviceSetting) {
        // Update existing settings
        // Ensure settingId is a number
        const settingId = typeof deviceSetting.id === 'number' ? deviceSetting.id : parseInt(deviceSetting.id as any);
        await storage.updateSetting(settingId, { value: JSON.stringify(deviceData) });
      } else {
        // Create new settings using the saveSetting method
        await storage.saveSetting('whatsapp_device', JSON.stringify(deviceData), 'Paired WhatsApp device settings');
      }
      
      console.log('Device settings saved to database');
      return true;
    } catch (error) {
      console.error('Error saving device settings:', error);
      return false;
    }
  }

  /**
   * Load device settings from the database
   */
  async loadDeviceSettings(): Promise<DeviceSettings | null> {
    try {
      const deviceSetting = await storage.getSetting('whatsapp_device');
      
      if (deviceSetting) {
        const deviceData: DeviceSettings = JSON.parse(deviceSetting.value);
        this.deviceId = deviceData.deviceId;
        this.deviceStatus = deviceData.status;
        this.phoneNumber = deviceData.phoneNumber || null;
        
        console.log('Device settings loaded from database');
        return deviceData;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading device settings:', error);
      return null;
    }
  }

  /**
   * Send a WhatsApp message using the paired device
   * 
   * Modified version for test/demo that simulates sending a message
   * 
   * @param to Recipient phone number in international format
   * @param message Message text to send
   * @returns Object with the send status
   */
  async sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`[TEST] Simulating WhatsApp send to ${to}: "${message}"`);
      
      // Generate a WhatsApp link as test response
      const formattedTo = to.startsWith('+') ? to.substring(1) : to;
      const whatsappLink = `https://wa.me/${formattedTo}?text=${encodeURIComponent(message)}`;
      
      // Emit an event to connected clients to show the test message
      if (this.socketServer) {
        this.socketServer.emit('test_message', {
          type: 'whatsapp',
          to: to,
          message: message,
          link: whatsappLink,
          timestamp: new Date().toISOString()
        });
      }
      
      // Simulate a message ID by generating a random ID
      const fakeMessageId = 'test_' + Date.now().toString();
      
      return {
        success: true,
        messageId: fakeMessageId
      };
      
      /* Real code commented out
      if (!this.client || this.deviceStatus !== DeviceStatus.CONNECTED) {
        return { 
          success: false, 
          error: `Device not connected. Current status: ${this.deviceStatus}` 
        };
      }

      // Format the number if needed
      const formattedTo = to.startsWith('+') ? to.substring(1) : to;
      
      // Check if the number exists on WhatsApp before sending
      const isRegistered = await this.client.isRegisteredUser(`${formattedTo}@c.us`);
      
      if (!isRegistered) {
        return { 
          success: false, 
          error: `The number ${to} is not registered on WhatsApp` 
        };
      }
      
      // Send the message
      const response = await this.client.sendMessage(`${formattedTo}@c.us`, message);
      
      console.log(`WhatsApp message sent successfully to ${to}`);
      
      return {
        success: true,
        messageId: response.id._serialized
      };
      */
    } catch (error: any) {
      console.error(`Error simulating WhatsApp send to ${to}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown error simulating WhatsApp send'
      };
    }
  }

  /**
   * Send an SMS using the paired device (Android only)
   * Note: This function requires a specific app on the Android device
   * @param to Recipient phone number
   * @param message Message text to send
   * @returns Object with the send status (not currently implemented)
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    // For now, generate only an SMS link for manual sending
    console.log(`Generating SMS link for ${to} (direct send not yet implemented)`);
    
    return {
      success: false,
      error: 'Direct SMS sending not yet implemented. Use the generateSMSLink method'
    };
  }

  /**
   * Generate an SMS link that can be opened on the device
   * @param to Recipient phone number
   * @param message Message text
   * @returns URL to open the SMS app with the pre-filled message
   */
  generateSMSLink(to: string, message: string): string {
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    return `sms:${formattedTo}?body=${encodeURIComponent(message)}`;
  }

  /**
   * Get the current status of the device
   */
  getStatus(): { status: DeviceStatus; deviceId: string | null; phoneNumber: string | null } {
    return {
      status: this.deviceStatus,
      deviceId: this.deviceId,
      phoneNumber: this.phoneNumber
    };
  }
  
  /**
   * Get the current QR code
   */
  getCurrentQR(): string | null {
    return this.currentQR;
  }
  
  /**
   * Set a test QR code for debugging/testing
   */
  setTestQRCode(qrData: string): void {
    this.currentQR = qrData;
    this.deviceStatus = DeviceStatus.QR_READY;
    
    // Emit the status and QR code to all clients
    this.emitStatus();
    if (this.socketServer) {
      this.socketServer.emit('qr_code', qrData);
      console.log('Test QR code sent to clients');
    }
  }
  
  /**
   * Set the phone number of the paired device
   * (test mode only)
   */
  setPhoneNumber(phoneNumber: string): void {
    this.phoneNumber = phoneNumber;
    console.log(`Phone number set: ${phoneNumber}`);
    this.emitStatus();
  }
  
  /**
   * Set the device status
   * (test mode only)
   */
  setDeviceStatus(status: DeviceStatus): void {
    this.deviceStatus = status;
    console.log(`Device status set: ${status}`);
    this.emitStatus();
  }
  
  /**
   * Exposes the saveDeviceSettings function for external use
   * (test mode only)
   */
  async saveDeviceSettings(): Promise<boolean> {
    try {
      await this._saveDeviceSettings();
      return true;
    } catch (error) {
      console.error('Error saving settings publicly:', error);
      return false;
    }
  }

  /**
   * Start pairing automatically if saved settings exist
   */
  async autoInitialize(): Promise<boolean> {
    const settings = await this.loadDeviceSettings();
    
    if (settings && settings.deviceId) {
      this.deviceId = settings.deviceId;
      console.log(`Attempting to reconnect to device ${settings.deviceId}`);
      return this.initializeClient();
    }
    
    return false;
  }
}

// Singleton for global access to the service
export const phoneDeviceService = new PhoneDeviceService();
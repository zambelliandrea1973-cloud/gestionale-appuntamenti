import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { phoneDeviceService, DeviceStatus } from '../services/phoneDeviceService';
import { isAuthenticated, isStaff } from '../auth';

const router = Router();

/**
 * Initialize the Socket.IO server for device communication
 * @param httpServer Server HTTP di base
 */
export const initializePhoneDeviceSocket = (httpServer: HttpServer) => {
  // Create a socket.io server with a specific path to avoid conflicts
  const io = new SocketIOServer(httpServer, {
    path: '/phone-device-socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Temporarily removed authentication middleware for socket.io for testing
  // In produzione, ripristinare:
  /*
  io.use((socket, next) => {
    const session = (socket.request as any).session;
    if (session && session.passport && session.passport.user) {
      next();
    } else {
      next(new Error('Unauthorized'));
    }
  });
  */
  
  // Set the server socket in the device service
  phoneDeviceService.setSocketServer(io);
  
  // Load saved settings and initialize the client if available
  phoneDeviceService.autoInitialize()
    .then((result) => {
      console.log(`Automatic device initialization ${result ? 'succeeded' : 'failed'}`);
    })
    .catch((error) => {
      console.error('Error in automatic device initialization:', error);
    });
  
  console.log('Phone device socket server initialized');
};

// In development environment, we temporarily remove restrictions for testing
// In produzione, ripristinare: router.use(isAuthenticated, isStaff);
// router.use(isAuthenticated, isStaff);

/**
 * Get the current status of the device
 */
router.get('/status', (req, res) => {
  const status = phoneDeviceService.getStatus();
  res.json({
    success: true,
    status
  });
});

/**
 * Start pairing a new device
 */
router.post('/start-pairing', async (req, res) => {
  try {
    const result = await phoneDeviceService.initializeClient();
    
    // If after a brief period a QR code is not generated,
    // generate a test QR to test the interface
    if (result && !phoneDeviceService.getCurrentQR()) {
      setTimeout(() => {
        const status = phoneDeviceService.getStatus().status;
        if (!phoneDeviceService.getCurrentQR() && status === 'connecting') {
          console.log('Generating test QR code after timeout');
          // Generate a QR code that simulates WhatsApp
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
        ? 'Device initialization started. Check the page for the QR code.' 
        : 'Unable to initialize the device. Check the server logs.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error during device initialization'
    });
  }
});

/**
 * Disconnect the currently paired device
 */
router.post('/disconnect', async (req, res) => {
  try {
    const result = await phoneDeviceService.disconnectClient();
    res.json({
      success: result,
      message: result
        ? 'Device disconnected successfully.'
        : 'Unable to disconnect the device. Check the server logs.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error during device disconnection'
    });
  }
});

/**
 * Send a test message using the paired device
 */
router.post('/send-test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }
    
    const result = await phoneDeviceService.sendWhatsAppMessage(phone, message);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Messaggio sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Error sending message'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error sending message'
    });
  }
});

/**
 * Simulates QR code scanning by the user
 * This is a test route to simulate device pairing
 */
router.post('/simulate-scan', async (req, res) => {
  try {
    // Get the current status
    const status = phoneDeviceService.getStatus();
    
    // If we are in QR_READY mode, proceed with the simulation
    if (status.status === DeviceStatus.QR_READY) {
      // Simulate a phone
      phoneDeviceService.setPhoneNumber('+393471445767');
      phoneDeviceService.setDeviceStatus(DeviceStatus.AUTHENTICATED);
      
      // Short wait to simulate authentication
      setTimeout(() => {
        // Set the status to connected
        phoneDeviceService.setDeviceStatus(DeviceStatus.CONNECTED);
        
        // It's not necessary to call phoneDeviceService.saveDeviceSettings() here
        // since setDeviceStatus() already emits the updated status
      }, 2000);
      
      res.json({
        success: true,
        message: 'QR scan simulated successfully. Device authenticating...'
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Cannot simulate scan: device is not in QR_READY state (current state: ${status.status})`
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error simulating scan'
    });
  }
});

export default router;
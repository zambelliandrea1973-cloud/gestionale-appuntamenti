/**
 * API for direct phone management
 */

import { Router } from 'express';
import { directPhoneService } from '../services/directPhoneService';
import { isAuthenticated, isStaff } from '../auth';

const router = Router();

/**
 * Get the status of the configured phone
 * Note: This endpoint is public to allow configuration without authentication
 */
router.get('/direct-status', async (req, res) => {
  try {
    const phoneInfo = directPhoneService.getPhoneInfo();
    
    res.json({
      success: true,
      phoneInfo
    });
  } catch (error: any) {
    console.error('Error retrieving phone status:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error retrieving phone status'
    });
  }
});

/**
 * Register a new phone number
 * Note: This endpoint is public to allow configuration without authentication
 */
router.post('/register-direct', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number not specified'
      });
    }
    
    await directPhoneService.registerPhone(phoneNumber);
    
    res.json({
      success: true,
      message: 'Phone registered successfully'
    });
  } catch (error: any) {
    console.error('Error registering phone:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error registering phone'
    });
  }
});

/**
 * Verify a code received via SMS
 * Note: This endpoint is public to allow configuration without authentication
 */
router.post('/verify-direct', async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: 'Phone number or verification code not specified'
      });
    }
    
    await directPhoneService.verifyPhone(phoneNumber, verificationCode);
    
    res.json({
      success: true,
      message: 'Phone verified successfully'
    });
  } catch (error: any) {
    console.error('Error verifying phone:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error verifying phone'
    });
  }
});

/**
 * Disconnect a phone
 * Note: This endpoint is public to allow configuration without authentication
 */
router.post('/disconnect-direct', async (req, res) => {
  try {
    await directPhoneService.disconnectPhone();
    
    res.json({
      success: true,
      message: 'Phone disconnected successfully'
    });
  } catch (error: any) {
    console.error('Error disconnecting phone:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error disconnecting phone'
    });
  }
});

/**
 * Generate a WhatsApp link for a test message
 * Note: This endpoint is public to allow configuration without authentication
 */
router.post('/send-test-direct', async (req, res) => {
  try {
    const result = await directPhoneService.sendTestSms();
    
    res.json({
      success: true,
      message: 'Link WhatsApp generato successfully',
      whatsappLink: result.whatsappLink
    });
  } catch (error: any) {
    console.error('Error generating WhatsApp link:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error generating WhatsApp link'
    });
  }
});

export default router;
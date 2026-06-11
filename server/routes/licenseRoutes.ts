/**
 * API for managing licenses
 */
import { Router } from 'express';
import { licenseService } from '../services/licenseService';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { licenses } from '../../shared/schema';
import { LicenseType } from '../services/licenseService';

const router = Router();

// Verify the status of the current license
router.get('/license-info', async (req, res) => {
  try {
    // If the user is authenticated, get the user's license information
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      if (user.id) {
        console.log(`Getting specific license for user ${user.id} (${user.username})`);
        const licenseInfo = await licenseService.getCurrentLicenseInfo(user.id);
        return res.json(licenseInfo);
      }
    }
    
    // otherwise get the default system license
    console.log('Getting system license (user not authenticated or without ID)');
    const licenseInfo = await licenseService.getCurrentLicenseInfo();
    res.json(licenseInfo);
  } catch (error) {
    console.error('Error retrieving license information:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving license information'
    });
  }
});

// Activate a license with a code
router.post('/activate-license', async (req, res) => {
  try {
    const { activationCode } = req.body;
    
    if (!activationCode) {
      return res.status(400).json({
        success: false,
        message: 'Activation code missing'
      });
    }
    
    const result = await licenseService.activateLicense(activationCode);
    res.json(result);
  } catch (error) {
    console.error('Error activating license:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating license'
    });
  }
});

// Endpoint for verifying if the user has PRO access
router.get('/has-pro-access', async (req, res) => {
  try {
    // If the user is authenticated, explicitly check the user type
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      
      // Admin, staff, ev_admin, ev_staff always have PRO access
      const staffRoles = ['staff', 'ev_staff', 'ev_admin', 'admin'];
      if (user.type === 'admin' || user.type === 'staff' || staffRoles.includes(user.role)) {
        return res.json(true);
      }

      // Customers with Pro, Business, Passepartout or ACTIVE TRIAL license have PRO access
      if ((user.type === 'customer' || user.type === 'user') && user.id) {
        const licenseInfo = await licenseService.getCurrentLicenseInfo(user.id);
        if (licenseInfo.isActive && (
            licenseInfo.type === LicenseType.PRO || 
            licenseInfo.type === LicenseType.BUSINESS || 
            licenseInfo.type === LicenseType.PASSEPARTOUT ||
            licenseInfo.type === LicenseType.TRIAL  // FULL TRIAL: PRO access for 40 days
        )) {
          return res.json(true);
        }
      }
    }
    
    // For standard cases, return false for unauthorized users
    res.json(false);
  } catch (error) {
    console.error('Error verifying PRO access:', error);
    res.status(500).json(false);
  }
});

// Endpoint for verifying if the user has BUSINESS access
router.get('/has-business-access', async (req, res) => {
  try {
    // If the user is authenticated, explicitly check the user type
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      
      // Admin, staff, ev_admin, ev_staff always have Business access
      const staffRolesB = ['staff', 'ev_staff', 'ev_admin', 'admin'];
      if (user.type === 'admin' || user.type === 'staff' || staffRolesB.includes(user.role)) {
        return res.json(true);
      }

      // Customers with Business, Passepartout or ACTIVE TRIAL license have Business access
      if ((user.type === 'customer' || user.type === 'user') && user.id) {
        const licenseInfo = await licenseService.getCurrentLicenseInfo(user.id);
        if (licenseInfo.isActive && (
            licenseInfo.type === LicenseType.BUSINESS || 
            licenseInfo.type === LicenseType.PASSEPARTOUT ||
            licenseInfo.type === LicenseType.TRIAL  // FULL TRIAL: Business access for 40 days
        )) {
          return res.json(true);
        }
      }
    }
    
    // For standard cases, return false for unauthorized users
    res.json(false);
  } catch (error) {
    console.error('Error verifying BUSINESS access:', error);
    res.status(500).json(false);
  }
});

// Endpoint for generating a code (development/test only)
router.post('/generate-code', isAuthenticated, async (req, res) => {
  try {
    const { licenseType } = req.body;
    
    if (!licenseType) {
      return res.status(400).json({
        success: false,
        message: 'License type missing'
      });
    }
    
    // Verify that the license type is valid
    if (!Object.values(LicenseType).includes(licenseType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid license type'
      });
    }
    
    const activationCode = await licenseService.generateActivationCode(licenseType);
    res.json({
      success: true,
      activationCode
    });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating code'
    });
  }
});

// Endpoint to get the application title
router.get('/application-title', async (req, res) => {
  try {
    // If the user is authenticated, customize the title based on the user type
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      console.log('User in application-title:', user);
      
      // Check if the user is admin based on role
      if (user.role === 'admin') {
        console.log('Admin user detected, returning clean title');
        return res.json({ title: "Gestione Appuntamenti" }); // Title without "Trial" for admin
      }
      
      // Check if the user is staff based on type
      if (user.type === 'staff') {
        console.log('Staff user detected, returning PRO title');
        return res.json({ title: "Gestione Appuntamenti PRO" }); // Title for staff
      }
      
      // For customer users, verify the specific license
      if (user.type === 'customer' && user.id) {
        console.log(`Customer user detected (ID: ${user.id}), checking license`);
        const licenseInfo = await licenseService.getCurrentLicenseInfo(user.id);
        
        // Generate a custom title based on the user's license
        let title;
        switch(licenseInfo.type) {
          case 'trial':
            title = "Gestione Appuntamenti Prova";
            break;
          case 'base':
            title = "Gestione Appuntamenti Base";
            break;
          case 'pro':
            title = "Gestione Appuntamenti PRO";
            break;
          case 'business':
            title = "Gestione Appuntamenti BUSINESS";
            break;
          default:
            title = "Gestione Appuntamenti";
        }
        
        console.log(`Using custom title for license type ${licenseInfo.type}: ${title}`);
        return res.json({ title });
      }
    }
    
    // otherwise, use the standard service license logic
    console.log('No special user type, using license service logic');
    const title = await licenseService.getApplicationTitle();
    res.json({ title });
  } catch (error) {
    console.error('Error retrieving application title:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving application title'
    });
  }
});

// Endpoint for creating a permanent activation code
router.post('/create-permanent-code', isAuthenticated, async (req, res) => {
  try {
    const { code, licenseType, password } = req.body;
    
    const devAdminPw = process.env.DEV_ADMIN_PASSWORD;
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction || !devAdminPw || password !== devAdminPw) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator password'
      });
    }
    
    // Verify the license type
    if (!licenseType || !Object.values(LicenseType).includes(licenseType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unspecified license type'
      });
    }
    
    // Format the code by removing spaces and converting to uppercase
    const formattedCode = code.replace(/\s/g, '').toUpperCase();
    
    // Check if the code already exists
    const existingLicense = await db.query.licenses.findFirst({
      where: (licenses, { eq }) => eq(licenses.code, formattedCode)
    });
    
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'This code already exists in the system'
      });
    }
    
    // Insert the new permanent license (without expiration date)
    await db.insert(licenses).values({
      code: formattedCode,
      type: licenseType,
      isActive: true,         // Already active
      createdAt: new Date(),
      activatedAt: new Date(), // Already activated
      expiresAt: null         // No expiry (permanent)
    });
    
    // Format the code for display
    const displayCode = `${formattedCode.substring(0, 4)} ${formattedCode.substring(4, 8)} ${formattedCode.substring(8, 12)} ${formattedCode.substring(12, 16)}`;
    
    res.json({
      success: true,
      message: 'Permanent activation code created successfully',
      code: displayCode,
      type: licenseType
    });
  } catch (error) {
    console.error('Error creating permanent code:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating permanent code'
    });
  }
});

// Middleware to verify admin password without authentication
function verifyAdminPassword(req: any, res: any, next: any) {
  const { password } = req.body;
  const devAdminPw = process.env.DEV_ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd || !devAdminPw || password !== devAdminPw) {
    return res.status(401).json({
      success: false,
      message: 'Invalid administrator password'
    });
  }
  
  next();
}

// Specific endpoint to create the required passepartout code
router.post('/create-passepartout', verifyAdminPassword, async (req, res) => {
  try {
    
    // Passepartout code required (without spaces)
    const rawCode = '0103197320091979';
    
    // Check if the code already exists
    const existingLicense = await db.query.licenses.findFirst({
      where: (licenses, { eq }) => eq(licenses.code, rawCode)
    });
    
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'The passepartout code already exists in the system'
      });
    }
    
    // Insert the new permanent passepartout license
    await db.insert(licenses).values({
      code: rawCode,
      type: LicenseType.PASSEPARTOUT,  // License with access to all features
      isActive: true,                 // Already active
      createdAt: new Date(),
      activatedAt: new Date(),        // Already activated
      expiresAt: null                 // No expiry (permanent)
    });
    
    // Format the code for display
    const displayCode = `${rawCode.substring(0, 4)} ${rawCode.substring(4, 8)} ${rawCode.substring(8, 12)} ${rawCode.substring(12, 16)}`;
    
    res.json({
      success: true,
      message: 'Codice passepartout created successfully',
      code: displayCode,
      type: LicenseType.PASSEPARTOUT
    });
  } catch (error) {
    console.error('Error creating passepartout code:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating passepartout code'
    });
  }
});

export default router;
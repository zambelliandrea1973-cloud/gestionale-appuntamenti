/**
 * Service for sending SMS via Twilio
 */

import twilio from 'twilio';

// Initialize the Twilio client if credentials are present
let twilioClient: twilio.Twilio | null = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.error('Error initializing Twilio client:', error);
  }
} else {
  console.log('Twilio credentials not configured, SMS sending disabled');
}

export { twilioClient };
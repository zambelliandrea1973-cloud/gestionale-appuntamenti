// @ts-nocheck
import { logger } from '../utils/logger';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db';
import { users, staff } from '../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';

const router = Router();

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

router.post("/api/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    logger.debug(`📧 [FORGOT-PASSWORD] Reset request for: ${email}`);

    const [userRecord] = await db.select().from(users).where(eq(users.email, email));
    const [staffRecord] = await db.select().from(staff).where(eq(staff.email, email));
    
    const isStaff = !userRecord && !!staffRecord;
    const foundUser = userRecord || staffRecord;

    if (!foundUser) {
      logger.debug(`📧 [FORGOT-PASSWORD] Email not found: ${email}`);
      return res.status(200).json({ message: "If the email exists, you will receive a reset link" });
    }

    logger.debug(`📧 [FORGOT-PASSWORD] user found: ID ${foundUser.id}, table: ${isStaff ? 'staff' : 'users'}`);

    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    try {
      logger.debug(`📝 [FORGOT-PASSWORD] Saving token for ${isStaff ? 'staff' : 'user'} ID ${foundUser.id}`);
      if (isStaff) {
        await db.update(staff)
          .set({ resetToken, resetTokenExpiry: tokenExpiry })
          .where(eq(staff.id, foundUser.id));
      } else {
        await db.update(users)
          .set({ resetToken, resetTokenExpiry: tokenExpiry })
          .where(eq(users.id, foundUser.id));
      }
      logger.debug(`✅ [FORGOT-PASSWORD] Token saved successfully`);
    } catch (updateError) {
      console.error('❌ [FORGOT-PASSWORD] Error saving token:', updateError);
      return res.status(500).json({ error: "Error saving reset request" });
    }

    const baseUrl = req.get('origin') || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const emailHtml = `
      <h2>Recupero Password</h2>
      <p>Hai required di resettare la tua password. Clicca il link sotto:</p>
      <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reimposta Password
      </a>
      <p>Il link scadrà tra 1 ora.</p>
      <p>Se non hai required questo reset, ignora questa email.</p>
    `;

    try {
      const { sendSystemEmail } = await import('../services/systemEmailService');
      const result = await sendSystemEmail(
        email,
        'Recupero Password - Gestionale Appuntamenti',
        emailHtml
      );

      if (result.success) {
        logger.debug(`✅ Password reset email sent to ${email} from ${result.senderEmail}`);
        return res.status(200).json({ message: "Password reset email sent. Check your inbox." });
      } else {
        console.error(`❌ Password reset email failed: ${result.error}`);
        return res.status(500).json({ error: `Error sending email: ${result.error}` });
      }
    } catch (emailError: any) {
      console.error('❌ Error sending password reset email:', emailError);
      return res.status(500).json({ error: `Error sending email: ${emailError.message}` });
    }
  } catch (error: any) {
    console.error('❌ Error in forgot-password:', error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/api/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).send("Token required");
    }

    logger.debug(`🔍 [DEBUG] Verifying reset token: ${token.substring(0, 10)}...`);
    const now = new Date();
    
    const foundUsers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gt(users.resetTokenExpiry, now)
        )
      );

    logger.debug(`📊 [DEBUG] Found ${foundUsers.length} users with valid token`);
    if (foundUsers.length > 0) {
      logger.debug(`✅ [DEBUG] Token valid for user ${foundUsers[0].email}`);
      return res.status(200).json({ valid: true });
    }

    const foundStaff = await db.select()
      .from(staff)
      .where(
        and(
          eq(staff.resetToken, token),
          gt(staff.resetTokenExpiry, now)
        )
      );

    logger.debug(`📊 [DEBUG] Found ${foundStaff.length} staff with valid token`);
    if (foundStaff.length > 0) {
      logger.debug(`✅ [DEBUG] Token valid for staff ${foundStaff[0].email}`);
      return res.status(200).json({ valid: true });
    }

    console.log(`❌ [DEBUG] Token not found or expired`);
    res.status(400).send("Token expired or invalid");
  } catch (error: any) {
    console.error('❌ Error in verify-reset-token:', error);
    res.status(500).send("Server error");
  }
});

router.post("/api/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).send("Token and new password required");
    }

    if (newPassword.length < 6) {
      return res.status(400).send("Password deve contenere almeno 6 caratteri");
    }

    const now = new Date();
    const { hashPassword } = await import('../auth');
    const hashedPassword = await hashPassword(newPassword);

    logger.debug(`🔄 [DEBUG] Reset password - Token: ${token.substring(0, 10)}...`);

    const foundUsers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gt(users.resetTokenExpiry, now)
        )
      );

    if (foundUsers.length > 0) {
      const user = foundUsers[0];
      logger.debug(`📝 [DEBUG] Updating password for user ${user.id} (${user.email})`);
      
      await db.update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(users.id, user.id));
      
      logger.debug(`✅ Password reset for user ${user.email}`);
      return res.status(200).json({ message: "Password reset successfully" });
    }

    const foundStaff = await db.select()
      .from(staff)
      .where(
        and(
          eq(staff.resetToken, token),
          gt(staff.resetTokenExpiry, now)
        )
      );

    if (foundStaff.length > 0) {
      const staffMember = foundStaff[0];
      logger.debug(`📝 [DEBUG] Updating password for staff ${staffMember.id} (${staffMember.email})`);
      
      await db.update(staff)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(staff.id, staffMember.id));
      
      logger.debug(`✅ Password reset for staff ${staffMember.email}`);
      return res.status(200).json({ message: "Password reset successfully" });
    }

    console.log(`❌ [DEBUG] Token not found or expired`);
    res.status(400).send("Token expired or invalid");
  } catch (error: any) {
    console.error('❌ Error in reset-password:', error);
    res.status(500).send("Server error");
  }
});

export default router;

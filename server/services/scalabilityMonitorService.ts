// @ts-nocheck
import { db } from '../db';
import { users, clients, appointments, userSettings } from '../../shared/schema';
import { sql, eq } from 'drizzle-orm';
import { sendSystemEmail } from './systemEmailService';
import { normalizeLang, getScalabilityWarningStrings, SupportedLang } from '../utils/emailTranslations';

const THRESHOLDS = {
  TOTAL_USERS_WARNING: 500,
  TOTAL_USERS_CRITICAL: 1000,
  TOTAL_CLIENTS_WARNING: 50000,
  TOTAL_CLIENTS_CRITICAL: 100000,
  MAX_CLIENTS_PER_USER_WARNING: 2000,
  MAX_CLIENTS_PER_USER_CRITICAL: 4000,
  TOTAL_APPOINTMENTS_WARNING: 100000,
  TOTAL_APPOINTMENTS_CRITICAL: 500000,
};

interface MonitoringStats {
  totalUsers: number;
  totalClients: number;
  totalAppointments: number;
  maxClientsPerUser: number;
  userWithMaxClients: string | null;
}

let lastWarningsSent: { [key: string]: number } = {};
const WARNING_COOLDOWN_HOURS = 24;

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export const scalabilityMonitorService = {
  async getStats(): Promise<MonitoringStats> {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [clientsCount] = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const [appointmentsCount] = await db.select({ count: sql<number>`count(*)` }).from(appointments);
    
    const clientsPerUser = await db.execute(sql`
      SELECT u.email, COUNT(c.id) as client_count 
      FROM users u 
      LEFT JOIN clients c ON c.user_id = u.id 
      GROUP BY u.id, u.email 
      ORDER BY client_count DESC 
      LIMIT 1
    `);
    
    const topUser = clientsPerUser.rows?.[0] as { email: string; client_count: string } | undefined;
    
    return {
      totalUsers: Number(usersCount.count) || 0,
      totalClients: Number(clientsCount.count) || 0,
      totalAppointments: Number(appointmentsCount.count) || 0,
      maxClientsPerUser: topUser ? Number(topUser.client_count) : 0,
      userWithMaxClients: topUser?.email || null,
    };
  },

  canSendWarning(warningType: string): boolean {
    const lastSent = lastWarningsSent[warningType];
    if (!lastSent) return true;
    
    const hoursSinceLastWarning = (Date.now() - lastSent) / (1000 * 60 * 60);
    return hoursSinceLastWarning >= WARNING_COOLDOWN_HOURS;
  },

  markWarningSent(warningType: string): void {
    lastWarningsSent[warningType] = Date.now();
  },

  /**
   * Fetch the admin user's preferred language.
   * Falls back to 'en' (not 'it') when no preference is set or the stored value
   * is unsupported, because these are operational alerts that are safest in
   * English for a broad admin audience.
   */
  async getAdminLang(): Promise<SupportedLang> {
    const SUPPORTED: SupportedLang[] = ['it', 'en', 'de', 'fr', 'es', 'ru', 'nl', 'no', 'ro'];
    try {
      const [admin] = await db.select({ id: users.id }).from(users).where(sql`type = 'admin'`).limit(1);
      if (admin?.id) {
        const [row] = await db
          .select({ preferences: userSettings.preferences })
          .from(userSettings)
          .where(eq(userSettings.userId, admin.id))
          .limit(1);
        if (row?.preferences) {
          const prefs = row.preferences as Record<string, unknown>;
          if (typeof prefs.language === 'string' && prefs.language) {
            const base = prefs.language.toLowerCase().split(/[-_]/)[0] as SupportedLang;
            if (SUPPORTED.includes(base)) return base;
          }
        }
      }
    } catch {
      // fall through to default
    }
    return 'en';
  },

  /**
   * Send a warning email to the admin.
   * The caller is responsible for building the full, already-localized subject.
   */
  async sendWarningEmail(fullSubject: string, htmlContent: string): Promise<boolean> {
    try {
      const [admin] = await db.select({ email: users.email }).from(users).where(sql`type = 'admin'`).limit(1);
      const adminEmail = admin?.email || 'zambelli.andrea.1973@gmail.com';

      const result = await sendSystemEmail(adminEmail, fullSubject, htmlContent);

      if (result.success) {
        console.log(`📧 [MONITOR] Warning email sent: ${fullSubject}`);
      } else {
        console.error(`❌ [MONITOR] Error sending warning email: ${result.error}`);
      }
      return result.success;
    } catch (error: any) {
      console.error(`❌ [MONITOR] Error sending warning email:`, error);
      return false;
    }
  },

  async checkAndNotify(): Promise<void> {
    console.log('🔍 [MONITOR] Checking scalability thresholds...');
    
    try {
      const stats = await this.getStats();
      const warnings: string[] = [];

      const lang = await this.getAdminLang();
      const t = getScalabilityWarningStrings(lang);
      
      console.log(`📊 [MONITOR] Stats: ${stats.totalUsers} users, ${stats.totalClients} clients, ${stats.totalAppointments} appointments, max ${stats.maxClientsPerUser} clients/user`);

      if (stats.totalUsers >= THRESHOLDS.TOTAL_USERS_CRITICAL && this.canSendWarning('users_critical')) {
        warnings.push(fillTemplate(t.criticalUsers, { count: stats.totalUsers, threshold: THRESHOLDS.TOTAL_USERS_CRITICAL }));
        this.markWarningSent('users_critical');
      } else if (stats.totalUsers >= THRESHOLDS.TOTAL_USERS_WARNING && this.canSendWarning('users_warning')) {
        warnings.push(fillTemplate(t.warningUsers, { count: stats.totalUsers, threshold: THRESHOLDS.TOTAL_USERS_WARNING }));
        this.markWarningSent('users_warning');
      }

      if (stats.totalClients >= THRESHOLDS.TOTAL_CLIENTS_CRITICAL && this.canSendWarning('clients_critical')) {
        warnings.push(fillTemplate(t.criticalClients, { count: stats.totalClients, threshold: THRESHOLDS.TOTAL_CLIENTS_CRITICAL }));
        this.markWarningSent('clients_critical');
      } else if (stats.totalClients >= THRESHOLDS.TOTAL_CLIENTS_WARNING && this.canSendWarning('clients_warning')) {
        warnings.push(fillTemplate(t.warningClients, { count: stats.totalClients, threshold: THRESHOLDS.TOTAL_CLIENTS_WARNING }));
        this.markWarningSent('clients_warning');
      }

      if (stats.maxClientsPerUser >= THRESHOLDS.MAX_CLIENTS_PER_USER_CRITICAL && this.canSendWarning('clients_per_user_critical')) {
        warnings.push(fillTemplate(t.criticalClientsPerUser, { user: stats.userWithMaxClients ?? '', count: stats.maxClientsPerUser, threshold: THRESHOLDS.MAX_CLIENTS_PER_USER_CRITICAL }));
        this.markWarningSent('clients_per_user_critical');
      } else if (stats.maxClientsPerUser >= THRESHOLDS.MAX_CLIENTS_PER_USER_WARNING && this.canSendWarning('clients_per_user_warning')) {
        warnings.push(fillTemplate(t.warningClientsPerUser, { user: stats.userWithMaxClients ?? '', count: stats.maxClientsPerUser, threshold: THRESHOLDS.MAX_CLIENTS_PER_USER_WARNING }));
        this.markWarningSent('clients_per_user_warning');
      }

      if (stats.totalAppointments >= THRESHOLDS.TOTAL_APPOINTMENTS_CRITICAL && this.canSendWarning('appointments_critical')) {
        warnings.push(fillTemplate(t.criticalAppointments, { count: stats.totalAppointments, threshold: THRESHOLDS.TOTAL_APPOINTMENTS_CRITICAL }));
        this.markWarningSent('appointments_critical');
      } else if (stats.totalAppointments >= THRESHOLDS.TOTAL_APPOINTMENTS_WARNING && this.canSendWarning('appointments_warning')) {
        warnings.push(fillTemplate(t.warningAppointments, { count: stats.totalAppointments, threshold: THRESHOLDS.TOTAL_APPOINTMENTS_WARNING }));
        this.markWarningSent('appointments_warning');
      }

      if (warnings.length > 0) {
        const htmlContent = `
          <h2>${t.emailTitle}</h2>
          <p>${t.emailIntro}</p>
          <ul>
            ${warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
          <h3>${t.statsTitle}</h3>
          <ul>
            <li><strong>${t.totalUsersLabel}:</strong> ${stats.totalUsers}</li>
            <li><strong>${t.totalClientsLabel}:</strong> ${stats.totalClients}</li>
            <li><strong>${t.totalAppointmentsLabel}:</strong> ${stats.totalAppointments}</li>
            <li><strong>${t.maxClientsPerUserLabel}:</strong> ${stats.maxClientsPerUser} (${stats.userWithMaxClients})</li>
          </ul>
          <h3>${t.actionsTitle}</h3>
          <ol>
            <li>${t.action1}</li>
            <li>${t.action2}</li>
            <li>${t.action3}</li>
            <li>${t.action4}</li>
          </ol>
          <p><em>${t.cooldownNotice}</em></p>
        `;

        const emailSubject = `⚠️ ${t.subjectThresholds}`;
        await this.sendWarningEmail(emailSubject, htmlContent);
      } else {
        console.log('✅ [MONITOR] No critical threshold reached');
      }
    } catch (error: any) {
      console.error('❌ [MONITOR] Error checking thresholds:', error);
    }
  },

  startMonitoring(intervalHours: number = 6): void {
    console.log(`🚀 [MONITOR] Starting scalability monitoring (every ${intervalHours} hours)`);
    
    setTimeout(() => this.checkAndNotify(), 10000);
    
    setInterval(() => {
      this.checkAndNotify();
    }, intervalHours * 60 * 60 * 1000);
  },
};

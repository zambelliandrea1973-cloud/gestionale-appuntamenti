// @ts-nocheck
import { db } from '../db';
import { users, clients, appointments } from '../../shared/schema';
import { sql } from 'drizzle-orm';
import { sendSystemEmail } from './systemEmailService';

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

  async sendWarningEmail(subject: string, htmlContent: string): Promise<boolean> {
    try {
      const [admin] = await db.select().from(users).where(sql`type = 'admin'`).limit(1);
      const adminEmail = admin?.email || 'zambelli.andrea.1973@gmail.com';

      const result = await sendSystemEmail(
        adminEmail,
        `⚠️ SCALABILITY WARNING: ${subject}`,
        htmlContent
      );

      if (result.success) {
        console.log(`📧 [MONITOR] Warning email sent: ${subject}`);
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
      
      console.log(`📊 [MONITOR] Stats: ${stats.totalUsers} users, ${stats.totalClients} clients, ${stats.totalAppointments} appointments, max ${stats.maxClientsPerUser} clients/user`);

      if (stats.totalUsers >= THRESHOLDS.TOTAL_USERS_CRITICAL && this.canSendWarning('users_critical')) {
        warnings.push(`🚨 CRITICAL: ${stats.totalUsers} registered users (threshold: ${THRESHOLDS.TOTAL_USERS_CRITICAL})`);
        this.markWarningSent('users_critical');
      } else if (stats.totalUsers >= THRESHOLDS.TOTAL_USERS_WARNING && this.canSendWarning('users_warning')) {
        warnings.push(`⚠️ WARNING: ${stats.totalUsers} registered users (warning threshold: ${THRESHOLDS.TOTAL_USERS_WARNING})`);
        this.markWarningSent('users_warning');
      }

      if (stats.totalClients >= THRESHOLDS.TOTAL_CLIENTS_CRITICAL && this.canSendWarning('clients_critical')) {
        warnings.push(`🚨 CRITICAL: ${stats.totalClients} total clients (threshold: ${THRESHOLDS.TOTAL_CLIENTS_CRITICAL})`);
        this.markWarningSent('clients_critical');
      } else if (stats.totalClients >= THRESHOLDS.TOTAL_CLIENTS_WARNING && this.canSendWarning('clients_warning')) {
        warnings.push(`⚠️ WARNING: ${stats.totalClients} total clients (warning threshold: ${THRESHOLDS.TOTAL_CLIENTS_WARNING})`);
        this.markWarningSent('clients_warning');
      }

      if (stats.maxClientsPerUser >= THRESHOLDS.MAX_CLIENTS_PER_USER_CRITICAL && this.canSendWarning('clients_per_user_critical')) {
        warnings.push(`🚨 CRITICAL: User ${stats.userWithMaxClients} has ${stats.maxClientsPerUser} clients (threshold: ${THRESHOLDS.MAX_CLIENTS_PER_USER_CRITICAL})`);
        this.markWarningSent('clients_per_user_critical');
      } else if (stats.maxClientsPerUser >= THRESHOLDS.MAX_CLIENTS_PER_USER_WARNING && this.canSendWarning('clients_per_user_warning')) {
        warnings.push(`⚠️ WARNING: User ${stats.userWithMaxClients} has ${stats.maxClientsPerUser} clients (warning threshold: ${THRESHOLDS.MAX_CLIENTS_PER_USER_WARNING})`);
        this.markWarningSent('clients_per_user_warning');
      }

      if (stats.totalAppointments >= THRESHOLDS.TOTAL_APPOINTMENTS_CRITICAL && this.canSendWarning('appointments_critical')) {
        warnings.push(`🚨 CRITICAL: ${stats.totalAppointments} total appointments (threshold: ${THRESHOLDS.TOTAL_APPOINTMENTS_CRITICAL})`);
        this.markWarningSent('appointments_critical');
      } else if (stats.totalAppointments >= THRESHOLDS.TOTAL_APPOINTMENTS_WARNING && this.canSendWarning('appointments_warning')) {
        warnings.push(`⚠️ WARNING: ${stats.totalAppointments} total appointments (warning threshold: ${THRESHOLDS.TOTAL_APPOINTMENTS_WARNING})`);
        this.markWarningSent('appointments_warning');
      }

      if (warnings.length > 0) {
        const htmlContent = `
          <h2>Scalability Warning - Appointment Manager</h2>
          <p>The system has reached one or more critical thresholds that require attention:</p>
          <ul>
            ${warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
          <h3>Current stats:</h3>
          <ul>
            <li><strong>Total users:</strong> ${stats.totalUsers}</li>
            <li><strong>Total clients:</strong> ${stats.totalClients}</li>
            <li><strong>Total appointments:</strong> ${stats.totalAppointments}</li>
            <li><strong>Max clients per user:</strong> ${stats.maxClientsPerUser} (${stats.userWithMaxClients})</li>
          </ul>
          <h3>Recommended actions:</h3>
          <ol>
            <li>Implement frontend pagination for the client list</li>
            <li>Add server-side search instead of filtering in JavaScript</li>
            <li>Consider adding Redis cache for frequent queries</li>
            <li>Evaluate a database plan upgrade if necessary</li>
          </ol>
          <p><em>This warning will not be resent for the next 24 hours.</em></p>
        `;

        await this.sendWarningEmail('Scalability thresholds reached', htmlContent);
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

import nodemailer from 'nodemailer';
import { db } from '../db';
import { users, clients, appointments } from '../../shared/schema';
import { sql } from 'drizzle-orm';

const ADMIN_EMAIL = 'zambelli.andrea.1973@gmail.com';

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
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SYSTEM_EMAIL_USER || 'gestionale.appuntamenti.noreply@gmail.com',
          pass: process.env.SYSTEM_EMAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: '"Gestionale Appuntamenti - Monitor" <gestionale.appuntamenti.noreply@gmail.com>',
        to: ADMIN_EMAIL,
        subject: `⚠️ SCALABILITY WARNING: ${subject}`,
        html: htmlContent,
      });

      console.log(`📧 [MONITOR] Warning email inviata: ${subject}`);
      return true;
    } catch (error) {
      console.error(`❌ [MONITOR] Errore invio email warning:`, error);
      return false;
    }
  },

  async checkAndNotify(): Promise<void> {
    console.log('🔍 [MONITOR] Controllo soglie scalabilità...');
    
    try {
      const stats = await this.getStats();
      const warnings: string[] = [];
      
      console.log(`📊 [MONITOR] Stats: ${stats.totalUsers} utenti, ${stats.totalClients} clienti, ${stats.totalAppointments} appuntamenti, max ${stats.maxClientsPerUser} clienti/utente`);

      if (stats.totalUsers >= THRESHOLDS.TOTAL_USERS_CRITICAL && this.canSendWarning('users_critical')) {
        warnings.push(`🚨 CRITICO: ${stats.totalUsers} utenti registrati (soglia: ${THRESHOLDS.TOTAL_USERS_CRITICAL})`);
        this.markWarningSent('users_critical');
      } else if (stats.totalUsers >= THRESHOLDS.TOTAL_USERS_WARNING && this.canSendWarning('users_warning')) {
        warnings.push(`⚠️ WARNING: ${stats.totalUsers} utenti registrati (soglia warning: ${THRESHOLDS.TOTAL_USERS_WARNING})`);
        this.markWarningSent('users_warning');
      }

      if (stats.totalClients >= THRESHOLDS.TOTAL_CLIENTS_CRITICAL && this.canSendWarning('clients_critical')) {
        warnings.push(`🚨 CRITICO: ${stats.totalClients} clienti totali (soglia: ${THRESHOLDS.TOTAL_CLIENTS_CRITICAL})`);
        this.markWarningSent('clients_critical');
      } else if (stats.totalClients >= THRESHOLDS.TOTAL_CLIENTS_WARNING && this.canSendWarning('clients_warning')) {
        warnings.push(`⚠️ WARNING: ${stats.totalClients} clienti totali (soglia warning: ${THRESHOLDS.TOTAL_CLIENTS_WARNING})`);
        this.markWarningSent('clients_warning');
      }

      if (stats.maxClientsPerUser >= THRESHOLDS.MAX_CLIENTS_PER_USER_CRITICAL && this.canSendWarning('clients_per_user_critical')) {
        warnings.push(`🚨 CRITICO: Utente ${stats.userWithMaxClients} ha ${stats.maxClientsPerUser} clienti (soglia: ${THRESHOLDS.MAX_CLIENTS_PER_USER_CRITICAL})`);
        this.markWarningSent('clients_per_user_critical');
      } else if (stats.maxClientsPerUser >= THRESHOLDS.MAX_CLIENTS_PER_USER_WARNING && this.canSendWarning('clients_per_user_warning')) {
        warnings.push(`⚠️ WARNING: Utente ${stats.userWithMaxClients} ha ${stats.maxClientsPerUser} clienti (soglia warning: ${THRESHOLDS.MAX_CLIENTS_PER_USER_WARNING})`);
        this.markWarningSent('clients_per_user_warning');
      }

      if (stats.totalAppointments >= THRESHOLDS.TOTAL_APPOINTMENTS_CRITICAL && this.canSendWarning('appointments_critical')) {
        warnings.push(`🚨 CRITICO: ${stats.totalAppointments} appuntamenti totali (soglia: ${THRESHOLDS.TOTAL_APPOINTMENTS_CRITICAL})`);
        this.markWarningSent('appointments_critical');
      } else if (stats.totalAppointments >= THRESHOLDS.TOTAL_APPOINTMENTS_WARNING && this.canSendWarning('appointments_warning')) {
        warnings.push(`⚠️ WARNING: ${stats.totalAppointments} appuntamenti totali (soglia warning: ${THRESHOLDS.TOTAL_APPOINTMENTS_WARNING})`);
        this.markWarningSent('appointments_warning');
      }

      if (warnings.length > 0) {
        const htmlContent = `
          <h2>Avviso Scalabilità - Gestionale Appuntamenti</h2>
          <p>Il sistema ha raggiunto una o più soglie critiche che richiedono attenzione:</p>
          <ul>
            ${warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
          <h3>Statistiche attuali:</h3>
          <ul>
            <li><strong>Utenti totali:</strong> ${stats.totalUsers}</li>
            <li><strong>Clienti totali:</strong> ${stats.totalClients}</li>
            <li><strong>Appuntamenti totali:</strong> ${stats.totalAppointments}</li>
            <li><strong>Max clienti per utente:</strong> ${stats.maxClientsPerUser} (${stats.userWithMaxClients})</li>
          </ul>
          <h3>Azioni consigliate:</h3>
          <ol>
            <li>Implementare paginazione lato frontend per la lista clienti</li>
            <li>Aggiungere ricerca server-side invece di filtrare in JavaScript</li>
            <li>Considerare l'aggiunta di cache Redis per query frequenti</li>
            <li>Valutare upgrade del piano database se necessario</li>
          </ol>
          <p><em>Questo avviso non verrà reinviato per le prossime 24 ore.</em></p>
        `;

        await this.sendWarningEmail('Soglie scalabilità raggiunte', htmlContent);
      } else {
        console.log('✅ [MONITOR] Nessuna soglia critica raggiunta');
      }
    } catch (error) {
      console.error('❌ [MONITOR] Errore nel controllo soglie:', error);
    }
  },

  startMonitoring(intervalHours: number = 6): void {
    console.log(`🚀 [MONITOR] Avvio monitoraggio scalabilità (ogni ${intervalHours} ore)`);
    
    setTimeout(() => this.checkAndNotify(), 10000);
    
    setInterval(() => {
      this.checkAndNotify();
    }, intervalHours * 60 * 60 * 1000);
  },
};

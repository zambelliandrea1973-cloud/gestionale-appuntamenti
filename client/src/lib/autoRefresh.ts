/**
 * Sistema di refresh automatico per evitare problemi di cache
 * Si attiva automaticamente quando vengono fatte modifiche importanti
 */

class AutoRefreshManager {
  private refreshTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isRefreshScheduled = false;

  /**
   * Forza un refresh automatico quando vengono salvate configurazioni importanti
   */
  scheduleRefreshAfterImportantChange(changeType: string, delay: number = 2000) {
    console.log(`🔄 Programmato refresh automatico per: ${changeType}`);
    
    // Cancella eventuali refresh precedenti
    if (this.refreshTimeouts.has(changeType)) {
      clearTimeout(this.refreshTimeouts.get(changeType)!);
    }

    // Programma il nuovo refresh
    const timeout = setTimeout(() => {
      this.performAutoRefresh(changeType);
      this.refreshTimeouts.delete(changeType);
    }, delay);

    this.refreshTimeouts.set(changeType, timeout);
  }

  /**
   * Esegue il refresh automatico
   */
  private performAutoRefresh(changeType: string) {
    if (this.isRefreshScheduled) return;
    
    this.isRefreshScheduled = true;
    
    console.log(`🔄 Eseguendo refresh automatico per: ${changeType}`);
    
    // Forza il reload della pagina per evitare problemi di cache
    window.location.reload();
  }

  /**
   * Refresh specifico per configurazioni bancarie
   */
  refreshAfterBankingConfig() {
    this.scheduleRefreshAfterImportantChange('configurazione_bancaria', 1500);
  }

  /**
   * Refresh specifico per configurazioni WhatsApp
   */
  refreshAfterWhatsAppConfig() {
    this.scheduleRefreshAfterImportantChange('configurazione_whatsapp', 2000);
  }

  /**
   * Refresh specifico per configurazioni email
   */
  refreshAfterEmailConfig() {
    this.scheduleRefreshAfterImportantChange('configurazione_email', 1500);
  }

  /**
   * Refresh specifico per modifiche ai dati utente
   */
  refreshAfterUserDataChange() {
    this.scheduleRefreshAfterImportantChange('dati_utente', 1000);
  }

  /**
   * Cancella tutti i refresh programmati
   */
  cancelAllRefreshes() {
    this.refreshTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.refreshTimeouts.clear();
    this.isRefreshScheduled = false;
  }
}

// Istanza globale del manager
export const autoRefresh = new AutoRefreshManager();

// Funzioni di utilità per integrare facilmente nelle pagine
export const triggerRefreshAfterSave = (configType: 'banking' | 'whatsapp' | 'email' | 'user') => {
  switch (configType) {
    case 'banking':
      autoRefresh.refreshAfterBankingConfig();
      break;
    case 'whatsapp':
      autoRefresh.refreshAfterWhatsAppConfig();
      break;
    case 'email':
      autoRefresh.refreshAfterEmailConfig();
      break;
    case 'user':
      autoRefresh.refreshAfterUserDataChange();
      break;
  }
};
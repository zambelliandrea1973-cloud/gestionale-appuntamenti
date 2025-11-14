# Gestionale Sanitario - Sistema Completo

Sistema di gestione per studi medici e professionisti sanitari.

## Caratteristiche Principali

- 🏥 **Gestione Clienti**: Database completo pazienti con QR code
- 📅 **Calendario Appuntamenti**: Pianificazione e gestione appuntamenti
- 💬 **Notifiche WhatsApp**: Sistema automatico di promemoria
- 💰 **Gestione Fatture**: Fatturazione e pagamenti integrati
- 👥 **Multi-Utente**: Sistema multi-tenant per più professionisti
- 📱 **PWA Clienti**: Area clienti accessibile da mobile
- 🔐 **Sicurezza**: Autenticazione robusta e backup automatici

## Installazione Rapida

```bash
# 1. Estrai il pacchetto
unzip gestionale-sanitario-completo.zip
cd gestionale-sanitario-completo

# 2. Installa dipendenze
npm install

# 3. Configura il sistema
npm run setup

# 4. Avvia il sistema
npm run start
```

## Requisiti di Sistema

- **Node.js**: 18.0.0 o superiore
- **RAM**: 512MB minimo (1GB raccomandato)
- **Storage**: 1GB spazio libero
- **Database**: PostgreSQL 13+ (opzionale, può usare file JSON)

## Configurazione

1. **Database**: PostgreSQL raccomandato per installazioni con molti utenti
2. **Email**: Configurazione SMTP per notifiche
3. **Pagamenti**: Stripe e PayPal supportati (opzionale)

## Struttura del Progetto

```
gestionale-sanitario/
├── client/          # Frontend React
├── server/          # Backend Node.js
├── shared/          # Codice condiviso
├── public/          # File statici
├── docs/            # Documentazione
├── storage_data.json # Database JSON (sviluppo)
└── package.json     # Configurazione progetto
```

## Supporto

- 📖 **Documentazione**: [docs/](./docs/)
- 🚀 **Installazione**: [docs/INSTALLATION.md](./INSTALLATION.md)
- ⚙️ **Configurazione**: [docs/CONFIGURATION.md](./CONFIGURATION.md)
- 🔧 **Risoluzione Problemi**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Licenza

Sistema proprietario. Vietata la ridistribuzione non autorizzata.

---

© 2025 Andrea Zambelli - Gestionale Sanitario

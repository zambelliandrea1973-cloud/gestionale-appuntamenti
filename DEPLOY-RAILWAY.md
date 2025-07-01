# Deploy su Railway (Consigliato per Database Incluso)

## Vantaggi Railway
- ✅ Database PostgreSQL incluso GRATIS
- ✅ Deploy automatico da GitHub
- ✅ SSL certificato automatico
- ✅ Backup database automatici
- ✅ 500 ore gratis al mese

## Setup Veloce

1. **Vai su https://railway.app**
2. **Clicca "Deploy from GitHub"**
3. **Collega il repository**
4. **Aggiungi PostgreSQL**: Click "+ Add Service" → PostgreSQL
5. **Deploy automatico!**

## Setup Manuale

```bash
npm install -g @railway/cli
railway login
railway init
railway add postgresql
railway up
```

## Variabili Automatiche

Railway configura automaticamente:
- `DATABASE_URL` (dal PostgreSQL service)
- `PORT` (automatico)

Aggiungi manualmente:
- `SESSION_SECRET`: stringa casuale sicura

## URL Finali

- **Gestionale**: https://[project-name].up.railway.app
- **Area Clienti**: https://[project-name].up.railway.app/client/[TOKEN]
- **Database**: Incluso e gestito automaticamente

## Aggiornamenti

Ogni push su GitHub → deploy automatico in 2-3 minuti

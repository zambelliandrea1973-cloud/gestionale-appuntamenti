# Deploy Gestionale Sanitario su Vercel

## Deploy Automatico (Consigliato)

1. **Collega a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Sistema completo"
   git remote add origin https://github.com/TUO-USERNAME/gestionale-sanitario.git
   git push -u origin main
   ```

2. **Deploy su Vercel:**
   - Vai su https://vercel.com
   - Clicca "Import Project"
   - Collega il repository GitHub
   - Deploy automatico!

## Deploy Manuale

```bash
npm install -g vercel
npm run build
vercel --prod
```

## Configurazione Variabili

Su Vercel dashboard, aggiungi:
- `DATABASE_URL`: Il tuo database PostgreSQL
- `SESSION_SECRET`: Una stringa segreta casuale

## URL Finali

- **Gestionale Staff**: https://gestionale-sanitario.vercel.app
- **Area Clienti**: https://gestionale-sanitario.vercel.app/client/[TOKEN]
- **QR Codes**: Funzionano automaticamente

## Aggiornamenti Futuri

Ogni volta che modifichi il codice:
```bash
git add .
git commit -m "Aggiornamento"
git push origin main
```

Vercel aggiornerà automaticamente il sito in 2-3 minuti.

## Alternative Hosting

1. **Netlify**: https://netlify.com (gratuito)
2. **Railway**: https://railway.app (per database incluso)
3. **Render**: https://render.com (hosting Node.js)

Tutti mantengono il sistema identico a Replit.

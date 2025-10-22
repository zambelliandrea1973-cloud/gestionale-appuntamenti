# 🚀 Setup Sliplane - Guida Completa

## 📋 Variabili d'Ambiente da Configurare

### 1. Database PostgreSQL (CRITICO!)
```bash
# USA LO STESSO DATABASE_URL di Replit per sincronizzazione real-time!
DATABASE_URL=postgresql://neondb_owner:npg_eT8...@ep-icy-...us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 2. Pagamenti Stripe
```bash
# Chiavi Stripe (usa LIVE per produzione, TEST per test)
STRIPE_SECRET_KEY=sk_live_... oppure sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_live_... oppure pk_test_...

# ⚠️ WEBHOOK SECRET - DA CREARE DOPO IL DEPLOY!
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Come ottenere STRIPE_WEBHOOK_SECRET:**
1. Vai su https://dashboard.stripe.com/webhooks
2. Clicca "Add endpoint"
3. URL: `https://TUO-DOMINIO-SLIPLANE.com/api/payments/stripe/webhook`
4. Eventi da selezionare: `checkout.session.completed`
5. Copia il "Signing secret" (inizia con `whsec_`)
6. Aggiungilo come variabile d'ambiente su Sliplane

### 3. Pagamenti PayPal
```bash
# Chiavi PayPal (usa LIVE per produzione, TEST per sandbox)
PAYPAL_CLIENT_ID=... 
PAYPAL_CLIENT_SECRET=...
PAYPAL_CLIENT_ID_LIVE=...
PAYPAL_CLIENT_SECRET_LIVE=...
```

### 4. Modalità Pagamento
```bash
# "test" = modalità sandbox | "live" = produzione reale
PAYMENT_MODE=live
```

### 5. API Esterne (Opzionali)
```bash
GEMINI_API_KEY=...  # Se usi Google Gemini AI
```

---

## 🔧 Configurazione Webhook Post-Deploy

### Stripe Dashboard
1. Vai su: https://dashboard.stripe.com/webhooks
2. Clicca "Add endpoint"
3. **URL webhook**: `https://TUO-DOMINIO-SLIPLANE.com/api/payments/stripe/webhook`
4. **Eventi**: Seleziona `checkout.session.completed`
5. Salva e copia il "Signing secret"
6. Aggiungi `STRIPE_WEBHOOK_SECRET=whsec_...` su Sliplane

### PayPal Dashboard  
1. Vai su: https://developer.paypal.com/dashboard/applications
2. Seleziona la tua app
3. **URL webhook**: `https://TUO-DOMINIO-SLIPLANE.com/api/payments/paypal/webhook`
4. **Eventi**: Seleziona gli eventi di pagamento necessari

---

## ✅ Checklist Post-Deploy

### Passo 1: Verifica Build
- [ ] Controlla logs Sliplane per confermare build riuscita
- [ ] Verifica che l'app sia raggiungibile su HTTPS

### Passo 2: Test Funzionalità Base
- [ ] Login con utente esistente
- [ ] Verifica sincronizzazione database (stessi dati di Replit)
- [ ] Controlla che tutti gli appuntamenti/clienti siano visibili

### Passo 3: Test Sistema Pagamenti
- [ ] Prova creazione abbonamento
- [ ] Verifica redirect a Stripe/PayPal
- [ ] Controlla che webhook riceva eventi correttamente
- [ ] Verifica creazione automatica commissioni referral (25%)

### Passo 4: Verifica Multi-Tenant Security
- [ ] Login come staff diversi
- [ ] Conferma che ogni utente vede SOLO i propri dati
- [ ] Test isolamento: user 14 vede solo i suoi clienti

---

## 🔍 Troubleshooting Comune

### Problema: Database vuoto su Sliplane
**Soluzione**: Verifica di aver usato lo STESSO `DATABASE_URL` di Replit

### Problema: Webhook Stripe non funziona
**Soluzione**: 
1. Controlla che `STRIPE_WEBHOOK_SECRET` sia configurato
2. Verifica URL webhook su Stripe Dashboard
3. Controlla logs Sliplane per errori di firma

### Problema: Sessioni utente non persistono
**Soluzione**: PostgreSQL gestisce le sessioni, verifica `DATABASE_URL`

---

## 📊 Commissioni Referral Automatiche

Il sistema è già configurato per creare automaticamente commissioni 25% quando:
1. Utente con sponsor (`referred_by`) paga abbonamento
2. Webhook riceve conferma pagamento
3. Sistema calcola 25% del prezzo piano
4. Crea record in `referral_commissions` con payout programmato a +30 giorni

**Nessuna configurazione manuale richiesta!** ✅

---

## 🎯 Comando Push Git

```bash
git add .
git commit -m "Sistema commissioni referral automatico + PostgreSQL migration completa"
git push origin main
```

Sliplane farà automaticamente:
1. `npm ci` (installa dipendenze)
2. `vite build` (compila frontend)  
3. `npx tsx server/index.ts` (avvia server in produzione)

---

## 📞 Support

Per problemi tecnici, controlla:
- Logs Sliplane per errori runtime
- Stripe Dashboard > Developers > Logs per eventi webhook
- Database Neon per verificare sincronizzazione dati

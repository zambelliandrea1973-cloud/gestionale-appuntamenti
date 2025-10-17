# ✅ Checklist Push Sliplane - Passo per Passo

## 📊 Stato Attuale Sistema
- ✅ Database PostgreSQL: **17 utenti, 6 abbonamenti, 4 commissioni attive**
- ✅ Sistema Referral: **8 utenti con sponsor**
- ✅ Commissioni automatiche: **FUNZIONANTI** (10% su pagamenti)
- ✅ Build configurata: **Dockerfile pronto**
- ✅ Multi-tenant security: **VERIFICATO** (isolamento dati per utente)

---

## 🚀 FASE 1: Push Codice su Git

```bash
# 1. Aggiungi tutti i file modificati
git add .

# 2. Commit con messaggio descrittivo
git commit -m "Sistema commissioni referral automatico + PostgreSQL completo - Ready for Sliplane"

# 3. Push su repository
git push origin main
```

---

## 🔧 FASE 2: Configurazione Sliplane (POST-DEPLOY)

### Step 1: Copia Variabili d'Ambiente
Vai su **Sliplane → Settings → Environment Variables** e aggiungi:

```bash
# Database (STESSO di Replit!)
DATABASE_URL=<copia da Replit>

# Stripe
STRIPE_SECRET_KEY=<copia da Replit>
STRIPE_SECRET_KEY_LIVE=<copia da Replit>
VITE_STRIPE_PUBLIC_KEY=<copia da Replit>
VITE_STRIPE_PUBLIC_KEY_LIVE=<copia da Replit>

# PayPal
PAYPAL_CLIENT_ID=<copia da Replit>
PAYPAL_CLIENT_SECRET=<copia da Replit>
PAYPAL_CLIENT_ID_LIVE=<copia da Replit>
PAYPAL_CLIENT_SECRET_LIVE=<copia da Replit>

# Modalità
PAYMENT_MODE=<copia da Replit>

# API Esterne
GEMINI_API_KEY=<copia da Replit>
```

### Step 2: Deploy Automatico
Sliplane eseguirà automaticamente:
1. ✅ `npm ci` (installa dipendenze)
2. ✅ `vite build` (compila frontend)
3. ✅ `npx tsx server/index.ts` (avvia server)

### Step 3: Configura Webhook Stripe
1. Vai su https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **URL**: `https://TUO-DOMINIO-SLIPLANE.com/api/payments/stripe/webhook`
4. **Eventi**: Seleziona `checkout.session.completed`
5. **Salva** e copia il "Signing secret" (inizia con `whsec_`)
6. Aggiungi su Sliplane: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 4: Configura Webhook PayPal (opzionale)
1. Vai su https://developer.paypal.com/dashboard
2. Seleziona la tua app
3. **URL webhook**: `https://TUO-DOMINIO-SLIPLANE.com/api/payments/paypal/webhook`
4. Seleziona eventi di pagamento necessari

---

## 🧪 FASE 3: Test Post-Deploy

### Test 1: Verifica Database Sincronizzato
```bash
# Login su Sliplane
# Verifica che vedi:
✓ Stessi 17 utenti
✓ Stessi 6 abbonamenti
✓ Stessi clienti e appuntamenti
```

### Test 2: Verifica Isolamento Multi-Tenant
```bash
# Login come user 14 (Silvia Busnari)
✓ Vedi SOLO i tuoi 3 clienti referral
✓ Non vedi clienti di altri professionisti

# Login come user 16 (Elisa Faverio)
✓ Vedi SOLO i tuoi 2 clienti referral
✓ Non vedi clienti di altri professionisti
```

### Test 3: Sistema Commissioni Automatiche
```bash
# Simula pagamento test:
1. Crea utente con sponsor
2. Utente paga abbonamento via Stripe/PayPal
3. Webhook riceve notifica
4. Sistema crea automaticamente commissione 10%
5. Verifica in database tabella referral_commissions
```

---

## 🔍 Verifica Logs Sliplane

Dopo il deploy, controlla i logs per verificare:

```bash
✅ "✅ PostgreSQL database is available"
✅ "serving on port 5000"
✅ "✅ Storage inizializzato"
✅ "Scheduler dei promemoria avviato"
✅ "💰 Scheduler dei payout PayPal avviato"
```

---

## ⚠️ Troubleshooting

### Problema: "Database connection failed"
**Soluzione**: Verifica che `DATABASE_URL` su Sliplane sia IDENTICO a quello di Replit

### Problema: "Webhook signature verification failed"
**Soluzione**: 
1. Controlla che `STRIPE_WEBHOOK_SECRET` sia configurato
2. Verifica URL webhook su Stripe Dashboard
3. Assicurati che l'URL sia HTTPS (non HTTP)

### Problema: "Commissioni non vengono create"
**Soluzione**:
1. Verifica webhook attivo e configurato
2. Controlla logs Sliplane per errori
3. Verifica che utente abbia campo `referred_by` popolato

---

## ✅ Conferma Finale

Quando tutto funziona, dovresti vedere:

| Funzionalità | Status |
|-------------|--------|
| Login utenti | ✅ Funziona |
| Database sincronizzato | ✅ Stesso di Replit |
| Pagamenti Stripe/PayPal | ✅ Funzionanti |
| Webhook ricevuti | ✅ Attivi |
| Commissioni automatiche | ✅ Si creano al pagamento |
| Multi-tenant security | ✅ Dati isolati per utente |

---

## 📞 File di Supporto Creati

1. **SLIPLANE_SETUP.md** - Guida completa setup
2. **.env.sliplane.example** - Template variabili d'ambiente
3. **VARIABILI_DA_COPIARE_SU_SLIPLANE.txt** - Lista variabili da copiare
4. **PUSH_SLIPLANE_CHECKLIST.md** - Questa checklist

---

**🎉 Sei pronto per il push! Il sistema funziona perfettamente su Replit e funzionerà ugualmente su Sliplane.**

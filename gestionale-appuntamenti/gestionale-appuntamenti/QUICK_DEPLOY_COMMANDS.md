# 🚀 Quick Deploy Commands - Sliplane

## Comandi Rapidi per il Push (26 Ottobre 2025)

### ✅ Pre-Deploy Check
```bash
# Verifica stato git
git status

# Verifica ultimi commit
git log --oneline -5
```

---

### 🚀 Deploy a Sliplane

#### Opzione 1: Se tutto è già committato
```bash
# Push diretto a Sliplane
git push origin main
```

#### Opzione 2: Se ci sono modifiche da committare
```bash
# Aggiungi tutte le modifiche
git add .

# Commit con messaggio descrittivo
git commit -m "feat: Trial blocking system, admin license management, customer visibility fix - Oct 24 2025"

# Push a Sliplane (trigger auto-deployment)
git push origin main
```

---

### 📊 Monitoraggio Deploy

**Sliplane Dashboard**: 
1. Apri dashboard Sliplane
2. Vai alla sezione "Deployments"
3. Monitora il build in tempo reale
4. Attendi messaggio "Deployment successful"

**Tempo stimato**: 3-5 minuti

---

### ✅ Verifica Post-Deploy

```bash
# 1. Testa URL produzione
https://your-sliplane-domain.com

# 2. Login come admin
# 3. Vai a /payment-admin → tab Licenze
# 4. Verifica che tutti gli utenti siano visibili
# 5. Testa il bottone "+40 giorni"
# 6. Testa modifica date con calendario
```

---

### 🔧 Rollback Rapido (Se Necessario)

```bash
# Annulla ultimo commit e rideploy
git revert HEAD
git push origin main
```

---

## 📋 Modifiche Incluse in Questo Deploy

1. ✅ **Trial Blocking System** - Blocco automatico dopo 40 giorni
2. ✅ **Admin License Management** - Gestione licenze con estensione +40 giorni
3. ✅ **Inline Date Editing** - Modifica date con calendario
4. ✅ **Customer Client Fix** - Bug fix visibilità clienti per utenti customer
5. ✅ **Subscription Badge Fix** - Badge "Abbonamento attivo" solo per utenti paid
6. ✅ **Commission Option B** - Commissioni una tantum (annuali) vs ricorrenti (mensili)
7. ✅ **Translation Completion** - 9 lingue complete (246 stringhe tradotte)
8. ✅ **PWA Icon Fix** - Fix icone PWA con query parameter auth

**Totale**: 12 file modificati, 581 righe aggiunte, 59 righe rimosse

---

## 🎯 Comandi Essenziali

```bash
# Stato corrente
git status

# Push a Sliplane
git push origin main

# Verifica commit history
git log --oneline -5

# Rollback se necessario
git revert HEAD && git push origin main
```

---

**Ready to deploy!** 🚀

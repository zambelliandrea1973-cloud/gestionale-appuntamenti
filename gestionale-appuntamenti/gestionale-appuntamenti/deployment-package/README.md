# 🏥 Gestionale Sanitario - Pacchetto Deployment

## Contenuto Pacchetto

### File di Configurazione
- `install.sh` - Script di installazione automatica
- `docker-compose.yml` - Configurazione Docker
- `Dockerfile` - Container applicazione
- `nginx.conf` - Configurazione web server
- `.env.example` - Template variabili ambiente

### Documentazione
- `deployment-guide.md` - Guida completa deployment
- `README-INSTALLATION.md` - Istruzioni installazione rapida

## Installazione Rapida

### Prerequisiti
- Server Ubuntu 20.04+ con accesso root
- Dominio configurato (biomedicinaintegrata.it)
- 4GB RAM, 20GB storage SSD

### Comando Installazione
```bash
chmod +x install.sh
sudo ./install.sh biomedicinaintegrata.it
```

## Caratteristiche Incluse

✅ **Gestione Clienti**
- Sistema QR code per accesso senza password
- Area clienti PWA (funziona offline)
- Contatori accessi automatici

✅ **Sistema Appuntamenti**
- Calendario integrato
- Notifiche automatiche
- Gestione servizi personalizzabili

✅ **Fatturazione Automatica**
- Numerazione progressiva MM/YYYY/###
- Export PDF e stampa
- Storico completo

✅ **Magazzino PRO**
- Gestione inventario prodotti estetici
- Tracking vendite e movimenti
- Alert scorte basse

✅ **Sicurezza e Backup**
- SSL automatico con Let's Encrypt
- Backup database giornalieri
- Monitoraggio performance

✅ **Multi-Tenant**
- Ogni installazione isolata
- Database dedicato
- Configurazione personalizzabile

## Supporto Tecnico

Email: zambelli.andrea.1973@gmail.com

## Deployment su biomedicinaintegrata.it

Il sistema è preconfigurato per:
- Dominio: biomedicinaintegrata.it
- SSL automatico
- Backup in /var/backups/gestionale-sanitario/
- Logs in /var/log/gestionale-sanitario/

Dopo installazione:
1. Accedi a https://biomedicinaintegrata.it
2. Login: admin / (password mostrata durante installazione)
3. Configura nome studio e contatti
4. Aggiungi primi clienti
5. Sistema pronto all'uso
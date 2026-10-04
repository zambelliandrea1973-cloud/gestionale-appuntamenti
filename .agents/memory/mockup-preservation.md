---
name: Preservare i prototipi quando manca la registrazione dell'artefatto
description: La presenza dei sorgenti sandbox e la registrazione degli artefatti possono non coincidere.
---

Non dedurre che un sandbox sia utilizzabile o registrato solo perché la sua cartella esiste. Non cancellare prototipi precedenti per risolvere una collisione di cartella durante la creazione dell'artefatto.

Fermare temporaneamente i server delle anteprime durante la ricomposizione di branch che aggiungono o rimuovono artefatti.

**Why:** I generatori delle anteprime possono ricreare file durante il checkout, interrompendo la ricomposizione anche quando il progetto risultava pulito subito prima.

**How to apply:** Conservare fuori dal worktree eventuali file generati non tracciati che impediscono il checkout; riprendere tramite la procedura di risoluzione, senza eliminare i prototipi.

**Why:** In questo progetto erano rimasti i sorgenti dei prototipi precedenti, ma l'inventario degli artefatti era vuoto e mancava la configurazione del sandbox. La creazione dell'artefatto rifiutava la cartella già esistente.

**How to apply:** Consultare sia l'inventario degli artefatti sia i file effettivamente presenti. Se occorre ricreare la struttura del sandbox, preservare prima i sorgenti precedenti e reinserirli senza sovrascrivere quelli nuovi. Non modificare il gestionale o pubblicare aggiornamenti per rendere disponibile un'anteprima.
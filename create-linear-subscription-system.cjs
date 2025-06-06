#!/usr/bin/env node

/**
 * SISTEMA ABBONAMENTI LINEARE
 * Implementazione diretta con architettura semplificata
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Implementazione sistema abbonamenti lineare...');

// Creo il sistema di piani abbonamento semplificato
const subscriptionPlansData = {
  trial: {
    name: 'Prova',
    price: 0,
    duration: 40, // giorni
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti'],
    description: 'Per 40 giorni'
  },
  base: {
    name: 'Base',
    price: 3.99,
    duration: 'monthly',
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti'],
    description: 'Per professionisti individuali'
  },
  pro: {
    name: 'PRO',
    price: 6.99,
    duration: 'monthly',
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti', 'Integrazione Google Calendar', 'Gestione fatture', 'Report dettagliati'],
    description: 'Tutte le funzionalità premium'
  },
  business: {
    name: 'Business',
    price: 9.99,
    duration: 'monthly',
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti', 'Integrazione Google Calendar', 'Gestione fatture', 'Report dettagliati', 'Supporto per più operatori'],
    description: 'Per studi con più operatori'
  },
  staff: {
    name: 'Staff',
    price: 0,
    duration: 'lifetime',
    features: ['Piano completo gratuito', 'Possibilità referral', 'Tutte le funzionalità'],
    description: 'Piano completo gratuito a vita'
  }
};

// Salva i piani in un file JSON per facilità di gestione
fs.writeFileSync('./subscription-plans.json', JSON.stringify(subscriptionPlansData, null, 2));

// Creo le credenziali degli account
const accounts = {
  admin: {
    email: 'zambelli.andrea.1973@gmail.com',
    password: 'gironiCO73%',
    type: 'admin',
    plan: 'admin'
  },
  staff: [
    {
      username: 'faverio',
      email: 'faverio@example.com',
      password: 'gironico',
      type: 'staff',
      plan: 'staff'
    },
    {
      username: 'busnari', 
      email: 'busnari@example.com',
      password: 'gironico',
      type: 'staff',
      plan: 'staff'
    }
  ],
  customers: [
    {
      email: 'zambelli.andrea.1973A@gmail.com',
      password: 'gironico',
      type: 'customer',
      plan: 'trial'
    },
    {
      email: 'zambelli.andrea.1973B@gmail.com', 
      password: 'gironico',
      type: 'customer',
      plan: 'trial'
    },
    {
      email: 'zambelli.andrea.1973C@gmail.com',
      password: 'gironico', 
      type: 'customer',
      plan: 'trial'
    },
    {
      email: 'zambelli.andrea.1973D@gmail.com',
      password: 'gironico',
      type: 'customer', 
      plan: 'business' // Questo è l'account già esistente con piano business
    }
  ]
};

// Salva le credenziali
fs.writeFileSync('./accounts-credentials.json', JSON.stringify(accounts, null, 2));

console.log('✅ Sistema abbonamenti lineare creato!');
console.log('📋 Piani abbonamento salvati in: subscription-plans.json');
console.log('🔑 Credenziali account salvate in: accounts-credentials.json');
console.log('');
console.log('🔑 CREDENZIALI ACCESSO:');
console.log('Admin: zambelli.andrea.1973@gmail.com (password: gironiCO73%)');
console.log('Staff: faverio, busnari (password: gironico)');
console.log('Customer: A, B, C, D@gmail.com (password: gironico)');
console.log('');
console.log('📊 PIANI ABBONAMENTO:');
Object.entries(subscriptionPlansData).forEach(([key, plan]) => {
  console.log(`${plan.name}: €${plan.price}/${plan.duration} - ${plan.description}`);
});

console.log('');
console.log('🚀 Sistema pronto per testing multi-utente!');
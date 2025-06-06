#!/usr/bin/env node

/**
 * Setup account utenti con sistema abbonamenti semplificato
 * 
 * ADMIN: zambelli.andrea.1973@gmail.com (password: gironiCO73%)
 * STAFF: faverio, busnari (password: gironico)
 * CUSTOMERS: A, B, C, D (password: gironico)
 */

const { Pool } = require('@neondatabase/serverless');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log('🚀 Setup sistema abbonamenti e utenti...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Crea piani di abbonamento
    console.log('📋 Creazione piani abbonamento...');
    
    const plans = [
      {
        name: 'trial',
        display_name: 'Prova',
        price: '0.00',
        duration: 'trial',
        features: JSON.stringify(['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti']),
        description: 'Per 40 giorni'
      },
      {
        name: 'base',
        display_name: 'Base',
        price: '3.99',
        duration: 'monthly',
        features: JSON.stringify(['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti']),
        description: 'Per professionisti individuali'
      },
      {
        name: 'pro',
        display_name: 'PRO',
        price: '6.99',
        duration: 'monthly',
        features: JSON.stringify(['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti', 'Integrazione Google Calendar', 'Gestione fatture', 'Report dettagliati']),
        description: 'Tutte le funzionalità premium'
      },
      {
        name: 'business',
        display_name: 'Business',
        price: '9.99',
        duration: 'monthly',
        features: JSON.stringify(['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti', 'Integrazione Google Calendar', 'Gestione fatture', 'Report dettagliati', 'Supporto per più operatori']),
        description: 'Per studi con più operatori'
      },
      {
        name: 'staff',
        display_name: 'Staff',
        price: '0.00',
        duration: 'lifetime',
        features: JSON.stringify(['Piano completo gratuito', 'Possibilità referral', 'Tutte le funzionalità']),
        description: 'Piano completo gratuito a vita'
      }
    ];
    
    for (const plan of plans) {
      await pool.query(`
        INSERT INTO subscription_plans (name, display_name, price, duration, features, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (name) DO UPDATE SET
          display_name = $2,
          price = $3,
          duration = $4,
          features = $5
      `, [plan.name, plan.display_name, plan.price, plan.duration, plan.features]);
    }
    
    console.log('✅ Piani abbonamento creati');
    
    // Hash password comuni
    const adminPassword = await hashPassword('gironiCO73%');
    const standardPassword = await hashPassword('gironico');
    
    // Crea account admin
    console.log('👑 Creazione account admin...');
    const adminResult = await pool.query(`
      INSERT INTO users (username, email, password, type, assignment_code)
      VALUES ($1, $2, $3, 'admin', 'ZAM')
      ON CONFLICT (username) DO UPDATE SET
        email = $2,
        password = $3,
        type = 'admin'
      RETURNING id
    `, ['zambelli.andrea.1973@gmail.com', 'zambelli.andrea.1973@gmail.com', adminPassword]);
    
    const adminId = adminResult.rows[0].id;
    console.log(`✅ Admin creato: ID ${adminId}`);
    
    // Crea account staff
    console.log('👥 Creazione account staff...');
    const staffAccounts = [
      { username: 'faverio', email: 'faverio@example.com' },
      { username: 'busnari', email: 'busnari@example.com' }
    ];
    
    const staffPlan = await pool.query('SELECT id FROM subscription_plans WHERE name = $1', ['staff']);
    const staffPlanId = staffPlan.rows[0].id;
    
    for (const staff of staffAccounts) {
      const staffResult = await pool.query(`
        INSERT INTO users (username, email, password, type, assignment_code)
        VALUES ($1, $2, $3, 'staff', 'ZAM')
        ON CONFLICT (username) DO UPDATE SET
          email = $2,
          password = $3,
          type = 'staff'
        RETURNING id
      `, [staff.username, staff.email, standardPassword]);
      
      const staffId = staffResult.rows[0].id;
      
      // Assegna piano staff
      await pool.query(`
        INSERT INTO user_subscriptions (user_id, plan_id, status, start_date)
        VALUES ($1, $2, 'active', NOW())
        ON CONFLICT DO NOTHING
      `, [staffId, staffPlanId]);
      
      console.log(`✅ Staff creato: ${staff.username} (ID ${staffId})`);
    }
    
    // Crea account customer
    console.log('💼 Creazione account customer...');
    const customerAccounts = ['A', 'B', 'C', 'D'];
    const trialPlan = await pool.query('SELECT id FROM subscription_plans WHERE name = $1', ['trial']);
    const trialPlanId = trialPlan.rows[0].id;
    
    for (const customer of customerAccounts) {
      const email = `zambelli.andrea.1973${customer}@gmail.com`;
      const customerResult = await pool.query(`
        INSERT INTO users (username, email, password, type, assignment_code)
        VALUES ($1, $2, $3, 'customer', 'ZAM')
        ON CONFLICT (username) DO UPDATE SET
          email = $2,
          password = $3,
          type = 'customer'
        RETURNING id
      `, [email, email, standardPassword]);
      
      const customerId = customerResult.rows[0].id;
      
      // Assegna piano trial iniziale
      await pool.query(`
        INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
        VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '40 days')
        ON CONFLICT DO NOTHING
      `, [customerId, trialPlanId]);
      
      console.log(`✅ Customer creato: ${email} (ID ${customerId})`);
    }
    
    console.log('✅ Sistema abbonamenti e utenti completato!');
    console.log('');
    console.log('🔑 CREDENZIALI ACCESSO:');
    console.log('Admin: zambelli.andrea.1973@gmail.com (password: gironiCO73%)');
    console.log('Staff: faverio, busnari (password: gironico)');
    console.log('Customer: A, B, C, D@gmail.com (password: gironico)');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

main();
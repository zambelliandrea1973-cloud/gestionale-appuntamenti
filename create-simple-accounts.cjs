#!/usr/bin/env node

/**
 * Creazione account con approccio semplificato
 * Utilizza l'API esistente per creare gli account
 */

const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createAccount(username, email, password, type) {
  const hashedPassword = await hashPassword(password);
  
  const response = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: email,
      email: email,
      password: password,
      type: type
    })
  });
  
  if (response.ok) {
    const user = await response.json();
    console.log(`✅ Account creato: ${email} (${type}) - ID: ${user.id}`);
    return user;
  } else {
    const error = await response.text();
    console.log(`⚠️ Account ${email}: ${error}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Creazione account con sistema semplificato...');
  
  // Account Admin
  await createAccount(
    'zambelli.andrea.1973@gmail.com',
    'zambelli.andrea.1973@gmail.com', 
    'gironiCO73%',
    'admin'
  );
  
  // Account Staff
  await createAccount(
    'faverio',
    'faverio@example.com',
    'gironico',
    'staff'
  );
  
  await createAccount(
    'busnari',
    'busnari@example.com', 
    'gironico',
    'staff'
  );
  
  // Account Customer
  const customers = ['A', 'B', 'C', 'D'];
  for (const customer of customers) {
    await createAccount(
      `zambelli.andrea.1973${customer}@gmail.com`,
      `zambelli.andrea.1973${customer}@gmail.com`,
      'gironico',
      'customer'
    );
  }
  
  console.log('✅ Tutti gli account sono stati creati!');
  console.log('');
  console.log('🔑 CREDENZIALI ACCESSO:');
  console.log('Admin: zambelli.andrea.1973@gmail.com (password: gironiCO73%)');
  console.log('Staff: faverio, busnari (password: gironico)');
  console.log('Customer: A, B, C, D@gmail.com (password: gironico)');
}

main().catch(console.error);
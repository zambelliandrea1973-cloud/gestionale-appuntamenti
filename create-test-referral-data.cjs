/**
 * Script per creare dati di test per il sistema referral
 * Aggiungerà commissioni pending ad alcuni staff per testare i bottoni di pagamento
 */

const fs = require('fs');
const path = require('path');

// Simula alcuni staff con commissioni pending per test
const testStaffData = {
  BUS14: {
    staffId: 12, // Silvia
    staffName: "Silvia Busnari", 
    staffEmail: "silvia.busnari@example.com",
    sponsoredCount: 5, // Ha raggiunto la quota
    totalCommissions: 500, // €5.00 in centesimi
    paidCommissions: 200,   // €2.00 già pagate
    pendingCommissions: 300, // €3.00 da pagare
    iban: "IT60 X054 2811 1010 0000 0123 456"
  },
  FAV16: {
    staffId: 16, // Elisa  
    staffName: "Elisa Faverio",
    staffEmail: "elisafaverio6@gmail.com", 
    sponsoredCount: 4, // Ha raggiunto la quota
    totalCommissions: 400, // €4.00 in centesimi
    paidCommissions: 100,  // €1.00 già pagate
    pendingCommissions: 300, // €3.00 da pagare
    iban: "IT28 W800 0000 2921 0064 5211 151"
  },
  PR120: {
    staffId: 20,
    staffName: "Staff Test 1", 
    staffEmail: "staff1@test.com",
    sponsoredCount: 2, // Non ha ancora raggiunto la quota
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0,
    iban: null
  }
};

// Salva i dati di test
const filePath = path.join(__dirname, 'test-referral-data.json');
fs.writeFileSync(filePath, JSON.stringify(testStaffData, null, 2));

console.log('✅ DATI TEST REFERRAL CREATI!');
console.log('📄 File salvato in:', filePath);
console.log('📊 Staff con commissioni pending:', Object.keys(testStaffData).filter(code => testStaffData[code].pendingCommissions > 0));
console.log('💰 Staff idonei al pagamento:', Object.keys(testStaffData).filter(code => testStaffData[code].sponsoredCount >= 3 && testStaffData[code].pendingCommissions > 0));
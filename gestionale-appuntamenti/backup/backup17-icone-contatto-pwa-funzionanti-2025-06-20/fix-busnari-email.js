import fs from 'fs';

// Read storage data
const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));

// Update Busnari's email in users array
if (storageData.users) {
  storageData.users = storageData.users.map(([id, userData]) => {
    if (id === 11 && userData.username === 'busnari.test@gmail.com') {
      return [id, {
        ...userData,
        username: 'busnari.silvia@libero.it',
        email: 'busnari.silvia@libero.it'
      }];
    }
    return [id, userData];
  });
}

// Update referral codes description for Busnari
if (storageData.referralCodes) {
  storageData.referralCodes = storageData.referralCodes.map(code => {
    if (code.ownerId === 11) {
      return {
        ...code,
        description: 'Codice referral Busnari Silvia Staff'
      };
    }
    return code;
  });
}

// Update commission notes for Busnari
if (storageData.referralCommissions) {
  storageData.referralCommissions = storageData.referralCommissions.map(commission => {
    if (commission.referrerId === 11) {
      return {
        ...commission,
        notes: commission.notes ? commission.notes.replace('Busnari', 'Busnari Silvia') : commission.notes
      };
    }
    return commission;
  });
}

// Write updated data
fs.writeFileSync('storage_data.json', JSON.stringify(storageData, null, 2));

console.log('✅ Aggiornato email Busnari da busnari.test@gmail.com a busnari.silvia@libero.it');
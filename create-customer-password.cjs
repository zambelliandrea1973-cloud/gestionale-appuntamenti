const crypto = require('crypto');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

async function main() {
  const password = 'acquirente123';
  const hashedPassword = await hashPassword(password);
  console.log('Password originale:', password);
  console.log('Password hash:', hashedPassword);
}

main().catch(console.error);
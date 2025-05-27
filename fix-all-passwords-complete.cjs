/**
 * Script per ripristinare TUTTE le password degli account
 */
const { scrypt, randomBytes } = require("crypto");
const { promisify } = require("util");
const { Pool } = require("pg");

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Password ripristinate agli originali
    const accounts = [
      { email: "zambelli.andrea.1973@gmail.com", password: "gironiCO73%" },
      { email: "zambelli.andrea.1973A@gmail.com", password: "gironico" },
      { email: "zambelli.andrea.1973B@gmail.com", password: "gironico" },
      { email: "zambelli.andrea.1973C@gmail.com", password: "gironico" },
      { email: "zambelli.andrea.1973D@gmail.com", password: "gironico" },
      { email: "test@example.com", password: "password123" },
      { email: "zambelli.andrea.19732@gmail.com", password: "password123" },
      { email: "busnari.silvia@libero.it", password: "password123" },
      { email: "faverioelisa6@gmail.com", password: "password123" },
      { email: "testpayment@example.com", password: "password123" },
      { email: "professionista.test@example.com", password: "password123" },
      { email: "1professionista.test@example.com", password: "password123" },
      { email: "2professionista.test@example.com", password: "password123" },
      { email: "3professionista.test@example.com", password: "password123" },
      { email: "4professionista.test@example.com", password: "password123" }
    ];

    console.log("🔧 RIPRISTINO COMPLETO DELLE PASSWORD IN CORSO...\n");

    for (const account of accounts) {
      const hashedPassword = await hashPassword(account.password);
      
      // Aggiorna nella tabella users
      const userResult = await pool.query(
        "UPDATE users SET password = $1 WHERE email = $2 RETURNING id, username, type",
        [hashedPassword, account.email]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        console.log(`✅ Password ripristinata per ${user.username} (ID: ${user.id}, Tipo: ${user.type})`);
        
        // Password aggiornata solo nella tabella users (clients non ha campo password)
      } else {
        console.log(`❌ Account non trovato: ${account.email}`);
      }
    }

    console.log("\n🎉 RIPRISTINO COMPLETATO!");
    console.log("\n📋 PASSWORD RIPRISTINATE:");
    console.log("Admin: zambelli.andrea.1973@gmail.com → gironiCO73%");
    console.log("Customer A-D: zambelli.andrea.1973[A-D]@gmail.com → gironico");
    console.log("Altri account: → password123");

  } catch (error) {
    console.error("❌ Errore durante il ripristino:", error);
  } finally {
    await pool.end();
  }
}

main();
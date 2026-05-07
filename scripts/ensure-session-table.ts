import pg from "pg";

async function run() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL — skipping user_sessions check");
    process.exit(0);
  }
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      ) WITH (OIDS=FALSE);
    `);
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
        ) THEN
          ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey"
            PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
      END$$;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
    `);
    console.log("✅ user_sessions table verified/created");
  } catch (e: any) {
    console.error("❌ user_sessions creation failed:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

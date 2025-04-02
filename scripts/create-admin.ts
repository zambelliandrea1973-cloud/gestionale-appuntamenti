import { storage } from "../server/storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  try {
    // Controlla se esiste già un utente admin
    const adminExists = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    
    if (adminExists.length > 0) {
      console.log("Admin user already exists.");
      return;
    }
    
    // Crea l'utente admin
    const adminUser = {
      username: "admin",
      password: await hashPassword("admin123"),
      email: "admin@example.com",
      role: "admin"
    };
    
    const createdUser = await storage.createUser(adminUser);
    console.log("Admin user created successfully:", createdUser);
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
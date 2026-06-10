import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { isAdmin } from "../auth";
import { loadStorageData } from "../utils/jsonStorage";
import { db } from "../db";
import { users, userSettings, licenses } from "../../shared/schema";
import { or, like, sql, eq, and } from "drizzle-orm";

const STAFF_ROLES = ['staff', 'ev_staff', 'ev_admin', 'admin'];

/** Garantisce che l'utente abbia una licenza staff_free attiva (crea se mancante). */
async function ensureStaffFreeLicense(userId: number): Promise<void> {
  try {
    const existing = await db.select()
      .from(licenses)
      .where(and(
        eq(licenses.userId, userId),
        eq(licenses.isActive, true)
      ))
      .limit(1);

    if (existing.length === 0) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10);
      const prefix = String(userId).padStart(6, '0');
      await db.insert(licenses).values({
        code: `SFREE-${prefix}`,
        type: 'staff_free',
        isActive: true,
        userId,
        activatedAt: new Date(),
        expiresAt,
      });
    }
  } catch (err) {
    console.error(`[ensureStaffFreeLicense] Error for userId ${userId}:`, err);
  }
}

/** Disattiva le licenze staff quando l'utente viene declassato a user/customer. */
async function revokeStaffLicense(userId: number): Promise<void> {
  try {
    await db.update(licenses)
      .set({ isActive: false })
      .where(and(
        eq(licenses.userId, userId),
        eq(licenses.isActive, true)
      ));
  } catch (err) {
    console.error(`[revokeStaffLicense] Error for userId ${userId}:`, err);
  }
}

/**
 * Configure routes for staff user management
 */
export default function setupStaffRoutes(app: Express) {
  // Get the list of all staff users (only for admin) - alternative endpoint
  app.get("/api/staff/users", isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("🔵 [/api/staff/users] START - Retrieving staff from PostgreSQL database");
      
      // Retrieve all staff users from the database
      const staffUsers = await storage.getAllStaffUsers();
      console.log(`🔵 [/api/staff/users] Found ${staffUsers.length} staff users from the database`);
      
      // Remove passwords and add referral codes
      const safeUsers = staffUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        
        // Generate the code referral per each staff
        const referralCode = user.id === 14 ? "BUS14" : 
                           user.id === 16 ? "FAV16" : 
                           user.id === 8 ? "ZAM08" : 
                           `REF${user.id}`;
        
        return {
          ...userWithoutPassword,
          referralCode: referralCode
        };
      });
      
      console.log(`📋 STAFF USERS WITH REFERRAL CODES: ${safeUsers.length} accounts prepared`);
      console.log(`🔵 [/api/staff/users] Sending JSON response with ${safeUsers.length} users`);
      res.json(safeUsers);
    } catch (error) {
      console.error("❌ [/api/staff/users] Error retrieving users staff:", error);
      res.status(500).json({ message: "An error occurred retrieving staff users" });
    }
  });

  // Get the list of all staff users (only for admin)
  app.get("/api/staff/list", isAdmin, async (req: Request, res: Response) => {
    try {
      // Retrieve all staff users from the database
      const staffUsers = await storage.getAllStaffUsers();
      
      // Remove passwords and add referral codes
      const safeUsers = staffUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        
        // Generate the code referral per each staff
        const referralCode = user.id === 14 ? "BUS14" : 
                           user.id === 16 ? "FAV16" : 
                           user.id === 8 ? "ZAM08" : 
                           `REF${user.id}`;
        
        return {
          ...userWithoutPassword,
          referralCode: referralCode
        };
      });
      
      console.log(`📋 STAFF LIST WITH REFERRAL CODES: ${safeUsers.length} accounts prepared`);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error retrieving users staff:", error);
      res.status(500).json({ message: "An error occurred retrieving staff users" });
    }
  });

  // Search users by partial username or email (admin only)
  app.get("/api/staff/search", isAdmin, async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || "").trim().toLowerCase();
      if (!q || q.length < 2) return res.json([]);

      const term = `%${q}%`;

      // Search users by username, email OR business name (from userSettings)
      const results = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        type: users.type,
        businessName: userSettings.businessName,
      })
      .from(users)
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(
        or(
          like(sql`LOWER(${users.username})`, term),
          like(sql`LOWER(COALESCE(${users.email}, ''))`, term),
          like(sql`LOWER(COALESCE(${userSettings.businessName}, ''))`, term)
        )
      )
      .limit(10);

      res.json(results);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Search error" });
    }
  });

  // Promote an existing user to a new role (admin only, no password needed)
  app.post("/api/staff/promote/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });
      if (!['staff', 'admin', 'user', 'ev_admin', 'ev_staff'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const updateData: any = { role };
      if (role === 'user') updateData.type = 'customer';
      else if (role === 'ev_admin' || role === 'ev_staff') updateData.type = 'staff';
      else updateData.type = role;

      // Generate assignmentCode if promoting to staff/ev_admin/ev_staff and missing
      if ((role === 'staff' || role === 'ev_admin' || role === 'ev_staff') && !user.assignmentCode) {
        const prefix = (user.username || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
        updateData.assignmentCode = `${prefix}${String(userId).padStart(4, '0')}`;
      }

      const updated = await storage.updateUser(userId, updateData);
      if (!updated) return res.status(500).json({ message: "Unable to promote user" });

      // Gestione licenza automatica
      if (STAFF_ROLES.includes(role)) {
        await ensureStaffFreeLicense(userId);
      } else if (role === 'user') {
        await revokeStaffLicense(userId);
      }

      const { password: _, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      console.error("Error promoting user:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  // Create a new staff user (admin only)
  app.post("/api/staff/register", isAdmin, async (req: Request, res: Response) => {
    try {
      const { username, password, email, role } = req.body;
      
      // Verify that username and password are present
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Check if the username is already in use
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already in use" });
      }
      
      // Create the password hash
      const hashedPassword = await hashPassword(password);
      
      // Set the role and type
      let userRole = 'staff';
      let userType = 'staff';
      
      if (role === 'admin') {
        userRole = 'admin';
        userType = 'admin';
      } else if (role === 'user' || role === 'customer') {
        userRole = 'user';
        userType = 'customer';
      } else if (role === 'ev_admin') {
        userRole = 'ev_admin';
        userType = 'staff';
      } else if (role === 'ev_staff') {
        userRole = 'ev_staff';
        userType = 'staff';
      } else {
        userRole = 'staff';
        userType = 'staff';
      }
      
      // Create the new user
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        role: userRole,
        type: userType,
        clientId: null
      });
      
      console.log(`new user staff created: ${username} (${email || 'no email'}) with role ${userRole}`);

      // Licenza automatica per nuovi staff/ev_staff/ev_admin/admin
      if (STAFF_ROLES.includes(userRole)) {
        await ensureStaffFreeLicense(newUser.id);
      }

      // Return the new user (without the password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating staff user:", error);
      res.status(500).json({ message: "An error occurred creating the staff user" });
    }
  });

  // Update a staff user (admin only)
  app.patch("/api/staff/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verify that the ID is valid
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Verify that the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify that the user is a staff member (not a client)
      if (user.clientId) {
        return res.status(400).json({ message: "Cannot modify a client user from this API" });
      }
      
      // Data to update
      const updateData: any = {};
      const { username, email, password, role } = req.body;
      
      // Check if username was provided and if it has changed
      if (username && username !== user.username) {
        // Check if the username is already in use by another user
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already in use by another user" });
        }
        updateData.username = username;
      }
      
      // Update email if provided
      if (email !== undefined) {
        updateData.email = email || null; // Allow removing the email by setting null
      }
      
      // Update the password if provided
      if (password) {
        updateData.password = await hashPassword(password);
      }
      
      // Update the role if provided (only admin can modify roles)
      if (role !== undefined && (role === 'admin' || role === 'staff' || role === 'user' || role === 'ev_admin' || role === 'ev_staff')) {
        updateData.role = role;
        
        // if the role is 'user', also change the type to 'customer'
        if (role === 'user') {
          updateData.type = 'customer';
        } else if (role === 'ev_admin' || role === 'ev_staff') {
          // ev_admin and ev_staff are stored with type 'staff'
          updateData.type = 'staff';
        } else {
          // Staff and Admin have type equal to role
          updateData.type = role;
        }

        // If promoted to staff/ev_admin/ev_staff and the user does not yet have an assignmentCode,
        // generate one automatically (required for client visibility)
        if ((role === 'staff' || role === 'ev_admin' || role === 'ev_staff') && !user.assignmentCode) {
          const alphanumUsername = (user.username || '').replace(/[^a-zA-Z0-9]/g, '');
          const prefix = alphanumUsername.substring(0, 3).toUpperCase().padEnd(3, 'X');
          const paddedId = String(userId).padStart(4, '0');
          updateData.assignmentCode = `${prefix}${paddedId}`;
        }
      }
      
      // Verify that there is at least one field to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No data to update provided" });
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updateData);

      // Gestione licenza automatica al cambio di ruolo
      if (role !== undefined) {
        if (STAFF_ROLES.includes(role)) {
          await ensureStaffFreeLicense(userId);
        } else if (role === 'user') {
          await revokeStaffLicense(userId);
        }
      }

      if (updatedUser) {
        // Remove the password from the response
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Unable to update user" });
      }
    } catch (error) {
      console.error("Error updating staff user:", error);
      res.status(500).json({ message: "An error occurred updating the staff user" });
    }
  });

  // Delete a staff user (admin only)
  app.delete("/api/staff/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verify that the ID is valid
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Verify that the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify that the user is a staff member (not a client)
      if (user.clientId) {
        return res.status(400).json({ message: "Cannot delete a client user from this API" });
      }
      
      // Prevent deletion of the main admin account
      if (user.role === 'admin' && user.username === 'zambelli.andrea.1973@gmail.com') {
        return res.status(403).json({ message: "Cannot delete the main administrator account" });
      }
      
      // CROSS-STORE PROTECTION: Check if user has data in JSON before deleting
      const storageData = loadStorageData();
      
      // Normalize JSON structure (supports both [id, obj] and obj)
      const clients = (storageData.clients || []).map((it: any) => Array.isArray(it) ? it[1] : it);
      const appointments = (storageData.appointments || []).map((it: any) => Array.isArray(it) ? it[1] : it);
      
      const userClients = clients.filter((client: any) => client.ownerId === userId);
      const userAppointments = appointments.filter((appt: any) => {
        // Find the appointment client and verify if it belongs to this user
        const apptClient = clients.find((c: any) => c.id === appt.clientId);
        return apptClient && apptClient.ownerId === userId;
      });
      
      if (userClients.length > 0 || userAppointments.length > 0) {
        console.error(`❌ [PROTECTION] Cannot delete user ${userId}: has ${userClients.length} clients and ${userAppointments.length} appointments in JSON`);
        return res.status(409).json({ 
          message: `Cannot delete: the user has ${userClients.length} clients and ${userAppointments.length} associated appointments`,
          error: "HAS_RELATED_DATA",
          details: {
            clients: userClients.length,
            appointments: userAppointments.length
          }
        });
      }
      
      console.log(`✅ [PROTEZIONE] user ${userId} has no JSON data, safe to delete`);
      
      // Delete the user
      const deleted = await storage.deleteUser(userId);
      
      if (deleted) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ message: "Unable to delete user" });
      }
    } catch (error) {
      console.error("Error deleting staff user:", error);
      res.status(500).json({ message: "An error occurred deleting the staff user" });
    }
  });
}
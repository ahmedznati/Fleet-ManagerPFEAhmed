import type { Express } from "express";
import { createServer, type Server } from "http";
import https from "https";
import { storage } from "./storage";
import { isAuthenticatedJWT, requireRole } from "./jwt-auth";
import { registerJWTAuthRoutes } from "./jwt-routes";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, userRoles, vehicles, drivers, gpsTracking } from "@shared/schema";
import { eq, lte, gte, and } from "drizzle-orm";
import { generateRandomPassword, sendLicenseExpiryWarningToDriver, sendLicenseExpiryNotificationToAdmin } from "./email-service";
import { broadcastGpsUpdate } from "./websocket";

// Function to check for expiring licenses and send notifications
async function checkExpiringLicenses() {
  console.log('[LICENSE CHECK] Running license expiry check...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check licenses expiring within 10 days
    const tenDaysFromNow = new Date(today);
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    
    // Get all drivers with license expiring within 10 days or already expired
    const expiringDrivers = await db.select().from(drivers)
      .where(lte(drivers.licenseExpiry, tenDaysFromNow));
    
    // Get admin emails for notifications
    const adminUsers = await db.select().from(users).where(eq(users.role, 'operateur'));
    const superAdmins = await db.select().from(users).where(eq(users.role, 'superadmin'));
    const adminEmails = [...adminUsers, ...superAdmins].map(u => u.email).filter(Boolean) as string[];
    
    for (const driver of expiringDrivers) {
      if (!driver.licenseExpiry) continue;
      
      const expiryDate = new Date(driver.licenseExpiry);
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Auto-deactivate drivers with expired licenses
      if (daysRemaining <= 0 && driver.status === 'active') {
        await db.update(drivers)
          .set({ status: 'inactive', updatedAt: new Date() })
          .where(eq(drivers.id, driver.id));
        console.log(`[LICENSE CHECK] Auto-deactivated driver ${driver.firstName} ${driver.lastName} - license expired`);
      }

      // Send notification to driver
      await sendLicenseExpiryWarningToDriver(
        driver.email,
        `${driver.firstName} ${driver.lastName}`,
        expiryDate,
        daysRemaining
      );
      
      // Send notification to all admins
      for (const adminEmail of adminEmails) {
        await sendLicenseExpiryNotificationToAdmin(
          adminEmail,
          `${driver.firstName} ${driver.lastName}`,
          driver.email,
          expiryDate,
          daysRemaining
        );
      }
      
      console.log(`[LICENSE CHECK] Sent notifications for ${driver.firstName} ${driver.lastName} (${daysRemaining} days remaining)`);
    }
    
    console.log(`[LICENSE CHECK] Completed. Checked ${expiringDrivers.length} expiring licenses.`);
  } catch (error) {
    console.error('[LICENSE CHECK] Error:', error);
  }
}

// Start the license check scheduler (runs daily)
function startLicenseCheckScheduler() {
  // Run immediately on startup
  setTimeout(() => checkExpiringLicenses(), 5000); // 5 second delay after startup
  
  // Then run every 24 hours
  setInterval(() => checkExpiringLicenses(), 24 * 60 * 60 * 1000);
  
  console.log('[LICENSE CHECK] Scheduler started - will check daily');
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register JWT-based auth routes (signup/login)
  registerJWTAuthRoutes(app);
  
  // Start license expiry check scheduler
  startLicenseCheckScheduler();

  // === User Profile Routes ===
  app.get(api.users.me.path, isAuthenticatedJWT, async (req: any, res) => {
    const userId = req.user.userId;
    
    // Get user from users table
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    // Get additional profile data from userRoles table
    const role = await storage.getUserRole(userId);
    
    // Combine data from both tables
    const profileData = {
      id: role?.id || null,
      userId: userId,
      role: user?.role || role?.role || 'user',
      phoneNumber: role?.phoneNumber || null,
      driverId: role?.driverId || null,
      // Include user data
      email: user?.email || null,
      firstName: user?.firstName || null,
      lastName: user?.lastName || null,
      profileImageUrl: user?.profileImageUrl || null,
    };
    
    res.json(profileData);
  });

  app.post(api.users.updateProfile.path, isAuthenticatedJWT, async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const input = api.users.updateProfile.input.parse(req.body);
        const role = await storage.upsertUserRole({ ...input, userId });
        res.json(role);
    } catch (err) {
        res.status(400).json({ message: "Invalid input" });
    }
  });

  // Upload / update profile image
  app.post("/api/user/profile-image", isAuthenticatedJWT, async (req: any, res: any) => {
    try {
      const userId = req.user.userId;
      const { profileImageUrl } = req.body;

      if (!profileImageUrl || typeof profileImageUrl !== 'string') {
        return res.status(400).json({ message: "profileImageUrl is required" });
      }

      // Limit base64 size (~2MB)
      if (profileImageUrl.length > 3 * 1024 * 1024) {
        return res.status(400).json({ message: "Image trop volumineuse (max 2 Mo)" });
      }

      const [updated] = await db.update(users)
        .set({ profileImageUrl, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) return res.status(404).json({ message: "User not found" });

      res.json({ message: "Photo de profil mise à jour", profileImageUrl: updated.profileImageUrl });
    } catch (err) {
      console.error("[PROFILE IMAGE] Error:", err);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la photo" });
    }
  });

  // === License Expiry Check API (Operateur/Superadmin) ===
  app.get("/api/drivers/expiring-licenses", isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tenDaysFromNow = new Date(today);
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
      
      // Get all drivers with license expiring within 10 days or already expired
      const expiringDrivers = await db.select().from(drivers)
        .where(lte(drivers.licenseExpiry, tenDaysFromNow));
      
      const result = expiringDrivers.map(driver => {
        const expiryDate = driver.licenseExpiry ? new Date(driver.licenseExpiry) : null;
        const daysRemaining = expiryDate 
          ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        return {
          ...driver,
          daysRemaining,
          isExpired: daysRemaining !== null && daysRemaining <= 0,
        };
      });
      
      res.json(result);
    } catch (error) {
      console.error('[API] Error fetching expiring licenses:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Trigger license check manually (Operateur/Superadmin)
  app.post("/api/drivers/check-licenses", isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    try {
      await checkExpiringLicenses();
      res.json({ message: "License check completed and notifications sent" });
    } catch (error) {
      console.error('[API] Error running license check:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Vehicle Routes ===
  
  app.get(api.vehicles.list.path, isAuthenticatedJWT, async (req, res) => {
    const vehicles = await storage.getVehicles();
    res.json(vehicles);
  });

  app.get(api.vehicles.get.path, isAuthenticatedJWT, async (req, res) => {
    const vehicle = await storage.getVehicle(Number(req.params.id));
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.post(api.vehicles.create.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.vehicles.create.input.parse(req.body);

      // Check for duplicate license plate
      const [existingVehicle] = await db.select().from(vehicles).where(eq(vehicles.licensePlate, input.licensePlate));
      if (existingVehicle) {
        return res.status(400).json({ message: `La matricule "${input.licensePlate}" existe déjà. Veuillez utiliser une matricule différente.` });
      }

      const vehicle = await storage.createVehicle(input);
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      // Catch DB unique constraint violation as fallback
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        return res.status(400).json({ message: "Cette matricule existe déjà." });
      }
      throw err;
    }
  });

  app.put(api.vehicles.update.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
        const input = api.vehicles.update.input.parse(req.body);
        const vehicleId = Number(req.params.id);

        // Check for duplicate license plate (exclude current vehicle)
        if (input.licensePlate) {
          const [existingVehicle] = await db.select().from(vehicles).where(eq(vehicles.licensePlate, input.licensePlate));
          if (existingVehicle && existingVehicle.id !== vehicleId) {
            return res.status(400).json({ message: `La matricule "${input.licensePlate}" est déjà utilisée par un autre véhicule.` });
          }
        }

        const vehicle = await storage.updateVehicle(vehicleId, input);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        res.json(vehicle);
    } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
          return res.status(400).json({ message: "Cette matricule existe déjà." });
        }
        res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.vehicles.delete.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    await storage.deleteVehicle(Number(req.params.id));
    res.status(204).send();
  });

  // === Tracking Routes ===
  
  app.post(api.vehicles.updateLocation.path, isAuthenticatedJWT, async (req, res) => {
    try {
        const input = api.vehicles.updateLocation.input.parse(req.body);
        const vehicleId = Number(req.params.id);
        
        // Add to history and update current position
        await storage.addLocation({
            vehicleId,
            ...input
        });

        const updatedVehicle = await storage.getVehicle(vehicleId);
        res.json(updatedVehicle);
    } catch (err) {
        res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.vehicles.history.path, isAuthenticatedJWT, async (req, res) => {
    const history = await storage.getLocationHistory(Number(req.params.id));
    res.json(history);
  });

  // === Driver Routes ===
  
  app.get(api.drivers.list.path, isAuthenticatedJWT, async (req: any, res) => {
    const allDrivers = await storage.getDrivers();

    // Enrich drivers with profileImageUrl from users table
    const enrichedDrivers = await Promise.all(
      allDrivers.map(async (driver) => {
        let profileImageUrl: string | null = null;
        if (driver.userId) {
          const [user] = await db.select({ profileImageUrl: users.profileImageUrl })
            .from(users)
            .where(eq(users.id, driver.userId));
          profileImageUrl = user?.profileImageUrl || null;
        }
        return { ...driver, profileImageUrl };
      })
    );

    // If user is a driver, only return their own profile
    if (req.user.role === 'driver') {
      const userEmail = req.user.email;
      const driver = enrichedDrivers.find(d => d.email === userEmail);
      res.json(driver ? [driver] : []);
    } else {
      res.json(enrichedDrivers);
    }
  });

  app.get(api.drivers.get.path, isAuthenticatedJWT, async (req, res) => {
    const driver = await storage.getDriver(Number(req.params.id));
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });

  app.post(api.drivers.create.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.drivers.create.input.parse(req.body);
      
      // Check if matricule already exists in users table
      const existingMatricule = await db.select().from(users).where(eq(users.matricule, input.matricule));
      if (existingMatricule.length > 0) {
        return res.status(400).json({ message: 'Un utilisateur avec ce matricule existe déjà.' });
      }

      // Check if a driver with this license number already exists
      const [existingLicense] = await db.select().from(drivers).where(eq(drivers.licenseNumber, input.licenseNumber));
      if (existingLicense) {
        return res.status(400).json({ message: `Le numéro de permis "${input.licenseNumber}" est déjà utilisé par un autre chauffeur.` });
      }
      
      // Generate random password
      const password = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create auth user for the driver
      const [authUser] = await db.insert(users).values({
        matricule: input.matricule,
        email: input.email || null,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: hashedPassword,
      }).returning();
      
      // Create user role as driver
      await db.insert(userRoles).values({
        userId: authUser.id,
        role: 'driver',
      });
      
      // Create driver record linked to auth user (without matricule which is auth-only)
      const { matricule: _matricule, ...driverInput } = input;
      const driver = await storage.createDriver({
        ...driverInput,
        email: input.email || `${input.matricule}@driver.local`,
        userId: authUser.id,
      });
      
      // If a vehicle is assigned, update the vehicle's currentDriverId
      if (input.assignedVehicleId) {
        await db.update(vehicles)
          .set({ currentDriverId: driver.id })
          .where(eq(vehicles.id, input.assignedVehicleId));
      }
      
      console.log(`[DRIVER] Created driver with matricule ${input.matricule}`);
      
      // Always return temporary password for admin to share manually
      res.status(201).json({
        ...driver,
        temporaryPassword: password,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      // Check for duplicate email or license number (DB constraint)
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        const detail = 'detail' in err ? String(err.detail) : '';
        if (detail.includes('email')) {
          return res.status(400).json({ message: 'Un chauffeur avec cet email existe déjà.' });
        }
        if (detail.includes('license_number')) {
          return res.status(400).json({ message: 'Ce numéro de permis est déjà utilisé.' });
        }
        return res.status(400).json({ message: 'Un enregistrement avec ces données existe déjà.' });
      }
      throw err;
    }
  });

  app.put(api.drivers.update.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.drivers.update.input.parse(req.body);
      const driverId = Number(req.params.id);
      
      // Get current driver to check previous vehicle assignment
      const currentDriver = await storage.getDriver(driverId);
      if (!currentDriver) return res.status(404).json({ message: "Driver not found" });

      // Check for duplicate email (exclude current driver)
      if (input.email) {
        const existingByEmail = await storage.getDriverByEmail(input.email);
        if (existingByEmail && existingByEmail.id !== driverId) {
          return res.status(400).json({ message: `L'email "${input.email}" est déjà utilisé par un autre chauffeur.` });
        }
      }

      // Check for duplicate license number (exclude current driver)
      if (input.licenseNumber) {
        const [existingByLicense] = await db.select().from(drivers).where(eq(drivers.licenseNumber, input.licenseNumber));
        if (existingByLicense && existingByLicense.id !== driverId) {
          return res.status(400).json({ message: `Le numéro de permis "${input.licenseNumber}" est déjà utilisé par un autre chauffeur.` });
        }
      }

      // Update the driver
      const driver = await storage.updateDriver(driverId, input);
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      
      // Handle vehicle assignment changes
      const oldVehicleId = currentDriver.assignedVehicleId;
      const newVehicleId = input.assignedVehicleId;
      
      // If vehicle assignment changed
      if (oldVehicleId !== newVehicleId) {
        // Remove driver from old vehicle
        if (oldVehicleId) {
          await db.update(vehicles)
            .set({ currentDriverId: null })
            .where(eq(vehicles.id, oldVehicleId));
        }
        
        // Assign driver to new vehicle
        if (newVehicleId) {
          await db.update(vehicles)
            .set({ currentDriverId: driverId })
            .where(eq(vehicles.id, newVehicleId));
        }
      }
      
      res.json(driver);
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        const detail = 'detail' in err ? String(err.detail) : '';
        if (detail.includes('email')) {
          return res.status(400).json({ message: 'Cet email est déjà utilisé par un autre chauffeur.' });
        }
        if (detail.includes('license_number')) {
          return res.status(400).json({ message: 'Ce numéro de permis est déjà utilisé.' });
        }
        return res.status(400).json({ message: 'Un enregistrement avec ces données existe déjà.' });
      }
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.delete(api.drivers.delete.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    const driverId = Number(req.params.id);
    
    // Get driver to check vehicle assignment before deletion
    const driver = await storage.getDriver(driverId);
    if (driver?.assignedVehicleId) {
      // Remove driver from assigned vehicle
      await db.update(vehicles)
        .set({ currentDriverId: null })
        .where(eq(vehicles.id, driver.assignedVehicleId));
    }
    
    await storage.deleteDriver(driverId);
    res.status(204).send();
  });

  // === Mission Routes ===
  
  app.get(api.missions.list.path, isAuthenticatedJWT, async (req, res) => {
    const missions = await storage.getMissions();
    res.json(missions);
  });

  app.get(api.missions.get.path, isAuthenticatedJWT, async (req, res) => {
    const mission = await storage.getMission(Number(req.params.id));
    if (!mission) return res.status(404).json({ message: "Mission not found" });
    res.json(mission);
  });

  app.post(api.missions.create.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.missions.create.input.parse(req.body);
      
      // Check if the vehicle is already on an active mission
      const allMissions = await storage.getMissions();
      const vehicleInUse = allMissions.some(
        (m: any) => m.vehicleId === input.vehicleId && (m.status === 'in_progress' || m.status === 'pending')
      );
      if (vehicleInUse) {
        return res.status(400).json({ message: "Ce véhicule est déjà affecté à une mission en cours ou en attente" });
      }

      // Check if the driver already has an active mission
      const driverBusy = allMissions.some(
        (m: any) => m.driverId === input.driverId && m.status === 'in_progress'
      );
      if (driverBusy) {
        return res.status(400).json({ message: "Ce chauffeur a déjà une mission en cours" });
      }

      const mission = await storage.createMission(input);

      // Assign the vehicle to the driver for this mission
      await db.update(vehicles)
        .set({ currentDriverId: input.driverId })
        .where(eq(vehicles.id, input.vehicleId));

      res.status(201).json(mission);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.missions.update.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.missions.update.input.parse(req.body);
      const mission = await storage.updateMission(Number(req.params.id), input);
      if (!mission) return res.status(404).json({ message: "Mission not found" });
      res.json(mission);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.missions.delete.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    await storage.deleteMission(Number(req.params.id));
    res.status(204).send();
  });

  app.patch(api.missions.updateStatus.path, isAuthenticatedJWT, async (req, res) => {
    try {
      const input = api.missions.updateStatus.input.parse(req.body);
      const missionId = Number(req.params.id);

      const mission = await storage.updateMissionStatus(
        missionId,
        input.status,
        input.notes,
        input.completionLat,
        input.completionLng
      );
      if (!mission) return res.status(404).json({ message: "Mission not found" });

      // When the driver starts the mission → mark vehicle as on_mission
      if (input.status === 'in_progress') {
        await db.update(vehicles)
          .set({ status: 'on_mission', currentDriverId: mission.driverId })
          .where(eq(vehicles.id, mission.vehicleId));
      }

      // When the mission ends → release the vehicle back to active
      if (input.status === 'completed' || input.status === 'cancelled') {
        await db.update(vehicles)
          .set({ status: 'active' })
          .where(eq(vehicles.id, mission.vehicleId));
      }

      res.json(mission);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === GPS Tracking Routes ===

  // Get all live GPS positions (operateur + superadmin)
  app.get(api.gpsTracking.list.path, isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    const positions = await storage.getGpsPositions();
    res.json(positions);
  });

  // Get GPS position for a specific vehicle
  app.get(api.gpsTracking.get.path, isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    const pos = await storage.getGpsPosition(Number(req.params.vehicleId));
    if (!pos) return res.status(404).json({ message: "No GPS data for this vehicle" });
    res.json(pos);
  });

  // Update GPS position (can be called by driver device or operateur)
  app.post(api.gpsTracking.update.path, isAuthenticatedJWT, async (req, res) => {
    try {
      const input = api.gpsTracking.update.input.parse(req.body);
      
      // Get current driver for the vehicle
      const vehicle = await storage.getVehicle(input.vehicleId);
      
      const gpsData = await storage.upsertGpsPosition({
        vehicleId: input.vehicleId,
        driverId: vehicle?.currentDriverId ?? null,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
        engineOn: input.engineOn,
      });
      
      // Also add to location history
      await storage.addLocation({
        vehicleId: input.vehicleId,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
      });

      // Broadcast to all connected WebSocket clients (operateur/superadmin)
      broadcastGpsUpdate(gpsData);
      
      res.json(gpsData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid GPS data" });
    }
  });

  // === User Management Routes (Superadmin only) ===

  // List all users
  app.get(api.users.list.path, isAuthenticatedJWT, requireRole("superadmin", "operateur"), async (req, res) => {
    const allUsers = await db.select({
      id: users.id,
      matricule: users.matricule,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      profileImageUrl: users.profileImageUrl,
      createdAt: users.createdAt,
    }).from(users);
    res.json(allUsers);
  });

  // Create a new user (superadmin only — only superadmin or operateur roles allowed)
  app.post(api.users.create.path, isAuthenticatedJWT, requireRole("superadmin"), async (req: any, res: any) => {
    try {
      const input = api.users.create.input.parse(req.body);

      // Only allow creating superadmin or operateur (chauffeurs are created via Chauffeurs page)
      if (input.role === 'chauffeur') {
        return res.status(400).json({ message: "Les chauffeurs doivent être créés depuis la page Chauffeurs" });
      }

      // Check if user with this matricule already exists
      const existing = await db.select().from(users).where(eq(users.matricule, input.matricule));
      if (existing.length > 0) {
        return res.status(400).json({ message: "Un utilisateur avec ce matricule existe déjà" });
      }

      // Generate random password
      const password = generateRandomPassword();
      const passwordHash = await bcrypt.hash(password, 10);

      const [newUser] = await db.insert(users).values({
        matricule: input.matricule,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
      }).returning();

      res.status(201).json({
        id: newUser.id,
        matricule: newUser.matricule,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        createdAt: newUser.createdAt,
        temporaryPassword: password,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Erreur lors de la création de l'utilisateur" });
    }
  });

  // Update user role
  app.patch(api.users.updateRole.path, isAuthenticatedJWT, requireRole("superadmin"), async (req: any, res) => {
    try {
      const { role } = api.users.updateRole.input.parse(req.body);
      const userId = req.params.id;
      
      // Prevent superadmin from demoting themselves
      if (userId === req.user.userId && role !== 'superadmin') {
        return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre rôle" });
      }
      
      const [updated] = await db.update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Delete user (superadmin only)
  app.delete(api.users.delete.path, isAuthenticatedJWT, requireRole("superadmin"), async (req: any, res) => {
    try {
      const userId = req.params.id;

      // Prevent deleting yourself
      if (userId === req.user.userId) {
        return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
      }

      // Delete related records — clear FK references in drivers table first
      await db.update(drivers).set({ userId: null }).where(eq(drivers.userId, userId));
      await db.delete(userRoles).where(eq(userRoles.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      res.status(204).send();
    } catch (err: any) {
      console.error("[DELETE USER] Error:", err?.message || err);
      res.status(500).json({ message: "Erreur lors de la suppression de l'utilisateur" });
    }
  });

  // ── Geocoding proxy (avoids CORS issues from GitHub Pages) ──
  // Uses LocationIQ (Nominatim-compatible API, works from cloud servers)
  const LOCATIONIQ_KEY = process.env.LOCATIONIQ_KEY || "pk.d017b8f15c947d3dc177efd3507600cc";
  const nodeHttps = https;

  function httpsGetJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = nodeHttps.get(url, {
        headers: { "User-Agent": "FleetManager/1.0" },
        timeout: 10000,
      }, (resp: any) => {
        let body = "";
        resp.on("data", (chunk: string) => { body += chunk; });
        resp.on("end", () => {
          try {
            console.log(`[geocode] ${resp.statusCode}: ${url.slice(0, 90)}...`);
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("Invalid JSON from geocoding service"));
          }
        });
      });
      req.on("error", (err: any) => reject(err));
      req.on("timeout", () => { req.destroy(); reject(new Error("Geocoding request timeout")); });
    });
  }

  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) return res.status(400).json({ message: "lat and lon required" });

      const url = `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
      const data = await httpsGetJson(url);
      return res.json(data);
    } catch (err: any) {
      console.error("[geocode/reverse] Error:", err?.message || err);
      if (!res.headersSent) res.status(502).json({ message: "Geocoding failed", error: err?.message });
    }
  });

  app.get("/api/geocode/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ message: "q required" });

      const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(String(q))}&format=json&limit=5`;
      const data = await httpsGetJson(url);
      return res.json(data);
    } catch (err: any) {
      console.error("[geocode/search] Error:", err?.message || err);
      if (!res.headersSent) res.status(502).json({ message: "Geocoding failed", error: err?.message });
    }
  });

  // Seed Data
  try {
    await seedDatabase();
  } catch (err) {
    console.warn("Warning: Database seeding failed. Server will still run, but vehicles may not be available.");
  }

  return httpServer;
}

async function seedDatabase() {
    // Seed users if they don't exist
    try {
        await seedUsers();
    } catch (err) {
        console.warn("Failed to seed users:", err);
    }

    // Seed vehicles
    const existing = await storage.getVehicles();
    if (existing.length === 0) {
        console.log("Seeding vehicles...");
        await storage.createVehicle({
            name: "Truck 01",
            model: "Volvo FH16",
            licensePlate: "AA-123-BB",
            status: "active",
            fuelLevel: 85,
            lat: null,
            lng: null
        });
        await storage.createVehicle({
            name: "Van 04",
            model: "Mercedes Sprinter",
            licensePlate: "CC-789-DD",
            status: "maintenance",
            fuelLevel: 45,
            lat: null,
            lng: null
        });
        await storage.createVehicle({
            name: "Truck 02",
            model: "Renault T",
            licensePlate: "EE-456-FF",
            status: "active",
            fuelLevel: 92,
            lat: null,
            lng: null
        });
    }
}

async function seedUsers() {
    try {
        // Check if superadmin exists by matricule
        const [adminUser] = await db
            .select()
            .from(users)
            .where(eq(users.matricule, "1234567890"));

        if (!adminUser) {
            console.log("Creating superadmin user: matricule 1234567890");
            const ahmedHash = await bcrypt.hash("ahmedznati", 10);
            await db.insert(users).values({
                matricule: "1234567890",
                email: "ahmed@admin.com",
                passwordHash: ahmedHash,
                firstName: "Ahmed",
                lastName: "Admin",
                role: "superadmin",
            });
        }

        // Check if driver exists by matricule
        const [driverUser] = await db
            .select()
            .from(users)
            .where(eq(users.matricule, "0987654321"));

        if (!driverUser) {
            console.log("Creating driver user: matricule 0987654321");
            const ahmedHash = await bcrypt.hash("ahmedznati", 10);
            const [newAhmedUser] = await db.insert(users).values({
                matricule: "0987654321",
                email: "ahmed@driver.com",
                passwordHash: ahmedHash,
                firstName: "Ahmed",
                lastName: "Znati",
            }).returning();
            
            // Create user role
            await db.insert(userRoles).values({
                userId: newAhmedUser.id,
                role: 'driver',
            });
            
            // Create driver record for Ahmed
            const existingDriver = await storage.getDrivers();
            const ahmedDriver = existingDriver.find(d => d.userId === newAhmedUser.id);
            
            if (!ahmedDriver) {
                await storage.createDriver({
                    userId: newAhmedUser.id,
                    firstName: "Ahmed",
                    lastName: "Znati",
                    email: "ahmed@driver.com",
                    phoneNumber: "+216 12 345 678",
                    licenseNumber: "AZ-12345",
                    licenseExpiry: "2027-12-31",
                    status: "active",
                    assignedVehicleId: null,
                });
                console.log("Created driver record for Ahmed");
            }
        } else {
            // If driver user exists, make sure he has a driver record
            const existingDriver = await storage.getDrivers();
            const ahmedDriver = existingDriver.find(d => d.userId === driverUser.id);
            
            if (!ahmedDriver) {
                await storage.createDriver({
                    userId: driverUser.id,
                    firstName: "Ahmed",
                    lastName: "Znati",
                    email: "ahmed@driver.com",
                    phoneNumber: "+216 12 345 678",
                    licenseNumber: "AZ-12345",
                    licenseExpiry: "2027-12-31",
                    status: "active",
                    assignedVehicleId: null,
                });
                console.log("Created missing driver record for Ahmed");
            }
        }
    } catch (err) {
        console.error("Error seeding users:", err);
    }
}


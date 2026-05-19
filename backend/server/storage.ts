import { db } from "./db";
import {
  vehicles,
  locations,
  userRoles,
  drivers,
  missions,
  gpsTracking,
  type InsertVehicle,
  type UpdateVehicleRequest,
  type InsertLocation,
  type InsertUserRole,
  type UserRole,
  type Vehicle,
  type Location,
  type GpsTracking,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Driver types
type Driver = typeof drivers.$inferSelect;
type InsertDriver = typeof drivers.$inferInsert;

// Mission types
type Mission = typeof missions.$inferSelect;
type InsertMission = typeof missions.$inferInsert;

export interface IStorage {
  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, updates: UpdateVehicleRequest): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;
  
  // Locations
  addLocation(location: InsertLocation): Promise<Location>;
  getLocationHistory(vehicleId: number): Promise<Location[]>;

  // User Roles / Profiles
  getUserRole(userId: string): Promise<UserRole | undefined>;
  upsertUserRole(role: InsertUserRole): Promise<UserRole>;

  // Drivers
  getDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  getDriverByEmail(email: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: number, updates: Partial<InsertDriver>): Promise<Driver>;
  deleteDriver(id: number): Promise<void>;

  // Missions
  getMissions(): Promise<Mission[]>;
  getMission(id: number): Promise<Mission | undefined>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: number, updates: Partial<InsertMission>): Promise<Mission>;
  deleteMission(id: number): Promise<void>;
  updateMissionStatus(id: number, status: string, notes?: string, completionLat?: number, completionLng?: number): Promise<Mission>;

  // GPS Tracking
  getGpsPositions(): Promise<GpsTracking[]>;
  getGpsPosition(vehicleId: number): Promise<GpsTracking | undefined>;
  upsertGpsPosition(data: { vehicleId: number; driverId?: number | null; lat: number; lng: number; speed?: number; heading?: number; engineOn?: boolean }): Promise<GpsTracking>;
}

export class DatabaseStorage implements IStorage {
  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: number, updates: UpdateVehicleRequest): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Locations
  async addLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(insertLocation).returning();
    
    // Also update the vehicle's current location
    await db.update(vehicles)
        .set({ 
            lat: insertLocation.lat, 
            lng: insertLocation.lng,
            lastUpdated: new Date()
        })
        .where(eq(vehicles.id, insertLocation.vehicleId));

    return location;
  }

  async getLocationHistory(vehicleId: number): Promise<Location[]> {
    return await db.select()
        .from(locations)
        .where(eq(locations.vehicleId, vehicleId))
        .orderBy(desc(locations.timestamp))
        .limit(100); // Limit to last 100 points for performance
  }

  // User Roles
  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return role;
  }

  async upsertUserRole(roleData: InsertUserRole): Promise<UserRole> {
    const [role] = await db.insert(userRoles)
        .values(roleData)
        .onConflictDoUpdate({
            target: userRoles.userId,
            set: roleData
        })
        .returning();
    return role;
  }

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver;
  }

  async getDriverByEmail(email: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.email, email));
    return driver;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    // Convert string date to Date object if provided
    const driverData = {
      ...insertDriver,
      licenseExpiry: insertDriver.licenseExpiry ? new Date(insertDriver.licenseExpiry) : null,
    };
    const [driver] = await db.insert(drivers).values(driverData).returning();
    return driver;
  }

  async updateDriver(id: number, updates: Partial<InsertDriver>): Promise<Driver> {
    // Convert string date to Date object if provided
    const updateData = {
      ...updates,
      licenseExpiry: updates.licenseExpiry ? new Date(updates.licenseExpiry) : updates.licenseExpiry,
      updatedAt: new Date(),
    };
    const [driver] = await db
      .update(drivers)
      .set(updateData)
      .where(eq(drivers.id, id))
      .returning();
    return driver;
  }

  async deleteDriver(id: number): Promise<void> {
    await db.delete(drivers).where(eq(drivers.id, id));
  }

  // Missions
  async getMissions(): Promise<Mission[]> {
    return await db.select().from(missions).orderBy(desc(missions.createdAt));
  }

  async getMission(id: number): Promise<Mission | undefined> {
    const [mission] = await db.select().from(missions).where(eq(missions.id, id));
    return mission;
  }

  async createMission(insertMission: InsertMission): Promise<Mission> {
    // Convert string dates to Date objects if provided
    const missionData = {
      ...insertMission,
      scheduledStart: insertMission.scheduledStart ? new Date(insertMission.scheduledStart) : null,
      scheduledEnd: insertMission.scheduledEnd ? new Date(insertMission.scheduledEnd) : null,
      actualStart: insertMission.actualStart ? new Date(insertMission.actualStart) : null,
      actualEnd: insertMission.actualEnd ? new Date(insertMission.actualEnd) : null,
    };
    
    const [mission] = await db.insert(missions).values(missionData).returning();
    
    // Update vehicle status to on_mission if mission is in progress
    if (insertMission.status === 'in_progress') {
      await db.update(vehicles)
        .set({ status: 'on_mission' })
        .where(eq(vehicles.id, insertMission.vehicleId));
    }
    
    return mission;
  }

  async updateMission(id: number, updates: Partial<InsertMission>): Promise<Mission> {
    // Convert string dates to Date objects if provided
    const updateData = {
      ...updates,
      scheduledStart: updates.scheduledStart ? new Date(updates.scheduledStart) : updates.scheduledStart,
      scheduledEnd: updates.scheduledEnd ? new Date(updates.scheduledEnd) : updates.scheduledEnd,
      actualStart: updates.actualStart ? new Date(updates.actualStart) : updates.actualStart,
      actualEnd: updates.actualEnd ? new Date(updates.actualEnd) : updates.actualEnd,
      updatedAt: new Date(),
    };
    
    const [mission] = await db
      .update(missions)
      .set(updateData)
      .where(eq(missions.id, id))
      .returning();
    return mission;
  }

  async deleteMission(id: number): Promise<void> {
    await db.delete(missions).where(eq(missions.id, id));
  }

  async updateMissionStatus(id: number, status: string, notes?: string, completionLat?: number, completionLng?: number): Promise<Mission> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    // Set timestamps based on status
    if (status === 'in_progress' && !notes) {
      updateData.actualStart = new Date();
    } else if (status === 'completed' || status === 'cancelled') {
      updateData.actualEnd = new Date();
    }

    if (notes) {
      updateData.notes = notes;
    }

    // Check if driver GPS matches endpoint for confirmed completion
    if (status === 'completed' && completionLat !== undefined && completionLng !== undefined) {
      // Fetch the mission to get the end coordinates
      const [currentMission] = await db.select().from(missions).where(eq(missions.id, id));
      if (currentMission?.endLat && currentMission?.endLng) {
        const R = 6371;
        const dLat = ((currentMission.endLat - completionLat) * Math.PI) / 180;
        const dLon = ((currentMission.endLng - completionLng) * Math.PI) / 180;
        const lat1 = (completionLat * Math.PI) / 180;
        const lat2 = (currentMission.endLat * Math.PI) / 180;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        const distKm = 2 * R * Math.asin(Math.sqrt(h));
        // Confirmed if within 1km of the endpoint
        updateData.confirmedCompletion = distKm <= 1;
      } else {
        updateData.confirmedCompletion = false;
      }
    } else if (status === 'completed') {
      updateData.confirmedCompletion = false;
    }

    const [mission] = await db
      .update(missions)
      .set(updateData)
      .where(eq(missions.id, id))
      .returning();

    // Update vehicle status
    if (status === 'completed' || status === 'cancelled') {
      await db.update(vehicles)
        .set({ status: 'active' })
        .where(eq(vehicles.id, mission.vehicleId));
    } else if (status === 'in_progress') {
      await db.update(vehicles)
        .set({ status: 'on_mission' })
        .where(eq(vehicles.id, mission.vehicleId));
    }

    return mission;
  }
  
  // GPS Tracking
  async getGpsPositions(): Promise<GpsTracking[]> {
    return await db.select().from(gpsTracking);
  }

  async getGpsPosition(vehicleId: number): Promise<GpsTracking | undefined> {
    const [pos] = await db.select().from(gpsTracking).where(eq(gpsTracking.vehicleId, vehicleId));
    return pos;
  }

  async upsertGpsPosition(data: { vehicleId: number; driverId?: number | null; lat: number; lng: number; speed?: number; heading?: number; engineOn?: boolean }): Promise<GpsTracking> {
    const [result] = await db.insert(gpsTracking)
      .values({
        vehicleId: data.vehicleId,
        driverId: data.driverId ?? null,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed ?? 0,
        heading: data.heading ?? 0,
        engineOn: data.engineOn ?? false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: gpsTracking.vehicleId,
        set: {
          driverId: data.driverId ?? null,
          lat: data.lat,
          lng: data.lng,
          speed: data.speed ?? 0,
          heading: data.heading ?? 0,
          engineOn: data.engineOn ?? false,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Also update the vehicle's current lat/lng
    await db.update(vehicles)
      .set({ lat: data.lat, lng: data.lng, lastUpdated: new Date() })
      .where(eq(vehicles.id, data.vehicleId));
    
    return result;
  }
}

export const storage = new DatabaseStorage();

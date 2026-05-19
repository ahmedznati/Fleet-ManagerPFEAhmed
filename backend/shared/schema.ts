import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import * as auth from "./models/auth";

export * from "./models/auth";

// === TABLE DEFINITIONS ===

// Drivers table - separate from auth users for better data management
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => auth.users.id), // Optional link to auth user
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  licenseExpiry: timestamp("license_expiry"),
  status: text("status").notNull().default("active"), // active, inactive, on_leave
  assignedVehicleId: integer("assigned_vehicle_id"), // Current assigned vehicle
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => auth.users.id),
  role: text("role").notNull().default("chauffeur"), // superadmin, operateur, chauffeur
  phoneNumber: text("phone_number"),
  driverId: integer("driver_id").references(() => drivers.id), // Link to driver profile
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  model: text("model").notNull(),
  licensePlate: text("license_plate").notNull().unique(),
  status: text("status").notNull().default("active"), // active, maintenance, inactive, on_mission
  fuelLevel: integer("fuel_level").default(100),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  currentDriverId: integer("current_driver_id").references(() => drivers.id), // Current driver
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  driverId: integer("driver_id").notNull().references(() => drivers.id),
  title: text("title").notNull(),
  description: text("description"),
  endLocation: text("end_location").notNull(),
  startLat: doublePrecision("start_lat"),
  startLng: doublePrecision("start_lng"),
  endLat: doublePrecision("end_lat"),
  endLng: doublePrecision("end_lng"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").default("normal"), // low, normal, high, urgent
  coPilot: text("co_pilot"), // Name of the co-pilot (passenger sitting with the driver)
  passengersCount: integer("passengers_count").default(1), // Number of people in the fleet
  scheduledStart: timestamp("scheduled_start"),
  actualStart: timestamp("actual_start"),
  scheduledEnd: timestamp("scheduled_end"),
  actualEnd: timestamp("actual_end"),
  distance: doublePrecision("distance"), // in km
  confirmedCompletion: boolean("confirmed_completion").default(false), // true if driver GPS matched endpoint
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  speed: doublePrecision("speed"),
  heading: doublePrecision("heading"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// GPS tracking table — stores the latest known position per vehicle for real-time dashboard
export const gpsTracking = pgTable("gps_tracking", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id).unique(),
  driverId: integer("driver_id").references(() => drivers.id),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  speed: doublePrecision("speed").default(0),
  heading: doublePrecision("heading").default(0),
  engineOn: boolean("engine_on").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===
export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(auth.users, {
    fields: [drivers.userId],
    references: [auth.users.id],
  }),
  assignedVehicle: one(vehicles, {
    fields: [drivers.assignedVehicleId],
    references: [vehicles.id],
  }),
  missions: many(missions),
  currentVehicle: one(vehicles, {
    fields: [drivers.id],
    references: [vehicles.currentDriverId],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(auth.users, {
    fields: [userRoles.userId],
    references: [auth.users.id],
  }),
  driver: one(drivers, {
    fields: [userRoles.driverId],
    references: [drivers.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  currentDriver: one(drivers, {
    fields: [vehicles.currentDriverId],
    references: [drivers.id],
  }),
  locationHistory: many(locations),
  missions: many(missions),
}));

export const missionsRelations = relations(missions, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [missions.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [missions.driverId],
    references: [drivers.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [locations.vehicleId],
    references: [vehicles.id],
  }),
}));

export const gpsTrackingRelations = relations(gpsTracking, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [gpsTracking.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [gpsTracking.driverId],
    references: [drivers.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, lastUpdated: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, timestamp: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true });
export const insertGpsTrackingSchema = createInsertSchema(gpsTracking).omit({ id: true, updatedAt: true });
export const insertDriverSchema = createInsertSchema(drivers, {
  licenseExpiry: z.string().optional().nullable(),
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    matricule: z.string().length(10).regex(/^\d{10}$/, "Le matricule doit contenir exactement 10 chiffres"),
    firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name too long"),
    lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name too long"),
    email: z.string().email("Invalid email address").optional().default(""),
    phoneNumber: z.string().min(8, "Phone number must be at least 8 characters").max(20, "Phone number too long"),
    licenseNumber: z.string().min(5, "License number must be at least 5 characters").max(30, "License number too long"),
    status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  });
export const insertMissionSchema = createInsertSchema(missions, {
  scheduledStart: z.string().optional().nullable(),
  scheduledEnd: z.string().optional().nullable(),
  actualStart: z.string().optional().nullable(),
  actualEnd: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  startLat: z.number().optional().nullable(),
  startLng: z.number().optional().nullable(),
  endLat: z.number().optional().nullable(),
  endLng: z.number().optional().nullable(),
  distance: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  coPilot: z.string().optional().nullable(),
  passengersCount: z.number().int().min(1).optional().nullable(),
}).omit({ id: true, createdAt: true, updatedAt: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type GpsTracking = typeof gpsTracking.$inferSelect;
export type InsertGpsTracking = z.infer<typeof insertGpsTrackingSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

// Request types
export type CreateVehicleRequest = InsertVehicle;
export type UpdateVehicleRequest = Partial<InsertVehicle>;
export type UpdateLocationRequest = { lat: number; lng: number; speed?: number; heading?: number };

// Response types
export type VehicleResponse = Vehicle & { assignedDriver?: UserRole };
export type VehicleListResponse = VehicleResponse[];

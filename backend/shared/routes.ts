import { z } from 'zod';
import { 
  insertVehicleSchema, 
  vehicles, 
  insertLocationSchema, 
  locations, 
  userRoles, 
  insertUserRoleSchema,
  drivers,
  insertDriverSchema,
  missions,
  insertMissionSchema,
  gpsTracking,
  insertGpsTrackingSchema,
} from './schema';
import * as auth from './models/auth';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  badRequest: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  vehicles: {
    list: {
      method: 'GET' as const,
      path: '/api/vehicles',
      responses: {
        200: z.array(z.custom<typeof vehicles.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicles/:id',
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vehicles',
      input: insertVehicleSchema,
      responses: {
        201: z.custom<typeof vehicles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/vehicles/:id',
      input: insertVehicleSchema.partial(),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/vehicles/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    updateLocation: {
      method: 'POST' as const,
      path: '/api/vehicles/:id/location',
      input: z.object({
        lat: z.number(),
        lng: z.number(),
        speed: z.number().optional(),
        heading: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/vehicles/:id/history',
      responses: {
        200: z.array(z.custom<typeof locations.$inferSelect>()),
      },
    }
  },
  drivers: {
    list: {
      method: 'GET' as const,
      path: '/api/drivers',
      responses: {
        200: z.array(z.custom<typeof drivers.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/drivers/:id',
      responses: {
        200: z.custom<typeof drivers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/drivers',
      input: insertDriverSchema,
      responses: {
        201: z.custom<typeof drivers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/drivers/:id',
      input: insertDriverSchema.partial(),
      responses: {
        200: z.custom<typeof drivers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/drivers/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  missions: {
    list: {
      method: 'GET' as const,
      path: '/api/missions',
      responses: {
        200: z.array(z.custom<typeof missions.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/missions/:id',
      responses: {
        200: z.custom<typeof missions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/missions',
      input: insertMissionSchema,
      responses: {
        201: z.custom<typeof missions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/missions/:id',
      input: insertMissionSchema.partial(),
      responses: {
        200: z.custom<typeof missions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/missions/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/missions/:id/status',
      input: z.object({
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
        notes: z.string().optional(),
        completionLat: z.number().optional(),
        completionLng: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof missions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  users: {
    me: {
        method: 'GET' as const,
        path: '/api/user/me',
        responses: {
            200: z.custom<typeof userRoles.$inferSelect>().nullable(),
        }
    },
    updateProfile: {
        method: 'POST' as const,
        path: '/api/user/profile',
        input: insertUserRoleSchema.omit({ userId: true }),
        responses: {
            200: z.custom<typeof userRoles.$inferSelect>(),
        }
    },
    // Superadmin: list all users
    list: {
        method: 'GET' as const,
        path: '/api/users',
        responses: {
            200: z.array(z.custom<typeof auth.users.$inferSelect>()),
        }
    },
    // Superadmin: update user role
    updateRole: {
        method: 'PATCH' as const,
        path: '/api/users/:id/role',
        input: z.object({
            role: z.enum(['superadmin', 'operateur']),
        }),
        responses: {
            200: z.custom<typeof auth.users.$inferSelect>(),
            404: errorSchemas.notFound,
        }
    },
    // Superadmin: create a new user (password is auto-generated)
    create: {
        method: 'POST' as const,
        path: '/api/users',
        input: z.object({
            matricule: z.string().length(10).regex(/^\d{10}$/),
            email: z.string().email().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            role: z.enum(['superadmin', 'operateur']),
        }),
        responses: {
            201: z.custom<typeof auth.users.$inferSelect>(),
            400: errorSchemas.badRequest,
        }
    },
    // Superadmin: delete user
    delete: {
        method: 'DELETE' as const,
        path: '/api/users/:id',
        responses: {
            204: z.void(),
            404: errorSchemas.notFound,
        }
    },
  },
  gpsTracking: {
    // Get all live GPS positions
    list: {
      method: 'GET' as const,
      path: '/api/gps/live',
      responses: {
        200: z.array(z.custom<typeof gpsTracking.$inferSelect>()),
      },
    },
    // Get GPS position for a specific vehicle
    get: {
      method: 'GET' as const,
      path: '/api/gps/live/:vehicleId',
      responses: {
        200: z.custom<typeof gpsTracking.$inferSelect>().nullable(),
        404: errorSchemas.notFound,
      },
    },
    // Update GPS position (sent by driver's device / simulator)
    update: {
      method: 'POST' as const,
      path: '/api/gps/update',
      input: z.object({
        vehicleId: z.number(),
        lat: z.number(),
        lng: z.number(),
        speed: z.number().optional(),
        heading: z.number().optional(),
        engineOn: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof gpsTracking.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type InsertGpsTracking = z.infer<typeof insertGpsTrackingSchema>;

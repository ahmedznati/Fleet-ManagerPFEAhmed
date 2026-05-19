import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production";
const JWT_EXPIRY = "7d";

export type AppRole = "superadmin" | "operateur" | "chauffeur";

export interface JWTPayload {
  userId: string;
  matricule: string;
  email?: string;
  role: AppRole;
  firstName?: string;
  lastName?: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function isAuthenticatedJWT(
  req: any,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: no token" });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }

  req.user = payload;
  next();
}

/**
 * Map legacy role names to the new 3-role system so that
 * JWTs issued before the rename still work.
 */
function normalizeRole(role?: string): string {
  if (!role) return "chauffeur";
  if (role === "admin") return "superadmin";
  if (role === "user" || role === "driver") return "chauffeur";
  return role;
}

export function requireRole(...allowedRoles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const role = normalizeRole(req.user?.role);
    if (!req.user || !allowedRoles.includes(role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

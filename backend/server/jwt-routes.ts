import type { Express } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateToken } from "./jwt-auth";
import type { AppRole } from "./jwt-auth";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { sendPasswordResetCodeEmail, generateResetCode } from "./email-service";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production";

const SignupSchema = z.object({
  matricule: z.string().length(10, "Le matricule doit contenir 10 chiffres").regex(/^\d{10}$/, "Le matricule doit contenir uniquement des chiffres"),
  password: z.string().min(6),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const LoginSchema = z.object({
  matricule: z.string().length(10, "Le matricule doit contenir 10 chiffres").regex(/^\d{10}$/, "Le matricule doit contenir uniquement des chiffres"),
  password: z.string(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

const VerifyResetCodeSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  code: z.string().length(5, "Le code doit contenir 5 chiffres"),
});

const ResetPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  code: z.string().length(5, "Le code doit contenir 5 chiffres"),
  newPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

// In-memory store for reset codes: email -> { code, expiresAt, attempts }
const resetCodes = new Map<string, { code: string; expiresAt: Date; attempts: number }>();

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [email, data] of resetCodes.entries()) {
    if (data.expiresAt < now) {
      resetCodes.delete(email);
    }
  }
}, 5 * 60 * 1000);

export function registerJWTAuthRoutes(app: Express) {
  app.post("/api/signup", async (req, res) => {
    try {
      const input = SignupSchema.parse(req.body);

      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.matricule, input.matricule));

      if (existing.length > 0) {
        return res.status(400).json({ message: "Un utilisateur avec ce matricule existe déjà" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          matricule: input.matricule,
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: "chauffeur",
        })
        .returning();

      // Generate JWT
      const token = generateToken({
        userId: newUser.id,
        matricule: newUser.matricule,
        email: newUser.email || undefined,
        role: (newUser.role || "chauffeur") as AppRole,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
      });

      res.status(201).json({
        message: "User created",
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const input = LoginSchema.parse(req.body);

      // Find user by matricule
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.matricule, input.matricule));

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT
      const token = generateToken({
        userId: user.id,
        matricule: user.matricule,
        email: user.email || undefined,
        role: (user.role || "chauffeur") as AppRole,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      });

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          matricule: user.matricule,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change Password endpoint
  app.post("/api/change-password", async (req, res) => {
    try {
      // Get user from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        matricule: string;
      };

      const input = ChangePasswordSchema.parse(req.body);

      // Find user by ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId));

      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return res.status(400).json({ message: "Mot de passe actuel incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, decoded.userId));

      res.json({ message: "Mot de passe modifié avec succès" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forgot Password — sends a 5-digit reset code via email
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const input = ForgotPasswordSchema.parse(req.body);

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      // Always return success to avoid email enumeration
      if (!user) {
        return res.json({ message: "Si un compte existe avec cet email, un code de réinitialisation a été envoyé." });
      }

      // Generate a 5-digit code that expires in 15 minutes
      const code = generateResetCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store the code
      resetCodes.set(input.email.toLowerCase(), { code, expiresAt, attempts: 0 });

      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Utilisateur";

      let emailSent = false;
      try {
        await sendPasswordResetCodeEmail(user.email!, userName, code);
        console.log(`[FORGOT PASSWORD] Reset code sent to ${user.email}`);
        emailSent = true;
      } catch (emailErr: any) {
        console.error("[FORGOT PASSWORD] Email send failed:", emailErr?.message || emailErr);
      }

      if (emailSent) {
        res.json({
          message: "Si un compte existe avec cet email, un code de réinitialisation a été envoyé.",
          emailSent: true
        });
      } else {
        // Email failed — return the code directly so the user can still reset (dev/fallback)
        res.json({
          message: "L'envoi d'email a échoué. Voici votre code de réinitialisation.",
          emailSent: false,
          code
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify Reset Code — checks if the code is valid before allowing password change
  app.post("/api/verify-reset-code", async (req, res) => {
    try {
      const input = VerifyResetCodeSchema.parse(req.body);
      const emailKey = input.email.toLowerCase();
      const stored = resetCodes.get(emailKey);

      if (!stored) {
        return res.status(400).json({ message: "Aucun code de réinitialisation trouvé. Veuillez en demander un nouveau." });
      }

      if (stored.expiresAt < new Date()) {
        resetCodes.delete(emailKey);
        return res.status(400).json({ message: "Le code a expiré. Veuillez en demander un nouveau." });
      }

      if (stored.attempts >= 5) {
        resetCodes.delete(emailKey);
        return res.status(400).json({ message: "Trop de tentatives. Veuillez demander un nouveau code." });
      }

      if (stored.code !== input.code) {
        stored.attempts++;
        return res.status(400).json({ message: "Code incorrect.", attemptsLeft: 5 - stored.attempts });
      }

      res.json({ message: "Code vérifié avec succès.", valid: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset Password — verifies code and sets new password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const input = ResetPasswordSchema.parse(req.body);
      const emailKey = input.email.toLowerCase();
      const stored = resetCodes.get(emailKey);

      if (!stored) {
        return res.status(400).json({ message: "Aucun code de réinitialisation trouvé. Veuillez en demander un nouveau." });
      }

      if (stored.expiresAt < new Date()) {
        resetCodes.delete(emailKey);
        return res.status(400).json({ message: "Le code a expiré. Veuillez en demander un nouveau." });
      }

      if (stored.code !== input.code) {
        stored.attempts++;
        if (stored.attempts >= 5) {
          resetCodes.delete(emailKey);
          return res.status(400).json({ message: "Trop de tentatives. Veuillez demander un nouveau code." });
        }
        return res.status(400).json({ message: "Code incorrect." });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }

      // Hash new password and update
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // Remove the used code
      resetCodes.delete(emailKey);

      res.json({ message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

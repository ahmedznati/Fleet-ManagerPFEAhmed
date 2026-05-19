import { useEffect, useState } from "react";

export type AppRole = "superadmin" | "operateur" | "chauffeur" | "admin" | "user" | "driver";

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: AppRole;
}

/**
 * Normalize legacy role names to the new 3-role system.
 * "admin" → "superadmin", "user"/"driver" → "chauffeur"
 */
function normalizeRole(role?: string): AppRole {
  if (!role) return "chauffeur";
  if (role === "admin") return "superadmin";
  if (role === "user" || role === "driver") return "chauffeur";
  return role as AppRole;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        parsed.role = normalizeRole(parsed.role);
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);

  const isSuperAdmin = user?.role === "superadmin";
  const isOperateur = user?.role === "operateur";
  const isChauffeur = user?.role === "chauffeur";
  // For backward compat: "admin" means superadmin or operateur (any management role)
  const isAdmin = isSuperAdmin || isOperateur;
  const isDriver = isChauffeur;

  return {
    user,
    isSuperAdmin,
    isOperateur,
    isChauffeur,
    isAdmin,
    isDriver,
  };
}

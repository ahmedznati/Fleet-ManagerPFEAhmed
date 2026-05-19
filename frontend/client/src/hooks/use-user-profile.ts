import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertUserRole } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:8000/api");
  // Remove /api from the path if it exists since baseUrl already includes it
  const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
  return `${baseUrl}${cleanPath}`;
}

// Extended profile type that includes user data
export interface UserProfile {
  id: number | null;
  userId: string;
  role: string;
  phoneNumber: string | null;
  driverId: number | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export function useUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: [api.users.me.path],
    queryFn: async () => {
      const res = await fetch(getApiUrl(api.users.me.path), { 
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return await res.json();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertUserRole, "userId">) => {
      const res = await fetch(getApiUrl(api.users.updateProfile.path), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return api.users.updateProfile.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.me.path] });
      toast({
        title: "Profile Updated",
        description: "Your user role and settings have been saved",
      });
    },
  });
}

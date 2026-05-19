import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMission } from "@shared/routes";
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
  const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
  return `${baseUrl}${cleanPath}`;
}

export function useMissions() {
  return useQuery({
    queryKey: [api.missions.list.path],
    queryFn: async () => {
      const res = await fetch(getApiUrl(api.missions.list.path), { 
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch missions");
      return api.missions.list.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Refresh every 30s for realtime updates
  });
}

export function useMission(id: number) {
  return useQuery({
    queryKey: [api.missions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.missions.get.path, { id });
      const res = await fetch(getApiUrl(url), { 
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch mission");
      return api.missions.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMission) => {
      const validated = api.missions.create.input.parse(data);
      const res = await fetch(getApiUrl(api.missions.create.path), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create mission");
      }
      return api.missions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.missions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      toast({
        title: "Success",
        description: "Mission created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertMission>) => {
      const url = buildUrl(api.missions.update.path, { id });
      const res = await fetch(getApiUrl(url), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update mission");
      return api.missions.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.missions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.missions.get.path, variables.id] });
      toast({
        title: "Updated",
        description: "Mission updated",
      });
    },
  });
}

export function useUpdateMissionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, notes, completionLat, completionLng }: { id: number; status: string; notes?: string; completionLat?: number; completionLng?: number }) => {
      const url = buildUrl(api.missions.updateStatus.path, { id });
      const res = await fetch(getApiUrl(url), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, notes, completionLat, completionLng }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update mission status");
      return api.missions.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.missions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      toast({
        title: "Status Updated",
        description: "Mission status changed",
      });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.missions.delete.path, { id });
      const res = await fetch(getApiUrl(url), { 
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete mission");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.missions.list.path] });
      toast({
        title: "Deleted",
        description: "Mission cancelled",
      });
    },
  });
}

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
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

/** Build the WebSocket URL from the API base URL */
function getWsUrl(): string {
  const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:8000/api");
  // Strip the /api suffix to get the server origin
  const origin = apiBase.replace(/\/api\/?$/, "");
  // Switch protocol to ws(s)
  const wsOrigin = origin.replace(/^http/, "ws");
  const token = localStorage.getItem("token");
  return `${wsOrigin}/ws?token=${encodeURIComponent(token || "")}`;
}

// ─── WebSocket connection (singleton) ────────────────────────────

type GpsData = {
  id?: number;
  vehicleId: number;
  driverId?: number | null;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  engineOn?: boolean | null;
  updatedAt?: string;
};

type WsStatus = "connecting" | "connected" | "disconnected";

/**
 * Hook that maintains a single WebSocket connection to `/ws`.
 * When a `gps:update` message arrives it patches the TanStack Query cache
 * so every component using `useGpsPositions()` re-renders instantly.
 */
export function useGpsWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<WsStatus>("disconnected");

  const connect = useCallback(() => {
    // Don't open a new socket if one is already alive
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const token = localStorage.getItem("token");
    if (!token) return; // not logged in

    setStatus("connecting");
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "gps:update") {
          const update: GpsData = msg.data;

          // Patch the cached list of GPS positions in place
          queryClient.setQueryData<GpsData[]>(["gps-positions"], (old) => {
            if (!old) return [update];
            const idx = old.findIndex((g) => g.vehicleId === update.vehicleId);
            if (idx >= 0) {
              const copy = [...old];
              copy[idx] = update;
              return copy;
            }
            return [...old, update];
          });

          // Also update the per-vehicle cache if it exists
          queryClient.setQueryData<GpsData>(
            ["gps-position", update.vehicleId],
            update,
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      // Auto-reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3_000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [queryClient]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { status };
}

// ─── REST hooks (initial load + fallback) ────────────────────────

/**
 * Initial fetch of all GPS positions via REST.
 * Polling is now OFF by default — live updates come through the WebSocket.
 * Pass `pollFallback=true` to re-enable 10s polling (e.g. if WS is down).
 */
export function useGpsPositions(pollFallback = false) {
  return useQuery({
    queryKey: ["gps-positions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl(api.gpsTracking.list.path), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch GPS positions");
      return res.json();
    },
    // Poll every 5s as fallback when WS is down; real updates come via WS
    refetchInterval: pollFallback ? 5_000 : false,
  });
}

/** Fetch GPS position for a single vehicle (initial load) */
export function useGpsPosition(vehicleId: number) {
  return useQuery({
    queryKey: ["gps-position", vehicleId],
    queryFn: async () => {
      const url = buildUrl(api.gpsTracking.get.path, { vehicleId });
      const res = await fetch(getApiUrl(url), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch GPS position");
      return res.json();
    },
    refetchInterval: pollFallback ? 10_000 : false,
    enabled: !!vehicleId,
  });
}

// keep a module-level flag so the single-vehicle hook compiles
const pollFallback = false;

/** Mutation to update a vehicle's GPS position (used by drivers / simulators) */
export function useUpdateGpsPosition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      vehicleId: number;
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
      engineOn?: boolean;
    }) => {
      const res = await fetch(getApiUrl(api.gpsTracking.update.path), {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update GPS position");
      return res.json();
    },
    onSuccess: () => {
      // The WS broadcast will update the cache on other clients;
      // invalidate locally so the sender also sees the change immediately.
      queryClient.invalidateQueries({ queryKey: ["gps-positions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur GPS",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

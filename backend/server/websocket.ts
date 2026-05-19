import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production";

interface AuthenticatedSocket extends WebSocket {
  userId?: number;
  userRole?: string;
  isAlive: boolean;
}

interface GpsUpdateMessage {
  type: "gps:update";
  data: {
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
}

type OutboundMessage = GpsUpdateMessage;

let wss: WebSocketServer | null = null;
const clients = new Set<AuthenticatedSocket>();

/**
 * Initialise the WebSocket server on an existing HTTP server.
 * Clients connect to `ws(s)://host/ws?token=<JWT>`.
 */
export function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Heartbeat: detect dead connections every 30s
  const heartbeat = setInterval(() => {
    clients.forEach((ws) => {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", (ws: AuthenticatedSocket, req: IncomingMessage) => {
    // --- Authenticate via query-string token ---
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: number;
        role: string;
      };
      ws.userId = payload.userId;
      ws.userRole = payload.role;
    } catch {
      ws.close(4003, "Invalid token");
      return;
    }

    ws.isAlive = true;
    clients.add(ws);
    console.log(`[websocket] WS client connected  userId=${ws.userId} role=${ws.userRole}  (total ${clients.size})`);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[websocket] WS client disconnected  userId=${ws.userId}  (total ${clients.size})`);
    });

    ws.on("error", () => {
      clients.delete(ws);
    });

    // We don't expect inbound messages from the browser,
    // but handle them gracefully.
    ws.on("message", () => {
      /* no-op */
    });
  });

  console.log("[websocket] WebSocket server ready on /ws");
}

/**
 * Broadcast a GPS position update to every connected operateur / superadmin.
 * Called from the HTTP POST /api/gps/update handler.
 */
export function broadcastGpsUpdate(gpsData: GpsUpdateMessage["data"]) {
  if (!wss) return;

  const message: OutboundMessage = { type: "gps:update", data: gpsData };
  const payload = JSON.stringify(message);

  clients.forEach((ws) => {
    // Only send to operateurs and superadmins (the roles that view the map)
    if (
      ws.readyState === WebSocket.OPEN &&
      (ws.userRole === "operateur" || ws.userRole === "superadmin" || ws.userRole === "admin")
    ) {
      ws.send(payload);
    }
  });
}

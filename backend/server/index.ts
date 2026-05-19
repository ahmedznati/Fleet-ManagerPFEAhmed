import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import cors from "cors";
import { setupWebSocket } from "./websocket";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Enable CORS for frontend - allow local dev and the origin derived from FRONTEND_URL
const allowedOrigins: string[] = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

if (process.env.FRONTEND_URL) {
  try {
    // If FRONTEND_URL includes a path (e.g. GitHub Pages repo), extract its origin for CORS
    const parsed = new URL(process.env.FRONTEND_URL);
    allowedOrigins.push(parsed.origin);
  } catch {
    // Fallback: push the raw value (useful if someone provides just the origin)
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In production, also allow any subdomain of render.com or vercel.app or github.io
    if (process.env.NODE_ENV === 'production') {
      if (origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app') || origin.endsWith('.github.io')) {
        return callback(null, true);
      }
    }
    return callback(null, false);
  },
  credentials: true,
}));

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '5mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Ensure missing tables are created at startup (runtime migration)
async function ensureSchema() {
  const { pool } = await import("./db");
  const client = await pool.connect();
  try {
    // Create gps_tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS gps_tracking (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL UNIQUE REFERENCES vehicles(id),
        driver_id INTEGER REFERENCES drivers(id),
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        speed DOUBLE PRECISION DEFAULT 0,
        heading DOUBLE PRECISION DEFAULT 0,
        engine_on BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add co_pilot and passengers_count columns to missions if they don't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='missions' AND column_name='co_pilot') THEN
          ALTER TABLE missions ADD COLUMN co_pilot TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='missions' AND column_name='passengers_count') THEN
          ALTER TABLE missions ADD COLUMN passengers_count INTEGER DEFAULT 1;
        END IF;
      END $$;
    `);

    console.log("[schema] ensureSchema completed — gps_tracking + mission columns ready");
  } catch (err) {
    console.warn("[schema] ensureSchema warning (non-fatal):", err);
  } finally {
    client.release();
  }
}

// Prevent the entire process from crashing on unhandled errors
process.on("unhandledRejection", (err) => {
  console.error("[fatal] Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("[fatal] Uncaught exception:", err);
});

(async () => {
  try {
    // Run runtime migration before anything else
    await ensureSchema();
  } catch (err) {
    console.warn("[startup] Schema migration failed (non-fatal):", err);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Log the error instead of throwing (throw would crash the process)
    console.error(`[error] ${status} — ${message}`, err.stack || err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Attach WebSocket server before listening
  setupWebSocket(httpServer);

  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0";
  httpServer.listen(
    {
      port,
      host,
      reusePort: false,
    },
    () => {
      log(`serving on http://${host}:${port}`);
    },
  );
})();

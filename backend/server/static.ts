import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  
  // In production API-only mode (Render), skip static file serving
  if (!fs.existsSync(distPath)) {
    console.log("No public directory found - running in API-only mode");
    
    // Return a simple message for root path
    app.get("/", (_req, res) => {
      res.json({ 
        status: "ok", 
        message: "Fleet Manager API is running",
        docs: "/api"
      });
    });
    
    // Health check endpoint
    app.get("/health", (_req, res) => {
      res.json({ status: "healthy" });
    });
    
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

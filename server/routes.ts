import { registerSimpleRoutes } from "./simple-routes";
import type { Express } from "express";
import { createServer, type Server } from "http";

export function registerRoutes(app: Express): Server {
  return registerSimpleRoutes(app);
}
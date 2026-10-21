import { Router } from "express";
import { destinationRoutes } from "./destination.routes.js";

export const apiRouter = Router();

apiRouter.use("/destinations", destinationRoutes);

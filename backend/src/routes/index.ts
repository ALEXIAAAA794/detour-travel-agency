import { Router } from "express";
import { destinationRoutes } from "./destination.routes.js";
import { travelRequestRoutes } from "./travelRequest.routes.js";

export const apiRouter = Router();

apiRouter.use("/destinations", destinationRoutes);
apiRouter.use("/travel-requests", travelRequestRoutes);

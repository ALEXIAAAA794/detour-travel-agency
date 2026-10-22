import { Router } from "express";
import { destinationRoutes } from "./destination.routes.js";
import { reservationRoutes } from "./reservation.routes.js";

export const apiRouter = Router();

apiRouter.use("/destinations", destinationRoutes);
apiRouter.use("/reservations", reservationRoutes);

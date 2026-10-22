import { Router } from "express";
import { destinationRoutes } from "./destination.routes.js";
import { reservationRoutes } from "./reservation.routes.js";
import { requestRoutes } from "./request.routes.js";
export const apiRouter = Router();
apiRouter.use("/destinations", destinationRoutes);
apiRouter.use("/reservations", reservationRoutes);
apiRouter.use("/requests", requestRoutes);

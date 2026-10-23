import { Router } from "express";
import { destinationRoutes } from "./destination.routes.js";
import { travelRequestRoutes } from "./travelRequest.routes.js";
import { reservationRoutes } from "./reservation.routes.js";
import { requestRoutes } from "./request.routes.js";
import { clientRoutes } from "./client.routes.js";
import { appointmentRoutes } from "./appointment.routes.js";
import { reviewRoutes } from "./review.routes.js";

export const apiRouter = Router();

apiRouter.use("/destinations", destinationRoutes);
apiRouter.use("/travel-requests", travelRequestRoutes);
apiRouter.use("/appointments", appointmentRoutes);
apiRouter.use("/reviews", reviewRoutes);
apiRouter.use("/reservations", reservationRoutes);
apiRouter.use("/requests", requestRoutes);
apiRouter.use("/clients", clientRoutes);

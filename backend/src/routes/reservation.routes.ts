import { Router } from "express";
import { reservationController } from "../controllers/reservation.controller.js";

export const reservationRoutes = Router();

reservationRoutes.get("/", reservationController.list);
reservationRoutes.patch("/:id/status", reservationController.updateStatus);

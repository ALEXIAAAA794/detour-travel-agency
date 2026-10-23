import { Router } from "express";
import { clientController } from "../controllers/client.controller.js";
import { requireManager } from "../middlewares/managerAuth.js";

export const clientRoutes = Router();

clientRoutes.use((req, _res, next) => {
  try {
    requireManager(req);
    next();
  } catch (error) {
    next(error);
  }
});

clientRoutes.get("/", clientController.list);

import { Router } from "express";
import { clientController } from "../controllers/client.controller.js";

export const clientRoutes = Router();

clientRoutes.get("/", clientController.list);

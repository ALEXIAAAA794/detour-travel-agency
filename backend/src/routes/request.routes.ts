import { Router } from "express";
import { requestController } from "../controllers/request.controller.js";


export const requestRoutes = Router();
requestRoutes.post("/:id/notes", requestController.addNote);

requestRoutes.get("/", requestController.list);
requestRoutes.get("/:id", requestController.getById);
requestRoutes.patch("/:id/status", requestController.updateStatus);

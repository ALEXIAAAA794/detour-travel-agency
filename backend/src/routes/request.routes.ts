import { Router } from "express";
import { requestController } from "../controllers/request.controller.js";
import { requireManager } from "../middlewares/managerAuth.js";


export const requestRoutes = Router();
requestRoutes.use((req, _res, next) => {
  try {
    requireManager(req);
    next();
  } catch (error) {
    next(error);
  }
});
requestRoutes.post("/:id/notes", requestController.addNote);

requestRoutes.get("/", requestController.list);
requestRoutes.get("/:id", requestController.getById);
requestRoutes.patch("/:id/status", requestController.updateStatus);

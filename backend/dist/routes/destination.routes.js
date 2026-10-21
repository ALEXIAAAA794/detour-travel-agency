import { Router } from "express";
import { destinationController as c } from "../controllers/destination.controller.js";
export const destinationRoutes = Router();
destinationRoutes.get("/", c.list);
destinationRoutes.get("/:id", c.get);
destinationRoutes.post("/", c.create);
destinationRoutes.patch("/:id", c.update);
destinationRoutes.delete("/:id", c.remove);

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { reservationService } from "../services/reservation.service.js";

type Handler = (req: Request, res: Response) => Promise<unknown>;

const wrap = (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const idSchema = z.object({ id: z.string().uuid() });
const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

export const reservationController = {
  list: wrap(async (_req, res) => {
    res.json(await reservationService.list());
  }),

  updateStatus: wrap(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    const { status } = statusSchema.parse(req.body);
    res.json(await reservationService.updateStatus(id, status));
  }),
};

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { requestService } from "../services/request.service.js";

type Handler = (req: Request, res: Response) => Promise<unknown>;

const wrap = (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const idSchema = z.object({ id: z.string().uuid() });

const statusSchema = z.object({
  status: z.enum([
    "PENDING", "NEEDS_INFO", "IN_REVIEW", "PROPOSAL_SENT",
    "ACCEPTED", "PAYMENT_PENDING", "PAID", "CONFIRMED",
    "REJECTED", "CANCELLED",
    "PENDING_REVIEW", "PREPARATION_AVAILABLE", "PREPARATION_IN_PROGRESS",
    "SUBMITTED", "FEASIBILITY_REVIEW", "CHANGES_REQUESTED",
    "CONFIRMED_AWAITING_PAYMENT", "REFUSED", "EXPIRED",
  ]),
  paymentUrl: z.string().url().max(2000)
    .refine((value) => value.toLowerCase().startsWith("https://"))
    .optional(),
});

const noteSchema = z.object({
  note: z.string().trim().min(1, "La note ne peut pas être vide").max(5000),
});

export const requestController = {
  list: wrap(async (_req, res) => {
    res.json(await requestService.list());
  }),

  getById: wrap(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await requestService.getById(id));
  }),

  updateStatus: wrap(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    const { status, paymentUrl } = statusSchema.parse(req.body);
    res.json(await requestService.updateStatus(id, status, paymentUrl));
  }),

  addNote: wrap(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    const { note } = noteSchema.parse(req.body);
    res.status(201).json(await requestService.addNote(id, note));
  }),
};

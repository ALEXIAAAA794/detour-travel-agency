import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireClient, requireManager } from "../middlewares/managerAuth.js";

export const reviewRoutes = Router();

const createSchema = z.object({
  destination: z.string().trim().max(160).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(20).max(2000),
});
const statusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});
const idSchema = z.string().uuid();
const wrap = (fn: (req: any, res: any) => Promise<void>) =>
  (req: any, res: any, next: any) => fn(req, res).catch(next);

reviewRoutes.get("/", wrap(async (_req, res) => {
  const reviews = await prisma.travelReview.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      clientName: true,
      destination: true,
      rating: true,
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ reviews });
}));

reviewRoutes.post("/", wrap(async (req, res) => {
  const client = await requireClient(req);
  const data = createSchema.parse(req.body);
  const review = await prisma.travelReview.create({
    data: {
      clientName: client.name,
      clientEmail: client.email,
      destination: data.destination || null,
      rating: data.rating,
      content: data.content,
      status: "PENDING",
    },
    select: {
      id: true,
      destination: true,
      rating: true,
      content: true,
      status: true,
      createdAt: true,
    },
  });
  res.status(201).json({ review });
}));

reviewRoutes.get("/manager", wrap(async (req, res) => {
  requireManager(req);
  const reviews = await prisma.travelReview.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ reviews });
}));

reviewRoutes.patch("/:id/status", wrap(async (req, res) => {
  requireManager(req);
  const id = idSchema.parse(req.params.id);
  const { status } = statusSchema.parse(req.body);
  const existing = await prisma.travelReview.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Avis introuvable" });
    return;
  }
  const review = await prisma.travelReview.update({
    where: { id },
    data: { status },
  });
  res.json({ review });
}));

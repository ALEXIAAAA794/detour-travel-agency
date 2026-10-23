import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireClient, requireManager } from "../middlewares/managerAuth.js";
import { sendAppointmentConfirmationEmail } from "../services/appointmentEmail.service.js";

export const appointmentRoutes = Router();

const createSchema = z.object({
  phone: z.string().trim().max(40).optional().transform((value) => value || null),
  preferredDate: z.string().date(),
  preferredTime: z.string().trim().min(1).max(40),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().max(2000).optional().transform((value) => value || null),
});
const idSchema = z.string().uuid();
const statusSchema = z.object({
  status: z.enum(["PENDING", "CONTACTED", "SCHEDULED", "CANCELLED"]),
});
const wrap = (fn: (req: any, res: any) => Promise<void>) =>
  (req: any, res: any, next: any) => fn(req, res).catch(next);

appointmentRoutes.post("/", wrap(async (req, res) => {
  const client = await requireClient(req);
  const data = createSchema.parse(req.body);
  const appointment = await prisma.appointmentRequest.create({
    data: {
      ...data,
      preferredDate: new Date(`${data.preferredDate}T00:00:00.000Z`),
      clientAccountId: client.id,
      clientName: client.name,
      clientEmail: client.email,
    },
  });
  res.status(201).json({ appointment });
}));

appointmentRoutes.get("/mine", wrap(async (req, res) => {
  const client = await requireClient(req);
  const appointments = await prisma.appointmentRequest.findMany({
    where: {
      OR: [
        { clientAccountId: client.id },
        { clientAccountId: null, clientEmail: client.email },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ appointments });
}));

appointmentRoutes.get("/manager", wrap(async (req, res) => {
  requireManager(req);
  const appointments = await prisma.appointmentRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ appointments });
}));

appointmentRoutes.patch("/:id/status", wrap(async (req, res) => {
  requireManager(req);
  const id = idSchema.parse(req.params.id);
  const { status } = statusSchema.parse(req.body);
  const existing = await prisma.appointmentRequest.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Demande de rendez-vous introuvable");
  const appointment = await prisma.appointmentRequest.update({
    where: { id },
    data: { status },
  });
  if (status !== "SCHEDULED" || existing.status === "SCHEDULED") {
    res.json({ appointment });
    return;
  }

  try {
    const email = await sendAppointmentConfirmationEmail(appointment);
    res.json({
      appointment,
      appointmentEmailSent: email.sent,
      ...(!email.sent ? { appointmentEmailNotice: email.notice } : {}),
    });
  } catch (error) {
    console.error(
      `Rendez-vous ${id} confirmé, mais la journalisation de l’email a échoué :`,
      error instanceof Error ? error.message : error
    );
    res.json({
      appointment,
      appointmentEmailSent: false,
      appointmentEmailNotice: "Le rendez-vous est confirmé, mais l’email de confirmation n’a pas pu être journalisé.",
    });
  }
}));

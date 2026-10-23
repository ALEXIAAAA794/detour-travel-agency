import { createHash } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { Request } from "express";
import type { TravelRequest } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireClient, requireManager } from "../middlewares/managerAuth.js";
import { sendRequestEmail } from "../services/requestEmail.service.js";
import { requestService } from "../services/request.service.js";

export const travelRequestRoutes = Router();
const createSchema = z.object({
  destination: z.string().trim().min(2).max(160),
  departure: z.string().date().optional().or(z.literal("")),
  returnDate: z.string().date().optional().or(z.literal("")),
  datePreference: z.string().trim().max(120).optional(),
  travelers: z.coerce.number().int().min(1).max(30),
  budget: z.string().max(80).optional(),
  travelType: z.string().max(80).optional(),
  preferences: z.string().max(4000).optional(),
});
const idSchema = z.string().uuid();
const itinerarySchema = z.object({
  itinerary: z.object({
    summary: z.string().max(2000).default(""),
    steps: z.array(z.object({ day: z.string().max(100), place: z.string().max(160), activities: z.string().max(500) })).max(30),
    duration: z.string().max(100).default(""),
    estimatedBudget: z.string().max(100).default(""),
    preferences: z.string().max(2000).default(""),
  }),
});
const managerUpdateSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "PREPARATION_AVAILABLE", "PREPARATION_IN_PROGRESS", "SUBMITTED", "FEASIBILITY_REVIEW", "CHANGES_REQUESTED", "CONFIRMED_AWAITING_PAYMENT", "PAID", "REFUSED", "EXPIRED"]),
  paymentUrl: z.string().url().max(2000).refine((value) => value.toLowerCase().startsWith("https://")).optional(),
});

function clientRequest(request: TravelRequest) {
  const {
    accessToken: _accessToken,
    preparationTokenHash: _preparationTokenHash,
    preparationTokenExpiresAt: _preparationTokenExpiresAt,
    preparationTokenRevokedAt: _preparationTokenRevokedAt,
    clientAccountId: _clientAccountId,
    budget,
    budgetText,
    clientName,
    clientEmail,
    startDate,
    endDate,
    ...details
  } = request;

  return {
    ...details,
    name: clientName,
    email: clientEmail,
    departure: startDate,
    returnDate: endDate,
    budget: budgetText ?? budget?.toString() ?? null,
  };
}

async function ownedRequest(id: string, req: Request) {
  const token = req.header("x-preparation-token");
  if (token) {
    if (!/^[a-f0-9]{64}$/i.test(token)) throw new HttpError(401, "Lien de préparation invalide");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const request = await prisma.travelRequest.findFirst({
      where: {
        id,
        preparationTokenHash: tokenHash,
        preparationTokenExpiresAt: { gt: new Date() },
        preparationTokenRevokedAt: null,
      },
    });
    if (!request) throw new HttpError(410, "Ce lien de préparation a expiré ou a été révoqué");
    return request;
  }

  const client = await requireClient(req);
  const request = await prisma.travelRequest.findFirst({
    where: { id, clientAccountId: client.id },
  });
  if (!request) throw new HttpError(404, "Demande introuvable");
  return request;
}
const wrap = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any, next: any) => fn(req, res).catch(next);

travelRequestRoutes.get("/manager", wrap(async (req, res) => {
  requireManager(req);
  const requests = await prisma.travelRequest.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ requests: requests.map(clientRequest) });
}));

travelRequestRoutes.get("/mine", wrap(async (req, res) => {
  const client = await requireClient(req);
  const requests = await prisma.travelRequest.findMany({
    where: { clientAccountId: client.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ requests: requests.map(clientRequest) });
}));

travelRequestRoutes.post("/", wrap(async (req, res) => {
  const client = await requireClient(req);
  const data = createSchema.parse(req.body);
  if (data.departure && data.returnDate && data.returnDate < data.departure) throw new HttpError(400, "La date de retour doit suivre le départ");
  const created = await prisma.travelRequest.create({ data: {
    clientAccountId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    destination: data.destination,
    startDate: data.departure ? new Date(`${data.departure}T00:00:00.000Z`) : null,
    endDate: data.returnDate ? new Date(`${data.returnDate}T00:00:00.000Z`) : null,
    datePreference: data.datePreference || null,
    travelers: data.travelers,
    budgetText: data.budget || null,
    travelType: data.travelType,
    preferences: data.preferences,
    status: "PENDING_REVIEW",
  } });
  const email = await sendRequestEmail({
    requestId: created.id,
    recipient: client.email,
    subject: "Votre demande de pré-réservation a bien été reçue",
    template: "prebooking_received",
    text: `Bonjour ${client.name},\n\nNous avons bien reçu votre demande de pré-réservation pour ${data.destination}. Notre équipe va l’étudier et vous recontactera sous 24 heures pour poursuivre la préparation de votre voyage.\n\nCet email confirme uniquement la réception de votre demande et non la disponibilité du voyage.\n\nRéférence : ${created.id.slice(0, 8).toUpperCase()}\n\nL’équipe DÉTOUR Voyages`,
  }).catch((error: unknown) => {
    console.error(
      `Demande ${created.id} enregistrée, mais journalisation de l’email impossible :`,
      error instanceof Error ? error.message : error
    );
    return { sent: false as const, notice: "Demande enregistrée, mais l’email de confirmation n’a pas pu être envoyé." };
  });
  res.status(201).json({
    request: clientRequest(created),
    emailSent: email.sent,
    ...(!email.sent ? { emailNotice: email.notice } : {}),
  });
}));

travelRequestRoutes.get("/:id", wrap(async (req, res) => {
  const request = await ownedRequest(idSchema.parse(req.params.id), req);
  res.json(clientRequest(request));
}));

travelRequestRoutes.patch("/:id/preparation", wrap(async (req, res) => {
  const current = await ownedRequest(idSchema.parse(req.params.id), req);
  if (!["PREPARATION_AVAILABLE", "PREPARATION_IN_PROGRESS", "CHANGES_REQUESTED"].includes(current.status)) throw new HttpError(409, "La préparation n'est pas disponible");
  const { itinerary } = itinerarySchema.parse(req.body);
  const updated = await prisma.travelRequest.update({ where: { id: current.id }, data: { itinerary, status: "PREPARATION_IN_PROGRESS" } });
  res.json(clientRequest(updated));
}));

travelRequestRoutes.post("/:id/submit", wrap(async (req, res) => {
  const current = await ownedRequest(idSchema.parse(req.params.id), req);
  if (!current.itinerary) throw new HttpError(409, "Enregistrez une proposition avant de la transmettre");
  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.travelRequest.update({
      where: { id: current.id },
      data: {
        status: "SUBMITTED",
        ...(current.preparationTokenHash
          ? { preparationTokenRevokedAt: new Date() }
          : {}),
      },
    });
    await tx.requestHistory.create({
      data: {
        requestId: current.id,
        actor: "client",
        action: "ITINERARY_SUBMITTED",
      },
    });
    return request;
  });
  res.json(clientRequest(updated));
}));

travelRequestRoutes.patch("/:id/status", wrap(async (req, res) => {
  requireManager(req);
  const { status, paymentUrl } = managerUpdateSchema.parse(req.body);
  if (paymentUrl && status !== "CONFIRMED_AWAITING_PAYMENT") throw new HttpError(400, "Le lien de paiement est réservé à un voyage confirmé");
  res.json(await requestService.updateStatus(idSchema.parse(req.params.id), status, paymentUrl));
}));

import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";

export const travelRequestRoutes = Router();
const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  destination: z.string().trim().min(2).max(160),
  departure: z.string().date().optional().or(z.literal("")),
  returnDate: z.string().date().optional().or(z.literal("")),
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
  paymentUrl: z.string().url().max(2000).optional(),
});

function requireToken(req: Parameters<Parameters<typeof travelRequestRoutes.get>[1]>[0]) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) throw new HttpError(401, "Lien d'accès invalide");
  return token;
}
async function ownedRequest(id: string, token: string) {
  const request = await prisma.travelRequest.findFirst({ where: { id, accessToken: token } });
  if (!request) throw new HttpError(404, "Demande introuvable");
  return request;
}
const wrap = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any, next: any) => fn(req, res).catch(next);

function isManager(req: Parameters<Parameters<typeof travelRequestRoutes.get>[1]>[0]) {
  if (!env.MANAGER_API_KEY) throw new HttpError(503, "La gestion conseiller n'est pas configurée");
  const provided = req.header("x-manager-key") || "";
  const expected = env.MANAGER_API_KEY;
  const suppliedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    throw new HttpError(401, "Accès conseiller refusé");
  }
}

async function sendConfirmationEmail(request: { email: string; name: string; destination: string; id: string }) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [request.email],
      subject: "Votre demande de pré-réservation a bien été reçue",
      text: `Bonjour ${request.name},\n\nNous avons bien reçu votre demande de pré-réservation pour ${request.destination}. Notre équipe va l'étudier et reviendra vers vous. Cette confirmation ne constitue pas une réservation définitive.\n\nRéférence : ${request.id.slice(0, 8).toUpperCase()}\n\nL'équipe DÉTOUR Voyages`,
    }),
  });
  return response.ok;
}

travelRequestRoutes.get("/manager", wrap(async (req, res) => {
  isManager(req);
  const requests = await prisma.travelRequest.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ requests: requests.map(({ accessToken: _accessToken, ...request }) => request) });
}));

travelRequestRoutes.post("/", wrap(async (req, res) => {
  const data = createSchema.parse(req.body);
  if (data.departure && data.returnDate && data.returnDate < data.departure) throw new HttpError(400, "La date de retour doit suivre le départ");
  const accessToken = randomBytes(32).toString("hex");
  const created = await prisma.travelRequest.create({ data: {
    ...data,
    departure: data.departure ? new Date(`${data.departure}T00:00:00.000Z`) : null,
    returnDate: data.returnDate ? new Date(`${data.returnDate}T00:00:00.000Z`) : null,
    accessToken,
  } });
  // The token is returned once so the client can resume this request. Never expose it in listings.
  let emailSent = false;
  try {
    emailSent = await sendConfirmationEmail(created);
  } catch (error) {
    console.error("Échec de l'envoi de l'email de confirmation :", error);
  }
  res.status(201).json({
    request: { ...created, accessToken: undefined },
    accessToken,
    emailSent,
    ...(!emailSent ? { emailNotice: "Email non envoyé : configurez RESEND_API_KEY et EMAIL_FROM." } : {}),
  });
}));

travelRequestRoutes.get("/:id", wrap(async (req, res) => {
  const request = await ownedRequest(idSchema.parse(req.params.id), requireToken(req));
  res.json({ ...request, accessToken: undefined });
}));

travelRequestRoutes.patch("/:id/preparation", wrap(async (req, res) => {
  const current = await ownedRequest(idSchema.parse(req.params.id), requireToken(req));
  if (!["PREPARATION_AVAILABLE", "PREPARATION_IN_PROGRESS", "CHANGES_REQUESTED"].includes(current.status)) throw new HttpError(409, "La préparation n'est pas disponible");
  const { itinerary } = itinerarySchema.parse(req.body);
  const updated = await prisma.travelRequest.update({ where: { id: current.id }, data: { itinerary, status: "PREPARATION_IN_PROGRESS" } });
  res.json({ ...updated, accessToken: undefined });
}));

travelRequestRoutes.post("/:id/submit", wrap(async (req, res) => {
  const current = await ownedRequest(idSchema.parse(req.params.id), requireToken(req));
  if (!current.itinerary) throw new HttpError(409, "Enregistrez une proposition avant de la transmettre");
  const updated = await prisma.travelRequest.update({ where: { id: current.id }, data: { status: "SUBMITTED" } });
  res.json({ ...updated, accessToken: undefined });
}));

travelRequestRoutes.patch("/:id/status", wrap(async (req, res) => {
  isManager(req);
  const { status, paymentUrl } = managerUpdateSchema.parse(req.body);
  if (paymentUrl && status !== "CONFIRMED_AWAITING_PAYMENT") throw new HttpError(400, "Le lien de paiement est réservé à un voyage confirmé");
  const request = await prisma.travelRequest.update({ where: { id: idSchema.parse(req.params.id) }, data: { status, ...(paymentUrl ? { paymentUrl } : {}) } });
  res.json({ ...request, accessToken: undefined });
}));

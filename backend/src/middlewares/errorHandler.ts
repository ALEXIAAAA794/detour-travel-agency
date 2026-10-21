import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Route introuvable" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Données invalides", details: err.flatten().fieldErrors });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return res.status(404).json({ error: "Ressource introuvable" });
    if (err.code === "P2002") return res.status(409).json({ error: "Valeur déjà utilisée" });
  }
  console.error(err);
  res.status(500).json({ error: "Erreur interne du serveur" });
}

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Route introuvable" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Donnees invalides",
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (typeof err === "object" && err !== null && "statusCode" in err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return res.status(404).json({ error: "Destination introuvable" });
    }
  }

  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;

    if (code === "23505") {
      return res.status(409).json({ error: "Valeur deja utilisee" });
    }
    if (code === "23503") {
      return res.status(409).json({
        error: "Ressource liee a d'autres donnees",
      });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Erreur interne du serveur" });
}

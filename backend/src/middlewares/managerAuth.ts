import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env.js";
import { HttpError } from "./errorHandler.js";

export function requireManager(req: Request) {
  if (!env.MANAGER_API_KEY) {
    throw new HttpError(503, "La gestion conseiller n'est pas configurée");
  }
  const supplied = Buffer.from(req.header("x-manager-key") || "");
  const expected = Buffer.from(env.MANAGER_API_KEY);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new HttpError(401, "Accès conseiller refusé");
  }
}

export async function requireClient(req: Request) {
  const token = req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Connectez-vous pour envoyer cette demande");

  let response: Response;
  try {
    response = await fetch(env.CLIENT_AUTH_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new HttpError(503, "Le service de comptes clients est indisponible");
  }
  if (response.status === 401) throw new HttpError(401, "Votre session client a expiré");
  if (!response.ok) throw new HttpError(503, "Impossible de vérifier votre compte client");

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("user" in data) ||
    typeof data.user !== "object" ||
    data.user === null ||
    !("id" in data.user) ||
    typeof data.user.id !== "string" ||
    !("email" in data.user) ||
    typeof data.user.email !== "string" ||
    !("name" in data.user) ||
    typeof data.user.name !== "string"
  ) {
    throw new HttpError(503, "Réponse de compte client invalide");
  }
  return { id: data.user.id, email: data.user.email, name: data.user.name };
}

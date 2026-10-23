import { createHash, randomBytes } from "node:crypto";
import type { TravelRequestStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { sendRequestEmail } from "./requestEmail.service.js";

const managerClientAppUrl = env.CLIENT_APP_URL;
const revokedStatuses: TravelRequestStatus[] = [
  "SUBMITTED",
  "PROPOSAL_SENT",
  "ACCEPTED",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "FEASIBILITY_REVIEW",
  "CONFIRMED_AWAITING_PAYMENT",
  "PAID",
  "REFUSED",
  "EXPIRED",
  "REJECTED",
  "CANCELLED",
];
const confirmationStatuses: TravelRequestStatus[] = [
  "CONFIRMED_AWAITING_PAYMENT",
  "CONFIRMED",
];

function withoutSecrets<T extends {
  accessToken: string | null;
  preparationTokenHash: string | null;
  preparationTokenExpiresAt: Date | null;
  preparationTokenRevokedAt: Date | null;
  clientAccountId: string | null;
}>(request: T) {
  const {
    accessToken: _accessToken,
    preparationTokenHash: _preparationTokenHash,
    preparationTokenExpiresAt: _preparationTokenExpiresAt,
    preparationTokenRevokedAt: _preparationTokenRevokedAt,
    clientAccountId: _clientAccountId,
    ...safeRequest
  } = request;
  return safeRequest;
}

export const requestService = {
  async list() {
    const requests = await prisma.travelRequest.findMany({
      include: {
        proposal: true,
        emails: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return requests.map(withoutSecrets);
  },

  async getById(id: string) {
    const request = await prisma.travelRequest.findUnique({
      where: { id },
      include: {
        proposal: true,
        emails: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!request) throw new HttpError(404, "Demande introuvable");
    return withoutSecrets(request);
  },

  async updateStatus(
    id: string,
    status: TravelRequestStatus,
    paymentUrl?: string,
  ) {
    const preparationEnabled = ["PREPARATION_AVAILABLE", "CHANGES_REQUESTED"].includes(status);
    const preparationToken = preparationEnabled
      ? randomBytes(32).toString("hex")
      : null;
    const preparationTokenHash = preparationToken
      ? createHash("sha256").update(preparationToken).digest("hex")
      : undefined;
    const preparationTokenExpiresAt = preparationToken
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : undefined;

    const { request: updated, previousStatus } = await prisma.$transaction(async (tx) => {
      const existing = await tx.travelRequest.findUnique({ where: { id } });
      if (!existing) throw new HttpError(404, "Demande introuvable");

      const request = await tx.travelRequest.update({
        where: { id },
        data: {
          status,
          ...(paymentUrl !== undefined ? { paymentUrl } : {}),
          ...(status === "CONFIRMED_AWAITING_PAYMENT"
            ? { paymentStatus: "PENDING" }
            : status === "PAID"
              ? { paymentStatus: "PAID" }
              : {}),
          ...(preparationTokenHash
            ? {
                preparationTokenHash,
                preparationTokenExpiresAt,
                preparationTokenRevokedAt: null,
              }
            : revokedStatuses.includes(status) && existing.preparationTokenHash
              ? { preparationTokenRevokedAt: new Date() }
              : {}),
        },
      });

      await tx.requestHistory.create({
        data: {
          requestId: id,
          actor: "gestionnaire",
          action: "STATUS_UPDATED",
          details: { previousStatus: existing.status, status },
        },
      });

      return { request, previousStatus: existing.status };
    });

    const safeRequest = withoutSecrets(updated);
    const confirmationEmailNeeded =
      confirmationStatuses.includes(status) && !confirmationStatuses.includes(previousStatus);
    if (!preparationToken && !confirmationEmailNeeded) return safeRequest;

    let preparationEmail:
      | { sent: true; notice?: never }
      | { sent: false; notice: string }
      | undefined;
    if (preparationToken) {
      const preparationUrl = new URL("/espace", managerClientAppUrl);
      preparationUrl.searchParams.set("requestId", id);
      preparationUrl.hash = new URLSearchParams({
        "preparation-token": preparationToken,
      }).toString();

      preparationEmail = await sendRequestEmail({
        requestId: id,
        recipient: updated.clientEmail,
        subject: "Votre préparation de voyage est disponible",
        template: "preparation_available",
        text: `Bonjour ${updated.clientName},\n\nNotre équipe a étudié votre demande. Vous pouvez maintenant préparer votre projet de voyage à l’aide de ce lien sécurisé, valable 7 jours :\n${preparationUrl.toString()}\n\nCe lien est personnel, révocable et associé uniquement à votre demande. Votre proposition sera vérifiée par un conseiller avant toute confirmation ou réservation.\n\nL’équipe DÉTOUR Voyages`,
      }).catch((error: unknown) => {
        console.error(
          `Statut de la demande ${id} mis à jour, mais journalisation de l’email impossible :`,
          error instanceof Error ? error.message : error
        );
        return { sent: false as const, notice: "Le statut est mis à jour, mais l’email de préparation n’a pas pu être envoyé." };
      });
    }

    let confirmationEmail:
      | { sent: true; notice?: never }
      | { sent: false; notice: string }
      | undefined;
    if (confirmationEmailNeeded) {
      confirmationEmail = await sendRequestEmail({
        requestId: id,
        recipient: updated.clientEmail,
        subject: status === "CONFIRMED_AWAITING_PAYMENT"
          ? "Votre voyage est confirmé, paiement en attente"
          : "Votre voyage avec DÉTOUR est confirmé",
        template: "travel_confirmed",
        text: `Bonjour ${updated.clientName},\n\nVotre projet de voyage a été confirmé par notre équipe.${updated.paymentUrl ? `\n\nVous pouvez procéder au paiement via ce lien sécurisé :\n${updated.paymentUrl}` : ""}\n\nNotre équipe reste à votre disposition pour toute question.\n\nL’équipe DÉTOUR Voyages`,
      }).catch((error: unknown) => {
        console.error(
          `Demande ${id} confirmée, mais la journalisation de l’email a échoué :`,
          error instanceof Error ? error.message : error
        );
        return { sent: false as const, notice: "Le statut est mis à jour, mais l’email de confirmation n’a pas pu être envoyé." };
      });
    }
    return {
      ...safeRequest,
      ...(preparationEmail ? {
        preparationEmailSent: preparationEmail.sent,
        ...(!preparationEmail.sent ? { preparationEmailNotice: preparationEmail.notice } : {}),
      } : {}),
      ...(confirmationEmail ? {
        confirmationEmailSent: confirmationEmail.sent,
        ...(!confirmationEmail.sent ? { confirmationEmailNotice: confirmationEmail.notice } : {}),
      } : {}),
    };
  },

  async addNote(id: string, note: string) {
    const content = note.trim();
    if (!content) throw new HttpError(400, "La note ne peut pas être vide");

    return prisma.$transaction(async (tx) => {
      const existing = await tx.travelRequest.findUnique({ where: { id } });
      if (!existing) throw new HttpError(404, "Demande introuvable");

      const updated = await tx.travelRequest.update({
        where: { id },
        data: {
          internalNotes: existing.internalNotes
            ? `${content}\n${existing.internalNotes}`
            : content,
        },
      });

      await tx.requestHistory.create({
        data: {
          requestId: id,
          actor: "gestionnaire",
          action: "NOTE_ADDED",
          details: { note: content },
        },
      });

      return withoutSecrets(updated);
    });
  },
};

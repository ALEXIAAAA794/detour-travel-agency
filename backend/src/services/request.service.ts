import { prisma } from "../config/prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";

export const requestService = {
  async list() {
    return prisma.travelRequest.findMany({
      include: {
        proposal: true,
        emails: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
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
    return request;
  },

  async updateStatus(
    id: string,
    status:
      | "PENDING"
      | "NEEDS_INFO"
      | "IN_REVIEW"
      | "PROPOSAL_SENT"
      | "ACCEPTED"
      | "PAYMENT_PENDING"
      | "PAID"
      | "CONFIRMED"
      | "REJECTED"
      | "CANCELLED"
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.travelRequest.findUnique({ where: { id } });
      if (!existing) throw new HttpError(404, "Demande introuvable");

      const updated = await tx.travelRequest.update({
        where: { id },
        data: { status },
      });

      await tx.requestHistory.create({
        data: {
          requestId: id,
          actor: "gestionnaire",
          action: "STATUS_UPDATED",
          details: { previousStatus: existing.status, status },
        },
      });

      return updated;
    });
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

      return updated;
    });
  },
};

import { prisma } from "../config/prisma.js";

export type DestinationInput = { name: string; country: string; description?: string | null };

export const destinationService = {
  list: () => prisma.destination.findMany({ orderBy: { name: "asc" } }),
  get: (id: string) => prisma.destination.findUniqueOrThrow({ where: { id } }),
  create: (data: DestinationInput) => prisma.destination.create({ data }),
  update: (id: string, data: Partial<DestinationInput>) =>
    prisma.destination.update({ where: { id }, data }),
  remove: (id: string) => prisma.destination.delete({ where: { id } }),
};

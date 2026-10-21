import { prisma } from "../config/prisma.js";
export const destinationService = {
    list: () => prisma.destination.findMany({ orderBy: { name: "asc" } }),
    get: (id) => prisma.destination.findUniqueOrThrow({ where: { id } }),
    create: (data) => prisma.destination.create({ data }),
    update: (id, data) => prisma.destination.update({ where: { id }, data }),
    remove: (id) => prisma.destination.delete({ where: { id } }),
};

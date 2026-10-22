import { prisma } from "../config/prisma.js";

export const reservationService = {
  async list() {
    return prisma.booking.findMany({
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        trip: {
          include: {
            destination: {
              select: {
                name: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateStatus(id: string, status: "PENDING" | "CONFIRMED" | "CANCELLED") {
    return prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        trip: {
          include: { destination: true },
        },
      },
    });
  },
};

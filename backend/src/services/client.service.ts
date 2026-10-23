import { prisma } from "../config/prisma.js";

export const clientService = {
  async list() {
    const [clients, requests] = await Promise.all([
      prisma.client.findMany({
        include: {
          bookings: {
            include: {
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
          },
        },
        orderBy: [
          { lastName: "asc" },
          { firstName: "asc" },
        ],
      }),
      prisma.travelRequest.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const clientsByEmail = new Map<string, {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      createdAt: Date;
      bookings: typeof clients[number]["bookings"];
      requests: typeof requests;
      source: "client" | "request";
    }>();

    for (const client of clients) {
      clientsByEmail.set(client.email.trim().toLowerCase(), {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        createdAt: client.createdAt,
        bookings: client.bookings,
        requests: [],
        source: "client",
      });
    }

    for (const request of requests) {
      const email = request.clientEmail.trim().toLowerCase();
      if (!email) continue;

      const existing = clientsByEmail.get(email);

      if (existing) {
        existing.requests.push(request);
        if (!existing.phone && request.clientPhone) {
          existing.phone = request.clientPhone;
        }
      } else {
        clientsByEmail.set(email, {
          id: `request-${request.id}`,
          firstName: request.clientName,
          lastName: "",
          email: request.clientEmail,
          phone: request.clientPhone,
          createdAt: request.createdAt,
          bookings: [],
          requests: [request],
          source: "request",
        });
      }
    }

    return Array.from(clientsByEmail.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  },
};

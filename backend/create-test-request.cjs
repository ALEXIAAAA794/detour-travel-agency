const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const request = await prisma.travelRequest.create({
    data: {
      clientName: "Camille Bernard",
      clientEmail: "camille.bernard@example.com",
      clientPhone: "0612345678",
      destination: "Kyoto, Japon",
      startDate: new Date("2026-11-12"),
      endDate: new Date("2026-11-22"),
      travelers: 2,
      budget: 3200,
      preferences: "Culture, gastronomie, quartiers calmes",
      status: "PENDING",
      paymentStatus: "NOT_REQUIRED",
    },
  });

  console.log("Demande créée :", request.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

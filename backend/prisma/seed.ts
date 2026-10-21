import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const destinations = [
    { name: "Lisbonne", country: "Portugal", description: "Ville blanche sur le Tage." },
    { name: "Kyoto", country: "Japon", description: "Temples, jardins et traditions." },
    { name: "Marrakech", country: "Maroc", description: "Médina, souks et riads." },
  ];

  for (const d of destinations) {
    await prisma.destination.upsert({
      where: { name_country: { name: d.name, country: d.country } },
      update: {},
      create: d,
    });
  }

  const lisbon = await prisma.destination.findFirstOrThrow({ where: { name: "Lisbonne" } });
  if ((await prisma.trip.count()) === 0) {
    await prisma.trip.create({
      data: {
        title: "Week-end à Lisbonne",
        price: "420.00",
        startDate: new Date("2026-12-04T08:00:00Z"),
        endDate: new Date("2026-12-07T20:00:00Z"),
        capacity: 20,
        destinationId: lisbon.id,
      },
    });
  }
  console.log("Seed terminé");
}

main().finally(() => prisma.$disconnect());

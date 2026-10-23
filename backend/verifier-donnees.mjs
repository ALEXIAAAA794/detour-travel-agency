import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  console.log("CLIENTS :", await prisma.client.count());
  console.log("RESERVATIONS :", await prisma.booking.count());
  console.log("DEMANDES :", await prisma.travelRequest.count());
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

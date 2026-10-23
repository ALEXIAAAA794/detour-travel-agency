import { prisma } from "../config/prisma.js";
import type { AppointmentRequest } from "@prisma/client";
import { deliverEmail } from "./emailDelivery.service.js";

export async function sendAppointmentConfirmationEmail(appointment: AppointmentRequest) {
  const subject = "Votre rendez-vous avec DÉTOUR est confirmé";
  const date = appointment.preferredDate.toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    dateStyle: "long",
  });
  const record = await prisma.appointmentEmail.create({
    data: {
      appointmentId: appointment.id,
      recipient: appointment.clientEmail,
      subject,
      status: "PENDING",
    },
  });
  const delivery = await deliverEmail({
    recipient: appointment.clientEmail,
    subject,
    text: `Bonjour ${appointment.clientName},\n\nVotre rendez-vous avec un conseiller DÉTOUR est confirmé.\n\nDate : ${date}\nHeure : ${appointment.preferredTime}\nObjet : ${appointment.subject}\n\nNous avons hâte d’échanger avec vous.\n\nL’équipe DÉTOUR Voyages`,
  });

  if (!delivery.sent) {
    await prisma.appointmentEmail.update({
      where: { id: record.id },
      data: { status: "FAILED", errorMessage: delivery.errorMessage },
    });
    console.error(`Email de confirmation du rendez-vous ${appointment.id} non envoyé : ${delivery.errorMessage}`);
    return { sent: false as const, notice: delivery.notice };
  }

  await prisma.appointmentEmail.update({
    where: { id: record.id },
    data: { status: "SENT", providerId: delivery.providerId, sentAt: new Date() },
  });
  return { sent: true as const };
}

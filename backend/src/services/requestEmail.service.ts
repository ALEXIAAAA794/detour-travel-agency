import { prisma } from "../config/prisma.js";
import { deliverEmail } from "./emailDelivery.service.js";

type RequestEmailInput = {
  requestId: string;
  recipient: string;
  subject: string;
  template: string;
  text: string;
};

export async function sendRequestEmail(input: RequestEmailInput) {
  const record = await prisma.requestEmail.create({
    data: {
      requestId: input.requestId,
      recipient: input.recipient,
      subject: input.subject,
      template: input.template,
      status: "PENDING",
    },
  });
  const delivery = await deliverEmail(input);

  if (!delivery.sent) {
    await prisma.requestEmail.update({
      where: { id: record.id },
      data: { status: "FAILED", errorMessage: delivery.errorMessage },
    });
    console.error(`Envoi email échoué pour la demande ${input.requestId} : ${delivery.errorMessage}`);
    return { sent: false as const, notice: delivery.notice };
  }

  await prisma.requestEmail.update({
    where: { id: record.id },
    data: { status: "SENT", providerId: delivery.providerId, sentAt: new Date() },
  });
  return { sent: true as const };
}

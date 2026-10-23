import { env } from "../config/env.js";

type EmailInput = {
  recipient: string;
  subject: string;
  text: string;
};

type DeliveryResult =
  | { sent: true; providerId: string | null }
  | { sent: false; notice: string; errorMessage: string };

export async function deliverEmail(input: EmailInput): Promise<DeliveryResult> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return {
      sent: false,
      notice: "Email non envoyé : configurez RESEND_API_KEY et EMAIL_FROM.",
      errorMessage: "Le service d’email n’est pas configuré.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.recipient],
        subject: input.subject,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const result: unknown = await response.json().catch(() => ({}));
    const providerId =
      typeof result === "object" && result !== null && "id" in result &&
      typeof result.id === "string" ? result.id : null;

    if (!response.ok) {
      return {
        sent: false,
        notice: "L’email n’a pas pu être envoyé. L’équipe peut réessayer.",
        errorMessage: `Resend a répondu HTTP ${response.status}.`,
      };
    }

    return { sent: true, providerId };
  } catch (error) {
    return {
      sent: false,
      notice: "L’email n’a pas pu être envoyé. Vérifiez la configuration et réessayez.",
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Erreur d’envoi.",
    };
  }
}

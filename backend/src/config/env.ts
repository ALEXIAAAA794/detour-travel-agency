import "dotenv/config";
import { z } from "zod";

const optionalEnvString = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  CLIENT_AUTH_URL: z.string().url().default("http://127.0.0.1:4000/api/me"),
  JWT_SECRET: z.string().min(16).optional(),
  MANAGER_API_KEY: z.string().min(24).optional(),
  RESEND_API_KEY: optionalEnvString,
  EMAIL_FROM: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(3).optional(),
  ),
  CLIENT_APP_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variables d'environnement invalides :", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

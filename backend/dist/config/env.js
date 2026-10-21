import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    JWT_SECRET: z.string().min(16).optional(),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error("Variables d'environnement invalides :", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
export const env = parsed.data;

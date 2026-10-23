import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (error) => {
  console.error("Erreur inattendue PostgreSQL :", error.message);
});

import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const LEGACY_USERS_FILE =
  process.env.LEGACY_CLIENT_USERS_FILE || path.join(__dirname, "users.json");
const { Pool } = pg;

if (!JWT_SECRET) throw new Error("JWT_SECRET must be set in server/.env");
if (!DATABASE_URL) throw new Error("DATABASE_URL must be set in server/.env");

const pool = new Pool({ connectionString: DATABASE_URL });
pool.on("error", (error) => {
  console.error("Erreur inattendue de la base des comptes clients :", error.message);
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.get("/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch (error) {
    next(error);
  }
});

async function importLegacyUsers() {
  if (!fs.existsSync(LEGACY_USERS_FILE)) return;

  const users = JSON.parse(fs.readFileSync(LEGACY_USERS_FILE, "utf8"));
  if (!Array.isArray(users)) {
    throw new Error("Le fichier historique des comptes clients doit contenir une liste.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const user of users) {
      const id = String(user.id || "").trim();
      const name = String(user.name || "").trim();
      const email = String(user.email || "").trim().toLowerCase();
      const passwordHash = user.passwordHash || user.password;
      if (!id || !name || !email || typeof passwordHash !== "string" || !passwordHash) {
        throw new Error("Un compte du fichier historique est incomplet ; import annulé.");
      }

      const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error("Un compte du fichier historique contient une date invalide.");
      }

      await client.query(
        `INSERT INTO "ClientAccount" ("id", "name", "email", "passwordHash", "createdAt")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("email") DO NOTHING`,
        [id, name, email, passwordHash, createdAt],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  console.info(`Import des comptes clients historiques terminé (${users.length} entrée(s)).`);
}

function signClientToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

app.post("/api/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caractères." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "ClientAccount" ("id", "name", "email", "passwordHash")
       VALUES ($1, $2, $3, $4)
       RETURNING "id", "name", "email"`,
      [randomUUID(), name.trim(), email.trim().toLowerCase(), passwordHash],
    );
    const user = result.rows[0];
    res.status(201).json({ token: signClientToken(user), user });
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "E-mail et mot de passe requis." });
    }

    const result = await pool.query(
      `SELECT "id", "name", "email", "passwordHash"
       FROM "ClientAccount" WHERE "email" = $1`,
      [email.trim().toLowerCase()],
    );
    const account = result.rows[0];
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const user = { id: account.id, name: account.name, email: account.email };
    res.json({ token: signClientToken(user), user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token invalide." });
  }

  try {
    const result = await pool.query(
      `SELECT "id", "name", "email"
       FROM "ClientAccount" WHERE "id" = $1`,
      [payload.id],
    );
    if (!result.rows[0]) return res.status(401).json({ error: "Compte client introuvable." });
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error?.code === "23505") {
    return res.status(409).json({ error: "Cet e-mail est déjà utilisé." });
  }
  console.error("Erreur du service de comptes clients :", error);
  return res.status(500).json({ error: "Erreur interne du serveur" });
});

await importLegacyUsers();

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`DÉTOUR API → http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

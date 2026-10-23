import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { pool } from "./config/database.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 300 }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "error", db: "down" });
  }
});

app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);

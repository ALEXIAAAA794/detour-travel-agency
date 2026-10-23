import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
}
const DB_FILE = path.join(__dirname, "users.json");

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

/* ---------- simple JSON DB ---------- */
function readUsers() {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

/* ---------- Auth ---------- */
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Le mot de passe doit faire au moins 6 caractères." });
  }

  const users = readUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "Cet e-mail est déjà utilisé." });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password: hash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail et mot de passe requis." });
  }

  const users = readUsers();
  const user = users.find((u) => u.email === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

app.get("/api/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    res.json({
      user: { id: payload.id, name: payload.name, email: payload.email },
    });
  } catch {
    res.status(401).json({ error: "Token invalide." });
  }
});

app.listen(PORT, () => {
  console.log(`DÉTOUR API → http://localhost:${PORT}`);
});

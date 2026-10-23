import { readdirSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const databaseUrl = new URL(process.env.DATABASE_URL || "");

if (process.env.DETOUR_DOCKER_DEV !== "true" || databaseUrl.hostname !== "db") {
  throw new Error("Docker development bootstrap is restricted to the Compose database service.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function runPrisma(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`Prisma command failed: prisma ${args.join(" ")}`);
  }
}

try {
  const marker = await pool.query(
    `SELECT to_regclass('public."_detour_docker_dev_baseline"') AS table_name`
  );

  if (!marker.rows[0].table_name) {
    runPrisma(["db", "push", "--skip-generate"]);
    const migrations = readdirSync(join(root, "prisma", "migrations"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    const history = await pool.query(
      `SELECT to_regclass('public."_prisma_migrations"') AS table_name`
    );
    const applied = history.rows[0].table_name
      ? new Set(
          (await pool.query(
            `SELECT migration_name FROM "_prisma_migrations"
             WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
          )).rows.map((row) => row.migration_name)
        )
      : new Set();

    for (const migration of migrations) {
      if (!applied.has(migration)) {
        runPrisma(["migrate", "resolve", "--applied", migration]);
      }
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS "_detour_docker_dev_baseline" (
         "id" INTEGER PRIMARY KEY CHECK ("id" = 1)
       )`
    );
    await pool.query(
      `INSERT INTO "_detour_docker_dev_baseline" ("id") VALUES (1)
       ON CONFLICT ("id") DO NOTHING`
    );
  }
} finally {
  await pool.end();
}

runPrisma(["migrate", "deploy"]);

const npm = spawn("npm", ["run", "dev"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => npm.kill(signal));
}

npm.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

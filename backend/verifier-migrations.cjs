require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await db.connect();

    const result = await db.query(
      "SELECT to_regclass('public._prisma_migrations') AS migrations"
    );

    console.log("Table de suivi Prisma :", result.rows[0].migrations ?? "absente");
  } catch (error) {
    console.error("Erreur :", error.message);
  } finally {
    await db.end();
  }
}

main();

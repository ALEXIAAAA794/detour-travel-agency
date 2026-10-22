require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await db.connect();

    const result = await db.query(`
      SELECT COUNT(*)::int AS nombre_destinations
      FROM public.destinations
    `);

    console.log("Nombre de destinations :", result.rows[0].nombre_destinations);
  } catch (error) {
    console.error("Erreur :", error.message);
  } finally {
    await db.end();
  }
}

main();

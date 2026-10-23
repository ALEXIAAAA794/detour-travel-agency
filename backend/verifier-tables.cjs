const { Client } = require("pg");
require("dotenv").config();

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await db.connect();

    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("Tables présentes dans PostgreSQL :");
    console.log(
      result.rows.length
        ? result.rows.map((row) => row.table_name).join("\n")
        : "Aucune table"
    );
  } catch (error) {
    console.error("Erreur :", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();

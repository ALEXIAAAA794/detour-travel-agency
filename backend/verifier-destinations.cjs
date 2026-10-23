require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await db.connect();

    const result = await db.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'destinations'
      ORDER BY ordinal_position
    `);

    console.table(result.rows);
  } catch (error) {
    console.error("Erreur :", error.message);
  } finally {
    await db.end();
  }
}

main();

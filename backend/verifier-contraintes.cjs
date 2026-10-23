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
        tc.constraint_type,
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'destinations'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);

    console.table(result.rows);
  } catch (error) {
    console.error("Erreur :", error.message);
  } finally {
    await db.end();
  }
}

main();

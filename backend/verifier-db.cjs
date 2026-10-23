require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
      ["public"]
    );

    console.table(result.rows);
  } catch (error) {
    console.error("Erreur :", error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main();

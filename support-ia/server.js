const express = require("express");

const app = express();

app.use(express.json({ limit: "16kb" }));

app.get("/api/support/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "detour-support-ia"
  });
});

app.listen(3001, "127.0.0.1", () => {
  console.log("Support IA démarré sur http://127.0.0.1:3001");
});
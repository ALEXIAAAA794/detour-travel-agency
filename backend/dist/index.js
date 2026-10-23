import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/database.js";
const server = app.listen(env.PORT, () => {
    console.log(`API prete sur http://localhost:${env.PORT}`);
});
function shutdown() {
    server.close(() => {
        void pool.end().finally(() => {
            process.exit(0);
        });
    });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

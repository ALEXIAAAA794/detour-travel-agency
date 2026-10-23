import { pool } from "../config/database.js";
const columns = `
  id,
  name,
  country,
  description,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;
export const destinationService = {
    async list() {
        const result = await pool.query(`SELECT ${columns} FROM destinations ORDER BY name ASC`);
        return result.rows;
    },
    async get(id) {
        const result = await pool.query(`SELECT ${columns} FROM destinations WHERE id = $1`, [id]);
        if (result.rowCount === 0) {
            const error = Object.assign(new Error("Destination introuvable"), {
                statusCode: 404,
            });
            throw error;
        }
        return result.rows[0];
    },
    async create(data) {
        const result = await pool.query(`INSERT INTO destinations (name, country, description)
       VALUES ($1, $2, $3)
       RETURNING ${columns}`, [data.name, data.country, data.description ?? null]);
        return result.rows[0];
    },
    async update(id, data) {
        const fields = [];
        const values = [];
        if (data.name !== undefined) {
            values.push(data.name);
            fields.push(`name = $${values.length}`);
        }
        if (data.country !== undefined) {
            values.push(data.country);
            fields.push(`country = $${values.length}`);
        }
        if (data.description !== undefined) {
            values.push(data.description);
            fields.push(`description = $${values.length}`);
        }
        if (fields.length === 0) {
            return this.get(id);
        }
        values.push(id);
        const result = await pool.query(`UPDATE destinations
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING ${columns}`, values);
        if (result.rowCount === 0) {
            const error = Object.assign(new Error("Destination introuvable"), {
                statusCode: 404,
            });
            throw error;
        }
        return result.rows[0];
    },
    async remove(id) {
        const result = await pool.query(`DELETE FROM destinations WHERE id = $1 RETURNING ${columns}`, [id]);
        if (result.rowCount === 0) {
            const error = Object.assign(new Error("Destination introuvable"), {
                statusCode: 404,
            });
            throw error;
        }
        return result.rows[0];
    },
};

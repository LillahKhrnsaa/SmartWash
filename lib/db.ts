import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "123456",
  database: process.env.PGDATABASE || "smartwash_db",
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("[DB Query]", { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error("[DB Query Error]", { text, err });
    throw err;
  }
};

export default pool;

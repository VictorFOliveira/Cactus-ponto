import pg from 'pg';
const {Pool}=pg;
export const pool=new Pool({connectionString:process.env.DATABASE_URL});
export const query=(text,params=[])=>pool.query(text,params);
export async function health(){const r=await query('select now() as now');return r.rows[0]}

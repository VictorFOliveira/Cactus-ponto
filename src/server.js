import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pg from 'pg';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const demoEmployees = [
  { id: '1', name: 'Ana Martins', role: 'Atendimento', status: 'working', lastPunch: '08:01', balance: '+02:14' },
  { id: '2', name: 'Carlos Lima', role: 'Operações', status: 'break', lastPunch: '12:03', balance: '-00:18' },
  { id: '3', name: 'Marina Alves', role: 'Financeiro', status: 'working', lastPunch: '08:12', balance: '+00:47' },
  { id: '4', name: 'Rafael Souza', role: 'Comercial', status: 'absent', lastPunch: '—', balance: '-01:05' }
];

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'cactus-ponto-api', time: new Date().toISOString() }));

app.get('/api/dashboard', async (_, res) => {
  if (!pool) return res.json({ demo: true, present: 24, late: 2, absent: 1, overtime: '18h 42m', employees: demoEmployees });
  try {
    const { rows } = await pool.query(`SELECT e.id,e.name,e.role,e.status,e.balance_minutes,
      (SELECT occurred_at FROM punches p WHERE p.employee_id=e.id ORDER BY occurred_at DESC LIMIT 1) last_punch
      FROM employees e WHERE e.active=true ORDER BY e.name LIMIT 50`);
    res.json({ demo: false, employees: rows });
  } catch (error) { res.status(500).json({ error: 'dashboard_unavailable' }); }
});

app.post('/api/punches', async (req, res) => {
  const { employeeId, type = 'AUTO', collector = 'WEB' } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId_required' });
  const occurredAt = new Date();
  const nsr = `${Date.now()}${crypto.randomInt(100,999)}`;
  const raw = `${nsr}|${employeeId}|${occurredAt.toISOString()}|${collector}|${type}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  if (!pool) return res.status(201).json({ demo: true, nsr, employeeId, type, collector, occurredAt, hash });
  try {
    const { rows } = await pool.query('INSERT INTO punches (nsr,employee_id,type,collector,occurred_at,hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [nsr, employeeId, type, collector, occurredAt, hash]);
    res.status(201).json(rows[0]);
  } catch (error) { res.status(500).json({ error: 'punch_not_recorded' }); }
});

app.get('/api/employees', async (_, res) => {
  if (!pool) return res.json(demoEmployees);
  try { const { rows } = await pool.query('SELECT * FROM employees WHERE active=true ORDER BY name'); res.json(rows); }
  catch { res.status(500).json({ error: 'employees_unavailable' }); }
});

app.post('/api/employees', async (req, res) => {
  const { name, cpf, role, email } = req.body || {};
  if (!name || !cpf) return res.status(400).json({ error: 'name_and_cpf_required' });
  if (!pool) return res.status(201).json({ demo: true, id: crypto.randomUUID(), name, cpf, role, email });
  try { const { rows } = await pool.query('INSERT INTO employees(name,cpf,role,email) VALUES($1,$2,$3,$4) RETURNING *',[name,cpf,role||'',email||'']); res.status(201).json(rows[0]); }
  catch { res.status(409).json({ error: 'employee_not_created' }); }
});

app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.listen(port, () => console.log(`Cactus Ponto on :${port}`));

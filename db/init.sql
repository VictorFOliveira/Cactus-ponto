CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trade_name text,
  cnpj text UNIQUE,
  timezone text NOT NULL DEFAULT 'America/Fortaleza',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text NOT NULL,
  email text,
  registration text,
  department text,
  job_title text,
  status text NOT NULL DEFAULT 'working',
  balance_minutes integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, cpf),
  UNIQUE(tenant_id, registration)
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN','MANAGER','EMPLOYEE')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  weekly_minutes integer NOT NULL DEFAULT 2400,
  tolerance_minutes integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  entry_time time,
  break_start time,
  break_end time,
  exit_time time,
  UNIQUE(schedule_id, weekday)
);

CREATE TABLE IF NOT EXISTS employee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES work_schedules(id),
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS punch_nsr_seq START 100001;
CREATE TABLE IF NOT EXISTS punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nsr bigint NOT NULL DEFAULT nextval('punch_nsr_seq'),
  employee_id uuid NOT NULL REFERENCES employees(id),
  type text NOT NULL CHECK (type IN ('ENTRY','BREAK_START','BREAK_END','EXIT','EXTRA')),
  collector text NOT NULL DEFAULT 'WEB_PWA',
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, nsr)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id,email);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id,active);
CREATE INDEX IF NOT EXISTS idx_punches_tenant_employee_time ON punches(tenant_id,employee_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON audit_logs(tenant_id,created_at DESC);

-- bcrypt hash for demo password Cactus@123
INSERT INTO tenants(id,name,trade_name,cnpj) VALUES ('11111111-1111-4111-8111-111111111111','Cactus Tecnologia Demo','Cactus Demo','00000000000000') ON CONFLICT (id) DO NOTHING;
INSERT INTO employees(id,tenant_id,name,cpf,email,registration,department,job_title,status,balance_minutes) VALUES
('22222222-2222-4222-8222-222222222221','11111111-1111-4111-8111-111111111111','Victor Oliveira','00000000001','admin@cactusponto.local','0001','Administração','Administrador','working',0),
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Marina Costa','00000000002','gestor@cactusponto.local','0002','Financeiro','Gestora','working',47),
('22222222-2222-4222-8222-222222222223','11111111-1111-4111-8111-111111111111','Lucas Martins','00000000003','colaborador@cactusponto.local','0003','Desenvolvimento','Analista','working',138)
ON CONFLICT (tenant_id,cpf) DO NOTHING;

INSERT INTO work_schedules(id,tenant_id,name,weekly_minutes,tolerance_minutes) VALUES ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Comercial 08h-17h',2400,5) ON CONFLICT (id) DO NOTHING;
INSERT INTO schedule_days(schedule_id,weekday,entry_time,break_start,break_end,exit_time)
SELECT '33333333-3333-4333-8333-333333333333',d,'08:00','12:00','13:00','17:00' FROM generate_series(1,5) d ON CONFLICT (schedule_id,weekday) DO NOTHING;
INSERT INTO employee_schedules(tenant_id,employee_id,schedule_id)
SELECT '11111111-1111-4111-8111-111111111111',e.id,'33333333-3333-4333-8333-333333333333' FROM employees e WHERE e.tenant_id='11111111-1111-4111-8111-111111111111' AND NOT EXISTS (SELECT 1 FROM employee_schedules es WHERE es.employee_id=e.id AND es.ends_on IS NULL);

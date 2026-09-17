CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  cpf text NOT NULL UNIQUE,
  email text,
  role text,
  status text NOT NULL DEFAULT 'working',
  balance_minutes integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nsr text NOT NULL UNIQUE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  type text NOT NULL,
  collector text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_punches_employee_time ON punches(employee_id, occurred_at DESC);

INSERT INTO tenants(name,cnpj) SELECT 'Cactus Demo','00000000000000' WHERE NOT EXISTS (SELECT 1 FROM tenants);
INSERT INTO employees(tenant_id,name,cpf,email,role,status,balance_minutes)
SELECT t.id,'Ana Martins','00000000001','ana@demo.local','Atendimento','working',134 FROM tenants t WHERE t.name='Cactus Demo' AND NOT EXISTS (SELECT 1 FROM employees WHERE cpf='00000000001');
INSERT INTO employees(tenant_id,name,cpf,email,role,status,balance_minutes)
SELECT t.id,'Carlos Lima','00000000002','carlos@demo.local','Operações','break',-18 FROM tenants t WHERE t.name='Cactus Demo' AND NOT EXISTS (SELECT 1 FROM employees WHERE cpf='00000000002');
INSERT INTO employees(tenant_id,name,cpf,email,role,status,balance_minutes)
SELECT t.id,'Marina Alves','00000000003','marina@demo.local','Financeiro','working',47 FROM tenants t WHERE t.name='Cactus Demo' AND NOT EXISTS (SELECT 1 FROM employees WHERE cpf='00000000003');

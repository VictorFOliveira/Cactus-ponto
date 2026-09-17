import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const closing=readFileSync(new URL('../src/closing.js',import.meta.url),'utf8');
const reports=readFileSync(new URL('../src/reports.js',import.meta.url),'utf8');

test('closing and payroll export preserve employees whose employment overlaps the requested month',()=>{
  const overlap="e.termination_date IS NULL OR e.termination_date >= ($2||'-01')::date";
  assert.ok(closing.includes(overlap));
  assert.ok(reports.includes(overlap));
  assert.equal(closing.includes('WHERE e.tenant_id=$1 AND e.active'),false);
  assert.equal(reports.includes('WHERE e.tenant_id=$1 AND e.active'),false);
});

test('company close-all reuses per-employee readiness checks before committing',()=>{
  assert.ok(reports.includes("import{closureReadiness}from'./closing.js'"));
  assert.ok(reports.includes('await closureReadiness(c,req.user.tenantId,e.id,month)'));
  assert.ok(reports.includes("return res.status(409).json({error:'Existem pendências antes do fechamento geral',blocked})"));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import { bootstrap } from '../src/bootstrap.js';

let server,base;
test.before(async()=>{
  await bootstrap();
  server=app.listen(0);
  await new Promise(r=>server.once('listening',r));
  base=`http://127.0.0.1:${server.address().port}/api`;
});
test.after(()=>server.close());

test('rejects unauthenticated protected endpoint',async()=>{
  const r=await fetch(base+'/punches');
  assert.equal(r.status,401);
});

test('signed token with unknown UUID is rejected by database-bound identity',async()=>{
  const token=jwt.sign({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',tenantId:'11111111-1111-4111-8111-111111111111',employeeId:'22222222-2222-4222-8222-222222222223',role:'ADMIN'},process.env.JWT_SECRET||'dev-cactus-change-me');
  const r=await fetch(base+'/dashboard',{headers:{Authorization:'Bearer '+token}});
  assert.equal(r.status,401);
});

test('employee cannot escalate role by forging signed token claims',async()=>{
  const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'colaborador@cactusponto.local',password:'Cactus@123'})});
  assert.equal(login.status,200);
  const body=await login.json();
  const decoded=jwt.verify(body.token,process.env.JWT_SECRET||'dev-cactus-change-me');
  const forged=jwt.sign({...decoded,role:'ADMIN',tenantId:'ffffffff-ffff-4fff-8fff-ffffffffffff'},process.env.JWT_SECRET||'dev-cactus-change-me');
  const r=await fetch(base+'/dashboard',{headers:{Authorization:'Bearer '+forged}});
  assert.equal(r.status,403);
});

test('API app exports correctly',()=>{
  assert.ok(app);
  assert.equal(typeof app.listen,'function');
});

import test from 'node:test';import assert from 'node:assert/strict';import jwt from 'jsonwebtoken';import app from '../src/server.js';
let server,base;test.before(async()=>{server=app.listen(0);await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}/api`});test.after(()=>server.close());
test('rejects unauthenticated protected endpoint',async()=>{const r=await fetch(base+'/punches');assert.equal(r.status,401)});
test('employee token cannot access manager dashboard',async()=>{const token=jwt.sign({id:'test',tenantId:'11111111-1111-4111-8111-111111111111',employeeId:'22222222-2222-4222-8222-222222222223',role:'EMPLOYEE'},process.env.JWT_SECRET||'dev-cactus-change-me');const r=await fetch(base+'/dashboard',{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,403)});
test('API app exports correctly',()=>{assert.ok(app);assert.equal(typeof app.listen,'function')});

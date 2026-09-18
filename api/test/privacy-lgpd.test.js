import test from'node:test';
import assert from'node:assert/strict';
import app from'../src/server.js';
import{bootstrap}from'../src/bootstrap.js';
import{query}from'../src/db.js';

let server,base,employeeToken,hrToken;
const login=async email=>{const r=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'Cactus@123'})});assert.equal(r.status,200);return(await r.json()).token};
test.before(async()=>{await bootstrap();server=app.listen(0);await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}/api`;employeeToken=await login('colaborador@cactusponto.local');hrToken=await login('rh@cactusponto.local');await query(`DELETE FROM privacy_requests WHERE tenant_id='11111111-1111-4111-8111-111111111111'`)});
test.after(()=>server.close());

test('private API responses disable caching and expose privacy notice',async()=>{const r=await fetch(base+'/me/privacy',{headers:{Authorization:'Bearer '+employeeToken}});assert.equal(r.status,200);assert.match(r.headers.get('cache-control')||'',/no-store/);const x=await r.json();assert.ok(x.controller.name);assert.ok(x.requestTypes.includes('ACCESS'))});

test('subject export is self-scoped and excludes password hashes',async()=>{const r=await fetch(base+'/me/privacy/export',{headers:{Authorization:'Bearer '+employeeToken}});assert.equal(r.status,200);const raw=await r.text();assert.doesNotMatch(raw,/password_hash/i);const x=JSON.parse(raw);assert.equal(x.account.email,'colaborador@cactusponto.local');assert.equal(x.employee.email,'colaborador@cactusponto.local');assert.ok(Array.isArray(x.punches))});

test('employee can create and list own LGPD request',async()=>{const r=await fetch(base+'/me/privacy/requests',{method:'POST',headers:{Authorization:'Bearer '+employeeToken,'content-type':'application/json'},body:JSON.stringify({type:'CORRECTION',description:'Quero corrigir um dado cadastral.'})});assert.equal(r.status,201);const x=await r.json();assert.equal(x.status,'PENDING');const list=await fetch(base+'/me/privacy/requests',{headers:{Authorization:'Bearer '+employeeToken}});const a=await list.json();assert.ok(a.some(i=>i.id===x.id))});

test('duplicate open request is throttled without leaking details',async()=>{const r=await fetch(base+'/me/privacy/requests',{method:'POST',headers:{Authorization:'Bearer '+employeeToken,'content-type':'application/json'},body:JSON.stringify({type:'CORRECTION',description:'Duplicada'})});assert.equal(r.status,409)});

test('employee cannot open administrative privacy queue',async()=>{const r=await fetch(base+'/privacy/requests',{headers:{Authorization:'Bearer '+employeeToken}});assert.equal(r.status,403)});

test('HR can review tenant request and response returns to subject',async()=>{const q=await fetch(base+'/privacy/requests',{headers:{Authorization:'Bearer '+hrToken}});assert.equal(q.status,200);const rows=await q.json(),item=rows.find(x=>x.requester_email==='colaborador@cactusponto.local');assert.ok(item);const u=await fetch(base+'/privacy/requests/'+item.id,{method:'PATCH',headers:{Authorization:'Bearer '+hrToken,'content-type':'application/json'},body:JSON.stringify({status:'COMPLETED',response:'Cadastro analisado. Entre em contato com o RH para a correção documental.'})});assert.equal(u.status,200);const own=await fetch(base+'/me/privacy/requests',{headers:{Authorization:'Bearer '+employeeToken}});const mine=await own.json();assert.equal(mine.find(x=>x.id===item.id).status,'COMPLETED')});

test('privacy review cannot cross tenant boundary',async()=>{const fake='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const r=await fetch(base+'/privacy/requests/'+fake,{method:'PATCH',headers:{Authorization:'Bearer '+hrToken,'content-type':'application/json'},body:JSON.stringify({status:'COMPLETED',response:'x'})});assert.equal(r.status,404)});

test('settings API does not expose billing object to HR',async()=>{const r=await fetch(base+'/settings',{headers:{Authorization:'Bearer '+hrToken}});assert.equal(r.status,200);const x=await r.json();assert.equal(x.settings?.billing,undefined)});

test('settings write cannot overwrite billing through generic settings endpoint',async()=>{const before=await query(`SELECT settings->'billing' billing FROM tenants WHERE id='11111111-1111-4111-8111-111111111111'`);const r=await fetch(base+'/settings',{method:'PUT',headers:{Authorization:'Bearer '+hrToken,'content-type':'application/json'},body:JSON.stringify({settings:{billing:{status:'ACTIVE'},privacy:{contactEmail:'privacidade@example.com'}}})});assert.equal(r.status,200);const after=await query(`SELECT settings->'billing' billing FROM tenants WHERE id='11111111-1111-4111-8111-111111111111'`);assert.deepEqual(after.rows[0].billing,before.rows[0].billing)});

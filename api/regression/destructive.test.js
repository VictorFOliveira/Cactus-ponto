import test from'node:test';
import assert from'node:assert/strict';
import http from'node:http';
import crypto from'node:crypto';
import bcrypt from'bcryptjs';
import{createClient}from'redis';
import app from'../src/server.js';
import{bootstrap}from'../src/bootstrap.js';
import{query,pool}from'../src/db.js';
import{cacheSet,redisStatus,closeRedis,rateLimitHit}from'../src/redis.js';

let server,port;
const DEMO_HOST='localhost';
const jsonBody=v=>v===undefined?null:JSON.stringify(v);
function request(path,{method='GET',token,body,host=DEMO_HOST}={}){
  return new Promise((resolve,reject)=>{
    const raw=jsonBody(body),headers={Host:host};
    if(raw){headers['Content-Type']='application/json';headers['Content-Length']=Buffer.byteLength(raw)}
    if(token)headers.Authorization='Bearer '+token;
    const req=http.request({hostname:'127.0.0.1',port,path:'/api'+path,method,headers},res=>{
      let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>{
        let parsed=null;try{parsed=data?JSON.parse(data):null}catch{parsed=data}
        resolve({status:res.statusCode,headers:res.headers,body:parsed,raw:data})
      })
    });req.on('error',reject);if(raw)req.write(raw);req.end()
  })
}
async function login(email,password='Cactus@123',host=DEMO_HOST){
  const r=await request('/auth/login',{method:'POST',host,body:{email,password}});
  return{...r,token:r.body?.token,user:r.body?.user}
}

test.before(async()=>{
  await bootstrap();
  server=app.listen(0);
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject)});
  port=server.address().port;
});
test.after(async()=>{
  if(server)await new Promise(r=>server.close(r));
  await closeRedis();
  await pool.end();
});

test('destructive regression: auth, tenant, cache, privacy and invalidation',async t=>{
  const admin=await login('admin@cactusponto.local');
  const employee=await login('colaborador@cactusponto.local');
  assert.equal(admin.status,200);
  assert.equal(employee.status,200);

  await t.test('health proves PostgreSQL and Redis are live',async()=>{
    const r=await request('/health');
    assert.equal(r.status,200);
    assert.equal(r.body.database,'connected');
    assert.equal(r.body.cache?.ready,true);
    assert.equal(r.body.cache?.mode,'redis');
  });

  await t.test('unauthenticated and forged tenant access are denied',async()=>{
    const noToken=await request('/dashboard');
    assert.equal(noToken.status,401);
    const fake='not-a-real-token';
    const forged=await request('/dashboard',{token:fake});
    assert.equal(forged.status,401);
  });

  await t.test('branding cache is invalidated by tenant settings update',async()=>{
    const warm=await request('/me/branding',{token:admin.token});
    assert.equal(warm.status,200);
    const color='#4b3f72',name='Cactus Regression';
    const update=await request('/settings',{method:'PUT',token:admin.token,body:{tradeName:name,settings:{branding:{primaryColor:color,secondaryColor:'#102947',accentColor:'#168ee7',logoUrl:null}}}});
    assert.equal(update.status,200);
    const fresh=await request('/me/branding',{token:admin.token});
    assert.equal(fresh.status,200);
    assert.equal(fresh.body.companyName,name);
    assert.equal(fresh.body.branding.primaryColor,color);
  });

  await t.test('dashboard aggregate cache is invalidated after employee creation',async()=>{
    const before=await request('/dashboard',{token:admin.token});
    assert.equal(before.status,200);
    const suffix=String(Date.now()).slice(-6);
    const created=await request('/employees',{method:'POST',token:admin.token,body:{name:'Regression User',cpf:'98765'+suffix.padStart(6,'0').slice(-6),registration:'REG-'+suffix,department:'QA',jobTitle:'Teste'}});
    assert.equal(created.status,201);
    const after=await request('/dashboard',{token:admin.token});
    assert.equal(after.status,200);
    assert.equal(after.body.employees,before.body.employees+1);
  });

  await t.test('LGPD export is self-scoped and request lifecycle is auditable',async()=>{
    const exp=await request('/me/privacy/export',{token:employee.token});
    assert.equal(exp.status,200);
    assert.equal(exp.body.account.email,'colaborador@cactusponto.local');
    assert.equal(exp.body.employee.email,'colaborador@cactusponto.local');
    assert.doesNotMatch(exp.raw,/password_hash/i);
    assert.match(exp.headers['cache-control']||'',/no-store/);

    const created=await request('/me/privacy/requests',{method:'POST',token:employee.token,body:{type:'ACCESS',description:'Regressão destrutiva: confirmar acesso aos meus dados.'}});
    assert.equal(created.status,201);
    const queue=await request('/privacy/requests',{token:admin.token});
    assert.equal(queue.status,200);
    const item=queue.body.find(x=>x.id===created.body.id);
    assert.ok(item);
    const reviewed=await request('/privacy/requests/'+item.id,{method:'PATCH',token:admin.token,body:{status:'COMPLETED',response:'Solicitação atendida no teste de regressão.'}});
    assert.equal(reviewed.status,200);
    const own=await request('/me/privacy/requests',{token:employee.token});
    assert.equal(own.body.find(x=>x.id===item.id).status,'COMPLETED');
  });

  await t.test('verified host pins authentication and JWT to its tenant',async()=>{
    const tenantId=crypto.randomUUID(),employeeId=crypto.randomUUID(),userId=crypto.randomUUID();
    await query(`INSERT INTO tenants(id,name,trade_name)VALUES($1,'Tenant Isolado','Tenant Isolado')`,[tenantId]);
    await query(`INSERT INTO employees(id,tenant_id,name,cpf,email,registration,department,job_title)VALUES($1,$2,'Admin Isolado','12345678901','admin@cactusponto.local','ISO-1','QA','Admin')`,[employeeId,tenantId]);
    const hash=await bcrypt.hash('Other@123',10);
    await query(`INSERT INTO users(id,tenant_id,employee_id,name,email,password_hash,role)VALUES($1,$2,$3,'Admin Isolado','admin@cactusponto.local',$4,'ADMIN')`,[userId,tenantId,employeeId,hash]);
    const host='isolated-regression.ponto.cactustecnologia.com.br';
    await query(`INSERT INTO tenant_domains(tenant_id,domain,type,verified,is_primary,verified_at)VALUES($1,$2,'CACTUS',true,true,now())`,[tenantId,host]);

    const wrongPassword=await login('admin@cactusponto.local','Cactus@123',host);
    assert.equal(wrongPassword.status,401);
    const isolated=await login('admin@cactusponto.local','Other@123',host);
    assert.equal(isolated.status,200);
    assert.equal(isolated.user.tenantId,tenantId);

    const crossed=await request('/dashboard',{token:admin.token,host});
    assert.equal(crossed.status,401);
    const own=await request('/dashboard',{token:isolated.token,host});
    assert.equal(own.status,200);
    assert.equal(own.body.employees,1);
  });

  await t.test('Redis rate counter is shared and cache fails open when Redis is disabled',async()=>{
    const key='destructive:'+crypto.randomUUID(),a=await rateLimitHit(key,30000),b=await rateLimitHit(key,30000);
    assert.equal(a.count,1);assert.equal(b.count,2);
    const original=process.env.REDIS_URL;
    process.env.REDIS_URL='';
    try{
      assert.equal(await cacheSet('must-not-persist',{secret:'x'},30),false);
      const status=await redisStatus();
      assert.equal(status.configured,false);
      assert.equal(status.mode,'memory-fallback');
    }finally{process.env.REDIS_URL=original}
  });

  await t.test('Redis contains no obvious employee PII in application cache keys/values',async()=>{
    const client=createClient({url:process.env.REDIS_URL});
    await client.connect();
    try{
      const keys=await client.keys((process.env.REDIS_PREFIX||'cactus:destructive')+':*');
      const pairs=[];
      for(const k of keys){let v='';try{v=await client.get(k)||''}catch{}pairs.push(k+' '+v)}
      const dump=pairs.join('\n');
      assert.doesNotMatch(dump,/@cactusponto\.local/i);
      assert.doesNotMatch(dump,/0000000000[1-4]/);
    }finally{await client.quit()}
  });
});

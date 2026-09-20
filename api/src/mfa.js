import crypto from'node:crypto';
import jwt from'jsonwebtoken';
import{Router}from'express';
import{query}from'./db.js';

const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const keyMaterial=()=>String(process.env.MFA_ENCRYPTION_KEY||process.env.JWT_SECRET||'dev-cactus-mfa-key');
const encKey=()=>crypto.createHash('sha256').update(keyMaterial()).digest();
const hashCode=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const safeEqual=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};

function base32Encode(buffer){
  let bits=0,value=0,out='';
  for(const byte of buffer){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=ALPHABET[(value>>>(bits-5))&31];bits-=5}}
  if(bits>0)out+=ALPHABET[(value<<(5-bits))&31];
  return out;
}
function base32Decode(input){
  let bits=0,value=0;const bytes=[];
  for(const ch of String(input||'').replace(/=+$/,'').toUpperCase()){
    const idx=ALPHABET.indexOf(ch);if(idx<0)continue;
    value=(value<<5)|idx;bits+=5;
    if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8}
  }
  return Buffer.from(bytes);
}
export function generateTotpSecret(){return base32Encode(crypto.randomBytes(20))}
export function totp(secret,time=Date.now(),step=30,digits=6){
  const counter=Math.floor(time/1000/step),buf=Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac=crypto.createHmac('sha1',base32Decode(secret)).update(buf).digest();
  const offset=mac[mac.length-1]&15;
  const value=((mac[offset]&127)<<24)|((mac[offset+1]&255)<<16)|((mac[offset+2]&255)<<8)|(mac[offset+3]&255);
  return String(value%(10**digits)).padStart(digits,'0');
}
export function verifyTotp(secret,code,window=1){
  const c=String(code||'').trim();
  if(!/^\d{6}$/.test(c))return false;
  const now=Date.now();
  for(let i=-window;i<=window;i++)if(safeEqual(totp(secret,now+i*30000),c))return true;
  return false;
}
export function encryptSecret(value){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encKey(),iv);
  const data=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]),tag=cipher.getAuthTag();
  return [iv,tag,data].map(x=>x.toString('base64url')).join('.');
}
export function decryptSecret(value){
  const [iv,tag,data]=String(value||'').split('.').map(x=>Buffer.from(x,'base64url'));
  if(!iv||!tag||!data)throw new Error('MFA_SECRET_INVALID');
  const decipher=crypto.createDecipheriv('aes-256-gcm',encKey(),iv);decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
}
function recoveryCodes(){
  const plain=Array.from({length:8},()=>crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g).join('-'));
  return{plain,hashes:plain.map(hashCode)};
}
async function audit(tenantId,userId,action,metadata={}){
  try{await query(`INSERT INTO audit_logs(tenant_id,user_id,action,entity_type,entity_id,metadata)VALUES($1,$2,$3,'security',$2,$4)`,[tenantId,userId,action,metadata])}catch{}
}
async function userForMfa(id,tenantId){
  const r=await query(`SELECT u.id,u.tenant_id,u.employee_id,u.name,u.email,u.role,u.active,u.auth_version,u.mfa_enabled,u.mfa_secret_enc,u.mfa_recovery_hashes,t.name tenant_name
    FROM users u JOIN tenants t ON t.id=u.tenant_id
    WHERE u.id=$1 AND u.tenant_id=$2 AND u.active AND t.active LIMIT 1`,[id,tenantId]);
  return r.rows[0]||null;
}
function consumeRecovery(row,raw){
  const hashes=Array.isArray(row.mfa_recovery_hashes)?row.mfa_recovery_hashes:[];
  const h=hashCode(String(raw||'').toUpperCase()),index=hashes.findIndex(x=>safeEqual(x,h));
  return{ok:index>=0,next:index>=0?hashes.filter((_,i)=>i!==index):hashes};
}
export function mfaRoutes({auth,issueSession,jwtSecret}){
  const r=Router();

  r.get('/security/mfa/status',auth(),async(req,res,next)=>{try{
    const u=await userForMfa(req.user.id,req.user.tenantId);
    res.json({enabled:Boolean(u?.mfa_enabled),requiredForAdmin:((process.env.NODE_ENV==='production'&&String(process.env.REQUIRE_ADMIN_MFA||'true')!=='false')||String(process.env.REQUIRE_ADMIN_MFA||'').toLowerCase()==='true')&&['ADMIN','HR'].includes(req.user.role)})
  }catch(e){next(e)}});

  r.post('/security/mfa/setup',auth(),async(req,res,next)=>{try{
    const u=await userForMfa(req.user.id,req.user.tenantId);
    if(!u)return res.status(404).json({error:'Usuário não encontrado'});
    if(u.mfa_enabled)return res.status(409).json({error:'MFA já está habilitado'});
    const secret=generateTotpSecret(),secretEnc=encryptSecret(secret);
    const setupToken=jwt.sign({purpose:'mfa-setup',id:u.id,tenantId:u.tenant_id,secretEnc},jwtSecret,{expiresIn:'10m',subject:u.id});
    const issuer=encodeURIComponent('Cactus Ponto'),label=encodeURIComponent(`${u.tenant_name}:${u.email}`);
    res.json({secret,otpauthUri:`otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,setupToken})
  }catch(e){next(e)}});

  r.post('/security/mfa/enable',auth(),async(req,res,next)=>{try{
    let claims;try{claims=jwt.verify(String(req.body?.setupToken||''),jwtSecret)}catch{return res.status(400).json({error:'Configuração MFA expirada ou inválida'})}
    if(claims?.purpose!=='mfa-setup'||claims.id!==req.user.id||claims.tenantId!==req.user.tenantId)return res.status(400).json({error:'Configuração MFA inválida'});
    const secret=decryptSecret(claims.secretEnc);
    if(!verifyTotp(secret,req.body?.code))return res.status(400).json({error:'Código MFA inválido'});
    const rc=recoveryCodes();
    const q=await query(`UPDATE users SET mfa_enabled=true,mfa_secret_enc=$3,mfa_recovery_hashes=$4::jsonb,mfa_enabled_at=now(),auth_version=auth_version+1 WHERE id=$1 AND tenant_id=$2 RETURNING auth_version`,[req.user.id,req.user.tenantId,claims.secretEnc,JSON.stringify(rc.hashes)]);
    await audit(req.user.tenantId,req.user.id,'MFA_ENABLED');
    const fresh=await userForMfa(req.user.id,req.user.tenantId);
    res.json({enabled:true,recoveryCodes:rc.plain,...issueSession(fresh)})
  }catch(e){next(e)}});

  r.post('/security/mfa/disable',auth(),async(req,res,next)=>{try{
    const u=await userForMfa(req.user.id,req.user.tenantId);
    if(!u?.mfa_enabled)return res.status(409).json({error:'MFA não está habilitado'});
    let ok=false,nextHashes=Array.isArray(u.mfa_recovery_hashes)?u.mfa_recovery_hashes:[];
    if(req.body?.code){ok=verifyTotp(decryptSecret(u.mfa_secret_enc),req.body.code)}
    if(!ok&&req.body?.recoveryCode){const x=consumeRecovery(u,req.body.recoveryCode);ok=x.ok;nextHashes=x.next}
    if(!ok)return res.status(400).json({error:'Código MFA inválido'});
    await query(`UPDATE users SET mfa_enabled=false,mfa_secret_enc=null,mfa_recovery_hashes='[]'::jsonb,mfa_enabled_at=null,auth_version=auth_version+1 WHERE id=$1 AND tenant_id=$2`,[u.id,u.tenant_id]);
    await audit(u.tenant_id,u.id,'MFA_DISABLED',{usedRecovery:Boolean(req.body?.recoveryCode)});
    const fresh=await userForMfa(u.id,u.tenant_id);
    res.json({enabled:false,...issueSession(fresh)})
  }catch(e){next(e)}});

  r.post('/auth/mfa/verify',async(req,res,next)=>{try{
    let claims;try{claims=jwt.verify(String(req.body?.challengeToken||''),jwtSecret)}catch{return res.status(401).json({error:'Desafio MFA expirado ou inválido'})}
    if(claims?.purpose!=='mfa'||!claims.id||!claims.tenantId)return res.status(401).json({error:'Desafio MFA inválido'});
    const u=await userForMfa(claims.id,claims.tenantId);
    if(!u?.mfa_enabled)return res.status(401).json({error:'MFA não está habilitado'});
    let ok=false,nextHashes=Array.isArray(u.mfa_recovery_hashes)?u.mfa_recovery_hashes:[];
    if(req.body?.code)ok=verifyTotp(decryptSecret(u.mfa_secret_enc),req.body.code);
    if(!ok&&req.body?.recoveryCode){const x=consumeRecovery(u,req.body.recoveryCode);ok=x.ok;nextHashes=x.next}
    if(!ok)return res.status(401).json({error:'Código MFA inválido'});
    if(req.body?.recoveryCode)await query(`UPDATE users SET mfa_recovery_hashes=$3::jsonb WHERE id=$1 AND tenant_id=$2`,[u.id,u.tenant_id,JSON.stringify(nextHashes)]);
    await audit(u.tenant_id,u.id,'MFA_LOGIN',{usedRecovery:Boolean(req.body?.recoveryCode)});
    res.json(issueSession(u))
  }catch(e){next(e)}});

  return r
}

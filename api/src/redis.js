import{createClient}from'redis';

const prefix=String(process.env.REDIS_PREFIX||'cactus:ponto').replace(/:+$/,'');
let client=null,connecting=null,disabledUntil=0,lastError=null;

function namespaced(key){return `${prefix}:${key}`}

export async function getRedis(){
  if(!process.env.REDIS_URL||Date.now()<disabledUntil)return null;
  if(client?.isReady)return client;
  if(connecting)return connecting;
  if(!client){
    client=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:1500,reconnectStrategy:retries=>retries>3?false:Math.min(100*2**retries,1000)}});
    client.on('error',e=>{lastError=e?.message||'redis error'});
  }
  connecting=client.connect().then(()=>{lastError=null;return client}).catch(e=>{lastError=e?.message||'redis unavailable';disabledUntil=Date.now()+5000;try{client?.destroy?.()}catch{}client=null;return null}).finally(()=>{connecting=null});
  return connecting
}

export async function cacheGet(key){
  try{const r=await getRedis();if(!r)return null;const v=await r.get(namespaced(`cache:${key}`));return v===null?null:JSON.parse(v)}catch(e){lastError=e?.message||'cache get failed';return null}
}
export async function cacheSet(key,value,ttlSeconds=60){
  try{const r=await getRedis();if(!r)return false;await r.set(namespaced(`cache:${key}`),JSON.stringify(value),{EX:Math.max(1,Math.floor(ttlSeconds))});return true}catch(e){lastError=e?.message||'cache set failed';return false}
}
export async function cacheDel(...keys){
  try{const r=await getRedis();if(!r||!keys.length)return false;await r.del(keys.map(k=>namespaced(`cache:${k}`)));return true}catch(e){lastError=e?.message||'cache del failed';return false}
}
export async function rateLimitHit(key,windowMs){
  const r=await getRedis();if(!r)return null;
  try{
    const result=await r.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; local ttl=redis.call('PTTL',KEYS[1]); return {n,ttl}",{keys:[namespaced(`rate:${key}`)],arguments:[String(windowMs)]});
    return{count:Number(result[0]),ttlMs:Math.max(1,Number(result[1])||windowMs)}
  }catch(e){lastError=e?.message||'rate limit redis failed';return null}
}
export async function redisStatus(){
  if(!process.env.REDIS_URL)return{configured:false,ready:false,mode:'memory-fallback'};
  try{const r=await getRedis();if(!r)return{configured:true,ready:false,mode:'memory-fallback',error:lastError};const started=Date.now();await r.ping();return{configured:true,ready:true,mode:'redis',latencyMs:Date.now()-started}}catch(e){return{configured:true,ready:false,mode:'memory-fallback',error:e?.message||lastError}}
}
export async function closeRedis(){try{if(client?.isOpen)await client.quit()}catch{}client=null}

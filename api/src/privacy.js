import{Router}from'express';
import{query}from'./db.js';
import{isUuid}from'./id-validation.js';

const TYPES=['ACCESS','CORRECTION','ANONYMIZATION','DELETION','PORTABILITY','SHARING_INFO','OPPOSITION','OTHER'];
const REVIEW_STATUSES=['IN_REVIEW','COMPLETED','DENIED'];
const clean=(v,max=2000)=>String(v??'').trim().slice(0,max);
const audit=(tenantId,userId,action,entityId,metadata={})=>query(`INSERT INTO audit_logs(tenant_id,user_id,action,entity_type,entity_id,metadata)VALUES($1,$2,$3,'privacy',$4,$5)`,[tenantId,userId,action,entityId||null,metadata]);

async function notice(tenantId){
  const r=await query(`SELECT t.name,t.trade_name,coalesce(t.settings->'privacy','{}'::jsonb)privacy,(SELECT email FROM users u WHERE u.tenant_id=t.id AND u.role='ADMIN' AND u.active ORDER BY u.created_at LIMIT 1)admin_email FROM tenants t WHERE t.id=$1 AND t.active`,[tenantId]);
  if(!r.rowCount)return null;
  const t=r.rows[0],p=t.privacy||{};
  return{
    controller:{name:t.trade_name||t.name,contactEmail:p.contactEmail||t.admin_email||null,dpoName:p.dpoName||null,policyUrl:p.policyUrl||null},
    platformProvider:'Cactus Tecnologia',
    retentionNotice:p.retentionNotice||'Os prazos de retenção devem ser definidos pelo controlador conforme finalidade, obrigações legais/regulatórias e política interna.',
    categories:['identificação e vínculo profissional','credenciais e perfil de acesso','jornadas, escalas e exceções','marcações de ponto e apuração','solicitações de ajuste e banco de horas','registros de auditoria e segurança'],
    rights:['confirmação e acesso','correção','anonimização, bloqueio ou eliminação quando aplicável','informação sobre compartilhamento','oposição quando aplicável','portabilidade conforme regulamentação aplicável'],
    requestTypes:TYPES,
    note:'Solicitações são analisadas pelo controlador. Alguns pedidos, como eliminação, podem ser limitados por obrigação legal ou regulatória de retenção.'
  }
}

async function exportSubject(user){
  const tenant=await query(`SELECT name,trade_name FROM tenants WHERE id=$1`,[user.tenantId]);
  const account=await query(`SELECT id,name,email,role,employee_id,active,created_at FROM users WHERE tenant_id=$1 AND id=$2`,[user.tenantId,user.id]);
  let employee=null,punches=[],adjustments=[],ledger=[],bank=[],exceptions=[],schedules=[];
  if(user.employeeId){
    const [e,p,a,l,b,x,s]=await Promise.all([
      query(`SELECT id,name,cpf,email,registration,department,job_title,status,admission_date,termination_date,balance_minutes,active,created_at,salary_base,monthly_hours,overtime_percent,absence_discount FROM employees WHERE tenant_id=$1 AND id=$2`,[user.tenantId,user.employeeId]),
      query(`SELECT nsr,type,collector,occurred_at,recorded_at,created_at FROM punches WHERE tenant_id=$1 AND employee_id=$2 ORDER BY occurred_at`,[user.tenantId,user.employeeId]),
      query(`SELECT work_date,punch_type,requested_time,reason,status,review_note,reviewed_at,created_at FROM adjustment_requests WHERE tenant_id=$1 AND employee_id=$2 ORDER BY created_at`,[user.tenantId,user.employeeId]),
      query(`SELECT work_date,scheduled_minutes,worked_minutes,late_minutes,extra_minutes,missing_minutes,balance_minutes,status,calculated_at FROM daily_time_ledger WHERE tenant_id=$1 AND employee_id=$2 ORDER BY work_date`,[user.tenantId,user.employeeId]),
      query(`SELECT adjustment_date,minutes,type,reason,created_at FROM time_bank_adjustments WHERE tenant_id=$1 AND employee_id=$2 ORDER BY adjustment_date`,[user.tenantId,user.employeeId]),
      query(`SELECT type,starts_on,ends_on,reason,minutes,created_at FROM employee_exceptions WHERE tenant_id=$1 AND employee_id=$2 ORDER BY starts_on`,[user.tenantId,user.employeeId]),
      query(`SELECT es.starts_on,es.ends_on,ws.name,ws.schedule_type,ws.weekly_minutes,ws.tolerance_minutes FROM employee_schedules es JOIN work_schedules ws ON ws.tenant_id=es.tenant_id AND ws.id=es.schedule_id WHERE es.tenant_id=$1 AND es.employee_id=$2 ORDER BY es.starts_on`,[user.tenantId,user.employeeId])
    ]);
    employee=e.rows[0]||null;punches=p.rows;adjustments=a.rows;ledger=l.rows;bank=b.rows;exceptions=x.rows;schedules=s.rows;
  }
  return{generatedAt:new Date().toISOString(),tenant:{name:tenant.rows[0]?.trade_name||tenant.rows[0]?.name||null},account:account.rows[0]||null,employee,punches,adjustments,dailyLedger:ledger,timeBankAdjustments:bank,exceptions,schedules};
}

export function privacyRoutes(auth){
  const r=Router();

  r.get('/me/privacy',auth(),async(req,res,next)=>{try{const n=await notice(req.user.tenantId);if(!n)return res.status(404).json({error:'Empresa não encontrada'});res.json(n)}catch(e){next(e)}});

  r.get('/me/privacy/export',auth(),async(req,res,next)=>{try{
    const data=await exportSubject(req.user);
    await audit(req.user.tenantId,req.user.id,'PRIVACY_EXPORT',null,{employeeId:req.user.employeeId||null});
    res.setHeader('Content-Disposition','attachment; filename="cactus-ponto-meus-dados.json"');
    res.json(data)
  }catch(e){next(e)}});

  r.get('/me/privacy/requests',auth(),async(req,res,next)=>{try{
    const q=await query(`SELECT id,type,status,description,response,decision_reason,requested_at,updated_at,reviewed_at FROM privacy_requests WHERE tenant_id=$1 AND user_id=$2 ORDER BY requested_at DESC LIMIT 100`,[req.user.tenantId,req.user.id]);
    res.json(q.rows)
  }catch(e){next(e)}});

  r.post('/me/privacy/requests',auth(),async(req,res,next)=>{try{
    const type=String(req.body?.type||'').toUpperCase(),description=clean(req.body?.description);
    if(!TYPES.includes(type))return res.status(400).json({error:'Tipo de solicitação inválido'});
    if(String(req.body?.description||'').length>2000)return res.status(400).json({error:'Descrição deve ter no máximo 2000 caracteres'});
    const dup=await query(`SELECT id FROM privacy_requests WHERE tenant_id=$1 AND user_id=$2 AND type=$3 AND status IN('PENDING','IN_REVIEW') AND requested_at>now()-interval '24 hours' LIMIT 1`,[req.user.tenantId,req.user.id,type]);
    if(dup.rowCount)return res.status(409).json({error:'Já existe uma solicitação aberta desse tipo nas últimas 24 horas',requestId:dup.rows[0].id});
    const q=await query(`INSERT INTO privacy_requests(tenant_id,employee_id,user_id,type,description)VALUES($1,$2,$3,$4,$5) RETURNING id,type,status,description,requested_at`,[req.user.tenantId,req.user.employeeId||null,req.user.id,type,description||null]);
    await audit(req.user.tenantId,req.user.id,'PRIVACY_REQUEST_CREATED',q.rows[0].id,{type});
    res.status(201).json(q.rows[0])
  }catch(e){next(e)}});

  r.get('/privacy/requests',auth(['ADMIN','HR']),async(req,res,next)=>{try{
    const q=await query(`SELECT pr.id,pr.type,pr.status,pr.description,pr.response,pr.decision_reason,pr.requested_at,pr.updated_at,pr.reviewed_at,u.name requester_name,u.email requester_email,e.registration,rv.name reviewer_name FROM privacy_requests pr JOIN users u ON u.tenant_id=pr.tenant_id AND u.id=pr.user_id LEFT JOIN employees e ON e.tenant_id=pr.tenant_id AND e.id=pr.employee_id LEFT JOIN users rv ON rv.tenant_id=pr.tenant_id AND rv.id=pr.reviewed_by WHERE pr.tenant_id=$1 ORDER BY CASE pr.status WHEN 'PENDING' THEN 0 WHEN 'IN_REVIEW' THEN 1 ELSE 2 END,pr.requested_at DESC LIMIT 200`,[req.user.tenantId]);
    res.json(q.rows)
  }catch(e){next(e)}});

  r.patch('/privacy/requests/:id',auth(['ADMIN','HR']),async(req,res,next)=>{try{
    if(!isUuid(req.params.id))return res.status(400).json({error:'Solicitação inválida'});
    const status=String(req.body?.status||'').toUpperCase(),response=clean(req.body?.response,4000),decisionReason=clean(req.body?.decisionReason,2000);
    if(!REVIEW_STATUSES.includes(status))return res.status(400).json({error:'Status de revisão inválido'});
    if((status==='COMPLETED'||status==='DENIED')&&!response)return res.status(400).json({error:'Resposta ao titular é obrigatória ao concluir ou negar'});
    if(String(req.body?.response||'').length>4000||String(req.body?.decisionReason||'').length>2000)return res.status(400).json({error:'Resposta excede o limite permitido'});
    const q=await query(`UPDATE privacy_requests SET status=$3,response=coalesce($4,response),decision_reason=coalesce($5,decision_reason),reviewed_by=$6,reviewed_at=CASE WHEN $3 IN('COMPLETED','DENIED') THEN now() ELSE reviewed_at END,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING id,type,status,response,decision_reason,requested_at,updated_at,reviewed_at`,[req.user.tenantId,req.params.id,status,response||null,decisionReason||null,req.user.id]);
    if(!q.rowCount)return res.status(404).json({error:'Solicitação não encontrada'});
    await audit(req.user.tenantId,req.user.id,'PRIVACY_REQUEST_REVIEWED',q.rows[0].id,{status});
    res.json(q.rows[0])
  }catch(e){next(e)}});

  return r
}

# Arquitetura — Cactus Ponto

## Visão geral

```text
Navegador / PWA
       ↓ HTTPS
Reverse proxy / TLS
       ↓
Web React/Nginx
       ↓ /api (mesmo Host)
API Node/Express
 ├─ PostgreSQL 17  ← fonte de verdade
 ├─ Redis          ← cache efêmero + rate limit distribuído
 ├─ Resend         ← e-mails transacionais
 └─ Asaas          ← cobrança/assinatura
```

## Multi-tenant

Cada requisição autenticada é vinculada a um `tenant_id`. Quando o acesso ocorre por domínio verificado, o `Host` também resolve para um tenant e a autenticação exige correspondência com esse tenant.

Endereços suportados:

```
empresa.ponto.cactustecnologia.com.br
ponto.empresa.com.br
```

## Experiências

```
/ponto       colaborador / ponto pessoal
/admin       ADMIN / RH / gestor
/privacidade titular / solicitações LGPD
```

Usuário administrativo com `employee_id` pode alternar entre `/admin` e `/ponto` sem trocar de conta.

## PostgreSQL

Fonte oficial de:

- tenants e usuários;
- colaboradores;
- jornadas e escalas;
- marcações de ponto;
- ajustes e aprovações;
- apuração e banco de horas;
- fechamento;
- auditoria;
- solicitações de privacidade;
- estado de cobrança.

## Redis

Usado somente para:

- cache de branding;
- cache de domínio → tenant;
- dashboard agregado de curta duração;
- rate limit distribuído.

A aplicação possui fallback sem Redis. O cache não deve ser usado como armazenamento legal/trabalhista.

## Segurança

Camadas atuais:

- JWT com identidade revalidada no banco;
- RBAC;
- isolamento por tenant;
- vínculo de Host ao tenant;
- rate limit;
- CORS;
- CSP;
- anti-framing;
- headers de segurança;
- no-store em API privada;
- idempotência de marcação;
- locks de concorrência;
- auditoria;
- webhook Asaas autenticado.

## Privacidade

O produto oferece meios técnicos para o titular consultar informações, exportar os próprios dados e abrir solicitações. ADMIN/RH tratam a fila do controlador com trilha auditável.

A arquitetura técnica não substitui governança/contrato/base legal/retention policy.

## Disponibilidade

Falha do Redis não interrompe o ponto: cache cai para PostgreSQL e rate limit para memória local. Falha do PostgreSQL, por outro lado, degrada a aplicação porque é a fonte de verdade.

## Escala horizontal

Com múltiplas instâncias da API:

```
API 1 ─┐
API 2 ─┼─ Redis (rate limit/cache compartilhado)
API N ─┘
   └──── PostgreSQL
```

Sessões permanecem stateless via JWT, enquanto a identidade é revalidada no banco.

## Infraestrutura pendente para produção comercial

Ainda precisam existir no ambiente real:

- DNS wildcard;
- TLS automático;
- reverse proxy de borda;
- secrets reais;
- backup externo + restore testado;
- observabilidade;
- política de deploy/rollback;
- staging separado;
- remoção de dados demo;
- validação regulatória REP-P.

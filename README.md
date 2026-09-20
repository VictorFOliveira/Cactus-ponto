# 🌵 Cactus Ponto

Plataforma SaaS multi-tenant da Cactus Tecnologia para gestão de jornada, registro de ponto, tratamento de ocorrências, banco de horas, fechamento mensal e exportação de dados para folha/contabilidade.

## Status do projeto

O núcleo funcional passou por regressão destrutiva cobrindo autenticação, autorização, isolamento entre tenants, cadastro/importação de colaboradores, jornadas, marcações, concorrência/idempotência, virada de madrugada, ajustes, apuração, banco de horas, fechamento, histórico e exportação.

O CI mais recente também validou as rotas separadas `/ponto` e `/admin`, identidade visual por tenant, controles de privacidade/LGPD e Redis para cache/rate limit distribuído. O projeto está em **homologação / production hardening**: funcionalmente pronto para testes reais, mas ainda depende da infraestrutura de produção e da validação regulatória específica antes do primeiro cliente pagante.

## Arquitetura

Documentação detalhada: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```text
Cactus Ponto
├── web/        React + Vite + PWA, servido por Nginx
├── api/        Node.js + Express
├── db/         PostgreSQL 17
├── docs/       documentação operacional e integrações
└── docker-compose.yml
```

Fluxo principal:

```text
Web/PWA → API → Redis (cache/rate limit)
             ↘ PostgreSQL (fonte de verdade)
             ↘ Resend
             ↘ Asaas
```

## Funcionalidades atuais

- autenticação JWT com identidade revalidada no banco;
- sessões revogáveis por `auth_version` e MFA TOTP para perfis administrativos, com códigos de recuperação;
- RBAC: Administrador, RH, Gestor e Colaborador;
- isolamento multi-tenant por `tenant_id`;
- dashboard operacional;
- experiência mobile-first do colaborador;
- registro guiado de entrada, intervalo, retorno e saída;
- suporte a jornadas noturnas e jornadas sem intervalo;
- janelas/tolerâncias de marcação;
- proteção de concorrência e idempotência do ponto;
- NSR e hash SHA-256 das marcações;
- solicitação e aprovação de ajustes;
- apuração diária e fila de recálculo;
- banco de horas e ajustes manuais auditados;
- jornadas semanais, 12x36, 6x1 e personalizadas;
- exceções, afastamentos, férias e feriados;
- importação em lote de colaboradores com validação de CPF/matrícula/e-mail;
- fechamento mensal com bloqueio de pendências;
- preservação do histórico de colaboradores desligados;
- reabertura auditada de competência;
- exportação CSV para folha/contabilidade;
- configurações de empresa e políticas;
- PWA;
- Docker Compose;
- migrations versionadas;
- CI com migrations, testes da API, build Web e validação do Compose.

## Integrações

### Resend

Rotas pré-configuradas para e-mails transacionais usando `RESEND_API_KEY` e `RESEND_FROM_EMAIL`.

- `GET /api/integrations/status`
- `POST /api/integrations/email/test`

A base pode ser reutilizada para convite de usuário, recuperação de senha, avisos de cobrança e notificações administrativas.

### Asaas

A cobrança é feita por empresa/tenant, não individualmente por colaborador.

- `GET /api/billing/status`
- `POST /api/billing/customer`
- `POST /api/billing/subscription`
- `POST /api/billing/webhook/asaas`

O preço do plano fica no servidor (`CACTUS_PONTO_PLAN_PRICE`) e não é aceito do frontend. A primeira versão da assinatura suporta PIX e boleto. O webhook usa `asaas-access-token` e `ASAAS_WEBHOOK_TOKEN`.

Por padrão, pagamento confirmado/recebido ativa o tenant; cobrança vencida pode suspender o tenant (`BILLING_SUSPEND_ON_OVERDUE=true`); novo pagamento reativa automaticamente. Como a autenticação consulta `tenants.active`, a suspensão vale também para sessões já existentes nas requisições seguintes.

Detalhes: [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

## Identidade visual por tenant

O painel de **Empresa & políticas** permite configurar nome exibido, logo e três cores da empresa. A rota pessoal `/ponto` carrega essa identidade diretamente do tenant e aplica o tema somente à experiência do colaborador. No rodapé permanece a assinatura discreta **Desenvolvido por Cactus Tecnologia**.

A API expõe `GET /api/me/branding` apenas para usuários autenticados e retorna somente dados visuais públicos do próprio tenant.

Visão detalhada das experiências: [`docs/EXPERIENCE.md`](docs/EXPERIENCE.md).

## Rotas de experiência

O mesmo domínio da empresa possui experiências separadas:

- `/ponto` — área pessoal de registro de ponto. Qualquer usuário com `employee_id` vinculado pode acessar, inclusive ADMIN, RH ou gestor que também seja colaborador;
- `/admin` — área administrativa, restrita aos perfis administrativos;
- usuários administrativos vinculados a colaborador recebem o atalho **Meu ponto** e podem alternar entre as duas áreas sem trocar de conta.

A área `/ponto` usa endpoints pessoais `/api/me/*`, que sempre derivam o colaborador da sessão e nunca aceitam outro `employee_id` informado pelo navegador.

## Domínios por empresa

Sem domínio próprio, o pagamento confirmado provisiona `empresa.ponto.cactustecnologia.com.br`. Com domínio próprio, o cliente pode usar `ponto.empresa.com.br` via CNAME para `custom.ponto.cactustecnologia.com.br`, validar o DNS e torná-lo principal. O endereço Cactus permanece como fallback. O mesmo link atende ADMIN, RH, gestor e colaborador; o RBAC decide a experiência após o login.

Detalhes: [`docs/DOMAINS.md`](docs/DOMAINS.md).

## Usuários de demonstração

Ambiente local/demo:

Senha padrão: `Cactus@123`

- `admin@cactusponto.local` — Administrador
- `rh@cactusponto.local` — RH
- `gestor@cactusponto.local` — Gestor
- `colaborador@cactusponto.local` — Colaborador

Os usuários e dados demo estão persistidos no PostgreSQL para desenvolvimento. Eles **não devem permanecer no ambiente comercial de produção**.

## Executar localmente

```bash
cp .env.example .env
docker compose up --build
```

Acesso padrão:

- Web: `http://localhost:8080`
- API health: `http://localhost:3333/api/health`
- PostgreSQL: interno à rede Docker.

## Variáveis importantes

```env
POSTGRES_PASSWORD=
REDIS_URL=redis://redis:6379
REDIS_PREFIX=cactus:ponto
CACHE_TTL_BRANDING=120
CACHE_TTL_DOMAIN=120
CACHE_TTL_DASHBOARD=20

JWT_SECRET=
CORS_ORIGINS=http://localhost:8080
VITE_API_URL=/api

RESEND_API_KEY=
RESEND_FROM_EMAIL=

ASAAS_API_KEY=
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=
CACTUS_PONTO_PLAN_NAME=STANDARD
CACTUS_PONTO_PLAN_PRICE=0
BILLING_SUSPEND_ON_OVERDUE=true

CACTUS_PONTO_BASE_DOMAIN=ponto.cactustecnologia.com.br
CACTUS_PONTO_CUSTOM_CNAME=custom.ponto.cactustecnologia.com.br
CACTUS_PONTO_PUBLIC_SCHEME=https
```

Nunca versione chaves reais.

## Redis, cache e rate limit distribuído

O Redis é uma camada **opcional de aceleração**, nunca a fonte de verdade. PostgreSQL continua sendo o registro oficial de marcações, jornadas, banco de horas, fechamentos, auditoria e dados pessoais.

Uso atual:

- resolução `Host/domínio → tenant` (TTL padrão 120 s, com cache negativo curto);
- identidade visual do tenant em `/ponto` (TTL padrão 120 s);
- dashboard administrativo (TTL padrão 20 s);
- rate limits compartilhados entre múltiplas instâncias da API.

Alterações de branding e domínio invalidam as chaves correspondentes. Marcações, criação de colaborador e revisão de ajuste invalidam o dashboard. Se o Redis estiver indisponível, a aplicação continua funcionando: cache volta ao PostgreSQL e rate limit usa memória local temporariamente.

Detalhes: [`docs/CACHE.md`](docs/CACHE.md).

## Privacidade e LGPD

O produto possui uma camada técnica de privacidade por design:

- respostas da API privadas com `Cache-Control: no-store`;
- headers de segurança e CORS efetivamente aplicados à API;
- CSP, anti-framing e `noindex` no Web/PWA;
- endpoint autenticado `GET /api/me/privacy` com informações do controlador;
- exportação estruturada dos dados do próprio titular em `GET /api/me/privacy/export`;
- fluxo de solicitações do titular (acesso, correção, anonimização, eliminação, portabilidade, informação sobre compartilhamento, oposição e outros pedidos);
- fila administrativa auditada para tratamento pelo controlador;
- isolamento das solicitações por `tenant_id`;
- tela **Privacidade e meus dados** para o usuário;
- configurações de canal de privacidade, encarregado/responsável, política e aviso de retenção;
- endpoint genérico de configurações não expõe nem permite sobrescrever o objeto de cobrança;
- pedidos de exclusão/anonimização não apagam automaticamente registros trabalhistas: exigem análise do controlador e da obrigação de retenção aplicável.

Esses controles **não equivalem a certificação de conformidade jurídica**. Papéis de controlador/operador, bases legais, prazos de retenção, contratos, RIPD quando aplicável e procedimentos internos precisam refletir a operação real de cada cliente.

Documentação: [`docs/PRIVACY.md`](docs/PRIVACY.md).

## Segurança

Em produção:

- use `JWT_SECRET` aleatório com pelo menos 32 caracteres;
- use senha exclusiva do PostgreSQL;
- configure `CORS_ORIGINS` apenas com os domínios autorizados;
- mantenha as chaves do Resend e Asaas somente em secrets/variáveis do servidor;
- use HTTPS;
- coloque Web/API atrás de reverse proxy;
- não exponha PostgreSQL publicamente.

A API já aplica headers de segurança, CORS por allowlist, rate limits, validações de entrada, isolamento por tenant, locks de concorrência e auditoria de operações sensíveis.

## Regressão destrutiva

A regressão completa está documentada em [`docs/REGRESSION.md`](docs/REGRESSION.md). Além do CI normal, o projeto mantém uma suíte destrutiva isolada para validar bootstrap limpo, autenticação/RBAC, isolamento multi-tenant, Redis/fallback, privacidade, domínio, jornada e integridade do schema. A execução observada após a inclusão dessa suíte (CI #210) passou nos jobs `validate` e `destructive-regression`.

## CI

O workflow `Cactus Ponto CI` roda em pushes e pull requests para `main` e valida:

1. PostgreSQL de teste;
2. schema inicial;
3. migrations de produção;
4. testes da API;
5. build da aplicação Web;
6. `docker compose config`.

O CI atual valida o código, mas **não realiza deploy automático**.

## Antes da produção comercial

Ainda é necessário fechar a camada operacional de produção: domínio, HTTPS, reverse proxy, secrets reais, backup externo com restore testado, monitoramento, ambiente de homologação, remoção dos dados demo e política de deploy/rollback.

Checklist completo: [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

## Conformidade REP-P

O sistema não deve ser anunciado como oficialmente conforme/homologado como REP-P apenas com base na conclusão técnica da aplicação. A trilha regulatória e os formatos/documentos exigidos precisam ser validados separadamente antes de qualquer alegação comercial de conformidade.

## Próximos passos

O foco agora não é adicionar mais módulos de ponto. A sequência recomendada é:

1. homologar Resend e Asaas em Sandbox;
2. criar tela pública de planos/checkout e onboarding de empresa;
3. executar o production hardening;
4. homologar com usuários reais;
5. validar a trilha regulatória;
6. liberar o primeiro cliente piloto.

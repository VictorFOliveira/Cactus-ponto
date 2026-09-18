# Regressão completa — Cactus Ponto

## Objetivo

A regressão destrutiva existe para tentar encontrar inconsistências antes de produção. O objetivo não é apenas “ficar verde”, mas forçar condições adversas e corrigir qualquer quebra observada.

## Camadas cobertas

### Banco e migrations

- execução de `db/init.sql` com `ON_ERROR_STOP=1`;
- migrations versionadas;
- constraints multi-tenant;
- unicidade de identidade;
- FKs compostas;
- schema de privacidade;
- proteção de corrida de marcação.

### Autenticação e autorização

- endpoint protegido sem token;
- token de usuário inexistente;
- tentativa de escalada de role;
- autorização por ADMIN/RH/Gestor/Colaborador;
- rotas pessoais derivando `employee_id` da sessão.

### Multi-tenant

- consultas filtradas por tenant;
- domínios vinculados a tenant;
- isolamento de solicitações LGPD;
- proteção contra IDs de outro tenant.

### Jornada

- jornadas comuns;
- sem intervalo;
- noturnas;
- virada de meia-noite;
- tolerâncias;
- marcação incompleta;
- idempotência;
- concorrência;
- ajustes.

### Fechamento

- histórico;
- colaboradores desligados;
- competência;
- reabertura/locks;
- consistência das exportações.

### Privacidade

- exportação self-service;
- ausência de `password_hash`;
- solicitações do titular;
- fila de ADMIN/RH;
- isolamento por tenant;
- configurações sem vazamento de billing;
- headers no-store.

### Redis

- cache set/get/delete;
- contador atômico;
- health;
- wiring no Compose;
- ausência de cache para dados pessoais sensíveis;
- fallback sem Redis.

### Web

- build Vite;
- rotas `/ponto`, `/admin`, `/privacidade`;
- CSP/anti-framing;
- branding por tenant.

### Infraestrutura

- `docker compose config`;
- Redis interno sem porta publicada;
- PostgreSQL em serviço isolado.

## Critério de sucesso

O pipeline só é considerado aprovado quando:

1. banco inicializa sem erro;
2. migrations passam;
3. suíte de API passa;
4. regressão destrutiva passa;
5. build Web passa;
6. Compose valida.

Quando um teste destrutivo revela uma falha, a correção deve ganhar teste de regressão antes do próximo verde.

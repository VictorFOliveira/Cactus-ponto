# 🌵 Cactus Ponto

Plataforma SaaS de gestão de jornada e registro de ponto da Cactus Tecnologia.

## Arquitetura oficial

O projeto agora possui uma única arquitetura canônica:

```text
Cactus Ponto
├── web/        React + Vite + PWA, servido por Nginx
├── api/        Node.js + Express, autenticação e regras de negócio
├── db/         PostgreSQL e schema inicial
└── docker-compose.yml
```

Fluxo: `Web/PWA -> API -> PostgreSQL`.

A aplicação legada que existia em `src/`, `public/` e no `package.json` da raiz foi removida para evitar dois backends/frontends concorrentes.

## Experiência atual

- Login com JWT
- RBAC: Administrador, Gestor e Colaborador
- Dashboard operacional exclusivo para gestão
- Experiência mobile-first exclusiva do colaborador
- Relógio em tempo real e registro de ponto pela API
- Registro com NSR e hash SHA-256
- Manifest PWA
- PostgreSQL 17
- Docker Compose
- CI com testes da API e build Web

### Usuários de demonstração

Senha para todos: `Cactus@123`

- `admin@cactusponto.local` — Administrador
- `gestor@cactusponto.local` — Gestor
- `colaborador@cactusponto.local` — Colaborador

## Executar a stack completa

```bash
cp .env.example .env
docker compose up --build
```

Web: `http://localhost:8080`
API: `http://localhost:3333/api/health`
PostgreSQL: interno à rede Docker.

## Segurança

Troque `JWT_SECRET` e `POSTGRES_PASSWORD` em produção. Os usuários demo ainda ficam em memória nesta etapa e serão migrados para PostgreSQL na próxima fase.

## Próxima etapa

Persistir empresas, usuários, colaboradores, jornadas e marcações no PostgreSQL com isolamento por `tenant_id`. Depois: ajustes/aprovações, espelho e relatórios. A trilha regulatória REP-P será implementada e validada separadamente antes de qualquer declaração de conformidade legal.

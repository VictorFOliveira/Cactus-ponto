# 🌵 Cactus Ponto

Plataforma SaaS de gestão de jornada e registro de ponto da Cactus Tecnologia.

## Experiência atual

- Login com JWT
- RBAC: Administrador, Gestor e Colaborador
- Dashboard operacional exclusivo para gestão
- Experiência mobile-first exclusiva do colaborador
- Relógio em tempo real e registro de ponto pela API
- Registro com NSR e hash SHA-256
- Histórico de marcações
- Banco de horas e jornada no painel
- Manifest PWA para evolução como app instalável
- Docker/PostgreSQL e CI
- Testes automatizados de autenticação, autorização e marcação

### Usuários de demonstração

Senha para todos: `Cactus@123`

- `admin@cactusponto.local` — Administrador
- `gestor@cactusponto.local` — Gestor
- `colaborador@cactusponto.local` — Colaborador

## Executar

```bash
cp .env.example .env
docker compose up --build
```

Web: `http://localhost:5173`
API: `http://localhost:3333/api/health`

## Segurança

`JWT_SECRET` deve ser substituído por segredo forte em produção. Os usuários demo ficam em memória somente para a fase atual de desenvolvimento.

## Próxima etapa

Persistir usuários, empresas, colaboradores, jornadas e marcações no PostgreSQL; criar onboarding multiempresa; ajustes/aprovações; espelho e relatórios. A trilha regulatória REP-P deve ser implementada e validada separadamente antes de qualquer declaração de conformidade legal.

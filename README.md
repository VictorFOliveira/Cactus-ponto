# 🌵 Cactus Ponto

Plataforma SaaS de gestão de jornada e registro de ponto da Cactus Tecnologia.

## Experiência atual

- Login com JWT
- Perfis Administrador, Gestor e Colaborador
- Dashboard operacional para gestores
- Experiência mobile-first exclusiva do colaborador
- Registro de ponto via API com NSR e hash SHA-256
- Histórico de marcações
- Banco de horas e jornada no painel
- Manifest PWA para evolução como app instalável
- Docker/PostgreSQL e CI

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

## Próximas etapas de produto

Persistir usuários/sessões/marcações no PostgreSQL, cadastro completo de empresas e colaboradores, escalas, solicitações de ajuste, aprovação, espelho e relatórios. A trilha regulatória REP-P deve ser implementada e validada separadamente antes de qualquer declaração de conformidade legal.

# 🌵 Cactus Ponto

Plataforma web de gestão de jornada da Cactus Tecnologia.

## O que já funciona
- Dashboard responsivo premium
- Relógio em tempo real
- Visão de presença, atrasos, ausências e banco de horas
- Lista de colaboradores e status de jornada
- Fluxo de registro de ponto com NSR e hash SHA-256
- API REST Express
- PostgreSQL com estrutura de tenants, colaboradores e marcações
- Modo demonstração sem banco
- Docker Compose para subir app + banco com um comando
- CI no GitHub Actions

## Rodar
```bash
docker compose up --build
```
Acesse `http://localhost:3000`.

Sem Docker:
```bash
npm install
npm run dev
```
Sem `DATABASE_URL`, a API entra automaticamente em modo demonstração.

## API
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/employees`
- `POST /api/employees`
- `POST /api/punches`

## Arquitetura alvo
O projeto nasce preparado para multiempresa (tenant), RBAC, auditoria imutável, escalas, banco de horas, justificativas, aprovações, relatórios, coletores web/mobile e integrações.

## Conformidade brasileira
O produto ainda é um MVP técnico e **não deve ser anunciado como REP-P homologado/conforme** nesta fase. Antes do uso como registrador eletrônico oficial, serão implementados e validados integralmente os requisitos vigentes da Portaria MTP nº 671/2021 e alterações, incluindo ARP, NSR, AFD/AEJ, comprovantes, assinatura eletrônica, sincronismo de horário, atestado técnico e registro de software no INPI quando aplicável.

## Próximas etapas
1. autenticação + RBAC e isolamento multi-tenant;
2. motor de jornadas/escalas e banco de horas;
3. solicitações e aprovações;
4. espelho de ponto e relatórios;
5. trilha de auditoria/ARP append-only;
6. requisitos REP-P e geração dos arquivos oficiais;
7. PWA/coletor mobile e modo offline seguro;
8. observabilidade, backup e hardening de produção.

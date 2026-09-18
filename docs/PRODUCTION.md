# Production Hardening — Cactus Ponto

Estado atual: o núcleo funcional passou pela regressão destrutiva e o CI valida migrations, testes da API, build Web e Docker Compose. Isso significa que o código está pronto para **homologação real**, mas a entrada em produção comercial ainda depende da infraestrutura abaixo.

## Obrigatório antes do primeiro cliente pagante

- domínio/subdomínio oficial;
- HTTPS/TLS na borda;
- reverse proxy (Nginx, Traefik ou equivalente);
- `JWT_SECRET` aleatório com pelo menos 32 caracteres;
- senha forte e exclusiva do PostgreSQL;
- Redis interno/não exposto publicamente para cache e rate limit distribuído;
- `CORS_ORIGINS` limitado aos domínios oficiais;
- chave de produção do Asaas armazenada como secret;
- webhook Asaas com `authToken` exclusivo;
- domínio de envio validado no Resend;
- remoção ou separação dos dados/usuários de demonstração;
- backup externo automático do PostgreSQL;
- teste documentado de restauração;
- monitoramento de uptime, erros e uso de disco;
- política de atualização e rollback;
- ambiente de homologação separado de produção.

## CI atual

O GitHub Actions executa, a cada push/PR no `main`:

1. PostgreSQL 17 de teste;
2. inicialização do schema;
3. validação das migrations versionadas;
4. testes da API;
5. instalação e build do Web;
6. validação do `docker compose config`.

O CI atual **não faz deploy automático**.

## Deploy recomendado

```text
Internet
   ↓
HTTPS / Reverse Proxy
   ↓
Web React/PWA ─────→ API Node/Express
                         ↓
                    PostgreSQL
                         ↘ Redis (cache/rate limit, rede interna)
```

O PostgreSQL não deve ser exposto publicamente. A API também pode ficar acessível apenas pelo proxy, sem publicar a porta `3333` diretamente na Internet.

## Backups

Recomendação inicial:

- dump diário do PostgreSQL;
- retenção de pelo menos 7 backups diários + 4 semanais;
- cópia fora do VPS;
- criptografia em repouso;
- teste de restauração periódico.

Backup sem teste de restauração não deve ser considerado proteção suficiente.

## Segurança já presente no código

- JWT com identidade revalidada no banco;
- RBAC por função;
- isolamento por `tenant_id`;
- CORS por allowlist;
- headers de segurança;
- rate limit de API, login, usuário e registro de ponto;
- idempotência e proteção de concorrência de marcações;
- validação de UUIDs e datas em rotas críticas;
- auditoria de operações sensíveis;
- fechamento de competência com locks e proteção contra corrida;
- webhook Asaas autenticado por token próprio;
- API com `no-store`, anti-indexação e headers de segurança;
- CSP e anti-framing no frontend;
- fluxo de direitos do titular e exportação self-service;
- auditoria de solicitações de privacidade.

## Resposta a incidentes e LGPD

Além dos controles técnicos, produção precisa de processo operacional. O controlador deve manter responsáveis, canal de privacidade, inventário de tratamento, política de retenção e plano de resposta a incidentes.

Pelo Regulamento de Comunicação de Incidente de Segurança da ANPD (Resolução CD/ANPD nº 15/2024), quando o incidente puder acarretar risco ou dano relevante aos titulares, a comunicação pelo controlador à ANPD e aos titulares deve observar o prazo regulamentar de **3 dias úteis**, ressalvada legislação específica.

O Cactus Ponto registra auditoria e reduz exposição por cache/CORS/CSP, mas a decisão sobre notificação, investigação, preservação de evidências e comunicação é um processo organizacional do controlador.

Consulte [`PRIVACY.md`](PRIVACY.md).

## Homologação real

Antes de liberar comercialmente, rode a aplicação alguns dias em ambiente real com:

- administrador;
- RH;
- gestor;
- colaborador;
- celular e desktop;
- jornadas comuns e noturnas;
- ajustes e aprovações;
- banco de horas;
- fechamento mensal;
- exportação CSV;
- pagamento, vencimento, suspensão e reativação da assinatura;
- identidade visual do tenant em `/ponto` (nome, logo e cores);
- alternância segura entre `/admin` e `/ponto` para usuários administrativos que também batem ponto.

## REP-P / conformidade legal

O Cactus Ponto ainda não deve ser divulgado como produto oficialmente conforme/homologado como REP-P apenas porque o software funciona tecnicamente. A trilha regulatória, documentos, formatos oficiais, assinatura e demais requisitos legais precisam ser validados separadamente antes de qualquer alegação comercial de conformidade.

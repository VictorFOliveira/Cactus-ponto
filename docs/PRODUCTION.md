# Production Hardening — Cactus Ponto

Estado atual: o núcleo funcional passou pela regressão destrutiva e o CI valida migrations, testes da API, build Web e Docker Compose. Isso significa que o código está pronto para **homologação real**, mas a entrada em produção comercial ainda depende da infraestrutura abaixo.

## Obrigatório antes do primeiro cliente pagante

- domínio/subdomínio oficial;
- HTTPS/TLS na borda;
- reverse proxy (Nginx, Traefik ou equivalente);
- `JWT_SECRET` aleatório com pelo menos 32 caracteres;
- senha forte e exclusiva do PostgreSQL;
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
- webhook Asaas autenticado por token próprio.

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
- pagamento, vencimento, suspensão e reativação da assinatura.

## REP-P / conformidade legal

O Cactus Ponto ainda não deve ser divulgado como produto oficialmente conforme/homologado como REP-P apenas porque o software funciona tecnicamente. A trilha regulatória, documentos, formatos oficiais, assinatura e demais requisitos legais precisam ser validados separadamente antes de qualquer alegação comercial de conformidade.

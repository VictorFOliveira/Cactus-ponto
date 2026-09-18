# Redis, cache e rate limit — Cactus Ponto

## Princípio

Redis é uma otimização descartável. **PostgreSQL é a fonte de verdade.** Nenhuma marcação de ponto, fechamento, ajuste aprovado, banco de horas ou trilha de auditoria depende exclusivamente do Redis.

## O que é cacheado

| Chave lógica | TTL padrão | Conteúdo |
| --- | ---: | --- |
| `domain:<host>` | 120 s | resolução de domínio verificado para tenant |
| `branding:<tenantId>` | 120 s | nome, logo e cores do tenant |
| `dashboard:<tenantId>` | 20 s | indicadores agregados do painel |

Domínios inexistentes recebem cache negativo por no máximo 30 segundos.

Não entram no cache de aplicação:

- senha/hash;
- exportação LGPD;
- solicitações de privacidade;
- lista pessoal de marcações;
- dados de fechamento;
- banco de horas detalhado;
- auditoria.

## Invalidação

A aplicação remove chaves quando:

- branding/configurações da empresa são alterados;
- domínio é criado, verificado ou removido;
- colaborador é criado;
- ponto é registrado;
- ajuste é revisado.

O dashboard também usa TTL curto para limitar eventual defasagem em operações não cobertas por invalidação explícita.

## Rate limit distribuído

Com `REDIS_URL` configurada, os limites de API/login/usuário/ponto usam contador atômico no Redis. Isso faz com que duas ou mais réplicas da API compartilhem o mesmo limite.

Sem Redis, o middleware cai automaticamente para contador em memória por processo. Esse fallback mantém disponibilidade, mas em múltiplas réplicas o limite deixa de ser global.

## Falha do Redis

A aplicação adota fail-open para **cache e rate limit**:

```
Redis disponível  -> cache + contador distribuído
Redis indisponível -> PostgreSQL + contador local em memória
```

A indisponibilidade do Redis não pode impedir marcação de ponto nem acesso aos dados oficiais.

O endpoint `GET /api/health` informa o estado da camada de cache, mas Redis degradado não torna o banco indisponível.

## Docker Compose

O serviço Redis não publica porta para a Internet. Ele fica somente na rede Docker:

```env
REDIS_URL=redis://redis:6379
REDIS_PREFIX=cactus:ponto
CACHE_TTL_BRANDING=120
CACHE_TTL_DOMAIN=120
CACHE_TTL_DASHBOARD=20
```

A configuração é deliberadamente efêmera (`appendonly no`), pois o conteúdo pode ser reconstruído do PostgreSQL.

## Produção

- não exponha a porta 6379 publicamente;
- em Redis gerenciado, use TLS/autenticação fornecidos pelo provedor;
- use prefixo diferente por ambiente;
- monitore memória, eviction, latência e taxa de erro;
- não aumente TTL de dados operacionais sem revisar a estratégia de invalidação;
- não use Redis como mecanismo de retenção ou arquivo legal.

# Domínios por empresa — Cactus Ponto

Cada empresa usa um único endereço para todos os perfis. O domínio identifica o tenant e o RBAC decide se o usuário administra a empresa ou usa a experiência de colaborador para bater ponto.

## Sem domínio próprio

Após o primeiro pagamento confirmado/recebido, a API provisiona automaticamente:

```
empresa.ponto.cactustecnologia.com.br
```

Na infraestrutura da Cactus configure um wildcard:

```
*.ponto.cactustecnologia.com.br -> gateway/reverse proxy
```

## Com domínio próprio

O cliente pode cadastrar, por exemplo:

```
ponto.empresa.com.br
```

Ele cria:

```
ponto.empresa.com.br CNAME custom.ponto.cactustecnologia.com.br
```

Depois o ADMIN usa **Verificar DNS**. A API consulta o CNAME e só ativa o domínio quando o destino corresponde a `CACTUS_PONTO_CUSTOM_CNAME`. O endereço Cactus continua disponível como fallback e qualquer domínio verificado pode ser marcado como principal.

### Rotas de experiência

No mesmo domínio da empresa:

- `/ponto` — experiência pessoal do colaborador;
- `/admin` — experiência administrativa;
- ADMIN/RH/Gestor com `employee_id` podem alternar para **Meu ponto** sem trocar de conta.

O domínio identifica o tenant; o perfil e o vínculo do usuário definem a rota e as permissões.

## Rotas

- `GET /api/tenant/domains`
- `POST /api/tenant/domains/default`
- `POST /api/tenant/domains/custom`
- `POST /api/tenant/domains/:id/verify`
- `PUT /api/tenant/domains/:id/primary`
- `DELETE /api/tenant/domains/:id`

## Isolamento

Quando o Host corresponde a um domínio verificado, login e sessão ficam vinculados ao mesmo `tenant_id`. Assim, um usuário de outra empresa não autentica pelo endereço daquele tenant.

O Web usa `/api` no mesmo host. O Nginx interno preserva o header `Host` ao encaminhar para a API.

## Produção

Variáveis:

```env
CACTUS_PONTO_BASE_DOMAIN=ponto.cactustecnologia.com.br
CACTUS_PONTO_CUSTOM_CNAME=custom.ponto.cactustecnologia.com.br
CACTUS_PONTO_PUBLIC_SCHEME=https
```

O gateway de borda ainda precisa emitir/renovar TLS para wildcard e domínios próprios verificados. Para domínio próprio, só permita provisionamento de certificado após a verificação DNS.

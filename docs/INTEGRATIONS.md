# Integrações — Cactus Ponto

Este documento descreve as integrações externas pré-configuradas da aplicação. Nenhuma chave real deve ser versionada no GitHub.

## 1. Resend — e-mails transacionais

O backend usa a API HTTP do Resend sem expor a chave ao frontend.

Variáveis:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=Cactus Ponto <no-reply@seu-dominio.com.br>
```

Antes de produção, o domínio/remetente precisa estar verificado no Resend.

Rotas administrativas:

- `GET /api/integrations/status` — informa se Resend e Asaas estão configurados, sem devolver segredos.
- `POST /api/integrations/email/test` — envia um e-mail transacional de teste para o administrador ou para o endereço informado em `to`.

A camada `api/src/integrations.js` centraliza o envio e suporta chave de idempotência para reduzir e-mails duplicados em retries.

### E-mails previstos

A base está pronta para ser reutilizada em:

- convite/criação de acesso;
- recuperação de senha;
- confirmação de assinatura;
- confirmação de pagamento;
- aviso de cobrança vencida/suspensão;
- alertas administrativos.

Os fluxos de convite e recuperação de senha ainda devem ganhar tokens próprios de uso único antes de serem expostos em produção.

## 2. Asaas — cobrança recorrente do SaaS

O pagamento é feito pela **empresa/tenant**, não por cada colaborador. Uma empresa paga uma assinatura do Cactus Ponto e os usuários vinculados àquele tenant utilizam a aplicação conforme seus perfis.

Variáveis:

```env
ASAAS_API_KEY=
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=troque-por-token-webhook-com-32-caracteres-ou-mais
CACTUS_PONTO_PLAN_NAME=STANDARD
CACTUS_PONTO_PLAN_PRICE=0
BILLING_SUSPEND_ON_OVERDUE=true
```

O preço é definido **somente no servidor**. O frontend não escolhe o valor da assinatura.

### Rotas

- `GET /api/billing/status` — retorna o estado de cobrança do tenant atual.
- `POST /api/billing/customer` — cria o cliente pagador no Asaas e grava o `customerId` na configuração do tenant.
- `POST /api/billing/subscription` — cria assinatura mensal no Asaas. Nesta primeira integração, o backend aceita `PIX` ou `BOLETO`.
- `POST /api/billing/webhook/asaas` — recebe os eventos do Asaas e valida o header `asaas-access-token` usando `ASAAS_WEBHOOK_TOKEN`.

### Fluxo de acesso

```text
Empresa criada
   ↓
Administrador configura dados de cobrança
   ↓
Cactus Ponto cria/associa cliente no Asaas
   ↓
Cactus Ponto cria assinatura mensal
   ↓
Asaas gera a cobrança
   ↓
Pagamento confirmado/recebido
   ↓ webhook
billing.status = ACTIVE
 tenants.active = true
   ↓
Usuários do tenant acessam normalmente
```

Quando `BILLING_SUSPEND_ON_OVERDUE=true`, um evento `PAYMENT_OVERDUE` marca a assinatura como `PAST_DUE` e desativa o tenant. Como a autenticação consulta o tenant ativo no banco a cada requisição protegida, os acessos ficam bloqueados. Um novo `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED` reativa o tenant automaticamente.

Eventos como estorno, exclusão da cobrança ou chargeback movem a assinatura para `SUSPENDED` e desativam o tenant.

O webhook grava o identificador do evento em `audit_logs` e ignora reentregas já processadas, evitando aplicar a mesma mudança duas vezes.

## 3. Sandbox antes de produção

Use sempre o Sandbox do Asaas durante homologação:

```env
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
```

Somente após validar criação de cliente, criação da assinatura, geração de cobrança, webhook, suspensão e reativação deve-se trocar para a URL e a chave de produção.

## 4. Cartão de crédito

A primeira versão das rotas de assinatura aceita PIX e boleto. Quando cartão for habilitado, a recomendação do projeto é usar um fluxo hospedado/tokenizado do provedor, evitando que o Cactus Ponto armazene ou processe dados crus do cartão.

## 5. O que ainda falta na experiência comercial

A infraestrutura de backend está pré-configurada, mas a experiência comercial completa ainda precisa de:

- tela pública de planos/checkout;
- onboarding de nova empresa;
- criação do primeiro administrador;
- página de cobrança dentro do painel;
- recuperação de senha por token de uso único;
- política de período de teste/carência, se for adotada;
- templates finais de e-mail com domínio oficial da Cactus Tecnologia.

## 6. Privacidade de fornecedores

Resend e Asaas são integrações externas e podem participar da cadeia de tratamento conforme a configuração usada pelo cliente. Antes da produção, contratos, localização do tratamento, subprocessadores e eventual transferência internacional devem ser avaliados conforme o arranjo real entre Cactus Tecnologia, cliente e fornecedor.

A Resolução CD/ANPD nº 19/2024 regulamenta transferência internacional de dados e cláusulas-padrão contratuais. Não presuma conformidade apenas por utilizar um fornecedor conhecido: documente finalidade, dados enviados e salvaguardas aplicáveis.

## 7. Cache e integrações externas

Resend e Asaas não usam Redis como fila durável nem como registro oficial. O webhook Asaas continua persistindo estado de cobrança e auditoria no PostgreSQL. Falha do Redis não pode causar perda de evento de cobrança; qualquer uso futuro de fila deve possuir persistência/retry apropriado e idempotência.

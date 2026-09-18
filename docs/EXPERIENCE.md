# Experiências do usuário — Cactus Ponto

O Cactus Ponto separa a experiência de **registro pessoal de ponto** da experiência de **administração da jornada**, mantendo o mesmo domínio da empresa e a mesma conta.

## 1. Portal do colaborador — `/ponto`

Exemplo:

```
https://empresa.ponto.cactustecnologia.com.br/ponto
```

A página é focada exclusivamente no próprio colaborador. Ela apresenta:

- nome da empresa;
- logo da empresa, quando configurada;
- cor principal, cor secundária e cor de destaque do tenant;
- nome do colaborador;
- jornada prevista;
- horário atual;
- próximo registro esperado;
- entrada, intervalo, retorno e saída;
- ajustes pessoais pendentes;
- solicitação de correção de marcação;
- assinatura discreta **Desenvolvido por Cactus Tecnologia**.

A identidade é carregada por:

```
GET /api/me/branding
```

As operações pessoais usam endpoints `/api/me/*`. O backend sempre deriva o `employee_id` da sessão autenticada; o navegador não escolhe outro colaborador para registrar ponto.

Principais endpoints:

```
GET  /api/me/branding
GET  /api/me/punch-window
GET  /api/me/punches
POST /api/me/punches
GET  /api/me/adjustments
POST /api/me/adjustments
```

## 2. Painel administrativo — `/admin`

Exemplo:

```
https://empresa.ponto.cactustecnologia.com.br/admin
```

É a central de trabalho de ADMIN, RH e gestores autorizados. Conforme o RBAC, reúne:

- colaboradores;
- jornadas, escalas e exceções;
- solicitações e aprovações;
- apuração;
- banco de horas;
- fechamento mensal;
- exportação;
- relatórios;
- importação;
- configurações da empresa;
- identidade visual;
- domínio da empresa;
- cobrança e integrações quando aplicável.

## 3. RH/Admin também pode bater ponto

Função administrativa e vínculo como colaborador são conceitos diferentes.

Se um usuário ADMIN, RH ou Gestor possuir `employee_id` vinculado, o painel exibe **Meu ponto**. Esse atalho abre `/ponto` usando a mesma sessão.

Assim:

```
RH trabalhando no sistema  -> /admin
RH registrando o próprio ponto -> /ponto
```

Ele não precisa sair da conta nem usar um segundo usuário.

Usuários administrativos sem `employee_id` não possuem acesso funcional a **Meu ponto**.

## 4. Identidade visual por tenant

Em **Empresa & políticas**, a empresa pode definir:

- nome exibido;
- URL da logo;
- cor principal;
- cor secundária;
- cor de destaque.

Esses valores ficam em `tenants.settings.branding` e são consumidos pelo portal do colaborador.

Valores padrão:

```
primaryColor   #07182f
secondaryColor #102947
accentColor    #168ee7
```

Se não houver logo, a interface usa uma marca textual baseada no nome da empresa.

## 5. Domínio e imersão

O endereço também reforça a identidade do cliente:

```
empresa.ponto.cactustecnologia.com.br
```

ou, quando configurado e verificado:

```
ponto.empresa.com.br
```

O mesmo domínio atende todas as funções. A aplicação identifica o tenant pelo Host, autentica o usuário dentro daquele tenant e então direciona a experiência pelo perfil.

## 6. Exemplo comercial

O site institucional da Cactus Tecnologia possui uma demonstração visual das duas áreas:

- portal do colaborador com branding da empresa;
- central administrativa do RH/ADMIN.

A demonstração é ilustrativa, mas acompanha a arquitetura e o fluxo atuais do produto.

## 7. Privacidade e dados do próprio usuário

Qualquer usuário autenticado pode abrir `/privacidade`. A tela permite consultar o controlador/canal de contato, baixar uma cópia estruturada dos dados do próprio usuário e registrar solicitações de titular.

Rotas pessoais:

```
GET  /api/me/privacy
GET  /api/me/privacy/export
GET  /api/me/privacy/requests
POST /api/me/privacy/requests
```

ADMIN/RH tratam solicitações pela fila administrativa:

```
GET   /api/privacy/requests
PATCH /api/privacy/requests/:id
```

Nenhuma dessas rotas permite escolher outro `tenant_id`. A identidade é derivada da sessão autenticada.

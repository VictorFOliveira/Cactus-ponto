# Privacidade e LGPD — Cactus Ponto

> Documento técnico-operacional. Não substitui análise jurídica do caso concreto.

## Objetivo

O Cactus Ponto trata dados pessoais ligados à relação de trabalho e à gestão de jornada. A proteção deve existir desde a concepção do produto até sua operação. A LGPD exige medidas técnicas e administrativas adequadas para proteger dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas.

Referências oficiais consultadas:

- ANPD — Titular de Dados: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados
- ANPD — Perguntas Frequentes / Direitos dos titulares: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes
- ANPD — Guia de Segurança da Informação: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte
- ANPD — Comunicação de Incidente de Segurança: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
- ANPD — Regulamento de Transferência Internacional (Res. 19/2024): https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024

A agenda regulatória 2025–2026 da ANPD ainda indicava, em 2026, regulamentação de direitos dos titulares em andamento. Portanto, este projeto evita fixar em código interpretações jurídicas que dependam de norma futura ou do contexto do controlador.

## Papéis

Em um cenário SaaS típico, a empresa empregadora tende a decidir finalidades e meios essenciais do tratamento de dados de seus trabalhadores e, portanto, pode atuar como controladora. A Cactus Tecnologia pode atuar como operadora quando tratar dados em nome do cliente.

Essa classificação **não deve ser presumida apenas pelo desenho técnico**. O contrato e a realidade da operação devem refletir quem efetivamente toma as decisões sobre o tratamento.

## Dados tratados

O produto pode armazenar:

- nome, CPF, e-mail, matrícula, setor e cargo;
- datas de admissão e desligamento;
- salário-base e parâmetros usados na prévia, quando configurados;
- credencial de acesso (senha somente como hash);
- perfil de autorização;
- jornadas, escalas, exceções, férias e afastamentos;
- marcações de ponto, NSR, horários e coletor;
- solicitações e revisões de ajuste;
- apuração diária e banco de horas;
- logs de auditoria;
- metadados de domínio e cobrança do tenant.

Evite adicionar dados sem finalidade clara.

## Controles implementados

### Isolamento

- todas as operações relevantes carregam `tenant_id`;
- FKs compostas impedem referências cruzadas entre tenants;
- domínio verificado também vincula a requisição ao tenant;
- identidade do JWT é revalidada no banco.

### Segurança da aplicação

- senha com bcrypt;
- JWT com expiração;
- CORS aplicado efetivamente na API;
- headers de segurança;
- `Cache-Control: no-store` e `Pragma: no-cache` em respostas da API;
- CSP no frontend;
- bloqueio de embedding (`frame-ancestors 'none'` / `X-Frame-Options: DENY`);
- `X-Robots-Tag: noindex, nofollow`;
- rate limits;
- validação de entradas;
- locks, idempotência e proteção de concorrência;
- erros internos sem detalhes ao cliente.

### Minimização de acesso

- colaborador usa endpoints `/api/me/*`;
- marcação pessoal deriva `employee_id` da sessão;
- o endpoint genérico de configurações remove `billing` da resposta;
- o endpoint genérico de configurações usa allowlist e não pode sobrescrever cobrança;
- exportação de dados não inclui `password_hash`;
- descrições de pedidos de privacidade não são copiadas para o log de auditoria.

## Direitos do titular

A aplicação oferece meios técnicos para:

- confirmar/consultar as informações sobre tratamento;
- obter uma cópia estruturada dos dados tratados no Cactus Ponto;
- pedir correção;
- pedir informação sobre compartilhamento;
- pedir anonimização, bloqueio ou eliminação quando aplicável;
- registrar oposição;
- registrar pedido de portabilidade conforme regulamentação aplicável.

Rotas:

```
GET  /api/me/privacy
GET  /api/me/privacy/export
GET  /api/me/privacy/requests
POST /api/me/privacy/requests
```

Tipos:

```
ACCESS
CORRECTION
ANONYMIZATION
DELETION
PORTABILITY
SHARING_INFO
OPPOSITION
OTHER
```

A ANPD destaca que direitos não são absolutos. Por exemplo, um pedido de eliminação pode não ser executável se houver obrigação legal de retenção. Por isso o sistema **não apaga automaticamente registros de jornada** ao receber um pedido.

## Fila do controlador

ADMIN/RH:

```
GET   /api/privacy/requests
PATCH /api/privacy/requests/:id
```

Estados:

```
PENDING
IN_REVIEW
COMPLETED
DENIED
CANCELLED
```

Conclusão ou negativa exige resposta ao titular. Alterações são auditadas.

## Configuração do canal

Em **Empresa & políticas → Privacidade & LGPD**:

- e-mail de privacidade;
- encarregado/responsável;
- URL da política;
- aviso de retenção.

Esses dados aparecem ao próprio usuário na página `/privacidade`.

## Retenção

Não existe um único prazo universal que possa ser codificado para todos os dados de todos os clientes.

O controlador deve documentar:

1. finalidade;
2. base legal aplicável;
3. origem do dado;
4. prazo/critério de retenção;
5. evento que encerra o tratamento;
6. justificativa de conservação após o término;
7. procedimento de eliminação ou anonimização.

Não habilite jobs automáticos de exclusão de registros trabalhistas sem validação jurídica e regulatória.

## Incidentes

Mantenha procedimento com:

1. detecção e contenção;
2. preservação de evidências;
3. identificação dos dados/titulares afetados;
4. avaliação de risco ou dano relevante;
5. decisão documentada sobre comunicação;
6. comunicação à ANPD/titulares quando exigida;
7. correção da causa;
8. lições aprendidas.

A Resolução CD/ANPD nº 15/2024 prevê, para incidentes que possam acarretar risco ou dano relevante, comunicação pelo controlador à ANPD e aos titulares em 3 dias úteis, ressalvada legislação específica.

## Fornecedores e transferência internacional

Resend, Asaas, hospedagem, backups e observabilidade podem envolver terceiros. Documente:

- fornecedor;
- finalidade;
- categorias de dados;
- país/localização;
- subprocessadores;
- retenção;
- medidas de segurança;
- mecanismo aplicável de transferência internacional, quando houver.

A Resolução CD/ANPD nº 19/2024 deve ser considerada quando existir transferência internacional.

## Antes do primeiro cliente

- definir contrato controlador/operador;
- publicar política/aviso de privacidade;
- definir canal do titular;
- preencher inventário de operações;
- definir retenção por categoria;
- definir subprocessadores;
- treinar suporte/RH;
- criar plano de incidentes;
- testar backup e restauração;
- configurar secrets e HTTPS;
- remover dados demo;
- avaliar necessidade de RIPD no contexto real.

## Limites

A presença dessas funcionalidades não autoriza divulgar “100% conforme LGPD”, “certificado LGPD” ou equivalentes. Conformidade depende de tecnologia, contratos, governança e operação real.

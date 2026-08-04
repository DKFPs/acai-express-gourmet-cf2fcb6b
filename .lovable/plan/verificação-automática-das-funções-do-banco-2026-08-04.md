# Verificação automática das funções do banco

Objetivo: garantir, de forma automática e a cada deploy, que as funções de apoio do banco
(`current_company_id`, `is_company_admin`, `has_role` e todas as demais funções do sistema)
existam e tenham as permissões corretas — evitando erros como
"function public.current_company_id() does not exist".

## Estado atual verificado

- `app_private`: `current_company_id`, `is_company_admin`, `has_role`, `produce_batch`, `discard_batch` — SECURITY DEFINER, execução liberada apenas para `authenticated`/`service_role`.
- `public`: wrappers invocadores `current_company_id`, `is_company_admin`, `has_role` existem e estão liberados para `authenticated`/`service_role`.
- Wrappers `produce_batch`, `discard_batch` e `customer_stats` em `public` estão liberados também para `anon` (divergência a ser sinalizada pela verificação).
- Funções de gatilho (`apply_*`, `recalc_*`, `notify_*`, `write_audit_log`, etc.) só precisam existir; não devem ser executáveis por `anon`/`authenticated`.

## O que será construído

### 1. Catálogo esperado (fonte da verdade)
Um catálogo em SQL + espelho em TypeScript descrevendo, para cada função do sistema:
nome, schema, assinatura, se é SECURITY DEFINER, `search_path` esperado e quais papéis
devem ter EXECUTE (`authenticated`, `service_role`, nunca `anon` nas funções sensíveis).

### 2. Função de diagnóstico no banco
Nova função `app_private.check_system_functions()` (mais wrapper público restrito a admin)
que compara o catálogo com `pg_proc`/`pg_namespace`/ACLs e devolve uma linha por função com:
`schema`, `função`, `status` (`ok`, `ausente`, `permissao_faltando`, `permissao_excessiva`,
`search_path_inseguro`) e detalhe legível.

### 3. Endpoint de verificação
Rota de saúde `GET /api/public/health/db-functions` que executa a checagem e retorna
JSON `{ ok, checkedAt, total, failures[] }`, com HTTP 200 quando tudo está correto e 503
quando há falhas. A rota é somente leitura e não expõe dados de negócio.

### 4. Execução automática a cada deploy
- Script `scripts/verify-db-functions.ts` (executável com `bun`) que chama a checagem e
  falha com código de saída 1 listando as divergências.
- Ligação ao ciclo de build via script npm `verify:db` e execução pós-build, para que um
  deploy com função ausente/permissão errada seja sinalizado imediatamente.
- Agendamento diário via `pg_cron` chamando o endpoint, gravando o resultado em uma nova
  tabela `system_health_checks` e criando uma notificação para administradores quando falhar.

### 5. Visibilidade no app
Bloco "Saúde do banco" em `/configuracoes` (visível apenas para administradores) mostrando
o último resultado, a lista de divergências e um botão "Verificar agora".

## Detalhes técnicos

- Migração criará: `app_private.check_system_functions()`, wrapper público restrito por
  `is_company_admin()`, tabela `system_health_checks` (com GRANTs, RLS por empresa e
  políticas de leitura para administradores) e o agendamento `pg_cron`/`pg_net`.
- Sem correção automática de permissões: a rotina apenas detecta e reporta; correções
  continuam sendo feitas por migração explícita, para não alterar silenciosamente a
  segurança em produção.
- Nenhuma função existente é alterada nesta etapa; as divergências encontradas hoje
  (`anon` com EXECUTE em `produce_batch`, `discard_batch`, `customer_stats`) serão
  reportadas para decisão posterior.

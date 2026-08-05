# Sincronizar o Açaí Express com a versão do .zip

O arquivo enviado é uma versão mais nova do mesmo aplicativo. Comparando os dois, ele traz uma página inteira que não existe aqui (Ferramentas), um conjunto de componentes padrão reutilizáveis e várias melhorias de qualidade. Em contrapartida, esta versão tem o módulo de Saúde do Banco (verificação automática das funções), que **não** existe no .zip — ele será preservado.

## 1. Nova página Ferramentas (`/ferramentas`)

Funcionalidade que hoje não existe no app:

- **Calculadora inteligente**: simula preço de venda, custo de açaí/leite/embalagem, quantidade produzida, custo fixo e imposto; mostra novo custo, lucro, margem, markup e preço mínimo, comparando com o cenário atual.
- **Simulador de metas**: informa quanto quer faturar e o sistema calcula quantas garrafinhas vender, lucro esperado e o mix por sabor a partir do histórico, alertando quando o estoque não cobre a meta.
- **Lembretes**: lista rápida compartilhada pela empresa, com atalhos prontos (comprar leite, comprar garrafas, pagar fornecedor, produzir kit kat), marcar como feito e excluir.
- **Agenda de tarefas**: título, data, prioridade, marcar concluída, filtro de pendentes/concluídas e destaque para atrasadas.
- **Backup**: exportar dados (JSON/Excel) e restaurar backup com prévia, confirmação dupla e acesso apenas para administradores.

Entra no menu (seção Operação, ícone de chave inglesa) com a permissão `tools.view`.

## 2. Banco de dados

Criar as tabelas `reminders` e `tasks` (título, notas, data, prioridade, concluído, empresa, autor) com índices, permissões e isolamento por empresa, aplicadas como migração real — no .zip elas vinham só como script solto para rodar à mão.

## 3. Melhorias padrão vindas do .zip

- **Componentes compartilhados** (`PageHeader`, `EmptyState`, `ErrorState`, `Loading`, `ConfirmDialog`) usados nas telas, no lugar de cada página montar o seu.
- **Mensagens de erro amigáveis**: tradutor central de erros do banco (permissão, duplicidade, sessão expirada, sem conexão) aplicado nos hooks que hoje têm traduções próprias e incompletas.
- **Ajustes de tela e formatação** já feitos na versão nova: gráficos de inteligência e relatórios, painéis de produção, configurações, estoque, financeiro e caixa.

## 4. O que será preservado desta versão

- Aba "Saúde do banco" em Configurações, endpoint público de verificação, script `verify:db` e as migrações recentes — o .zip é anterior a isso, então a mesclagem mantém o que já existe aqui.
- Ícones/PWA e favicon atuais.

## Detalhes técnicos

- Portar `src/components/common/*`, `src/lib/errors.ts`, `src/lib/tools-goals.ts`, `src/lib/backup-restore.ts`, `src/services/tools.service.ts`, `src/hooks/use-tools.ts`, `src/types/tools.ts`, `src/components/tools/*` e `src/routes/_authenticated/ferramentas.tsx`.
- `src/config/navigation.ts` e `src/hooks/use-permissions.ts`: novo item e permissão `tools.view`.
- Migração Supabase para `reminders` e `tasks` com GRANTs para `authenticated`/`service_role`, RLS e políticas por `current_company_id()`; depois `tools.service.ts` passa a usar o client tipado normal.
- Restauração de backup via server function com verificação de papel de administrador no servidor.
- Arquivos compartilhados: aplicar os diffs de conteúdo do .zip, ignorando diferenças que são apenas reformatação, e mesclando manualmente `configuracoes.tsx`, `package.json` e `navigation.ts` para não perder o módulo de saúde do banco.

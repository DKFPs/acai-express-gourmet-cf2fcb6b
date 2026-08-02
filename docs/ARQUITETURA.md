# Arquitetura do Sistema (SaaS multi-tenant)

Documento gerado e mantido junto ao código. Descreve camadas, módulos e regras.

## Visão geral

Aplicação TanStack Start (React 19 + Vite 7 + Tailwind v4) com backend gerenciado
(Postgres + Auth + Storage + Realtime). Cada empresa é um tenant isolado.

## Camadas (Clean Architecture)

```text
src/
  types/        -> contratos de domínio (entidades, filtros, enums)
  services/     -> acesso a dados e regras de infraestrutura (única camada que fala com o banco)
  hooks/        -> casos de uso na visão do cliente (TanStack Query: cache, mutations, realtime)
  lib/          -> utilitários puros (cálculos, exportação PDF/Excel, backup, whatsapp)
  components/   -> UI reutilizável por domínio (orders, products, stock, finance, reports, layout)
  layouts/      -> shells de aplicação e autenticação
  routes/       -> composição de páginas (apenas orquestração + apresentação)
```

Regra: `routes` nunca chamam o banco diretamente; usam `hooks`, que usam `services`.

## Multi-tenant

- Toda tabela de negócio possui `company_id`.
- A função `current_company_id()` (security definer) resolve o tenant do usuário logado.
- Políticas RLS restringem leitura/escrita ao tenant e, quando aplicável, ao papel.
- No cadastro, um trigger cria empresa + configurações + perfil + papel de administrador.

## Papéis e permissões

| Papel | Acesso |
| --- | --- |
| `administrador` | Total, incluindo auditoria, configurações, usuários, exclusões e backup |
| `funcionario` | Operação diária (pedidos, produtos, clientes, estoque, caixa) |

Mapa de permissões em `src/hooks/use-permissions.ts`; navegação filtrada em
`src/config/navigation.ts`.

## Módulos

| Módulo | Rota | Descrição |
| --- | --- | --- |
| Dashboard | `/dashboard` | KPIs, metas, gráficos em tempo real |
| Pedidos | `/pedidos` | Fluxo completo, timeline de status, pagamentos |
| Produtos | `/produtos` | CRUD, categorias, margem calculada, fotos |
| Clientes | `/clientes` | Cadastro, estatísticas, ranking, histórico |
| Estoque | `/estoque` | Ingredientes, fornecedores, receitas, baixa automática |
| Financeiro | `/financeiro` | Receitas, despesas, fluxo de caixa, exportações |
| Caixa | `/caixa` | Abertura/fechamento, sangrias, conferência |
| Relatórios | `/relatorios` | 7 relatórios com gráficos, PDF, Excel e impressão |
| Usuários | `/usuarios` | Papéis, ativação, atalhos |
| Auditoria | `/auditoria` | Log imutável de criação, alteração e exclusão |
| Configurações | `/configuracoes` | Logo, horários, entrega, pagamentos, WhatsApp, backup |

## Tempo real

`notifications`, `orders`, `order_items`, `customers` e `ingredients` publicam via
Realtime. `use-notifications.ts` mantém um canal por empresa e dispara toasts.

## Produtividade

- Pesquisa global: `Ctrl/Cmd + K` (páginas, produtos, clientes, pedidos).
- Favoritos por usuário (estrela no cabeçalho).
- Atalhos `Alt + tecla` listados em `/usuarios`.
- Tema claro/escuro persistido por usuário.

## Backup

`src/lib/backup.ts` exporta todas as tabelas do tenant em JSON ou Excel
(multi-abas). O banco possui backup automático gerenciado pela infraestrutura.

## Performance

- Code splitting automático por rota (TanStack Router).
- Bibliotecas pesadas (`xlsx`, `jspdf`) carregadas sob demanda com `import()`.
- Cache e revalidação via TanStack Query; skeletons em todas as listas.
- Imagens privadas servidas por URL assinada.

## PWA

`public/manifest.webmanifest` + ícones em `public/icons`. Instalável em celular
(Adicionar à tela de início) com abertura direta no dashboard.

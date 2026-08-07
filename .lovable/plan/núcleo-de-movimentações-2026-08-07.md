# Núcleo de Movimentações

Centralizar toda escrita operacional do sistema em um único registro canônico (`system_movements`), eliminando gravações diretas e cálculos duplicados nos módulos. Sem nenhuma mudança visual.

## O que muda

Hoje cada módulo grava direto na sua própria tabela (pedido grava estoque, compra grava custo, produção grava lote, caixa grava transação). Passa a existir um único ponto de entrada: toda operação vira uma movimentação, e a movimentação é quem atualiza os saldos.

```text
  Pedidos   Compras   Produção   Caixa   Financeiro
      \        |          |        |        /
       ------->  NÚCLEO DE MOVIMENTAÇÕES  <------
                 (system_movements)
                          |
        aplica saldos: estoque, caixa, financeiro,
        produtos acabados, lotes  -> consumidos por
        Dashboard, Clientes, Relatórios, Inteligência
```

## Etapa 1 — Tabela central

Criar `system_movements` com: id, data/hora, tipo, origem, referência, usuário, produto, ingrediente, receita, lote, cliente, valor, quantidade, forma de pagamento, observações, status, empresa. Isolamento por empresa (cada empresa só enxerga e cria as próprias movimentações), índices por data, tipo e origem.

Tipos previstos: venda, compra, produção, descarte, entrada e saída de estoque, entrada/saída/sangria de caixa, receita, despesa, ajuste, estorno.

## Etapa 2 — Motor de aplicação

Uma rotina única no banco recebe a movimentação e aplica o efeito correspondente dentro de uma transação:

- estoque de ingredientes e embalagens
- estoque de produtos acabados e lotes
- saldo e totais do caixa
- lançamentos financeiros

Regras de idempotência: a mesma origem + referência não pode gerar dois efeitos; movimentações estornadas revertem exatamente o efeito original.

## Etapa 3 — Entradas do sistema

Funções transacionais de gravação, uma por operação de negócio (registrar venda, registrar compra, produzir lote, movimentar estoque, movimentar caixa, lançar financeiro). Cada uma grava a movimentação e delega o efeito ao motor. Nenhum caminho alternativo de escrita permanece ativo.

## Etapa 4 — Remoção da duplicidade

Desativar os gatilhos que hoje aplicam efeitos em paralelo (compra, movimento de estoque, movimento de produto acabado, consumo por item de pedido, totais de caixa), para que o efeito ocorra uma única vez, vindo do núcleo. Migrar o histórico existente para movimentações, sem reaplicar saldos.

## Etapa 5 — Leitura

Dashboard, Relatórios, Clientes e Inteligência passam a ler de visões derivadas das movimentações, no lugar de recalcular cada um a sua maneira. As telas continuam exatamente iguais.

## Detalhes técnicos

- Migração cria `public.system_movements` + enums de tipo/origem/status, com GRANTs e RLS por `current_company_id()`.
- `app_private.apply_movement(movement_id)` concentra os efeitos; funções públicas `record_*` (SECURITY DEFINER, `search_path` fixo) são o único ponto de escrita e chamam o motor na mesma transação.
- Gatilhos removidos/neutralizados: `trg_apply_purchase`, `trg_apply_stock_movement`, `trg_apply_finished_movement`, `trg_consume_stock`, `cash_transactions_recalc`; `produce_batch` passa a delegar ao núcleo.
- Novo `src/services/movements.service.ts` (RPC) e refatoração de `purchase`, `stock`, `cash`, `finance`, `production` e `order` services para usá-lo. Hooks e componentes mantêm as mesmas assinaturas — nenhuma alteração de UI.
- Views `v_sales`, `v_cash_flow`, `v_stock_ledger` para leitura consolidada.
- Backfill em migração separada, com `status = 'aplicado'` e sem reexecutar efeitos.

# Custos de produção: motor único e telas conectadas

Objetivo: um só motor de cálculo (`src/lib/recipe-costing.ts` + `src/lib/units.ts`) alimentando receita, produção, lote e relatórios. Nenhuma tela faz conta própria.

## 1. Fonte única de verdade

- Criar um hook `useCostingContext()` que carrega ingredientes + embalagens uma única vez (React Query, cache compartilhado) e devolve os dados já convertidos para o motor.
- Criar `useRecipeCosting(params)` que memoiza `calculateRecipeCosts`.
- Remover os cálculos locais espalhados: prévia do `produce-dialog.tsx`, `quick-produce-dialog.tsx`, `price-simulator.tsx`, `recipe-costs-panel.tsx`, `commercial-dashboard.tsx` e a ficha do lote passam a consumir o hook.

## 2. Painel de custos em tempo real (diálogo de receita)

Painel lateral fixo, atualizado a cada tecla, sem salvar: rendimento real, custo de ingredientes, custo de embalagens, custo total, custo por garrafinha, preço de venda, lucro por garrafinha, lucro do lote, margem e markup. Alerta quando o preço de venda ficar abaixo do custo.

## 3. Tabela inteligente de ingredientes

Na mesma tela: ingrediente, quantidade usada, unidade (só unidades compatíveis), estoque disponível na unidade da receita, custo unitário, valor consumido e % do custo da receita. Linha em vermelho + aviso quando o estoque não cobre a necessidade; nesse caso a produção fica bloqueada.

## 4. Embalagens

- Migração: adicionar em `packaging_stock` os campos `supplier_id`, `last_purchase_at` e `next_restock_at` (os campos de quantidade comprada, valor pago e quantidade por garrafinha já existem).
- Diálogo e tabela de embalagens passam a exibir: quantidade comprada, valor pago, estoque, mínimo, quantidade por garrafinha, custo unitário, fornecedor, última compra e próxima reposição.
- Resumo automático do custo de embalagens por garrafinha e por receita, vindo do motor central.

## 5. Prévia da produção

Etapa de conferência antes de confirmar: receita, lotes, rendimento total, ingredientes consumidos (quantidade e valor), embalagens consumidas e valor, custo total, custo por garrafinha, preço de venda, lucro estimado e faturamento estimado. Botão "Confirmar produção" só habilita se todas as validações passarem.

## 6. Resumo do lote imprimível

Ficha em `/lote/$batchId` com número do lote, receita, data, responsável, ingredientes e embalagens utilizados (quantidade e valor congelados em `production_items`), custo total, quantidade produzida, custo unitário, preço de venda, lucro estimado, margem, markup, status e validade. Botão de impressão com folha de estilo dedicada.

## 7. Histórico financeiro automático

Migração: `produce_batch` passa a inserir um lançamento em `financial_entries` (tipo despesa, categoria "Produção") com custo de ingredientes, embalagens, custo total, quantidade produzida e custo médio por garrafinha registrados nas observações/campos do lote, para uso posterior nos relatórios.

## 8. Validações antes de produzir

Bloqueio com mensagem específica quando: ingrediente insuficiente, embalagem insuficiente, receita sem itens/inativa, rendimento igual a zero ou preço de venda menor que o custo. Mesmas regras no banco (`produce_batch` levanta exceção) e na interface.

## Detalhes técnicos

- Motor: `calculateRecipeCosts` já cobre conversão de unidades, embalagens por garrafinha, margem, markup e faltas de estoque; ganha apenas o percentual por linha e a validação agregada.
- Memoização por `useMemo` sobre os valores do formulário; dados de ingredientes/embalagens via React Query com `staleTime` para evitar consultas repetidas.
- Migrações necessárias: colunas novas em `packaging_stock` e atualização de `app_private.produce_batch` (validações + lançamento financeiro).

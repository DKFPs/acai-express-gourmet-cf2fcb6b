# Receitas, Custos e Produção — precisão real por garrafinha

Hoje o cálculo tem três falhas confirmadas no código e no banco:

1. **Não existe conversão de unidades.** O custo é `quantidade da receita × preço do ingrediente`, ou seja, 400 g de açaí comprados a R$ 24,00/kg viram R$ 9.600,00 em vez de R$ 9,60.
2. **Embalagem é estimada.** O sistema usa 1 unidade de cada tipo de embalagem por garrafinha e considera apenas o primeiro item cadastrado de cada tipo. Não existe campo "quantidade usada por garrafinha".
3. **Não há simulação ao editar a receita.** Os custos só aparecem depois de salvar; a tela de receita não mostra tabela de custo consumido nem painel de resumo.

O plano corrige a base de cálculo e reconstrói as telas em cima dela.

## 1. Base de cálculo com unidades

- Cada ingrediente passa a ter uma **unidade base** derivada da unidade de compra: massa → grama, volume → mililitro, contáveis (un, cx, pct) → unidade.
- Passa a ser calculado e guardado o **custo por unidade base** (custo por g, por ml ou por unidade). A partir dele o app exibe custo por g, kg, ml, L e por unidade.
- Na receita, a quantidade pode ser informada em g, kg, ml, L ou un: o sistema converte para a unidade base do ingrediente antes de multiplicar. Unidades incompatíveis (ex.: ml de um ingrediente comprado em kg) são bloqueadas na hora do cadastro, com aviso claro.

## 2. Ingredientes

Campos adicionados ao cadastro: quantidade comprada, valor pago e data da última compra (além de nome, categoria, fornecedor, unidade, estoque atual e mínimo já existentes). O custo unitário nunca é digitado — é derivado da compra e atualizado por **custo médio ponderado** a cada nova compra, como já ocorre no módulo Compras.

## 3. Embalagens

Cada embalagem (garrafa, tampa, canudo, lacre, etiqueta) ganha: quantidade comprada, valor pago e **quantidade usada por garrafinha**. O custo unitário é calculado automaticamente (valor pago ÷ quantidade comprada). O custo de embalagem da receita passa a somar todas as embalagens ativas conforme o consumo por garrafinha, e a produção consome exatamente essa quantidade.

## 4. Rendimento real e indicadores

O campo de rendimento vira **Rendimento real (garrafinhas)**, obrigatório, sem valor fixo assumido. Ele alimenta:

- custo por garrafinha = custo total ÷ rendimento real
- lucro bruto por garrafinha = preço de venda − custo por garrafinha
- lucro líquido = lucro bruto − taxas sobre venda (novo campo opcional por receita, padrão 0%)
- margem = lucro ÷ preço de venda
- markup = preço de venda ÷ custo
- preço mínimo sugerido para a margem alvo

Alterar o rendimento de 4 para 3 ou 5 refaz tudo automaticamente.

## 5. Simulação em tempo real na tela da receita

A tela de receita passa a ter:

- **Tabela de ingredientes**: ingrediente | quantidade | unidade | custo unitário | custo consumido
- **Tabela de embalagens**: embalagem | qtd por garrafinha | custo unitário | custo por garrafinha
- **Painel de resumo fixo no rodapé**: custo dos ingredientes, custo das embalagens, custo total, rendimento real, custo por garrafinha, preço de venda, lucro por garrafinha, lucro do lote, margem e markup

Tudo recalculado a cada tecla, sem precisar salvar.

## 6. Produção

Antes de confirmar o lote, o diálogo mostra o resumo detalhado:

```text
Açaí               400 g    R$ 0,024/g     R$ 9,60
Leite              260 ml   R$ 0,0065/ml   R$ 1,69
Leite Condensado    40 g    R$ 0,0202/g    R$ 0,81
Leite em Pó         60 g    R$ 0,04725/g   R$ 2,84
Garrafa PET          1 un   R$ 0,90        R$ 0,90
...
Custo ingredientes / embalagens / total / rendimento /
custo por garrafinha / preço / lucro un / lucro do lote / margem / markup
```

Faltando estoque de qualquer item, o botão fica bloqueado com a lista do que falta. A ficha do lote produzido passa a exibir esse mesmo resumo com os custos congelados no momento da produção.

## 7. Recálculo automático

Qualquer compra de ingrediente ou embalagem, alteração de preço, de quantidade por garrafinha ou de rendimento dispara o recálculo de todas as receitas afetadas, com registro no histórico de custos. Nenhuma receita precisa ser editada manualmente.

## Detalhes técnicos

**Migração de banco**
- `ingredients`: `base_unit`, `cost_per_base_unit`, `last_purchase_quantity`, `last_purchase_value`, `last_purchase_at`; backfill a partir de `unit`/`purchase_price`.
- `packaging_stock`: `purchase_quantity`, `purchase_value`, `qty_per_unit` (padrão 1); `unit_cost` derivado.
- `recipes`: `sales_tax_percent` (padrão 0), `markup` derivado no cálculo.
- Nova função `app_private.to_base_qty(qty, from_unit, base_unit)` para conversão g/kg/mg, ml/L, un.
- `recalc_recipe_costs` reescrita: ingredientes convertidos para unidade base × `cost_per_base_unit`; embalagens = Σ(`unit_cost` × `qty_per_unit`) × rendimento; grava custo total, custo por unidade, margem, markup, preço mínimo e histórico.
- `apply_purchase` atualiza também `cost_per_base_unit`, campos de última compra e, para embalagens, `unit_cost` ponderado.
- `produce_batch` reescrita: consome ingredientes na unidade correta e embalagens por `qty_per_unit × produzido`; grava em `production_items` o custo unitário base e o valor consumido.
- Triggers de recálculo estendidos para mudanças em `qty_per_unit` e custo de embalagem.

**Frontend**
- Novo `src/lib/units.ts` (conversões e famílias) e `src/lib/recipe-costing.ts` (motor puro de custo/margem/markup usado por receita, simulação e produção — mesma fórmula do banco).
- `recipe-dialog.tsx`: tabelas de ingredientes/embalagens + painel de resumo com `useMemo` sobre `form.watch`.
- `produce-dialog.tsx`: prévia detalhada e validação de estoque.
- `ingredient-dialog.tsx`, `packaging-dialog.tsx`, `purchase-dialog.tsx`: novos campos e exibição de custo por g/kg/ml/L/un.
- `lote.$batchId.tsx` e painéis de produção: resumo com custos congelados.
- Zod: unidade da receita restrita à família do ingrediente; rendimento real obrigatório > 0.

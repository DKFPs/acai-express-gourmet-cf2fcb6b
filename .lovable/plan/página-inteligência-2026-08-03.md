# Página Inteligência

Nova página `/inteligencia` que analisa automaticamente as vendas e mostra insights e sugestões acionáveis, com gráficos modernos e atualização automática.

## Indicadores

Cards de destaque:
- Sabor mais vendido (quantidade) e sabor mais lucrativo (lucro total)
- Melhor e pior horário de vendas (faturamento por faixa de hora)
- Dia da semana com maior faturamento
- Cliente que mais comprou (valor e nº de pedidos)
- Produto com maior e com menor margem
- Ingrediente que mais gera custo (consumo x custo no período)

## Sugestões automáticas

Lista de recomendações geradas por regras, cada uma com ícone, severidade (positiva / atenção / crítica) e link para o módulo relacionado:
- "Produza mais Morango amanhã" — alta demanda recente + estoque pronto baixo
- "Você está vendendo pouco Maracujá" — queda vs. período anterior
- "Seu lucro caiu esta semana" — comparação de lucro semana atual x anterior
- "Seu estoque de leite acaba em ~2 dias" — consumo médio diário do ingrediente x quantidade em estoque
- "Seu estoque de garrafas acaba em ~3 dias" — mesma projeção para embalagens
- Alertas de validade de lotes prestes a vencer

## Gráficos

- Vendas por hora do dia (barras, destacando melhor/pior)
- Faturamento por dia da semana (barras)
- Ranking de sabores por lucro (barras horizontais)
- Evolução de receita x custo x lucro no período (área)
- Participação de custo por ingrediente (pizza/donut)

## Interação

- Seletor de período (7, 30, 90 dias) no topo
- Atualização automática: refetch a cada 60s + invalidação em tempo real quando entram novos pedidos/itens/movimentos de estoque
- Layout responsivo (cards empilhados no mobile)

## Detalhes técnicos

- `src/types/intelligence.ts` — tipos de insights, sugestões e séries
- `src/services/intelligence.service.ts` — consultas agregadas em `orders`, `order_items`, `products`, `recipes`, `customers`, `ingredients`, `packaging_stock`, `stock_movements`, `production_batches`; cálculo de margem por produto e projeção de dias restantes de estoque
- `src/lib/intelligence-rules.ts` — motor de regras puro que transforma métricas em sugestões (testável, sem I/O)
- `src/hooks/use-intelligence.ts` — React Query com `refetchInterval` de 60s e canal Realtime, seguindo o padrão de `use-dashboard.ts`
- `src/components/intelligence/` — `insight-card.tsx`, `suggestions-panel.tsx`, `intelligence-charts.tsx` (Recharts, tokens do design system)
- `src/routes/_authenticated/inteligencia.tsx` — rota com `head()` próprio
- `src/config/navigation.ts` + `src/hooks/use-permissions.ts` — item "Inteligência" (ícone Brain), visível para quem tem acesso a relatórios

Sem migração de banco: tudo é derivado das tabelas existentes.

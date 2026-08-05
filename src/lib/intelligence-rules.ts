import { formatCurrency, formatNumber } from "@/lib/format";
import type { IntelligenceData, Suggestion } from "@/types/intelligence";

/** Motor de regras puro: transforma métricas em sugestões acionáveis. */
export function buildSuggestions(data: IntelligenceData): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const topFlavor = data.sabores[0];
  if (topFlavor) {
    const ready = data.prontos.find(
      (item) => item.name.toLowerCase() === topFlavor.name.toLowerCase(),
    );
    const diario = topFlavor.quantidade / data.dias;
    if (!ready || ready.disponivel < diario * 2) {
      suggestions.push({
        id: "produce-top",
        title: `Produza mais ${topFlavor.name} amanhã`,
        description: `Sai em média ${formatNumber(diario)} un/dia e o estoque pronto é de ${formatNumber(ready?.disponivel ?? 0)} un.`,
        tone: "warning",
        to: "/producao-rapida",
      });
    } else {
      suggestions.push({
        id: "top-ok",
        title: `${topFlavor.name} é o seu campeão de vendas`,
        description: `${formatNumber(topFlavor.quantidade)} unidades no período, com ${formatCurrency(topFlavor.lucro)} de lucro.`,
        tone: "positive",
        to: "/relatorios",
      });
    }
  }

  // Sabores em queda
  const anterior = new Map(data.saboresAnterior.map((flavor) => [flavor.name, flavor.quantidade]));
  for (const flavor of data.sabores.slice(0, 12)) {
    const before = anterior.get(flavor.name) ?? 0;
    if (before >= 5 && flavor.quantidade < before * 0.6) {
      suggestions.push({
        id: `drop-${flavor.name}`,
        title: `Você está vendendo pouco ${flavor.name}`,
        description: `Caiu de ${formatNumber(before)} para ${formatNumber(flavor.quantidade)} unidades em relação ao período anterior.`,
        tone: "warning",
        to: "/produtos",
      });
    }
  }

  // Lucro
  if (data.lucroAnterior > 0) {
    const variacao = ((data.lucro - data.lucroAnterior) / data.lucroAnterior) * 100;
    if (variacao <= -10) {
      suggestions.push({
        id: "profit-drop",
        title: "Seu lucro caiu neste período",
        description: `Queda de ${formatNumber(Math.abs(variacao))}% frente ao período anterior (${formatCurrency(data.lucro)} contra ${formatCurrency(data.lucroAnterior)}).`,
        tone: "critical",
        to: "/financeiro",
      });
    } else if (variacao >= 10) {
      suggestions.push({
        id: "profit-up",
        title: "Seu lucro está crescendo",
        description: `Alta de ${formatNumber(variacao)}% frente ao período anterior.`,
        tone: "positive",
        to: "/financeiro",
      });
    }
  }

  // Estoque acabando
  for (const projection of data.projecoes) {
    if (projection.diasRestantes === null || projection.diasRestantes > 7) continue;
    const dias = Math.max(0, Math.round(projection.diasRestantes));
    suggestions.push({
      id: `stock-${projection.tipo}-${projection.name}`,
      title:
        dias === 0
          ? `Seu estoque de ${projection.name} acabou`
          : `Seu estoque de ${projection.name} acaba em aproximadamente ${dias} ${dias === 1 ? "dia" : "dias"}`,
      description: `Restam ${formatNumber(projection.quantidade)} ${projection.unidade} com consumo médio de ${formatNumber(projection.consumoDiario)} ${projection.unidade}/dia.`,
      tone: dias <= 2 ? "critical" : "warning",
      to: "/compras",
    });
  }

  // Margem baixa
  const piorMargem = data.margens.at(-1);
  if (piorMargem && piorMargem.margem < 20) {
    suggestions.push({
      id: "low-margin",
      title: `${piorMargem.name} está com margem baixa`,
      description: `Apenas ${formatNumber(piorMargem.margem)}% de margem. Reveja o preço ou o custo dos ingredientes.`,
      tone: "warning",
      to: "/produtos",
    });
  }

  // Validade
  for (const batch of data.lotesVencendo) {
    suggestions.push({
      id: `expiry-${batch.batch_code ?? batch.expires_at}`,
      title:
        batch.dias < 0
          ? `Lote de ${batch.name} vencido`
          : `Lote de ${batch.name} vence em ${batch.dias} ${batch.dias === 1 ? "dia" : "dias"}`,
      description: `Lote ${batch.batch_code ?? "—"} · validade ${new Date(batch.expires_at).toLocaleDateString("pt-BR")}.`,
      tone: batch.dias <= 1 ? "critical" : "warning",
      to: "/producao",
    });
  }

  // Melhor horário
  const melhorHora = [...data.horas].sort((a, b) => b.faturamento - a.faturamento)[0];
  if (melhorHora) {
    suggestions.push({
      id: "best-hour",
      title: `Reforce a equipe às ${melhorHora.hora}`,
      description: `É o horário com maior faturamento: ${formatCurrency(melhorHora.faturamento)} em ${formatNumber(melhorHora.pedidos)} pedidos.`,
      tone: "info",
      to: "/relatorios",
    });
  }

  const order = { critical: 0, warning: 1, info: 2, positive: 3 } as const;
  return suggestions.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 12);
}

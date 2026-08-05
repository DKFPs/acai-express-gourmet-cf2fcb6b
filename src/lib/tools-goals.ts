import type { CommercialOverview } from "@/types/production-advanced";

export interface GoalPlanFlavor {
  name: string;
  share: number;
  bottles: number;
  revenue: number;
  profit: number;
}

export interface GoalPlan {
  averageTicket: number;
  profitPerUnit: number;
  marginPercent: number;
  bottles: number;
  bottlesPerDay: number;
  expectedProfit: number;
  flavors: GoalPlanFlavor[];
  hasHistory: boolean;
}

export function simulateGoal(
  overview: CommercialOverview | undefined,
  revenueGoal: number,
  days: number,
): GoalPlan {
  const quantity = Number(overview?.totalQuantity ?? 0);
  const revenue = Number(overview?.totalRevenue ?? 0);
  const profit = Number(overview?.totalProfit ?? 0);
  const hasHistory = quantity > 0 && revenue > 0;

  const averageTicket = hasHistory ? revenue / quantity : 0;
  const profitPerUnit = hasHistory ? profit / quantity : 0;
  const goal = Math.max(revenueGoal, 0);
  const bottles = averageTicket > 0 ? Math.ceil(goal / averageTicket) : 0;
  const period = Math.max(days, 1);

  const flavors = (overview?.flavors ?? [])
    .filter((flavor) => Number(flavor.quantity) > 0)
    .map((flavor) => {
      const share = quantity > 0 ? Number(flavor.quantity) / quantity : 0;
      const flavorBottles = Math.round(bottles * share);
      const unitPrice =
        Number(flavor.quantity) > 0 ? Number(flavor.revenue) / Number(flavor.quantity) : 0;
      const unitProfit =
        Number(flavor.quantity) > 0 ? Number(flavor.profit) / Number(flavor.quantity) : 0;
      return {
        name: flavor.name,
        share: share * 100,
        bottles: flavorBottles,
        revenue: flavorBottles * unitPrice,
        profit: flavorBottles * unitProfit,
      };
    })
    .sort((a, b) => b.bottles - a.bottles);

  return {
    averageTicket,
    profitPerUnit,
    marginPercent: averageTicket > 0 ? (profitPerUnit / averageTicket) * 100 : 0,
    bottles,
    bottlesPerDay: Math.ceil(bottles / period),
    expectedProfit: bottles * profitPerUnit,
    flavors,
    hasHistory,
  };
}

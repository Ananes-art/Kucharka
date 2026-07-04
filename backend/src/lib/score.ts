// Čistá logika pro doporučování receptů podle expirace surovin.

export interface StockInfo {
  hasStock: boolean;
  minExpiry: Date | null;
}

export interface ScoreInput {
  ingredientIds: number[];
  stock: Map<number, StockInfo>;
  now: Date;
  thresholdDays: number;
}

export interface ScoreResult {
  score: number;
  availableCount: number;
  missingCount: number;
  expiringUsed: { ingredientId: number; daysLeft: number }[];
}

export function scoreRecipe(input: ScoreInput): ScoreResult {
  const { ingredientIds, stock, now, thresholdDays } = input;
  let expiringScore = 0;
  let availableCount = 0;
  const expiringUsed: { ingredientId: number; daysLeft: number }[] = [];
  let missingCount = 0;

  for (const id of ingredientIds) {
    const st = stock.get(id);
    if (st?.hasStock) {
      availableCount++;
      if (st.minExpiry) {
        const daysLeft = Math.floor((st.minExpiry.getTime() - now.getTime()) / 86400000);
        if (daysLeft <= thresholdDays) {
          const urgency = thresholdDays - daysLeft + 1; // méně dní => vyšší urgence
          expiringScore += urgency;
          expiringUsed.push({ ingredientId: id, daysLeft });
        }
      }
    } else {
      missingCount++;
    }
  }

  const total = ingredientIds.length || 1;
  const coverage = availableCount / total;
  const score = expiringScore * 100 + Math.round(coverage * 10);

  return {
    score,
    availableCount,
    missingCount,
    expiringUsed: expiringUsed.sort((a, b) => a.daysLeft - b.daysLeft),
  };
}

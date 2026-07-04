import { describe, it, expect } from "vitest";
import { scoreRecipe, type StockInfo } from "./score.js";

const now = new Date("2026-07-04T12:00:00Z");
function inDays(d: number) {
  return new Date(now.getTime() + d * 86400000);
}

describe("scoreRecipe", () => {
  it("recept bez surovin skladem má nulové skóre", () => {
    const stock = new Map<number, StockInfo>();
    const r = scoreRecipe({ ingredientIds: [1, 2], stock, now, thresholdDays: 7 });
    expect(r.score).toBe(0);
    expect(r.missingCount).toBe(2);
    expect(r.availableCount).toBe(0);
  });

  it("expirující surovina zvyšuje skóre", () => {
    const stock = new Map<number, StockInfo>([
      [1, { hasStock: true, minExpiry: inDays(2) }],
    ]);
    const r = scoreRecipe({ ingredientIds: [1], stock, now, thresholdDays: 7 });
    expect(r.score).toBeGreaterThan(100);
    expect(r.expiringUsed).toHaveLength(1);
    expect(r.expiringUsed[0].daysLeft).toBe(2);
  });

  it("dřívější expirace = vyšší skóre", () => {
    const soon = new Map<number, StockInfo>([[1, { hasStock: true, minExpiry: inDays(1) }]]);
    const later = new Map<number, StockInfo>([[1, { hasStock: true, minExpiry: inDays(6) }]]);
    const a = scoreRecipe({ ingredientIds: [1], stock: soon, now, thresholdDays: 7 });
    const b = scoreRecipe({ ingredientIds: [1], stock: later, now, thresholdDays: 7 });
    expect(a.score).toBeGreaterThan(b.score);
  });

  it("prošlá surovina má nejvyšší urgenci", () => {
    const expired = new Map<number, StockInfo>([[1, { hasStock: true, minExpiry: inDays(-3) }]]);
    const r = scoreRecipe({ ingredientIds: [1], stock: expired, now, thresholdDays: 7 });
    expect(r.expiringUsed[0].daysLeft).toBe(-3);
    expect(r.score).toBeGreaterThan(1000);
  });

  it("surovina skladem bez expirace přispívá jen pokrytím", () => {
    const stock = new Map<number, StockInfo>([[1, { hasStock: true, minExpiry: null }]]);
    const r = scoreRecipe({ ingredientIds: [1], stock, now, thresholdDays: 7 });
    expect(r.score).toBe(10); // coverage 1.0 * 10, žádné expiringScore
    expect(r.expiringUsed).toHaveLength(0);
  });

  it("expirace mimo práh se nezapočítá do urgence", () => {
    const stock = new Map<number, StockInfo>([[1, { hasStock: true, minExpiry: inDays(30) }]]);
    const r = scoreRecipe({ ingredientIds: [1], stock, now, thresholdDays: 7 });
    expect(r.expiringUsed).toHaveLength(0);
    expect(r.score).toBe(10);
  });

  it("částečné pokrytí skladem", () => {
    const stock = new Map<number, StockInfo>([[1, { hasStock: true, minExpiry: null }]]);
    const r = scoreRecipe({ ingredientIds: [1, 2, 3, 4], stock, now, thresholdDays: 7 });
    expect(r.availableCount).toBe(1);
    expect(r.missingCount).toBe(3);
    expect(r.score).toBe(Math.round((1 / 4) * 10));
  });
});

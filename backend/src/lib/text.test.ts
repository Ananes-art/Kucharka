import { describe, it, expect } from "vitest";
import { normalize, similarity } from "./text.js";

describe("normalize", () => {
  it("odstraní diakritiku a dá malá písmena", () => {
    expect(normalize("Čeřený Chléb Máslový")).toBe("cereny chleb maslovy");
  });
  it("sjednotí mezery", () => {
    expect(normalize("  více   mezer\t tady ")).toBe("vice mezer tady");
  });
});

describe("similarity", () => {
  it("shodné řetězce = 1", () => {
    expect(similarity("chleba", "chleba")).toBe(1);
  });
  it("podobné řetězce mají vysoké skóre", () => {
    expect(similarity("chleba", "chleb")).toBeGreaterThan(0.6);
  });
  it("nesouvisející řetězce mají nízké skóre", () => {
    expect(similarity("mleko", "brambory")).toBeLessThan(0.3);
  });
  it("je symetrická", () => {
    expect(similarity("rajce", "rajcata")).toBeCloseTo(similarity("rajcata", "rajce"), 5);
  });
});

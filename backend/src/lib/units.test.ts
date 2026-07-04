import { describe, it, expect } from "vitest";
import { toBase, formatBase } from "./units.js";

describe("toBase", () => {
  it("převádí kg na g", () => {
    expect(toBase(1.5, "kg", "g")).toBe(1500);
  });
  it("nechává g v g", () => {
    expect(toBase(200, "g", "g")).toBe(200);
  });
  it("převádí l na ml", () => {
    expect(toBase(2, "l", "ml")).toBe(2000);
  });
  it("nechává ml v ml", () => {
    expect(toBase(250, "ml", "ml")).toBe(250);
  });
  it("kusy zůstávají kusy", () => {
    expect(toBase(3, "ks", "ks")).toBe(3);
  });
  it("prázdná jednotka u kusů = kusy", () => {
    expect(toBase(3, "", "ks")).toBe(3);
  });
  it("nekompatibilní jednotky vrací null (g vs ks)", () => {
    expect(toBase(100, "g", "ks")).toBeNull();
  });
  it("nekompatibilní jednotky vrací null (ml vs g)", () => {
    expect(toBase(100, "ml", "g")).toBeNull();
  });
});

describe("formatBase", () => {
  it("formátuje gramy pod 1000", () => {
    expect(formatBase(200, "g")).toBe("200 g");
  });
  it("formátuje gramy nad 1000 jako kg", () => {
    expect(formatBase(1500, "g")).toBe("1,5 kg");
  });
  it("formátuje mililitry nad 1000 jako litry", () => {
    expect(formatBase(2000, "ml")).toBe("2 l");
  });
  it("formátuje kusy", () => {
    expect(formatBase(3, "ks")).toBe("3 ks");
  });
});

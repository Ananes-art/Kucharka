import { describe, it, expect } from "vitest";
import { parseReceipt } from "./receiptParser.js";

const SAMPLE = `KAUFLAND
Chlumecka 765, Praha
DIC CZ12345678

Chleba maslovy       32,90 A
Mleko plnotucne      24,90 B
Jablka cervena 1,2kg 47,88 A
Vejce M 10ks         49,90 A
CELKEM              155,58
Hotovost            200,00
04.07.2026 14:32
`;

describe("parseReceipt", () => {
  const res = parseReceipt(SAMPLE);

  it("rozpozná obchod", () => {
    expect(res.store).toBe("Kaufland");
  });

  it("rozpozná celkovou částku", () => {
    expect(res.total).toBeCloseTo(155.58, 2);
  });

  it("rozpozná datum nákupu", () => {
    expect(res.purchasedAt?.getFullYear()).toBe(2026);
    expect(res.purchasedAt?.getMonth()).toBe(6); // červenec = 6
    expect(res.purchasedAt?.getDate()).toBe(4);
  });

  it("vyfiltruje šum (CELKEM, Hotovost, DIC, hlavička)", () => {
    const keywords = res.lines.map((l) => l.keyword);
    expect(keywords.some((k) => k.includes("celkem"))).toBe(false);
    expect(keywords.some((k) => k.includes("hotovost"))).toBe(false);
    expect(keywords.some((k) => k.includes("dic"))).toBe(false);
  });

  it("najde položky s cenami", () => {
    expect(res.lines.length).toBe(4);
    const keywords = res.lines.map((l) => l.keyword);
    expect(keywords.some((k) => k.includes("chleba"))).toBe(true);
    expect(keywords.some((k) => k.includes("mleko"))).toBe(true);
    expect(keywords.some((k) => k.includes("jablka"))).toBe(true);
    expect(keywords.some((k) => k.includes("vejce"))).toBe(true);
  });

  it("rozpozná množství a jednotku (kg)", () => {
    const jablka = res.lines.find((l) => l.keyword.includes("jablka"));
    expect(jablka?.quantity).toBeCloseTo(1.2, 2);
    expect(jablka?.unit).toBe("kg");
  });

  it("rozpozná množství a jednotku (ks)", () => {
    const vejce = res.lines.find((l) => l.keyword.includes("vejce"));
    expect(vejce?.quantity).toBe(10);
    expect(vejce?.unit).toBe("ks");
  });

  it("uloží cenu položky", () => {
    const chleba = res.lines.find((l) => l.keyword.includes("chleba"));
    expect(chleba?.price).toBeCloseTo(32.9, 2);
  });
});

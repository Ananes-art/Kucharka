import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import sharp from "sharp";
import tesseract from "node-tesseract-ocr";
import { env } from "../env.js";

// Předzpracování fotky účtenky pro lepší OCR: šedotón, zvětšení kontrastu.
async function preprocess(inputPath: string): Promise<string> {
  const out = join(tmpdir(), `ocr-${randomUUID()}.png`);
  await sharp(inputPath)
    .rotate()
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: 2000, withoutEnlargement: true })
    .toFile(out);
  return out;
}

export async function runOcr(imagePath: string): Promise<string> {
  const pre = await preprocess(imagePath);
  try {
    const text = await tesseract.recognize(pre, {
      lang: env.ocrLang,
      oem: 1,
      psm: 6, // predpokládáme blok textu
    });
    return text ?? "";
  } finally {
    await unlink(pre).catch(() => {});
  }
}

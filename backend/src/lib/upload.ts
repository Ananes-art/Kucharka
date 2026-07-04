import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { env } from "../env.js";

await mkdir(env.uploadDir, { recursive: true });

// Uloží nahraný soubor, u obrázků zmenší na rozumnou velikost.
export async function saveUpload(buffer: Buffer, originalName: string): Promise<string> {
  const ext = (extname(originalName) || ".jpg").toLowerCase();
  const name = `${randomUUID()}${ext === ".jpeg" ? ".jpg" : ext}`;
  const dest = join(env.uploadDir, name);

  const isImage = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(ext);
  if (isImage) {
    try {
      await sharp(buffer)
        .rotate() // podle EXIF
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(dest.replace(ext, ".jpg"));
      return dest.replace(ext, ".jpg").split("/").pop()!;
    } catch {
      // fallback: uložit tak jak je
    }
  }
  await writeFile(dest, buffer);
  return name;
}

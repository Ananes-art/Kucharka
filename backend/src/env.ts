export const env = {
  port: Number(process.env.PORT ?? 3000),
  uploadDir: process.env.UPLOAD_DIR ?? new URL("../uploads", import.meta.url).pathname,
  ocrLang: process.env.OCR_LANG ?? "ces",
};

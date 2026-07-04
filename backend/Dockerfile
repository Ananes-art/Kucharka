FROM docker.io/library/node:22-bookworm-slim

# Tesseract OCR + české jazykové data, openssl pro Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-ces \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# závislosti (povolíme install skripty kvůli prisma/sharp)
COPY package.json package-lock.json* ./
RUN npm install

# Prisma schema + generování klienta
COPY prisma ./prisma
RUN npx prisma generate

# zdroj a build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN mkdir -p /app/uploads
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

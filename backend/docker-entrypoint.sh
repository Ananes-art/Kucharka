#!/bin/sh
set -e

echo "→ Čekám na databázi a aplikuji schéma (prisma db push)…"
tries=0
until npx prisma db push --skip-generate; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "Databáze nedostupná, končím."
    exit 1
  fi
  echo "   …databáze ještě není připravená (pokus $tries), čekám 2 s"
  sleep 2
done

echo "→ Seed základního číselníku surovin…"
npm run seed || echo "Seed přeskočen"

echo "→ Startuji backend…"
exec node dist/index.js

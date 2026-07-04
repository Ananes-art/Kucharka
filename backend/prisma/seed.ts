import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Základní číselník běžných surovin. baseUnit: g | ml | ks
const INGREDIENTS: { name: string; category: string; baseUnit: string }[] = [
  { name: "Mouka hladká", category: "Trvanlivé", baseUnit: "g" },
  { name: "Mouka polohrubá", category: "Trvanlivé", baseUnit: "g" },
  { name: "Cukr krystal", category: "Trvanlivé", baseUnit: "g" },
  { name: "Cukr moučka", category: "Trvanlivé", baseUnit: "g" },
  { name: "Sůl", category: "Trvanlivé", baseUnit: "g" },
  { name: "Rýže", category: "Trvanlivé", baseUnit: "g" },
  { name: "Těstoviny", category: "Trvanlivé", baseUnit: "g" },
  { name: "Vejce", category: "Chlazené", baseUnit: "ks" },
  { name: "Mléko", category: "Mléčné", baseUnit: "ml" },
  { name: "Máslo", category: "Mléčné", baseUnit: "g" },
  { name: "Smetana ke šlehání", category: "Mléčné", baseUnit: "ml" },
  { name: "Jogurt bílý", category: "Mléčné", baseUnit: "g" },
  { name: "Sýr eidam", category: "Mléčné", baseUnit: "g" },
  { name: "Chléb", category: "Pečivo", baseUnit: "ks" },
  { name: "Rohlík", category: "Pečivo", baseUnit: "ks" },
  { name: "Kuřecí prsa", category: "Maso", baseUnit: "g" },
  { name: "Mleté maso", category: "Maso", baseUnit: "g" },
  { name: "Šunka", category: "Maso", baseUnit: "g" },
  { name: "Brambory", category: "Zelenina", baseUnit: "g" },
  { name: "Cibule", category: "Zelenina", baseUnit: "ks" },
  { name: "Česnek", category: "Zelenina", baseUnit: "ks" },
  { name: "Rajče", category: "Zelenina", baseUnit: "ks" },
  { name: "Paprika", category: "Zelenina", baseUnit: "ks" },
  { name: "Mrkev", category: "Zelenina", baseUnit: "ks" },
  { name: "Jablko", category: "Ovoce", baseUnit: "ks" },
  { name: "Banán", category: "Ovoce", baseUnit: "ks" },
  { name: "Olej", category: "Trvanlivé", baseUnit: "ml" },
  { name: "Olivový olej", category: "Trvanlivé", baseUnit: "ml" },
  { name: "Kečup", category: "Trvanlivé", baseUnit: "g" },
];

async function main() {
  for (const ing of INGREDIENTS) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {},
      create: ing,
    });
  }
  console.log(`Seed hotov: ${INGREDIENTS.length} surovin`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

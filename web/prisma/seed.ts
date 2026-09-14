import { PrismaClient } from "@prisma/client";
import { themes } from "../data/seed-vocab";

const prisma = new PrismaClient();

async function main() {
  for (const theme of themes) {
    const row = await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: {
        nameZh: theme.nameZh,
        emoji: theme.emoji,
        sentenceTemplate: theme.sentenceTemplate,
        sortOrder: theme.sortOrder,
      },
      create: {
        slug: theme.slug,
        nameZh: theme.nameZh,
        emoji: theme.emoji,
        sentenceTemplate: theme.sentenceTemplate,
        sortOrder: theme.sortOrder,
      },
    });

    for (const w of theme.words) {
      await prisma.word.upsert({
        where: {
          english_themeId: { english: w.english, themeId: row.id },
        },
        update: {
          chinese: w.chinese,
          emoji: w.emoji ?? "⭐",
          level: w.level ?? 1,
          collocation: w.collocation,
          example: w.example ?? `I know "${w.english}".`,
        },
        create: {
          english: w.english,
          chinese: w.chinese,
          emoji: w.emoji ?? "⭐",
          level: w.level ?? 1,
          collocation: w.collocation,
          example:
            w.example ??
            theme.sentenceTemplate.replace("_____", w.english),
          themeId: row.id,
        },
      });
    }
  }

  const count = await prisma.word.count();
  console.log(`Seeded ${themes.length} themes, ${count} words`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- AlterTable: add food warehouse fields to ChildProfile
ALTER TABLE "ChildProfile" ADD COLUMN "foodBalance" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "foodEarnedDateKey" TEXT,
ADD COLUMN "foodEarnedToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "foodSettledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve existing pet food balances onto the child profile
UPDATE "ChildProfile" AS c
SET "foodBalance" = GREATEST(p."foodBalance", 60)
FROM "Pet" AS p
WHERE p."childId" = c."id";

-- AlterTable: food lives on ChildProfile now
ALTER TABLE "Pet" DROP COLUMN "foodBalance";

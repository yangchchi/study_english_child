-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "foodBalance" INTEGER NOT NULL DEFAULT 0,
    "lastFedDateKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'alive',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "adoptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pet_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pet_childId_key" ON "Pet"("childId");

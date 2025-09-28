-- CreateTable
CREATE TABLE "public"."Analytics" (
    "id" SERIAL NOT NULL,
    "paperId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebsiteFeedback" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "browserId" TEXT NOT NULL,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteFeedback_browserId_key" ON "public"."WebsiteFeedback"("browserId");

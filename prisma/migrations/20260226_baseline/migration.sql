-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "displayTitle" TEXT NOT NULL,
    "tvgName" TEXT,
    "tvgId" TEXT,
    "groupTitle" TEXT NOT NULL,
    "logoUrl" TEXT,
    "posterUrl" TEXT,
    "url" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "quality" TEXT,
    "codec" TEXT,
    "year" INTEGER,
    "isLegendado" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "displayTitle" TEXT NOT NULL,
    "tvgName" TEXT,
    "tvgId" TEXT,
    "groupTitle" TEXT NOT NULL,
    "logoUrl" TEXT,
    "posterUrl" TEXT,
    "url" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "quality" TEXT,
    "codec" TEXT,
    "year" INTEGER,
    "isLegendado" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "groupTitle" TEXT NOT NULL,
    "logoUrl" TEXT,
    "posterUrl" TEXT,
    "searchText" TEXT,
    "seasonCount" INTEGER NOT NULL DEFAULT 0,
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "seriesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "displayTitle" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "tvgName" TEXT,
    "tvgId" TEXT,
    "groupTitle" TEXT NOT NULL,
    "logoUrl" TEXT,
    "posterUrl" TEXT,
    "url" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "quality" TEXT,
    "codec" TEXT,
    "year" INTEGER,
    "isLegendado" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT,
    "seasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Channel_groupTitle_idx" ON "Channel"("groupTitle");

-- CreateIndex
CREATE INDEX "Channel_searchText_idx" ON "Channel"("searchText");

-- CreateIndex
CREATE INDEX "Channel_groupTitle_displayTitle_idx" ON "Channel"("groupTitle", "displayTitle");

-- CreateIndex
CREATE INDEX "Channel_quality_idx" ON "Channel"("quality");

-- CreateIndex
CREATE INDEX "Channel_codec_idx" ON "Channel"("codec");

-- CreateIndex
CREATE INDEX "Channel_isLegendado_idx" ON "Channel"("isLegendado");

-- CreateIndex
CREATE INDEX "Channel_year_idx" ON "Channel"("year");

-- CreateIndex
CREATE INDEX "Movie_groupTitle_idx" ON "Movie"("groupTitle");

-- CreateIndex
CREATE INDEX "Movie_searchText_idx" ON "Movie"("searchText");

-- CreateIndex
CREATE INDEX "Movie_groupTitle_displayTitle_idx" ON "Movie"("groupTitle", "displayTitle");

-- CreateIndex
CREATE INDEX "Movie_quality_idx" ON "Movie"("quality");

-- CreateIndex
CREATE INDEX "Movie_codec_idx" ON "Movie"("codec");

-- CreateIndex
CREATE INDEX "Movie_isLegendado_idx" ON "Movie"("isLegendado");

-- CreateIndex
CREATE INDEX "Movie_year_idx" ON "Movie"("year");

-- CreateIndex
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");

-- CreateIndex
CREATE INDEX "Series_groupTitle_idx" ON "Series"("groupTitle");

-- CreateIndex
CREATE INDEX "Series_searchText_idx" ON "Series"("searchText");

-- CreateIndex
CREATE INDEX "Series_groupTitle_title_idx" ON "Series"("groupTitle", "title");

-- CreateIndex
CREATE INDEX "Series_episodeCount_idx" ON "Series"("episodeCount");

-- CreateIndex
CREATE UNIQUE INDEX "Season_seriesId_seasonNumber_key" ON "Season"("seriesId", "seasonNumber");

-- CreateIndex
CREATE INDEX "Episode_searchText_idx" ON "Episode"("searchText");

-- CreateIndex
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;


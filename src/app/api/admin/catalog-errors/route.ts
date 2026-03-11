import { NextResponse } from 'next/server';
import { prisma } from '@infrastructure/database/prisma';
import { createClient } from '@infrastructure/supabase/server';
import {
  getSeriesDetailsSummary,
  searchMovies,
  searchSeries,
} from '@services/catalog/db-store';

type CatalogError = {
  id: string;
  title: string;
  type: 'broken_link' | 'missing_metadata' | 'source_unavailable';
  date: string;
};

const DIAGNOSTIC_PAGE_SIZE = 25;
const SERIES_DETAIL_SAMPLE_SIZE = 5;

function buildSourceUnavailableError(
  scope: 'movies' | 'series',
  date: string,
): CatalogError {
  if (scope === 'movies') {
    return {
      id: 'catalog_movies_source',
      title: 'Fonte de filmes indisponível',
      type: 'source_unavailable',
      date,
    };
  }

  return {
    id: 'catalog_series_source',
    title: 'Fonte de séries indisponível',
    type: 'source_unavailable',
    date,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const errors: CatalogError[] = [];
  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());

  const [moviesResult, seriesResult] = await Promise.allSettled([
    searchMovies({ page: 1, pageSize: DIAGNOSTIC_PAGE_SIZE }),
    searchSeries({ page: 1, pageSize: DIAGNOSTIC_PAGE_SIZE }),
  ]);

  if (moviesResult.status !== 'fulfilled') {
    console.error(
      '[admin/catalog-errors] Falha ao carregar filmes para diagnostico.',
      moviesResult.reason,
    );
    errors.push(buildSourceUnavailableError('movies', currentDate));
  }

  if (moviesResult.status === 'fulfilled') {
    if (moviesResult.value.items.length === 0) {
      errors.push(buildSourceUnavailableError('movies', currentDate));
    }

    moviesResult.value.items.forEach((movie) => {
      if (movie.posterUrl) {
        return;
      }

      errors.push({
        id: movie.id,
        title: movie.title,
        type: 'missing_metadata',
        date: currentDate,
      });
    });
  }

  if (seriesResult.status !== 'fulfilled') {
    console.error(
      '[admin/catalog-errors] Falha ao carregar series para diagnostico.',
      seriesResult.reason,
    );
    errors.push(buildSourceUnavailableError('series', currentDate));
  }

  if (seriesResult.status === 'fulfilled') {
    if (seriesResult.value.items.length === 0) {
      errors.push(buildSourceUnavailableError('series', currentDate));
    }

    seriesResult.value.items.forEach((series) => {
      if (series.posterUrl) {
        return;
      }

      errors.push({
        id: series.id,
        title: series.title,
        type: 'missing_metadata',
        date: currentDate,
      });
    });

    const detailResults = await Promise.allSettled(
      seriesResult.value.items
        .slice(0, SERIES_DETAIL_SAMPLE_SIZE)
        .map((series) => getSeriesDetailsSummary(series.id)),
    );

    detailResults.forEach((detailResult, index) => {
      const series = seriesResult.value.items[index];
      if (!series) {
        return;
      }

      if (detailResult.status !== 'fulfilled') {
        console.error(
          '[admin/catalog-errors] Falha ao validar detalhes da serie.',
          detailResult.reason,
        );
        errors.push({
          id: series.id,
          title: series.title,
          type: 'broken_link',
          date: currentDate,
        });
        return;
      }

      const details = detailResult.value;
      if (!details) {
        errors.push({
          id: series.id,
          title: series.title,
          type: 'broken_link',
          date: currentDate,
        });
        return;
      }

      if (details.seasonCount > 0 && details.episodeCount > 0) {
        return;
      }

      errors.push({
        id: series.id,
        title: series.title,
        type: 'broken_link',
        date: currentDate,
      });
    });
  }

  return NextResponse.json(errors.slice(0, 50));
}

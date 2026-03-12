import { NextResponse } from 'next/server';
import { prisma } from '@infrastructure/database/prisma';
import { getSafeAuthUser } from '@infrastructure/supabase/auth';
import { createClient } from '@infrastructure/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    clearInvalidSession: true,
    logContext: 'admin/health',
  });

  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const results = {
    database: { status: 'offline', latencyMs: 0 },
    supabase: { status: 'offline', latencyMs: 0 },
    tmdb: { status: 'offline', latencyMs: 0 },
  };

  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    results.database = { status: 'online', latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    console.error("[admin/health] Falha no ping do Prisma.", error);
  }

  try {
    const start = performance.now();
    await supabase.auth.getSession();
    results.supabase = { status: 'online', latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    console.error("[admin/health] Falha no ping do Supabase.", error);
  }

  try {
    const start = performance.now();
    const tmdbRes = await fetch('https://api.themoviedb.org/3/configuration', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
      },
    });
    if (tmdbRes.ok) {
      results.tmdb = { status: 'online', latencyMs: Math.round(performance.now() - start) };
    }
  } catch (error) {
    console.error("[admin/health] Falha no ping do TMDB.", error);
  }

  return NextResponse.json(results);
}

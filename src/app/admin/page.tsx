'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Activity, TrendingUp, Clock, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { FuturisticBackground } from '@components/backgrounds/futuristic-background';
import { SidebarTrigger } from '@components/ui/sidebar';
import {
  getAdminMetrics, type AdminMetrics
} from '@infrastructure/api/admin-api';
import { isRequestCanceledError } from '@infrastructure/http/axios-client';
import { cn } from '@shared/utils';
import { ActivityFeed } from '@/app/admin/_components/overview/activity-feed';
import { formatUptime } from '@/app/admin/_components/overview/format-uptime';
import { LiveStatusToast } from '@/app/admin/_components/overview/live-status-toast';
import { OverviewFavoritesChart } from '@/app/admin/_components/overview/overview-favorites-chart';
import { OverviewGrowthChart } from '@/app/admin/_components/overview/overview-growth-chart';
import { OverviewStatCard } from '@/app/admin/_components/overview/overview-stat-card';
import { OverviewWatchingNowChart } from '@/app/admin/_components/overview/overview-watching-now-chart';

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const metricsControllerRef = useRef<AbortController | null>(null);

  const fetchMetrics = useCallback(async () => {
    metricsControllerRef.current?.abort();
    const controller = new AbortController();
    metricsControllerRef.current = controller;
    setLoadingMetrics(true);
    try {
      const data = await getAdminMetrics({ signal: controller.signal });
      setMetrics(data);
    } catch (error) {
      if (isRequestCanceledError(error)) return;
      console.error("[admin/overview] Falha ao carregar metricas.", error);
    }
    finally {
      if (metricsControllerRef.current === controller) {
        metricsControllerRef.current = null;
      }
      if (!controller.signal.aborted) {
        setLoadingMetrics(false);
      }
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => () => metricsControllerRef.current?.abort(), []);
  useEffect(() => {
    const id = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const topFavorites = metrics?.topFavorites ?? [];
  const watchingNow = metrics?.watchingNow ?? [];
  const growth = metrics?.growth ?? [];
  const totalUsers = metrics?.totalUsers ?? '—';
  const activeUsers = metrics?.activeUsers ?? '—';
  const liveStreams = watchingNow.length || '—';
  const hasWatchingNow = watchingNow.length > 0;
  const totalUsersTrend = [10, 15, 25, 22, 30, 45, metrics?.totalUsers ? Number(metrics.totalUsers) : 50];
  const activeUsersTrend = [5, 12, 8, 15, 22, 18, metrics?.activeUsers ? Number(metrics.activeUsers) : 20];
  const liveStreamsTrend = [2, 4, 3, 7, 5, 8, watchingNow.length || 8];
  const maxFavoriteCount = topFavorites.reduce(
    (highestCount, favorite) => Math.max(highestCount, favorite.count),
    0,
  ) || 100;
  const radarData = topFavorites.slice(0, 5).map((favorite) => ({
    subject: favorite.id.slice(0, 12),
    A: favorite.count,
    fullMark: maxFavoriteCount,
  }));
  const liveTimestamp = metrics?.timestamp ?? null;

  const statCards = [
    {
      title: 'Usuários Totais',
      value: totalUsers,
      icon: Users,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      sub: 'Registrados',
      delay: 0,
      trendData: totalUsersTrend,
    },
    {
      title: 'Ativos Agora',
      value: activeUsers,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      sub: 'Últimos 5 min',
      delay: 0.1,
      trendData: activeUsersTrend,
    },
    {
      title: 'Streams ao Vivo',
      value: liveStreams,
      icon: TrendingUp,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      sub: 'Conteúdos únicos',
      delay: 0.2,
      trendData: liveStreamsTrend,
    },
    {
      title: 'Desde',
      value: formatUptime(metrics?.uptimeSeconds),
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      sub: 'Tempo de atividade real',
      delay: 0.3,
    },
  ] as const;

  return (
    <main className="relative p-4 xs:p-6 sm:p-8 overflow-x-hidden">
      <FuturisticBackground />

      <div className="relative z-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="bg-zinc-900 border border-white/10 text-white" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">
                Visão <span className="text-emerald-500">Geral</span>
              </h1>
              <p className="text-zinc-500 font-bold tracking-[0.2em] uppercase text-[10px] mt-1">
                Monitoramento de Atividade
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Badge variant="outline" className="h-8 px-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-bold">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
              LIVE
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              disabled={loadingMetrics}
              onClick={() => fetchMetrics()}
              className="border border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white w-full sm:w-auto mt-2 sm:mt-0"
            >
              <RefreshCw className={cn("size-4 mr-2", loadingMetrics && "animate-spin")} />
              {loadingMetrics ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <OverviewStatCard key={card.title} {...card} />
          ))}
        </div>

        {/* ─── Charts row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <motion.div
            className="md:col-span-2 xl:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <OverviewGrowthChart growth={growth} loading={loadingMetrics} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <OverviewFavoritesChart loading={loadingMetrics} radarData={radarData} />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {hasWatchingNow ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="md:col-span-2 xl:col-span-2">
              <OverviewWatchingNowChart items={watchingNow} />
            </motion.div>
          ) : (
            <div className="md:col-span-2 xl:col-span-2 hidden xl:block" />
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="md:col-span-2 xl:col-span-1 h-[340px]">
            <ActivityFeed />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        <LiveStatusToast timestamp={liveTimestamp} />
      </AnimatePresence>
    </main>
  );
}

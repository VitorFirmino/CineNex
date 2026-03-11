'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Star, PlayCircle, Eye, TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { FuturisticBackground } from '@components/backgrounds/futuristic-background';
import { SidebarTrigger } from '@components/ui/sidebar';
import {
  getAdminMetrics,
  getCatalogErrors,
  type AdminMetrics,
  type CatalogError,
} from '@infrastructure/api/admin-api';
import { isRequestCanceledError } from '@infrastructure/http/axios-client';
import { cn } from '@shared/utils';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@components/ui/dialog';
import { Badge } from '@components/ui/badge';

export default function ContentPerformancePage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [errors, setErrors] = useState<CatalogError[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(true);
  const metricsControllerRef = useRef<AbortController | null>(null);
  const errorsControllerRef = useRef<AbortController | null>(null);

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
      console.error('Error fetching admin metrics', error);
    } finally {
      if (metricsControllerRef.current === controller) {
        metricsControllerRef.current = null;
      }
      if (!controller.signal.aborted) {
        setLoadingMetrics(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const loadErrors = async () => {
      errorsControllerRef.current?.abort();
      const controller = new AbortController();
      errorsControllerRef.current = controller;
      try {
        const data = await getCatalogErrors({ signal: controller.signal });
        setErrors(data);
      } catch (err) {
        if (isRequestCanceledError(err)) return;
        console.error('Error fetching catalog errors', err);
      } finally {
        if (errorsControllerRef.current === controller) {
          errorsControllerRef.current = null;
        }
        if (!controller.signal.aborted) {
          setLoadingErrors(false);
        }
      }
    };

    void loadErrors();
    return () => {
      metricsControllerRef.current?.abort();
      errorsControllerRef.current?.abort();
    };
  }, [fetchMetrics]);

  return (
    <main className="min-h-screen relative p-4 xs:p-6 sm:p-8 overflow-x-hidden">
      <FuturisticBackground />

      <div className="relative z-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="bg-zinc-900 border border-white/10 text-white" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">
                Performance <span className="text-emerald-500">Catálogo</span>
              </h1>
              <p className="text-zinc-500 font-bold tracking-[0.2em] uppercase text-[10px] mt-1">
                Estatísticas de Filmes e Séries
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchMetrics()}
            disabled={loadingMetrics}
            className="border border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white shrink-0"
          >
            <RefreshCw className={cn("size-4 mr-2", loadingMetrics && "animate-spin")} /> Atualizar Dados
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 h-full">
              <CardHeader className="border-b border-white/5 px-6 py-4">
                <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Star className="size-4 text-amber-500" />
                  Conteúdos Mais Favoritados (Geral)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingMetrics ? (
                  <div className="p-6 flex flex-col gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (metrics?.topFavorites?.length ?? 0) === 0 ? (
                  <div className="p-10 text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                    Nenhum favorito registrado.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {metrics!.topFavorites.map((f, i) => (
                      <div key={`${f.type}-${f.id}`} className="px-6 py-4 border-b border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-black text-zinc-700 italic w-4">{i + 1}</div>
                          <div>
                            <p className="text-sm font-bold text-white capitalize">{f.id.replace(/-/g, ' ')}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{f.type === 'movie' ? 'Filme' : 'Série'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tabular-nums">
                            {f.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 h-full overflow-hidden">
              <CardHeader className="border-b border-white/5 px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <PlayCircle className="size-4 text-emerald-500" />
                  Top Visualizações (7 Dias)
                </CardTitle>
                <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {[
                    { name: 'O Urso (The Bear)', views: 1240, type: 'Série', percent: 85 },
                    { name: 'Duna: Parte 2', views: 980, type: 'Filme', percent: 70 },
                    { name: 'Ruptura (Severance)', views: 855, type: 'Série', percent: 62 },
                    { name: 'Oppenheimer', views: 620, type: 'Filme', percent: 45 },
                    { name: 'Xógum (Shogun)', views: 590, type: 'Série', percent: 40 },
                  ].map((item, i) => (
                    <div key={i} className="px-6 py-4 border-b border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors relative group overflow-hidden">
                      <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/20" style={{ width: `${item.percent}%` }} />
                      <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] opacity-0 group-hover:opacity-100 transition-all duration-500" style={{ width: `${item.percent}%` }} />

                      <div className="flex items-center gap-4 relative z-10 w-full">
                        <div className="text-lg font-black text-zinc-700 italic w-4 shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{item.type}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <div className="text-sm font-black text-white tabular-nums flex items-center gap-1.5 border border-white/5 bg-white/5 px-2 py-1 rounded-md">
                            <Eye className="size-3.5 text-zinc-500" /> {item.views.toLocaleString()}
                          </div>
                          <span className="text-[9px] text-emerald-500 font-bold flex items-center mt-1">
                            <TrendingUp className="size-2.5 mr-1" /> +12%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-1 lg:col-span-2">
            <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-500/80" />
                  Relatório de Saúde do Catálogo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4">
                    <p className="text-2xl font-black text-rose-400/90 tabular-nums">
                      {loadingErrors ? '...' : errors.filter((e: CatalogError) => e.type === 'broken_link').length}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em] mt-1 flex items-center gap-1.5 hover:text-rose-400/80 transition-colors cursor-default">
                      Links Quebrados/Vazios <span className="text-rose-500/50">•</span>
                    </p>
                  </div>
                  <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4">
                    <p className="text-2xl font-black text-amber-500/80 tabular-nums">
                      {loadingErrors ? '...' : errors.filter((e: CatalogError) => e.type === 'missing_metadata').length}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em] mt-1 flex items-center gap-1.5 hover:text-amber-500/80 transition-colors cursor-default">
                      Metadados Ausentes <span className="text-amber-500/50">•</span>
                    </p>
                  </div>
                  <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 space-y-4">
                    <div>
                      <p className="text-2xl font-black text-sky-400/90 tabular-nums">
                        {loadingErrors ? '...' : errors.filter((e: CatalogError) => e.type === 'source_unavailable').length}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em] mt-1 flex items-center gap-1.5 hover:text-sky-400/80 transition-colors cursor-default">
                        Fonte Indisponível <span className="text-sky-500/50">•</span>
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors">
                          Ver Relatório Completo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950/95 border-emerald-500/20 backdrop-blur-3xl shadow-[0_0_50px_rgba(16,185,129,0.1)] sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-emerald-500 font-black tracking-widest uppercase text-sm flex items-center gap-2 border-b border-emerald-500/10 pb-4">
                            <AlertCircle className="size-4" /> Diagnóstico do Catálogo em Tempo Real
                          </DialogTitle>
                          <DialogDescription className="text-zinc-500 text-xs font-bold uppercase tracking-[0.16em]">
                            Lista resumida dos problemas detectados na fonte atual de filmes e séries.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar mt-4">
                          {errors.length === 0 && !loadingErrors && (
                            <div className="text-center py-8 text-zinc-500 font-bold uppercase tracking-widest text-xs">
                              <CheckCircle2 className="size-8 mx-auto mb-3 text-emerald-500/50" />
                              Nenhum problema encontrado no catálogo atual.
                            </div>
                          )}
                          {loadingErrors && (
                            <div className="text-center py-8 text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando diagnóstico...</div>
                          )}
                          {!loadingErrors && errors.map((err: CatalogError, i: number) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-colors">
                              <div className="flex flex-col gap-1 w-full max-w-[280px]">
                                <span className="text-white font-bold text-sm truncate" title={err.title}>{err.title}</span>
                                <span className="text-zinc-500 font-mono text-[10px] uppercase truncate" title={err.id}>{err.id}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {err.type === 'broken_link' ? (
                                  <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] uppercase tracking-widest px-2 py-0.5">
                                    Link Quebrado
                                  </Badge>
                                ) : err.type === 'source_unavailable' ? (
                                  <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[9px] uppercase tracking-widest px-2 py-0.5">
                                    Fonte Indisponível
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] uppercase tracking-widest px-2 py-0.5">
                                    Sem Metadados
                                  </Badge>
                                )}
                                <span className="text-zinc-600 text-[10px] font-bold min-w-16 text-right whitespace-nowrap">{err.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

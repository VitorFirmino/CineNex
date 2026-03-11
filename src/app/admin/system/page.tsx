'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Server, Database, Globe, Key, RefreshCw, CheckCircle2, XCircle,
  HardDrive, AlertTriangle, ShieldAlert, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { FuturisticBackground } from '@components/backgrounds/futuristic-background';
import { SidebarTrigger } from '@components/ui/sidebar';
import {
  clearNextDataCache,
  clearOtherSessions,
  getMaintenanceStatus,
  getSystemHealth,
  setMaintenanceStatus,
  type SystemHealth,
} from '@infrastructure/api/admin-api';
import { isRequestCanceledError } from '@infrastructure/http/axios-client';

export default function SystemPage() {
  const [checking, setChecking] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearingSessions, setClearingSessions] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const maintenanceControllerRef = useRef<AbortController | null>(null);
  const healthControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadMaintenanceStatus = async () => {
      maintenanceControllerRef.current?.abort();
      const controller = new AbortController();
      maintenanceControllerRef.current = controller;
      try {
        const data = await getMaintenanceStatus({ signal: controller.signal });
        if (data.maintenance !== undefined) setMaintenance(data.maintenance);
      } catch (error) {
        if (isRequestCanceledError(error)) return;
        console.error('[admin/system] Falha ao carregar status de manutencao.', error);
      } finally {
        if (maintenanceControllerRef.current === controller) {
          maintenanceControllerRef.current = null;
        }
      }
    };

    void loadMaintenanceStatus();
    return () => maintenanceControllerRef.current?.abort();
  }, []);

  const handleMaintenanceToggle = async (checked: boolean) => {
    setMaintenance(checked);
    try {
      await setMaintenanceStatus(checked);
    } catch (error) {
      console.error('[admin/system] Falha ao atualizar modo de manutencao.', error);
      setMaintenance(!checked);
    }
  };

  const handleClearSessions = async () => {
    if (!window.confirm('Tem certeza que deseja encerrar todas as outras sessões?')) return;
    setClearingSessions(true);
    try {
      await clearOtherSessions();
      alert('Todas as sessões ativas (exceto a sua) foram encerradas.');
    } finally {
      setClearingSessions(false);
    }
  };

  const performCheck = async () => {
    healthControllerRef.current?.abort();
    const controller = new AbortController();
    healthControllerRef.current = controller;
    setChecking(true);
    try {
      const data = await getSystemHealth({ signal: controller.signal });
      setHealth(data);
    } catch (error) {
      if (isRequestCanceledError(error)) return;
      console.error('[admin/system] Falha ao verificar saude do sistema.', error);
    } finally {
      if (healthControllerRef.current === controller) {
        healthControllerRef.current = null;
      }
      if (!controller.signal.aborted) {
        setChecking(false);
      }
    }
  };

  useEffect(() => {
    void performCheck();
    return () => healthControllerRef.current?.abort();
  }, []);

  return (
    <main className="min-h-screen relative p-4 xs:p-6 sm:p-8 overflow-x-hidden">
      <FuturisticBackground />

      <div className="relative z-10 max-w-4xl space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="bg-zinc-900 border border-white/10 text-white" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">
                Status do <span className="text-emerald-500">Sistema</span>
              </h1>
              <p className="text-zinc-500 font-bold tracking-[0.2em] uppercase text-[10px] mt-1">
                Serviços e Integrações
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={performCheck}
            disabled={checking}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold tracking-wide shrink-0"
          >
            <RefreshCw className={`size-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Verificando...' : 'Testar Conexões'}
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
              <Server className="size-4" /> Status da Infraestrutura
            </h2>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 hover:border-emerald-500/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <CardTitle className="text-sm font-black text-white flex items-center gap-3">
                    <Database className="size-4 text-emerald-500" /> PostgreSQL (Prisma)
                  </CardTitle>
                  {health?.database?.status === 'online' ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-red-500" />}
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-xs text-zinc-400">
                    {health?.database?.status === 'online' ? `Conexão estável. Pooling ativo. Latência: ~${health.database.latencyMs}ms` : 'Serviço fora do ar ou não responde.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 hover:border-emerald-500/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <CardTitle className="text-sm font-black text-white flex items-center gap-3">
                    <Key className="size-4 text-emerald-500" /> Supabase Auth
                  </CardTitle>
                  {health?.supabase?.status === 'online' ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-red-500" />}
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-xs text-zinc-400">
                    {health?.supabase?.status === 'online' ? `Serviço autenticador respondendo (Latência: ~${health.supabase.latencyMs}ms).` : 'Erro de autenticação interno.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 hover:border-emerald-500/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <CardTitle className="text-sm font-black text-white flex items-center gap-3">
                    <Globe className="size-4 text-emerald-500" /> TMDB API
                  </CardTitle>
                  {health?.tmdb?.status === 'online' ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-red-500" />}
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-xs text-zinc-400 text-emerald-500/80">
                    {health?.tmdb?.status === 'online' ? `Rate limit: OK. Latência do provedor de metadados: ~${health.tmdb.latencyMs}ms.` : 'Timeout. O TMDB pode estar rate-limiting ou fora do ar.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>


          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
              <Zap className="size-4" /> Configurações Globais
            </h2>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="bg-zinc-950/80 backdrop-blur-xl border-white/10 group">
                <CardHeader className="p-5">
                  <CardTitle className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/5 pb-3">
                    <ShieldAlert className="size-5 text-amber-500" /> Controle de Acesso
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 space-y-6">
                  <div className="flex flex-row items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="space-y-1 max-w-[70%]">
                      <p className="text-sm font-bold text-white">Modo de Manutenção</p>
                      <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-widest font-bold">
                        Derruba sessões ativas (exceto ADMIN) e exibe tela de manutenção no app inteiro.
                      </p>
                    </div>
                    <Switch
                      checked={maintenance}
                      onCheckedChange={handleMaintenanceToggle}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Ações Destrutivas</p>
                    <Button
                      variant="outline"
                      onClick={handleClearSessions}
                      disabled={clearingSessions}
                      className="w-full bg-red-500/5 hover:bg-red-500/15 border-red-500/20 text-red-400 hover:text-red-300 justify-start h-12"
                    >
                      {clearingSessions ? (
                        <RefreshCw className="size-4 mr-3 animate-spin" />
                      ) : (
                        <AlertTriangle className="size-4 mr-3" />
                      )}
                      Encerrar Todas as Sessões Ativas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="bg-zinc-950/80 backdrop-blur-xl border-white/10 group">
                <CardHeader className="p-5">
                  <CardTitle className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/5 pb-3">
                    <HardDrive className="size-5 text-indigo-500" /> Armazenamento e Cache
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 space-y-4">
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Next.js Data Cache</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                        ~1.2GB · Catálogo e Metadados
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 w-32"
                      disabled={clearingCache}
                      onClick={async () => {
                        setClearingCache(true);
                        try {
                          await clearNextDataCache();
                          alert('Data cache do Next.js limpo com sucesso.');
                        } catch {
                          alert('Erro ao limpar cache.');
                        } finally {
                          setClearingCache(false);
                        }
                      }}
                    >
                      {clearingCache ? <RefreshCw className="size-4 animate-spin" /> : 'Limpar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}

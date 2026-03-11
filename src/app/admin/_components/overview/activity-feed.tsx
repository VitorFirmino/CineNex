'use client';

import { Activity } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { cn } from '@shared/utils';

const DUMMY_ACTIVITIES = [
  { id: 1, type: 'login', user: 'admin@cine...', time: '2 min atrás', desc: 'Sessão iniciada (IP: 192.168.1.1)' },
  { id: 2, type: 'signup', user: 'novo_cliente@...', time: '15 min atrás', desc: 'Registro concluído via Google' },
  { id: 3, type: 'error', user: 'System', time: '1h atrás', desc: 'Falha de timeout na API TMDB' },
  { id: 4, type: 'warning', user: 'System', time: '2h atrás', desc: 'Pico de tráfego detectado (>500 req/s)' },
  { id: 5, type: 'role_update', user: 'admin@cine...', time: '4h atrás', desc: 'Promoveu joao@... para Admin' },
] as const;

type ActivityItem = (typeof DUMMY_ACTIVITIES)[number];

function getActivityDotClassName(type: ActivityItem['type']) {
  if (type === 'error') {
    return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  }

  if (type === 'warning') {
    return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
  }

  if (type === 'signup') {
    return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  }

  return 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
}

function renderActivityBadge(type: ActivityItem['type']) {
  if (type === 'error') {
    return <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-red-500/20 text-red-400 bg-red-500/10 uppercase">Falha</Badge>;
  }

  if (type === 'warning') {
    return <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-amber-500/20 text-amber-400 bg-amber-500/10 uppercase">Aviso</Badge>;
  }

  if (type === 'signup') {
    return <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-emerald-500/20 text-emerald-400 bg-emerald-500/10 uppercase">Novo</Badge>;
  }

  return null;
}

export function ActivityFeed() {
  return (
    <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 h-full flex flex-col relative overflow-hidden group/feed">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none opacity-50 group-hover/feed:opacity-100 transition-opacity duration-1000" />

      <CardHeader className="border-b border-white/5 px-6 py-4 relative z-10 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Activity className="size-4 text-emerald-500 font-bold" />
          Logs de Auditoria
        </CardTitle>
        <Badge variant="outline" className="text-[9px] font-bold text-zinc-500 border-white/10 bg-white/5 uppercase">Hoje</Badge>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="flex flex-col py-2">
          {DUMMY_ACTIVITIES.map((activity, index) => (
            <div key={activity.id} className="relative z-10 px-6 py-3 flex gap-4 transition-colors hover:bg-white/[0.02] group">
              <div className="relative flex flex-col items-center pt-1.5 shrink-0 w-5">
                {index !== DUMMY_ACTIVITIES.length - 1 && (
                  <div className="absolute top-6 bottom-[-24px] w-[1px] bg-white/[0.05]" />
                )}

                <div
                  className={cn(
                    'relative z-10 size-3 rounded-full border-2 border-zinc-950/80 shadow-[0_0_12px_rgba(0,0,0,0.5)]',
                    getActivityDotClassName(activity.type),
                  )}
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                      {activity.user}
                    </span>
                    {renderActivityBadge(activity.type)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest whitespace-nowrap pt-0.5">
                    {activity.time}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium group-hover:text-zinc-400 transition-colors">
                  {activity.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { AdminChartTooltip } from '@/app/admin/_components/overview/admin-chart-tooltip';
import type { AdminMetrics } from '@infrastructure/api/admin-api';

const CHART_EMERALD = '#10b981';

interface OverviewGrowthChartProps {
  growth: AdminMetrics['growth'];
  loading: boolean;
}

export function OverviewGrowthChart({
  growth,
  loading,
}: OverviewGrowthChartProps) {
  if (loading) {
    return (
      <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 h-full">
        <CardHeader className="border-b border-white/5 px-6 py-4">
          <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Users className="size-4 text-emerald-500" />
            Novos Registros — Últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-52 animate-pulse bg-white/5 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 h-full">
      <CardHeader className="border-b border-white/5 px-6 py-4">
        <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Users className="size-4 text-emerald-500" />
          Novos Registros — Últimos 7 dias
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={growth} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_EMERALD} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_EMERALD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(date: string) => date.slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<AdminChartTooltip />} />
            <Area
              type="monotone"
              dataKey="users"
              name="Novos"
              stroke={CHART_EMERALD}
              strokeWidth={2}
              fill="url(#grad-users)"
              dot={{ fill: CHART_EMERALD, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

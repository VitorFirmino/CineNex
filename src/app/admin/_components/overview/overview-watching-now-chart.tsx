'use client';

import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { AdminChartTooltip } from '@/app/admin/_components/overview/admin-chart-tooltip';
import type { AdminMetrics } from '@infrastructure/api/admin-api';

const CHART_INDIGO = '#6366f1';

interface OverviewWatchingNowChartProps {
  items: AdminMetrics['watchingNow'];
}

export function OverviewWatchingNowChart({
  items,
}: OverviewWatchingNowChartProps) {
  if (items.length === 0) return null;

  const chartData = items.map((item) => ({
    name: item.content?.slice(0, 20) ?? '?',
    viewers: item.count,
  }));

  return (
    <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 h-full">
      <CardHeader className="border-b border-white/5 px-6 py-4">
        <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-500" />
          Assistindo Agora
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col justify-end">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 8, bottom: 0, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <Tooltip content={<AdminChartTooltip />} />
            <Bar dataKey="viewers" name="Viewers" fill={CHART_INDIGO} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

'use client';

import { TrendingUp } from 'lucide-react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { AdminChartTooltip } from '@/app/admin/_components/overview/admin-chart-tooltip';

interface FavoritesRadarItem {
  subject: string;
  A: number;
  fullMark: number;
}

interface OverviewFavoritesChartProps {
  loading: boolean;
  radarData: FavoritesRadarItem[];
}

export function OverviewFavoritesChart({
  loading,
  radarData,
}: OverviewFavoritesChartProps) {
  const shouldShowFallback = loading || radarData.length === 0;

  return (
    <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 h-full relative overflow-hidden group">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700" />
      <CardHeader className="border-b border-white/5 px-6 py-4 relative z-10">
        <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="size-4 text-purple-500" />
          Top Favoritos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 relative z-10">
        {shouldShowFallback ? (
          <div className="h-52 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
            {loading ? 'Carregando...' : 'Sem dados ainda'}
          </div>
        ) : (
          <div className="relative w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%" className="relative z-10">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 'auto']}
                  tick={{ fill: 'transparent' }}
                  axisLine={false}
                />
                <Radar
                  name="Favoritos"
                  dataKey="A"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.3}
                />
                <Tooltip
                  content={<AdminChartTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

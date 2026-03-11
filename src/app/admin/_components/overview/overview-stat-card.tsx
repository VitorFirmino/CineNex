'use client';

import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { cn } from '@shared/utils';

interface StatCardIconProps {
  className?: string;
}

interface OverviewStatCardProps {
  title: string;
  value: string | number;
  icon: ComponentType<StatCardIconProps>;
  color: string;
  bg: string;
  sub?: string;
  delay?: number;
  trendData?: number[];
}

export function OverviewStatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  sub,
  delay = 0,
  trendData,
}: OverviewStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="relative bg-zinc-950/40 backdrop-blur-2xl border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)]">
        <div className={cn('absolute inset-x-0 top-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-current to-transparent', color)} />
        <div className={cn('absolute -right-10 -bottom-10 size-40 rounded-full blur-3xl opacity-10 transition-transform group-hover:scale-110', bg)} />

        <CardHeader className="flex flex-row items-center justify-between pb-0 px-5 pt-5 space-y-0 relative z-10">
          <CardTitle className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">{title}</CardTitle>
          <div className={cn('p-2 rounded-xl border border-white/5 shadow-inner transition-transform group-hover:scale-110', bg, color)}>
            <Icon className="size-4" />
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-2 flex items-end justify-between relative z-10">
          <div>
            <p className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">{sub}</p>}
          </div>

          {trendData && trendData.length > 0 && (
            <div className={cn('h-10 w-20 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity', color)}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.map((val, i) => ({ val, i }))}>
                  <Line
                    type="monotone"
                    dataKey="val"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

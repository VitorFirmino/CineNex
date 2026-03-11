'use client';

interface AdminChartTooltipItem {
  value: number;
  name: string;
  color: string;
}

interface AdminChartTooltipProps {
  active?: boolean;
  payload?: AdminChartTooltipItem[];
  label?: string;
}

export function AdminChartTooltip({
  active,
  payload,
  label,
}: AdminChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur-xl px-3 py-2 text-xs shadow-2xl">
      {label && <p className="font-bold text-zinc-400 mb-1 uppercase tracking-widest text-[10px]">{label}</p>}
      {payload.map((item) => (
        <p key={item.name} className="font-mono font-bold" style={{ color: item.color }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

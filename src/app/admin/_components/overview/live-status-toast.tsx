'use client';

import { motion } from 'framer-motion';

interface LiveStatusToastProps {
  timestamp: string | null;
}

export function LiveStatusToast({
  timestamp,
}: LiveStatusToastProps) {
  if (!timestamp) return null;

  return (
    <motion.div
      key="status"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-zinc-950/80 backdrop-blur border border-emerald-500/20 px-3 py-2 rounded-full"
    >
      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
      Live · {new Date(timestamp).toLocaleTimeString('pt-BR')}
    </motion.div>
  );
}

'use client';

import { Terminal, Zap, RefreshCcw, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { FuturisticBackground } from '@components/backgrounds/futuristic-background';
import { Button } from '@components/ui/button';

export function MaintenanceScreen() {
  return (
    <div className="relative flex flex-col min-h-screen bg-black text-white overflow-hidden font-sans selection:bg-emerald-500/30">
      <FuturisticBackground />

      <div className="absolute top-0 right-0 w-full md:w-3/4 aspect-square max-w-5xl bg-emerald-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full md:w-2/3 aspect-square max-w-3xl bg-teal-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <header className="relative z-20 flex items-center justify-between p-6 md:p-10 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="size-5 text-black fill-black" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">Cine<span className="text-emerald-500">Nex</span></span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center p-6 md:p-10 w-full max-w-7xl mx-auto gap-12 lg:gap-24">
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none mb-6">
              Status: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600">Sinal Off.</span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 font-medium mb-10 max-w-xl leading-relaxed">
              O CineNex está temporariamente indisponível. Nossa equipe está realizando uma manutenção rápida em nossos servidores para organizar novos lançamentos e melhorar a estabilidade da plataforma. Pedimos desculpas pelo inconveniente!
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 w-full">
              <Button
                onClick={() => window.location.reload()}
                className="h-14 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-sm transition-all hover:shadow-lg shadow-emerald-500/40 w-full sm:w-auto"
              >
                <RefreshCcw className="size-5 mr-2" /> Tentar Novamente
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 w-full max-w-lg lg:max-w-none relative hidden md:block"
        >
          <div className="relative w-full aspect-square">
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="h-12 border-b border-white/5 flex items-center px-6 gap-2 bg-white/5">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-amber-500/80" />
                <div className="size-3 rounded-full bg-emerald-500/80" />
              </div>

              <div className="p-8 flex-1 flex flex-col gap-6 justify-center">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Terminal className="size-6 text-emerald-400" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-3/4 rounded-full bg-zinc-800" />
                    <div className="h-2 w-1/2 rounded-full bg-emerald-500/50" />
                  </div>
                </div>

                <div className="flex items-center gap-4 opacity-50">
                  <div className="size-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center shrink-0">
                    <Zap className="size-6 text-zinc-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-full rounded-full bg-zinc-800" />
                    <div className="h-2 w-2/3 rounded-full bg-zinc-800" />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-sm text-zinc-500 font-mono">v3.5.0</span>
                  <WifiOff className="size-5 text-zinc-500" />
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 size-24 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-xl flex items-center justify-center -rotate-12"
            >
              <WifiOff className="size-8 text-emerald-500/60" />
            </motion.div>
          </div>
        </motion.div>

      </main>
    </div>
  );
}

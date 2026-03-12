import { Film, Tv, Sparkles, Github, Clapperboard } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 overflow-hidden">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="absolute inset-0 bg-[var(--bg-mid)]" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="text-[18vw] font-black text-white/[0.018] uppercase tracking-tighter select-none leading-none">
          CINENEX
        </span>
      </div>

      <div className="relative z-10 mx-auto max-w-[1800px] px-4 xs:px-6 sm:px-12 lg:px-20 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 lg:gap-8">

          <div className="space-y-5">
            <Link
              href="/"
              aria-label="Ir para a página inicial do CineNex"
              className="inline-flex items-center gap-2.5 group"
            >
              <div className="size-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center group-hover:shadow-[0_0_16px_var(--glow-30)] transition-all">
                <Clapperboard className="size-4 text-emerald-400" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">
                <span className="text-white">CINE</span><span className="text-emerald-400">NEX</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
              Sua central de streaming com visual cinematográfico. Filmes, séries e o melhor conteúdo sempre disponível.
            </p>
            <div className="flex items-center gap-2.5">
              <Link href="https://github.com/VitorFirmino" target="_blank" rel="noreferrer" aria-label="GitHub" className="size-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all">
                <Github className="size-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Catálogo</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors group">
                  <Sparkles className="size-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-sm font-semibold">Descobrir</span>
                </Link>
              </li>
              <li>
                <Link href="/collection/movies" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors group">
                  <Film className="size-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-sm font-semibold">Filmes</span>
                </Link>
              </li>
              <li>
                <Link href="/collection/series" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors group">
                  <Tv className="size-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-sm font-semibold">Séries</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
            © {year} CineNex — Todos os direitos reservados
          </p>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            Feito com ❤️ para cinéfilos
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

interface PlayErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function resolveBackHref(type: string | undefined, id: string | undefined) {
  if (!type || !id) return "/";
  return `/view/${type}/${id}`;
}

export default function PlayErrorPage({
  error,
  reset,
}: PlayErrorPageProps) {
  const params = useParams<{ type?: string; id?: string }>();
  const router = useRouter();
  const backHref = useMemo(
    () => resolveBackHref(params.type, params.id),
    [params.id, params.type],
  );

  useEffect(() => {
    console.error("[Player] Route error boundary captured:", error);
  }, [error]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(backHref);
  };

  return (
    <main className="fixed inset-0 z-[200] flex items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/90 p-6 text-center backdrop-blur">
        <h1 className="text-xl font-black uppercase tracking-wide">
          Falha ao abrir o player
        </h1>
        <p className="mt-3 text-sm text-zinc-300">
          Ocorreu uma exceção no carregamento do vídeo. Tente novamente ou
          volte para o conteúdo.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="h-11 flex-1 rounded-md bg-emerald-600 px-4 font-bold text-white transition-colors hover:bg-emerald-500"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="h-11 flex-1 rounded-md border border-white/20 bg-white/5 px-4 font-bold text-white transition-colors hover:bg-white/10"
          >
            Voltar
          </button>
        </div>
      </div>
    </main>
  );
}

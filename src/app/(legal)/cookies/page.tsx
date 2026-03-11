export const metadata = {
  title: "Cookies | CineNex",
  description: "Informações sobre como utilizamos cookies e tecnologias de rastreamento.",
};

export default function CookiesPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl sm:text-7xl font-black headline-neo tracking-tighter uppercase italic leading-none">
          Política de <span className="text-emerald-500">Cookies</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
          Última atualização: 09 de Março de 2026
        </p>
      </div>

      <div className="prose prose-invert max-w-none space-y-10 text-zinc-300">
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            1. O que são Cookies?
          </h2>
          <p className="leading-relaxed">
            Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita o CineNex. Eles nos ajudam a lembrar de suas preferências e a entender como você interage com a nossa plataforma.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            2. Como utilizamos os Cookies
          </h2>
          <p className="leading-relaxed">
            Utilizamos os seguintes tipos de cookies:
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h3 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">Essenciais</h3>
              <p className="text-sm text-zinc-400 leading-snug">Necessários para o login e segurança da sua conta. Sem eles, o CineNex não funcionaria corretamente.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h3 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">Funcionais</h3>
              <p className="text-sm text-zinc-400 leading-snug">Lembram suas preferências de idioma, tema escuro e volume do player.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h3 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">Performance</h3>
              <p className="text-sm text-zinc-400 leading-snug">Ajudam-nos a medir o tempo de carregamento das capas e a estabilidade da interface.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h3 className="font-bold text-emerald-400 uppercase text-xs tracking-widest">Terceiros</h3>
              <p className="text-sm text-zinc-400 leading-snug">Cookies técnicos de APIs externas como o player de vídeo ou serviços de metadados.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            3. Gestão de Preferências
          </h2>
          <p className="leading-relaxed">
            Você pode desativar os cookies nas configurações do seu navegador a qualquer momento. No entanto, lembre-se que isso pode limitar algumas funcionalidades críticas, como a capacidade de permanecer logado em sua conta.
          </p>
        </section>

        <section className="space-y-4 pt-8 border-t border-white/5">
          <p className="text-sm text-zinc-500 italic">
            Ao continuar utilizando o CineNex, você concorda com o uso de cookies conforme descrito nesta política.
          </p>
        </section>
      </div>
    </div>
  );
}

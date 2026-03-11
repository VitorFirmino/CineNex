import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Termos de Uso | CineNex",
  description: "Termos e condições de uso da plataforma CineNex.",
};

export default function TermsPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <ShieldCheck className="size-3" />
          Legal & Compliance
        </div>
        <h1 className="text-5xl sm:text-7xl font-black headline-neo tracking-tighter uppercase italic leading-none">
          Termos de <span className="text-emerald-500">Uso</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
          Última atualização: 09 de Março de 2026
        </p>
      </div>

      <div className="prose prose-invert max-w-none space-y-10 text-zinc-300">
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            1. Aceitação dos Termos
          </h2>
          <p className="leading-relaxed">
            Ao acessar e utilizar a plataforma CineNex, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            2. Descrição do Serviço
          </h2>
          <p className="leading-relaxed">
            O CineNex é um explorador de catálogo multimídia que permite aos usuários organizar e visualizar informações sobre conteúdos de vídeo. A plataforma atua como uma interface de visualização e não hospeda conteúdo próprio protegido por direitos autorais.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            3. Responsabilidade do Usuário
          </h2>
          <p className="leading-relaxed">
            O usuário é inteiramente responsável pelos conteúdos, links e fontes externas que decidir utilizar na plataforma. O CineNex não valida, endossa nem se responsabiliza pela disponibilidade, segurança ou legalidade de materiais fornecidos por terceiros.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            4. Propriedade Intelectual
          </h2>
          <p className="leading-relaxed">
            A interface, design, logotipos e algoritmos do CineNex são de propriedade exclusiva de seus desenvolvedores. O uso da plataforma não concede ao usuário qualquer direito de propriedade sobre o software ou sobre os metadados (capas, sinopses) recuperados de APIs de terceiros como TMDB.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            5. Limitação de Responsabilidade
          </h2>
          <p className="leading-relaxed">
            Em nenhuma circunstância o CineNex será responsável por danos diretos, indiretos ou incidentais resultantes do uso ou da incapacidade de usar o serviço, incluindo falhas de sinal dos provedores de stream ou indisponibilidade de metadados.
          </p>
        </section>

        <section className="space-y-4 pt-8 border-t border-white/5">
          <p className="text-sm text-zinc-500 italic">
            Dúvidas sobre nossos termos podem ser enviadas através dos nossos canais oficiais de suporte.
          </p>
        </section>
      </div>
    </div>
  );
}

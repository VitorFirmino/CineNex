import { Lock } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade | CineNex",
  description: "Política de privacidade e proteção de dados da plataforma CineNex.",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <Lock className="size-3" />
          Segurança de Dados
        </div>
        <h1 className="text-5xl sm:text-7xl font-black headline-neo tracking-tighter uppercase italic leading-none">
          Política de <span className="text-emerald-500">Privacidade</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
          Última atualização: 09 de Março de 2026
        </p>
      </div>

      <div className="prose prose-invert max-w-none space-y-10 text-zinc-300">
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            1. Coleta de Informações
          </h2>
          <p className="leading-relaxed">
            Coletamos apenas as informações necessárias para fornecer uma experiência personalizada. Isso inclui dados da sua conta (e-mail), histórico de visualização local para sincronização de progresso e preferências de filtragem de catálogo.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            2. Uso dos Dados
          </h2>
          <p className="leading-relaxed">
            Seus dados são utilizados exclusivamente para:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Sincronizar seu progresso de vídeos entre diferentes dispositivos.</li>
            <li>Manter sua lista de favoritos.</li>
            <li>Melhorar a performance da interface e a precisão da busca.</li>
            <li>Segurança da conta e prevenção de acessos não autorizados.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            3. Armazenamento e Proteção
          </h2>
          <p className="leading-relaxed">
            Utilizamos criptografia de ponta e infraestrutura em nuvem segura para proteger suas informações. Suas senhas são armazenadas utilizando hashes criptográficos e nunca são visíveis em texto puro para nossa equipe.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            4. Compartilhamento com Terceiros
          </h2>
          <p className="leading-relaxed">
            O CineNex não vende ou aluga seus dados pessoais. Podemos compartilhar informações anônimas de telemetria com serviços de análise para entender falhas técnicas e melhorar o sistema. Metadados de mídia são buscados em APIs externas (TMDB), mas seus dados pessoais não são enviados para esses provedores.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight border-l-4 border-emerald-500 pl-4">
            5. Seus Direitos
          </h2>
          <p className="leading-relaxed">
            De acordo com a LGPD, você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados a qualquer momento através das configurações de perfil na plataforma ou entrando em contato com nosso suporte.
          </p>
        </section>

        <section className="space-y-4 pt-8 border-t border-white/5">
          <p className="text-sm text-zinc-500 italic">
            Sua privacidade é nossa prioridade fundamental na construção de uma experiência cinematográfica segura.
          </p>
        </section>
      </div>
    </div>
  );
}

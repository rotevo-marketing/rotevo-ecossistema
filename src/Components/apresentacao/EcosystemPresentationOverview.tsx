"use client";

import Link from "next/link";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { ecosystemDocuments } from "@/data/ecosystem2027";

type Props = {
  clientName: string;
  projectTitle: string;
  coverImageUrl: string | null;
  projectSlug: string;
  clientSlug: string;
  isStrategist: boolean;
  selectedCodes: string[];
  presentedCodes: string[];
};

export default function EcosystemPresentationOverview({
  clientName, projectTitle, coverImageUrl, clientSlug, isStrategist, selectedCodes, presentedCodes,
}: Props) {
  const visible = ecosystemDocuments.filter((doc) => !doc.area.startsWith("00 ") && selectedCodes.includes(doc.code) && presentedCodes.includes(doc.code));
  const areas = Array.from(new Set(visible.map((doc) => doc.area)));
  return (
    <main className="ecosystem-presentation-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
      <style jsx global>{` .ecosystem-presentation-v2, .ecosystem-presentation-v2 h1, .ecosystem-presentation-v2 h2, .ecosystem-presentation-v2 h3 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>
      <header className="sticky top-0 z-50 border-b border-[#E3E7F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <RotevoLogo size={27}/>
          <Link href={isStrategist ? `/admin/planejamentos/${clientSlug}` : "/cliente"} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-4 py-2.5 text-sm font-medium hover:bg-[#F6F7FB]">
            {isStrategist ? "Voltar ao planejamento" : "Voltar à minha área"}
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-9 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-2xl border border-[#E3E7F0] bg-white">
          <div className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:p-9">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#EDF0F8]">
              {coverImageUrl ? <img src={coverImageUrl} alt={clientName} className="h-full w-full object-cover"/> :
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#697386]">{clientName.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#697386]">Planejamento estratégico</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{projectTitle}</h1>
              <p className="mt-2 text-sm text-[#525B70]">{clientName}</p>
            </div>
          </div>
          <div className="border-t border-[#E3E7F0] bg-[#F9FAFD] px-6 py-4 text-sm text-[#525B70] sm:px-9">
            {visible.length} documentos disponíveis em {areas.length} áreas estratégicas
          </div>
        </section>
        {isStrategist && <p className="mt-6 rounded-xl border border-[#E3E7F0] bg-white px-5 py-4 text-sm text-[#525B70]">Prévia do planejamento. A exibição dos documentos está organizada, mas os novos editores de conteúdo ainda serão integrados.</p>}
        <div className="mt-8">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Documentos do planejamento</h2>
          <p className="mt-2 text-sm text-[#525B70]">Explore as áreas estratégicas que fazem parte da apresentação.</p>
        </div>
        {visible.length === 0 ? <div className="mt-6 rounded-xl border border-[#E3E7F0] bg-white p-7 text-sm text-[#525B70]">Nenhum documento foi marcado para exibição ao cliente.</div> : <div className="mt-6 space-y-5">
          {areas.map((area) => <section key={area} className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7">
            <h3 className="text-lg font-bold">{area}</h3>
            <div className="mt-4 divide-y divide-[#E3E7F0]">
              {visible.filter((doc) => doc.area === area).map((doc) => <div key={doc.code} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-baseline gap-3"><span className="text-xs font-semibold text-[#697386]">{doc.code}</span><span className="text-sm font-semibold">{doc.title}</span></div>
                <span className="text-xs text-[#697386]">{isStrategist ? "Conteúdo a integrar" : "Conteúdo em preparação"}</span>
              </div>)}
            </div>
          </section>)}
        </div>}
      </div>
      <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8 lg:px-10"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
    </main>
  );
}

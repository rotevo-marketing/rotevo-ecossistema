"use client";
import { useState } from "react";
import Link from "next/link";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { ecosystemDocuments } from "@/data/ecosystem2027";

type Props = { clientName:string; projectTitle:string; coverImageUrl:string|null; projectSlug:string; clientSlug:string; isStrategist:boolean; selectedCodes:string[]; presentedCodes:string[] };
export default function EcosystemPresentationOverview({clientName,projectTitle,coverImageUrl,clientSlug,isStrategist,selectedCodes,presentedCodes}:Props) {
  const docs = ecosystemDocuments.filter(d=>!d.area.startsWith("00 ") && selectedCodes.includes(d.code) && presentedCodes.includes(d.code));
  const areas = Array.from(new Set(docs.map(d=>d.area)));
  const [active,setActive] = useState("dashboard");
  const [expanded,setExpanded] = useState<string[]>([]);
  const [menuOpen,setMenuOpen] = useState(false);
  const chosen = docs.find(d=>d.code===active);
  const chosenArea = areas.includes(active) ? active : null;
  const toggleArea=(area:string)=>{setExpanded(old=>old.includes(area)?old.filter(a=>a!==area):[...old,area]);setActive(area);setMenuOpen(false);};
  const nav=(<nav aria-label="Navegação do planejamento" className="space-y-1">
    <button type="button" onClick={()=>{setActive("dashboard");setMenuOpen(false);}} className={`w-full cursor-pointer rounded-xl px-3 py-3 text-left text-sm font-semibold ${active==="dashboard"?"bg-[#6D35F5] text-white":"text-[#E2E6EE] hover:bg-white/10"}`}>Painel Executivo</button>
    <p className="px-3 pb-2 pt-5 text-xs font-semibold text-[#B5BED1]">Áreas estratégicas</p>
    {areas.map(area=><div key={area}>
      <button type="button" onClick={()=>toggleArea(area)} aria-expanded={expanded.includes(area)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-xs font-medium ${active===area?"bg-white/10 text-white":"text-[#E2E6EE] hover:bg-white/10"}`}>
        <span>{area}</span><span aria-hidden="true">{expanded.includes(area)?"−":"+"}</span>
      </button>
      {expanded.includes(area)&&<div className="space-y-1 pb-2 pl-4">
        {docs.filter(d=>d.area===area).map(doc=><button key={doc.code} type="button" onClick={()=>{setActive(doc.code);setMenuOpen(false);}}
          className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-xs leading-5 ${active===doc.code?"bg-[#6D35F5] text-white":"text-[#CED5E3] hover:bg-white/10"}`}>{doc.code} · {doc.title}</button>)}
      </div>}
    </div>)}
  </nav>);
  return <main className="ecosystem-presentation-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
    <style jsx global>{` .ecosystem-presentation-v2, .ecosystem-presentation-v2 h1, .ecosystem-presentation-v2 h2, .ecosystem-presentation-v2 h3 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>
    <header className="sticky top-0 z-50 border-b border-[#E3E7F0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8"><RotevoLogo size={27}/>
        <div className="flex items-center gap-2"><button onClick={()=>setMenuOpen(v=>!v)} type="button" aria-expanded={menuOpen} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-3 py-2.5 text-sm font-medium lg:hidden">Menu</button>
        <Link href={isStrategist?`/admin/planejamentos/${clientSlug}`:"/cliente"} className="cursor-pointer rounded-xl border border-[#E3E7F0] px-4 py-2.5 text-sm font-medium hover:bg-[#F6F7FB]">{isStrategist?"Voltar ao planejamento":"Voltar à minha área"}</Link></div>
      </div>
    </header>
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-stretch">
      <aside className="hidden w-[276px] shrink-0 bg-[#0B142A] px-4 py-7 lg:block">{nav}</aside>
      {menuOpen&&<aside className="w-full bg-[#0B142A] px-5 py-6 lg:hidden">{nav}</aside>}
      <div className={`min-w-0 flex-1 px-5 pb-20 pt-8 sm:px-8 ${menuOpen?"hidden lg:block":""}`}>
        <div className="mb-7 flex items-center gap-4 rounded-2xl border border-[#E3E7F0] bg-white p-5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EDF0F8]">{coverImageUrl?<img src={coverImageUrl} alt={clientName} className="h-full w-full object-cover"/>:<span className="flex h-full w-full items-center justify-center text-xl font-bold text-[#697386]">{clientName.charAt(0).toUpperCase()}</span>}</div>
          <div className="min-w-0"><p className="text-xs text-[#697386]">Planejamento estratégico</p><p className="mt-1 text-lg font-bold">{projectTitle}</p><p className="text-sm text-[#525B70]">{clientName}</p></div>
        </div>
        {active==="dashboard"&&<div className="space-y-6">
          <div><p className="text-xs font-semibold text-[#697386]">Painel Executivo</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Visão geral estratégica</h1><p className="mt-2 text-sm text-[#525B70]">Consolidação dos objetivos, prioridades, iniciativas e acompanhamento do planejamento.</p></div>
          {isStrategist&&<div className="rounded-xl border border-[#E3E7F0] bg-white p-4 text-sm text-[#525B70]">Estrutura inicial do Painel Executivo. Os indicadores dependem da integração dos documentos e dos dados de acompanhamento.</div>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {["Objetivos e metas","Prioridades atuais","Indicadores relevantes","Plano de execução"].map(label=><div key={label} className="rounded-xl border border-[#E3E7F0] bg-white p-5"><p className="text-xs text-[#697386]">{label}</p><p className="mt-3 text-base font-semibold">A definir</p></div>)}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="text-lg font-bold">Evolução dos resultados</h2><p className="mt-2 text-sm text-[#697386]">Os gráficos serão apresentados quando houver indicadores e séries históricas verificáveis.</p><div className="mt-5 flex h-32 items-center justify-center rounded-lg border border-dashed border-[#DDE2EC] bg-[#F9FAFD] text-xs text-[#697386]">Aguardando dados de resultados</div></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="text-lg font-bold">Prioridades e decisões</h2><p className="mt-3 text-sm text-[#697386]">As prioridades, decisões registradas, pendências e riscos serão consolidados aqui.</p><div className="mt-5 rounded-lg bg-[#F6F7FB] p-4 text-sm text-[#525B70]">Nenhuma informação consolidada ainda.</div></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="text-lg font-bold">Iniciativas e campanhas</h2><p className="mt-3 text-sm text-[#697386]">Situação das iniciativas previstas no planejamento.</p><p className="mt-4 text-sm font-medium">Aguardando integração</p></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="text-lg font-bold">Próximos marcos</h2><p className="mt-3 text-sm text-[#697386]">Plano de execução e próximas entregas.</p><p className="mt-4 text-sm font-medium">A definir</p></section>
          </div>
          <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="text-lg font-bold">Áreas do projeto</h2><p className="mt-1 text-sm text-[#697386]">Selecione uma área para consultar os documentos disponíveis.</p>
            {areas.length===0?<p className="mt-4 text-sm text-[#525B70]">Nenhum documento liberado para apresentação.</p>:<div className="mt-4 grid gap-3 sm:grid-cols-2">{areas.map(area=><button type="button" key={area} onClick={()=>toggleArea(area)} className="cursor-pointer rounded-xl border border-[#E3E7F0] p-4 text-left text-sm font-semibold hover:border-[#6D35F5]">{area}<span className="mt-2 block text-xs font-normal text-[#697386]">{docs.filter(d=>d.area===area).length} documentos</span></button>)}</div>}
          </section>
        </div>}
        {chosenArea&&<section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><p className="text-xs text-[#697386]">Área estratégica</p><h1 className="mt-2 text-2xl font-bold">{chosenArea}</h1><div className="mt-5 divide-y divide-[#E3E7F0]">{docs.filter(d=>d.area===chosenArea).map(doc=><button key={doc.code} onClick={()=>setActive(doc.code)} className="block w-full cursor-pointer py-4 text-left text-sm hover:text-[#6D35F5]">{doc.code} · {doc.title} →</button>)}</div></section>}
        {chosen&&<article className="rounded-xl border border-[#E3E7F0] bg-white p-6 sm:p-9"><p className="text-xs text-[#697386]">{chosen.area} · {chosen.code}</p><h1 className="mt-2 text-3xl font-bold">{chosen.title}</h1><div className="mt-7 rounded-xl bg-[#F6F7FB] p-6 text-sm leading-6 text-[#525B70]">O conteúdo deste documento ainda não está integrado à apresentação. Quando sua produção estiver disponível, ele será apresentado aqui.</div><button type="button" onClick={()=>setActive("dashboard")} className="mt-6 cursor-pointer rounded-xl border border-[#E3E7F0] px-4 py-2.5 text-sm">Voltar ao Painel Executivo</button></article>}
      </div>
    </div>
    <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
  </main>;
}

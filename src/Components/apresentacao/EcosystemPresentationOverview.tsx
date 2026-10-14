"use client";
import { useState } from "react";
import Link from "next/link";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { ecosystemDocuments } from "@/data/ecosystem2027";
// Ícones próprios em SVG: traço arredondado e uniforme, sem dependências externas.
function AreaIcon({index}:{index:number}) {
  const paths: Record<number, React.ReactNode> = {
    0: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 15v-4m5 4V7m5 8v-6"/></>,
    1: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 8h4M7 12h4M7 16h4M15 8h2m-2 4h2m-2 4h2"/></>,
    2: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13c6 4 12 4 18 0"/></>,
    3: <><path d="M3 18V7l6-4 6 4v11M9 3v15M3 11h12"/><circle cx="18" cy="16" r="3"/><path d="m20.5 18.5 2 2"/></>,
    4: <><circle cx="9" cy="8" r="3"/><circle cx="18" cy="9" r="2.5"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Zm12-7a5 5 0 0 1 6 5v2h-4"/></>,
    5: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.5a2 2 0 0 0 1.7-3.1 1.8 1.8 0 0 1 1.5-2.8h1.3a3 3 0 0 0 3-3c0-4.5-4.1-8.1-9-8.1Z"/><circle cx="7.6" cy="11" r=".7"/><circle cx="10" cy="7.3" r=".7"/><circle cx="15" cy="7.8" r=".7"/><circle cx="18" cy="11.5" r=".7"/></>,
    6: <><path d="m3 11 13-6v14L3 13v-2Z"/><path d="m7 14 1.5 5h3L10 16M19 8a5 5 0 0 1 0 8"/></>,
    7: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></>,
    8: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m12 12 8-8"/></>,
    9: <><path d="M3 5h18l-7.5 8v5l-3 2v-7L3 5Z"/></>,
    10: <><path d="m13 2-9 11h7l-1 9 10-12h-7l0-8Z"/></>,
    11: <><path d="M21 12a9 9 0 1 1-9-9v9h9Z"/><path d="M13 3a8 8 0 0 1 8 8h-8V3Z"/></>,
    12: <><rect x="2.5" y="4" width="6" height="6" rx="1.5"/><rect x="15.5" y="4" width="6" height="6" rx="1.5"/><rect x="9" y="15" width="6" height="6" rx="1.5"/><path d="M5.5 10v3h13v-3M12 13v2"/></>,
    13: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-8"/></>,
    14: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 10 1.5 1.5L12 9M14 10h3m-9 6 1.5 1.5L12 15m2 1h3"/></>,
    15: <><path d="m3 11 13-6v14L3 13v-2Z"/><path d="M7 14l2 5h3l-2-4M19 8a5 5 0 0 1 0 8"/></>,
    16: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0">{paths[index] ?? paths[0]}</svg>;
}

type Props = { clientName:string; projectTitle:string; coverImageUrl:string|null; projectSlug:string; clientSlug:string; isStrategist:boolean; selectedCodes:string[]; presentedCodes:string[] };
export default function EcosystemPresentationOverview({clientName,projectTitle,coverImageUrl,clientSlug,isStrategist,selectedCodes,presentedCodes}:Props) {
  const docs = ecosystemDocuments.filter(d=>!d.area.startsWith("00 ") && d.code!=="01.01" && selectedCodes.includes(d.code) && presentedCodes.includes(d.code));
  const areas = Array.from(new Set(docs.map(d=>d.area)));
  const [active,setActive] = useState("dashboard");
  const [menuOpen,setMenuOpen] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false);
  const chosen = docs.find(d=>d.code===active);
  const chosenArea = areas.includes(active) ? active : chosen?.area ?? null;
  const areaDocs = chosenArea ? docs.filter(d=>d.area===chosenArea) : [];
  const selectArea=(area:string)=>{const first=docs.find(d=>d.area===area);setActive(first?.code ?? "dashboard");setMenuOpen(false);};
  const nav=(<nav aria-label="Navegação do planejamento" className="space-y-1">
    <div className={`mb-6 flex items-center gap-3 border-b border-white/15 px-2 pb-6 ${sidebarCollapsed?"lg:justify-center lg:px-0":""}`}>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/15">{coverImageUrl?<img src={coverImageUrl} alt={clientName} className="h-full w-full object-cover"/>:<span className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">{clientName.charAt(0).toUpperCase()}</span>}</div>
      <div className={`min-w-0 ${sidebarCollapsed?"lg:hidden":""}`}><p className="truncate text-sm font-semibold text-white">{clientName}</p><p className="mt-1 text-xs text-[#BEC6D7]">Planejamento estratégico</p></div>
    </div>
    <button type="button" onClick={()=>{setActive("dashboard");setMenuOpen(false);}} title="Painel Executivo" aria-label="Painel Executivo" className={`w-full cursor-pointer rounded-xl px-3 py-3 text-left text-[15px] font-semibold ${sidebarCollapsed?"lg:flex lg:justify-center lg:px-2":""} ${active==="dashboard"?"bg-[#6D35F5] text-white":"text-[#E2E6EE] hover:bg-white/10"}`}><span className="flex items-center gap-3"><AreaIcon index={0}/><span className={sidebarCollapsed?"lg:hidden":""}>Painel Executivo</span></span></button>
    <p className={`px-3 pb-2 pt-5 text-xs font-semibold text-[#B5BED1] ${sidebarCollapsed?"lg:hidden":""}`}>Áreas estratégicas</p>
    {areas.map(area=><button key={area} type="button" onClick={()=>selectArea(area)} title={area.slice(3)} aria-label={area.slice(3)} aria-current={chosenArea===area?"page":undefined}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] leading-5 font-medium transition-colors ${sidebarCollapsed?"lg:justify-center lg:px-2":""} ${chosenArea===area?"bg-[#6D35F5] text-white":"text-[#E2E6EE] hover:bg-white/10"}`}>
      <AreaIcon index={Number(area.slice(0,2))}/><span className={sidebarCollapsed?"lg:hidden":""}>{area.slice(3)}</span>
    </button>)}
  </nav>);
  return <main className="ecosystem-presentation-v2 flex min-h-screen flex-col bg-[#F6F7FB] text-[#090D1C]">
    <style jsx global>{` .ecosystem-presentation-v2, .ecosystem-presentation-v2 h1, .ecosystem-presentation-v2 h2, .ecosystem-presentation-v2 h3 { font-family: var(--font-body), Arial, Helvetica, sans-serif !important; } `}</style>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B142A] text-white">
      <div className="flex w-full items-center justify-between gap-3 px-5 py-5"><RotevoLogo variant="white" size={27}/>
        <div className="flex items-center gap-2"><button onClick={()=>setMenuOpen(v=>!v)} type="button" aria-expanded={menuOpen} className="cursor-pointer rounded-xl border border-white/20 px-3 py-2.5 text-sm font-medium text-white lg:hidden">Menu</button>
        <Link href={isStrategist?`/admin/planejamentos/${clientSlug}`:"/cliente"} className="cursor-pointer rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10">{isStrategist?"Voltar ao planejamento":"Voltar à minha área"}</Link></div>
      </div>
    </header>
    <div className="flex w-full flex-1 items-stretch">
      <aside className={`relative hidden shrink-0 bg-[#0B142A] px-4 py-7 transition-[width] duration-200 lg:block ${sidebarCollapsed?"w-[76px]":"w-[286px]"}`}>{nav}<button type="button" onClick={()=>setSidebarCollapsed(v=>!v)} aria-label={sidebarCollapsed?"Expandir menu lateral":"Recolher menu lateral"} title={sidebarCollapsed?"Expandir menu lateral":"Recolher menu lateral"} className="absolute right-[-13px] top-[55%] z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-[#F6F7FB] bg-[#A7E000] text-[#0B142A] shadow-sm">{sidebarCollapsed?"›":"‹"}</button></aside>
      {menuOpen&&<aside className="w-full bg-[#0B142A] px-5 py-6 lg:hidden">{nav}</aside>}
      <div className={`min-w-0 flex-1 px-5 pb-20 pt-5 sm:px-7 ${menuOpen?"hidden lg:block":""}`}>
        {chosenArea&&<div className="mb-6 border-b border-[#E3E7F0]">
          <div className="mb-2 flex items-center gap-2"><span className="text-[#6D35F5]"><AreaIcon index={Number(chosenArea.slice(0,2))}/></span><h2 className="text-base font-semibold">{chosenArea.slice(3)}</h2></div>
          <div role="tablist" aria-label={`Documentos de ${chosenArea.slice(3)}`} className="flex gap-2 overflow-x-auto pb-3">
            {areaDocs.map(doc=><button key={doc.code} type="button" role="tab" aria-selected={active===doc.code} onClick={()=>setActive(doc.code)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${active===doc.code?"bg-[#6D35F5] text-white":"border border-[#E3E7F0] bg-white text-[#525B70] hover:border-[#6D35F5]"}`}>{doc.title}</button>)}
          </div>
        </div>}
        {active==="dashboard"&&<div className="space-y-6">
          <div><p className="text-xs font-semibold text-[#697386]">Painel Executivo</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Visão geral estratégica</h1><p className="mt-2 text-sm text-[#525B70]">Consolidação dos objetivos, prioridades, iniciativas e acompanhamento do planejamento.</p></div>
          <div className="space-y-4">
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={13}/></span>Evolução dos resultados</h2><p className="mt-2 text-sm text-[#697386]">Os gráficos serão apresentados quando houver indicadores e séries históricas verificáveis.</p><div className="mt-5 flex h-52 items-center justify-center rounded-lg border border-dashed border-[#DDE2EC] bg-[#F9FAFD] text-xs text-[#697386]">Aguardando dados de resultados</div></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={14}/></span>Prioridades e decisões</h2><p className="mt-3 text-sm text-[#697386]">As prioridades, decisões registradas, pendências e riscos serão consolidados aqui.</p><div className="mt-5 rounded-lg bg-[#F6F7FB] p-4 text-sm text-[#525B70]">Nenhuma informação consolidada ainda.</div></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={15}/></span>Iniciativas e campanhas</h2><p className="mt-3 text-sm text-[#697386]">Situação das iniciativas previstas no planejamento.</p><p className="mt-4 text-sm font-medium">Aguardando integração</p></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={16}/></span>Próximos marcos</h2><p className="mt-3 text-sm text-[#697386]">Plano de execução e próximas entregas.</p><p className="mt-4 text-sm font-medium">A definir</p></section>
          </div>

        </div>}
        {chosen&&<article className="rounded-xl border border-[#E3E7F0] bg-white p-6 sm:p-9"><p className="text-xs text-[#697386]">{chosen.area}</p><h1 className="mt-2 text-3xl font-bold">{chosen.title}</h1><div className="mt-7 rounded-xl bg-[#F6F7FB] p-6 text-sm leading-6 text-[#525B70]">O conteúdo deste documento ainda não está integrado à apresentação. Quando sua produção estiver disponível, ele será apresentado aqui.</div><button type="button" onClick={()=>setActive("dashboard")} className="mt-6 cursor-pointer rounded-xl border border-[#E3E7F0] px-4 py-2.5 text-sm">Voltar ao Painel Executivo</button></article>}
      </div>
    </div>
    <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
  </main>;
}

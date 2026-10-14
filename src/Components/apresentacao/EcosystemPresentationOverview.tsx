"use client";
import { useState } from "react";
import Link from "next/link";
import { RotevoLogo } from "@/Components/RotevoLogo";
import { ecosystemDocuments } from "@/data/ecosystem2027";
import { getIconPath } from "@/Components/apresentacao/ModuleIcon";
const areaIcons=["resumo-estrategico","dna-da-empresa","objetivos","pesquisa-de-concorrencia","personas","identidade-visual","canais-digitais-atuais","linhas-editoriais","captacao-de-lead","conversao-de-vendas","fluxo-de-automacao","metricas-e-indicadores","linha-do-tempo"];
function AreaIcon({index}:{index:number}) { const url=getIconPath(areaIcons[index]||"resumo-estrategico"); return <span aria-hidden="true" className="inline-block h-5 w-5 shrink-0 bg-current" style={{maskImage:`url(${url})`,WebkitMaskImage:`url(${url})`,maskSize:"contain",WebkitMaskSize:"contain",maskRepeat:"no-repeat",WebkitMaskRepeat:"no-repeat"}}/>; }

type Props = { clientName:string; projectTitle:string; coverImageUrl:string|null; projectSlug:string; clientSlug:string; isStrategist:boolean; selectedCodes:string[]; presentedCodes:string[] };
export default function EcosystemPresentationOverview({clientName,projectTitle,coverImageUrl,clientSlug,isStrategist,selectedCodes,presentedCodes}:Props) {
  const docs = ecosystemDocuments.filter(d=>!d.area.startsWith("00 ") && selectedCodes.includes(d.code) && presentedCodes.includes(d.code));
  const areas = Array.from(new Set(docs.map(d=>d.area)));
  const [active,setActive] = useState("dashboard");
  const [menuOpen,setMenuOpen] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false);
  const chosen = docs.find(d=>d.code===active);
  const chosenArea = areas.includes(active) ? active : chosen?.area ?? null;
  const areaDocs = chosenArea ? docs.filter(d=>d.area===chosenArea) : [];
  const selectArea=(area:string)=>{setActive(area);setMenuOpen(false);};
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8"><RotevoLogo variant="white" size={27}/>
        <div className="flex items-center gap-2"><button onClick={()=>setMenuOpen(v=>!v)} type="button" aria-expanded={menuOpen} className="cursor-pointer rounded-xl border border-white/20 px-3 py-2.5 text-sm font-medium text-white lg:hidden">Menu</button>
        <Link href={isStrategist?`/admin/planejamentos/${clientSlug}`:"/cliente"} className="cursor-pointer rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10">{isStrategist?"Voltar ao planejamento":"Voltar à minha área"}</Link></div>
      </div>
    </header>
    <div className="flex w-full flex-1 items-stretch">
      <aside className={`relative hidden shrink-0 bg-[#0B142A] px-4 py-7 transition-[width] duration-200 lg:block ${sidebarCollapsed?"w-[76px]":"w-[286px]"}`}>{nav}<button type="button" onClick={()=>setSidebarCollapsed(v=>!v)} aria-label={sidebarCollapsed?"Expandir menu lateral":"Recolher menu lateral"} title={sidebarCollapsed?"Expandir menu lateral":"Recolher menu lateral"} className="absolute right-[-13px] top-[55%] z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-[#F6F7FB] bg-[#A7E000] text-[#0B142A] shadow-sm">{sidebarCollapsed?"›":"‹"}</button></aside>
      {menuOpen&&<aside className="w-full bg-[#0B142A] px-5 py-6 lg:hidden">{nav}</aside>}
      <div className={`min-w-0 flex-1 px-5 pb-20 pt-5 sm:px-7 ${menuOpen?"hidden lg:block":""}`}>
        {chosenArea&&!chosen&&<div className="mb-6 border-b border-[#E3E7F0]">
          <div className="mb-2 flex items-center gap-2"><span className="text-[#6D35F5]"><AreaIcon index={Number(chosenArea.slice(0,2))}/></span><h2 className="text-base font-semibold">{chosenArea.slice(3)}</h2></div>
          <div role="tablist" aria-label={`Documentos de ${chosenArea.slice(3)}`} className="flex gap-2 overflow-x-auto pb-3">
            {areaDocs.map(doc=><button key={doc.code} type="button" role="tab" aria-selected={active===doc.code} onClick={()=>setActive(doc.code)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${active===doc.code?"bg-[#6D35F5] text-white":"border border-[#E3E7F0] bg-white text-[#525B70] hover:border-[#6D35F5]"}`}>{doc.title}</button>)}
          </div>
        </div>}
        {active==="dashboard"&&<div className="space-y-6">
          <div><p className="text-xs font-semibold text-[#697386]">Painel Executivo</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Visão geral estratégica</h1><p className="mt-2 text-sm text-[#525B70]">Consolidação dos objetivos, prioridades, iniciativas e acompanhamento do planejamento.</p></div>
          <div className="space-y-4">
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={11}/></span>Evolução dos resultados</h2><p className="mt-2 text-sm text-[#697386]">Os gráficos serão apresentados quando houver indicadores e séries históricas verificáveis.</p><div className="mt-5 flex h-52 items-center justify-center rounded-lg border border-dashed border-[#DDE2EC] bg-[#F9FAFD] text-xs text-[#697386]">Aguardando dados de resultados</div></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={2}/></span>Prioridades e decisões</h2><p className="mt-3 text-sm text-[#697386]">As prioridades, decisões registradas, pendências e riscos serão consolidados aqui.</p><div className="mt-5 rounded-lg bg-[#F6F7FB] p-4 text-sm text-[#525B70]">Nenhuma informação consolidada ainda.</div></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={8}/></span>Iniciativas e campanhas</h2><p className="mt-3 text-sm text-[#697386]">Situação das iniciativas previstas no planejamento.</p><p className="mt-4 text-sm font-medium">Aguardando integração</p></section>
            <section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><h2 className="flex items-center gap-3 text-lg font-bold"><span className="text-[#6D35F5]"><AreaIcon index={12}/></span>Próximos marcos</h2><p className="mt-3 text-sm text-[#697386]">Plano de execução e próximas entregas.</p><p className="mt-4 text-sm font-medium">A definir</p></section>
          </div>

        </div>}
        {chosenArea&&<section className="rounded-xl border border-[#E3E7F0] bg-white p-6"><p className="text-xs text-[#697386]">Área estratégica</p><h1 className="mt-2 text-2xl font-bold">{chosenArea}</h1><div className="mt-5 divide-y divide-[#E3E7F0]">{docs.filter(d=>d.area===chosenArea).map(doc=><button key={doc.code} onClick={()=>setActive(doc.code)} className="block w-full cursor-pointer py-4 text-left text-sm hover:text-[#6D35F5]">{doc.code} · {doc.title} →</button>)}</div></section>}
        {chosen&&<article className="rounded-xl border border-[#E3E7F0] bg-white p-6 sm:p-9"><p className="text-xs text-[#697386]">{chosen.area} · {chosen.code}</p><h1 className="mt-2 text-3xl font-bold">{chosen.title}</h1><div className="mt-7 rounded-xl bg-[#F6F7FB] p-6 text-sm leading-6 text-[#525B70]">O conteúdo deste documento ainda não está integrado à apresentação. Quando sua produção estiver disponível, ele será apresentado aqui.</div><button type="button" onClick={()=>setActive("dashboard")} className="mt-6 cursor-pointer rounded-xl border border-[#E3E7F0] px-4 py-2.5 text-sm">Voltar ao Painel Executivo</button></article>}
      </div>
    </div>
    <footer className="bg-[#A7E000]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs font-medium sm:flex-row sm:justify-between sm:px-8"><span>© 2026 Rotevo. Todos os direitos reservados.</span><span>Rotevo Estratégia &amp; Consultoria</span></div></footer>
  </main>;
}

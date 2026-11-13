"use client";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import {useEffect,useRef,useState} from "react";
import {useCreateBlockNote,getDefaultReactSlashMenuItems,SuggestionMenuController} from "@blocknote/react";
import {BlockNoteView} from "@blocknote/mantine";
import {pt} from "@blocknote/core/locales";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import {RotevoLogo} from "@/Components/RotevoLogo";
import {copy,initialReview,reviewAction,same,visibleSnapshot,imageAllowed,chartPoints,type ReviewState} from "@/lib/strategic-editor/prototype";
import {strategicSchema,type StrategicBlock,type StrategicPartial} from "./schema";
import {demoDocument} from "./demo";
import "@blocknote/mantine/style.css";
import "./editor.css";
const docs=ecosystemDocuments.filter(d=>!d.area.startsWith("00 ")&&d.code!=="01.01");
const areas=[...new Set(docs.map(d=>d.area))];
const blockNames:Record<string,string>={paragraph:"Texto",heading:"Título",bulletListItem:"Lista com marcadores",numberedListItem:"Lista numerada",checkListItem:"Lista de tarefas",table:"Tabela",image:"Imagem",quote:"Citação",strategic:"Bloco estratégico",indicator:"Indicador",strategicChart:"Gráfico"};
async function uploadLocalImage(file:File){
 if(!imageAllowed(file))throw Error("Escolha uma imagem PNG, JPEG ou WebP de até 4 MB.");
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error("Não foi possível ler a imagem."));reader.readAsDataURL(file);});
}
function Reader({blocks}:{blocks:StrategicBlock[]}){
 const editor=useCreateBlockNote({schema:strategicSchema,initialContent:copy(blocks),dictionary:pt});
 return <BlockNoteView editor={editor} editable={false} theme="light" formattingToolbar={false} slashMenu={false} sideMenu={false} filePanel={false} tableHandles={false}/>;
}
function DocumentWorkspace({code,title,area,onNavigate}:{code:string;title:string;area:string;onNavigate:(code:string)=>void}){
 const editor=useCreateBlockNote({schema:strategicSchema,initialContent:demoDocument(code,title),dictionary:pt,uploadFile:uploadLocalImage});
 const [state,setState]=useState<ReviewState<StrategicBlock[]>>(()=>initialReview(editor.document));
 const [mode,setMode]=useState<"edit"|"read"|"portal">("edit");
 const [selectedId,setSelectedId]=useState(editor.document[0].id),[notice,setNotice]=useState("");
 const [showOutline,setShowOutline]=useState(true),[portalArea,setPortalArea]=useState(area);
 const dirty=!same(state.draft,state.saved),reviewed=!!state.review&&same(state.review,state.saved),approved=!!state.approved&&same(state.approved,state.saved);
 const snapshot=visibleSnapshot(state),selected=editor.getBlock(selectedId)??editor.document[0];
 useUnsavedChanges(dirty);
 const stage=dirty?"Alterações não salvas":approved?"Aprovado na simulação":reviewed?"Em revisão simulada":"Rascunho demonstrativo";
 function action(kind:"save"|"review"|"approve"|"release"){
  try{setState(reviewAction(state,kind));setNotice({save:"Rascunho guardado nesta sessão. Nada foi enviado ao banco.",review:"Versão encaminhada para revisão simulada.",approve:"Versão aprovada apenas nesta simulação.",release:"Cópia liberada no portal simulado. Nenhum cliente real foi notificado."}[kind]);}catch(e){setNotice(e instanceof Error?e.message:"Não foi possível concluir a simulação.");}
 }
 function insert(block:StrategicPartial){const current=editor.getTextCursorPosition().block;const added=editor.insertBlocks([block],current,"after");setSelectedId(added[0].id);editor.setTextCursorPosition(added[0].id,"start");editor.focus();}
 const insertions:{label:string;description:string;block:StrategicPartial}[]=[
  {label:"Título",description:"Organize as seções do documento",block:{type:"heading",props:{level:2},content:"Novo título"}},
  {label:"Texto",description:"Adicione um parágrafo",block:{type:"paragraph",content:"Escreva seu texto aqui."}},
  {label:"Lista",description:"Liste ideias e constatações",block:{type:"bulletListItem",content:"Nova constatação"}},
  {label:"Tabela",description:"Compare informações",block:{type:"table",content:{type:"tableContent",rows:[{cells:["Item","Detalhamento"]},{cells:["Prioridade","Descreva aqui"]},{cells:["Responsável","Equipe Aurora"]}]}}},
  {label:"Imagem",description:"Imagem ilustrativa; também aceita arquivo local",block:{type:"image",props:{url:"/editor-demo/aurora-map.svg",caption:"Imagem demonstrativa · Aurora Consultoria"}}},
  {label:"Gráfico",description:"Visualize dados fictícios editáveis",block:{type:"strategicChart"}},
  {label:"Indicador",description:"Destaque uma medida e seu contexto",block:{type:"indicator",props:{label:"Novo indicador",value:"18",context:"Exemplo fictício"}}},
  {label:"Decisão",description:"Registre um direcionamento",block:{type:"strategic",props:{kind:"decision",title:"Nova decisão"},content:"Descreva a decisão estratégica e seu contexto."}},
  {label:"Recomendação",description:"Proponha uma ação fundamentada",block:{type:"strategic",props:{kind:"recommendation",title:"Nova recomendação"},content:"Descreva a recomendação e a evidência que a sustenta."}},
  {label:"Conclusão",description:"Sintetize o entendimento",block:{type:"strategic",props:{kind:"conclusion",title:"Síntese estratégica"},content:"Apresente as conclusões e os próximos passos."}}
 ];
 function selectBlock(id:string){setSelectedId(id);editor.setTextCursorPosition(id,"start");editor.focus();}
 return <>
  <section className="se-document-header"><div><div className="se-breadcrumb">Aurora Consultoria <span>/</span> {area}</div><h1>Editor Estratégico</h1><p>Construa documentos claros, completos e prontos para apresentar.</p></div><span className="se-stage">{stage}</span></section>
  <section className="se-context"><div><span className="se-eyebrow">Documento {code}</span><h2>{title}</h2><p>Conteúdo demonstrativo · Ecossistema de Crescimento 2027</p></div><div className="se-actions"><button onClick={()=>action("save")} className="se-button se-primary">Salvar rascunho de teste</button><button className="se-button" onClick={()=>setMode(mode==="edit"?"read":"edit")}>{mode==="edit"?"Visualizar documento":"Voltar à edição"}</button></div></section>
  <div className="se-modebar"><nav aria-label="Modo de visualização">{[{id:"edit",label:"Editar documento"},{id:"read",label:"Prévia de leitura"},{id:"portal",label:"Simular Portal do Cliente"}].map(m=><button key={m.id} aria-current={mode===m.id?"page":undefined} onClick={()=>setMode(m.id as typeof mode)}>{m.label}</button>)}</nav><span>{state.draft.length} blocos · {dirty?"Não salvo":"Guardado nesta sessão"}</span></div>
  <p role="status" aria-live="polite" className="se-notice">{notice||"Protótipo isolado: alterações e imagens ficam apenas na memória desta página. Recarregar ou trocar o documento restaura a demonstração."}</p>
  {mode==="edit"?<>
   <div className="se-toolbar" aria-label="Ferramentas do documento"><div><button className="se-tool" onClick={()=>editor.undo()} aria-label="Desfazer">↶</button><button className="se-tool" onClick={()=>editor.redo()} aria-label="Refazer">↷</button><span className="se-toolbar-divider"/></div><div className="se-insertions">{insertions.map(x=><button className="se-tool" key={x.label} title={x.description} onClick={()=>insert(x.block)}>{x.label}</button>)}</div><button className="se-tool" aria-pressed={showOutline} onClick={()=>setShowOutline(v=>!v)}>Estrutura</button></div>
   <div className={`se-workspace ${showOutline?"":"se-full"}`}><section className="se-paper" aria-label="Área de edição"><div className="se-paper-caption"><span>AURORA CONSULTORIA</span><span>DOCUMENTO DEMONSTRATIVO</span></div><BlockNoteView editor={editor} theme="light" slashMenu={false} onSelectionChange={()=>setSelectedId(editor.getTextCursorPosition().block.id)} onChange={()=>setState(s=>({...s,draft:copy(editor.document)}))}>
    <SuggestionMenuController triggerCharacter="/" getItems={async(query)=>[...getDefaultReactSlashMenuItems(editor),...insertions.filter(i=>["Gráfico","Indicador","Decisão","Recomendação","Conclusão"].includes(i.label)).map(i=>({title:i.label,subtext:i.description,group:"Estratégia Rotevo",onItemClick:()=>insert(i.block)}))].filter(i=>(i.title+('subtext' in i?i.subtext:"")).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))}/>
   </BlockNoteView><div className="se-paper-footer">Exemplo fictício · Sem integração com projetos ou documentos reais</div></section>
   {showOutline&&<aside className="se-inspector" aria-label="Estrutura e propriedades"><h3>Estrutura do documento</h3><p>Arraste os blocos na página ou selecione um bloco para organizá-lo.</p><label>Bloco selecionado<select value={selected.id} onChange={e=>selectBlock(e.target.value)}>{state.draft.map((b,i)=><option value={b.id} key={b.id}>{i+1}. {blockNames[b.type]??b.type}</option>)}</select></label><div className="se-reorder"><button className="se-button" disabled={state.draft[0]?.id===selected.id} onClick={()=>editor.moveBlocksUp(selected.id)}>↑ Subir</button><button className="se-button" disabled={state.draft.at(-1)?.id===selected.id} onClick={()=>editor.moveBlocksDown(selected.id)}>↓ Descer</button></div>
    {selected.type==="strategic"&&<><label>Tipo de destaque<select value={selected.props.kind} onChange={e=>editor.updateBlock(selected,{props:{kind:e.target.value as "decision"|"recommendation"|"conclusion"}})}><option value="decision">Decisão</option><option value="recommendation">Recomendação</option><option value="conclusion">Conclusão</option></select></label><label>Título do destaque<input maxLength={140} value={selected.props.title} onChange={e=>editor.updateBlock(selected,{props:{title:e.target.value}})}/></label><p>Edite o conteúdo diretamente no bloco.</p></>}
    {selected.type==="indicator"&&<><label>Nome do indicador<input maxLength={100} value={selected.props.label} onChange={e=>editor.updateBlock(selected,{props:{label:e.target.value}})}/></label><label>Valor ilustrativo<input maxLength={40} value={selected.props.value} onChange={e=>editor.updateBlock(selected,{props:{value:e.target.value}})}/></label><label>Contexto<input maxLength={180} value={selected.props.context} onChange={e=>editor.updateBlock(selected,{props:{context:e.target.value}})}/></label></>}
    {selected.type==="strategicChart"&&<><label>Título do gráfico<input maxLength={140} value={selected.props.title} onChange={e=>editor.updateBlock(selected,{props:{title:e.target.value}})}/></label><label>Dados ilustrativos<textarea rows={4} maxLength={600} value={selected.props.series} onChange={e=>editor.updateBlock(selected,{props:{series:e.target.value}})}/></label><p>Até 8 categorias. Exemplo: Indicação:65;Conteúdo:20;Busca:15</p>{!chartPoints(selected.props.series).length&&<p role="alert">Confira o formato e use valores positivos ou zero.</p>}<label>Unidade<input maxLength={12} value={selected.props.unit} onChange={e=>editor.updateBlock(selected,{props:{unit:e.target.value}})}/></label></>}
    <div className="se-help"><strong>Edição por blocos</strong><p>Digite / para inserir. Selecione um trecho para formatar. O botão lateral permite mover e duplicar blocos. Use Ctrl+Z para desfazer.</p></div>
   </aside>}
   </div>
  </>:mode==="read"?<section className="se-reading"><div className="se-reading-label"><span>PRÉVIA DE LEITURA</span><p>Visualização do rascunho atual. Esta ação não libera o documento.</p></div><article className="se-paper"><Reader key={JSON.stringify(state.draft)} blocks={state.draft}/></article></section>:<section className="se-portal" aria-label="Portal simulado"><div className="se-portal-header"><p className="se-eyebrow">PORTAL DO CLIENTE · SIMULAÇÃO</p><h2>Planejamento Estratégico</h2><p>Aurora Consultoria · A leitura permanece dentro desta página.</p></div><section className="se-executive"><p className="se-eyebrow">VISÃO EXECUTIVA · EXEMPLO FICTÍCIO</p><h3>Uma direção clara para crescer</h3><p>Organizar as ofertas e desenvolver previsibilidade na geração de oportunidades. Esta síntese ilustra a experiência do cliente.</p></section><div className="se-area-picker"><label>Área do planejamento<select value={portalArea} onChange={e=>setPortalArea(e.target.value)}>{areas.map(a=><option key={a}>{a}</option>)}</select></label><span>12 áreas metodológicas · Liberação progressiva</span></div>{portalArea===area&&snapshot?<article className="se-paper"><div className="se-reading-label"><span>VERSÃO LIBERADA NA SIMULAÇÃO</span><p>O cliente não acompanha alterações posteriores do rascunho.</p></div><Reader key={JSON.stringify(snapshot)} blocks={snapshot}/></article>:<div className="se-locked"><h3>Documento ainda não liberado</h3><p>{portalArea===area?"Salve, revise, aprove e simule a liberação deste documento para conferir a leitura autorizada.":"Nenhum documento desta área foi liberado nesta simulação. Não são exibidos rascunhos."}</p></div>}<details className="se-schedule"><summary>Cronograma de elaboração e entrega · exemplo</summary><p>Datas não liberam documentos automaticamente.</p><ol><li>Investigação e Diagnóstico · Concluída · 05/11/2026</li><li>Análises Estratégicas · Em andamento · 12/11/2026</li><li>Construção da Estratégia · Prevista · 19/11/2026</li><li>Consolidação do Planejamento · Prevista · 26/11/2026</li><li>Apresentação e Entrega · Prevista · 03/12/2026</li></ol></details></section>}
  <section className="se-publication"><div><h3>Conferência e liberação demonstrativa</h3><p>Publicar no protótipo não publica no sistema. O editor atual e seus documentos continuam preservados.</p><label className="se-visible"><input type="checkbox" checked={state.visible} onChange={e=>setState(s=>({...s,visible:e.target.checked}))}/>Visível no portal simulado</label></div><div className="se-actions"><button className="se-button" disabled={dirty} onClick={()=>action("review")}>Simular revisão</button><button className="se-button" disabled={dirty||!reviewed} onClick={()=>action("approve")}>Simular aprovação</button><button className="se-button se-dark" disabled={dirty||!approved||!state.visible} onClick={()=>action("release")}>Simular liberação</button></div></section>
  <p className="se-footer-note">Documento {code} · {title}. O conteúdo fictício serve para testar os recursos do editor e não substitui a metodologia oficial.</p>
  <div className="se-document-navigation"><button className="se-button" onClick={()=>onNavigate(docs[Math.max(0,docs.findIndex(d=>d.code===code)-1)].code)} disabled={docs[0].code===code}>← Documento anterior</button><span>Trocar de documento reinicia o conteúdo demonstrativo.</span><button className="se-button" onClick={()=>onNavigate(docs[Math.min(docs.length-1,docs.findIndex(d=>d.code===code)+1)].code)} disabled={docs.at(-1)?.code===code}>Próximo documento →</button></div>
 </>;
}
function SwitchDocumentDialog({onCancel,onConfirm}:{onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} aria-labelledby="se-switch-title" className="se-modal" onCancel={e=>{e.preventDefault();onCancel();}}><h2 id="se-switch-title">Trocar o documento demonstrativo?</h2><p>As alterações desta sessão não são persistidas. Ao trocar, o exemplo será reiniciado.</p><div className="se-actions"><button autoFocus className="se-button" onClick={onCancel}>Continuar neste documento</button><button className="se-button se-dark" onClick={onConfirm}>Trocar e reiniciar</button></div></dialog>;
}
export default function StrategicEditorPrototype({embedded=false}:{embedded?:boolean}){
 const [code,setCode]=useState("01.02");const current=docs.find(d=>d.code===code)??docs[0];
 const [pending,setPending]=useState<string|null>(null);
 const navigate=(next:string)=>{if(next!==code)setPending(next);};
 return <div className="se-root"><div className="se-demo-banner"><strong>Protótipo funcional isolado</strong><span>Empresa fictícia · Sem gravação no Supabase · Não altera o Portal real</span></div>{!embedded&&<header className="se-topbar"><RotevoLogo variant="white" size={30}/><span>Planejamento Estratégico</span><span className="se-profile">AC <span>Aurora Consultoria</span></span></header>}<div className="se-main"><div className="se-document-selectors"><label>Área metodológica<select value={current.area} onChange={e=>navigate(docs.find(d=>d.area===e.target.value)!.code)}>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Documento<select value={current.code} onChange={e=>navigate(e.target.value)}>{docs.filter(d=>d.area===current.area).map(d=><option key={d.code} value={d.code}>{d.code} · {d.title}</option>)}</select></label></div><DocumentWorkspace key={current.code} code={current.code} title={current.title} area={current.area} onNavigate={navigate}/></div>{pending&&<SwitchDocumentDialog onCancel={()=>setPending(null)} onConfirm={()=>{setCode(pending);setPending(null);}}/>}</div>;
}

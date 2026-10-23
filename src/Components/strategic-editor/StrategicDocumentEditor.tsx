"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useCreateBlockNote,getDefaultReactSlashMenuItems,SuggestionMenuController} from "@blocknote/react";
import {BlockNoteView} from "@blocknote/mantine";
import {pt} from "@blocknote/core/locales";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import {assetReferences,mapAssetLinks,plainBlocks,validRichContent,type RichContent} from "@/lib/planning/richContent";
import {strategicSchema,type StrategicPartial} from "./schema";
import DynamicDocumentReader from "./DynamicDocumentReader";
import "@blocknote/mantine/style.css";
import "./editor.css";
import "./workspace-preview.css";
import {tools,names,Dialog,ChartFields} from "./WorkspaceControls";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
export type StoredDocument={content:string;updatedAt:string;richContent?:RichContent;reviewStatus?:"draft"|"review"|"approved";publishedContent?:string;publishedRichContent?:RichContent;publishedAt?:string};
export type StrategicPlanningData={ecosystem2027?:{version?:number;selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];hiddenExecutiveDocumentCodes?:string[];documents?:Record<string,StoredDocument>};[key:string]:unknown};
export type StrategicDocumentEditorProps={projectId:string;projectData:StrategicPlanningData;updatedAt:string;onSaved:(data:StrategicPlanningData,updatedAt:string)=>void;onDirtyChange?:(dirty:boolean)=>void;onBusyChange?:(busy:boolean)=>void};
function DocumentBody({code,title,record,links,projectId,updatedAt,onSaved,onDirtyChange,onBusyChange,executive=false,visible=true}:{code:string;title:string;record?:StoredDocument;links:Record<string,string>;executive?:boolean;visible?:boolean}&Pick<StrategicDocumentEditorProps,"projectId"|"updatedAt"|"onSaved"|"onDirtyChange"|"onBusyChange">){
 const linkMap=useRef(links);
 const [initial]=useState(()=>record?.richContent??{format:"blocknote-v1" as const,blocks:plainBlocks(record?.content??"",title)});
 const [draft,setDraft]=useState(initial),[saved,setSaved]=useState(initial);
 const [working,setWorking]=useState(false),[notice,setNotice]=useState(""),[mode,setMode]=useState<"edit"|"read"|"published">("edit");
 const [selectedId,setSelectedId]=useState("");
 const [inspector,setInspector]=useState(false),[adding,setAdding]=useState(false),[focus,setFocus]=useState(false),[publish,setPublish]=useState(false);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 useUnsavedChanges(dirty);
 useEffect(()=>{onBusyChange?.(working);return()=>onBusyChange?.(false);},[working,onBusyChange]);
 useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
 async function upload(file:File){
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>4*1024*1024)throw Error("Use PNG, JPG ou WebP com até 4 MB.");
  const session=await supabase.auth.getSession();if(!session.data.session?.access_token)throw Error("Sessão expirada.");
  const form=new FormData();form.set("file",file);form.set("projectId",projectId);form.set("purpose","planning");
  const res=await fetch("/api/assets",{method:"POST",headers:{Authorization:"Bearer "+session.data.session.access_token},body:form});const value=await res.json();if(!res.ok)throw Error(value?.error??"Não foi possível enviar a imagem.");linkMap.current={...linkMap.current,[value.id]:value.url};return value.url as string;
 }
 const editor=useCreateBlockNote({schema:strategicSchema,initialContent:mapAssetLinks(initial.blocks,links) as StrategicPartial[],dictionary:pt,uploadFile:upload});
 const selected=editor.getBlock(selectedId)||editor.document[0];
 async function action(action:"save"|"review"|"approve"|"publish"|"hide"|"show"){
  if(working)return;if(action!=="save"&&dirty){setNotice("Salve as alterações antes de continuar.");return;}
  setWorking(true);setNotice("");
  try{const result=await request<{project:{data:StrategicPlanningData;updated_at:string}}>("/api/admin/planning/document","PATCH",{projectId,code,expectedUpdatedAt:updatedAt,action,...(action==="save"?{richContent:draft}:{})});if(action==="save")setSaved(draft);onSaved(result.project.data,result.project.updated_at);setNotice({save:"Rascunho salvo. A versão publicada anterior foi preservada.",review:"Documento enviado para revisão.",approve:"Versão aprovada.",publish:"Versão aprovada publicada. A exibição depende do escopo e do status do planejamento." ,hide:"Documento executivo ocultado do cliente.",show:"Documento executivo marcado para exibição após publicação."}[action]);}catch(e){setNotice(e instanceof Error?e.message:"Não foi possível salvar. Seu rascunho continua nesta página.");}finally{setWorking(false);}
 }
 function insert(value:StrategicPartial){if(working)return;const current=editor.getTextCursorPosition().block;const added=editor.insertBlocks([value],current,"after");setSelectedId(added[0].id);setAdding(false);setMode("edit");setInspector(["indicator","strategicChart","strategic"].includes(added[0].type));editor.setTextCursorPosition(added[0].id,"start");editor.focus();}
 const publishedCurrent=!!record?.publishedRichContent&&JSON.stringify(record.publishedRichContent)===JSON.stringify(record.richContent);
 const status=dirty?"Alterações não salvas":publishedCurrent?"Publicado":record?.reviewStatus==="approved"?"Aprovado":record?.reviewStatus==="review"?"Em revisão":"Rascunho";
 const published=record?.publishedRichContent;
 const nextAction=dirty||!record?.richContent?"save":publishedCurrent?null:record.reviewStatus==="review"?"approve":record.reviewStatus==="approved"?"publish":"review";
 const actionLabel={save:"Salvar rascunho",review:"Enviar para revisão",approve:"Aprovar documento",publish:"Publicar documento"};
 return <section className={`pw-editor se-root ${focus?"workspace-focus":""}`}>
 <h2 className="workspace-document-title">{title}</h2><div className="pw-docbar"><div><span className="pw-doccode">DOCUMENTO {code}</span><div className="pw-save-status"><span className={dirty?"pw-dot amber":"pw-dot"}/>{dirty?"Alterações não salvas":record?"Salvo no projeto":"Documento não iniciado"}</div></div><div className="pw-doc-actions"><span className={`pw-status ${!!record?.publishedAt?"green":""}`}>{status}</span>{nextAction&&<button className="pw-primary" disabled={working} onClick={()=>nextAction==="publish"?setPublish(true):void action(nextAction)}>{actionLabel[nextAction]}</button>}</div></div>
 {notice&&<p role="status" className="se-notice">{notice}</p>}<div className="pw-edit-tools"><div className="pw-modes" role="group" aria-label="Modo do documento"><button aria-pressed={mode==="edit"} onClick={()=>setMode("edit")}>Editar</button><button aria-pressed={mode==="read"} onClick={()=>setMode("read")}>Leitura</button><button aria-pressed={mode==="published"} onClick={()=>setMode("published")}>Publicado</button></div><span className="pw-tool-divider"/>
 <button className="pw-tool" onClick={()=>editor.undo()} disabled={working||mode!=="edit"} aria-label="Desfazer">↶</button><button className="pw-tool" onClick={()=>editor.redo()} disabled={working||mode!=="edit"} aria-label="Refazer">↷</button>
 <div className="pw-insert-wrap" onKeyDown={e=>{if(e.key==="Escape")setAdding(false);}}><button className="pw-insert" disabled={working||mode!=="edit"} aria-expanded={adding} onClick={()=>setAdding(!adding)}>＋ Adicionar elemento</button>{adding&&<div className="pw-insert-menu" aria-label="Elementos do documento"><button className="pw-menu-close" onClick={()=>setAdding(false)} aria-label="Fechar elementos">✕</button>{["Escrita","Dados","Estratégia","Mídia"].map(group=><section key={group}><h3>{group}</h3>{tools.filter(t=>t.group===group).map(t=><button key={t.label} onClick={()=>insert(t.block)}><span className="pw-element-icon"><RotevoTablerIcon name={t.icon} size={19} stroke={1.75}/></span><span>{t.label}</span></button>)}</section>)}</div>}</div>
 <div className="pw-tool-spacer"/><button className="pw-tool pw-text-tool" aria-pressed={inspector} onClick={()=>setInspector(!inspector)}>Propriedades</button><button className="pw-tool pw-text-tool" aria-pressed={focus} onClick={()=>setFocus(!focus)}>{focus?"Sair do foco":"Modo foco"}</button></div>
 <div className={`pw-writing-grid ${inspector&&mode==="edit"?"with-inspector":""}`}><div className="pw-sheet-wrap"><article className="pw-sheet" aria-label={mode==="edit"?"Documento editável":"Leitura do rascunho"}><div className="pw-sheet-kicker">DOCUMENTO ESTRATÉGICO <span>{code} · {title}</span></div>{mode==="published"?(published?<DynamicDocumentReader content={published}/>:<p className="se-locked">{record?.publishedContent||"Este documento ainda não foi publicado."}</p>):mode==="edit"?<BlockNoteView editor={editor} theme="light" slashMenu={false} editable={!working} onSelectionChange={()=>{const b=editor.getTextCursorPosition().block;setSelectedId(b.id);if(["indicator","strategicChart","strategic"].includes(b.type))setInspector(true);}} onChange={()=>setDraft({format:"blocknote-v1",blocks:mapAssetLinks(JSON.parse(JSON.stringify(editor.document)),linkMap.current,true)})}><SuggestionMenuController triggerCharacter="/" getItems={async query=>[...getDefaultReactSlashMenuItems(editor),...tools.filter(t=>t.group==="Estratégia"||["Gráfico","Indicador"].includes(t.label)).map(t=>({title:t.label,group:t.group,onItemClick:()=>insert(t.block)}))].filter(t=>t.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))}/></BlockNoteView>:<DynamicDocumentReader content={draft}/>}<footer>Rascunho reservado à equipe · {title}</footer></article><p className="pw-writing-hint">{mode==="edit"?"Digite / para inserir · Selecione um texto para formatar · Arraste blocos para organizar":"Prévia do rascunho. A versão do cliente é publicada separadamente."}</p></div>
 {inspector&&mode==="edit"&&<aside className="pw-properties"><fieldset disabled={working}><header><h3>Propriedades</h3><button onClick={()=>setInspector(false)} aria-label="Fechar propriedades">✕</button></header><label>Elemento selecionado<select value={selected.id} onChange={e=>{setSelectedId(e.target.value);editor.setTextCursorPosition(e.target.value,"start");editor.focus();}}>{editor.document.map((b,i)=><option key={b.id} value={b.id}>{i+1}. {names[b.type]??b.type}</option>)}</select></label>
 {selected.type==="strategicChart"&&<><label>Título do gráfico<input value={selected.props.title} maxLength={140} onChange={e=>editor.updateBlock(selected,{props:{title:e.target.value}})}/></label><ChartFields key={selected.id} series={selected.props.series} onChange={series=>editor.updateBlock(selected,{props:{series}})}/><label>Unidade<input value={selected.props.unit} maxLength={12} placeholder="%, R$, unidades…" onChange={e=>editor.updateBlock(selected,{props:{unit:e.target.value}})}/></label></>}
 {selected.type==="indicator"&&([{key:"label",label:"Nome do indicador"},{key:"value",label:"Valor"},{key:"context",label:"Período e fonte"}] as const).map(f=><label key={f.key}>{f.label}<input value={selected.props[f.key]} maxLength={180} onChange={e=>editor.updateBlock(selected,{props:{[f.key]:e.target.value}})}/></label>)}
 {selected.type==="strategic"&&<><label>Tipo de destaque<select value={selected.props.kind} onChange={e=>editor.updateBlock(selected,{props:{kind:e.target.value as "decision"|"recommendation"|"conclusion"}})}><option value="decision">Decisão</option><option value="recommendation">Recomendação</option><option value="conclusion">Conclusão</option></select></label><label>Título<input value={selected.props.title} maxLength={140} onChange={e=>editor.updateBlock(selected,{props:{title:e.target.value}})}/></label></>}
 <div className="pw-move"><button disabled={editor.document[0].id===selected.id} onClick={()=>editor.moveBlocksUp(selected.id)}>↑ Subir</button><button disabled={editor.document.at(-1)?.id===selected.id} onClick={()=>editor.moveBlocksDown(selected.id)}>↓ Descer</button></div><p>Textos, tabelas e imagens são editados diretamente na página.</p></fieldset></aside>}
 </div>
 {executive&&<label className="se-notice"><input type="checkbox" checked={visible} disabled={working||dirty} onChange={e=>void action(e.target.checked?"show":"hide")}/> Exibir na Visão Executiva após publicação</label>}<div className="pw-publication-strip"><span><span className="pw-dot"/>{record?.publishedAt?"Publicado em "+new Date(record.publishedAt).toLocaleDateString("pt-BR"):"Este documento ainda não foi publicado"}</span><button className="pw-link" onClick={()=>setMode("published")}>Conferir versão publicada →</button></div>
 {publish&&<Dialog title="Publicar este documento?" onClose={()=>setPublish(false)}><p>A versão aprovada de <strong>{title}</strong> será publicada. A exibição para o cliente depende também do escopo e da publicação do planejamento.</p><div className="pw-callout">As próximas alterações ficarão no rascunho. A cópia publicada será preservada.</div><div className="pw-dialog-actions"><button onClick={()=>setPublish(false)}>Continuar revisando</button><button className="pw-primary" onClick={()=>{void action("publish");setPublish(false);}}>Publicar documento</button></div></Dialog>}
 </section>;
}
function ReadyDocument(props:StrategicDocumentEditorProps&{code:string;title:string;record?:StoredDocument;executive?:boolean;visible?:boolean}){
 const [initialRich]=useState(props.record?.richContent);
 const signature=JSON.stringify(initialRich);const [loaded,setLoaded]=useState<{key:string|undefined;links:Record<string,string>;error?:string}|null>(null);
 const refs=assetReferences(initialRich);
 useEffect(()=>{let active=true;const refs=assetReferences(signature?JSON.parse(signature):null);if(!refs.length)return;request<{links:Record<string,string>}>("/api/assets/resolve","POST",{ids:refs}).then(r=>{if(active)setLoaded({key:signature,links:r.links});}).catch(()=>{if(active)setLoaded({key:signature,links:{},error:"Não foi possível carregar as imagens. Recarregue a página."});});return()=>{active=false};},[signature]);
 if(refs.length&&loaded?.key!==signature)return <p role="status">Carregando imagens do documento…</p>;
 if(loaded?.error)return <p role="alert">{loaded.error}</p>;
 return <DocumentBody {...props} links={loaded?.links??{}}/>;
}
export default function StrategicDocumentEditor(props:StrategicDocumentEditorProps){
 const [code,setCode]=useState(""),[search,setSearch]=useState(""),[filter,setFilter]=useState("all"),[collapsed,setCollapsed]=useState<string[]>([]),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
 const docs=[...ecosystemDocuments.filter(d=>props.projectData.ecosystem2027?.selectedDocumentCodes?.includes(d.code)&&!d.area.startsWith("00 ")),...ecosystemDocuments.filter(d=>d.area.startsWith("00 "))];
 const current=docs.find(d=>d.code===code)??docs[0];
 const onDirtyChange=props.onDirtyChange;
 const onBusyChange=props.onBusyChange;
 const notifyBusy=useCallback((value:boolean)=>{setBusy(value);onBusyChange?.(value);},[onBusyChange]);
 const notify=useCallback((value:boolean)=>{setDirty(value);onDirtyChange?.(value);},[onDirtyChange]);
 if(!current)return <p className="rounded-xl bg-white p-5 text-sm">Selecione documentos na aba Documentos para começar.</p>;
 const stored=props.projectData.ecosystem2027?.documents?.[current.code];
 const areas=[...new Set(docs.map(d=>d.area))];
 function select(next:string){if(busy)return;if(dirty&&!window.confirm("Há alterações não salvas. Descartar para trocar de documento?"))return;setCode(next);}
 const statusOf=(c:string)=>{const r=props.projectData.ecosystem2027?.documents?.[c];return r?.reviewStatus==="review"?"review":r?.reviewStatus==="approved"?"approved":"draft";};
 return <div className="pw-planning workspace-real"><aside className="pw-document-nav"><div className="pw-nav-title"><h2>Documentos</h2><span>{docs.length} documentos</span></div><label className="pw-search"><input aria-label="Buscar documento" placeholder="Buscar documento…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className="pw-status-filter" aria-label="Filtrar documentos" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos os documentos</option><option value="draft">Em elaboração</option><option value="review">Em revisão</option><option value="approved">Aprovados</option><option value="published">Publicados</option></select><div className="pw-area-list">{areas.map(area=>{const list=docs.filter(d=>d.area===area&&`${d.code} ${d.title}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))&&(filter==="all"||(filter==="published"?!!props.projectData.ecosystem2027?.documents?.[d.code]?.publishedAt:statusOf(d.code)===filter)));if(!list.length)return null;const open=!!search||filter!=="all"||!collapsed.includes(area);return <section key={area}><button className="pw-area-title" aria-expanded={open} onClick={()=>setCollapsed(prev=>prev.includes(area)?prev.filter(a=>a!==area):[...prev,area])}><span className="pw-area-number">{area.slice(0,2)}</span><span>{area.slice(3)}</span><span className="pw-chevron">{open?"⌄":"›"}</span></button>{open&&<div className="pw-doc-list">{list.map(d=><button key={d.code} disabled={busy} aria-current={current.code===d.code?"page":undefined} onClick={()=>select(d.code)}><span className="pw-doc-marker" aria-hidden="true"/><span>{d.title}<small>{d.code} · {statusOf(d.code)==="review"?"Em revisão":statusOf(d.code)==="approved"?"Aprovado":"Em elaboração"}{props.projectData.ecosystem2027?.documents?.[d.code]?.publishedAt?" · Publicado":""}</small></span></button>)}</div>}</section>})}</div></aside><div className="workspace-editor-main"><ReadyDocument key={props.projectId+current.code} {...props} onBusyChange={notifyBusy} onDirtyChange={notify} code={current.code} executive={current.area.startsWith("00 ")} visible={!props.projectData.ecosystem2027?.hiddenExecutiveDocumentCodes?.includes(current.code)} title={current.title} record={stored&&(!stored.richContent||validRichContent(stored.richContent))?stored:undefined}/></div></div>;
}

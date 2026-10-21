"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useCreateBlockNote} from "@blocknote/react";
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
export type StoredDocument={content:string;updatedAt:string;richContent?:RichContent;reviewStatus?:"draft"|"review"|"approved";publishedContent?:string;publishedRichContent?:RichContent;publishedAt?:string};
export type StrategicPlanningData={ecosystem2027?:{version?:number;selectedDocumentCodes?:string[];presentedDocumentCodes?:string[];hiddenExecutiveDocumentCodes?:string[];documents?:Record<string,StoredDocument>};[key:string]:unknown};
export type StrategicDocumentEditorProps={projectId:string;projectData:StrategicPlanningData;updatedAt:string;onSaved:(data:StrategicPlanningData,updatedAt:string)=>void;onDirtyChange?:(dirty:boolean)=>void;onBusyChange?:(busy:boolean)=>void};
function DocumentBody({code,title,record,links,projectId,updatedAt,onSaved,onDirtyChange,onBusyChange,executive=false,visible=true}:{code:string;title:string;record?:StoredDocument;links:Record<string,string>;executive?:boolean;visible?:boolean}&Pick<StrategicDocumentEditorProps,"projectId"|"updatedAt"|"onSaved"|"onDirtyChange"|"onBusyChange">){
 const linkMap=useRef(links);
 const [initial]=useState(()=>record?.richContent??{format:"blocknote-v1" as const,blocks:plainBlocks(record?.content??"",title)});
 const [draft,setDraft]=useState(initial),[saved,setSaved]=useState(initial);
 const [working,setWorking]=useState(false),[notice,setNotice]=useState(""),[mode,setMode]=useState<"edit"|"read"|"published">("edit");
 const [selectedId,setSelectedId]=useState("");
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
 function insert(value:StrategicPartial){if(working)return;const current=editor.getTextCursorPosition().block;const added=editor.insertBlocks([value],current,"after");setSelectedId(added[0].id);editor.setTextCursorPosition(added[0].id,"start");editor.focus();}
 const status=dirty?"Alterações não salvas":record?.reviewStatus==="approved"?"Aprovado":record?.reviewStatus==="review"?"Em revisão":"Rascunho";
 const published=record?.publishedRichContent;
 return <>
 <div className="se-title-row"><div><p className="se-eyebrow">Documento {code}</p><h2>{title}</h2></div><span className="se-status">{status}</span></div>
 <div className="se-document-heading"><div><p>Documento do projeto · edição por blocos</p><p className="mt-2 text-sm text-[#697386]">O cliente consulta somente a versão publicada. Salvar um rascunho não libera o documento.</p></div><button type="button" className="se-button se-primary" disabled={working} onClick={()=>void action("save")}>{working?"Salvando…":"Salvar rascunho"}</button></div>
 <div className="se-modebar"><nav aria-label="Modo do documento">{[{id:"edit",label:"Editar documento"},{id:"read",label:"Prévia de leitura"},{id:"published",label:"Versão publicada"}].map(m=><button type="button" key={m.id} className="se-button" aria-pressed={mode===m.id} onClick={()=>setMode(m.id as typeof mode)}>{m.label}</button>)}</nav><span>{draft.blocks.length} blocos</span></div>
 {notice&&<p role="status" className="se-notice">{notice}</p>}
 {mode==="edit"?<>
 <div className="se-toolbar" role="toolbar" aria-label="Ferramentas do documento">{[{label:"Título",block:{type:"heading",props:{level:2}}},{label:"Texto",block:{type:"paragraph"}},{label:"Lista",block:{type:"bulletListItem"}},{label:"Tabela",block:{type:"table",content:{type:"tableContent",rows:[{cells:["Coluna 1","Coluna 2"]},{cells:["",""]}]}}},{label:"Imagem",block:{type:"image"}},{label:"Indicador",block:{type:"indicator"}},{label:"Gráfico",block:{type:"strategicChart"}},{label:"Decisão",block:{type:"strategic",props:{kind:"decision",title:"Decisão estratégica"}}},{label:"Recomendação",block:{type:"strategic",props:{kind:"recommendation",title:"Recomendação"}}},{label:"Conclusão",block:{type:"strategic",props:{kind:"conclusion",title:"Conclusão"}}}].map(tool=><button type="button" key={tool.label} disabled={working} onClick={()=>insert(tool.block as StrategicPartial)}>{tool.label}</button>)}</div>
 <div className="se-workspace"><section className="se-paper" aria-label="Área de edição"><BlockNoteView editor={editor} editable={!working} theme="light" onSelectionChange={()=>setSelectedId(editor.getTextCursorPosition().block.id)} onChange={()=>setDraft({format:"blocknote-v1",blocks:mapAssetLinks(JSON.parse(JSON.stringify(editor.document)),linkMap.current,true)})}/></section>
 <aside className="se-inspector"><h3>Estrutura e propriedades</h3><label>Bloco selecionado<select value={selected.id} onChange={e=>{setSelectedId(e.target.value);editor.setTextCursorPosition(e.target.value,"start");editor.focus();}}>{editor.document.map((b,i)=><option key={b.id} value={b.id}>{i+1}. {b.type}</option>)}</select></label><div className="se-reorder"><button type="button" className="se-button" disabled={working||editor.document[0].id===selected.id} onClick={()=>editor.moveBlocksUp(selected.id)}>↑ Subir</button><button type="button" className="se-button" disabled={working||editor.document.at(-1)?.id===selected.id} onClick={()=>editor.moveBlocksDown(selected.id)}>↓ Descer</button></div>
 {selected.type==="indicator"&&([{key:"label",label:"Nome do indicador"},{key:"value",label:"Valor informado"},{key:"context",label:"Contexto"}] as const).map(f=><label key={f.key}>{f.label}<input disabled={working} maxLength={180} value={selected.props[f.key]} onChange={e=>editor.updateBlock(selected,{props:{[f.key]:e.target.value}})}/></label>)}
 {selected.type==="strategicChart"&&([{key:"title",label:"Título do gráfico"},{key:"series",label:"Categorias e valores (Nome:valor;Nome:valor)"},{key:"unit",label:"Unidade"}] as const).map(f=><label key={f.key}>{f.label}<input disabled={working} maxLength={f.key==="series"?600:140} value={selected.props[f.key]} onChange={e=>editor.updateBlock(selected,{props:{[f.key]:e.target.value}})}/></label>)}
 {selected.type==="strategic"&&<label>Título do destaque<input disabled={working} maxLength={140} value={selected.props.title} onChange={e=>editor.updateBlock(selected,{props:{title:e.target.value}})}/></label>}
 <p>Digite / para inserir blocos. Selecione um trecho para formatar. Tabelas e imagens podem ser editadas na própria página.</p></aside></div>
 </>:mode==="read"?<DynamicDocumentReader content={draft}/>:published?<DynamicDocumentReader content={published}/>:<p className="se-locked">Ainda não existe uma versão formatada publicada deste documento.{record?.publishedContent&&<span className="mt-3 block whitespace-pre-wrap">{record.publishedContent}</span>}</p>}
 <section className="se-publication"><div>{executive&&<label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={visible} disabled={working||dirty} onChange={e=>void action(e.target.checked?"show":"hide")}/>Exibir na Visão Executiva após publicação</label>}<h3>Revisão e publicação</h3><p>{record?.publishedAt?"Última publicação: "+new Date(record.publishedAt).toLocaleString("pt-BR"):"Este documento ainda não foi publicado."}</p></div><div className="se-actions"><button type="button" className="se-button" disabled={working||dirty||!record?.richContent||record?.reviewStatus!=="draft"} onClick={()=>void action("review")}>Enviar para revisão</button><button type="button" className="se-button" disabled={working||dirty||record?.reviewStatus!=="review"} onClick={()=>void action("approve")}>Aprovar versão</button><button type="button" className="se-button se-dark" disabled={working||dirty||record?.reviewStatus!=="approved"} onClick={()=>void action("publish")}>Publicar versão</button></div></section>
 </>;
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
 const [code,setCode]=useState(""),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
 const docs=[...ecosystemDocuments.filter(d=>props.projectData.ecosystem2027?.selectedDocumentCodes?.includes(d.code)&&!d.area.startsWith("00 ")),...ecosystemDocuments.filter(d=>d.area.startsWith("00 "))];
 const current=docs.find(d=>d.code===code)??docs[0];
 const onDirtyChange=props.onDirtyChange;
 const notify=useCallback((value:boolean)=>{setDirty(value);onDirtyChange?.(value);},[onDirtyChange]);
 if(!current)return <p className="rounded-xl bg-white p-5 text-sm">Selecione documentos na aba Documentos para começar.</p>;
 const stored=props.projectData.ecosystem2027?.documents?.[current.code];
 return <div className="se-root"><div className="se-main"><label className="block text-sm font-semibold">Documento estratégico<select value={current.code} disabled={busy} onChange={e=>{if(dirty&&!window.confirm("Há alterações não salvas. Descartar para trocar de documento?"))return;setCode(e.target.value);}} className="mt-2 w-full rounded-xl border bg-white p-3">{docs.map(d=><option key={d.code} value={d.code}>{d.code} · {d.title}</option>)}</select></label><ReadyDocument key={props.projectId+current.code} {...props} onBusyChange={setBusy} onDirtyChange={notify} code={current.code} executive={current.area.startsWith("00 ")} visible={!props.projectData.ecosystem2027?.hiddenExecutiveDocumentCodes?.includes(current.code)} title={current.title} record={stored&&(!stored.richContent||validRichContent(stored.richContent))?stored:undefined}/></div></div>;
}

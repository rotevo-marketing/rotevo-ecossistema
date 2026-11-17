"use client";
import {useId,useRef,useState,type ReactNode} from "react";
import RichTextEditor from "@/Components/RichTextEditor";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";
import {companyAnalysisForEditing,companyAnalysisPublicationErrors,isCompanyAnalysisV2,parseCompanyAnalysis,type CompanyAnalysis,type CompanyAnalysisV2,type AnalysisNote} from "@/lib/planning/companyAnalysis";
import CompanyAnalysis0201Presentation,{LegacyCompanyAnalysisView} from "./CompanyAnalysis0201Presentation";
import styles from "./CompanyAnalysis0201.module.css";

type Props={value?:CompanyAnalysis|null;published?:boolean;preview:boolean;onSave?:(value:CompanyAnalysis)=>Promise<void>;onPublish?:()=>Promise<void>};
const blocks=[["identity","Caracterização Empresarial"],["history","Trajetória e Evolução"],["organization","Estrutura e Governança"],["conditions","Estágio e Condições Atuais"],["synthesis","Síntese da Análise"]] as const;
const note=():AnalysisNote=>({id:crypto.randomUUID(),title:"",description:""});
function Field({label,value,onChange,rich=false,helper,accessibleLabel}:{label:string;value:string;onChange:(v:string)=>void;rich?:boolean;helper?:string;accessibleLabel?:string}){
 return rich?<div className={styles.richField}><span className={styles.fieldLabel}>{label}</span><RichTextEditor label={accessibleLabel??label} tablerToolbar value={value} onChange={onChange} minHeight={100}/>{helper&&<small>{helper}</small>}</div>:<label className={styles.field}><span>{label}</span><input value={value} aria-label={accessibleLabel??label} maxLength={12000} onChange={e=>onChange(e.target.value)}/>{helper&&<small>{helper}</small>}</label>;
}
function Repeater<T extends AnalysisNote>({label,items,onChange,create,extra,period=false,helper}:{label:string;items:T[];onChange:(items:T[])=>void;create:()=>T;extra?:(item:T,change:(patch:Partial<T>)=>void,context:string)=>ReactNode;period?:boolean;helper?:string}){
 const change=(id:string,patch:Partial<T>)=>onChange(items.map(item=>item.id===id?{...item,...patch}:item));
 const move=(index:number,offset:number)=>{const next=[...items];[next[index],next[index+offset]]=[next[index+offset],next[index]];onChange(next);};
 return <section className={styles.repeater} aria-label={label}><div className={styles.repeatHeading}><div><h4>{label}</h4>{helper&&<p className={styles.help}>{helper}</p>}</div><button type="button" onClick={()=>onChange([...items,create()])} className={styles.addButton}><RotevoTablerIcon name="square-rounded-plus" size={17}/>Adicionar<span className={styles.srOnly}> em {label}</span></button></div>
  {items.map((item,index)=><div key={item.id} className={styles.repeatItem}>
   {period&&<Field label="Período" value={(item as T&{period:string}).period} onChange={value=>change(item.id,{period:value} as unknown as Partial<T>)} helper="Ano, mês/ano ou intervalo. Preserve a precisão conhecida." accessibleLabel={"Período de "+label+" "+(index+1)}/>}
   <Field label={label==="Responsabilidades"?"Função":"Título"} value={item.title} onChange={title=>change(item.id,{title} as Partial<T>)} accessibleLabel={(label==="Responsabilidades"?"Função":"Título")+" de "+label+" "+(index+1)}/>
   {extra?.(item,patch=>change(item.id,patch),label+" "+(index+1))}
   <div className={styles.wide}><Field label="Descrição" rich value={item.description} onChange={description=>change(item.id,{description} as Partial<T>)} accessibleLabel={"Descrição de "+label+" "+(index+1)}/></div>
   <div className={styles.repeatActions}><button type="button" aria-label={"Subir "+label+" "+(index+1)} disabled={index===0} onClick={()=>move(index,-1)}><RotevoTablerIcon name="chevron-up" size={16}/>Subir</button><button type="button" aria-label={"Descer "+label+" "+(index+1)} disabled={index===items.length-1} onClick={()=>move(index,1)}><RotevoTablerIcon name="chevron-down" size={16}/>Descer</button><button type="button" aria-label={"Excluir "+label+" "+(index+1)} onClick={()=>{if((item.title.trim()||item.description.trim())&&!window.confirm("Excluir este registro? A alteração será aplicada ao salvar o rascunho."))return;onChange(items.filter(row=>row.id!==item.id));}}><RotevoTablerIcon name="x" size={16}/>Excluir</button></div>
  </div>)}
 </section>;
}
export default function CompanyAnalysis0201({value,published=false,preview,onSave,onPublish}:Props){
 const prefix=useId(),[draft,setDraft]=useState<CompanyAnalysisV2>(()=>companyAnalysisForEditing(value));
 const [busy,setBusy]=useState<"save"|"publish"|null>(null),[notice,setNotice]=useState(""),[error,setError]=useState(false);
 const lock=useRef(false);
 const changed=!!onSave&&JSON.stringify(draft)!==JSON.stringify(companyAnalysisForEditing(value));
 useUnsavedChanges(changed);
 const problems=companyAnalysisPublicationErrors(draft);
 const [expanded,setExpanded]=useState<string[]>(["identity"]);
 const patch=<K extends keyof CompanyAnalysisV2>(group:K,fields:Partial<CompanyAnalysisV2[K]>)=>setDraft(current=>({...current,[group]:{...(current[group] as object),...fields}}));
 function show(id:string){setExpanded(current=>current.includes(id)?current:[...current,id]);requestAnimationFrame(()=>document.getElementById(prefix+id)?.scrollIntoView({block:"start",behavior:"smooth"}));}
 async function save(){
  if(!onSave||lock.current)return;
  lock.current=true;setBusy("save");setError(false);setNotice("");
  try{await onSave(draft);setNotice("Análise da Empresa salva.");}catch(cause){setError(true);setNotice(cause instanceof Error?cause.message:"Não foi possível salvar. Seu rascunho foi preservado.");}
  finally{lock.current=false;setBusy(null);}
 }
 async function publish(){
  if(!onPublish||changed||lock.current||problems.length)return;
  lock.current=true;setBusy("publish");setError(false);setNotice("");
  try{await onPublish();setNotice("Página disponibilizada. O acesso do cliente continua condicionado à publicação e às permissões do planejamento.");}
  catch(cause){setError(true);setNotice(cause instanceof Error?cause.message:"Não foi possível disponibilizar a página.");}
  finally{lock.current=false;setBusy(null);}
 }
 const actions=<div className={styles.topActions}><button type="button" onClick={()=>void save()} disabled={!onSave||!!busy}><RotevoTablerIcon name="check" size={16}/>{busy==="save"?"Salvando…":"Salvar rascunho"}</button>{onPublish&&<button type="button" onClick={()=>void publish()} disabled={!!busy||changed||!value||problems.length>0} aria-describedby={problems.length?prefix+"requirements":undefined}>{busy==="publish"?"Disponibilizando…":"Disponibilizar página"}</button>}</div>;
 const readValue=onSave?draft:parseCompanyAnalysis(value);
 return <div className={styles.root} data-company-analysis-editor="1.0">
  <header className={styles.intro}><div><p>PLANEJAMENTO V5 · 02.01</p><h2>Análise da Empresa</h2>{!preview&&<small>{published?"Existe uma versão disponibilizada. Salvar rascunho não altera essa versão.":"Página ainda não disponibilizada ao cliente."}</small>}</div>{!preview&&actions}</header>
  {notice&&<p role={error?"alert":"status"} className={styles.notice}>{notice}</p>}
  {changed&&<p role="status" className={styles.unsaved}>Alterações não salvas na Análise da Empresa.</p>}
  {preview?(isCompanyAnalysisV2(readValue)?<CompanyAnalysis0201Presentation value={readValue}/>:<LegacyCompanyAnalysisView value={readValue}/>):<>
   <nav aria-label="Blocos da Análise da Empresa" className={styles.blockNavigation}>{blocks.map(([id,title],index)=><button key={id} type="button" onClick={()=>show(id)}>{String(index+1).padStart(2,"0")} · {title}</button>)}</nav>
   {problems.length>0&&<p id={prefix+"requirements"} className={styles.help}>Para disponibilizar: {problems.join(" ")} O rascunho pode ser salvo parcialmente.</p>}
   {blocks.map(([id,title],index)=><details id={prefix+id} key={id} className={styles.block} open={expanded.includes(id)} onToggle={event=>{const open=event.currentTarget.open;setExpanded(current=>open?current.includes(id)?current:[...current,id]:current.filter(item=>item!==id));}}>
    <summary className={styles.blockHeading}><span>{String(index+1).padStart(2,"0")}</span><h3>{title}</h3><RotevoTablerIcon name="chevron-down" size={18}/></summary>
    {id==="identity"&&<div className={styles.fields}>
     <div className={styles.wide}><Field label="Nome de apresentação" value={draft.identity.displayName} onChange={displayName=>patch("identity",{displayName})} helper="Obrigatório para publicação."/></div>
     <div className={styles.wide}><Field label="Descrição do negócio" value={draft.identity.description} onChange={description=>patch("identity",{description})} rich helper="Obrigatória para publicação."/></div>
     {([["founded","Fundação"],["referenceLocation","Localização"],["geographicScope","Abrangência geográfica"],["operatingMode","Modalidade de atuação"]] as const).map(([key,label])=><Field key={key} label={label} value={draft.identity[key]} onChange={text=>patch("identity",{[key]:text})} helper={key==="founded"?"Ano ou mês/ano. Opcional.":undefined}/>)}
    </div>}
    {id==="history"&&<Repeater label="Marcos da trajetória" items={draft.history.milestones} onChange={milestones=>patch("history",{milestones})} create={()=>({...note(),period:""})} period helper="Organize os marcos cronologicamente com Subir e Descer. Nenhuma data será inferida."/>}
    {id==="organization"&&<>
     <section aria-label="Liderança" className={styles.fields}><h4 className={styles.wide}>Liderança</h4><Field label="Nome" value={draft.organization.leadership.name} onChange={name=>patch("organization",{leadership:{...draft.organization.leadership,name}})}/><Field label="Função" value={draft.organization.leadership.role} onChange={role=>patch("organization",{leadership:{...draft.organization.leadership,role}})}/><div className={styles.wide}><Field label="Descrição da liderança" rich value={draft.organization.leadership.description} onChange={description=>patch("organization",{leadership:{...draft.organization.leadership,description}})}/></div></section>
     <Repeater label="Frentes de atuação" items={draft.organization.workstreams} onChange={workstreams=>patch("organization",{workstreams})} create={note} helper="Frentes de negócio não representam departamentos automaticamente."/>
     <Repeater label="Responsabilidades" items={draft.organization.responsibilities} onChange={responsibilities=>patch("organization",{responsibilities})} create={()=>({...note(),responsible:""})} extra={(n,change,context)=><Field label="Responsável" value={n.responsible} onChange={responsible=>change({responsible})} accessibleLabel={"Responsável de "+context}/>}/>
     <Repeater label="Apoios externos" items={draft.organization.externalSupports} onChange={externalSupports=>patch("organization",{externalSupports})} create={()=>({...note(),supportType:""})} extra={(n,change,context)=><Field label="Tipo de apoio" value={n.supportType} onChange={supportType=>change({supportType})} accessibleLabel={"Tipo de apoio de "+context}/>} helper="Parceiros externos permanecem identificados como apoios."/>
     <Field label="Governança" rich value={draft.governance.summary} onChange={summary=>patch("governance",{summary})} helper="Síntese sobre decisões e distribuição de responsabilidades."/>
    </>}
    {id==="conditions"&&<>
     <Field label="Caracterização do estágio atual" rich value={draft.conditions.stage} onChange={stage=>patch("conditions",{stage})}/>
     <Repeater label="Capacidades identificadas" items={draft.conditions.capacities} onChange={capacities=>patch("conditions",{capacities})} create={note}/>
     <Repeater label="Condicionantes" items={draft.conditions.constraints} onChange={constraints=>patch("conditions",{constraints})} create={note}/>
     <Repeater label="Limitações relevantes" items={draft.conditions.limitations} onChange={limitations=>patch("conditions",{limitations})} create={note}/>
    </>}
    {id==="synthesis"&&<>
     <Field label="Conclusão central" rich value={draft.synthesis.conclusion} onChange={conclusion=>patch("synthesis",{conclusion})}/>
     <Repeater label="Principais constatações" items={draft.synthesis.findings} onChange={findings=>patch("synthesis",{findings})} create={note} helper="Priorize editorialmente até três constatações. Você pode adicionar mais, sem truncar o conteúdo."/>
     <Field label="Implicação estratégica" rich value={draft.synthesis.implication} onChange={implication=>patch("synthesis",{implication})} helper="Registre as consequências da análise, sem antecipar posicionamento, ofertas, campanhas ou canais."/>
    </>}
   </details>)}
   {draft.legacySnapshot&&<details className={styles.compatibility}><summary>Dados preservados da versão anterior<RotevoTablerIcon name="history" size={16}/></summary><p>Confira o registro original antes de disponibilizar a nova composição. Estes dados internos não são copiados para a apresentação ao cliente.</p><LegacyCompanyAnalysisView value={draft.legacySnapshot}/></details>}
   <div className={styles.footer}>{actions}</div>
  </>}
 </div>;
}

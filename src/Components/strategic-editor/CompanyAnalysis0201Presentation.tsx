"use client";
import {useId} from "react";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {safeCompanyRichText,companyText} from "@/lib/planning/companyAnalysisText";
import type {CompanyAnalysisV2,AnalysisNote,LegacyCompanyAnalysis} from "@/lib/planning/companyAnalysis";
import styles from "./CompanyAnalysis0201.module.css";

const meaningful=(text?:string)=>!!text&&!!companyText(text);
const visible=<T extends AnalysisNote>(items:T[]):T[]=>items.filter(n=>n.title.trim()||meaningful(n.description)||("responsible" in n&&String(n.responsible).trim())||("supportType" in n&&String(n.supportType).trim()));
export function AnalysisRichText({value}:{value:string}){
 return meaningful(value)?<div className={styles.richContent} dangerouslySetInnerHTML={{__html:safeCompanyRichText(value)}}/>:null;
}
function Notes({items}:{items:AnalysisNote[]}){
 return <div className={styles.noteGrid}>{visible(items).map(item=><article key={item.id}>
  {item.title.trim()&&<h4>{item.title}</h4>}
  {companyText(item.description).length>240?<details className={styles.readMore}><summary>Ler descrição<RotevoTablerIcon name="chevron-down" size={15}/></summary><AnalysisRichText value={item.description}/></details>:<AnalysisRichText value={item.description}/>}
 </article>)}</div>;
}
export default function CompanyAnalysis0201Presentation({value}:{value:CompanyAnalysisV2}){
 const prefix=useId(),v=value;
 const sections=[
  {key:"identity",title:"Caracterização Empresarial",show:!!v.identity.displayName.trim()||meaningful(v.identity.description)},
  {key:"history",title:"Trajetória e Evolução",show:v.history.milestones.some(n=>n.period.trim()||n.title.trim()||meaningful(n.description))},
  {key:"organization",title:"Estrutura e Governança",show:!!v.organization.leadership.name.trim()||!!v.organization.leadership.role.trim()||meaningful(v.organization.leadership.description)||[v.organization.workstreams,v.organization.responsibilities,v.organization.externalSupports].some(items=>visible(items).length)||meaningful(v.governance.summary)},
  {key:"conditions",title:"Estágio e Condições Atuais",show:meaningful(v.conditions.stage)||[v.conditions.capacities,v.conditions.constraints,v.conditions.limitations].some(items=>visible(items).length)},
  {key:"synthesis",title:"Síntese da Análise",show:meaningful(v.synthesis.conclusion)||visible(v.synthesis.findings).length||meaningful(v.synthesis.implication)}
 ];
 return <div className={styles.presentation} data-company-analysis-presentation="1.0">
  {sections.filter(section=>section.show).map(section=><section key={section.key} aria-labelledby={prefix+section.key} className={styles.presentationBlock}>
   <h3 id={prefix+section.key} className={styles.presentationHeading}><span>{String(sections.indexOf(section)+1).padStart(2,"0")}</span>{section.title}</h3>
   {section.key==="identity"&&<div className={styles.institution}>
    {v.identity.displayName.trim()&&<h4 className={styles.entityTitle}>{v.identity.displayName}</h4>}
    <AnalysisRichText value={v.identity.description}/>
    <dl className={styles.attributes}>{([["Fundação",v.identity.founded],["Localização",v.identity.referenceLocation],["Abrangência geográfica",v.identity.geographicScope],["Modalidade de atuação",v.identity.operatingMode]] as const).filter(([,text])=>text.trim()).map(([label,text])=><div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
   </div>}
   {section.key==="history"&&<ol className={styles.timeline}>{v.history.milestones.filter(n=>n.period.trim()||n.title.trim()||meaningful(n.description)).map(m=><li className={styles.milestone} key={m.id}>
    {m.period.trim()?<time>{m.period}</time>:<span/>}<span className={styles.dot} aria-hidden="true"/><div>{m.title.trim()&&<h4>{m.title}</h4>}<AnalysisRichText value={m.description}/></div>
   </li>)}</ol>}
   {section.key==="organization"&&<div className={styles.organizationMap}>
    {(v.organization.leadership.name.trim()||v.organization.leadership.role.trim()||meaningful(v.organization.leadership.description))&&<section className={styles.orgLead} aria-label="Liderança"><p className={styles.eyebrow}>Liderança</p>{v.organization.leadership.name.trim()&&<h4>{v.organization.leadership.name}</h4>}{v.organization.leadership.role.trim()&&<p>{v.organization.leadership.role}</p>}<AnalysisRichText value={v.organization.leadership.description}/></section>}
    <div className={styles.organizationGroups}>
     {visible(v.organization.workstreams).length>0&&<section aria-label="Frentes de atuação" className={styles.workstreams}><h4>Frentes de atuação</h4><Notes items={v.organization.workstreams}/></section>}
     {visible(v.organization.responsibilities).length>0&&<section aria-label="Responsabilidades" className={styles.responsibilities}><h4>Responsabilidades</h4><div className={styles.governance}>{visible(v.organization.responsibilities).map(n=><article key={n.id}>{n.title.trim()&&<h5>{n.title}</h5>}{n.responsible.trim()&&<p className={styles.assignee}>{n.responsible}</p>}<AnalysisRichText value={n.description}/></article>)}</div></section>}
     {visible(v.organization.externalSupports).length>0&&<section aria-label="Apoios externos" className={styles.externalSupports}><h4>Apoios externos</h4>{v.organization.externalSupports.filter(n=>n.title.trim()||meaningful(n.description)||n.supportType.trim()).map(n=><article key={n.id}>{n.title.trim()&&<h5>{n.title}</h5>}{n.supportType.trim()&&<p className={styles.eyebrow}>{n.supportType}</p>}<AnalysisRichText value={n.description}/></article>)}</section>}
    </div>
    {meaningful(v.governance.summary)&&<section className={styles.governanceSummary}><h4>Governança</h4><AnalysisRichText value={v.governance.summary}/></section>}
   </div>}
   {section.key==="conditions"&&<><AnalysisRichText value={v.conditions.stage}/><div className={styles.diagnosticGrid}>{([
    ["Capacidades identificadas",v.conditions.capacities,styles.capacities],
    ["Condicionantes",v.conditions.constraints,styles.constraints],
    ["Limitações relevantes",v.conditions.limitations,styles.limitations]
   ] as const).filter(([,items])=>visible(items).length).map(([title,items,css])=><section key={title} className={css}><h4>{title}</h4><Notes items={items}/></section>)}</div></>}
   {section.key==="synthesis"&&<><div className={styles.conclusion}><AnalysisRichText value={v.synthesis.conclusion}/></div>{visible(v.synthesis.findings).length>0&&<section aria-label="Principais constatações"><h4 className={styles.subheading}>Principais constatações</h4><Notes items={v.synthesis.findings}/></section>}{meaningful(v.synthesis.implication)&&<section className={styles.implication}><h4>Implicação estratégica</h4><AnalysisRichText value={v.synthesis.implication}/></section>}</>}
  </section>)}
 </div>;
}

const legacyLabels:Record<string,string>={displayName:"Nome de apresentação",mainActivity:"Atividade principal",businessNature:"Natureza do negócio",sector:"Setor",specialty:"Ramo específico",niche:"Nicho",founded:"Fundação",referenceLocation:"Localização",geographicScope:"Abrangência",operatingMode:"Modalidade",deliveryProfile:"Atendimento",summary:"Síntese",reading:"Leitura da trajetória",organizationName:"Organização",lead:"Responsável principal",leadRole:"Função",description:"Descrição",decisionMakers:"Decisores",conclusion:"Conclusão",stage:"Estágio",explanation:"Análise complementar",caveats:"Ressalvas"};
/** Read-only compatibility for already-published snapshots; no conversion/write. */
export function LegacyCompanyAnalysisView({value}:{value:LegacyCompanyAnalysis}){
 const names={identity:"Caracterização Empresarial",history:"Trajetória e Evolução",organization:"Estrutura e Organização",governance:"Governança e Decisões",conditions:"Estágio e Condições Atuais",synthesis:"Síntese da Análise"};
 return <div className={styles.presentation}>{Object.entries(value).map(([key,group])=>{
  const entries=Object.entries(group),strings=entries.filter(([name,text])=>typeof text==="string"&&text.trim()&&legacyLabels[name]),lists=entries.filter(([,items])=>Array.isArray(items)&&items.length);
  if(!strings.length&&!lists.length)return null;
  return <section className={styles.presentationBlock} key={key}><h3 className={styles.presentationHeading}>{names[key as keyof typeof names]}</h3>
   {strings.map(([name,text])=><div className={styles.textBlock} key={name}><h4>{legacyLabels[name]}</h4><p>{String(text)}</p></div>)}
   {lists.map(([name,items])=><div className={styles.noteGrid} key={name}>{(items as Record<string,string>[]).map(n=><article key={n.id}>{n.period&&<p className={styles.eyebrow}>{n.period}</p>}{n.kind&&<small>{({workstream:"Frente de atuação",department:"Departamento informado",external:"Apoio externo",person:"Pessoa e função"} as Record<string,string>)[n.kind]}</small>}<h4>{n.title}</h4>{n.responsible&&<p>{n.responsible}</p>}{n.description&&<p>{n.description}</p>}{n.caveat&&<p>{n.caveat}</p>}{n.parentId&&<p>Vinculado a: {value.organization.entries.find(item=>item.id===n.parentId)?.title??"Não informado"}</p>}</article>)}</div>)}
  </section>;
 })}</div>;
}

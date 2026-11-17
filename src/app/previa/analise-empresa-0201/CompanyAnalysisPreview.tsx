"use client";
import {useEffect,useState} from "react";
import PlanningV5 from "@/Components/strategic-editor/PlanningV5";
import {confirmDiscardChanges} from "@/hooks/useUnsavedChanges";
import {validCompanyAnalysis,publicCompanyAnalysis,type CompanyAnalysis} from "@/lib/planning/companyAnalysis";
import {syntheticCompanyAnalysis} from "./fixture";
import styles from "./preview.module.css";
const key="rotevo-synthetic-company-analysis-0201-v1";
export default function CompanyAnalysisPreview(){
 const [draft,setDraft]=useState<CompanyAnalysis>(()=>syntheticCompanyAnalysis());
 const [published,setPublished]=useState<CompanyAnalysis|null>(null);
 const [preview,setPreview]=useState(false),[client,setClient]=useState(false),[dark,setDark]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem(key);if(saved){const v=JSON.parse(saved);if(validCompanyAnalysis(v.draft))setDraft(v.draft);if(validCompanyAnalysis(v.published))setPublished(publicCompanyAnalysis(v.published));}}catch{/* Use synthetic fixture when storage is unavailable. */}setReady(true);},[]);
 useEffect(()=>{document.documentElement.dataset.rotevoAppearance=dark?"dark":"light";},[dark]);
 function persist(nextDraft:CompanyAnalysis,nextPublished:CompanyAnalysis|null){localStorage.setItem(key,JSON.stringify({draft:nextDraft,published:nextPublished}));setDraft(structuredClone(nextDraft));setPublished(nextPublished?structuredClone(nextPublished):null);}
 return <main className={styles.root} data-preview-ready={ready?"true":"false"}>
  <header className={styles.header}><div><p>HOMOLOGAÇÃO ISOLADA · DADOS SINTÉTICOS</p><h1>02.01 | Análise da Empresa</h1><small>Salvar e disponibilizar nesta prévia afetam somente este navegador. Sem conexão com banco, clientes ou produção.</small></div><div className={styles.controls}>
   <button type="button" aria-pressed={!client} onClick={()=>{if(!client||confirmDiscardChanges())setClient(false);}}>Painel do Estrategista</button>
   <button type="button" aria-pressed={client} onClick={()=>{if(client||confirmDiscardChanges())setClient(true);}}>Portal do Cliente</button>
   <button type="button" aria-label="Alternar tema" onClick={()=>setDark(!dark)}>{dark?"Modo claro":"Modo escuro"}</button>
   <button type="button" onClick={()=>{if(!confirmDiscardChanges())return;localStorage.removeItem(key);location.reload();}}>Restaurar exemplo sintético</button>
  </div></header>
  {ready&&(client?<PlanningV5 key="client" project={{id:"synthetic-client",title:"Projeto sintético"}} companyAnalysis={published} preview/>:<PlanningV5 key="strategist" project={{id:"synthetic-strategist",title:"Projeto sintético"}} companyAnalysis={draft} publishedCompanyAnalysis={published} onSaveCompanyAnalysis={async v=>persist(v,published)} onPublishCompanyAnalysis={async()=>{const snapshot=publicCompanyAnalysis(draft);if(!snapshot)throw Error("Complete os campos obrigatórios.");persist(draft,snapshot);}} preview={preview} onPreviewChange={setPreview}/>)}
 </main>;
}

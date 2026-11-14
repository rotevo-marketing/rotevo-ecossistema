"use client";
import {useState} from "react";
import {planningSnapshot,clientDocumentCode} from "@/lib/ui/planningSnapshot";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import type {StrategicPlanningData} from "./StrategicDocumentEditor";
import DynamicDocumentReader from "./DynamicDocumentReader";
export default function PublishedPlanningPreview({data,status,title,clientName}:{data:StrategicPlanningData;status:string;title:string;clientName:string}){
 const [code,setCode]=useState("");
 const eco=planningSnapshot(data,status);
 const allDocuments={...eco?.documents,...eco?.executiveDocuments};
 const docs=ecosystemDocuments.filter(d=>(d.area.startsWith("00 ")||clientDocumentCode(d.code))&&!!allDocuments[d.code]?.content?.trim());
 const current=docs.find(d=>d.code===code)??docs[0];const record=current?allDocuments[current.code]:null;
 return <section className="pw-secondary pw-client"><div className="pw-client-heading"><div><p className="pw-eyebrow">VISÃO DO CLIENTE · VERSÕES PUBLICADAS</p><h2>{title}</h2><p>{clientName}</p></div><span className="pw-status">{docs.length} documentos publicados e visíveis</span></div>{status!=="published"&&<p className="se-notice" role="status">A apresentação está indisponível ao cliente. Esta conferência é reservada à equipe. Use “Disponibilizar apresentação” para liberar o acesso.</p>}{current&&record?<><label className="workspace-published-select">Documento<select value={current.code} onChange={e=>setCode(e.target.value)}>{docs.map(d=><option key={d.code} value={d.code}>{d.code} · {d.title}</option>)}</select></label><article className="pw-sheet"><h3>{current.title}</h3>{record.richContent?<DynamicDocumentReader content={record.richContent}/>:<p className="whitespace-pre-wrap">{record.content}</p>}</article></>:<div className="pw-empty-client"><h3>Nenhum documento disponível para o cliente</h3><p>Revise, aprove e publique o documento. Em Configurar documentos, marque também sua exibição.</p></div>}</section>;
}

"use client";
import {useEffect,useRef,useState} from "react";
import type {RotevoIconName} from "@/Components/RotevoTablerIcon";
import {chartPoints} from "@/lib/strategic-editor/prototype";
import type {StrategicPartial} from "./schema";
export const names:Record<string,string>={paragraph:"Texto",heading:"Título",bulletListItem:"Lista",numberedListItem:"Lista numerada",checkListItem:"Checklist",table:"Tabela",image:"Imagem",quote:"Citação",strategic:"Destaque estratégico",indicator:"Indicador",strategicChart:"Gráfico"};
export function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);return <dialog ref={ref} className="pw-dialog" onCancel={e=>{e.preventDefault();onClose();}} aria-label={title}><header><h2>{title}</h2><button autoFocus onClick={onClose} aria-label="Fechar janela">✕</button></header>{children}</dialog>;}
export const tools:{label:string;icon:RotevoIconName;group:string;block:StrategicPartial}[]=[
 {label:"Título",icon:"h-2",group:"Escrita",block:{type:"heading",props:{level:2},content:"Novo título"}},
 {label:"Texto",icon:"align-left",group:"Escrita",block:{type:"paragraph",content:""}},
 {label:"Lista",icon:"list",group:"Escrita",block:{type:"bulletListItem",content:""}},
 {label:"Checklist",icon:"list-check",group:"Escrita",block:{type:"checkListItem",content:""}},
 {label:"Tabela",icon:"table",group:"Dados",block:{type:"table",content:{type:"tableContent",rows:[{cells:["Categoria","Detalhamento"]},{cells:["",""]}]}}},
 {label:"Indicador",icon:"number-123",group:"Dados",block:{type:"indicator",props:{label:"Nome do indicador",value:"0",context:"Informe o período e a fonte"}}},
 {label:"Gráfico",icon:"chart-bar",group:"Dados",block:{type:"strategicChart",props:{title:"Novo gráfico",series:"Categoria 1:10;Categoria 2:20",unit:""}}},
 {label:"Decisão",icon:"arrows-split",group:"Estratégia",block:{type:"strategic",props:{kind:"decision",title:"Decisão estratégica"},content:""}},
 {label:"Recomendação",icon:"bulb",group:"Estratégia",block:{type:"strategic",props:{kind:"recommendation",title:"Recomendação"},content:""}},
 {label:"Conclusão",icon:"circle-check",group:"Estratégia",block:{type:"strategic",props:{kind:"conclusion",title:"Conclusão"},content:""}},
 {label:"Imagem",icon:"photo",group:"Mídia",block:{type:"image"}}
];
export function ChartFields({series,onChange}:{series:string;onChange:(value:string)=>void}){
 const [rows,setRows]=useState(()=>chartPoints(series).map(p=>({label:p.label,value:String(p.value)})));
 const [error,setError]=useState("");
 function update(next:typeof rows){setRows(next);if(!next.length||next.some(r=>!r.label.trim()||r.label.length>40||/[;:]/.test(r.label)||r.value.trim()===""||!Number.isFinite(Number(r.value))||Number(r.value)<0||Number(r.value)>1000000)){setError("Preencha as categorias e valores de 0 a 1.000.000. Evite : e ; nos nomes.");return;}setError("");onChange(next.map(r=>r.label.trim()+":"+Number(r.value)).join(";"));}
 return <fieldset className="pw-chart-fields"><legend>Dados do gráfico</legend><div className="pw-row-labels"><span>Categoria</span><span>Valor</span></div>{rows.map((row,i)=><div className="pw-data-row" key={i}><input aria-label={`Categoria ${i+1}`} value={row.label} maxLength={40} onChange={e=>update(rows.map((r,j)=>j===i?{...r,label:e.target.value}:r))}/><input type="number" min="0" max="1000000" step="any" aria-label={`Valor ${i+1}`} value={row.value} onChange={e=>update(rows.map((r,j)=>j===i?{...r,value:e.target.value}:r))}/><button aria-label={`Remover categoria ${i+1}`} disabled={rows.length<2} onClick={()=>update(rows.filter((_,j)=>i!==j))}>×</button></div>)}{error&&<p role="alert" className="pw-error">{error}</p>}<button className="pw-link" disabled={rows.length>=8} onClick={()=>update([...rows,{label:`Categoria ${rows.length+1}`,value:"0"}])}>+ Adicionar categoria</button><small>Até 8 categorias. O gráfico acompanha os dados válidos.</small></fieldset>;
}

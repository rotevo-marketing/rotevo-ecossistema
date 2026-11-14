"use client";
import {useState} from "react";
import {ecosystemDocuments} from "@/data/ecosystem2027";
import type {RichContent} from "@/lib/planning/richContent";
import DynamicDocumentReader from "@/Components/strategic-editor/DynamicDocumentReader";
export type PublishedStrategicDocument={content:string;richContent?:RichContent};
function ExecutiveDocument({title,document}:{title:string;document:PublishedStrategicDocument}){const [opened,setOpened]=useState(false);return <details onToggle={e=>setOpened(e.currentTarget.open)} className="rounded-xl border border-[#E3E7F0] bg-[#FAFBFD] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#0B142A]">{title}</summary>{opened?(document.richContent?<DynamicDocumentReader content={document.richContent}/>:<p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#525B70]">{document.content}</p>):null}</details>;}
export default function ExecutivePlanningSummary({documents}:{documents:Record<string,PublishedStrategicDocument>}){const available=ecosystemDocuments.filter(d=>d.area.startsWith("00 ")&&Boolean(documents[d.code]?.content.trim()));if(!available.length)return <p className="mt-4 rounded-xl bg-[#F6F7FB] p-4 text-sm leading-6 text-[#525B70]">A síntese executiva ainda não foi publicada pela Rotevo.</p>;return <div className="mt-4 space-y-3">{available.map(doc=><ExecutiveDocument key={doc.code} title={doc.title} document={documents[doc.code]}/>)}</div>;}

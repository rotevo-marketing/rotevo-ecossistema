"use client";
import dynamic from "next/dynamic";
import type {RichContent} from "@/lib/planning/richContent";
const Reader=dynamic(()=>import("./StrategicDocumentReader"),{ssr:false,loading:()=> <p role="status">Preparando documento…</p>});
export default function DynamicDocumentReader({content}:{content:RichContent}){return <Reader content={content}/>;}

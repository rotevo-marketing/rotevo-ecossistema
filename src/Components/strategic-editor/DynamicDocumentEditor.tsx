"use client";
import dynamic from "next/dynamic";
import type {StrategicDocumentEditorProps} from "./StrategicDocumentEditor";
const Editor=dynamic(()=>import("./StrategicDocumentEditor"),{ssr:false,loading:()=> <p role="status" className="rounded-xl bg-white p-5 text-sm">Preparando editor de documentos…</p>});
export default function DynamicDocumentEditor(props:StrategicDocumentEditorProps){return <Editor {...props}/>;}

"use client";
import dynamic from "next/dynamic";
const Editor=dynamic(()=>import("./StrategicEditorPrototype"),{ssr:false,loading:()=> <div role="status" className=" bg-[#F6F7FB] p-10 text-sm text-[#525B70]">Preparando o Editor Estratégico…</div>});
export default function DynamicStrategicEditor({embedded=false}:{embedded?:boolean}){return <Editor embedded={embedded}/>;}

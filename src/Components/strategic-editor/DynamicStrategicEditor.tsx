"use client";
import dynamic from "next/dynamic";
const Editor=dynamic(()=>import("./StrategicEditorPrototype"),{ssr:false,loading:()=> <main role="status" className="min-h-screen bg-[#F6F7FB] p-10 text-sm text-[#525B70]">Preparando o Editor Estratégico…</main>});
export default function DynamicStrategicEditor(){return <Editor/>;}
